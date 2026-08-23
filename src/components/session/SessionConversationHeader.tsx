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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Đã hoàn thành
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <PauseCircle className="w-3 h-3" />
            Tạm dừng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950 text-[#7C4DFF] dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <PlayCircle className="w-3 h-3" />
            Đang thực hiện
          </span>
        );
    }
  };

  return (
    <div className="h-[64px] px-3.5 sm:px-6 bg-surface border-b border-default flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-2xs">
      {/* Left: Back (Mobile), Mobile Sessions Toggle, Title & Status */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors shrink-0 md:hidden cursor-pointer"
            title="Quay lại"
            aria-label="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {onToggleMobileSessionsList && (
          <button
            onClick={onToggleMobileSessionsList}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors shrink-0 lg:hidden cursor-pointer"
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
          className="p-2.5 rounded-xl bg-surface-raised border border-default hover:border-[#7C4DFF] text-text-secondary hover:text-[#7C4DFF] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          title="Xem Chi tiết Phiên & Công việc"
          aria-label="Mở chi tiết phiên"
        >
          <Sliders className="w-4 h-4 text-[#7C4DFF]" />
          <span className="hidden sm:inline text-xs font-bold text-text-primary">Chi tiết phiên</span>
        </button>
      </div>
    </div>
  );
};
