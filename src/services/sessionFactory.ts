import {
  LifeSession,
  GeneratedSessionPlan,
  ScenarioType,
  LifeTask,
  ImportantFact,
  AccessibilityContext,
} from '../types';
import { calculateNextRecommendedAction } from './actionEngine';
import { ScenarioRoutingResult } from './scenarioRouter';
import { normalizeGeneratedLifePlan } from './planValidator';

/**
 * Creates a complete, fully-hydrated LifeSession from a GeneratedSessionPlan
 * Preserves subtasks, scenarioFamily, subtype, modules, and calculates valid nextRecommendedAction.
 */
export function createLifeSessionFromPlan(
  rawPlan: GeneratedSessionPlan,
  originalUserRequest: string,
  routing?: ScenarioRoutingResult | ScenarioType,
  accessibilityContext?: AccessibilityContext
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

  const firstActionTitle =
    session.nextRecommendedAction?.title ||
    plan.firstRecommendedAction ||
    tasks[0]?.title ||
    'Bắt đầu bước đầu tiên';

  session.messages = [
    {
      id: `msg-${Date.now()}`,
      sender: 'lovira',
      text: `Chào bạn nha! Mình đã lập kế hoạch cho mục tiêu: "${session.goal}".\n\nBước đầu tiên tụi mình làm sẽ là: "${firstActionTitle}". Nếu bạn có thêm thông tin chi tiết về thời gian hoặc địa điểm, cứ nhắn cho mình bất cứ lúc nào nhé!`,
      timestamp: now,
    },
  ];

  return session;
}
