import { AppAction } from './appActionTypes';
import { reminderService } from '../reminderService';
import { storageService } from '../storageService';

export interface AppActionRuntimeContext {
  goHome: () => void;
  goBack: () => void;
  openSettings: () => void;
  openProfile: () => void;
  openSession: (sessionId: string) => void;
  createSession: (goal: string) => Promise<void>;
  openCamera: () => void;
  openReminders?: () => void;
  updateAccessibilitySetting?: (key: string, value: any) => void;
  saveUpdatedSession?: (session: any) => void;
  refreshSessionsList?: () => void;
  showToast: (msg: string) => void;
}

export async function applyAppAction(
  action: AppAction,
  context: AppActionRuntimeContext
): Promise<boolean> {
  if (!action) return false;

  try {
    switch (action.type) {
      case 'GO_HOME':
        context.goHome();
        return true;

      case 'GO_BACK':
        context.goBack();
        return true;

      case 'OPEN_SETTINGS':
        context.openSettings();
        return true;

      case 'OPEN_PROFILE':
        context.openProfile();
        return true;

      case 'OPEN_CAMERA':
        context.openCamera();
        return true;

      case 'OPEN_REMINDERS':
        if (context.openReminders) {
          context.openReminders();
          return true;
        }
        return false;

      case 'CREATE_REMINDER': {
        const payload = action.payload;
        if (payload?.title && payload.scheduledAt) {
          reminderService.createReminder({
            title: payload.title,
            scheduledAt: payload.scheduledAt,
            notes: payload.notes,
            category: payload.category || 'general',
            repeat: payload.repeat || 'once',
            priority: payload.priority || 'normal',
            sessionId: payload.sessionId,
          });
          context.showToast(`🔔 Đã tạo nhắc nhở: ${payload.title}`);
          return true;
        }
        return false;
      }

      case 'UPDATE_REMINDER': {
        const reminderId = action.payload?.reminderId;
        if (reminderId) {
          const updates: any = {};
          if (action.payload?.title) updates.title = action.payload.title;
          if (action.payload?.scheduledAt) updates.scheduledAt = action.payload.scheduledAt;
          if (action.payload?.notes !== undefined) updates.notes = action.payload.notes;
          if (action.payload?.category) updates.category = action.payload.category;
          if (action.payload?.repeat) updates.repeat = action.payload.repeat;
          if (action.payload?.priority) updates.priority = action.payload.priority;
          if (action.payload?.reminder) Object.assign(updates, action.payload.reminder);

          const updated = reminderService.updateReminder(reminderId, updates);
          if (updated) {
            context.showToast(`✏️ Đã cập nhật nhắc nhở: ${updated.title}`);
            return true;
          }
        }
        return false;
      }

      case 'SNOOZE_REMINDER': {
        const reminderId = action.payload?.reminderId;
        const preset = action.payload?.snoozePreset || '10m';
        const mins = action.payload?.snoozeMinutes;
        if (reminderId) {
          reminderService.snoozeReminder(reminderId, mins || preset);
          context.showToast('⏰ Đã hoãn nhắc nhở');
          return true;
        }
        return false;
      }

      case 'COMPLETE_REMINDER': {
        const reminderId = action.payload?.reminderId;
        if (reminderId) {
          reminderService.toggleComplete(reminderId);
          context.showToast('✓ Đã đánh dấu hoàn thành nhắc nhở');
          return true;
        }
        return false;
      }

      case 'DELETE_REMINDER': {
        const reminderId = action.payload?.reminderId;
        if (reminderId) {
          reminderService.deleteReminder(reminderId);
          context.showToast('🗑️ Đã xóa nhắc nhở');
          return true;
        }
        return false;
      }

      case 'PIN_SESSION': {
        const sessionId = action.payload?.sessionId;
        if (sessionId) {
          const session = storageService.getSession(sessionId);
          if (session) {
            session.pinned = !session.pinned;
            if (context.saveUpdatedSession) {
              context.saveUpdatedSession(session);
            } else {
              storageService.saveSession(session);
            }
            if (context.refreshSessionsList) {
              context.refreshSessionsList();
            }
            context.showToast(session.pinned ? '📌 Đã ghim phiên' : 'Đã bỏ ghim phiên');
            return true;
          }
        }
        return false;
      }

      case 'ARCHIVE_SESSION': {
        const sessionId = action.payload?.sessionId;
        if (sessionId) {
          const session = storageService.getSession(sessionId);
          if (session) {
            session.status = session.status === 'archived' ? 'active' : 'archived';
            if (context.saveUpdatedSession) {
              context.saveUpdatedSession(session);
            } else {
              storageService.saveSession(session);
            }
            if (context.refreshSessionsList) {
              context.refreshSessionsList();
            }
            context.showToast(session.status === 'archived' ? '📦 Đã lưu trữ phiên' : 'Đã khôi phục phiên');
            return true;
          }
        }
        return false;
      }

      case 'OPEN_SESSION': {
        const sessionId = action.payload?.sessionId;
        if (sessionId) {
          context.openSession(sessionId);
          return true;
        }
        return false;
      }

      case 'CREATE_SESSION': {
        const goal = action.payload?.goal;
        if (goal) {
          await context.createSession(goal);
          return true;
        }
        return false;
      }

      case 'UPDATE_ACCESSIBILITY_SETTING': {
        const setting = action.payload?.setting;
        const value = action.payload?.value;
        if (setting && context.updateAccessibilitySetting) {
          context.updateAccessibilitySetting(setting, value);
          return true;
        }
        return false;
      }

      default:
        console.warn('Unknown app action:', action);
        return false;
    }
  } catch (e) {
    console.error('Error applying app action:', e);
    return false;
  }
}
