import { LifeSession, LifeTask, ImportantFact, SessionResource, SessionMessage, SessionActionLogEntry, RecommendedAction, ScenarioFamily } from '../../types.js';
import { UserProfile } from '../../types/userProfile.js';

export type LoviraAuthStatus =
  | 'initializing'
  | 'guest'
  | 'authenticated'
  | 'error';

export interface LoviraAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: string[];
  emailVerified: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface CloudUserDocument {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  providers: string[];
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  lastLoginAt: any; // Timestamp
  schemaVersion: number;
  sync: {
    sessions: boolean;
    profile: boolean;
  };
}

export interface CloudSyncSettings {
  syncSessions: boolean;
  syncProfile: boolean;
  lastSyncAt?: string;
}

export type CloudSyncStatus =
  | 'disabled'
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error';

export interface CloudLifeSession {
  id: string;
  ownerId: string;
  title: string;
  goal: string;
  scenarioType: string;
  scenarioFamily?: ScenarioFamily;
  subtype?: string;
  status: string;
  tasks: LifeTask[];
  importantFacts: ImportantFact[];
  resources?: SessionResource[];
  messages: SessionMessage[];
  actionLog: SessionActionLogEntry[];
  currentStepId?: string;
  nextRecommendedAction?: RecommendedAction;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  schemaVersion: number;
}

export interface CloudUserProfile {
  preferredName?: string;
  pronounStyle?: string;
  customPronoun?: string;
  communicationPace?: string;
  // Sensitive profile info (only included when syncHealthToCloud === true)
  accessibilityContext?: string[];
  livesAlone?: boolean;
  hasCaregiverContact?: boolean;
  caregiverName?: string;
  caregiverPhone?: string;
  selfReportedConditions?: string[];
  syncHealthToCloud?: boolean;
  updatedAt: string;
  schemaVersion: number;
}

export enum FirestoreOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: FirestoreOperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
