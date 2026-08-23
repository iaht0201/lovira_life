import React, { useEffect, useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { sfx } from '../../utils/sfx';

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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#171326] text-white transition-opacity duration-400 select-none ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Subtle Glows */}
      <div className="absolute w-[300px] h-[300px] bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[200px] h-[200px] bg-pink-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Center Branding Content */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-5 px-6 animate-in zoom-in-95 duration-500">
        {/* Animated Icon */}
        <div className="relative">
          <div className="w-[84px] h-[84px] sm:w-[96px] sm:h-[96px] rounded-[28px] bg-gradient-to-tr from-[#7C4DFF] to-[#A45CFF] p-0.5 shadow-2xl flex items-center justify-center">
            <div className="w-full h-full rounded-[26px] bg-[#1F1733] flex items-center justify-center relative overflow-hidden">
              <Sparkles className="w-6 h-6 text-purple-400 absolute top-2 right-2 animate-bounce" />
              <Heart className="w-11 h-11 sm:w-12 sm:h-12 text-[#FF5CA8] fill-[#FF5CA8] animate-pulse" />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#1F1733]"></span>
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-[900] tracking-tight bg-gradient-to-r from-purple-200 via-white to-pink-200 bg-clip-text text-transparent">
              Lovira
            </h1>
            <span className="text-2xl sm:text-3xl text-[#FF5CA8] font-black">♥</span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-purple-200/80 max-w-xs">
            Trợ lý cuộc sống người cao tuổi
          </p>
        </div>

        {/* Progress Bar / Indicator */}
        <div className="w-48 sm:w-56 space-y-2 pt-2">
          <div className="h-1.5 w-full bg-purple-950 rounded-full overflow-hidden border border-purple-800/40">
            <div className="h-full bg-gradient-to-r from-[#7C4DFF] to-[#FF5CA8] rounded-full animate-[progress_1.6s_ease-in-out_infinite]" />
          </div>
          <p className="text-[11px] text-purple-300/60 font-medium tracking-wide">
            Đang sẵn sàng đồng hành...
          </p>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="absolute bottom-6 text-center text-[11px] text-purple-300/40 font-medium">
        Được thiết kế ấm áp & dễ dùng cho gia đình
      </div>
    </div>
  );
};
