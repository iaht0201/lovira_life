import React from 'react';
import { ArrowLeft, Sliders, CheckCircle2, PauseCircle, PlayCircle, MoreVertical, Menu } from 'lucide-react';
import { LifeSession, SessionStatus } from '../../types';

interface SessionConversationHeaderProps {
  session: LifeSession;
  onBack?: () => void;
  onToggleDetailDrawer: () => void;
  onToggleMobileSessionsList?: () => void;
}

export const SessionConversationHeader: React.FC<SessionConversationHeaderProps> = ({
  session,
  onBack,
  onToggleDetailDrawer,
  onToggleMobileSessionsList,
}) => {
  const completedCount = session.tasks.filter((t) => t.isCompleted).length;
  const totalCount = session.tasks.length;

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            Đã hoàn thành
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
            <PauseCircle className="w-3 h-3" />
            Tạm dừng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E4F0EF] dark:bg-[#1B2928] text-[#287C78] dark:text-[#42A39E]">
            <PlayCircle className="w-3 h-3" />
            Đang thực hiện
          </span>
        );
    }
  };

  return (
    <div className="h-[52px] sm:h-[64px] px-3 sm:px-6 bg-white dark:bg-[#182424] flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
      {/* Left: Back (Mobile), Mobile Sessions Toggle, Title & Status */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-[#F0EDE4] dark:hover:bg-[#202E2E] transition-colors shrink-0 md:hidden cursor-pointer"
            title="Quay lại"
            aria-label="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {onToggleMobileSessionsList && (
          <button
            onClick={onToggleMobileSessionsList}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-[#F0EDE4] dark:hover:bg-[#202E2E] transition-colors shrink-0 lg:hidden cursor-pointer"
            title="Danh sách cuộc trò chuyện"
            aria-label="Danh sách cuộc trò chuyện"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-extrabold text-text-primary truncate tracking-tight">
              {session.title}
            </h1>
            <div className="shrink-0">{getStatusBadge(session.status)}</div>
          </div>
          <p className="text-[11px] font-medium text-text-secondary truncate">
            {totalCount > 0 ? `${completedCount}/${totalCount} việc hoàn thành` : 'Trợ lý sẵn sàng đồng hành'}
            <span className="mx-1">·</span>
            <span>Cập nhật mới nhất</span>
          </p>
        </div>
      </div>

      {/* Right: Toggle Session Details Drawer */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onToggleDetailDrawer}
          className="p-2.5 rounded-xl bg-[#F0EDE4] dark:bg-[#202E2E] text-text-secondary hover:text-[#287C78] dark:hover:text-[#42A39E] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          title="Xem Chi tiết Phiên & Công việc"
          aria-label="Mở chi tiết phiên"
        >
          <Sliders className="w-4 h-4 text-[#287C78] dark:text-[#42A39E]" />
          <span className="hidden sm:inline text-xs font-bold text-text-primary">Chi tiết phiên</span>
        </button>
      </div>
    </div>
  );
};
