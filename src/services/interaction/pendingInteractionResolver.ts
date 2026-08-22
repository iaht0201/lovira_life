import { PendingInteraction } from './interactionTypes';
import { AppAction } from './appActionTypes';

const AFFIRMATIVE_REGEX =
  /^(có|ừ|uh|u|ok|oke|okie|được|tạo đi|tạo giúp|tạo luôn|đồng ý|nhất trí|tạo giúp chú|tạo giúp bác|tạo giúp tôi|tạo giúp cô|làm đi|tiến hành đi|mở đi|mở giúp)$/i;

const NEGATIVE_REGEX =
  /^(không|thôi|hủy|khỏi|không cần|thôi khỏi|bỏ qua|đừng|không tạo|thôi nha)$/i;

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

  return { resolved: false, clearPending: false };
}
