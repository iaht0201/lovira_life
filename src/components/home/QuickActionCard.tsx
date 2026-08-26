import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface QuickActionCardProps {
  id: 'create_session' | 'tasks' | 'reminders' | 'chat';
  title: string;
  description: string;
  icon: LucideIcon;
  accent: 'purple' | 'orange' | 'pink' | 'blue';
  onClick: () => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon: Icon,
  accent,
  onClick,
}) => {
  const accentStyles = {
    purple: {
      bg: 'bg-[#E4F0EF] dark:bg-[#203A39]',
      text: 'text-[#287C78] dark:text-[#42A39E]',
      borderHover: 'hover:border-[#287C78]',
    },
    orange: {
      bg: 'bg-[#FFF3E8] dark:bg-[#3D2518]',
      text: 'text-[#FF701A] dark:text-[#FFA066]',
      borderHover: 'hover:border-[#FF701A]',
    },
    pink: {
      bg: 'bg-[#FDF2F4] dark:bg-[#2A181C]',
      text: 'text-[#E76F91] dark:text-[#F296B0]',
      borderHover: 'hover:border-[#E76F91]',
    },
    blue: {
      bg: 'bg-[#E8F2FF] dark:bg-[#1A2A44]',
      text: 'text-[#2B70E4] dark:text-[#70A5FF]',
      borderHover: 'hover:border-[#2B70E4]',
    },
  }[accent];

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left p-4 sm:p-5 rounded-[18px] bg-lovira-card border border-lovira shadow-lovira ${accentStyles.borderHover} hover:bg-lovira-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[120px] sm:min-h-[145px] select-none`}
    >
      {/* Icon Container */}
      <div
        className={`w-[42px] h-[42px] rounded-[12px] ${accentStyles.bg} ${accentStyles.text} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}
      >
        <Icon className="w-[22px] h-[22px]" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="mt-3">
        <h3 className="text-[15px] sm:text-[16px] font-[700] text-lovira-title group-hover:text-[#287C78] dark:group-hover:text-[#42A39E] transition-colors leading-tight">
          {title}
        </h3>
        <p className="text-[12px] sm:text-[13px] text-lovira-muted leading-snug mt-1 line-clamp-2">
          {description}
        </p>
      </div>
    </button>
  );
};
