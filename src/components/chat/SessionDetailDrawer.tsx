import React from 'react';
import { X, PauseCircle, CheckCircle2, PlayCircle, Sparkles } from 'lucide-react';
import { LifeSession } from '../../types';
import { TaskProgressPanel } from '../session/TaskProgressPanel';
import { ImportantFactsPanel } from '../session/ImportantFactsPanel';
import { SessionResourcePanel } from '../session/SessionResourcePanel';

interface SessionDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: LifeSession;
  onUpdateStatus: (status: 'active' | 'paused' | 'completed') => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubtask?: (parentTaskId: string, subtaskId: string) => void;
  onAddTask: (title: string, description?: string) => void;
  onAddSubtask?: (parentTaskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddFact: (fact: { type: 'requirement' | 'preference' | 'note' | 'warning'; title: string; value: string }) => void;
  onDeleteFact: (factId: string) => void;
  onDeleteResource: (resourceId: string) => void;
  onOpenCamera: () => void;
}

export const SessionDetailDrawer: React.FC<SessionDetailDrawerProps> = ({
  isOpen,
  onClose,
  session,
  onUpdateStatus,
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

  // Calculate task counts
  let completedCount = 0;
  let totalCount = 0;
  session.tasks.forEach((t) => {
    if (t.subtasks && t.subtasks.length > 0) {
      t.subtasks.forEach((st) => {
        totalCount += 1;
        if (st.status === 'completed' || st.status === 'skipped') completedCount += 1;
      });
    } else {
      totalCount += 1;
      if (t.status === 'completed' || t.status === 'skipped') completedCount += 1;
    }
  });

  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop overlay click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container (Slide-over on Desktop, Bottom Sheet on Mobile) */}
      <div className="relative w-full sm:w-[420px] md:w-[460px] h-full sm:h-full bg-lovira-card border-l border-lovira shadow-lovira-lg flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="h-[64px] px-6 flex items-center justify-between border-b border-lovira-subtle shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-[18px] h-[18px] text-lovira-purple" />
            <h3 className="text-[18px] font-[800] text-lovira-title">Chi tiết phiên hỗ trợ</h3>
          </div>

          <button
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-full bg-lovira-badge-purple text-lovira-purple hover:opacity-80 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng chi tiết"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Progress Overview */}
          <div className="p-4 rounded-[18px] bg-lovira-badge-purple/50 border border-lovira-purple/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-[700] text-lovira-title">Tiến độ công việc</span>
              <span className="text-[14px] font-[800] text-lovira-purple">
                {completedCount}/{totalCount} ({progressPercent}%)
              </span>
            </div>
            {/* Bar */}
            <div className="w-full h-[8px] rounded-full bg-lovira-subtle overflow-hidden">
              <div
                className="h-full bg-lovira-purple transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Goal Description if present */}
          {session.goal && (
            <div className="space-y-1">
              <label className="text-[11px] font-[700] uppercase tracking-wider text-lovira-sub">
                Mục tiêu chính
              </label>
              <p className="text-[13px] font-[600] text-lovira-title bg-lovira-input p-3 rounded-[12px] border border-lovira">
                {session.goal}
              </p>
            </div>
          )}

          {/* Tasks Panel */}
          <TaskProgressPanel
            tasks={session.tasks}
            onToggleTask={onToggleTask}
            onToggleSubtask={onToggleSubtask}
            onAddTask={onAddTask}
            onAddSubtask={onAddSubtask}
            onDeleteTask={onDeleteTask}
          />

          {/* Important Facts Panel */}
          <ImportantFactsPanel
            facts={session.importantFacts}
            onAddFact={onAddFact}
            onDeleteFact={onDeleteFact}
          />

          {/* Session Resources Panel */}
          <SessionResourcePanel
            resources={session.resources}
            onDeleteResource={onDeleteResource}
            onOpenCamera={onOpenCamera}
          />
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-lovira-subtle bg-lovira-card shrink-0 flex items-center gap-3">
          {session.status !== 'completed' && (
            <button
              onClick={() => onUpdateStatus('completed')}
              className="flex-1 h-[44px] rounded-[12px] bg-[#188B68] hover:opacity-90 text-white font-[700] text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-[16px] h-[16px]" />
              <span>Kết thúc phiên</span>
            </button>
          )}

          {session.status === 'active' && (
            <button
              onClick={() => onUpdateStatus('paused')}
              className="flex-1 h-[44px] rounded-[12px] bg-lovira-card border border-lovira hover:bg-lovira-card-hover text-[#C66B21] font-[700] text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <PauseCircle className="w-[16px] h-[16px]" />
              <span>Tạm dừng</span>
            </button>
          )}

          {session.status === 'paused' && (
            <button
              onClick={() => onUpdateStatus('active')}
              className="flex-1 h-[44px] rounded-[12px] bg-lovira-purple hover:opacity-90 text-white font-[700] text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <PlayCircle className="w-[16px] h-[16px]" />
              <span>Tiếp tục phiên</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
