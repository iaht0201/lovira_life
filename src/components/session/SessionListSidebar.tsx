import React from 'react';
import { Plus, CheckCircle2, Clock, PauseCircle, ShoppingBag, Briefcase, Stethoscope, Sparkles, Filter } from 'lucide-react';
import { BriefSessionHeader, LifeSession } from '../../types';

interface SessionListSidebarProps {
  sessionsList: BriefSessionHeader[];
  activeSessionId?: string;
  onOpenSession: (id: string) => void;
  onCreateNewSession: () => void;
  className?: string;
}

export const SessionListSidebar: React.FC<SessionListSidebarProps> = ({
  sessionsList,
  activeSessionId,
  onOpenSession,
  onCreateNewSession,
  className = '',
}) => {
  const getScenarioIcon = (scenarioType?: string) => {
    switch (scenarioType) {
      case 'medical':
        return <Stethoscope className="w-4 h-4 text-rose-500" />;
      case 'career':
      case 'interview':
        return <Briefcase className="w-4 h-4 text-blue-500" />;
      case 'shopping':
        return <ShoppingBag className="w-4 h-4 text-purple-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#7C4DFF]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            Đã hoàn thành
          </span>
        );
      case 'paused':
        return (
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
            Tạm dừng
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold text-[#7C4DFF] dark:text-purple-300">
            Đang thực hiện
          </span>
        );
    }
  };

  return (
    <div className={`w-[290px] xl:w-[320px] shrink-0 bg-surface border-r border-default flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-default flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">Cuộc trò chuyện</h2>
          <p className="text-[11px] font-medium text-text-secondary">Các phiên đời sống của bạn</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCreateNewSession}
            className="p-2 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-2xs"
            title="Tạo phiên trò chuyện mới"
            aria-label="Tạo phiên trò chuyện mới"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sessions Scrollable List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
        {sessionsList.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 text-[#7C4DFF] dark:text-purple-300 flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-text-secondary">Chưa có cuộc trò chuyện nào</p>
            <button
              onClick={onCreateNewSession}
              className="text-xs font-bold text-[#7C4DFF] hover:underline"
            >
              + Tạo phiên đầu tiên
            </button>
          </div>
        ) : (
          sessionsList.map((s) => {
            const isActive = s.id === activeSessionId;
            const progressText = s.totalTasksCount ? `${s.completedTasksCount}/${s.totalTasksCount}` : undefined;

            return (
              <button
                key={s.id}
                onClick={() => onOpenSession(s.id)}
                className={`w-full p-3 rounded-2xl text-left transition-all border flex items-start gap-3 group relative cursor-pointer ${
                  isActive
                    ? 'bg-[#F5F0FF] dark:bg-[#28203E] border-[#7C4DFF] text-text-primary shadow-xs'
                    : 'bg-surface hover:bg-surface-raised border-transparent text-text-primary'
                }`}
              >
                {/* Active Accent Bar */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[#7C4DFF]" />
                )}

                {/* Scenario Icon Badge */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isActive
                      ? 'bg-white dark:bg-[#1E1830] border-purple-300 dark:border-purple-800 shadow-2xs'
                      : 'bg-surface-raised border-default group-hover:bg-surface'
                  }`}
                >
                  {getScenarioIcon(s.scenarioType)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3
                      className={`text-xs font-bold truncate ${
                        isActive ? 'text-[#7C4DFF] dark:text-purple-300' : 'text-text-primary'
                      }`}
                    >
                      {s.title}
                    </h3>
                    <span className="text-[10px] font-medium text-text-secondary shrink-0">
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(s.status)}
                      {progressText && (
                        <>
                          <span className="text-text-secondary">·</span>
                          <span className="font-semibold text-text-secondary">{progressText}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Create New Session Button */}
      <div className="p-3 border-t border-default bg-surface shrink-0">
        <button
          onClick={onCreateNewSession}
          className="w-full py-2.5 px-3 rounded-xl bg-[#F5F0FF] dark:bg-[#28203E] hover:bg-[#EBE2FF] dark:hover:bg-[#32284E] text-[#7C4DFF] dark:text-purple-300 font-bold text-xs flex items-center justify-center gap-2 border border-purple-300 dark:border-purple-800 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo phiên làm việc mới</span>
        </button>
      </div>
    </div>
  );
};
