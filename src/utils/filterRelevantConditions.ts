import { LifeSession } from '../types';
import { UserProfile, PronounStyle } from '../types/userProfile';

export interface SessionContextDescriptor {
  scenarioType?: string;
  scenarioFamily?: string;
  subtype?: string;
}

/**
 * Filter sensitive self-reported health conditions based on the current session context.
 * - Healthcare/medical scenarios -> Send all health conditions.
 * - Movement/transit scenarios -> Include mobility/vision relevant conditions.
 * - Other scenarios -> Do not leak medical conditions unless directly relevant.
 */
export function getRelevantConditions(
  allConditions: string[] = [],
  sessionContext?: string | SessionContextDescriptor
): string[] {
  if (!allConditions || allConditions.length === 0) return [];

  let scenarioType = '';
  let scenarioFamily = '';
  let subtype = '';

  if (typeof sessionContext === 'string') {
    scenarioType = sessionContext;
  } else if (sessionContext) {
    scenarioType = sessionContext.scenarioType || '';
    scenarioFamily = sessionContext.scenarioFamily || '';
    subtype = sessionContext.subtype || '';
  }

  const isMedicalOrHealth =
    scenarioType === 'medical' ||
    scenarioFamily === 'healthcare' ||
    scenarioFamily === 'safety' ||
    subtype.includes('medical') ||
    subtype.includes('kham_benh') ||
    subtype.includes('tiem_chung');

  if (isMedicalOrHealth) {
    return allConditions;
  }

  if (
    scenarioFamily === 'mobility' ||
    scenarioType === 'movement' ||
    subtype.includes('di_chuyen') ||
    subtype.includes('xe_bus')
  ) {
    return allConditions.filter((c) => {
      const cLower = c.toLowerCase();
      return (
        cLower.includes('đi lại') ||
        cLower.includes('chân') ||
        cLower.includes('khớp') ||
        cLower.includes('xe lăn') ||
        cLower.includes('mắt') ||
        cLower.includes('thị lực')
      );
    });
  }

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
