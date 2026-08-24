import React, { useState, useMemo } from 'react';
import {
  Plus,
  CheckCircle2,
  Clock,
  PauseCircle,
  ShoppingBag,
  Briefcase,
  Stethoscope,
  Sparkles,
  Search,
  MessageSquare,
  Filter,
} from 'lucide-react';
import { BriefSessionHeader } from '../../types';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');

  const filteredSessions = useMemo(() => {
    return sessionsList.filter((s) => {
      // Filter by search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = s.title.toLowerCase().includes(query);
        const matchesScenario = s.scenarioType?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesScenario) return false;
      }

      // Filter by tab
      if (activeFilter === 'active') {
        return s.status === 'active' || s.status === 'paused';
      }
      if (activeFilter === 'completed') {
        return s.status === 'completed';
      }

      return true;
    });
  }, [sessionsList, searchQuery, activeFilter]);

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
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Đã xong
          </span>
        );
      case 'paused':
        return (
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <PauseCircle className="w-3 h-3" />
            Tạm dừng
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold text-[#287C78] dark:text-[#42A39E]">
            Đang thực hiện
          </span>
        );
    }
  };

  return (
    <div
      className={`shrink-0 bg-white dark:bg-[#141E1E] border-r border-[#F0EDE4] dark:border-[#202E2E] flex flex-col h-full overflow-hidden ${
        isMobile ? 'w-full' : 'w-[280px] xl:w-[320px]'
      } ${className}`}
    >
      {/* Column 1 Header (Independent like Messenger) */}
      {showHeader && (
        <div className="p-3.5 sm:p-4 shrink-0 bg-white dark:bg-[#141E1E] border-b border-[#F0EDE4] dark:border-[#202E2E] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E4F0EF] dark:bg-[#1B2D2C] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center font-bold text-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-[#1C2226] dark:text-[#F2F7F7] tracking-tight">
                Đoạn chat
              </h2>
            </div>
            <button
              onClick={onCreateNewSession}
              className="p-2 rounded-xl bg-[#287C78] hover:bg-[#1F625F] text-white transition-colors shadow-2xs cursor-pointer"
              title="Tạo cuộc trò chuyện mới"
              aria-label="Tạo cuộc trò chuyện mới"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8E9E9E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm đoạn chat..."
              className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-[#F6F4EF] dark:bg-[#1A2626] text-xs text-[#1C2226] dark:text-[#F2F7F7] placeholder-[#8E9E9E] border border-transparent focus:border-[#287C78]/40 focus:outline-none transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#287C78] text-white'
                  : 'bg-[#F6F4EF] dark:bg-[#1C2828] text-[#7A848B] hover:text-[#1C2226] dark:text-[#8E9E9E]'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActiveFilter('active')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'active'
                  ? 'bg-[#287C78] text-white'
                  : 'bg-[#F6F4EF] dark:bg-[#1C2828] text-[#7A848B] hover:text-[#1C2226] dark:text-[#8E9E9E]'
              }`}
            >
              Đang làm
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'completed'
                  ? 'bg-[#287C78] text-white'
                  : 'bg-[#F6F4EF] dark:bg-[#1C2828] text-[#7A848B] hover:text-[#1C2226] dark:text-[#8E9E9E]'
              }`}
            >
              Đã xong
            </button>
          </div>
        </div>
      )}

      {/* Column 1 Independent Scrollable List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar bg-[#FAF9F6] dark:bg-[#101818]">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#E4F0EF] text-[#287C78] dark:bg-[#203B3A] dark:text-[#42A39E] flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#7A848B] dark:text-[#8E9E9E]">
              {searchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có cuộc trò chuyện nào'}
            </p>
            <button
              onClick={onCreateNewSession}
              className="text-xs font-bold text-[#287C78] hover:underline cursor-pointer"
            >
              + Tạo phiên mới
            </button>
          </div>
        ) : (
          filteredSessions.map((s) => {
            const isActive = s.id === activeSessionId;
            const progressText = s.totalTasksCount ? `${s.completedTasksCount}/${s.totalTasksCount}` : undefined;

            return (
              <button
                key={s.id}
                onClick={() => onOpenSession(s.id)}
                className={`w-full p-3 rounded-xl text-left transition-all flex items-start gap-3 group relative cursor-pointer ${
                  isActive
                    ? 'bg-[#EAF4F3] dark:bg-[#223B3A] text-[#1C2226] dark:text-[#F2F7F7] shadow-xs'
                    : 'bg-white dark:bg-[#182424] hover:bg-[#F2EFE9] dark:hover:bg-[#1E2E2E] text-[#1C2226] dark:text-[#F2F7F7] border border-[#EDEAE1] dark:border-transparent'
                }`}
              >
                {/* Active Accent Bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#287C78]" />
                )}

                {/* Scenario Icon Badge */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-white dark:bg-[#182424] text-[#287C78] shadow-2xs'
                      : 'bg-[#F4F3EE] dark:bg-[#202E2E] group-hover:bg-white dark:group-hover:bg-[#182424]'
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
    </div>
  );
};
