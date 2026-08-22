import { LifeSession } from '../types';
import { UserProfile, PronounStyle } from '../types/userProfile';

/**
 * Filter sensitive self-reported health conditions based on the current session scenario type.
 * Section 5.1 of specification:
 * - "medical" scenario -> Send ALL self-reported conditions.
 * - Other scenarios -> Do NOT send medical conditions unless explicitly relevant.
 */
export function getRelevantConditions(
  allConditions: string[] = [],
  scenarioType: LifeSession['scenarioType']
): string[] {
  if (!allConditions || allConditions.length === 0) return [];
  if (scenarioType === 'medical') return allConditions;
  return [];
}

/**
 * Builds addressing string e.g. "anh Minh", "chị Hoa", "ông Hùng", "bạn Tuấn"
 * Section 5.2 of specification
 */
export function buildAddressing(profile: UserProfile | null): string | undefined {
  if (!profile) return undefined;

  const pronounMap: Record<PronounStyle, string> = {
    anh: 'anh',
    chi: 'chị',
    ong: 'ông',
    ba: 'bà',
    ban: 'bạn',
    custom: profile.customPronoun?.trim() || 'bạn',
  };

  const pronoun = profile.pronounStyle ? pronounMap[profile.pronounStyle] : 'bạn';

  if (profile.preferredName?.trim()) {
    return `${pronoun} ${profile.preferredName.trim()}`;
  }

  return pronoun !== 'bạn' ? pronoun : undefined;
}
