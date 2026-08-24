import { AppAction } from './appActionTypes';
import { AppInteractionContext } from './interactionTypes';
import { reminderService } from '../reminderService';
import { storageService } from '../storageService';

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

function resolveTargetReminder(
  payload: any,
  reminders: any[]
): { reminderId?: string; errorReason?: string } {
  if (payload?.reminderId) {
    const found = reminders.find((r) => r.id === payload.reminderId);
    if (found) return { reminderId: found.id };
  }

  const titleQuery = payload?.title?.toLowerCase().trim();
  const activeReminders = reminders.filter((r) => r.status === 'active');

  if (titleQuery) {
    const exactMatches = activeReminders.filter((r) => r.title.toLowerCase() === titleQuery);
    if (exactMatches.length === 1) return { reminderId: exactMatches[0].id };

    const partialMatches = activeReminders.filter((r) => r.title.toLowerCase().includes(titleQuery));
    if (partialMatches.length === 1) return { reminderId: partialMatches[0].id };
    if (partialMatches.length > 1) {
      return {
        errorReason: `Có ${partialMatches.length} nhắc nhở khớp với "${titleQuery}". Chú muốn thực hiện với nhắc nhở nào cụ thể ạ?`,
      };
    }
  }

  if (activeReminders.length === 1) {
    return { reminderId: activeReminders[0].id };
  }
  if (activeReminders.length > 1) {
    return {
      errorReason: 'Dạ chú muốn thực hiện với nhắc nhở nào cụ thể ạ?',
    };
  }

  return { errorReason: 'Hiện không có nhắc nhở nào đang hoạt động.' };
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
    case 'OPEN_REMINDERS':
      return { valid: true, action };

    case 'OPEN_SESSION': {
      const sessionId = action.payload?.sessionId;
      const rawTitle = action.payload?.sessionTitle?.trim();
      const sessionTitle = rawTitle ? rawTitle.toLowerCase() : '';
      const sessions = context.availableSessions || [];

      // 1. Direct ID match (if explicit sessionId is provided, it MUST exist)
      if (sessionId) {
        const found = sessions.find((s) => s.id === sessionId);
        if (!found) {
          return {
            valid: false,
            reason: 'Không tìm thấy phiên với ID này.',
          };
        }
        return { valid: true, action, resolvedSessionId: found.id };
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

    case 'PIN_SESSION': {
      const targetSessionId = action.payload?.sessionId || context.activeSessionId;
      if (!targetSessionId) {
        return { valid: false, reason: 'Không tìm thấy phiên để ghim' };
      }
      return {
        valid: true,
        action: {
          ...action,
          payload: { ...action.payload, sessionId: targetSessionId },
        },
      };
    }

    case 'ARCHIVE_SESSION': {
      const targetSessionId = action.payload?.sessionId || context.activeSessionId;
      if (!targetSessionId) {
        return { valid: false, reason: 'Không tìm thấy phiên để lưu trữ' };
      }
      return {
        valid: true,
        action: {
          ...action,
          payload: { ...action.payload, sessionId: targetSessionId },
        },
      };
    }

    case 'CREATE_REMINDER': {
      const title = action.payload?.title?.trim();
      let scheduledAt = action.payload?.scheduledAt?.trim();

      if (!title || title.length < 2) {
        return { valid: false, reason: 'Tiêu đề nhắc nhở không được để trống' };
      }

      if (!scheduledAt) {
        return { valid: false, reason: 'Dạ chú muốn con nhắc chú vào lúc mấy giờ ạ?' };
      } else {
        const d = new Date(scheduledAt);
        if (isNaN(d.getTime())) {
          return { valid: false, reason: 'Thời gian nhắc nhở không hợp lệ' };
        }
        scheduledAt = d.toISOString();
      }

      return {
        valid: true,
        action: {
          ...action,
          payload: {
            ...action.payload,
            title,
            scheduledAt,
            category: action.payload?.category || 'general',
            repeat: action.payload?.repeat || 'once',
            priority: action.payload?.priority || 'normal',
          },
        },
      };
    }

    case 'UPDATE_REMINDER': {
      const reminders = reminderService.getReminders();
      const resolved = resolveTargetReminder(action.payload, reminders);
      if (!resolved.reminderId) {
        return { valid: false, reason: resolved.errorReason || 'Không tìm thấy nhắc nhở để cập nhật' };
      }

      return {
        valid: true,
        action: {
          ...action,
          payload: { ...action.payload, reminderId: resolved.reminderId },
        },
      };
    }

    case 'DELETE_REMINDER': {
      const reminders = reminderService.getReminders();
      const resolved = resolveTargetReminder(action.payload, reminders);
      if (!resolved.reminderId) {
        return { valid: false, reason: resolved.errorReason || 'Không tìm thấy nhắc nhở để xóa' };
      }

      const targetRem = reminders.find((r) => r.id === resolved.reminderId);
      const remTitle = targetRem ? targetRem.title : 'này';
      const requiresConfirmation = !action.payload?.skipConfirmation;

      return {
        valid: true,
        action: {
          ...action,
          payload: { ...action.payload, reminderId: resolved.reminderId, title: remTitle },
          requiresConfirmation,
          confirmationPrompt: `Chú có chắc muốn xóa nhắc nhở "${remTitle}" không ạ?`,
        },
      };
    }

    case 'SNOOZE_REMINDER': {
      const reminders = reminderService.getReminders();
      const resolved = resolveTargetReminder(action.payload, reminders);
      if (!resolved.reminderId) {
        return { valid: false, reason: resolved.errorReason || 'Không tìm thấy nhắc nhở để báo lại' };
      }

      return {
        valid: true,
        action: {
          ...action,
          payload: {
            ...action.payload,
            reminderId: resolved.reminderId,
            snoozePreset: action.payload?.snoozePreset || '10m',
          },
        },
      };
    }

    case 'COMPLETE_REMINDER': {
      const reminders = reminderService.getReminders();
      const resolved = resolveTargetReminder(action.payload, reminders);
      if (!resolved.reminderId) {
        return { valid: false, reason: resolved.errorReason || 'Không tìm thấy nhắc nhở để hoàn thành' };
      }

      return {
        valid: true,
        action: {
          ...action,
          payload: { ...action.payload, reminderId: resolved.reminderId },
        },
      };
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
          let boolVal: boolean;
          if (value === true || value === 'true' || value === 1 || value === '1') {
            boolVal = true;
          } else if (value === false || value === 'false' || value === 0 || value === '0') {
            boolVal = false;
          } else {
            return {
              valid: false,
              reason: `Giá trị cho cài đặt "${setting}" phải là bật (true/1) hoặc tắt (false/0).`,
            };
          }
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

