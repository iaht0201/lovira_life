import React, { useEffect, useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { sfx } from '../../utils/sfx';
import { BrandLogo } from './BrandLogo';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 1800,
}) => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Play subtle startup chime
    sfx.playNotification();

    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, durationMs - 400);

    const finishTimer = setTimeout(() => {
      if (onFinish) onFinish();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#101717] text-white transition-opacity duration-400 select-none ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Subtle Glows */}
      <div className="absolute w-[300px] h-[300px] bg-[#287C78]/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[200px] h-[200px] bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Center Branding Content */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-5 px-6 animate-in zoom-in-95 duration-500">
        {/* Animated Icon with standard Logo */}
        <div className="relative">
          <div className="w-[96px] h-[96px] sm:w-[110px] sm:h-[110px] rounded-3xl p-1.5 bg-gradient-to-tr from-[#287C78] to-[#42A39E] shadow-2xl flex items-center justify-center">
            <div className="w-full h-full rounded-[22px] overflow-hidden bg-white dark:bg-[#162222] p-2 flex items-center justify-center">
              <BrandLogo variant="icon" size="lg" className="scale-125" />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#162222]"></span>
          </span>
        </div>

        {/* Subtitle */}
        <div className="space-y-1.5 flex flex-col items-center">
          <h1 className="text-2xl sm:text-3xl font-[900] tracking-tight bg-gradient-to-r from-teal-200 via-white to-emerald-200 bg-clip-text text-transparent">
            Lovira Life
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-teal-200/85 max-w-xs">
            Trợ lý cuộc sống người cao tuổi
          </p>
        </div>

        {/* Progress Bar / Indicator */}
        <div className="w-48 sm:w-56 space-y-2 pt-2">
          <div className="h-1.5 w-full bg-[#162222] rounded-full overflow-hidden border border-teal-800/40">
            <div className="h-full bg-gradient-to-r from-[#287C78] to-[#E76F91] rounded-full animate-[progress_1.6s_ease-in-out_infinite]" />
          </div>
          <p className="text-[11px] text-teal-300/60 font-medium tracking-wide">
            Đang sẵn sàng đồng hành...
          </p>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="absolute bottom-6 text-center text-[11px] text-teal-300/40 font-medium">
        Được thiết kế ấm áp & dễ dùng cho gia đình
      </div>
    </div>
  );
};
