export type AppActionType =
  | 'GO_HOME'
  | 'GO_BACK'
  | 'OPEN_SESSION'
  | 'CREATE_SESSION'
  | 'OPEN_SETTINGS'
  | 'OPEN_PROFILE'
  | 'OPEN_CAMERA'
  | 'UPDATE_ACCESSIBILITY_SETTING';

export interface AppActionPayload {
  sessionId?: string;
  sessionTitle?: string;
  goal?: string;
  page?: string;
  setting?: string;
  value?: unknown;
}

export interface AppAction {
  type: AppActionType;
  payload?: AppActionPayload;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
}
