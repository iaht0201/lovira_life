import { PendingInteraction } from './interactionTypes.js';
import { AppAction } from './appActionTypes.js';
import { parseClarifiedTime } from '../../utils/dateTimeResolver.js';
import { fetchCurrentWeatherReport } from '../weatherService.js';

const AFFIRMATIVE_REGEX =
  /^(có|ừ|uh|u|ok|oke|okie|được|tạo đi|tạo giúp|tạo luôn|đồng ý|nhất trí|tạo giúp chú|tạo giúp bác|tạo giúp tôi|tạo giúp cô|làm đi|tiến hành đi|mở đi|mở giúp|xóa|xóa đi|xóa giúp|xóa luôn|chắc chắn|đồng ý xóa|ừ xóa đi|ok xóa)$/i;

const NEGATIVE_REGEX =
  /^(không|thôi|hủy|khỏi|không cần|thôi khỏi|bỏ qua|đừng|không tạo|không xóa|đừng xóa|giữ lại|thôi nha|thôi đừng)$/i;

export interface PendingResolution {
  resolved: boolean;
  appAction?: AppAction;
  reply?: string;
  clearPending: boolean;
}

export async function resolvePendingInteraction(
  userText: string,
  pending: PendingInteraction | null,
  opts?: { addressing?: string; me?: string; da?: string }
): Promise<PendingResolution> {
  if (!pending) {
    return { resolved: false, clearPending: false };
  }

  // Check expiry (e.g. valid within 3 minutes)
  const isExpired = pending.expiresAt && Date.now() > pending.expiresAt;
  if (isExpired) {
    return { resolved: false, clearPending: true };
  }

  const trimmed = userText.trim();

  if (pending.type === 'create_session') {
    if (AFFIRMATIVE_REGEX.test(trimmed)) {
      return {
        resolved: true,
        appAction: {
          type: 'CREATE_SESSION',
          payload: { goal: pending.data.goal },
        },
        reply: `Dạ, con tạo phiên hỗ trợ "${pending.data.goal}" cho bạn ngay bây giờ nhé!`,
        clearPending: true,
      };
    }

    if (NEGATIVE_REGEX.test(trimmed)) {
      return {
        resolved: true,
        reply: 'Dạ vâng, khi nào cần hỗ trợ việc gì bạn cứ nói với Lovira nhé!',
        clearPending: true,
      };
    }
  }

  if (pending.type === 'confirm_action') {
    if (AFFIRMATIVE_REGEX.test(trimmed) || trimmed.toLowerCase().includes('xóa') || trimmed.toLowerCase().includes('đồng ý')) {
      const actionToRun: AppAction = pending.data.action || {
        type: pending.data.actionType,
        payload: pending.data.payload,
      };
      return {
        resolved: true,
        appAction: actionToRun,
        reply: pending.data.successReply || 'Dạ vâng, con đã thực hiện thao tác rồi ạ!',
        clearPending: true,
      };
    }

    if (NEGATIVE_REGEX.test(trimmed) || trimmed.toLowerCase().includes('không') || trimmed.toLowerCase().includes('thôi')) {
      return {
        resolved: true,
        reply: pending.data.cancelReply || 'Dạ vâng, con đã hủy thao tác và giữ nguyên cho chú rồi ạ.',
        clearPending: true,
      };
    }
  }

  if (pending.type === 'clarification') {
    if (NEGATIVE_REGEX.test(trimmed)) {
      return {
        resolved: true,
        reply: 'Dạ vâng, con đã hủy rồi ạ.',
        clearPending: true,
      };
    }

    if (pending.data.actionType === 'GET_WEATHER') {
      const origQuery = pending.data.payload?.originalQuery || '';
      const combinedText = origQuery ? `${origQuery} ${trimmed}` : trimmed;
      const weatherResult = await fetchCurrentWeatherReport({
        rawText: combinedText,
        addressing: opts?.addressing,
        me: opts?.me,
        da: opts?.da,
      });

      if (weatherResult.needsClarification) {
        return {
          resolved: true,
          reply: weatherResult.reply,
          clearPending: false,
        };
      }

      return {
        resolved: true,
        reply: weatherResult.reply,
        clearPending: true,
      };
    }

    const norm = trimmed.toLowerCase();
    if (norm.includes('camera') || norm.includes('máy ảnh') || norm.includes('chụp')) {
      return {
        resolved: true,
        appAction: { type: 'OPEN_CAMERA' },
        reply: 'Dạ, con mở camera cho chú ngay đây ạ!',
        clearPending: true,
      };
    }
    if (norm.includes('nhắc nhở') || norm.includes('lịch hẹn') || norm.includes('lịch')) {
      return {
        resolved: true,
        appAction: { type: 'OPEN_REMINDERS' },
        reply: 'Dạ, con mở trang lịch nhắc nhở cho chú đây ạ!',
        clearPending: true,
      };
    }
    if (norm.includes('trang chủ') || norm.includes('về nhà') || norm.includes('màn hình chính')) {
      return {
        resolved: true,
        appAction: { type: 'GO_HOME' },
        reply: 'Dạ, con đưa chú về trang chủ ạ!',
        clearPending: true,
      };
    }

    if (pending.data.actionType === 'CREATE_REMINDER') {
      const targetDateStr = pending.data.payload?.targetDateStr;
      const resolvedDate = parseClarifiedTime(trimmed, targetDateStr);

      if (resolvedDate && !isNaN(resolvedDate.getTime())) {
        const title = pending.data.payload?.title || 'Nhắc nhở';
        const scheduledAt = resolvedDate.toISOString();
        const category = pending.data.payload?.category || 'general';
        const repeat = pending.data.payload?.repeat || 'once';
        const priority = pending.data.payload?.priority || 'normal';
        const sessionId = pending.data.payload?.sessionId;

        const timeFormatted = resolvedDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateFormatted = resolvedDate.toLocaleDateString('vi-VN');

        return {
          resolved: true,
          appAction: {
            type: 'CREATE_REMINDER',
            payload: {
              title,
              scheduledAt,
              category,
              repeat,
              priority,
              sessionId,
            },
          },
          reply: `Dạ, con đã lên lịch nhắc nhở "${title}" vào lúc ${timeFormatted} (${dateFormatted}) rồi ạ.`,
          clearPending: true,
        };
      } else {
        // If user gave an unclear time response, retain pending clarification and ask again nicely
        return {
          resolved: true,
          reply: "Dạ, con chưa nghe rõ giờ. Chú có thể nói ví dụ '7 giờ 30 sáng' giúp con nhé.",
          clearPending: false,
        };
      }
    }
  }

  return { resolved: false, clearPending: false };
}
