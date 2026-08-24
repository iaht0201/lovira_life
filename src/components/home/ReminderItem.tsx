import React from 'react';
import { Pill, Calendar, Users, BellRing, CheckCircle2 } from 'lucide-react';

export interface ReminderData {
  id: string;
  title: string;
  time: string;
  category?: 'medication' | 'appointment' | 'family' | 'general';
  completed?: boolean;
}

interface ReminderItemProps {
  reminder: ReminderData;
  onToggle?: (id: string) => void;
}

export const ReminderItem: React.FC<ReminderItemProps> = ({
  reminder,
  onToggle,
}) => {
  const getIcon = () => {
    switch (reminder.category) {
      case 'medication':
        return { Icon: Pill, bg: 'bg-[#FFF3E8] dark:bg-[#3D2518]', text: 'text-[#FF701A] dark:text-[#FFA066]' };
      case 'appointment':
        return { Icon: Calendar, bg: 'bg-[#F1E9FF] dark:bg-[#2F2154]', text: 'text-[#7C4DFF] dark:text-[#A45CFF]' };
      case 'family':
        return { Icon: Users, bg: 'bg-[#FFEBF5] dark:bg-[#3D1A2B]', text: 'text-[#E63988] dark:text-[#FF70B5]' };
      default:
        return { Icon: BellRing, bg: 'bg-[#E8F2FF] dark:bg-[#1A2A44]', text: 'text-[#2B70E4] dark:text-[#70A5FF]' };
    }
  };

  const { Icon, bg, text } = getIcon();

  return (
    <div
      onClick={() => onToggle && onToggle(reminder.id)}
      className={`group flex items-center gap-3.5 p-3.5 rounded-[16px] bg-lovira-card border border-lovira hover:border-lovira-purple transition-all cursor-pointer ${
        reminder.completed ? 'opacity-50 line-through bg-lovira-card-hover' : ''
      }`}
    >
      {/* Icon */}
      <div className={`w-[38px] h-[38px] rounded-[12px] ${bg} ${text} flex items-center justify-center shrink-0`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-[14px] font-[700] text-lovira-title truncate group-hover:text-lovira-purple transition-colors">
          {reminder.title}
        </h4>
        <p className="text-[12px] font-[500] text-lovira-muted truncate mt-0.5">
          {reminder.time}
        </p>
      </div>

      {/* Complete Checkbox */}
      <button
        type="button"
        className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center transition-colors shrink-0 ${
          reminder.completed
            ? 'bg-[#28C795] border-[#28C795] text-white'
            : 'border-lovira group-hover:border-lovira-purple text-transparent'
        }`}
        aria-label="Đánh dấu đã hoàn thành"
      >
        <CheckCircle2 className="w-[14px] h-[14px]" />
      </button>
    </div>
  );
};
