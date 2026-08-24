import React from 'react';
import { X, CheckCircle2, PauseCircle, PlayCircle, Trash2, Sliders, AlertTriangle } from 'lucide-react';
import { LifeSession, SessionStatus } from '../../types';
import { NextRecommendedAction } from './NextRecommendedAction';
import { TaskProgressPanel } from './TaskProgressPanel';
import { ImportantFactsPanel } from './ImportantFactsPanel';
import { SessionResourcePanel } from './SessionResourcePanel';

interface SessionDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: LifeSession;
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

export const SessionDetailDrawer: React.FC<SessionDetailDrawerProps> = ({
  isOpen,
  onClose,
  session,
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
  if (!isOpen) return null;

  const completedTasks = session.tasks.filter((t) => t.isCompleted).length;
  const totalTasks = session.tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Container (Desktop slide-over / Mobile bottom sheet) */}
      <div className="relative z-10 w-full sm:w-[420px] md:w-[460px] h-full max-h-[100dvh] bg-white dark:bg-[#1C162E] opacity-100 border-l-2 border-default shadow-lovira-lg flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-default flex items-center justify-between shrink-0 bg-surface-raised">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900 text-[#7C4DFF] dark:text-purple-300">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Chi tiết phiên</h2>
              <p className="text-[11px] font-medium text-text-secondary truncate">{session.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Đóng chi tiết"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Visual Progress Header */}
          <div className="p-4 rounded-2xl bg-surface-raised border border-default space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-text-primary">Tiến độ công việc</span>
              <span className="text-primary">{completedTasks}/{totalTasks} ({progressPercent}%)</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface border border-default overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300"
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

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-default bg-surface-raised space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {session.status === 'active' ? (
              <button
                onClick={() => onUpdateStatus('paused')}
                className="py-2.5 px-3 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-500/20 transition-all cursor-pointer hover:bg-amber-200"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Tạm dừng phiên</span>
              </button>
            ) : (
              <button
                onClick={() => onUpdateStatus('active')}
                className="py-2.5 px-3 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#7C4DFF] dark:text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-purple-500/20 transition-all cursor-pointer hover:bg-purple-200"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Tiếp tục phiên</span>
              </button>
            )}

            <button
              onClick={() => onUpdateStatus('completed')}
              className="py-2.5 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/20 transition-all cursor-pointer hover:bg-emerald-200"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Hoàn thành phiên</span>
            </button>
          </div>

          <button
            onClick={onDeleteSession}
            className="w-full py-2 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-500/20 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa phiên này</span>
          </button>
        </div>
      </div>
    </div>
  );
};
