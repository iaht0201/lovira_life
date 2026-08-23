import { AppAction } from './services/interaction/appActionTypes';
import { PendingInteraction } from './services/interaction/interactionTypes';

export * from './types/userProfile';
export * from './types/clarification';
export * from './services/voice/voiceTypes';
export * from './services/interaction/interactionTypes';
export * from './services/interaction/appActionTypes';

export type SessionStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type ScenarioType = 'medical' | 'administrative' | 'shopping' | 'document' | 'custom';

export type ScenarioFamily =
  | 'healthcare'
  | 'administrative'
  | 'shopping'
  | 'documents'
  | 'mobility'
  | 'finance'
  | 'work'
  | 'education'
  | 'home'
  | 'communication'
  | 'technology'
  | 'travel'
  | 'safety'
  | 'caregiving'
  | 'planning'
  | 'custom';

export type LifeModule =
  | 'appointment'
  | 'checklist'
  | 'documents'
  | 'navigation'
  | 'queue'
  | 'people'
  | 'deadline'
  | 'instructions'
  | 'warnings'
  | 'shoppingList'
  | 'followUp'
  | 'notes';

export type ImportantFactType =
  | 'date'
  | 'time'
  | 'location'
  | 'person'
  | 'requirement'
  | 'instruction'
  | 'warning'
  | 'reference'
  | 'contact'
  | 'cost'
  | 'identifier'
  | 'note';

export interface ImportantFact {
  id: string;
  type: ImportantFactType;
  title: string;
  value: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface LifeTask {
  id: string;
  title: string;
  description?: string;
  order: number;
  status: TaskStatus;
  important?: boolean;
  priority?: 'low' | 'normal' | 'high';
  stage?: string;
  relatedFacts?: string[];
  source?: 'template' | 'ai' | 'user';
  parentTaskId?: string;       // undefined = task cha (top-level)
  subtasks?: LifeTask[];       // chỉ populate ở task cha; rỗng/undefined nếu task không cần chia nhỏ
  completionSource?: 'explicit' | 'inferred' | 'outcome'; // Nguồn hoàn thành: trực tiếp, suy luận qua ngữ cảnh hội thoại, hoặc qua kết quả chung của phiên
  completedAt?: string;
}

export interface RecommendedAction {
  title: string;
  description?: string;
  actionType?: string;
  taskId?: string;
  parentContext?: string;       // ví dụ: "(thuộc: Chuẩn bị hồ sơ)"
}

export type ResourceType = 'image' | 'audio' | 'document' | 'note';

export interface SessionResource {
  id: string;
  type: ResourceType;
  title: string;
  url?: string;
  data?: string; // base64 or IndexedDB ref
  note?: string;
  createdAt: string;
}

export interface SessionMessage {
  id: string;
  sender: 'user' | 'lovira' | 'system';
  text: string;
  timestamp: string;
  inputMode?: 'text' | 'voice';
  actionsApplied?: AgentAction[];
  suggestedReplies?: string[];
}

export interface SessionActionLogEntry {
  id: string;
  timestamp: string;
  actionType: string;
  summary: string;
  triggeredBy: 'chat' | 'voice' | 'manual' | 'camera' | 'system';
}

export interface AccessibilityContext {
  visual?: 'none' | 'lowVision' | 'blind';
  hearing?: 'none' | 'hardOfHearing' | 'deaf';
  mobility?: 'none' | 'limited' | 'wheelchair';
  cognition?: 'none' | 'needsSimplification';
  preferredInteraction?: 'text' | 'voice' | 'visual';
  oneStepMode?: boolean;
}

export interface LifeSession {
  id: string;
  title: string;
  scenarioType: ScenarioType;
  scenarioFamily?: ScenarioFamily;
  subtype?: string;
  tags?: string[];
  modules?: LifeModule[];
  status: SessionStatus;
  goal: string;
  createdAt: string;
  updatedAt: string;
  currentStepId?: string;
  nextRecommendedAction?: RecommendedAction;
  importantFacts: ImportantFact[];
  warnings?: ImportantFact[];
  tasks: LifeTask[];
  resources: SessionResource[];
  messages: SessionMessage[];
  actionLog: SessionActionLogEntry[];
  accessibilityContext?: AccessibilityContext;
}

export type AgentActionType =
  | 'ADD_FACT'
  | 'UPDATE_FACT'
  | 'DELETE_FACT'
  | 'ADD_TASK'
  | 'UPDATE_TASK'
  | 'COMPLETE_TASK'
  | 'SKIP_TASK'
  | 'DELETE_TASK'
  | 'REORDER_TASK'
  | 'ADD_SUBTASK'
  | 'COMPLETE_SUBTASK'
  | 'UPDATE_NEXT_ACTION'
  | 'CHANGE_GOAL'
  | 'ADD_RESOURCE'
  | 'UPDATE_SESSION'
  | 'PAUSE_SESSION'
  | 'RESUME_SESSION'
  | 'COMPLETE_SESSION'
  | 'SPEAK_TEXT'
  | 'STOP_SPEECH'
  | 'OPEN_CAMERA';

export interface AgentActionPayload {
  // Fact
  factId?: string;
  category?: ImportantFactType;
  title?: string;
  value?: string;
  source?: string;
  // Task & Subtask
  taskId?: string;
  parentTaskId?: string;
  subtaskId?: string;
  relatedTaskId?: string;
  description?: string;
  important?: boolean;
  order?: number;
  priority?: 'low' | 'normal' | 'high';
  stage?: string;
  // Goal
  goal?: string;
  // Resource
  resourceType?: ResourceType;
  data?: string;
  note?: string;
}

export interface AgentAction {
  type: AgentActionType;
  payload: AgentActionPayload;
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
}

export interface LoviraAgentResponse {
  reply: string;
  speech?: string;
  actions: AgentAction[];
  appActions?: AppAction[];
  pendingInteraction?: PendingInteraction;
  suggestedReplies?: string[];
  nextRecommendedAction?: RecommendedAction;
  warnings?: string[];
  meta?: {
    engine: 'local' | 'groq' | 'gemini';
    model?: string;
    processingTime?: number;
  };
}

export interface GeneratedTask {
  title: string;
  description?: string;
  order: number;
  important?: boolean;
  subtasks?: { title: string; description?: string; order: number }[];
}

export interface GeneratedSessionPlan {
  title: string;
  goal: string;
  scenarioType: ScenarioType;
  scenarioFamily?: ScenarioFamily;
  secondaryFamilies?: ScenarioFamily[];
  subtype?: string;
  tags?: string[];
  modules?: LifeModule[];
  tasks: GeneratedTask[];
  importantFacts?: {
    type: ImportantFactType;
    title: string;
    value: string;
  }[];
  firstRecommendedAction: string;
}

export interface AccessibilitySettings {
  fontScale: number; // 1 (100%), 1.25 (125%), 1.5 (150%), 1.75 (175%)
  highContrast: boolean;
  theme: 'light' | 'dark' | 'system';
  speakResponse: boolean;
  vslEnabled: boolean;
  reducedMotion: boolean;
}

export interface ModelProfile {
  id: string;
  provider: 'groq' | 'gemini';
  capability: 'fast' | 'reasoning' | 'conversation' | 'vision' | 'lite';
  supportsVision: boolean;
  supportsToolCalling: boolean;
}

export interface AISettings {
  provider: 'gemini' | 'groq' | 'demo';
  apiKey?: string;
  selectedModel: string;
  demoMode: boolean;
}

export type { BriefSessionHeader } from './services/storageService';
