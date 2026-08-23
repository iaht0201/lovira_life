import React from 'react';
import { Briefcase, Stethoscope, ShoppingBag, Landmark, Sparkles, Trash2 } from 'lucide-react';
import { BriefSessionHeader } from '../../services/storageService';

interface RecentSessionItemProps {
  session: BriefSessionHeader;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export const RecentSessionItem: React.FC<RecentSessionItemProps> = ({
  session,
  onOpen,
  onDelete,
}) => {
  const getIcon = () => {
    switch (session.type) {
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

  const Icon = getIcon();

  const getStatusBadge = () => {
    switch (session.status) {
      case 'active':
      case 'in_progress':
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

  const completedCount = session.completedTasks ?? 3;
  const totalCount = session.totalTasks ?? 7;

  return (
    <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-[16px] bg-lovira-card border border-lovira hover:border-lovira-purple hover:bg-lovira-card-hover transition-all duration-150 gap-3">
      {/* Clickable Area */}
      <button
        onClick={() => onOpen(session.id)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer focus:outline-none"
      >
        {/* Icon Container */}
        <div className="w-[38px] h-[38px] rounded-[12px] bg-lovira-badge-purple text-lovira-purple flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px]" />
        </div>

        {/* Title & Status */}
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="text-[14px] font-[700] text-lovira-title group-hover:text-lovira-purple transition-colors truncate">
            {session.title}
          </h4>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
          </div>
        </div>
      </button>

      {/* Progress Ratio (e.g. 3/7) */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[13px] font-[700] text-lovira-muted">
          {completedCount}/{totalCount}
        </span>

        {/* Quick Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.id);
          }}
          className="w-[28px] h-[28px] rounded-full text-lovira-sub hover:text-[#FF4D4D] hover:bg-[#FFF0F0] dark:hover:bg-[#3D1A1A] flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Xóa phiên này"
          aria-label="Xóa phiên này"
        >
          <Trash2 className="w-[15px] h-[15px]" />
        </button>
      </div>
    </div>
  );
};
