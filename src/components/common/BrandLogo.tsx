import React, { useState } from 'react';
import { BRAND_IMAGES } from '../../config/brandAssets';

interface BrandLogoProps {
  variant?: 'full' | 'icon' | 'client';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  className = '',
  size = 'md',
  src,
}) => {
  const [imageError, setImageError] = useState(false);

  const getDimensions = () => {
    if (variant === 'icon') {
      if (size === 'sm') return { box: 'w-8 h-8', heart: 'w-4 h-4', height: 'h-8' };
      if (size === 'lg') return { box: 'w-12 h-12', heart: 'w-6 h-6', height: 'h-12' };
      return { box: 'w-10 h-10', heart: 'w-5 h-5', height: 'h-10' };
    }
    if (size === 'sm') return { text: 'text-lg', badge: 'w-7 h-7', heart: 'w-3.5 h-3.5', height: 'h-8 sm:h-9 max-h-[36px]' };
    if (size === 'lg') return { text: 'text-2xl', badge: 'w-10 h-10', heart: 'w-5 h-5', height: 'h-11 sm:h-12 max-h-[48px]' };
    return { text: 'text-xl', badge: 'w-8 h-8', heart: 'w-4 h-4', height: 'h-9 sm:h-10 max-h-[40px]' };
  };

  const dims = getDimensions();

  // Determine target image source based on variant
  const targetSrc =
    src ||
    (variant === 'icon'
      ? BRAND_IMAGES.logoIcon
      : variant === 'client'
      ? BRAND_IMAGES.logoClient
      : BRAND_IMAGES.logoFull || BRAND_IMAGES.logo);

  // If custom uploaded image is available and hasn't errored, render it
  if (targetSrc && !imageError) {
    return (
      <img
        src={targetSrc}
        alt="Lovira"
        onError={() => setImageError(true)}
        className={`${dims.height} w-auto object-contain select-none transition-transform ${className}`}
      />
    );
  }

  // Graceful Vector Fallback when user hasn't uploaded logo image yet
  if (variant === 'icon') {
    return (
      <div
        className={`relative ${dims.box} rounded-[11px] sm:rounded-[13px] bg-gradient-to-br from-[#349C96] to-[#1A625E] flex items-center justify-center shadow-xs text-white select-none shrink-0 transition-transform ${className}`}
        aria-label="Lovira Logo Icon"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={dims.heart}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="url(#icon-heart-grad)"
          />
          <defs>
            <linearGradient id="icon-heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF758F" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#5EEAD4] shadow-xs" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 select-none shrink-0 font-black tracking-tight ${className}`}
      aria-label="Lovira Logo"
    >
      <div className={`relative ${dims.badge} rounded-[9px] sm:rounded-[10px] bg-gradient-to-br from-[#349C96] to-[#1A625E] flex items-center justify-center shadow-xs text-white shrink-0`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={dims.heart}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="url(#brand-heart-grad)"
          />
          <defs>
            <linearGradient id="brand-heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF758F" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[#5EEAD4]" />
      </div>

      <span className={`${dims.text} font-black tracking-tight text-[#165653] dark:text-[#E4F0EF] leading-none`}>
        L<span className="text-[#F43F5E]">o</span>vira
      </span>
    </div>
  );
};

export default BrandLogo;
