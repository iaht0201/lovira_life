import React from 'react';
import { ArrowLeft, SlidersHorizontal, Menu, Sparkles } from 'lucide-react';
import { LifeSession } from '../../types';

interface SessionConversationHeaderProps {
  session: LifeSession;
  onBack?: () => void;
  onToggleSessionDrawer?: () => void;
  onOpenDetails: () => void;
  completedTasksCount: number;
  totalTasksCount: number;
}

export const SessionConversationHeader: React.FC<SessionConversationHeaderProps> = ({
  session,
  onBack,
  onToggleSessionDrawer,
  onOpenDetails,
  completedTasksCount,
  totalTasksCount,
}) => {
  const getStatusBadge = () => {
    switch (session.status) {
      case 'active':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-[700] bg-lovira-badge-purple text-lovira-purple shrink-0">
            Đang thực hiện
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-[700] bg-[#EAFBF5] dark:bg-[#143B2E] text-[#188B68] dark:text-[#34D399] shrink-0">
            Đã hoàn thành
          </span>
        );
      case 'paused':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-[700] bg-[#FFF3E8] dark:bg-[#3D2518] text-[#C66B21] dark:text-[#FFA066] shrink-0">
            Tạm dừng
          </span>
        );
    }
  };

  return (
    <header className="h-[64px] bg-lovira-topbar backdrop-blur-md border-b border-lovira-subtle px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0 transition-colors">
      {/* Left Area: Back Button (Mobile) / Drawer Menu (Medium Desktop) / Session Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="sm:hidden w-[36px] h-[36px] rounded-full bg-lovira-card border border-lovira hover:bg-lovira-card-hover text-lovira-muted flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            aria-label="Quay lại"
            title="Quay lại"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
        )}

        {onToggleSessionDrawer && (
          <button
            onClick={onToggleSessionDrawer}
            className="hidden lg:flex xl:hidden w-[36px] h-[36px] rounded-full bg-lovira-card border border-lovira hover:bg-lovira-card-hover text-lovira-purple items-center justify-center shrink-0 transition-colors cursor-pointer"
            title="Danh sách phiên"
            aria-label="Danh sách phiên"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>
        )}

        {/* Title and Meta */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] sm:text-[18px] font-[800] text-lovira-title truncate leading-tight">
              {session.title}
            </h2>
            <div className="hidden sm:block">{getStatusBadge()}</div>
          </div>
          <p className="text-[11px] sm:text-[12px] font-[500] text-lovira-muted truncate mt-0.5">
            {completedTasksCount}/{totalTasksCount} công việc · Cập nhật vừa xong
          </p>
        </div>
      </div>

      {/* Right Area: Session Details Button */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="sm:hidden">{getStatusBadge()}</div>

        <button
          onClick={onOpenDetails}
          className="w-[38px] h-[38px] rounded-[12px] bg-lovira-card border border-lovira hover:border-lovira-purple hover:bg-lovira-badge-purple text-lovira-muted hover:text-lovira-purple flex items-center justify-center transition-all cursor-pointer shadow-2xs"
          title="Chi tiết phiên & Công việc"
          aria-label="Chi tiết phiên"
        >
          <SlidersHorizontal className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
};
