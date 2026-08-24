import React, { useState } from 'react';
import { BRAND_IMAGES } from '../../config/brandAssets';
import { Heart } from 'lucide-react';

interface BrandLogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  className = '',
  size = 'md',
}) => {
  const src = variant === 'icon' ? BRAND_IMAGES.logoIcon : BRAND_IMAGES.logo;
  const [hasError, setHasError] = useState(false);

  const getHeightClass = () => {
    if (variant === 'icon') {
      if (size === 'sm') return 'h-[28px] w-[28px]';
      if (size === 'lg') return 'h-[44px] w-[44px]';
      return 'h-[36px] w-[36px]';
    }
    if (size === 'sm') return 'h-[28px]';
    if (size === 'lg') return 'h-[42px]';
    return 'h-[34px]';
  };

  if (hasError) {
    if (variant === 'icon') {
      return (
        <div className={`rounded-xl bg-[#287C78] text-white flex items-center justify-center shadow-xs font-bold text-sm select-none ${getHeightClass()} ${className}`}>
          <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-1.5 font-black tracking-tight text-[#1C2226] dark:text-white select-none ${className}`}>
        <div className="w-7 h-7 rounded-lg bg-[#287C78] text-white flex items-center justify-center shadow-2xs">
          <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
        </div>
        <span className="text-[18px] font-extrabold tracking-tight text-[#287C78] dark:text-[#42A39E]">
          L<span className="text-rose-500">♥</span>vira
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="Lovira"
      decoding="async"
      onError={() => setHasError(true)}
      className={`${getHeightClass()} w-auto max-w-[160px] object-contain select-none transition-transform ${className}`}
    />
  );
};

export default BrandLogo;
