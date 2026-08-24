import React, { useState } from 'react';
import { BRAND_IMAGES } from '../../config/brandAssets';
import { Sparkles } from 'lucide-react';

interface HomeHeroProps {
  userName?: string;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  userName,
}) => {
  const displayName = userName && userName.trim() ? userName.trim() : 'bạn';
  const [imageError, setImageError] = useState(false);

  return (
    <section className="relative rounded-[20px] sm:rounded-[28px] overflow-hidden border border-[#287C78]/30 shadow-md min-h-[140px] sm:min-h-[180px] md:min-h-[200px] flex items-center bg-gradient-to-r from-[#0E2F2D] via-[#14423F] to-[#1E5C57] transition-all">
      {/* Background Banner Image */}
      {!imageError && (
        <img
          src={BRAND_IMAGES.banner}
          alt=""
          role="presentation"
          decoding="async"
          onError={() => setImageError(true)}
          className="absolute inset-0 w-full h-full object-cover object-right select-none pointer-events-none opacity-90 transition-opacity duration-300"
        />
      )}

      {/* Soft gradient overlay on the left to maximize text contrast & legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B2423]/95 via-[#0E2F2D]/80 to-transparent sm:via-[#0E2F2D]/60 pointer-events-none" />

      {/* Hero Welcome Text */}
      <div className="relative z-10 p-5 sm:p-7 md:p-8 max-w-xl text-white space-y-1.5 sm:space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-200 text-xs font-semibold backdrop-blur-xs mb-1">
          <Sparkles className="w-3.5 h-3.5 text-teal-300" />
          <span>Trợ lý đồng hành</span>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-xs">
            Chào {displayName}! 👋
          </h1>
        </div>
        <p className="text-xs sm:text-sm md:text-base text-teal-50/95 font-medium leading-relaxed max-w-md drop-shadow-xs">
          Con là Lovira — trợ lý đồng hành cùng bạn trong cuộc sống hằng ngày.
        </p>
      </div>
    </section>
  );
};
