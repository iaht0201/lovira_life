import {
  LifeSession,
  AgentAction,
  SessionActionLogEntry,
  LifeTask,
  ImportantFact,
  RecommendedAction,
} from '../types';

export function reconcileParentTaskStatus(task: LifeTask): LifeTask {
  if (!task.subtasks || task.subtasks.length === 0) return task;

  const allSubtasksDone = task.subtasks.every(
    (st) => st.status === 'completed' || st.status === 'skipped'
  );
  const anyInProgress = task.subtasks.some((st) => st.status !== 'pending');

  return {
    ...task,
    status: allSubtasksDone ? 'completed' : anyInProgress ? 'active' : 'pending',
  };
}

/**
 * Semantic matching helper to find task or subtask by ID, title, or semantic keyword
 */
export function findBestMatchingTask(
  session: LifeSession,
  query: string
): { task?: LifeTask; subtask?: LifeTask; parentTask?: LifeTask } {
  if (!query || !query.trim()) return {};
  const q = query.trim().toLowerCase();

  // 1. Direct ID match
  const taskById = session.tasks.find((t) => t.id === query);
  if (taskById) return { task: taskById };

  for (const t of session.tasks) {
    if (t.subtasks) {
      const sub = t.subtasks.find((st) => st.id === query);
      if (sub) return { subtask: sub, parentTask: t };
    }
  }

  // 2. Substring match in active/pending subtasks first
  for (const t of session.tasks) {
    if (t.status === 'completed') continue;
    if (t.subtasks) {
      const pendingSub = t.subtasks.find(
        (st) =>
          st.status !== 'completed' &&
          (st.title.toLowerCase().includes(q) || q.includes(st.title.toLowerCase()))
      );
      if (pendingSub) return { subtask: pendingSub, parentTask: t };
    }
  }

  // 3. Substring match in active/pending parent tasks
  const pendingParent = session.tasks.find(
    (t) =>
      t.status !== 'completed' &&
      (t.title.toLowerCase().includes(q) || q.includes(t.title.toLowerCase()))
  );
  if (pendingParent) return { task: pendingParent };

  // 4. Keyword token match for common actions (e.g., "máu" -> "Xét nghiệm máu")
  const words = q.split(/\s+/).filter((w) => w.length >= 3);
  if (words.length > 0) {
    for (const t of session.tasks) {
      if (t.status === 'completed') continue;
      const titleLower = t.title.toLowerCase();
      if (words.some((word) => titleLower.includes(word))) {
        return { task: t };
      }
      if (t.subtasks) {
        for (const st of t.subtasks) {
          if (st.status === 'completed') continue;
          if (words.some((word) => st.title.toLowerCase().includes(word))) {
            return { subtask: st, parentTask: t };
          }
        }
      }
    }
  }

  // 5. Fallback match anywhere
  for (const t of session.tasks) {
    if (t.subtasks) {
      const sub = t.subtasks.find(
        (st) =>
          st.title.toLowerCase().includes(q) || q.includes(st.title.toLowerCase())
      );
      if (sub) return { subtask: sub, parentTask: t };
    }
    if (t.title.toLowerCase().includes(q) || q.includes(t.title.toLowerCase())) {
      return { task: t };
    }
  }

  return {};
}

/**
 * Resolves current active step from session based on hierarchy priority:
 * 1. currentStepId (task or subtask)
 * 2. nextRecommendedAction.taskId
 * 3. single active task/subtask
 * 4. deterministic first pending task/subtask
 */
export function resolveCurrentStep(
  session: LifeSession
): { task?: LifeTask; subtask?: LifeTask; parentTask?: LifeTask } | null {
  if (!session || !session.tasks || session.tasks.length === 0) return null;

  // 1. Match currentStepId
  if (session.currentStepId) {
    const matched = findBestMatchingTask(session, session.currentStepId);
    if (matched.task || matched.subtask) return matched;
  }

  // 2. Match nextRecommendedAction.taskId
  if (session.nextRecommendedAction?.taskId) {
    const matched = findBestMatchingTask(session, session.nextRecommendedAction.taskId);
    if (matched.task || matched.subtask) return matched;
  }

  // 3. Find any active task/subtask
  for (const t of session.tasks) {
    if (t.subtasks) {
      const activeSub = t.subtasks.find((st) => st.status === 'active');
      if (activeSub) return { subtask: activeSub, parentTask: t };
    }
    if (t.status === 'active') return { task: t };
  }

  // 4. Fallback to first pending task or its first subtask
  const sortedPending = session.tasks
    .filter((t) => t.status !== 'completed' && t.status !== 'skipped')
    .sort((a, b) => a.order - b.order);

  const firstPending = sortedPending[0];
  if (firstPending) {
    if (firstPending.subtasks && firstPending.subtasks.length > 0) {
      const firstSub = firstPending.subtasks
        .filter((st) => st.status !== 'completed' && st.status !== 'skipped')
        .sort((a, b) => a.order - b.order)[0];
      if (firstSub) return { subtask: firstSub, parentTask: firstPending };
    }
    return { task: firstPending };
  }

  return null;
}

/**
 * Calculates next recommended action based on task status ordering and subtask hierarchy
 */
export function calculateNextRecommendedAction(session: LifeSession): RecommendedAction {
  const activeParent = session.tasks
    .filter((t) => t.status !== 'completed' && t.status !== 'skipped')
    .sort((a, b) => a.order - b.order)[0];

  if (!activeParent) {
    return {
      title: 'Hoàn thành tất cả công việc trong phiên! 🎉',
      description: 'Bạn đã thực hiện xong mọi công việc cần làm.',
    };
  }

  if (activeParent.subtasks && activeParent.subtasks.length > 0) {
    const nextSubtask = activeParent.subtasks
      .filter((st) => st.status !== 'completed' && st.status !== 'skipped')
      .sort((a, b) => a.order - b.order)[0];

    if (nextSubtask) {
      return {
        title: nextSubtask.title,
        description: nextSubtask.description || `Bước con thuộc công việc "${activeParent.title}"`,
        taskId: nextSubtask.id,
        parentContext: activeParent.title,
      };
    }
  }

  return {
    title: activeParent.title,
    description: activeParent.description || `Bước thứ ${activeParent.order} trong buổi hỗ trợ`,
    taskId: activeParent.id,
  };
}

/**
 * Reconciles all derived session states:
 * - Subtask statuses & parent status
 * - Calculates nextRecommendedAction
 * - Sets currentStepId to next recommended step
 */
export function reconcileSessionDerivedState(session: LifeSession): LifeSession {
  const reconciledTasks = session.tasks.map((t) => reconcileParentTaskStatus(t));
  const updated: LifeSession = {
    ...session,
    tasks: reconciledTasks,
  };

  const nextRec = calculateNextRecommendedAction(updated);
  updated.nextRecommendedAction = nextRec;

  if (nextRec.taskId) {
    updated.currentStepId = nextRec.taskId;
  } else {
    const pendingFirst = reconciledTasks.find((t) => t.status !== 'completed' && t.status !== 'skipped');
    updated.currentStepId = pendingFirst?.subtasks?.[0]?.id || pendingFirst?.id;
  }

  return updated;
}

export function validateAgentAction(
  state: LifeSession,
  action: AgentAction
): { valid: boolean; reason?: string } {
  if (!action || !action.type) {
    return { valid: false, reason: 'Lệnh không hợp lệ (thiếu loại lệnh)' };
  }

  const { type, payload } = action;

  switch (type) {
    case 'ADD_FACT':
      if (!payload.category || !payload.title || !payload.value) {
        return { valid: false, reason: 'Lệnh thêm thông tin thiếu danh mục, tiêu đề hoặc nội dung' };
      }
      return { valid: true };

    case 'UPDATE_FACT':
      if (!payload.factId && !payload.title) {
        return { valid: false, reason: 'Thiếu mã hoặc tiêu đề thông tin cần cập nhật' };
      }
      return { valid: true };

    case 'DELETE_FACT':
      if (!payload.factId) {
        return { valid: false, reason: 'Thiếu mã thông tin cần xoá' };
      }
      return { valid: true };

    case 'ADD_TASK':
      if (!payload.title || !payload.title.trim()) {
        return { valid: false, reason: 'Nhiệm vụ mới không được để trống tiêu đề' };
      }
      return { valid: true };

    case 'COMPLETE_TASK':
    case 'SKIP_TASK': {
      if (!payload.taskId) {
        return { valid: false, reason: 'Thiếu mã hoặc tên nhiệm vụ' };
      }
      const matched = findBestMatchingTask(state, payload.taskId);
      if (!matched.task && !matched.subtask) {
        return { valid: false, reason: `Không tìm thấy nhiệm vụ phù hợp với "${payload.taskId}"` };
      }
      return { valid: true };
    }

    case 'UPDATE_TASK':
    case 'DELETE_TASK': {
      if (!payload.taskId) {
        return { valid: false, reason: 'Thiếu mã nhiệm vụ' };
      }
      const matched = findBestMatchingTask(state, payload.taskId);
      if (!matched.task && !matched.subtask) {
        return { valid: false, reason: `Không tìm thấy nhiệm vụ phù hợp với "${payload.taskId}"` };
      }
      return { valid: true };
    }

    case 'REORDER_TASK': {
      if (!payload.taskId || typeof payload.order !== 'number') {
        return { valid: false, reason: 'Lệnh đổi thứ tự thiếu mã nhiệm vụ hoặc thứ tự mới' };
      }
      const matched = findBestMatchingTask(state, payload.taskId);
      if (!matched.task && !matched.subtask) {
        return { valid: false, reason: `Không tìm thấy nhiệm vụ phù hợp để đổi thứ tự: "${payload.taskId}"` };
      }
      return { valid: true };
    }

    case 'ADD_SUBTASK': {
      if (!payload.parentTaskId) {
        return { valid: false, reason: 'Thiếu mã việc cha (parentTaskId)' };
      }
      if (!payload.title || !payload.title.trim()) {
        return { valid: false, reason: 'Việc con không được để trống tiêu đề' };
      }
      const matched = findBestMatchingTask(state, payload.parentTaskId);
      if (!matched.task) {
        return { valid: false, reason: 'Không tìm thấy việc cha phù hợp' };
      }
      return { valid: true };
    }

    case 'COMPLETE_SUBTASK': {
      if (!payload.subtaskId) {
        return { valid: false, reason: 'Thiếu mã việc con (subtaskId)' };
      }
      const matched = findBestMatchingTask(state, payload.subtaskId);
      if (!matched.subtask) {
        return { valid: false, reason: 'Không tìm thấy việc con phù hợp' };
      }
      return { valid: true };
    }

    case 'UPDATE_NEXT_ACTION':
      if (!payload.title) {
        return { valid: false, reason: 'Bước tiếp theo không có nội dung' };
      }
      return { valid: true };

    case 'CHANGE_GOAL':
      if (!payload.goal) {
        return { valid: false, reason: 'Mục tiêu phiên không được để trống' };
      }
      return { valid: true };

    case 'ADD_RESOURCE':
    case 'UPDATE_SESSION':
    case 'PAUSE_SESSION':
    case 'RESUME_SESSION':
    case 'COMPLETE_SESSION':
    case 'SPEAK_TEXT':
    case 'STOP_SPEECH':
    case 'OPEN_CAMERA':
      return { valid: true };

    default:
      return { valid: false, reason: `Loại hành động không được hỗ trợ: ${type}` };
  }
}

/**
 * Executes a single action on state
 */
export function applySingleAgentAction(
  state: LifeSession,
  action: AgentAction,
  triggeredBy: SessionActionLogEntry['triggeredBy'] = 'chat'
): { newState: LifeSession; logSummary: string } {
  const now = new Date().toISOString();
  const { type, payload } = action;
  let logSummary = '';

  const newState: LifeSession = JSON.parse(JSON.stringify(state));

  switch (type) {
    case 'ADD_FACT': {
      const category = payload.category || 'instruction';
      const title = (payload.title || 'Thông tin mới').trim();
      const value = (payload.value || '').trim();

      // Fact Deduplication: distinguish between different distinct locations, but update identical titles
      let existingFact: ImportantFact | undefined;
      const titleLower = title.toLowerCase();

      if (titleLower) {
        existingFact = newState.importantFacts.find(
          (f) => f.title.toLowerCase().trim() === titleLower
        );
      }

      if (existingFact) {
        existingFact.value = value;
        existingFact.type = category;
        existingFact.updatedAt = now;
        logSummary = `Đã cập nhật ${existingFact.title}: "${value}"`;
      } else {
        const newFact: ImportantFact = {
          id: `fact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: category,
          title,
          value,
          createdAt: now,
          updatedAt: now,
        };
        newState.importantFacts.unshift(newFact);
        logSummary = `Đã thêm thông tin: "${title}: ${value}"`;
      }
      break;
    }

    case 'UPDATE_FACT': {
      let fact = newState.importantFacts.find((f) => f.id === payload.factId);
      if (!fact && payload.title) {
        fact = newState.importantFacts.find((f) => f.title.toLowerCase().includes(payload.title!.toLowerCase()));
      }
      if (fact) {
        if (payload.title) fact.title = payload.title;
        if (payload.value) fact.value = payload.value;
        if (payload.category) fact.type = payload.category;
        fact.updatedAt = now;
        logSummary = `Đã cập nhật thông tin: "${fact.title}: ${fact.value}"`;
      }
      break;
    }

    case 'DELETE_FACT': {
      const targetFact = newState.importantFacts.find((f) => f.id === payload.factId);
      newState.importantFacts = newState.importantFacts.filter((f) => f.id !== payload.factId);
      logSummary = `Đã xoá thông tin: "${targetFact?.title || payload.factId}"`;
      break;
    }

    case 'ADD_TASK': {
      const newOrder = newState.tasks.length > 0 ? Math.max(...newState.tasks.map((t) => t.order)) + 1 : 1;
      const newTask: LifeTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: (payload.title || 'Nhiệm vụ mới').trim(),
        description: payload.description?.trim(),
        order: payload.order || newOrder,
        status: 'pending',
        important: payload.important || false,
      };
      newState.tasks.push(newTask);
      logSummary = `Đã thêm nhiệm vụ: "${newTask.title}"`;
      break;
    }

    case 'COMPLETE_TASK': {
      const matched = findBestMatchingTask(newState, payload.taskId || '');
      if (matched.subtask && matched.parentTask) {
        matched.subtask.status = 'completed';
        const reconciled = reconcileParentTaskStatus(matched.parentTask);
        matched.parentTask.status = reconciled.status;
        logSummary = `Đã hoàn thành bước con: "${matched.subtask.title}"`;
      } else if (matched.task) {
        if (matched.task.subtasks && matched.task.subtasks.length > 0) {
          matched.task.subtasks.forEach((st) => { st.status = 'completed'; });
        }
        matched.task.status = 'completed';
        logSummary = `Đã đánh dấu hoàn thành: "${matched.task.title}"`;
      }
      break;
    }

    case 'SKIP_TASK': {
      const matched = findBestMatchingTask(newState, payload.taskId || '');
      if (matched.subtask && matched.parentTask) {
        matched.subtask.status = 'skipped';
        const reconciled = reconcileParentTaskStatus(matched.parentTask);
        matched.parentTask.status = reconciled.status;
        logSummary = `Đã bỏ qua bước con: "${matched.subtask.title}"`;
      } else if (matched.task) {
        matched.task.status = 'skipped';
        logSummary = `Đã bỏ qua nhiệm vụ: "${matched.task.title}"`;
      }
      break;
    }

    case 'UPDATE_TASK': {
      const matched = findBestMatchingTask(newState, payload.taskId || '');
      const task = matched.task || matched.subtask;
      if (task) {
        if (payload.title) task.title = payload.title.trim();
        if (payload.description) task.description = payload.description.trim();
        logSummary = `Đã cập nhật nhiệm vụ: "${task.title}"`;
      }
      break;
    }

    case 'DELETE_TASK': {
      const matched = findBestMatchingTask(newState, payload.taskId || '');
      if (matched.task) {
        newState.tasks = newState.tasks.filter((t) => t.id !== matched.task!.id);
        logSummary = `Đã xoá nhiệm vụ: "${matched.task.title}"`;
      } else if (matched.subtask && matched.parentTask && matched.parentTask.subtasks) {
        matched.parentTask.subtasks = matched.parentTask.subtasks.filter((st) => st.id !== matched.subtask!.id);
        const reconciled = reconcileParentTaskStatus(matched.parentTask);
        matched.parentTask.status = reconciled.status;
        logSummary = `Đã xoá việc con: "${matched.subtask.title}"`;
      }
      break;
    }

    case 'REORDER_TASK': {
      const matched = findBestMatchingTask(newState, payload.taskId || '');
      if (matched.task && typeof payload.order === 'number') {
        matched.task.order = payload.order;
        newState.tasks.sort((a, b) => a.order - b.order);
        logSummary = `Đã sắp xếp lại thứ tự công việc: "${matched.task.title}"`;
      }
      break;
    }

    case 'ADD_SUBTASK': {
      const matched = findBestMatchingTask(newState, payload.parentTaskId || '');
      const parent = matched.task || matched.parentTask;
      if (parent) {
        if (!parent.subtasks) parent.subtasks = [];
        const newSubOrder = parent.subtasks.length > 0 ? Math.max(...parent.subtasks.map((st) => st.order)) + 1 : 1;
        const newSubtask: LifeTask = {
          id: `subtask-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: (payload.title || 'Việc con mới').trim(),
          description: payload.description?.trim(),
          order: payload.order || newSubOrder,
          status: 'pending',
          parentTaskId: parent.id,
        };
        parent.subtasks.push(newSubtask);
        const reconciled = reconcileParentTaskStatus(parent);
        parent.status = reconciled.status;
        logSummary = `Đã thêm việc con: "${newSubtask.title}" (thuộc ${parent.title})`;
      }
      break;
    }

    case 'COMPLETE_SUBTASK': {
      const matched = findBestMatchingTask(newState, payload.subtaskId || '');
      if (matched.subtask && matched.parentTask) {
        matched.subtask.status = 'completed';
        const reconciled = reconcileParentTaskStatus(matched.parentTask);
        matched.parentTask.status = reconciled.status;
        logSummary = `Đã hoàn thành bước con: "${matched.subtask.title}" (thuộc ${matched.parentTask.title})`;
      }
      break;
    }

    case 'UPDATE_NEXT_ACTION': {
      newState.nextRecommendedAction = {
        title: (payload.title || '').trim(),
        description: payload.description?.trim() || 'Được cập nhật bởi Lovira',
      };
      logSummary = `Đã cập nhật bước tiếp theo: "${payload.title}"`;
      break;
    }

    case 'CHANGE_GOAL': {
      if (payload.goal) {
        newState.goal = payload.goal.trim();
        logSummary = `Đã cập nhật mục tiêu phiên: "${payload.goal}"`;
      }
      break;
    }

    case 'PAUSE_SESSION': {
      newState.status = 'paused';
      logSummary = 'Đã tạm dừng phiên';
      break;
    }

    case 'RESUME_SESSION': {
      newState.status = 'active';
      logSummary = 'Đã tiếp tục phiên';
      break;
    }

    case 'COMPLETE_SESSION': {
      newState.status = 'completed';
      logSummary = 'Đã hoàn thành phiên';
      break;
    }

    case 'ADD_RESOURCE': {
      const newRes = {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: payload.resourceType || 'note',
        title: (payload.title || 'Tài nguyên mới').trim(),
        data: payload.data,
        note: payload.note || payload.description,
        createdAt: now,
      };
      newState.resources.push(newRes);
      logSummary = `Đã thêm tài nguyên: "${newRes.title}"`;
      break;
    }

    case 'UPDATE_SESSION': {
      const p = payload as any;
      if (p.title) newState.title = p.title.trim();
      if (p.goal) newState.goal = p.goal.trim();
      if (p.scenarioFamily) newState.scenarioFamily = p.scenarioFamily;
      if (p.subtype) newState.subtype = p.subtype;
      if (Array.isArray(p.tags)) newState.tags = p.tags;
      if (Array.isArray(p.modules)) newState.modules = p.modules;
      logSummary = `Đã cập nhật thông tin phiên`;
      break;
    }

    default:
      logSummary = `Thực hiện thao tác ${type}`;
      break;
  }

  newState.updatedAt = now;

  if (logSummary) {
    newState.actionLog.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      actionType: type,
      summary: logSummary,
      triggeredBy,
    });
  }

  return { newState, logSummary };
}

/**
 * Executes an atomic batch of actions sequentially against evolving working state
 */
export function applyAgentActionBatch(
  state: LifeSession,
  actions: AgentAction[],
  triggeredBy: SessionActionLogEntry['triggeredBy'] = 'chat'
): {
  success: boolean;
  status: 'full' | 'partial' | 'failed';
  newState: LifeSession;
  appliedActions: AgentAction[];
  rejectedActions: { action: AgentAction; reason: string }[];
  rejectedReason?: string;
  logSummaries: string[];
} {
  if (!actions || actions.length === 0) {
    return {
      success: true,
      status: 'full',
      newState: state,
      appliedActions: [],
      rejectedActions: [],
      logSummaries: [],
    };
  }

  let currentState: LifeSession = JSON.parse(JSON.stringify(state));
  const appliedActions: AgentAction[] = [];
  const rejectedActions: { action: AgentAction; reason: string }[] = [];
  const logSummaries: string[] = [];

  for (const action of actions) {
    const val = validateAgentAction(currentState, action);
    if (!val.valid) {
      console.warn(`Action validation skipped: ${val.reason}`, action);
      rejectedActions.push({ action, reason: val.reason || 'Validation failed' });
      continue;
    }

    const { newState, logSummary } = applySingleAgentAction(currentState, action, triggeredBy);
    currentState = newState;
    appliedActions.push(action);
    if (logSummary) logSummaries.push(logSummary);
  }

  // Reconcile all derived state (parent task status, currentStepId, nextRecommendedAction)
  const finalState = reconcileSessionDerivedState(currentState);

  // If there was an explicit next action provided in the action batch, preserve and link taskId properly
  const explicitNext = appliedActions.find((a) => a.type === 'UPDATE_NEXT_ACTION');
  if (explicitNext && explicitNext.payload.title) {
    const matching = findBestMatchingTask(finalState, explicitNext.payload.taskId || explicitNext.payload.title);
    const targetTaskId = matching.subtask?.id || matching.task?.id || explicitNext.payload.taskId;
    finalState.nextRecommendedAction = {
      title: explicitNext.payload.title,
      description: explicitNext.payload.description || 'Được chỉ định trực tiếp bởi Lovira',
      taskId: targetTaskId,
      parentContext: matching.parentTask?.title,
    };
    if (targetTaskId) {
      finalState.currentStepId = targetTaskId;
    }
  }

  const isAllSuccess = rejectedActions.length === 0;
  const isAllFailed = appliedActions.length === 0 && actions.length > 0;

  return {
    success: isAllSuccess,
    status: isAllSuccess ? 'full' : isAllFailed ? 'failed' : 'partial',
    newState: finalState,
    appliedActions,
    rejectedActions,
    logSummaries,
  };
}
