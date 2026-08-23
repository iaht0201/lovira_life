import React from 'react';
import { Sun } from 'lucide-react';

interface WeatherMiniCardProps {
  location?: string;
  temp?: string;
  condition?: string;
}

export const WeatherMiniCard: React.FC<WeatherMiniCardProps> = ({
  location = 'Hà Nội',
  temp = '28°C',
  condition = 'Trời nắng nhẹ ☀️',
}) => {
  return (
    <div className="bg-lovira-card border border-lovira rounded-[22px] p-5 shadow-lovira flex items-center justify-between transition-colors">
      <div className="space-y-1">
        <p className="text-[12px] font-[600] text-lovira-muted uppercase tracking-wider">{location}</p>
        <p className="text-[22px] font-[900] text-lovira-title leading-none">{temp}</p>
        <p className="text-[12px] font-[500] text-lovira-muted">{condition}</p>
      </div>

      <div className="w-[48px] h-[48px] rounded-[16px] bg-[#FFF3E8] dark:bg-[#3D2518] text-[#FF8C42] flex items-center justify-center shrink-0">
        <Sun className="w-[26px] h-[26px]" />
      </div>
    </div>
  );
};
