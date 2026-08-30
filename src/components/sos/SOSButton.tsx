import React from 'react';
import { AlertOctagon } from 'lucide-react';

interface SOSButtonProps {
  onClick: () => void;
  variant?: 'compact' | 'full' | 'floating' | 'quick-action';
  className?: string;
}

export const SOSButton: React.FC<SOSButtonProps> = ({
  onClick,
  variant = 'compact',
  className = '',
}) => {
  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Khẩn cấp SOS"
        title="Khẩn cấp SOS: Nhấn để gửi vị trí và kêu cứu"
        className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-xl shadow-rose-600/40 flex items-center justify-center border-2 border-white/40 ring-4 ring-rose-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer ${className}`}
      >
        <div className="relative flex items-center justify-center">
          <AlertOctagon className="w-7 h-7 animate-pulse" />
          <span className="absolute -bottom-2 text-[9px] font-black tracking-widest uppercase bg-black/60 px-1 rounded-sm text-white">
            SOS
          </span>
        </div>
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full p-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-sm shadow-md shadow-rose-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98] ${className}`}
      >
        <AlertOctagon className="w-5 h-5 animate-pulse text-amber-300" />
        <span>KHẨN CẤP SOS & ĐỊNH VỊ</span>
      </button>
    );
  }

  if (variant === 'quick-action') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border-2 border-rose-400/40 dark:border-rose-800 text-left space-y-2 transition-all cursor-pointer active:scale-[0.98] group ${className}`}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-md shadow-rose-600/30 group-hover:scale-110 transition-transform">
          <AlertOctagon className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h4 className="text-sm font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
            <span>SOS Khẩn Cấp</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-600 text-white uppercase font-bold tracking-wider">
              24/7
            </span>
          </h4>
          <p className="text-xs text-lovira-muted mt-0.5 leading-relaxed">
            Gửi tọa độ GPS, còi báo động & gọi người thân cứu hộ
          </p>
        </div>
      </button>
    );
  }

  // Default compact (e.g. for Topbar or nav headers)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Khẩn cấp SOS"
      title="Khẩn cấp SOS"
      className={`px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ring-2 ring-rose-400/40 ${className}`}
    >
      <AlertOctagon className="w-4 h-4 animate-pulse text-amber-200" />
      <span className="tracking-wider uppercase">SOS</span>
    </button>
  );
};
