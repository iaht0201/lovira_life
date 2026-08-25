import fs from 'fs';
import path from 'path';

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

const FALLBACK_DATASET: BehaviorDatasetItem[] = [
  {
    id: "lovira-00001",
    category: "implicit_completion",
    userUtterance: "Rồi nè con",
    previousContext: "Lovira vừa hỏi chú đã chuẩn bị tiền/ví chưa.",
    normalizedMeaning: "đã chuẩn bị tiền/ví",
    intent: "confirm_completion",
    semanticTarget: "prepare_payment",
    stateImpact: { type: "COMPLETE_MATCHING_TASK" },
    confidence: "high",
    shouldMutateState: true,
    shouldCompleteSession: false,
    expectedReply: "Dạ, con đã hiểu và sẽ cập nhật đúng phần liên quan theo ngữ cảnh, không ép chú theo thứ tự todo.",
    negativeRules: [
      "do_not_force_linear_todo_order",
      "do_not_complete_unrelated_current_task",
      "do_not_require_exact_task_id_from_user",
      "do_not_invent_missing_facts",
      "do_not_claim_unavailable_app_capabilities"
    ],
    region: "general",
    inputMode: "text"
  },
  {
    id: "lovira-00002",
    category: "implicit_completion",
    userUtterance: "bác xong rồi",
    previousContext: "Lovira vừa hỏi bác đã làm xong bước được nhắc tới chưa.",
    normalizedMeaning: "đã hoàn thành bước vừa được hỏi",
    intent: "confirm_completion",
    semanticTarget: "recent_context",
    stateImpact: { type: "COMPLETE_MATCHING_TASK" },
    confidence: "high",
    shouldMutateState: true,
    shouldCompleteSession: false,
    expectedReply: "Dạ, con đã hiểu và sẽ cập nhật đúng phần liên quan theo ngữ cảnh, không ép bác theo thứ tự todo.",
    negativeRules: [
      "do_not_force_linear_todo_order",
      "do_not_complete_unrelated_current_task",
      "do_not_require_exact_task_id_from_user",
      "do_not_invent_missing_facts",
      "do_not_claim_unavailable_app_capabilities"
    ],
    region: "north",
    inputMode: "voice"
  }
];

let datasetCache: BehaviorDatasetItem[] | null = null;

function getDataset(): BehaviorDatasetItem[] {
  if (datasetCache) return datasetCache;

  try {
    const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '.';
    const candidatePaths = [
      path.resolve(cwd, 'src/data/behavior/behaviorDataset.json'),
      path.resolve(cwd, 'dist/data/behavior/behaviorDataset.json'),
      path.resolve(cwd, 'data/behavior/behaviorDataset.json'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        datasetCache = JSON.parse(raw);
        return datasetCache!;
      }
    }
  } catch (err) {
    console.warn('[BehaviorService] Notice: Could not read behaviorDataset.json from disk, using fallback dataset:', err);
  }

  datasetCache = FALLBACK_DATASET;
  return datasetCache;
}

/**
 * Service providing Semantic Behavior Dataset retrieval & Few-shot context generation.
 */
export class BehaviorService {
  /**
   * Search dataset for relevant examples matching current context or query.
   */
  static findRelevantExamples(query: string, limit = 3): BehaviorDatasetItem[] {
    const dataset = getDataset();
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

