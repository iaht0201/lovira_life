import { PendingInteraction } from './interactionTypes';
import { AppAction } from './appActionTypes';

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

export function resolvePendingInteraction(
  userText: string,
  pending: PendingInteraction | null
): PendingResolution {
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

  return { resolved: false, clearPending: false };
}
