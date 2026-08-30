import { AppAction } from './appActionTypes.js';
import { AgentAction, LifeSession, UserProfile } from '../../types.js';
import { normalizeVietnameseText, stripVietnameseAccents } from './VietnameseNormalizer.js';
import { reminderService } from '../reminderService.js';
import { SCENARIO_REGISTRY, ScenarioRegistryEntry } from '../scenarioRegistry.js';
import { deduceHonorifics } from '../conversationStyle.js';
import { fetchCurrentWeatherReport } from '../weatherService.js';
import { executeLocalBrain } from '../localBrain/LocalBrainEngine.js';
import { matchAccessibilityVoiceCommand } from './AccessibilityVoiceController.js';
import {
  extractSpecificGoal,
  formatActionVerbDisplay,
  extractDateFromText,
  extractTimeFromText,
  extractLeadTimeFromText,
} from '../../utils/dateTimeResolver.js';

export type FastIntentSource = 'exact' | 'alias' | 'pattern' | 'context' | 'utility';

export type UtilityQueryType =
  | 'GET_CURRENT_DATE'
  | 'GET_CURRENT_TIME'
  | 'GET_DAY_OF_WEEK'
  | 'GET_TODAY_SCHEDULE'
  | 'GET_TOMORROW_SCHEDULE'
  | 'GET_UPCOMING_REMINDERS'
  | 'GET_WEATHER';

export interface FastIntentResult {
  handled: boolean;
  confidence: number;
  source?: FastIntentSource;
  intentId?: string;
  appAction?: AppAction;
  agentActions?: AgentAction[];
  utilityQuery?: UtilityQueryType;
  reply?: string;
  speech?: string;
  suggestedReplies?: string[];
  needsAI?: boolean;
  needsClarification?: boolean;
  clarificationActionType?: string;
  clarificationQuestion?: string;
  clarificationCandidates?: string[];
  clarificationPayload?: any;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
  confirmSuccessReply?: string;
  confirmCancelReply?: string;
  reason?: string;
}

export interface FastRouterContext {
  session?: LifeSession | null;
  userProfile?: UserProfile | null;
  activeTab?: string;
  page?: string;
  hasActiveSession?: boolean;
}

const DAYS_OF_WEEK_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/**
 * Fast Intent Router for Lovira Life
 * Operates as a local-first, deterministic pipeline before calling LLMs.
 */
export async function routeFastIntent(
  rawText: string,
  context?: FastRouterContext
): Promise<FastIntentResult> {
  if (!rawText || !rawText.trim()) {
    return { handled: false, confidence: 0, needsAI: false };
  }

  // 1. Run Local Brain Engine (74 intents, negative blockers, dialect aliases)
  const brainResult = await executeLocalBrain(rawText, context);
  if (brainResult.handled) {
    return {
      handled: true,
      confidence: brainResult.confidence,
      source: 'pattern',
      intentId: brainResult.intentId,
      appAction: brainResult.appAction,
      agentActions: brainResult.agentActions,
      utilityQuery: brainResult.utilityQuery as UtilityQueryType,
      reply: brainResult.reply,
      speech: brainResult.speech,
      suggestedReplies: brainResult.suggestedReplies,
      needsClarification: brainResult.needsClarification,
      clarificationActionType: brainResult.clarificationActionType,
      clarificationQuestion: brainResult.clarificationQuestion,
      clarificationCandidates: brainResult.clarificationCandidates,
      clarificationPayload: brainResult.clarificationPayload,
      requiresConfirmation: brainResult.requiresConfirmation,
      confirmationPrompt: brainResult.confirmationPrompt,
      confirmSuccessReply: brainResult.confirmSuccessReply,
      confirmCancelReply: brainResult.confirmCancelReply,
    };
  }

  const trimmedText = rawText.trim();

  // 1.1 Direct Accessibility voice command check
  const accessCmd = matchAccessibilityVoiceCommand(trimmedText);
  if (accessCmd && accessCmd.handled) {
    return {
      handled: true,
      confidence: 1.0,
      source: 'exact',
      appAction: accessCmd.appAction,
      reply: accessCmd.reply,
      speech: accessCmd.speech,
    };
  }

  const normalized = normalizeVietnameseText(trimmedText);
  const unaccented = stripVietnameseAccents(normalized);

  const honorifics = deduceHonorifics(context?.userProfile, rawText);
  const { addressing, me, praise, da, a } = honorifics;
  const session = context?.session;

  // -------------------------------------------------------------
  // LAYER A: Certain Local Navigation & App Controls (Confidence 1.0)
  // -------------------------------------------------------------

  // A_SOS. Emergency SOS Trigger ("Cứu tôi", "Khẩn cấp", "SOS", "Gọi cấp cứu")
  const isSOSPhrase =
    normalized === 'sos' ||
    normalized === 'cứu tôi' ||
    normalized === 'cứu với' ||
    normalized === 'cứu' ||
    normalized === 'khẩn cấp' ||
    normalized === 'báo động' ||
    normalized === 'kêu cứu' ||
    normalized === 'help' ||
    normalized === 'help me' ||
    normalized === 'emergency' ||
    normalized.includes('cứu tôi') ||
    normalized.includes('cứu với') ||
    normalized.includes('khẩn cấp') ||
    normalized.includes('báo động') ||
    normalized.includes('gọi cấp cứu') ||
    normalized.includes('gọi 115') ||
    normalized.includes('gọi cứu hộ') ||
    normalized.includes('tôi bị ngã') ||
    normalized.includes('bị té ngã') ||
    normalized.includes('gửi định vị khẩn cấp') ||
    normalized.includes('mở sos') ||
    normalized.includes('bật sos') ||
    normalized.includes('kêu cứu') ||
    unaccented.includes('cuu toi') ||
    unaccented.includes('cuu voi') ||
    unaccented.includes('khan cap') ||
    unaccented.includes('goi cap cuu') ||
    unaccented.includes('toi bi nga') ||
    unaccented.includes('mo sos') ||
    unaccented.includes('bat sos');

  if (isSOSPhrase) {
    return {
      handled: true,
      confidence: 1.0,
      source: 'exact',
      intentId: 'INTENT_SOS_EMERGENCY',
      appAction: { type: 'TRIGGER_SOS' },
      reply: `🆘 ${da}, ${me} đang kích hoạt màn hình Khẩn cấp SOS và lấy tọa độ vị trí định vị của ${addressing} ngay lập tức để gửi cho người thân hoặc gọi cấp cứu ạ!`,
      speech: `${da}, ${me} kích hoạt chế độ khẩn cấp SOS ngay đây ạ!`,
      suggestedReplies: ['Gửi SMS khẩn cấp', 'Gọi người thân', 'Gọi 115', 'Tắt còi báo động'],
    };
  }

  // Check query complexity: If the query is a multi-word question, complex inquiry, or consultation,
  // DO NOT blindly intercept with loose keyword matching -> delegate directly to AI NLU & Semantic Understanding!
  const wordCount = trimmedText.trim().split(/\s+/).length;
  const isComplexInquiry =
    wordCount > 6 ||
    /\b(sao|thế nào|ở đâu|khi nào|bao lâu|bao nhiêu|tại sao|nguyên nhân|uống gì|ăn gì|làm gì|hướng dẫn|tư vấn|khuyên|giải thích|chi tiết|tại|vì|nếu|khi|nhưng|rồi|chuẩn bị gì|thủ tục gì|đau|bệnh|sốt|huyết áp)\b/i.test(
      normalized
    );


  // A0. Vision Assistant ("Nhìn giúp tôi" - Exact / Short Command Only)
  const isVisionPhrase =
    !isComplexInquiry &&
    (normalized === 'nhìn giúp tôi' ||
      normalized === 'nhìn giúp chú' ||
      normalized === 'nhìn giúp con' ||
      normalized === 'nhìn giúp' ||
      normalized === 'mở nhìn giúp tôi' ||
      normalized === 'bật nhìn giúp tôi' ||
      normalized === 'mở nhìn giúp' ||
      normalized === 'trợ lý nhìn giúp' ||
      normalized === 'đọc đơn thuốc' ||
      normalized === 'đọc hóa đơn' ||
      normalized === 'đọc chữ giúp' ||
      normalized === 'nhận diện giúp' ||
      normalized === 'xem giúp tôi' ||
      (wordCount <= 4 && (normalized.includes('nhìn giúp') || unaccented.includes('nhin giup'))));

  if (isVisionPhrase && !normalized.includes('không')) {
    return {
      handled: true,
      confidence: 1.0,
      source: 'exact',
      appAction: { type: 'OPEN_VISION' },
      reply: `${da}, ${me} mở tính năng Nhìn giúp tôi cho ${addressing} ngay đây ạ! ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} có thể chụp hình để ${me} đọc chữ hoặc nhận diện đồ vật giúp nhé ạ.`,
      speech: `${da}, ${me} mở tính năng Nhìn giúp tôi ngay đây ạ!`,
    };
  }

  // A0_LISTEN. Listen Assistant ("Nghe giúp tôi" - Exact / Short Command Only)
  const isListenPhrase =
    !isComplexInquiry &&
    (normalized === 'nghe giúp tôi' ||
      normalized === 'nghe giúp chú' ||
      normalized === 'nghe giúp con' ||
      normalized === 'nghe giúp' ||
      normalized === 'mở nghe giúp tôi' ||
      normalized === 'bật nghe giúp tôi' ||
      normalized === 'mở nghe giúp' ||
      normalized === 'mở nghe thoại' ||
      normalized === 'bắt đầu nghe' ||
      normalized === 'nghe và ghi lại' ||
      normalized === 'nghe & ghi lại' ||
      normalized === 'ghi âm cuộc trò chuyện' ||
      normalized === 'tóm tắt cuộc trò chuyện' ||
      (wordCount <= 4 && (normalized.includes('nghe giúp') || unaccented.includes('nghe giup'))));

  if (isListenPhrase && !normalized.includes('không')) {
    return {
      handled: true,
      confidence: 1.0,
      source: 'exact',
      appAction: { type: 'OPEN_LISTEN' },
      reply: `${da}, ${me} mở tính năng Nghe giúp tôi cho ${addressing} ngay đây ạ! ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} có thể ghi âm cuộc hội thoại để ${me} lắng nghe, tóm tắt và hiển thị ngôn ngữ ký hiệu VSL giúp nhé ạ.`,
      speech: `${da}, ${me} mở tính năng Nghe giúp tôi ngay đây ạ!`,
    };
  }

  // A1. Camera & Scanner (Explicit camera open commands)
  const isCameraPhrase =
    !isComplexInquiry &&
    (normalized === 'chụp ảnh' ||
      normalized === 'chụp hình' ||
      normalized === 'mở camera' ||
      normalized === 'mở máy ảnh' ||
      normalized === 'mở cam' ||
      normalized === 'bật camera' ||
      normalized === 'bật máy ảnh' ||
      normalized === 'máy ảnh' ||
      normalized === 'camera' ||
      (wordCount <= 3 && (normalized.includes('mở camera') || normalized.includes('bật camera'))));


  const hasNegativeCameraIntent =
    normalized.includes('không muốn') ||
    normalized.includes('không cần') ||
    normalized.includes('không chụp') ||
    normalized.includes('không mở') ||
    normalized.includes('không bật') ||
    normalized.includes('không được') ||
    normalized.includes('bị lỗi') ||
    normalized.includes('bị hỏng') ||
    normalized.includes('bị hư') ||
    unaccented.includes('khong muon') ||
    unaccented.includes('khong can') ||
    unaccented.includes('khong chup') ||
    unaccented.includes('khong mo') ||
    unaccented.includes('bi loi') ||
    unaccented.includes('bi hong');

  const isOutcomeStatement =
    normalized.includes('xong') ||
    normalized.includes('rồi') ||
    normalized.includes('chưa') ||
    unaccented.includes('xong') ||
    unaccented.includes('roi');

  if (isCameraPhrase && !hasNegativeCameraIntent && !isOutcomeStatement) {
    return {
      handled: true,
      confidence: 1.0,
      source: 'exact',
      appAction: { type: 'OPEN_CAMERA' },
      reply: `${da}, ${me} mở camera cho ${addressing} ngay đây ạ!`,
      speech: `${da}, ${me} mở camera cho ${addressing} ngay đây ạ!`,
    };
  }

  // A2. Home / Dashboard (Explicit navigation command only)
  const isHomeCommand =
    !isComplexInquiry &&
    (normalized === 'trang chủ' ||
      normalized === 'màn hình chính' ||
      normalized.includes('về trang chủ') ||
      normalized.includes('về màn hình chính') ||
      normalized.includes('mở trang chủ') ||
      unaccented === 'trang chu' ||
      unaccented === 'man hinh chinh' ||
      unaccented.includes('ve trang chu')) &&
    !normalized.includes('xong') &&
    !normalized.includes('rồi');

  if (isHomeCommand) {
    return {
      handled: true,
      confidence: 1.0,
      source: 'exact',
      appAction: { type: 'GO_HOME' },
      reply: `${da}, ${me} đưa ${addressing} về trang chủ nhé ạ.`,
      speech: `${da}, ${me} đưa ${addressing} về trang chủ nhé ạ.`,
    };
  }

  // A3. Go Back
  if (
    !isComplexInquiry &&
    (normalized === 'quay lại' ||
      normalized === 'trở lại' ||
      normalized === 'trở về' ||
      normalized === 'lùi lại' ||
      normalized.startsWith('quay lại') ||
      normalized.startsWith('trở về'))
  ) {
    return {
      handled: true,
      confidence: 1.0,
      source: 'exact',
      appAction: { type: 'GO_BACK' },
      reply: `${da}, ${me} quay lại trang trước đây ạ.`,
      speech: `${da}, ${me} quay lại trang trước đây ạ.`,
    };
  }

  // A4. Open Reminders
  if (
    !isComplexInquiry &&
    (normalized.includes('mở nhắc nhở') ||
      normalized.includes('trang nhắc nhở') ||
      normalized.includes('mở lịch hẹn') ||
      normalized.includes('xem danh sách nhắc nhở') ||
      unaccented.includes('mo nhac nho') ||
      unaccented.includes('mo lich hen'))
  ) {
    return {
      handled: true,
      confidence: 1.0,
      source: 'exact',
      appAction: { type: 'OPEN_REMINDERS' },
      reply: `${da}, ${me} mở trang lịch nhắc nhở cho ${addressing} đây ạ.`,
      speech: `${da}, ${me} mở trang lịch nhắc nhở cho ${addressing} đây ạ.`,
    };
  }

  // A5. Settings
  if (
    !isComplexInquiry &&
    (normalized.includes('mở cài đặt') ||
      normalized === 'cài đặt' ||
      normalized.includes('mở thiết lập') ||
      unaccented === 'cai dat' ||
      unaccented.includes('mo cai dat'))
  ) {
    return {
      handled: true,
      confidence: 1.0,
      source: 'exact',
      appAction: { type: 'OPEN_SETTINGS' },
      reply: `${da}, ${me} mở mục cài đặt cho ${addressing} đây ạ.`,
      speech: `${da}, ${me} mở mục cài đặt cho ${addressing} đây ạ.`,
    };
  }

  // A6. Profile
  if (
    !isComplexInquiry &&
    (normalized.includes('mở hồ sơ') ||
      normalized.includes('trang cá nhân') ||
      normalized.includes('hồ sơ của tôi') ||
      unaccented.includes('mo ho so') ||
      unaccented.includes('trang ca nhan'))
  ) {
    return {
      handled: true,
      confidence: 1.0,
      source: 'exact',
      appAction: { type: 'OPEN_PROFILE' },
      reply: `${da}, ${me} mở hồ sơ cá nhân cho ${addressing} đây ạ.`,
      speech: `${da}, ${me} mở hồ sơ cá nhân cho ${addressing} đây ạ.`,
    };
  }


  // A7. Session Controls (If active session exists)
  if (session) {
    if (normalized.includes('tạm dừng phiên') || normalized === 'tạm dừng' || normalized.includes('nghỉ tay')) {
      return {
        handled: true,
        confidence: 1.0,
        source: 'context',
        agentActions: [{ type: 'PAUSE_SESSION', payload: {} }],
        reply: `${da}, ${me} đã tạm dừng phiên hỗ trợ rồi nha. Khi nào ${addressing} muốn tiếp tục, chỉ cần bảo "tiếp tục" cho ${me} nhé${a}!`,
        speech: `${da}, ${me} đã tạm dừng phiên rồi ạ.`,
        suggestedReplies: ['Tiếp tục phiên', 'Xem lại danh sách việc'],
      };
    }

    if (normalized.includes('tiếp tục phiên') || normalized === 'tiếp tục' || normalized === 'làm tiếp') {
      const stepTitle = session.nextRecommendedAction?.title || 'bước tiếp theo';
      return {
        handled: true,
        confidence: 1.0,
        source: 'context',
        agentActions: [{ type: 'RESUME_SESSION', payload: {} }],
        reply: `${da}, ${me} cùng ${addressing} tiếp tục công việc nhé${a}. Bước hiện tại là: "${stepTitle}".`,
        speech: `${da}, chúng ta tiếp tục công việc nhé. Bước hiện tại là: ${stepTitle}.`,
        suggestedReplies: ['Xong bước này rồi', 'Cần làm gì tiếp theo?'],
      };
    }

    if (normalized.includes('hoàn thành phiên') || normalized.includes('kết thúc phiên') || normalized.includes('xong cả phiên')) {
      return {
        handled: true,
        confidence: 1.0,
        source: 'context',
        agentActions: [{ type: 'COMPLETE_SESSION', payload: {} }],
        reply: `${praise} ${me.charAt(0).toUpperCase() + me.slice(1)} chúc mừng ${addressing} đã hoàn thành xuất sắc toàn bộ phiên "${session.title}" nhé! 🎉`,
        speech: `${praise} Chúc mừng ${addressing} đã hoàn thành toàn bộ phiên "${session.title}" rồi ạ!`,
      };
    }

    // Goal outcome phrases ("ăn xong rồi", "phỏng vấn xong rồi", "khám xong rồi"...)
    const isGoalOutcome =
      normalized.includes('ăn xong') ||
      normalized.includes('phỏng vấn xong') ||
      normalized.includes('khám xong') ||
      normalized.includes('khám bệnh xong') ||
      normalized.includes('mua sắm xong') ||
      normalized.includes('mua đồ xong') ||
      normalized.includes('sửa máy xong') ||
      normalized.includes('về tới nhà') ||
      normalized.includes('về đến nhà') ||
      normalized.includes('làm xong thủ tục') ||
      normalized.includes('nộp hồ sơ xong');

    if (isGoalOutcome) {
      return {
        handled: true,
        confidence: 0.98,
        source: 'context',
        agentActions: [{ type: 'COMPLETE_SESSION', payload: {} }],
        reply: `${praise} Tuyệt vời quá! ${me.charAt(0).toUpperCase() + me.slice(1)} mừng cho ${addressing} đã hoàn thành xong rồi nha! 🎉 ${me} đã đánh dấu xong toàn bộ phiên "${session.title}".`,
        speech: `${praise} Mừng cho ${addressing} đã hoàn thành xong công việc rồi nha!`,
      };
    }
  }

  // -------------------------------------------------------------
  // LAYER B: Deterministic Utility Queries (Date, Time, Schedule)
  // -------------------------------------------------------------

  const now = new Date();

  // B1. Time Query ("mấy giờ rồi", "bây giờ mấy giờ", "xem giờ")
  // Must be asking for current time, not contextual times like "công ty mấy giờ mở cửa"
  const isAskingCurrentTime =
    (normalized === 'mấy giờ rồi' ||
      normalized === 'bây giờ mấy giờ' ||
      normalized === 'bây giờ là mấy giờ' ||
      normalized === 'xem giờ' ||
      normalized.includes('mấy giờ rồi') ||
      normalized.includes('bây giờ mấy giờ') ||
      normalized.includes('cho chú hỏi mấy giờ') ||
      unaccented === 'may gio roi' ||
      unaccented === 'bay gio may gio') &&
    !normalized.includes('mở cửa') &&
    !normalized.includes('bắt đầu') &&
    !normalized.includes('kết thúc') &&
    !normalized.includes('chuyến') &&
    !normalized.includes('hẹn');

  if (isAskingCurrentTime) {
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh} giờ ${mm} phút`;
    return {
      handled: true,
      confidence: 1.0,
      source: 'utility',
      utilityQuery: 'GET_CURRENT_TIME',
      reply: `${da}, bây giờ là ${timeStr} ạ.`,
      speech: `${da}, bây giờ là ${timeStr} ạ.`,
      suggestedReplies: ['Hôm nay thứ mấy?', 'Lịch hôm nay có gì?'],
    };
  }

  // B2. Day of Week Query ("hôm nay thứ mấy")
  const isAskingDayOfWeek =
    (normalized.includes('hôm nay thứ mấy') ||
      normalized.includes('hôm nay là thứ mấy') ||
      normalized === 'thứ mấy' ||
      unaccented.includes('hom nay thu may')) &&
    !normalized.includes('phỏng vấn') &&
    !normalized.includes('lịch hẹn');

  if (isAskingDayOfWeek) {
    const dowStr = DAYS_OF_WEEK_VI[now.getDay()];
    return {
      handled: true,
      confidence: 1.0,
      source: 'utility',
      utilityQuery: 'GET_DAY_OF_WEEK',
      reply: `${da}, hôm nay là ${dowStr} ạ.`,
      speech: `${da}, hôm nay là ${dowStr} ạ.`,
      suggestedReplies: ['Bây giờ mấy giờ?', 'Lịch hôm nay có gì?'],
    };
  }

  // B3. Date Query ("hôm nay ngày mấy", "hôm nay ngày bao nhiêu")
  const isAskingCurrentDate =
    (normalized.includes('hôm nay ngày mấy') ||
      normalized.includes('hôm nay ngày bao nhiêu') ||
      normalized.includes('hôm nay ngày mấy tháng mấy') ||
      normalized === 'ngày mấy' ||
      unaccented.includes('hom nay ngay may')) &&
    !normalized.includes('phỏng vấn') &&
    !normalized.includes('lịch hẹn') &&
    !normalized.includes('hạn');

  if (isAskingCurrentDate) {
    const dowStr = DAYS_OF_WEEK_VI[now.getDay()];
    const dateStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
    return {
      handled: true,
      confidence: 1.0,
      source: 'utility',
      utilityQuery: 'GET_CURRENT_DATE',
      reply: `${da}, hôm nay là ${dowStr}, ${dateStr} ạ.`,
      speech: `${da}, hôm nay là ${dowStr}, ${dateStr} ạ.`,
      suggestedReplies: ['Bây giờ mấy giờ?', 'Lịch hôm nay có gì?'],
    };
  }

  // B4. Schedule for Today Query (Explicit query only)
  const isScheduleQuery =
    !isComplexInquiry &&
    (normalized === 'lịch hôm nay' ||
      normalized === 'xem lịch hôm nay' ||
      normalized === 'lịch nhắc hôm nay' ||
      normalized.includes('hôm nay có lịch gì') ||
      normalized.includes('hôm nay có nhắc nhở gì') ||
      normalized.includes('hôm nay có hẹn gì') ||
      unaccented === 'lich hom nay' ||
      unaccented.includes('hom nay co lich gi'));

  if (isScheduleQuery) {
    const todayReminders = reminderService.getRemindersForDate(now);
    if (todayReminders.length === 0) {
      return {
        handled: true,
        confidence: 0.95,
        source: 'utility',
        utilityQuery: 'GET_TODAY_SCHEDULE',
        reply: `${da}, hôm nay ${addressing} không có lịch nhắc nhở hay lịch hẹn nào ạ. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} có muốn ${me} tạo nhắc nhở mới không ạ?`,
        speech: `${da}, hôm nay ${addressing} chưa có lịch nhắc nhở nào ạ.`,
        suggestedReplies: ['Tạo nhắc nhở uống thuốc', 'Tạo lịch hẹn mới'],
      };
    }

    const itemsText = todayReminders
      .map((r) => {
        const dStr = new Date(r.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const icon = r.category === 'medication' ? '💊' : r.category === 'appointment' ? '🩺' : '🔔';
        return `• ${icon} ${r.title}: lúc ${dStr}`;
      })
      .join('\n');

    const reply = `${da}, đây là lịch nhắc nhở hôm nay của ${addressing} ạ:\n${itemsText}`;
    const firstItem = todayReminders[0];
    const firstTime = new Date(firstItem.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const speech = `${da}, hôm nay ${addressing} có ${todayReminders.length} lịch nhắc. Đầu tiên là "${firstItem.title}" lúc ${firstTime} ạ.`;

    return {
      handled: true,
      confidence: 0.95,
      source: 'utility',
      utilityQuery: 'GET_TODAY_SCHEDULE',
      reply,
      speech,
      suggestedReplies: ['Tạo nhắc nhở mới', 'Xem tất cả lịch nhắc'],
    };
  }

  // B5. Tomorrow Schedule Query (Explicit query only)
  const isTomorrowScheduleQuery =
    !isComplexInquiry &&
    (normalized === 'lịch ngày mai' ||
      normalized === 'xem lịch ngày mai' ||
      normalized.includes('ngày mai có lịch gì') ||
      normalized.includes('ngày mai có hẹn gì') ||
      unaccented === 'lich ngay mai' ||
      unaccented.includes('ngay mai co lich gi'));

  if (isTomorrowScheduleQuery) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowReminders = reminderService.getRemindersForDate(tomorrow);

    if (tomorrowReminders.length === 0) {
      return {
        handled: true,
        confidence: 0.95,
        source: 'utility',
        utilityQuery: 'GET_TOMORROW_SCHEDULE',
        reply: `${da}, ngày mai ${addressing} chưa có lịch nhắc nhở hay lịch hẹn nào ạ.`,
        speech: `${da}, ngày mai ${addressing} chưa có lịch nhắc nhở nào ạ.`,
        suggestedReplies: ['Tạo nhắc nhở cho ngày mai', 'Xem lịch hôm nay'],
      };
    }

    const itemsText = tomorrowReminders
      .map((r) => {
        const dStr = new Date(r.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const icon = r.category === 'medication' ? '💊' : r.category === 'appointment' ? '🩺' : '🔔';
        return `• ${icon} ${r.title}: lúc ${dStr}`;
      })
      .join('\n');

    return {
      handled: true,
      confidence: 0.95,
      source: 'utility',
      utilityQuery: 'GET_TOMORROW_SCHEDULE',
      reply: `${da}, đây là lịch nhắc nhở ngày mai của ${addressing} ạ:\n${itemsText}`,
      speech: `${da}, ngày mai ${addressing} có ${tomorrowReminders.length} lịch nhắc ạ.`,
      suggestedReplies: ['Tạo nhắc nhở mới', 'Xem tất cả lịch nhắc'],
    };
  }

  // B6. Weather & Temperature Query -> Direct API call via WeatherService (Zero LLM)
  const isWeatherOrTempQuery =
    !isComplexInquiry &&
    (normalized === 'thời tiết' ||
      normalized === 'xem thời tiết' ||
      normalized.includes('thời tiết hôm nay') ||
      normalized.includes('trời có mưa không') ||
      normalized.includes('hôm nay có mưa không') ||
      normalized.includes('hôm nay bao nhiêu độ') ||
      normalized.includes('nhiệt độ hôm nay') ||
      unaccented === 'thoi tiet' ||
      unaccented.includes('thoi tiet hom nay'));

  if (isWeatherOrTempQuery) {
    const weatherResult = await fetchCurrentWeatherReport({
      addressing,
      me,
      da,
      rawText: trimmedText,
    });

    return {
      handled: true,
      confidence: 0.98,
      source: 'utility',
      utilityQuery: 'GET_WEATHER',
      reply: weatherResult.reply,
      speech: weatherResult.speech,
      suggestedReplies: weatherResult.suggestedReplies,
    };
  }



  // B7. Scenario Match -> ONLY for explicit creation commands (e.g. "Tạo phiên đi khám bệnh", "Lập kế hoạch mua sắm")
  const isExplicitScenarioCreate =
    !isComplexInquiry &&
    (normalized.startsWith('tạo phiên') ||
      normalized.startsWith('lập kế hoạch') ||
      normalized.startsWith('tạo kế hoạch') ||
      normalized.startsWith('bắt đầu phiên'));

  if (isExplicitScenarioCreate) {
    const templateMatch = matchScenarioTemplate(normalized, unaccented);
    if (templateMatch) {
      const fallbackTitle = templateMatch.label.replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '');
      const specificGoal = extractSpecificGoal(rawText) || fallbackTitle;
      const dateInfo = extractDateFromText(rawText);
      const timeInfo = extractTimeFromText(rawText);
      const leadTimeInfo = extractLeadTimeFromText(rawText);

      const actionVerbDisplay = formatActionVerbDisplay(specificGoal);
      const promptReply = `${da}, ${addressing} muốn ${me} hỗ trợ từng bước khi chuẩn bị và thực hiện ${actionVerbDisplay}, hay tạo nhắc nhở trước giờ đi ạ?`;

      return {
        handled: true,
        confidence: 0.92,
        source: 'pattern',
        needsClarification: true,
        clarificationActionType: 'CHOOSE_SUPPORT_MODE',
        clarificationQuestion: promptReply,
        clarificationPayload: {
          originalText: rawText,
          scenarioFamily: templateMatch.family,
          proposedGoal: specificGoal,
          hasDate: dateInfo.hasDate,
          dateLabel: dateInfo.dateLabel,
          dateIso: dateInfo.hasDate ? dateInfo.dateObj.toISOString() : undefined,
          hasEventTime: timeInfo.hasTime,
          eventTimeStr: timeInfo.timeStr,
          eventHour: timeInfo.hour,
          eventMinute: timeInfo.minute,
          hasLeadTime: leadTimeInfo.hasLeadTime,
          leadMinutes: leadTimeInfo.leadMinutes,
          isExactLead: leadTimeInfo.isExact,
        },
        reply: promptReply,
        speech: `${da}, ${addressing} muốn ${me} hỗ trợ từng bước hay tạo nhắc nhở trước giờ đi ạ?`,
        suggestedReplies: ['Hỗ trợ từng bước', 'Tạo nhắc nhở', 'Không cần'],
      };
    }
  }


  // -------------------------------------------------------------
  // LAYER C: Ambiguous or Low Confidence Check -> Clarification / Fallback
  // -------------------------------------------------------------

  // If text is extremely short and vague like "mở lên", "mở cái này"
  if (normalized === 'mở lên' || normalized === 'mở cái này' || normalized === 'mở đi') {
    return {
      handled: true,
      confidence: 0.5,
      needsClarification: true,
      clarificationQuestion: `${da}, ${addressing} muốn ${me} mở Camera hay Lịch nhắc nhở ạ?`,
      suggestedReplies: ['Mở Camera', 'Mở Nhắc nhở', 'Về Trang chủ'],
    };
  }

  // -------------------------------------------------------------
  // LAYER D: Complex Reasoning & Planning Required -> Needs AI
  // -------------------------------------------------------------
  return {
    handled: false,
    confidence: 0.3,
    needsAI: true,
  };
}

/**
 * Match text against SCENARIO_REGISTRY for instant template creation
 */
function matchScenarioTemplate(
  normalized: string,
  unaccented: string
): ScenarioRegistryEntry | null {
  const creationPhrases = [
    'đi',
    'muốn đi',
    'sắp đi',
    'chuẩn bị',
    'cần làm',
    'muốn làm',
    'hướng dẫn làm',
    'cần mua',
    'muốn mua',
    'cần sửa',
    'đi sửa',
    'bảo hành',
    'tạo phiên',
    'tạo hướng dẫn',
    'muốn tạo',
    'cần tạo',
    'hướng dẫn',
  ];

  const paddedNorm = ` ${normalized.trim()} `;
  const paddedUnaccented = ` ${unaccented.trim()} `;

  const hasCreationIntent = creationPhrases.some(
    (p) =>
      paddedNorm.includes(` ${p} `) ||
      paddedUnaccented.includes(` ${stripVietnameseAccents(p)} `)
  );

  if (!hasCreationIntent) return null;

  const entries = Object.values(SCENARIO_REGISTRY);
  for (const entry of entries) {
    for (const kw of entry.keywords) {
      const kwNorm = kw.toLowerCase();
      if (normalized.includes(kwNorm) || unaccented.includes(stripVietnameseAccents(kwNorm))) {
        return entry;
      }
    }
  }

  return null;
}
