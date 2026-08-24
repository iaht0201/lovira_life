import React from 'react';
import { BRAND_IMAGES } from '../../config/brandAssets';

interface HomeHeroProps {
  userName?: string;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  userName,
}) => {
  const displayName = userName && userName.trim() ? userName.trim() : 'bạn';

  return (
    <section className="relative rounded-[20px] sm:rounded-[28px] overflow-hidden border border-[#287C78]/30 shadow-lovira min-h-[140px] sm:min-h-[180px] md:min-h-[210px] flex items-center bg-gradient-to-r from-[#113835] via-[#1A4F4C] to-[#287C78] transition-all">
      {/* Background Banner Image */}
      <img
        src={BRAND_IMAGES.banner}
        alt="Lovira Banner"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover object-right sm:object-center select-none pointer-events-none transition-opacity duration-300"
      />

      {/* Soft gradient overlay on the left to maximize text contrast & legibility for seniors */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F2F2D]/90 via-[#143B39]/70 to-transparent sm:from-[#0F2F2D]/85 sm:via-[#143B39]/40 sm:to-transparent pointer-events-none" />

      {/* Hero Welcome Text */}
      <div className="relative z-10 p-5 sm:p-7 md:p-8 max-w-xl text-white space-y-1.5 sm:space-y-2">
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
