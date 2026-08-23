import React from 'react';
import {
  Briefcase,
  Stethoscope,
  ShoppingBag,
  Landmark,
  Sparkles,
  SlidersHorizontal,
  Plus,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { BriefSessionHeader, LifeSession } from '../../types';

interface SessionListSidebarProps {
  sessions: BriefSessionHeader[] | LifeSession[];
  activeSessionId?: string;
  onSelectSession: (id: string) => void;
  onCreateNewSession?: () => void;
  onOpenHistory?: () => void;
}

export const SessionListSidebar: React.FC<SessionListSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateNewSession,
  onOpenHistory,
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'medical':
        return Stethoscope;
      case 'administrative':
        return Landmark;
      case 'shopping':
        return ShoppingBag;
      case 'interview':
        return Briefcase;
      default:
        return Sparkles;
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffHours < 24 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      } else if (diffHours < 48) {
        return 'Hôm qua';
      } else {
        return `${Math.floor(diffHours / 24)} ngày trước`;
      }
    } catch {
      return '';
    }
  };

  return (
    <aside className="w-full xl:w-[310px] h-full flex flex-col bg-lovira-card border-r border-lovira shrink-0 overflow-hidden transition-colors">
      {/* Header */}
      <div className="h-[64px] px-5 flex items-center justify-between border-b border-lovira-subtle shrink-0">
        <h2 className="text-[17px] font-[800] text-lovira-title flex items-center gap-2">
          <span>Cuộc trò chuyện</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-[700] bg-lovira-badge-purple text-lovira-purple">
            {sessions.length}
          </span>
        </h2>

        <div className="flex items-center gap-1">
          {onCreateNewSession && (
            <button
              onClick={onCreateNewSession}
              className="w-[32px] h-[32px] rounded-full bg-lovira-badge-purple text-lovira-purple hover:opacity-80 flex items-center justify-center transition-colors cursor-pointer"
              title="Tạo phiên mới"
              aria-label="Tạo phiên mới"
            >
              <Plus className="w-[16px] h-[16px]" />
            </button>
          )}
          <button
            className="w-[32px] h-[32px] rounded-full text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover flex items-center justify-center transition-colors cursor-pointer"
            title="Lọc phiên"
            aria-label="Lọc phiên"
          >
            <SlidersHorizontal className="w-[15px] h-[15px]" />
          </button>
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-lovira-subtle/40">
        {sessions.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <Sparkles className="w-8 h-8 text-lovira-purple mx-auto opacity-50" />
            <p className="text-[13px] font-[600] text-lovira-muted">Chưa có cuộc trò chuyện nào</p>
            {onCreateNewSession && (
              <button
                onClick={onCreateNewSession}
                className="px-4 py-2 rounded-[12px] bg-lovira-purple text-white text-[13px] font-[700] hover:opacity-90 transition-opacity cursor-pointer"
              >
                + Tạo phiên mới
              </button>
            )}
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const Icon = getIcon((session as any).scenarioType || (session as any).type);
            const completedCount = (session as any).completedTasks ?? 0;
            const totalCount = (session as any).totalTasks ?? (session as any).tasks?.length ?? 5;
            const status = session.status;
            const timeStr = formatTime(session.updatedAt);

            return (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left p-3 rounded-[16px] transition-all flex items-center gap-3 cursor-pointer group ${
                  isActive
                    ? 'bg-lovira-badge-purple border border-lovira-purple shadow-2xs'
                    : 'hover:bg-lovira-card-hover border border-transparent'
                }`}
              >
                {/* Icon Container */}
                <div
                  className={`w-[40px] h-[40px] rounded-[14px] flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-lovira-purple text-white'
                      : 'bg-lovira-badge-purple text-lovira-purple group-hover:bg-lovira-purple/20'
                  }`}
                >
                  <Icon className="w-[19px] h-[19px]" />
                </div>

                {/* Title and Progress */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <h4
                      className={`text-[14px] font-[700] truncate leading-tight ${
                        isActive ? 'text-lovira-purple' : 'text-lovira-title group-hover:text-lovira-purple'
                      }`}
                    >
                      {session.title}
                    </h4>
                    {timeStr && (
                      <span className="text-[11px] font-[500] text-lovira-sub shrink-0">
                        {timeStr}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[12px]">
                    {status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 font-[700] text-[#188B68] dark:text-[#34D399]">
                        <CheckCircle2 className="w-[12px] h-[12px]" />
                        <span>Đã hoàn thành</span>
                      </span>
                    ) : status === 'paused' ? (
                      <span className="font-[600] text-[#C66B21] dark:text-[#FFA066]">
                        Tạm dừng · {completedCount}/{totalCount}
                      </span>
                    ) : (
                      <span className="font-[600] text-lovira-muted">
                        Đang thực hiện · {completedCount}/{totalCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Active Indicator dot */}
                {isActive && (
                  <div className="w-[6px] h-[6px] rounded-full bg-lovira-purple shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer link to History */}
      {onOpenHistory && (
        <div className="p-3 border-t border-lovira-subtle shrink-0">
          <button
            onClick={onOpenHistory}
            className="w-full h-[38px] rounded-[12px] bg-lovira-card hover:bg-lovira-card-hover border border-lovira text-[12px] font-[700] text-lovira-purple flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Clock className="w-[14px] h-[14px]" />
            <span>Xem tất cả lịch sử</span>
          </button>
        </div>
      )}
    </aside>
  );
};
