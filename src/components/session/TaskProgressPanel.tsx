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
    <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#182424] border border-[#EAEFEF] dark:border-[#202E2E] shadow-2xs space-y-4">
      {/* Header & Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#11181C] dark:text-[#F2F7F7]">
              Việc cần làm & Giấy tờ
            </h3>
            <p className="text-xs text-[#586268] dark:text-[#8E9E9E]">
              Đã hoàn thành {completedUnits} / {totalUnits} bước
            </p>
          </div>

          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-[#E4F0EF] dark:bg-[#1B2D2C] text-[#287C78] dark:text-[#42A39E] hover:bg-[#287C78] hover:text-white font-bold text-xs transition-all cursor-pointer"
            aria-label="Thêm việc cần làm"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Thêm việc</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#E5EBEA] dark:bg-[#202E2E] h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-[#287C78] dark:bg-[#42A39E] h-full transition-all duration-300 rounded-full"
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
            className="flex-1 p-2.5 rounded-xl border border-[#D5ECE8] dark:border-[#202E2E] bg-[#F4F7F6] dark:bg-[#1E2B2A] text-[#11181C] dark:text-[#F2F7F7] text-xs focus:outline-hidden focus:border-[#287C78]"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="px-4 py-2.5 bg-[#287C78] hover:bg-[#1F625F] text-white font-bold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
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
                    ? 'bg-[#F8FAFA] dark:bg-[#1A2626]/60 border-[#EAEFEF] dark:border-[#202E2E]/60 opacity-80'
                    : task.status === 'active'
                    ? 'bg-[#F4F8F7] dark:bg-[#1E2B2A] border-[#287C78]/50 dark:border-[#42A39E]/50 shadow-2xs'
                    : 'bg-[#F8FAFA] dark:bg-[#1C2828] border-[#EAEFEF] dark:border-[#253737] hover:border-[#287C78]/40 shadow-2xs'
                }`}
              >
                {/* Parent Task Header */}
                <div
                  onClick={() => onToggleTask(task.id)}
                  className="p-3 sm:p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none"
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
                        className="p-1 -ml-1 text-[#586268] hover:text-[#287C78] dark:text-[#8E9E9E] dark:hover:text-[#42A39E] rounded-md hover:bg-white dark:hover:bg-[#152222] transition-colors shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
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
                    <div className="pt-0.5 shrink-0">
                      {isCompleted ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Square className="w-5 h-5 text-[#7A848B] dark:text-[#8E9E9E]" aria-hidden="true" />
                      )}
                    </div>

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs sm:text-sm font-bold leading-tight ${
                            isCompleted ? 'line-through text-[#7A848B] dark:text-[#7A8A8A]' : 'text-[#11181C] dark:text-[#F2F7F7]'
                          }`}
                        >
                          {task.order}. {task.title}
                        </span>

                        {/* Subtasks Progress Badge */}
                        {hasSubtasks && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E4F0EF] dark:bg-[#1B2D2C] text-[#287C78] dark:text-[#42A39E]">
                            {doneSubtasksCount}/{subtasksList.length} bước con
                          </span>
                        )}

                        {task.important && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                            <AlertCircle className="w-3 h-3" aria-hidden="true" />
                            Ưu tiên
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-[#586268] dark:text-[#A0AFAF] leading-snug">
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
                      className="min-h-[32px] min-w-[32px] flex items-center justify-center text-[#7A848B] hover:text-rose-600 dark:text-[#8E9E9E] dark:hover:text-rose-400 rounded-lg hover:bg-white dark:hover:bg-[#152222] transition-colors cursor-pointer"
                      aria-label={`Xoá nhiệm vụ ${task.title}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Subtasks Container */}
                {hasSubtasks && isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-[#EAEFEF] dark:border-[#202E2E] space-y-1.5 bg-white/60 dark:bg-[#141E1E]/60 rounded-b-xl">
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
                                ? 'bg-[#F0F5F4]/60 dark:bg-[#101818]/60 border-transparent text-[#7A848B] dark:text-[#7A8A8A]'
                                : 'bg-white dark:bg-[#182424] border-[#EAEFEF] dark:border-[#253737] hover:border-[#287C78]/50 text-[#11181C] dark:text-[#F2F7F7]'
                            }`}
                          >
                            <CornerDownRight className="w-3.5 h-3.5 text-[#7A848B] dark:text-[#7A8A8A] shrink-0 opacity-60" aria-hidden="true" />
                            <div className="shrink-0">
                              {isSubDone ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                              ) : (
                                <Square className="w-4 h-4 text-[#7A848B] dark:text-[#8E9E9E]" aria-hidden="true" />
                              )}
                            </div>
                            <span className={`text-xs font-semibold flex-1 ${isSubDone ? 'line-through text-[#7A848B] dark:text-[#7A8A8A]' : 'text-[#11181C] dark:text-[#F2F7F7]'}`}>
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
                          className="flex-1 p-2 rounded-lg border border-[#D5ECE8] dark:border-[#202E2E] bg-[#F4F7F6] dark:bg-[#1E2B2A] text-[#11181C] dark:text-[#F2F7F7] text-xs focus:outline-hidden focus:border-[#287C78]"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!newSubtaskTitle.trim()}
                          className="px-3 py-1.5 bg-[#287C78] hover:bg-[#1F625F] text-white font-bold text-xs rounded-lg disabled:opacity-50 min-h-[36px] cursor-pointer"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingSubtaskFor(null)}
                          className="px-2.5 py-1.5 text-xs text-[#586268] dark:text-[#8E9E9E] hover:bg-[#F0F5F4] dark:hover:bg-[#1A2626] rounded-lg min-h-[36px] cursor-pointer"
                        >
                          Hủy
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setAddingSubtaskFor(task.id)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-[#287C78] dark:text-[#42A39E] hover:underline pt-1 pl-4 min-h-[36px] cursor-pointer"
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
