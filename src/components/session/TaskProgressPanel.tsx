import React, { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2, AlertCircle, ChevronDown, ChevronRight, CornerDownRight } from 'lucide-react';
import { LifeTask } from '../../types';

interface TaskProgressPanelProps {
  tasks: LifeTask[];
  onToggleTask: (taskId: string) => void;
  onToggleSubtask?: (parentTaskId: string, subtaskId: string) => void;
  onAddTask: (title: string, description?: string) => void;
  onAddSubtask?: (parentTaskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskProgressPanel: React.FC<TaskProgressPanelProps> = ({
  tasks,
  onToggleTask,
  onToggleSubtask,
  onAddTask,
  onAddSubtask,
  onDeleteTask,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Expand/collapse state for tasks with subtasks
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    tasks.forEach((t) => {
      if (t.subtasks && t.subtasks.length > 0) {
        // Expand by default if active (in progress) or has unfinished subtasks
        initial[t.id] = t.status === 'active';
      }
    });
    return initial;
  });

  // Track inline subtask addition per task
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Calculate overall progress including subtasks
  let totalUnits = 0;
  let completedUnits = 0;

  tasks.forEach((t) => {
    if (t.subtasks && t.subtasks.length > 0) {
      t.subtasks.forEach((st) => {
        totalUnits += 1;
        if (st.status === 'completed' || st.status === 'skipped') completedUnits += 1;
      });
    } else {
      totalUnits += 1;
      if (t.status === 'completed' || t.status === 'skipped') completedUnits += 1;
    }
  });

  const progressPercent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle.trim());
    setNewTaskTitle('');
    setShowAdd(false);
  };

  const handleAddSubtaskSubmit = (e: React.FormEvent, parentTaskId: string) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    if (onAddSubtask) {
      onAddSubtask(parentTaskId, newSubtaskTitle.trim());
    }
    setNewSubtaskTitle('');
    setAddingSubtaskFor(null);
  };

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  return (
    <section className="p-5 rounded-2xl bg-surface border border-default shadow-xs space-y-4">
      {/* Header & Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              Việc cần làm & Giấy tờ
            </h3>
            <p className="text-xs text-text-secondary">
              Đã hoàn thành {completedUnits} / {totalUnits} bước
            </p>
          </div>

          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 min-h-[44px] px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold text-xs transition-all"
            aria-label="Thêm việc cần làm"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Thêm việc</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-surface-raised h-2.5 rounded-full overflow-hidden border border-default">
          <div
            className="bg-primary h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Inline Add Task Form */}
      {showAdd && (
        <form onSubmit={handleAddSubmit} className="flex gap-2 animate-fade-in">
          <input
            type="text"
            placeholder="Nhập tên công việc mới..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 p-2.5 rounded-xl border border-default bg-surface text-text-primary text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="px-4 py-2.5 bg-primary text-white font-bold text-xs rounded-xl disabled:opacity-50"
          >
            Lưu
          </button>
        </form>
      )}

      {/* Task List */}
      <div className="space-y-2.5">
        {tasks
          .sort((a, b) => a.order - b.order)
          .map((task) => {
            const isCompleted = task.status === 'completed';
            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
            const subtasksList = task.subtasks || [];
            const doneSubtasksCount = subtasksList.filter((st) => st.status === 'completed' || st.status === 'skipped').length;
            const isExpanded = expandedTasks[task.id] ?? (task.status === 'active');

            return (
              <div
                key={task.id}
                className={`rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-surface-raised/50 border-default/60 opacity-75'
                    : task.status === 'active'
                    ? 'bg-surface-raised border-primary/40 shadow-2xs'
                    : 'bg-surface-raised border-default hover:border-primary/60 shadow-2xs'
                }`}
              >
                {/* Parent Task Header */}
                <div
                  onClick={() => onToggleTask(task.id)}
                  className="p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none"
                  role="checkbox"
                  aria-checked={isCompleted}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onToggleTask(task.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Expand Chevron if subtasks exist */}
                    {hasSubtasks ? (
                      <button
                        onClick={(e) => toggleExpand(task.id, e)}
                        className="p-1 -ml-1 text-text-secondary hover:text-primary rounded-md hover:bg-surface transition-colors shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title={isExpanded ? 'Thu gọn' : 'Mở rộng bước con'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    ) : null}

                    {/* Checkbox */}
                    <div className="pt-0.5 shrink-0 text-primary">
                      {isCompleted ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Square className="w-5 h-5 text-text-secondary" aria-hidden="true" />
                      )}
                    </div>

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-bold leading-tight ${
                            isCompleted ? 'line-through text-text-secondary' : 'text-text-primary'
                          }`}
                        >
                          {task.order}. {task.title}
                        </span>

                        {/* Subtasks Progress Badge */}
                        {hasSubtasks && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {doneSubtasksCount}/{subtasksList.length} bước con
                          </span>
                        )}

                        {task.important && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold">
                            <AlertCircle className="w-3 h-3" aria-hidden="true" />
                            Ưu tiên
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-text-secondary leading-snug">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(task.id);
                      }}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center text-text-secondary hover:text-danger rounded-lg hover:bg-surface transition-colors"
                      aria-label={`Xoá nhiệm vụ ${task.title}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Subtasks Container */}
                {hasSubtasks && isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-default/50 space-y-1.5 bg-surface/40 rounded-b-xl">
                    {subtasksList
                      .sort((a, b) => a.order - b.order)
                      .map((subtask) => {
                        const isSubDone = subtask.status === 'completed' || subtask.status === 'skipped';
                        return (
                          <div
                            key={subtask.id}
                            onClick={() => onToggleSubtask && onToggleSubtask(task.id, subtask.id)}
                            className={`p-2.5 rounded-lg border flex items-center gap-2.5 cursor-pointer transition-all pl-4 ${
                              isSubDone
                                ? 'bg-surface-raised/40 border-transparent text-text-secondary'
                                : 'bg-surface border-default/70 hover:border-primary/50 text-text-primary'
                            }`}
                          >
                            <CornerDownRight className="w-3.5 h-3.5 text-text-secondary shrink-0 opacity-60" aria-hidden="true" />
                            <div className="shrink-0 text-primary">
                              {isSubDone ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                              ) : (
                                <Square className="w-4 h-4 text-text-secondary" aria-hidden="true" />
                              )}
                            </div>
                            <span className={`text-xs font-semibold flex-1 ${isSubDone ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                              {subtask.title}
                            </span>
                          </div>
                        );
                      })}

                    {/* Add Subtask Button */}
                    {addingSubtaskFor === task.id ? (
                      <form
                        onSubmit={(e) => handleAddSubtaskSubmit(e, task.id)}
                        className="flex gap-2 pt-1 pl-4"
                      >
                        <input
                          type="text"
                          placeholder="Nhập tên bước con..."
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          className="flex-1 p-2 rounded-lg border border-default bg-surface text-text-primary text-xs focus:ring-2 focus:ring-primary"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!newSubtaskTitle.trim()}
                          className="px-3 py-1.5 bg-primary text-white font-bold text-xs rounded-lg disabled:opacity-50 min-h-[36px]"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingSubtaskFor(null)}
                          className="px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface rounded-lg min-h-[36px]"
                        >
                          Hủy
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setAddingSubtaskFor(task.id)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline pt-1 pl-4 min-h-[36px]"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Thêm bước con</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </section>
  );
};
