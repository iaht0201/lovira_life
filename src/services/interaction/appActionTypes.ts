import { Reminder, SnoozePreset } from '../../types/reminder.js';

export type AppActionType =
  | 'GO_HOME'
  | 'GO_BACK'
  | 'OPEN_SESSION'
  | 'CREATE_SESSION'
  | 'OPEN_SETTINGS'
  | 'OPEN_PROFILE'
  | 'OPEN_CAMERA'
  | 'OPEN_VISION'
  | 'TRIGGER_SOS'
  | 'OPEN_SOS'
  | 'UPDATE_ACCESSIBILITY_SETTING'
  | 'OPEN_REMINDERS'
  | 'CREATE_REMINDER'
  | 'UPDATE_REMINDER'
  | 'DELETE_REMINDER'
  | 'SNOOZE_REMINDER'
  | 'COMPLETE_REMINDER'
  | 'PIN_SESSION'
  | 'ARCHIVE_SESSION';

export interface AppActionPayload {
  sessionId?: string;
  sessionTitle?: string;
  goal?: string;
  scenarioKey?: string;
  creationMode?: 'template' | 'custom' | 'ai';
  page?: string;
  setting?: string;
  value?: unknown;
  // Reminder action payloads
  reminderId?: string;
  reminder?: Partial<Reminder>;
  snoozeMinutes?: number;
  snoozePreset?: SnoozePreset;
  title?: string;
  scheduledAt?: string;
  category?: 'medication' | 'appointment' | 'family' | 'general';
  notes?: string;
  eventTime?: string;
  eventDate?: string;
  leadTimeMinutes?: number;
  repeat?: 'once' | 'daily' | 'weekly' | 'monthly';
  priority?: 'normal' | 'high';
  skipConfirmation?: boolean;
  appConfirmed?: boolean;
}

export interface AppAction {
  type: AppActionType;
  payload?: AppActionPayload;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
}
