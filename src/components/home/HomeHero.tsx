import React from 'react';
import { Sparkles } from 'lucide-react';

interface HomeHeroProps {
  userName?: string;
  userRole?: string;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  userName,
}) => {
  const displayName = userName && userName.trim() ? userName.trim() : 'bạn';

  return (
    <section className="relative rounded-[28px] border border-lovira-purple bg-lovira-hero shadow-lovira overflow-hidden p-6 md:p-10 flex flex-col items-center sm:items-start text-center sm:text-left transition-colors">
      {/* Background Decorative Sparkles / Bubbles */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#FF5CA8]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-64 h-64 bg-[#7C4DFF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative z-10 max-w-[560px] space-y-3 my-auto w-full">
        {/* Title uses text-lovira-title for dynamic contrast */}
        <h1 className="text-[28px] sm:text-[36px] md:text-[40px] font-[900] text-lovira-title tracking-tight leading-[1.15]">
          Chào {displayName}! 👋
        </h1>

        {/* Description uses text-lovira-muted */}
        <p className="text-[15px] sm:text-[16px] text-lovira-muted leading-[1.65] font-[500] max-w-[520px]">
          Con là Lovira – trợ lý đồng hành cùng {displayName === 'bạn' ? 'bạn' : displayName} trong cuộc sống hằng ngày.
        </p>
      </div>

      {/* Decorative Icon Badge Positioned Right on Desktop */}
      <div className="hidden sm:flex absolute right-6 md:right-10 top-1/2 -translate-y-1/2 pointer-events-none select-none z-10 items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 text-primary">
        <Sparkles className="w-10 h-10" />
      </div>
    </section>
  );
};
