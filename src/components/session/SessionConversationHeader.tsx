import React from 'react';
import { ArrowLeft, Sliders, CheckCircle2, PauseCircle, PlayCircle, Menu, ChevronRight } from 'lucide-react';
import { LifeSession, SessionStatus } from '../../types';
import { calculateSessionTaskProgress } from '../../services/actionEngine';

interface SessionConversationHeaderProps {
  session: LifeSession;
  onBack?: () => void;
  onToggleDetailDrawer: () => void;
  onToggleMobileSessionsList?: () => void;
  isDetailOpen?: boolean;
}

export const SessionConversationHeader: React.FC<SessionConversationHeaderProps> = ({
  session,
  onBack,
  onToggleDetailDrawer,
  onToggleMobileSessionsList,
  isDetailOpen = false,
}) => {
  const { completedUnits: completedCount, totalUnits: totalCount } = calculateSessionTaskProgress(session.tasks);

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
    <div className="h-[56px] sm:h-[64px] px-3.5 sm:px-6 bg-white dark:bg-[#182424] border-b border-[#EAEFEF] dark:border-[#202E2E] flex items-center justify-between shrink-0 sticky top-0 z-20">
      {/* Left: Back (Mobile), Mobile Sessions Toggle, Title & Status */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-[#586268] hover:text-[#11181C] hover:bg-[#F0F5F4] dark:text-[#C0CCCC] dark:hover:text-white dark:hover:bg-[#202E2E] transition-colors shrink-0 md:hidden cursor-pointer"
            title="Quay lại"
            aria-label="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {onToggleMobileSessionsList && (
          <button
            onClick={onToggleMobileSessionsList}
            className="p-2 rounded-xl text-[#586268] hover:text-[#11181C] hover:bg-[#F0F5F4] dark:text-[#C0CCCC] dark:hover:text-white dark:hover:bg-[#202E2E] transition-colors shrink-0 lg:hidden cursor-pointer"
            title="Danh sách cuộc trò chuyện"
            aria-label="Danh sách cuộc trò chuyện"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-extrabold text-[#11181C] dark:text-[#F2F7F7] truncate tracking-tight">
              {session.title}
            </h1>
            <div className="shrink-0">{getStatusBadge(session.status)}</div>
          </div>
          <p className="text-[11px] font-medium text-[#586268] dark:text-[#8E9E9E] truncate">
            {totalCount > 0 ? `${completedCount}/${totalCount} việc hoàn thành` : 'Trợ lý sẵn sàng đồng hành'}
            <span className="mx-1.5">·</span>
            <span>Trực tuyến</span>
          </p>
        </div>
      </div>

      {/* Right: Toggle Session Details & Plan Panel */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleDetailDrawer}
          className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer border ${
            isDetailOpen
              ? 'bg-[#287C78] text-white border-[#287C78] shadow-xs'
              : 'bg-[#F0F5F4] hover:bg-[#E4F0EF] dark:bg-[#202E2E] dark:hover:bg-[#283C3B] text-[#165653] dark:text-[#F2F7F7] border-[#D5ECE8] dark:border-transparent'
          }`}
          title={isDetailOpen ? 'Thu gọn chi tiết kế hoạch' : 'Xem chi tiết kế hoạch & công việc'}
          aria-label={isDetailOpen ? 'Thu gọn kế hoạch' : 'Xem kế hoạch'}
        >
          <Sliders className={`w-4 h-4 ${isDetailOpen ? 'text-white' : 'text-[#287C78] dark:text-[#42A39E]'}`} />
          <span className="hidden sm:inline text-xs font-bold">
            {isDetailOpen ? 'Đóng kế hoạch' : 'Kế hoạch'}
          </span>
          {totalCount > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold transition-colors ${
                isDetailOpen
                  ? 'bg-white/20 text-white'
                  : 'bg-[#E4F0EF] dark:bg-[#1B2928] text-[#287C78] dark:text-[#42A39E]'
              }`}
            >
              {completedCount}/{totalCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
