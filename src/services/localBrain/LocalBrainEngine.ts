import { ClassificationMatch, classifyLocalBrain } from './LocalBrainClassifier.js';
import { AppAction } from '../interaction/appActionTypes.js';
import { AgentAction, LifeSession, UserProfile } from '../../types.js';
import { deduceHonorifics } from '../conversationStyle.js';
import { reminderService } from '../reminderService.js';
import { fetchCurrentWeatherReport } from '../weatherService.js';
import { parseVietnameseReminderText } from '../../utils/dateTimeResolver.js';
import { parseLocalIntent } from '../localIntentEngine.js';

export interface LocalBrainExecutionResult {
  handled: boolean;
  intentId?: string;
  category?: string;
  confidence: number;
  appAction?: AppAction;
  agentActions?: AgentAction[];
  utilityQuery?: string;
  reply?: string;
  speech?: string;
  suggestedReplies?: string[];
  needsAI?: boolean;
  needsClarification?: boolean;
  clarificationActionType?: string;
  clarificationQuestion?: string;
  clarificationCandidates?: string[];
  reason?: string;
}

export interface LocalBrainContext {
  session?: LifeSession | null;
  userProfile?: UserProfile | null;
  activeTab?: string;
  page?: string;
  hasActiveSession?: boolean;
}

const DAYS_OF_WEEK_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/**
 * Format dynamic template variables from intent responseTemplate
 */
function formatResponseTemplate(
  template: string,
  honorifics: { da: string; me: string; addressing: string; a: string; praise: string },
  extra?: Record<string, string>
): string {
  let res = template;
  res = res.replace(/\{da\}/g, honorifics.da);
  res = res.replace(/\{me\}/g, honorifics.me);
  res = res.replace(/\{addressing\}/g, honorifics.addressing);
  res = res.replace(/\{a\}/g, honorifics.a);
  res = res.replace(/\{praise\}/g, honorifics.praise);

  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      res = res.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }

  // Capitalize first letter of sentence
  return res.charAt(0).toUpperCase() + res.slice(1);
}

/**
 * Core Local Brain Engine
 * Takes raw user utterance and routes deterministically using the 74 local intents.
 */
export async function executeLocalBrain(
  rawText: string,
  context?: LocalBrainContext
): Promise<LocalBrainExecutionResult> {
  if (!rawText || !rawText.trim()) {
    return { handled: false, confidence: 0, needsAI: false };
  }

  const trimmedText = rawText.trim();
  const honorifics = deduceHonorifics(context?.userProfile, trimmedText);
  const { da, me, addressing, a, praise } = honorifics;
  const session = context?.session;
  const hasActiveSession = !!session || !!context?.hasActiveSession;

  // 1. Run Classification against Local Brain Dataset
  const match = classifyLocalBrain(trimmedText, { hasActiveSession });

  if (!match) {
    return {
      handled: false,
      confidence: 0.2,
      needsAI: true,
    };
  }

  const { intent, confidence, extractedSlots } = match;

  // 2. Handle by Handler Type
  switch (intent.handler) {
    // -------------------------------------------------------------
    // TEMPLATE RESPONSES (Greetings, Thanks, Goodbye, Identity, Acknowledge)
    // -------------------------------------------------------------
    case 'template_response': {
      const template = intent.responseTemplate || `${da}, ${me} đang nghe ${addressing} ạ.`;
      const reply = formatResponseTemplate(template, honorifics, extractedSlots);

      let suggestedReplies: string[] | undefined;
      if (intent.id === 'social.greeting') {
        suggestedReplies = ['Hôm nay có lịch gì?', 'Thời tiết hôm nay', 'Mở camera chụp ảnh'];
      } else if (intent.id === 'social.thanks') {
        suggestedReplies = ['Xem lịch hôm nay', 'Tạo nhắc nhở mới'];
      }

      return {
        handled: true,
        intentId: intent.id,
        category: intent.category,
        confidence,
        reply,
        speech: reply,
        suggestedReplies,
      };
    }

    // -------------------------------------------------------------
    // CAPABILITY SUMMARY
    // -------------------------------------------------------------
    case 'capability_summary': {
      const reply = `${da}, ${me} có thể hỗ trợ ${addressing} các công việc hàng ngày như:\n` +
        `• 📸 Mở camera chụp & nhận diện giấy tờ, đơn thuốc, đồ vật\n` +
        `• ⏰ Tạo & nhắc lịch uống thuốc, đi khám bệnh, việc cần làm\n` +
        `• 🧭 Lập kế hoạch đồng hành từng bước cho các việc đời sống\n` +
        `• ☀️ Xem thời tiết, ngày giờ, lịch trình hôm nay và ngày mai\n` +
        `• ♿ Tuỳ chỉnh trợ năng: đọc to phản hồi, chỉnh chữ lớn, tương phản cao.\n` +
        `${addressing.charAt(0).toUpperCase() + addressing.slice(1)} muốn ${me} hỗ trợ việc gì trước ạ?`;

      const speech = `${da}, ${me} có thể hỗ trợ ${addressing} chụp ảnh nhận diện, nhắc lịch uống thuốc, hướng dẫn từng bước và xem thời tiết ngày giờ ạ!`;

      return {
        handled: true,
        intentId: intent.id,
        category: intent.category,
        confidence,
        reply,
        speech,
        suggestedReplies: ['Tạo nhắc nhở', 'Xem lịch hôm nay', 'Thời tiết hôm nay', 'Mở camera'],
      };
    }

    // -------------------------------------------------------------
    // APP ACTIONS (Navigation, Camera, Accessibility Settings)
    // -------------------------------------------------------------
    case 'app_action': {
      let appAction = intent.appAction as AppAction;
      let reply = '';
      let speech = '';

      if (intent.id === 'nav.home') {
        reply = `${da}, ${me} đưa ${addressing} về màn hình chính nhé ạ.`;
        speech = `${da}, ${me} đưa ${addressing} về màn hình chính nhé ạ.`;
      } else if (intent.id === 'nav.back') {
        reply = `${da}, ${me} quay lại trang trước đây ạ.`;
        speech = `${da}, ${me} quay lại trang trước đây ạ.`;
      } else if (intent.id === 'nav.camera') {
        reply = `${da}, ${me} mở máy ảnh cho ${addressing} ngay đây ạ!`;
        speech = `${da}, ${me} mở máy ảnh cho ${addressing} ngay đây ạ!`;
      } else if (intent.id === 'nav.reminders') {
        reply = `${da}, ${me} mở trang lịch nhắc nhở cho ${addressing} đây ạ.`;
        speech = `${da}, ${me} mở trang lịch nhắc nhở cho ${addressing} đây ạ.`;
      } else if (intent.id === 'nav.settings') {
        reply = `${da}, ${me} mở mục cài đặt cho ${addressing} đây ạ.`;
        speech = `${da}, ${me} mở mục cài đặt cho ${addressing} đây ạ.`;
      } else if (intent.id === 'nav.profile') {
        reply = `${da}, ${me} mở hồ sơ cá nhân cho ${addressing} đây ạ.`;
        speech = `${da}, ${me} mở hồ sơ cá nhân cho ${addressing} đây ạ.`;
      } else if (intent.id.startsWith('access.')) {
        // Accessibility updates
        const actionPayload = appAction?.payload as any;
        const settingName = actionPayload?.setting || 'cài đặt';
        reply = `${da}, ${me} đã cập nhật ${settingName} theo ý ${addressing} rồi ạ.`;
        speech = reply;
      } else {
        reply = `${da}, ${me} đã thực hiện theo yêu cầu của ${addressing} rồi ạ.`;
        speech = reply;
      }

      return {
        handled: true,
        intentId: intent.id,
        category: intent.category,
        confidence,
        appAction,
        reply,
        speech,
      };
    }

    // -------------------------------------------------------------
    // APP ACTION WITH SLOTS (Open named session, Reminder CRUD, etc.)
    // -------------------------------------------------------------
    case 'app_action_slot': {
      const appAction = intent.appAction as AppAction;
      let reply = '';
      let speech = '';

      if (intent.id === 'nav.open_named_session' && extractedSlots?.sessionTitle) {
        const title = extractedSlots.sessionTitle;
        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          appAction: {
            type: 'OPEN_SESSION',
            payload: { sessionTitle: title },
          },
          reply: `${da}, ${me} mở phiên "${title}" cho ${addressing} nhé ạ.`,
          speech: `${da}, ${me} mở phiên "${title}" cho ${addressing} nhé ạ.`,
        };
      }

      if (intent.id.startsWith('reminder.')) {
        // Reminder update/delete/snooze/complete
        reply = `${da}, ${me} đã ghi nhận thao tác lịch nhắc của ${addressing} ạ.`;
        speech = reply;
      }

      return {
        handled: true,
        intentId: intent.id,
        category: intent.category,
        confidence,
        appAction,
        reply: reply || `${da}, ${me} đã thực hiện yêu cầu rồi ạ.`,
        speech: speech || reply,
      };
    }

    // -------------------------------------------------------------
    // UTILITIES (Time, Date, Day of Week, Schedules, Weather)
    // -------------------------------------------------------------
    case 'utility': {
      const now = new Date();
      const qType = intent.utilityQuery;

      if (qType === 'GET_CURRENT_TIME') {
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hh} giờ ${mm} phút`;
        const reply = `${da}, bây giờ là ${timeStr} ạ.`;
        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          utilityQuery: qType,
          reply,
          speech: reply,
          suggestedReplies: ['Hôm nay thứ mấy?', 'Lịch hôm nay có gì?'],
        };
      }

      if (qType === 'GET_DAY_OF_WEEK') {
        const dowStr = DAYS_OF_WEEK_VI[now.getDay()];
        const reply = `${da}, hôm nay là ${dowStr} ạ.`;
        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          utilityQuery: qType,
          reply,
          speech: reply,
          suggestedReplies: ['Bây giờ mấy giờ?', 'Lịch hôm nay có gì?'],
        };
      }

      if (qType === 'GET_CURRENT_DATE') {
        const dowStr = DAYS_OF_WEEK_VI[now.getDay()];
        const dateStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
        const reply = `${da}, hôm nay là ${dowStr}, ${dateStr} ạ.`;
        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          utilityQuery: qType,
          reply,
          speech: reply,
          suggestedReplies: ['Bây giờ mấy giờ?', 'Lịch hôm nay có gì?'],
        };
      }

      if (qType === 'GET_TODAY_SCHEDULE') {
        const todayReminders = reminderService.getRemindersForDate(now);
        if (todayReminders.length === 0) {
          const reply = `${da}, hôm nay ${addressing} không có lịch nhắc nhở hay lịch hẹn nào ạ. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} có muốn ${me} tạo nhắc nhở mới không ạ?`;
          return {
            handled: true,
            intentId: intent.id,
            category: intent.category,
            confidence,
            utilityQuery: qType,
            reply,
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

        const firstItem = todayReminders[0];
        const firstTime = new Date(firstItem.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          utilityQuery: qType,
          reply: `${da}, đây là lịch nhắc nhở hôm nay của ${addressing} ạ:\n${itemsText}`,
          speech: `${da}, hôm nay ${addressing} có ${todayReminders.length} lịch nhắc. Đầu tiên là "${firstItem.title}" lúc ${firstTime} ạ.`,
          suggestedReplies: ['Tạo nhắc nhở mới', 'Xem tất cả lịch nhắc'],
        };
      }

      if (qType === 'GET_TOMORROW_SCHEDULE') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowReminders = reminderService.getRemindersForDate(tomorrow);

        if (tomorrowReminders.length === 0) {
          return {
            handled: true,
            intentId: intent.id,
            category: intent.category,
            confidence,
            utilityQuery: qType,
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
          intentId: intent.id,
          category: intent.category,
          confidence,
          utilityQuery: qType,
          reply: `${da}, đây là lịch nhắc nhở ngày mai của ${addressing} ạ:\n${itemsText}`,
          speech: `${da}, ngày mai ${addressing} có ${tomorrowReminders.length} lịch nhắc ạ.`,
          suggestedReplies: ['Tạo nhắc nhở mới', 'Xem tất cả lịch nhắc'],
        };
      }

      if (qType === 'GET_UPCOMING_REMINDERS') {
        const upcoming = reminderService.getUpcomingReminders();
        if (upcoming.length === 0) {
          return {
            handled: true,
            intentId: intent.id,
            category: intent.category,
            confidence,
            utilityQuery: qType,
            reply: `${da}, hiện tại ${addressing} chưa có lịch nhắc nhở nào sắp tới ạ.`,
            speech: `${da}, hiện tại ${addressing} chưa có lịch nhắc nhở nào ạ.`,
            suggestedReplies: ['Tạo nhắc nhở uống thuốc', 'Tạo lịch hẹn mới'],
          };
        }

        const itemsText = upcoming
          .slice(0, 4)
          .map((r) => {
            const timeStr = reminderService.formatReminderDateTime(r.scheduledAt);
            const icon = r.category === 'medication' ? '💊' : r.category === 'appointment' ? '🩺' : '🔔';
            return `• ${icon} ${r.title}: ${timeStr}`;
          })
          .join('\n');

        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          utilityQuery: qType,
          reply: `${da}, đây là các lịch nhắc nhở sắp tới của ${addressing} ạ:\n${itemsText}`,
          speech: `${da}, ${addressing} có ${upcoming.length} lịch nhắc sắp tới ạ.`,
          suggestedReplies: ['Tạo nhắc nhở mới', 'Xem tất cả lịch nhắc'],
        };
      }

      if (qType === 'GET_WEATHER') {
        const weatherResult = await fetchCurrentWeatherReport({
          addressing,
          me,
          da,
          rawText: trimmedText,
        });

        if (weatherResult.needsClarification) {
          return {
            handled: true,
            intentId: intent.id,
            category: intent.category,
            confidence,
            utilityQuery: qType,
            needsClarification: true,
            clarificationActionType: 'GET_WEATHER',
            clarificationQuestion: weatherResult.reply,
            suggestedReplies: weatherResult.suggestedReplies,
          };
        }

        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          utilityQuery: qType,
          reply: weatherResult.reply,
          speech: weatherResult.speech,
          suggestedReplies: weatherResult.suggestedReplies,
        };
      }

      break;
    }

    // -------------------------------------------------------------
    // DELEGATE REMINDER PARSER (Create Reminders)
    // -------------------------------------------------------------
    case 'delegate_reminder_parser': {
      const parseRes = parseVietnameseReminderText(trimmedText);
      if (parseRes.status === 'resolved') {
        const rem = parseRes.reminder;
        const timeStr = reminderService.formatReminderDateTime(rem.scheduledAt);
        const icon = rem.category === 'medication' ? '💊' : rem.category === 'appointment' ? '🩺' : '🔔';

        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          appAction: {
            type: 'CREATE_REMINDER',
            payload: {
              title: rem.title,
              scheduledAt: rem.scheduledAt,
              category: rem.category,
              repeat: rem.repeat,
              priority: rem.priority,
              notes: rem.notes,
              skipConfirmation: true,
            },
          },
          reply: `${da}, ${me} đã tạo lịch nhắc: ${icon} "${rem.title}" vào ${timeStr} cho ${addressing} rồi ạ!`,
          speech: `${da}, ${me} đã tạo lịch nhắc "${rem.title}" vào ${timeStr} rồi ạ.`,
          suggestedReplies: ['Xem danh sách nhắc nhở', 'Tạo thêm nhắc nhở khác'],
        };
      }

      if (parseRes.status === 'needs_clarification') {
        const missing = parseRes.missing.includes('time') ? 'mấy giờ' : 'ngày nào';
        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          needsClarification: true,
          clarificationActionType: 'CREATE_REMINDER',
          clarificationQuestion: `${da}, ${addressing} muốn ${me} đặt nhắc "${parseRes.title}" vào lúc ${missing} ạ?`,
          suggestedReplies: ['Lúc 7 giờ sáng', 'Lúc 8 giờ tối', '30 phút nữa'],
        };
      }

      // Default affirmative reminder response if text didn't extract specific time
      return {
        handled: true,
        intentId: intent.id,
        category: intent.category,
        confidence,
        needsClarification: true,
        clarificationActionType: 'CREATE_REMINDER',
        clarificationQuestion: `${da}, ${addressing} muốn tạo nhắc nhở việc gì và vào lúc mấy giờ ạ?`,
        suggestedReplies: ['Nhắc uống thuốc 7h sáng', 'Nhắc đi khám 8h sáng mai'],
      };
    }

    // -------------------------------------------------------------
    // AGENT ACTIONS (Session Pause, Resume, Complete)
    // -------------------------------------------------------------
    case 'agent_action': {
      if (!session) {
        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          reply: `${da}, hiện tại chưa có phiên nào đang mở để thực hiện thao tác này ạ.`,
          speech: `${da}, hiện tại chưa có phiên nào đang mở ạ.`,
        };
      }

      if (intent.id === 'session.pause') {
        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          agentActions: [{ type: 'PAUSE_SESSION', payload: {} }],
          reply: `${da}, ${me} đã tạm dừng phiên hỗ trợ rồi nha. Khi nào ${addressing} muốn tiếp tục, chỉ cần bảo "tiếp tục" cho ${me} nhé${a}!`,
          speech: `${da}, ${me} đã tạm dừng phiên rồi ạ.`,
          suggestedReplies: ['Tiếp tục phiên', 'Xem lại danh sách việc'],
        };
      }

      if (intent.id === 'session.resume') {
        const stepTitle = session.nextRecommendedAction?.title || 'bước tiếp theo';
        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          agentActions: [{ type: 'RESUME_SESSION', payload: {} }],
          reply: `${da}, ${me} cùng ${addressing} tiếp tục công việc nhé${a}. Bước hiện tại là: "${stepTitle}".`,
          speech: `${da}, chúng ta tiếp tục công việc nhé. Bước hiện tại là: ${stepTitle}.`,
          suggestedReplies: ['Xong bước này rồi', 'Cần làm gì tiếp theo?'],
        };
      }

      if (intent.id === 'session.complete') {
        return {
          handled: true,
          intentId: intent.id,
          category: intent.category,
          confidence,
          agentActions: [{ type: 'COMPLETE_SESSION', payload: {} }],
          reply: `${praise} ${me.charAt(0).toUpperCase() + me.slice(1)} chúc mừng ${addressing} đã hoàn thành xuất sắc toàn bộ phiên "${session.title}" nhé! 🎉`,
          speech: `${praise} Chúc mừng ${addressing} đã hoàn thành toàn bộ phiên "${session.title}" rồi ạ!`,
        };
      }

      break;
    }

    // -------------------------------------------------------------
    // DELEGATE IN-SESSION SEMANTIC COMPLETION
    // -------------------------------------------------------------
    case 'delegate_session_local': {
      if (session) {
        const localRes = parseLocalIntent(trimmedText, session, context?.userProfile);
        if (localRes) {
          return {
            handled: true,
            intentId: intent.id,
            category: intent.category,
            confidence: localRes.confidence || confidence,
            agentActions: localRes.actions,
            reply: localRes.reply,
            speech: localRes.speech || localRes.reply,
            suggestedReplies: localRes.suggestedReplies,
          };
        }
      }
      break;
    }

    // -------------------------------------------------------------
    // CREATE SCENARIO TEMPLATE SESSION
    // -------------------------------------------------------------
    case 'create_session_template': {
      const scenarioKey = intent.appAction?.payload?.scenarioKey || 'general';
      const scenarioTitleMap: Record<string, string> = {
        healthcare: 'Đi khám bệnh & Uống thuốc',
        administrative: 'Làm thủ tục hành chính & Giấy tờ',
        shopping: 'Mua sắm & Đi chợ',
        documents: 'Quản lý giấy tờ tùy thân',
        mobility: 'Di chuyển & Đi lại an toàn',
        finance: 'Quản lý chi tiêu & Hóa đơn',
        work: 'Công việc & Phỏng vấn',
        education: 'Học tập & Rèn luyện trí não',
        home: 'Chăm sóc nhà cửa & Sửa chữa',
        communication: 'Giao tiếp & Kết nối gia đình',
        technology: 'Sử dụng điện thoại & Công nghệ',
        travel: 'Chuyến đi & Thăm người thân',
        safety: 'An toàn & Phòng ngừa rủi ro',
        caregiving: 'Chăm sóc người thân',
        planning: 'Lập kế hoạch sinh hoạt',
        custom: 'Mục tiêu cá nhân',
      };

      const title = scenarioTitleMap[scenarioKey] || 'Đồng hành cuộc sống';

      return {
        handled: true,
        intentId: intent.id,
        category: intent.category,
        confidence,
        appAction: {
          type: 'CREATE_SESSION',
          payload: {
            goal: trimmedText,
            sessionTitle: title,
            scenarioKey,
            creationMode: 'template',
          },
        },
        reply: `${da}, ${me} tạo ngay phiên hướng dẫn "${title}" cho ${addressing} đây ạ! ${me} đã chuẩn bị sẵn các bước thực hiện để đồng hành cùng ${addressing}.`,
        speech: `${da}, ${me} đã tạo ngay phiên hướng dẫn "${title}" cho ${addressing} rồi ạ!`,
      };
    }

    // -------------------------------------------------------------
    // UNSUPPORTED IN-APP CAPABILITIES (Maps, phone call, SMS, payment...)
    // -------------------------------------------------------------
    case 'unsupported_response': {
      const cap = intent.unsupportedCapability || 'việc này';
      const template = intent.responseTemplate ||
        `${da}, hiện ${me} chưa thể trực tiếp thực hiện {unsupportedCapability} bên ngoài ứng dụng. ${me} có thể tạo phiên hướng dẫn ${addressing} từng bước nếu cần ạ.`;

      const reply = formatResponseTemplate(template, honorifics, {
        unsupportedCapability: cap,
      });

      return {
        handled: true,
        intentId: intent.id,
        category: intent.category,
        confidence,
        reply,
        speech: reply,
        suggestedReplies: ['Tạo phiên hướng dẫn', 'Xem các chức năng hỗ trợ'],
      };
    }

    // -------------------------------------------------------------
    // CLARIFICATIONS (Vague help, generic open)
    // -------------------------------------------------------------
    case 'clarify': {
      const template = intent.responseTemplate || `${da}, ${addressing} muốn ${me} hỗ trợ việc gì cụ thể ạ?`;
      const q = formatResponseTemplate(template, honorifics);

      let candidates = ['Mở Camera', 'Lịch nhắc nhở', 'Cài đặt'];
      if (intent.id === 'clarify.vague_help') {
        candidates = ['Đi khám bệnh', 'Làm giấy tờ', 'Mua sắm', 'Tạo lịch nhắc'];
      }

      return {
        handled: true,
        intentId: intent.id,
        category: intent.category,
        confidence,
        reply: q,
        speech: q,
        needsClarification: true,
        clarificationQuestion: q,
        clarificationCandidates: candidates,
        suggestedReplies: candidates,
      };
    }

    default:
      break;
  }

  // Fallback to AI if unhandled
  return {
    handled: false,
    confidence: 0.3,
    needsAI: true,
  };
}
