import { GeneratedSessionPlan } from '../types';
import { SCENARIO_REGISTRY } from './scenarioRegistry';
import { routeScenario, extractKnownFacts } from './scenarioRouter';
import { normalizeGeneratedLifePlan } from './planValidator';

/**
 * Universal generic fallback plan generator for offline mode or demo fallback.
 * Derives tasks and metadata from ScenarioRegistry and extracts only genuine facts from prompt.
 * Eliminates rigid hardcoded if-else trees.
 */
export function generateFallbackCustomSessionPlan(prompt: string): GeneratedSessionPlan {
  const routing = routeScenario(prompt);
  const knownFacts = extractKnownFacts(prompt);
  const registry = SCENARIO_REGISTRY[routing.family] || SCENARIO_REGISTRY.custom;

  // Build clean title with icon
  const promptClean = prompt.trim();
  const titleDisplay = promptClean.length > 40 ? promptClean.slice(0, 37) + '...' : promptClean;
  const planTitle = `${registry.label.split(' ')[0]} ${titleDisplay}`;

  // Map suggested tasks from registry
  const tasks = registry.suggestedTasks.map((t, idx) => ({
    title: t.title,
    description: t.description,
    order: idx + 1,
    important: t.important ?? idx === 0,
    subtasks: t.subtasks?.map((st, sIdx) => ({
      title: st.title,
      order: sIdx + 1,
    })),
  }));

  // Only include genuine facts extracted directly from prompt, zero assumptions
  const planFacts = knownFacts.map((f) => ({
    type: f.type,
    title: f.title,
    value: f.value,
  }));

  // First recommended action
  const firstAction = tasks[0]?.subtasks?.[0]?.title || tasks[0]?.title || 'Bắt đầu chuẩn bị';

  const plan: GeneratedSessionPlan = {
    title: planTitle,
    goal: promptClean,
    scenarioType: 'custom',
    scenarioFamily: routing.family,
    secondaryFamilies: routing.secondaryFamilies,
    subtype: routing.subtype,
    tags: [],
    modules: registry.defaultModules,
    tasks,
    importantFacts: planFacts,
    firstRecommendedAction: firstAction,
  };

  return normalizeGeneratedLifePlan(plan, promptClean, routing);
}
