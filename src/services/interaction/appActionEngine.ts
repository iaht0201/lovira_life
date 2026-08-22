import { AppAction } from './appActionTypes';

export interface AppActionRuntimeContext {
  goHome: () => void;
  goBack: () => void;
  openSettings: () => void;
  openProfile: () => void;
  openSession: (sessionId: string) => void;
  createSession: (goal: string) => Promise<void>;
  openCamera: () => void;
  updateAccessibilitySetting?: (key: string, value: any) => void;
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
