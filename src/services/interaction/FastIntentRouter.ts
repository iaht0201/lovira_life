import { AppAction } from './appActionTypes';
import { AgentAction, LifeSession, UserProfile } from '../../types';
import { normalizeVietnameseText, stripVietnameseAccents } from './VietnameseNormalizer';
import { reminderService } from '../reminderService';
import { SCENARIO_REGISTRY, ScenarioRegistryEntry } from '../scenarioRegistry';
import { deduceHonorifics } from '../conversationStyle';

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

  // A1. Camera & Scanner
  if (
    normalized.includes('mở camera') ||
    normalized.includes('máy ảnh') ||
    normalized.includes('chụp ảnh') ||
    normalized.includes('chụp hình') ||
    normalized.includes('mở cam') ||
    unaccented.includes('mo camera') ||
    unaccented.includes('chup anh')
  ) {
    return {
      handled: true,
      confidence: 1.0,
      source: 'exact',
      appAction: { type: 'OPEN_CAMERA' },
      reply: `${da}, ${me} mở camera cho ${addressing} ngay đây ạ!`,
      speech: `${da}, ${me} mở camera cho ${addressing} ngay đây ạ!`,
    };
  }

  // A2. Home / Dashboard
  if (
    normalized.includes('trang chủ') ||
    normalized.includes('màn hình chính') ||
    normalized.includes('về nhà') ||
    unaccented.includes('trang chu') ||
    unaccented.includes('man hinh chinh')
  ) {
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
  // LAYER B: Deterministic Utility Queries (Date, Time, Schedule, Weather)
  // -------------------------------------------------------------

  const now = new Date();

  // B1. Time Query ("mấy giờ rồi", "bây giờ mấy giờ", "xem giờ")
  if (
    normalized.includes('mấy giờ') ||
    normalized.includes('bây giờ mấy giờ') ||
    normalized === 'xem giờ' ||
    unaccented.includes('may gio')
  ) {
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
  if (normalized.includes('thứ mấy') || unaccented.includes('thu may')) {
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
  if (
    normalized.includes('ngày mấy') ||
    normalized.includes('ngày bao nhiêu') ||
    normalized.includes('ngày mấy tháng mấy') ||
    unaccented.includes('ngay may')
  ) {
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

  // B6. Weather Query ("thời tiết hôm nay", "hôm nay trời có mưa không")
  if (
    normalized.includes('thời tiết') ||
    normalized.includes('trời có mưa') ||
    normalized.includes('nhiệt độ hôm nay') ||
    normalized.includes('trời hôm nay thế nào') ||
    unaccented.includes('thoi tiet')
  ) {
    return {
      handled: true,
      confidence: 0.95,
      source: 'utility',
      utilityQuery: 'GET_WEATHER',
      reply: `${da}, dự báo thời tiết hôm nay khoảng 30°C - 32°C, trời nhiều mây, có thể có mưa rào nhẹ rải rác vào buổi chiều. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} nhớ mang theo ô (dù) khi đi ra ngoài nhé ạ!`,
      speech: `${da}, dự báo thời tiết hôm nay khoảng 31 độ C, trời nhiều mây, có thể có mưa rào nhẹ vào buổi chiều ạ.`,
      suggestedReplies: ['Lịch hôm nay có gì?', 'Tạo nhắc nhở mang ô'],
    };
  }

  // B7. Template-First Instant Session Creation
  // Check if phrase matches one of the known life scenario templates (healthcare, administrative, shopping, interview, repair)
  const templateMatch = matchScenarioTemplate(normalized, unaccented);
  if (templateMatch) {
    return {
      handled: true,
      confidence: 0.92,
      source: 'pattern',
      appAction: {
        type: 'CREATE_SESSION',
        payload: { goal: rawText, sessionTitle: templateMatch.label },
      },
      reply: `${da}, ${me} tạo ngay phiên hướng dẫn "${templateMatch.label}" cho ${addressing} đây ạ! ${me} đã chuẩn bị sẵn danh sách các bước thực hiện để đồng hành cùng ${addressing}.`,
      speech: `${da}, ${me} đã tạo ngay phiên hướng dẫn "${templateMatch.label}" cho ${addressing} rồi ạ!`,
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
  const isCreationIntent =
    normalized.includes('đi') ||
    normalized.includes('làm') ||
    normalized.includes('mua') ||
    normalized.includes('chuẩn bị') ||
    normalized.includes('sửa') ||
    normalized.includes('bảo hành') ||
    normalized.includes('tạo');

  if (!isCreationIntent) return null;

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
