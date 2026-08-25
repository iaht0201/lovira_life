import { LifeSession, LoviraAgentResponse, UserProfile, InteractionInputMode, AppInteractionContext } from '../../../types.js';

export interface ChatOptions {
  session?: LifeSession | null;
  message: string;
  userProfile?: UserProfile | null;
  inputMode?: InteractionInputMode;
  appContext?: AppInteractionContext;
  modelOverride?: string;
}

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  chat(options: ChatOptions): Promise<LoviraAgentResponse>;
  generatePlan(prompt: string): Promise<any>;
}
