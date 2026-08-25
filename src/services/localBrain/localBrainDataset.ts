/**
 * Lovira Local Brain Intent Dataset Types & Runtime Accessor
 * Source of truth: src/data/localBrain/localBrain.json
 */

import { LOCAL_BRAIN_DATASET_GENERATED } from './localBrainDataset.generated.js';

export interface LocalBrainIntent {
  id: string;
  category: string;
  handler: string;
  risk: string;
  priority: number;
  minConfidence: number;
  autoExecute: boolean;
  requiresConfirmation: boolean;
  requiresSession: boolean;
  requiredSlots: string[];
  examples: string[];
  negativeExamples?: string[];
  responseTemplate?: string;
  appAction?: any;
  utilityQuery?: string;
  agentAction?: any;
  scenarioFamily?: string;
  unsupportedCapability?: string;
}

export interface LocalBrainDataset {
  schemaVersion: number;
  name: string;
  language: string;
  purpose: string;
  sourceRepo?: string;
  sourceCommit?: string;
  sourceComponents?: string[];
  designRules?: string[];
  aliases: Record<string, string>;
  intents: LocalBrainIntent[];
}

export const LOCAL_BRAIN_DATASET: LocalBrainDataset = LOCAL_BRAIN_DATASET_GENERATED;
