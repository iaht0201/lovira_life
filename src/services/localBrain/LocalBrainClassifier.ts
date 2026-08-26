import { LOCAL_BRAIN_DATASET, LocalBrainIntent } from './localBrainDataset.js';
import { stripVietnameseAccents } from '../interaction/VietnameseNormalizer.js';

export interface ClassificationMatch {
  intent: LocalBrainIntent;
  confidence: number;
  extractedSlots?: Record<string, string>;
  matchedExample?: string;
  matchType: 'exact' | 'slot' | 'substring' | 'token_overlap';
}

export interface ClassifierOptions {
  hasActiveSession?: boolean;
}

/**
 * Markers indicating deep reasoning, hesitation, conditional dilemma, or consultation
 * that MUST be delegated to AI instead of simple deterministic scenario creation.
 */
const COMPLEX_REASONING_MARKERS = [
  'nhưng',
  'tuy nhiên',
  'mặc dù',
  'chưa biết',
  'liệu',
  'phải làm sao',
  'làm thế nào',
  'khó khăn',
  'băn khoăn',
  'lo lắng',
  'tư vấn',
  'cho lời khuyên',
  'nên làm gì',
  'nếu như',
  'nhỡ may',
  'có nên',
  'hỏi ý kiến',
];

/**
 * Normalizes input text specifically for Local Brain Intent Matching.
 * Applies dialect/slang alias replacement while keeping request keywords intact.
 */
export function normalizeLocalBrainText(rawText: string): {
  normalized: string;
  unaccented: string;
  tokens: string[];
  rawNormalized: string;
  rawUnaccented: string;
} {
  if (!rawText) {
    return {
      normalized: '',
      unaccented: '',
      tokens: [],
      rawNormalized: '',
      rawUnaccented: '',
    };
  }

  // 1. Lowercase and clean punctuation
  let rawClean = rawText.toLowerCase().trim();
  rawClean = rawClean.replace(/[\.,!\?~"'`:;(){}\[\]\/\\]+/g, ' ');
  rawClean = rawClean.replace(/\s+/g, ' ').trim();
  const rawNormalized = rawClean;
  const rawUnaccented = stripVietnameseAccents(rawClean);

  // 2. Multi-word and single-word alias replacements from dataset
  let text = rawClean;
  const aliases = LOCAL_BRAIN_DATASET.aliases;
  for (const [alias, replacement] of Object.entries(aliases)) {
    if (!alias.trim()) continue;
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'gi');
    text = text.replace(regex, (match, p1, p2) => {
      const rep = replacement ? replacement : '';
      return `${p1}${rep}${p2}`.replace(/\s+/g, ' ');
    });
  }

  text = text.replace(/\s+/g, ' ').trim();
  const unaccented = stripVietnameseAccents(text);
  const tokens = text.split(' ').filter(Boolean);

  return { normalized: text, unaccented, tokens, rawNormalized, rawUnaccented };
}

/**
 * Check if the input text hits any negative example (false positive blocker)
 */
function matchesNegativeExample(
  normalized: string,
  unaccented: string,
  rawNormalized: string,
  rawUnaccented: string,
  negativeExamples?: string[]
): boolean {
  if (!negativeExamples || negativeExamples.length === 0) return false;

  for (const neg of negativeExamples) {
    const negNorm = neg.toLowerCase().trim();
    const negUnacc = stripVietnameseAccents(negNorm);

    // Exact match
    if (
      normalized === negNorm ||
      unaccented === negUnacc ||
      rawNormalized === negNorm ||
      rawUnaccented === negUnacc
    ) {
      return true;
    }

    // Subphrase containment (boundary-safe)
    if (
      ` ${normalized} `.includes(` ${negNorm} `) ||
      ` ${unaccented} `.includes(` ${negUnacc} `) ||
      ` ${rawNormalized} `.includes(` ${negNorm} `) ||
      ` ${rawUnaccented} `.includes(` ${negUnacc} `)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Extract slots from template examples like "mở phiên {sessionTitle}"
 */
function tryMatchSlotTemplate(
  normalized: string,
  template: string
): Record<string, string> | null {
  if (!template.includes('{') || !template.includes('}')) return null;

  const slotNames: string[] = [];
  const parts = template.split(/(\{.+?\})/g);
  let regexPattern = '^';
  for (const part of parts) {
    if (part.startsWith('{') && part.endsWith('}')) {
      const slotName = part.slice(1, -1).replace('?', '');
      slotNames.push(slotName);
      regexPattern += '(.+)';
    } else if (part.trim()) {
      const words = part.trim().split(/\s+/);
      const escapedWords = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const joined = escapedWords.join('(?:\\s+(?:giúp|giup|hộ|ho|giùm|gium|cho)?\\s*(?:chú|chu|bác|bac|tôi|toi|anh|chị|chi|em|ông|ong|bà|ba|con)?)*\\s+');
      regexPattern += joined;
    }
  }
  regexPattern += '$';

  try {
    const regex = new RegExp(regexPattern, 'i');
    const match = normalized.match(regex);
    if (match && match.length > 1) {
      const slots: Record<string, string> = {};
      for (let i = 0; i < slotNames.length; i++) {
        if (match[i + 1]) {
          slots[slotNames[i]] = match[i + 1].trim();
        }
      }
      return slots;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Token overlap calculation (Dice coefficient)
 */
function calculateTokenOverlap(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

/**
 * Classifies an incoming utterance against the 74 Local Brain intents.
 * Deterministic, instant, with negative blocker checks and priority resolution.
 */
export function classifyLocalBrain(
  rawText: string,
  options?: ClassifierOptions
): ClassificationMatch | null {
  if (!rawText || !rawText.trim()) return null;

  const { normalized, unaccented, tokens, rawNormalized, rawUnaccented } =
    normalizeLocalBrainText(rawText);
  if (!normalized && !rawNormalized) return null;

  // Check if utterance is a complex reasoning / consultation query
  const isComplexReasoning = COMPLEX_REASONING_MARKERS.some(
    (marker) =>
      ` ${rawNormalized} `.includes(` ${marker} `) ||
      ` ${normalized} `.includes(` ${marker} `)
  );

  const candidates: ClassificationMatch[] = [];

  for (const intent of LOCAL_BRAIN_DATASET.intents) {
    // 1. Session constraint check
    if (intent.requiresSession && !options?.hasActiveSession) {
      continue;
    }

    // 2. If this is a scenario creation intent, DO NOT hijack if query is complex reasoning or deletion/cancellation
    if (intent.id.startsWith('scenario.create.')) {
      if (isComplexReasoning) continue;
      if (
        /^(xóa|hủy|bỏ|tắt|đừng|không)/i.test(normalized) ||
        /^(xoa|huy|bo|tat|dung|khong)/i.test(unaccented) ||
        /^(xóa|hủy|bỏ|tắt|đừng|không)/i.test(rawNormalized) ||
        normalized.includes('nhắc nhở') ||
        unaccented.includes('nhac nho')
      ) {
        continue;
      }
    }

    // 3. Negative Examples Blocker Check (First-Class False-Positive Prevention)
    if (
      matchesNegativeExample(
        normalized,
        unaccented,
        rawNormalized,
        rawUnaccented,
        intent.negativeExamples
      )
    ) {
      continue;
    }

    let bestScore = 0;
    let matchType: 'exact' | 'slot' | 'substring' | 'token_overlap' = 'exact';
    let matchedExample = '';
    let extractedSlots: Record<string, string> | undefined;

    for (const example of intent.examples) {
      const exNormObj = normalizeLocalBrainText(example);
      const exNorm = exNormObj.normalized;
      const exUnacc = exNormObj.unaccented;
      const exRawNorm = exNormObj.rawNormalized;
      const exRawUnacc = exNormObj.rawUnaccented;

      // A. Slot template check
      if (example.includes('{')) {
        const slots =
          tryMatchSlotTemplate(normalized, example) ||
          tryMatchSlotTemplate(rawNormalized, example);
        if (slots) {
          bestScore = Math.max(bestScore, 0.98);
          matchType = 'slot';
          matchedExample = example;
          extractedSlots = slots;
          break;
        }
      }

      // B. Exact Match (checking both alias-normalized and raw-normalized)
      if (
        normalized === exNorm ||
        unaccented === exUnacc ||
        rawNormalized === exRawNorm ||
        rawUnaccented === exRawUnacc ||
        normalized === exRawNorm ||
        rawNormalized === exNorm
      ) {
        bestScore = 1.0;
        matchType = 'exact';
        matchedExample = example;
        break;
      }

      // C. Safe Phrase Containment (e.g. "lovira ơi mở camera giúp chú nhé" vs "mở camera")
      const exTokens = exNormObj.tokens;
      const isShortCoreCommand = exTokens.length >= 2;

      if (isShortCoreCommand) {
        const paddedNorm = ` ${normalized} `;
        const paddedExNorm = ` ${exNorm} `;
        const paddedUnacc = ` ${unaccented} `;
        const paddedExUnacc = ` ${exUnacc} `;

        const paddedRawNorm = ` ${rawNormalized} `;
        const paddedExRawNorm = ` ${exRawNorm} `;
        const paddedRawUnacc = ` ${rawUnaccented} `;
        const paddedExRawUnacc = ` ${exRawUnacc} `;

        const matchesContainment =
          paddedNorm.includes(paddedExNorm) ||
          paddedUnacc.includes(paddedExUnacc) ||
          paddedRawNorm.includes(paddedExRawNorm) ||
          paddedRawUnacc.includes(paddedExRawUnacc) ||
          paddedRawNorm.includes(paddedExNorm);

        if (matchesContainment) {
          const lenRatio = exNorm.length / Math.max(normalized.length, 1);
          const score = Math.min(1.0, 0.92 + lenRatio * 0.08);
          if (score > bestScore) {
            bestScore = score;
            matchType = 'substring';
            matchedExample = example;
          }
        }
      }

      // D. Token overlap fallback for longer queries
      if (tokens.length >= 3 && exTokens.length >= 3) {
        const overlap = calculateTokenOverlap(tokens, exTokens);
        if (overlap >= 0.85 && overlap > bestScore) {
          bestScore = overlap;
          matchType = 'token_overlap';
          matchedExample = example;
        }
      }
    }

    if (bestScore >= (intent.minConfidence || 0.9)) {
      candidates.push({
        intent,
        confidence: bestScore,
        extractedSlots,
        matchedExample,
        matchType,
      });
    }
  }

  if (candidates.length === 0) return null;

  // Rank by intent priority descending, then by confidence descending
  candidates.sort((a, b) => {
    if (b.intent.priority !== a.intent.priority) {
      return b.intent.priority - a.intent.priority;
    }
    return b.confidence - a.confidence;
  });

  const topMatch = candidates[0];

  // Ambiguity check: if top 2 candidates have identical priority and very close confidence, route to clarify
  if (
    candidates.length > 1 &&
    candidates[0].intent.category !== candidates[1].intent.category &&
    candidates[0].intent.priority === candidates[1].intent.priority &&
    Math.abs(candidates[0].confidence - candidates[1].confidence) < 0.02 &&
    candidates[0].confidence < 0.98
  ) {
    return null;
  }

  return topMatch;
}
