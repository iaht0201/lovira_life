import React from 'react';
import { WifiOff } from 'lucide-react';

interface HomeOfflineBannerProps {
  isOffline: boolean;
}

export const HomeOfflineBanner: React.FC<HomeOfflineBannerProps> = ({ isOffline }) => {
  if (!isOffline) return null;

  return (
    <div className="mb-4 p-3.5 rounded-[16px] bg-[#FFF7E8] border border-[#FFE0B2] text-[#9A6500] flex items-center gap-3 text-[13px] font-[600] shadow-xs">
      <WifiOff className="w-[18px] h-[18px] shrink-0 text-[#D97706]" />
      <div className="flex-1 min-w-0">
        <span className="font-[800] mr-1.5">📶 Đang ngoại tuyến:</span>
        <span>Lovira vẫn có thể mở các phiên và dữ liệu đã lưu.</span>
      </div>
    </div>
  );
};
