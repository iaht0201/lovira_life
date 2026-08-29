import { LifeSession } from '../../types.js';

export enum GeminiModelName {
  FLASH_3_7 = 'gemini-3.7-flash',
  FLASH_2_5 = 'gemini-2.5-flash',
  PRO_2_5 = 'gemini-2.5-pro',
}

export function selectGeminiModel(message: string, session?: LifeSession | null): string {
  const text = message.toLowerCase();

  // 1. Deep reasoning required (Conflict resolution, multi-step tradeoff, clinical note parsing)
  if (
    text.includes('trễ') ||
    text.includes('nên làm gì trước') ||
    text.includes('xung đột') ||
    text.includes('không kịp') ||
    text.includes('ưu tiên') ||
    (text.length > 150 && (text.includes('và') || text.includes('hoặc')))
  ) {
    return GeminiModelName.FLASH_3_7;
  }

  // 2. Fast default model for all interactions
  return GeminiModelName.FLASH_3_7;
}


