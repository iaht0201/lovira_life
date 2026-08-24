import React from 'react';

interface DailyProgressProps {
  completedTasks?: number;
  totalTasks?: number;
}

export const DailyProgress: React.FC<DailyProgressProps> = ({
  completedTasks = 3,
  totalTasks = 7,
}) => {
  const percentage = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="bg-lovira-card border border-lovira rounded-[22px] p-5 shadow-lovira flex items-center gap-4 transition-colors">
      {/* Circular Progress SVG */}
      <div className="relative w-[64px] h-[64px] shrink-0 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-[#E4E2DC] dark:text-[#273836]"
            strokeWidth="3.5"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="text-lovira-purple transition-all duration-500 stroke-linecap-round"
            strokeDasharray={`${percentage}, 100`}
            strokeWidth="3.5"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <span className="absolute text-[13px] font-[800] text-lovira-title">
          {completedTasks}/{totalTasks}
        </span>
      </div>

      {/* Label */}
      <div>
        <h4 className="text-[14px] font-[700] text-lovira-title">Tiến độ hôm nay</h4>
        <p className="text-[12px] font-[600] text-lovira-muted mt-0.5">
          {completedTasks}/{totalTasks} việc đã hoàn thành
        </p>
        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-[700] bg-lovira-badge-purple text-lovira-purple">
          Đạt {percentage}% mục tiêu
        </span>
      </div>
    </div>
  );
};
