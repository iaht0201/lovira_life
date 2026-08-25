import { AppAction } from './appActionTypes';
import { AgentAction, LifeSession, UserProfile } from '../../types';
import { normalizeVietnameseText, stripVietnameseAccents } from './VietnameseNormalizer';
import { reminderService } from '../reminderService';
import { SCENARIO_REGISTRY, ScenarioRegistryEntry } from '../scenarioRegistry';
import { deduceHonorifics } from '../conversationStyle';
import { fetchCurrentWeatherReport } from '../weatherService';

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
  appAction?: AppAction;
  agentActions?: AgentAction[];
  utilityQuery?: UtilityQueryType;
  reply?: string;
  speech?: string;
  suggestedReplies?: string[];
  needsAI?: boolean;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  clarificationCandidates?: string[];
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

  const trimmedText = rawText.trim();
  const normalized = normalizeVietnameseText(trimmedText);
  const unaccented = stripVietnameseAccents(normalized);

  const honorifics = deduceHonorifics(context?.userProfile, rawText);
  const { addressing, me, praise, da, a } = honorifics;
  const session = context?.session;

  // -------------------------------------------------------------
  // LAYER A: Certain Local Navigation & App Controls (Confidence 1.0)
  // -------------------------------------------------------------

  // A1. Camera & Scanner (Explicit camera open commands)
  const isCameraPhrase =
    normalized === 'chụp ảnh' ||
    normalized === 'chụp hình' ||
    normalized === 'mở camera' ||
    normalized === 'mở máy ảnh' ||
    normalized === 'mở cam' ||
    normalized === 'bật camera' ||
    normalized === 'bật máy ảnh' ||
    normalized === 'máy ảnh' ||
    normalized === 'camera' ||
    normalized.includes('mở camera') ||
    normalized.includes('mở máy ảnh') ||
    normalized.includes('mở cam') ||
    normalized.includes('bật camera') ||
    normalized.includes('bật máy ảnh') ||
    normalized.includes('chụp ảnh') ||
    normalized.includes('chụp hình') ||
    unaccented.includes('mo camera') ||
    unaccented.includes('chup anh') ||
    unaccented.includes('chup hinh');

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
    normalized === 'quay lại' ||
    normalized === 'trở lại' ||
    normalized === 'trở về' ||
    normalized === 'lùi lại' ||
    normalized.startsWith('quay lại') ||
    normalized.startsWith('trở về')
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
    normalized.includes('mở nhắc nhở') ||
    normalized.includes('trang nhắc nhở') ||
    normalized.includes('mở lịch hẹn') ||
    normalized.includes('xem danh sách nhắc nhở') ||
    unaccented.includes('mo nhac nho') ||
    unaccented.includes('mo lich hen')
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
    normalized.includes('mở cài đặt') ||
    normalized === 'cài đặt' ||
    normalized.includes('mở thiết lập') ||
    unaccented === 'cai dat' ||
    unaccented.includes('mo cai dat')
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
    normalized.includes('mở hồ sơ') ||
    normalized.includes('trang cá nhân') ||
    normalized.includes('hồ sơ của tôi') ||
    unaccented.includes('mo ho so') ||
    unaccented.includes('trang ca nhan')
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

  // B4. Schedule for Today Query ("hôm nay chú có lịch gì", "lịch hôm nay")
  const isScheduleQuery =
    (normalized.includes('lịch') ||
      normalized.includes('nhắc nhở') ||
      normalized.includes('có hẹn') ||
      normalized.includes('việc cần làm')) &&
    (normalized.includes('hôm nay') ||
      normalized.includes('xem') ||
      normalized.includes('gì') ||
      normalized.includes('thế nào') ||
      normalized.includes('có không'));

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

  // B5. Tomorrow Schedule Query ("lịch ngày mai")
  if (normalized.includes('ngày mai') && (normalized.includes('lịch') || normalized.includes('hẹn'))) {
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

  // B6. Weather Query -> Direct API call via WeatherService (Zero LLM)
  if (
    normalized.includes('thời tiết') ||
    normalized.includes('trời có mưa') ||
    normalized.includes('nhiệt độ hôm nay') ||
    normalized.includes('trời hôm nay thế nào') ||
    unaccented.includes('thoi tiet')
  ) {
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

  // B7. Template-First Instant Session Creation
  // Check if phrase matches one of the known life scenario templates (healthcare, administrative, shopping, interview, repair)
  const templateMatch = matchScenarioTemplate(normalized, unaccented);
  if (templateMatch) {
    const cleanTitle = templateMatch.label.replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '');
    return {
      handled: true,
      confidence: 0.92,
      source: 'pattern',
      appAction: {
        type: 'CREATE_SESSION',
        payload: {
          goal: rawText,
          sessionTitle: cleanTitle,
          scenarioKey: templateMatch.family,
          creationMode: 'template',
        },
      },
      reply: `${da}, ${me} tạo ngay phiên hướng dẫn "${cleanTitle}" cho ${addressing} đây ạ! ${me} đã chuẩn bị sẵn danh sách các bước thực hiện để đồng hành cùng ${addressing}.`,
      speech: `${da}, ${me} đã tạo ngay phiên hướng dẫn "${cleanTitle}" cho ${addressing} rồi ạ!`,
    };
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
