import datasetJson from '../data/behavior/behaviorDataset.json';

export interface BehaviorDatasetItem {
  id: string;
  category: string;
  userUtterance: string;
  previousContext: string;
  normalizedMeaning: string;
  intent: string;
  semanticTarget: string;
  stateImpact: {
    type: string;
    action?: string;
  };
  confidence: string;
  shouldMutateState: boolean;
  shouldCompleteSession: boolean;
  expectedReply: string;
  negativeRules?: string[];
  region?: string;
  inputMode?: string;
}

const dataset: BehaviorDatasetItem[] = datasetJson as unknown as BehaviorDatasetItem[];

/**
 * Service providing Semantic Behavior Dataset retrieval & Few-shot context generation.
 */
export class BehaviorService {
  /**
   * Search dataset for relevant examples matching current context or query.
   */
  static findRelevantExamples(query: string, limit = 3): BehaviorDatasetItem[] {
    if (!query) return dataset.slice(0, limit);
    const qLower = query.toLowerCase();
    const keywords = qLower.split(/\s+/).filter((w) => w.length > 2);

    const scored = dataset.map((item) => {
      let score = 0;
      const uttLower = (item.userUtterance || '').toLowerCase();
      const ctxLower = (item.previousContext || '').toLowerCase();

      if (uttLower.includes(qLower)) score += 10;
      if (ctxLower.includes(qLower)) score += 5;

      keywords.forEach((kw) => {
        if (uttLower.includes(kw)) score += 2;
        if (ctxLower.includes(kw)) score += 1;
      });

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.item);
  }

  /**
   * Generate Few-shot behavior contract text to inject into AI System Prompts.
   */
  static getFewShotPromptSnippet(userMessage: string): string {
    const examples = this.findRelevantExamples(userMessage, 3);
    if (examples.length === 0) return '';

    const lines = [
      '---',
      'MẪU HÀNH VI CHUẨN TỪ BEHAVIOR CONTRACT (FEW-SHOT EXAMPLES):'
    ];

    examples.forEach((ex, idx) => {
      lines.push(`Ví dụ ${idx + 1}:`);
      lines.push(`- Ngữ cảnh: ${ex.previousContext}`);
      lines.push(`- Người dùng nói: "${ex.userUtterance}"`);
      lines.push(`- Ý định: ${ex.intent} (${ex.category})`);
      lines.push(`- Phản hồi chuẩn: "${ex.expectedReply}"`);
    });

    lines.push('Hãy dựa theo phong cách phản hồi chuẩn trên để trả lời tự nhiên, ấm áp.');
    lines.push('---');

    return lines.join('\n');
  }
}
