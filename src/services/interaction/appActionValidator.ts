import { AppAction } from './appActionTypes';
import { AppInteractionContext } from './interactionTypes';

export interface AppActionValidationResult {
  valid: boolean;
  action?: AppAction;
  resolvedSessionId?: string;
  reason?: string;
}

const ACTIVE_SESSION_KEYWORDS = [
  'hiện tại',
  'đang làm',
  'quay lại',
  'phiên này',
  'bước này',
  'current',
  'active',
];

export function validateAppAction(
  action: AppAction,
  context: AppInteractionContext
): AppActionValidationResult {
  if (!action || !action.type) {
    return { valid: false, reason: 'Hành động ứng dụng không có định dạng hợp lệ' };
  }

  switch (action.type) {
    case 'GO_HOME':
    case 'GO_BACK':
    case 'OPEN_SETTINGS':
    case 'OPEN_PROFILE':
    case 'OPEN_CAMERA':
      return { valid: true, action };

    case 'OPEN_SESSION': {
      const sessionId = action.payload?.sessionId;
      const rawTitle = action.payload?.sessionTitle?.trim();
      const sessionTitle = rawTitle ? rawTitle.toLowerCase() : '';
      const sessions = context.availableSessions || [];

      // 1. Direct ID match
      if (sessionId) {
        const found = sessions.find((s) => s.id === sessionId);
        if (found) {
          return { valid: true, action, resolvedSessionId: found.id };
        }
      }

      // 2. Title/keyword match in available sessions
      if (sessionTitle && sessions.length > 0) {
        const exactMatch = sessions.find(
          (s) =>
            s.title.toLowerCase() === sessionTitle ||
            (s.goal || '').toLowerCase() === sessionTitle
        );
        if (exactMatch) {
          return { valid: true, action, resolvedSessionId: exactMatch.id };
        }

        const substringMatches = sessions.filter(
          (s) =>
            s.title.toLowerCase().includes(sessionTitle) ||
            (s.goal || '').toLowerCase().includes(sessionTitle)
        );

        if (substringMatches.length === 1) {
          return { valid: true, action, resolvedSessionId: substringMatches[0].id };
        }

        if (substringMatches.length > 1) {
          return {
            valid: false,
            reason: `Có nhiều phiên liên quan đến "${rawTitle}". Bạn muốn mở phiên nào cụ thể?`,
          };
        }
      }

      // 3. Fallback to active session ONLY if the user explicitly meant the current/active session
      const isExplicitCurrent =
        !sessionTitle ||
        ACTIVE_SESSION_KEYWORDS.some((kw) => sessionTitle.includes(kw));

      if (isExplicitCurrent && context.hasActiveSession && context.activeSessionId) {
        return { valid: true, action, resolvedSessionId: context.activeSessionId };
      }

      // If user named a specific session title that does not exist, reject instead of incorrectly opening current session
      if (rawTitle) {
        return { valid: false, reason: `Không tìm thấy phiên hỗ trợ nào có tên "${rawTitle}".` };
      }

      return { valid: false, reason: 'Không tìm thấy phiên hỗ trợ phù hợp để mở.' };
    }

    case 'CREATE_SESSION': {
      const goal = action.payload?.goal?.trim();
      if (!goal || goal.length < 3) {
        return { valid: false, reason: 'Mục tiêu phiên làm việc không đủ thông tin' };
      }
      return { valid: true, action };
    }

    case 'UPDATE_ACCESSIBILITY_SETTING': {
      const setting = action.payload?.setting;
      const value = action.payload?.value;
      if (!setting) {
        return { valid: false, reason: 'Thiếu tên cài đặt trợ năng' };
      }

      // Whitelist validation for security and type safety
      switch (setting) {
        case 'fontScale': {
          const num = Number(value);
          if (![1, 1.25, 1.5, 1.75].includes(num)) {
            return { valid: false, reason: 'Cỡ chữ hỗ trợ: 1 (chuẩn), 1.25 (vừa), 1.5 (lớn), 1.75 (rất lớn)' };
          }
          return { valid: true, action: { ...action, payload: { setting, value: num } } };
        }
        case 'highContrast':
        case 'speakResponse':
        case 'vslEnabled':
        case 'reducedMotion': {
          const boolVal = value === true || value === 'true' || value === 1;
          return { valid: true, action: { ...action, payload: { setting, value: boolVal } } };
        }
        case 'theme': {
          if (typeof value !== 'string' || !['light', 'dark', 'system'].includes(value)) {
            return { valid: false, reason: 'Giao diện hỗ trợ: light (sáng), dark (tối), system (theo máy)' };
          }
          return { valid: true, action };
        }
        default:
          return { valid: false, reason: `Cài đặt trợ năng "${setting}" không được hỗ trợ` };
      }
    }

    default:
      return { valid: false, reason: `Loại hành động ứng dụng không hỗ trợ: ${(action as any).type}` };
  }
}
