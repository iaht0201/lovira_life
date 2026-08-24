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
        return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#287C78] dark:text-[#42A39E]" />;
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
    <div className={`shrink-0 bg-white dark:bg-[#141E1E] border-r border-[#F0EDE4] dark:border-[#202E2E] flex flex-col h-full ${isMobile ? 'w-full' : 'w-[290px] xl:w-[320px]'} ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="p-4 flex items-center justify-between shrink-0 bg-white dark:bg-[#141E1E] border-b border-[#F0EDE4] dark:border-[#202E2E]">
          <div>
            <h2 className="text-base font-extrabold text-[#1C2226] dark:text-[#F2F7F7] tracking-tight">Cuộc trò chuyện</h2>
            <p className="text-[11px] font-medium text-[#7A848B] dark:text-[#8E9E9E]">Các phiên đời sống của bạn</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onCreateNewSession}
              className="p-2 rounded-xl bg-[#287C78] hover:bg-[#1F625F] text-white transition-colors shadow-2xs cursor-pointer"
              title="Tạo phiên trò chuyện mới"
              aria-label="Tạo phiên trò chuyện mới"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sessions Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar bg-[#FAF9F6] dark:bg-[#101818]">
        {sessionsList.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#E4F0EF] text-[#287C78] dark:bg-[#203B3A] dark:text-[#42A39E] flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#7A848B] dark:text-[#8E9E9E]">Chưa có cuộc trò chuyện nào</p>
            <button
              onClick={onCreateNewSession}
              className="text-xs font-bold text-[#287C78] hover:underline cursor-pointer"
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
                className={`w-full p-3.5 rounded-2xl text-left transition-all flex items-start gap-3 group relative cursor-pointer ${
                  isActive
                    ? 'bg-[#EAF4F3] dark:bg-[#223B3A] text-[#1C2226] dark:text-[#F2F7F7] shadow-xs'
                    : 'bg-white dark:bg-[#1B2626] hover:bg-[#F2EFE9] dark:hover:bg-[#243232] text-[#1C2226] dark:text-[#F2F7F7] shadow-2xs border border-[#EDEAE1] dark:border-transparent'
                }`}
              >
                {/* Active Accent Bar */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full bg-[#287C78]" />
                )}

                {/* Scenario Icon Badge */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-white dark:bg-[#1B2626] text-[#287C78] shadow-2xs'
                      : 'bg-[#F4F3EE] dark:bg-[#202E2E] group-hover:bg-white dark:group-hover:bg-[#1B2626]'
                  }`}
                >
                  {getScenarioIcon(s.scenarioType)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3
                      className={`text-xs font-bold truncate ${
                        isActive ? 'text-[#287C78] dark:text-[#42A39E]' : 'text-[#1C2226] dark:text-[#F2F7F7]'
                      }`}
                    >
                      {s.title}
                    </h3>
                    <span className="text-[10px] font-medium text-[#7A848B] dark:text-[#8E9E9E] shrink-0">
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(s.status)}
                      {progressText && (
                        <>
                          <span className="text-[#A0AAB0]">·</span>
                          <span className="font-semibold text-[#7A848B] dark:text-[#8E9E9E]">{progressText}</span>
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
      <div className="p-3 border-t border-[#F0EDE4] dark:border-[#202E2E] bg-white dark:bg-[#141E1E] shrink-0">
        <button
          onClick={onCreateNewSession}
          className="w-full py-2.5 px-3 rounded-xl bg-[#EAF4F3] hover:bg-[#DEEFEA] dark:bg-[#1B2E2D] dark:hover:bg-[#243D3B] text-[#287C78] dark:text-[#42A39E] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo phiên làm việc mới</span>
        </button>
      </div>
    </div>
  );
};
