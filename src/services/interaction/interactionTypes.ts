import { BriefSessionHeader } from '../storageService.js';
import { AgentAction } from '../../types.js';

export type InteractionInputMode = 'text' | 'voice';

export type LoviraPage =
  | 'dashboard'
  | 'session'
  | 'settings'
  | 'profile'
  | 'camera'
  | 'chat'
  | 'vision'
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
  | 'clarification'
  | 'confirm_reminder';

export interface PendingDraftReminder {
  title: string;
  scheduledAt: string;
  category?: 'medication' | 'appointment' | 'family' | 'general';
  repeat?: 'once' | 'daily' | 'weekly' | 'monthly';
  priority?: 'low' | 'normal' | 'high';
  leadTimeMinutes?: number;
  eventTime?: string;
  eventDate?: string;
  notes?: string;
  sessionId?: string;
}

export interface PendingInteraction {
  type: PendingInteractionType;
  scope?: 'global-chat' | 'session' | 'vision' | 'easy-understand';
  sessionId?: string;
  data: {
    goal?: string;
    actionType?: string;
    payload?: any;
    question?: string;
    action?: any;
    agentActions?: AgentAction[];
    intentId?: string;
    candidates?: string[];
    suggestedReplies?: string[];
    successReply?: string;
    cancelReply?: string;
    draftReminder?: PendingDraftReminder;
  };
  createdAt: string;
  expiresAt?: number;
}
