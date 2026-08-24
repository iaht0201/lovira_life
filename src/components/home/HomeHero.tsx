import React from 'react';
import { APP_IMAGES } from '../../assets/images';

interface HomeHeroProps {
  userName?: string;
  userRole?: string;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  userName,
}) => {
  const displayName = userName && userName.trim() ? userName.trim() : 'bạn';

  return (
    <section className="relative rounded-[20px] sm:rounded-[28px] overflow-hidden border border-[#287C78]/30 shadow-lovira min-h-[140px] sm:min-h-[180px] md:min-h-[210px] flex items-center bg-[#184441] transition-all">
      {/* Background Banner Image */}
      <img
        src={APP_IMAGES.banner}
        alt="Lovira Banner"
        className="absolute inset-0 w-full h-full object-cover object-right sm:object-center select-none pointer-events-none"
      />

      {/* Soft gradient overlay on the left to maximize text contrast & legibility for seniors */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F2F2D]/90 via-[#143B39]/70 to-transparent sm:from-[#0F2F2D]/85 sm:via-[#143B39]/40 sm:to-transparent pointer-events-none" />

      {/* Greeting Text Content */}
      <div className="relative z-10 max-w-[72%] sm:max-w-[62%] md:max-w-[58%] p-4 sm:p-6 md:p-8 space-y-1.5 sm:space-y-2">
        <h1 className="text-[20px] sm:text-[30px] md:text-[36px] font-[900] text-white tracking-tight leading-[1.2] drop-shadow-md">
          Chào {displayName}! <span className="inline-block animate-wave">👋</span>
        </h1>
        <p className="text-[12px] sm:text-[15px] md:text-[17px] text-[#E2F2F0] font-[500] leading-[1.5] drop-shadow-sm">
          Con là Lovira – trợ lý đồng hành cùng {displayName === 'bạn' ? 'bạn' : displayName} trong cuộc sống hằng ngày.
        </p>
      </div>
    </section>
  );
};

