import { BriefSessionHeader } from '../storageService';

export type InteractionInputMode = 'text' | 'voice';

export type LoviraPage =
  | 'dashboard'
  | 'session'
  | 'settings'
  | 'profile'
  | 'camera'
  | 'other';

export interface AppInteractionContext {
  page: LoviraPage;
  activeSessionId?: string;
  activeSessionTitle?: string;
  hasActiveSession: boolean;
  availableSessions?: BriefSessionHeader[];
}

export type PendingInteractionType =
  | 'create_session'
  | 'confirm_action'
  | 'clarification';

export interface PendingInteraction {
  type: PendingInteractionType;
  data: {
    goal?: string;
    actionType?: string;
    payload?: any;
    question?: string;
  };
  createdAt: string;
  expiresAt?: number;
}
