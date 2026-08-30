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
  const getCategoryTheme = () => {
    const type = (session.scenarioType || session.scenarioFamily || (session as any).type || '').toLowerCase();
    const titleLower = session.title.toLowerCase();

    if (type.includes('medical') || type.includes('health') || titleLower.includes('khám') || titleLower.includes('thuốc')) {
      return {
        Icon: Stethoscope,
        iconBg: 'bg-[#E6F4F1] dark:bg-[#143B33] text-[#0D9488] dark:text-[#34D399]',
        badgeStyle: 'bg-[#E6F4F1] dark:bg-[#143B33] text-[#0D9488] dark:text-[#34D399]',
      };
    }
    if (type.includes('shopping') || titleLower.includes('sắm') || titleLower.includes('chợ') || titleLower.includes('sữa') || titleLower.includes('mua')) {
      return {
        Icon: ShoppingBag,
        iconBg: 'bg-[#FFF7ED] dark:bg-[#3B2917] text-[#EA580C] dark:text-[#FDBA74]',
        badgeStyle: 'bg-[#FFF7ED] dark:bg-[#3B2917] text-[#C2410C] dark:text-[#FDBA74]',
      };
    }
    if (type.includes('admin') || type.includes('doc') || titleLower.includes('thủ tục') || titleLower.includes('giấy') || titleLower.includes('hồ sơ')) {
      return {
        Icon: Landmark,
        iconBg: 'bg-[#EEECFF] dark:bg-[#251D42] text-[#4F46E5] dark:text-[#A5B4FC]',
        badgeStyle: 'bg-[#EEECFF] dark:bg-[#251D42] text-[#4338CA] dark:text-[#C7D2FE]',
      };
    }
    if (type.includes('interview') || titleLower.includes('phỏng vấn') || titleLower.includes('việc')) {
      return {
        Icon: Briefcase,
        iconBg: 'bg-[#EFF6FF] dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA]',
        badgeStyle: 'bg-[#EFF6FF] dark:bg-[#1E293B] text-[#1D4ED8] dark:text-[#60A5FA]',
      };
    }
    return {
      Icon: Sparkles,
      iconBg: 'bg-lovira-badge-purple text-lovira-purple',
      badgeStyle: 'bg-lovira-badge-purple text-lovira-purple',
    };
  };

  const theme = getCategoryTheme();
  const Icon = theme.Icon;

  const getStatusBadge = () => {
    switch (session.status) {
      case 'active':
      case 'in_progress':
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] ${theme.badgeStyle} shrink-0`}>
            Đang thực hiện
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-[700] bg-[#EAFBF5] dark:bg-[#143B2E] text-[#15803D] dark:text-[#34D399] shrink-0">
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

  const completedCount = session.completedTasksCount ?? session.completedTasks ?? 0;
  const totalCount = session.totalTasksCount ?? session.totalTasks ?? 0;

  return (
    <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-[18px] bg-lovira-card border border-lovira hover:border-lovira-purple hover:bg-lovira-card-hover transition-all duration-150 gap-3 shadow-xs">
      {/* Clickable Area */}
      <button
        onClick={() => onOpen(session.id)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer focus:outline-none"
      >
        {/* Icon Container with Category Theme Color */}
        <div className={`w-[40px] h-[40px] rounded-[13px] ${theme.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
          <Icon className="w-[20px] h-[20px]" />
        </div>

        {/* Title, Status & Progress below */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            {session.pinned && (
              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                📌 Đã ghim
              </span>
            )}
            <h4 className="text-[14px] sm:text-[15px] font-[700] text-lovira-title group-hover:text-lovira-purple transition-colors truncate leading-tight">
              {session.title}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            {getStatusBadge()}

            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-[12px] font-[700] text-lovira-muted whitespace-nowrap">
                {completedCount}/{totalCount} bước
              </span>
              <div className="w-[60px] sm:w-[80px] h-[5px] rounded-full bg-[#E5EBEA] dark:bg-[#213331] overflow-hidden">
                <div
                  className="h-full rounded-full bg-lovira-purple transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((completedCount / totalCount) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* Quick Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.id);
        }}
        className="w-[30px] h-[30px] rounded-full text-lovira-sub hover:text-[#EF4444] hover:bg-[#FEE2E2] dark:hover:bg-[#3D1A1A] flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 min-w-[30px]"
        title="Xóa phiên này"
        aria-label="Xóa phiên này"
      >
        <Trash2 className="w-[15px] h-[15px]" />
      </button>
    </div>
  );
};
