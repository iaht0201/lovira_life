import { GeneratedSessionPlan, GeneratedTask, ScenarioFamily, LifeModule, ImportantFactType } from '../types';
import { ScenarioRoutingResult } from './scenarioRouter';
import { SCENARIO_REGISTRY } from './scenarioRegistry';

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

  // Normalize Tasks
  let normalizedTasks: GeneratedTask[] = [];
  if (Array.isArray(rawPlan?.tasks) && rawPlan.tasks.length > 0) {
    normalizedTasks = rawPlan.tasks
      .filter((t: any) => t && typeof t.title === 'string' && t.title.trim())
      .map((t: any, idx: number) => {
        const taskTitle = t.title.trim();
        const subtasks = Array.isArray(t.subtasks)
          ? t.subtasks
              .filter((st: any) => st && typeof st.title === 'string' && st.title.trim())
              .map((st: any, sIdx: number) => ({
                title: st.title.trim(),
                description: typeof st.description === 'string' ? st.description.trim() : undefined,
                order: typeof st.order === 'number' ? st.order : sIdx + 1,
              }))
          : undefined;

        return {
          title: taskTitle,
          description: typeof t.description === 'string' ? t.description.trim() : undefined,
          order: typeof t.order === 'number' ? t.order : idx + 1,
          important: typeof t.important === 'boolean' ? t.important : idx === 0,
          subtasks: subtasks && subtasks.length > 0 ? subtasks : undefined,
        };
      });
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

  // Normalize Important Facts - only keep valid, non-empty, grounded facts
  let normalizedFacts: { type: ImportantFactType; title: string; value: string }[] = [];
  if (Array.isArray(rawPlan?.importantFacts)) {
    const seen = new Set<string>();
    normalizedFacts = rawPlan.importantFacts
      .filter((f: any) => f && f.title && f.value && typeof f.value === 'string' && f.value.trim())
      .map((f: any) => ({
        type: (['date', 'time', 'location', 'person', 'requirement', 'instruction', 'warning', 'reference', 'contact', 'cost', 'identifier', 'note'].includes(f.type)
          ? f.type
          : 'requirement') as ImportantFactType,
        title: String(f.title).trim(),
        value: String(f.value).trim(),
      }))
      .filter((f: { type: ImportantFactType; title: string; value: string }) => {
        const key = `${f.type}:${f.title.toLowerCase()}:${f.value.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  // Calculate firstRecommendedAction
  const firstAction =
    normalizedTasks[0]?.subtasks?.[0]?.title ||
    normalizedTasks[0]?.title ||
    (typeof rawPlan?.firstRecommendedAction === 'string' && rawPlan.firstRecommendedAction.trim()) ||
    'Bắt đầu bước đầu tiên';

  return {
    title,
    goal,
    scenarioType,
    scenarioFamily: family,
    subtype,
    modules,
    tasks: normalizedTasks,
    importantFacts: normalizedFacts,
    firstRecommendedAction: firstAction,
  };
}
