import { AppAction } from './appActionTypes';
import { AppInteractionContext } from './interactionTypes';

export interface AppActionValidationResult {
  valid: boolean;
  action?: AppAction;
  resolvedSessionId?: string;
  reason?: string;
}

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
      const sessionTitle = action.payload?.sessionTitle?.trim().toLowerCase();
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
          (s) => s.title.toLowerCase() === sessionTitle || s.goal.toLowerCase() === sessionTitle
        );
        if (exactMatch) {
          return { valid: true, action, resolvedSessionId: exactMatch.id };
        }

        const substringMatches = sessions.filter(
          (s) =>
            s.title.toLowerCase().includes(sessionTitle) ||
            s.goal.toLowerCase().includes(sessionTitle)
        );

        if (substringMatches.length === 1) {
          return { valid: true, action, resolvedSessionId: substringMatches[0].id };
        }

        if (substringMatches.length > 1) {
          return {
            valid: false,
            reason: `Có nhiều phiên liên quan đến "${sessionTitle}". Bạn muốn mở phiên nào cụ thể?`,
          };
        }
      }

      // If active session exists and user says open active session
      if (context.hasActiveSession && context.activeSessionId) {
        return { valid: true, action, resolvedSessionId: context.activeSessionId };
      }

      return { valid: false, reason: 'Không tìm thấy phiên hỗ trợ phù hợp để mở' };
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
      if (!setting) {
        return { valid: false, reason: 'Thiếu tên cài đặt trợ năng' };
      }
      return { valid: true, action };
    }

    default:
      return { valid: false, reason: `Loại hành động ứng dụng không hỗ trợ: ${(action as any).type}` };
  }
}
