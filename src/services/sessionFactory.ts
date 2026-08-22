import { LifeSession, GeneratedSessionPlan, ScenarioType, LifeTask, ImportantFact } from '../types';
import { calculateNextRecommendedAction } from './actionEngine';

/**
 * Creates a complete, fully-hydrated LifeSession from a GeneratedSessionPlan
 * Preserves subtasks, scenarioFamily, subtype, modules, and calculates valid nextRecommendedAction.
 */
export function createLifeSessionFromPlan(
  plan: GeneratedSessionPlan,
  customGoal: string,
  sessionType: ScenarioType = 'custom'
): LifeSession {
  const now = new Date().toISOString();
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

  const session: LifeSession = {
    id: newId,
    title: plan.title || `🌟 ${customGoal.slice(0, 25)}...`,
    scenarioType: sessionType,
    scenarioFamily: plan.scenarioFamily || 'work',
    subtype: plan.subtype,
    modules: plan.modules,
    status: 'active',
    goal: plan.goal || customGoal,
    createdAt: now,
    updatedAt: now,
    currentStepId: tasks[0]?.subtasks?.[0]?.id || tasks[0]?.id || 'task-1',
    importantFacts: facts,
    tasks: tasks,
    resources: [],
    messages: [],
    actionLog: [
      {
        id: `log-${Date.now()}`,
        timestamp: now,
        actionType: 'CREATE_SESSION_AI',
        summary: `Lovira AI khởi tạo phiên: ${plan.title || customGoal}`,
        triggeredBy: 'system',
      },
    ],
  };

  // Dynamically calculate recommended next action so it incorporates subtasks and tasks cleanly
  session.nextRecommendedAction = calculateNextRecommendedAction(session);

  const firstActionTitle =
    session.nextRecommendedAction?.title ||
    plan.firstRecommendedAction ||
    tasks[0]?.title ||
    'Chuẩn bị bước đầu tiên';

  session.messages = [
    {
      id: `msg-${Date.now()}`,
      sender: 'lovira',
      text: `Chào bạn nha! Mình đã lập xong kế hoạch cho mục tiêu: "${session.goal}" rồi nè.\n\nMình đã sắp xếp ${tasks.length} việc cần làm và các thông tin quan trọng. Bước đầu tiên tụi mình làm sẽ là: "${firstActionTitle}" nha!`,
      timestamp: now,
    },
  ];

  return session;
}
