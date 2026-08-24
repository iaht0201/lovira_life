import React from 'react';
import { X, CheckCircle2, PauseCircle, PlayCircle, Trash2, Sliders } from 'lucide-react';
import { LifeSession, SessionStatus } from '../../types';
import { NextRecommendedAction } from './NextRecommendedAction';
import { TaskProgressPanel } from './TaskProgressPanel';
import { ImportantFactsPanel } from './ImportantFactsPanel';
import { SessionResourcePanel } from './SessionResourcePanel';

export interface SessionPlanDetailContentProps {
  session: LifeSession;
  onClose?: () => void;
  onUpdateStatus: (status: SessionStatus) => void;
  onDeleteSession: () => void;
  onCompleteCurrentTask: () => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubtask?: (parentTaskId: string, subtaskId: string) => void;
  onAddTask: (title: string, description?: string) => void;
  onAddSubtask?: (parentTaskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddFact: (fact: { type: 'requirement' | 'preference' | 'note' | 'warning'; title: string; value: string }) => void;
  onDeleteFact: (factId: string) => void;
  onDeleteResource: (id: string) => void;
  onOpenCamera: () => void;
}

export const SessionPlanDetailContent: React.FC<SessionPlanDetailContentProps> = ({
  session,
  onClose,
  onUpdateStatus,
  onDeleteSession,
  onCompleteCurrentTask,
  onToggleTask,
  onToggleSubtask,
  onAddTask,
  onAddSubtask,
  onDeleteTask,
  onAddFact,
  onDeleteFact,
  onDeleteResource,
  onOpenCamera,
}) => {
  const completedTasks = session.tasks.filter((t) => t.isCompleted).length;
  const totalTasks = session.tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#152020] overflow-hidden">
      {/* Plan Header */}
      <div className="h-[56px] sm:h-[64px] px-4 border-b border-[#EAEFEF] dark:border-[#202E2E] flex items-center justify-between shrink-0 bg-white dark:bg-[#182424]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-[#E4F0EF] dark:bg-[#1B2D2C] text-[#287C78] dark:text-[#42A39E] shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-[#11181C] dark:text-[#F2F7F7] truncate tracking-tight">
              Kế hoạch
            </h2>
            <p className="text-[11px] font-medium text-[#586268] dark:text-[#8E9E9E] truncate">
              {session.title}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#F0F5F4] dark:hover:bg-[#202E2E] text-[#586268] hover:text-[#11181C] dark:hover:text-[#F2F7F7] transition-colors cursor-pointer shrink-0"
            aria-label="Thu gọn kế hoạch"
            title="Thu gọn kế hoạch"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Plan Body - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-[#F8FAFA] dark:bg-[#121A1A]">
        {/* Visual Progress Header */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#182424] border border-[#EAEFEF] dark:border-[#202E2E] space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#11181C] dark:text-[#F2F7F7]">Tiến độ công việc</span>
            <span className="text-[#165653] dark:text-[#42A39E]">
              {completedTasks}/{totalTasks} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E5EBEA] dark:bg-[#202E2E] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#287C78] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Next Recommended Action */}
        {session.recommendedAction && (
          <NextRecommendedAction
            action={session.recommendedAction}
            onCompleteCurrentTask={onCompleteCurrentTask}
            onOpenCamera={onOpenCamera}
          />
        )}

        {/* Tasks & Progress */}
        <TaskProgressPanel
          tasks={session.tasks}
          onToggleTask={onToggleTask}
          onToggleSubtask={onToggleSubtask}
          onAddTask={onAddTask}
          onAddSubtask={onAddSubtask}
          onDeleteTask={onDeleteTask}
        />

        {/* Important Facts */}
        <ImportantFactsPanel
          facts={session.importantFacts}
          onAddFact={onAddFact}
          onDeleteFact={onDeleteFact}
        />

        {/* Session Resources */}
        <SessionResourcePanel
          resources={session.resources}
          onDeleteResource={onDeleteResource}
          onOpenCamera={onOpenCamera}
        />
      </div>

      {/* Plan Footer Actions */}
      <div className="p-3.5 border-t border-[#EAEFEF] dark:border-[#202E2E] bg-white dark:bg-[#182424] space-y-2 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          {session.status === 'active' ? (
            <button
              onClick={() => onUpdateStatus('paused')}
              className="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-500/20 transition-all cursor-pointer"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Tạm dừng</span>
            </button>
          ) : (
            <button
              onClick={() => onUpdateStatus('active')}
              className="py-2 px-2.5 rounded-xl bg-[#E4F0EF] hover:bg-[#D5EAE8] dark:bg-[#1B2D2C] dark:hover:bg-[#233B39] text-[#287C78] dark:text-[#42A39E] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#287C78]/20 transition-all cursor-pointer"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Tiếp tục</span>
            </button>
          )}

          <button
            onClick={() => onUpdateStatus('completed')}
            className="py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/20 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Hoàn thành</span>
          </button>
        </div>

        <button
          onClick={onDeleteSession}
          className="w-full py-1.5 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50/60 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-500/20 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          <span>Xóa phiên này</span>
        </button>
      </div>
    </div>
  );
};
