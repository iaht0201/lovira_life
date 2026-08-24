import React from 'react';
import { Plus, CheckCircle2, Clock, PauseCircle, ShoppingBag, Briefcase, Stethoscope, Sparkles, Filter } from 'lucide-react';
import { BriefSessionHeader, LifeSession } from '../../types';

interface SessionListSidebarProps {
  sessionsList: BriefSessionHeader[];
  activeSessionId?: string;
  onOpenSession: (id: string) => void;
  onCreateNewSession: () => void;
  showHeader?: boolean;
  isMobile?: boolean;
  className?: string;
}

export const SessionListSidebar: React.FC<SessionListSidebarProps> = ({
  sessionsList,
  activeSessionId,
  onOpenSession,
  onCreateNewSession,
  showHeader = true,
  isMobile = false,
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
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            Đã hoàn thành
          </span>
        );
      case 'paused':
        return (
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
            Tạm dừng
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold text-lovira-purple">
            Đang thực hiện
          </span>
        );
    }
  };

  return (
    <div className={`shrink-0 bg-lovira-sidebar border-r border-lovira flex flex-col h-full ${isMobile ? 'w-full' : 'w-[290px] xl:w-[320px]'} ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="p-4 border-b border-lovira-subtle flex items-center justify-between shrink-0 bg-lovira-card">
          <div>
            <h2 className="text-base font-bold text-lovira-title tracking-tight">Cuộc trò chuyện</h2>
            <p className="text-[11px] font-medium text-lovira-muted">Các phiên đời sống của bạn</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onCreateNewSession}
              className="p-2 rounded-xl bg-lovira-purple hover:bg-lovira-purple-hover text-white transition-colors shadow-2xs cursor-pointer"
              title="Tạo phiên trò chuyện mới"
              aria-label="Tạo phiên trò chuyện mới"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sessions Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-lovira-sidebar">
        {sessionsList.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-10 h-10 rounded-full bg-lovira-badge-purple text-lovira-purple flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-lovira-muted">Chưa có cuộc trò chuyện nào</p>
            <button
              onClick={onCreateNewSession}
              className="text-xs font-bold text-lovira-purple hover:underline cursor-pointer"
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
                    ? 'bg-lovira-sidebar-active border-lovira-purple text-lovira-title shadow-xs'
                    : 'bg-lovira-card hover:bg-lovira-card-hover border-lovira text-lovira-title'
                }`}
              >
                {/* Active Accent Bar */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-[#7C4DFF]" />
                )}

                {/* Scenario Icon Badge */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isActive
                      ? 'bg-lovira-card border-lovira-purple shadow-2xs'
                      : 'bg-lovira-input border-lovira group-hover:bg-lovira-card'
                  }`}
                >
                  {getScenarioIcon(s.scenarioType)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3
                      className={`text-xs font-bold truncate ${
                        isActive ? 'text-lovira-purple' : 'text-lovira-title'
                      }`}
                    >
                      {s.title}
                    </h3>
                    <span className="text-[10px] font-medium text-lovira-muted shrink-0">
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(s.status)}
                      {progressText && (
                        <>
                          <span className="text-lovira-muted">·</span>
                          <span className="font-semibold text-lovira-muted">{progressText}</span>
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
      <div className="p-3 border-t border-lovira-subtle bg-lovira-card shrink-0">
        <button
          onClick={onCreateNewSession}
          className="w-full py-2.5 px-3 rounded-xl bg-lovira-badge-purple hover:bg-lovira-sidebar-active text-lovira-purple font-bold text-xs flex items-center justify-center gap-2 border border-lovira-purple transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo phiên làm việc mới</span>
        </button>
      </div>
    </div>
  );
};
