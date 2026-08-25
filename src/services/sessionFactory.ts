import {
  LifeSession,
  GeneratedSessionPlan,
  ScenarioType,
  ScenarioFamily,
  LifeTask,
  ImportantFact,
  AccessibilityContext,
  UserProfile,
} from '../types.js';
import { calculateNextRecommendedAction } from './actionEngine.js';
import { ScenarioRoutingResult } from './scenarioRouter.js';
import { normalizeGeneratedLifePlan } from './planValidator.js';
import { deduceHonorifics, formatInitialSessionGreeting } from './conversationStyle.js';
import { SCENARIO_REGISTRY } from './scenarioRegistry.js';

/**
 * Creates a complete, fully-hydrated LifeSession from a GeneratedSessionPlan
 * Preserves subtasks, scenarioFamily, subtype, modules, and calculates valid nextRecommendedAction.
 */
export function createLifeSessionFromPlan(
  rawPlan: GeneratedSessionPlan,
  originalUserRequest: string,
  routing?: ScenarioRoutingResult | ScenarioType,
  accessibilityContext?: AccessibilityContext,
  userProfile?: UserProfile | null
): LifeSession {
  const now = new Date().toISOString();
  const routingObj: ScenarioRoutingResult | undefined =
    typeof routing === 'object' && routing !== null ? routing : undefined;
  const sessionType: ScenarioType =
    typeof routing === 'string' ? routing : (rawPlan.scenarioType || 'custom');

  const plan = normalizeGeneratedLifePlan(rawPlan, originalUserRequest, routingObj);
  const newId = `session-${sessionType}-${Date.now()}`;

  const tasks: LifeTask[] = (plan.tasks || []).map((t, i) => {
    const taskId = `task-${i + 1}`;
    const subtasks: LifeTask[] | undefined =
      t.subtasks && t.subtasks.length > 0
        ? t.subtasks.map((st, j) => ({
            id: `${taskId}-sub-${j + 1}`,
            parentTaskId: taskId,
            title: st.title,
            description: (st as { description?: string }).description,
            order: st.order || j + 1,
            status: 'pending' as const,
            source: 'ai' as const,
          }))
        : undefined;

    return {
      id: taskId,
      title: t.title,
      description: t.description,
      order: t.order || i + 1,
      status: 'pending' as const,
      important: t.important || false,
      subtasks,
    };
  });

  const facts: ImportantFact[] = (plan.importantFacts || []).map((f, i) => ({
    id: `fact-${i + 1}`,
    type: f.type,
    title: f.title,
    value: f.value,
    createdAt: now,
    updatedAt: now,
  }));

  const firstStepId = tasks[0]?.subtasks?.[0]?.id || tasks[0]?.id || 'task-1';

  const session: LifeSession = {
    id: newId,
    title: plan.title,
    scenarioType: sessionType,
    scenarioFamily: plan.scenarioFamily || routingObj?.family || 'custom',
    subtype: plan.subtype || routingObj?.subtype,
    modules: plan.modules || routingObj?.modules,
    tags: plan.tags || (plan.secondaryFamilies ? [...plan.secondaryFamilies] : (routingObj?.secondaryFamilies ? [...routingObj.secondaryFamilies] : undefined)),
    status: 'active',
    goal: plan.goal || originalUserRequest,
    createdAt: now,
    updatedAt: now,
    currentStepId: firstStepId,
    importantFacts: facts,
    tasks,
    resources: [],
    messages: [],
    actionLog: [
      {
        id: `log-${Date.now()}`,
        timestamp: now,
        actionType: 'CREATE_SESSION_AI',
        summary: `Lovira AI khởi tạo phiên: ${plan.title}`,
        triggeredBy: 'system',
      },
    ],
    accessibilityContext,
  };

  // Dynamically calculate recommended next action so it incorporates subtasks and tasks cleanly
  session.nextRecommendedAction = calculateNextRecommendedAction(session);

  const honorifics = deduceHonorifics(userProfile || null, originalUserRequest);
  const initialGreeting = formatInitialSessionGreeting(
    session.title,
    tasks,
    honorifics,
    session.goal
  );

  session.messages = [
    {
      id: `msg-${Date.now()}`,
      sender: 'lovira',
      text: initialGreeting,
      timestamp: now,
    },
  ];

  return session;
}

function familyToLegacyType(family: ScenarioFamily): ScenarioType {
  switch (family) {
    case 'healthcare':
      return 'medical';
    case 'administrative':
      return 'administrative';
    case 'shopping':
      return 'shopping';
    case 'documents':
      return 'document';
    default:
      return 'custom';
  }
}

/**
 * Creates an instant, local LifeSession directly from a SCENARIO_REGISTRY template without calling AI.
 */
export function createLifeSessionFromScenario(
  scenarioKey: ScenarioFamily,
  originalUserRequest: string,
  accessibilityContext?: AccessibilityContext,
  userProfile?: UserProfile | null
): LifeSession {
  const entry = SCENARIO_REGISTRY[scenarioKey] || SCENARIO_REGISTRY.custom || Object.values(SCENARIO_REGISTRY)[0];
  const now = new Date().toISOString();
  const newId = `session-${scenarioKey}-${Date.now()}`;

  const tasks: LifeTask[] = (entry.suggestedTasks || []).map((t, i) => {
    const taskId = `task-${i + 1}`;
    const subtasks: LifeTask[] | undefined =
      t.subtasks && t.subtasks.length > 0
        ? t.subtasks.map((st, j) => ({
            id: `${taskId}-sub-${j + 1}`,
            parentTaskId: taskId,
            title: st.title,
            order: st.order || j + 1,
            status: 'pending' as const,
            source: 'template' as const,
          }))
        : undefined;

    return {
      id: taskId,
      title: t.title,
      description: t.description,
      order: t.order || i + 1,
      status: 'pending' as const,
      important: t.important || false,
      subtasks,
    };
  });

  const cleanLabel = entry.label.replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '');

  const session: LifeSession = {
    id: newId,
    title: cleanLabel,
    scenarioType: familyToLegacyType(scenarioKey),
    scenarioFamily: scenarioKey,
    modules: entry.defaultModules,
    status: 'active',
    goal: originalUserRequest || entry.description,
    createdAt: now,
    updatedAt: now,
    currentStepId: tasks[0]?.id || 'task-1',
    importantFacts: [],
    tasks,
    resources: [],
    messages: [],
    actionLog: [
      {
        id: `log-${Date.now()}`,
        timestamp: now,
        actionType: 'CREATE_SESSION_TEMPLATE',
        summary: `Lovira khởi tạo nhanh phiên mẫu: ${cleanLabel}`,
        triggeredBy: 'system',
      },
    ],
    accessibilityContext,
  };

  session.nextRecommendedAction = calculateNextRecommendedAction(session);

  const honorifics = deduceHonorifics(userProfile || null, originalUserRequest);
  const initialGreeting = formatInitialSessionGreeting(
    session.title,
    tasks,
    honorifics,
    session.goal
  );

  session.messages = [
    {
      id: `msg-${Date.now()}`,
      sender: 'lovira',
      text: initialGreeting,
      timestamp: now,
    },
  ];

  return session;
}

