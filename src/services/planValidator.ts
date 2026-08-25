import { GeneratedSessionPlan, GeneratedTask, ScenarioFamily, LifeModule, ImportantFactType } from '../types.js';
import { ScenarioRoutingResult, extractKnownFacts } from './scenarioRouter.js';
import { SCENARIO_REGISTRY } from './scenarioRegistry.js';

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateGeneratedLifePlan(plan: any): PlanValidationResult {
  const errors: string[] = [];

  if (!plan || typeof plan !== 'object') {
    return { valid: false, errors: ['Kế hoạch không hợp lệ (không phải đối tượng)'] };
  }

  if (!plan.title || typeof plan.title !== 'string' || !plan.title.trim()) {
    errors.push('Thiếu tiêu đề phiên');
  }

  if (!plan.goal || typeof plan.goal !== 'string' || !plan.goal.trim()) {
    errors.push('Thiếu mục tiêu phiên');
  }

  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) {
    errors.push('Danh sách công việc (tasks) không được để trống');
  } else {
    plan.tasks.forEach((t: any, idx: number) => {
      if (!t || typeof t !== 'object' || !t.title || typeof t.title !== 'string') {
        errors.push(`Công việc thứ ${idx + 1} thiếu tiêu đề`);
      }
      if (t.subtasks && !Array.isArray(t.subtasks)) {
        errors.push(`Công việc "${t.title || idx + 1}" có trường subtasks không phải mảng`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function normalizeGeneratedLifePlan(
  rawPlan: any,
  originalPrompt: string,
  routing?: ScenarioRoutingResult
): GeneratedSessionPlan {
  const family: ScenarioFamily = rawPlan?.scenarioFamily || routing?.family || 'custom';
  const registryEntry = SCENARIO_REGISTRY[family] || SCENARIO_REGISTRY.custom;

  const title =
    (typeof rawPlan?.title === 'string' && rawPlan.title.trim()) ||
    (originalPrompt.length > 30 ? `Phiên: ${originalPrompt.slice(0, 30)}...` : `Phiên: ${originalPrompt}`);

  const goal =
    (typeof rawPlan?.goal === 'string' && rawPlan.goal.trim()) ||
    `Hoàn thành mục tiêu: "${originalPrompt}"`;

  const scenarioType = rawPlan?.scenarioType || 'custom';
  const subtype = rawPlan?.subtype || routing?.subtype;
  const modules: LifeModule[] = Array.isArray(rawPlan?.modules) && rawPlan.modules.length > 0
    ? rawPlan.modules
    : routing?.modules || registryEntry.defaultModules;

  // Normalize Tasks with deduplication & max limit of 10 tasks
  let normalizedTasks: GeneratedTask[] = [];
  const seenTaskTitles = new Set<string>();

  if (Array.isArray(rawPlan?.tasks) && rawPlan.tasks.length > 0) {
    for (const t of rawPlan.tasks) {
      if (!t || typeof t.title !== 'string' || !t.title.trim()) continue;
      const cleanTitle = t.title.trim();
      const lowerKey = cleanTitle.toLowerCase();
      if (seenTaskTitles.has(lowerKey)) continue;
      seenTaskTitles.add(lowerKey);

      // Subtasks deduplication
      const seenSubtitles = new Set<string>();
      let subtasks: { title: string; description?: string; order: number }[] | undefined;

      if (Array.isArray(t.subtasks)) {
        const cleanSubs = [];
        let sIdx = 1;
        for (const st of t.subtasks) {
          if (!st || typeof st.title !== 'string' || !st.title.trim()) continue;
          const subTitle = st.title.trim();
          const subKey = subTitle.toLowerCase();
          if (seenSubtitles.has(subKey) || subKey === lowerKey) continue;
          seenSubtitles.add(subKey);

          cleanSubs.push({
            title: subTitle,
            description: typeof st.description === 'string' ? st.description.trim() : undefined,
            order: typeof st.order === 'number' ? st.order : sIdx++,
          });
        }
        if (cleanSubs.length > 0) subtasks = cleanSubs;
      }

      normalizedTasks.push({
        title: cleanTitle,
        description: typeof t.description === 'string' ? t.description.trim() : undefined,
        order: normalizedTasks.length + 1,
        important: typeof t.important === 'boolean' ? t.important : normalizedTasks.length === 0,
        subtasks,
      });

      if (normalizedTasks.length >= 10) break;
    }
  }

  // Fallback to registry tasks if tasks array is empty
  if (normalizedTasks.length === 0) {
    normalizedTasks = registryEntry.suggestedTasks.map((t, idx) => ({
      title: t.title,
      description: t.description,
      order: t.order || idx + 1,
      important: t.important || idx === 0,
      subtasks: t.subtasks,
    }));
  }

  // Normalize Important Facts - Merge extracted deterministic facts with generated facts
  const deterministicFacts = extractKnownFacts(originalPrompt);
  const seenFacts = new Set<string>();
  const normalizedFacts: { type: ImportantFactType; title: string; value: string }[] = [];

  // Add deterministic facts first
  for (const df of deterministicFacts) {
    const key = `${df.type}:${df.title.toLowerCase()}:${df.value.toLowerCase()}`;
    if (!seenFacts.has(key)) {
      seenFacts.add(key);
      normalizedFacts.push({
        type: df.type,
        title: df.title,
        value: df.value,
      });
    }
  }

  // Add generated facts if valid and not conflicting
  if (Array.isArray(rawPlan?.importantFacts)) {
    for (const f of rawPlan.importantFacts) {
      if (!f || !f.title || !f.value || typeof f.value !== 'string' || !f.value.trim()) continue;
      const factType = (['date', 'time', 'location', 'person', 'requirement', 'instruction', 'warning', 'reference', 'contact', 'cost', 'identifier', 'note'].includes(f.type)
        ? f.type
        : 'requirement') as ImportantFactType;
      const titleStr = String(f.title).trim();
      const valStr = String(f.value).trim();
      const key = `${factType}:${titleStr.toLowerCase()}:${valStr.toLowerCase()}`;

      if (!seenFacts.has(key)) {
        seenFacts.add(key);
        normalizedFacts.push({
          type: factType,
          title: titleStr,
          value: valStr,
        });
      }
    }
  }

  // Calculate firstRecommendedAction
  const firstAction =
    normalizedTasks[0]?.subtasks?.[0]?.title ||
    normalizedTasks[0]?.title ||
    (typeof rawPlan?.firstRecommendedAction === 'string' && rawPlan.firstRecommendedAction.trim()) ||
    'Bắt đầu bước đầu tiên';

  const secondaryFamilies: ScenarioFamily[] | undefined =
    Array.isArray(rawPlan?.secondaryFamilies) && rawPlan.secondaryFamilies.length > 0
      ? rawPlan.secondaryFamilies
      : routing?.secondaryFamilies && routing.secondaryFamilies.length > 0
      ? routing.secondaryFamilies
      : undefined;

  // Build tags combining explicit tags and secondary families
  const tagsSet = new Set<string>();
  if (Array.isArray(rawPlan?.tags)) {
    rawPlan.tags.forEach((tg: any) => {
      if (typeof tg === 'string' && tg.trim()) tagsSet.add(tg.trim().toLowerCase());
    });
  }
  if (secondaryFamilies) {
    secondaryFamilies.forEach((sf) => tagsSet.add(sf));
  }
  const tags = tagsSet.size > 0 ? Array.from(tagsSet) : undefined;

  return {
    title,
    goal,
    scenarioType,
    scenarioFamily: family,
    secondaryFamilies,
    subtype,
    tags,
    modules,
    tasks: normalizedTasks,
    importantFacts: normalizedFacts,
    firstRecommendedAction: firstAction,
  };
}
