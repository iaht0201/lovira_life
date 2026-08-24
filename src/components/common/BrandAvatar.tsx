import React, { useState } from 'react';
import { APP_IMAGES } from '../../assets/images';
import { Heart } from 'lucide-react';

interface BrandAvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BrandAvatar: React.FC<BrandAvatarProps> = ({
  src = APP_IMAGES.avatar,
  alt = 'Lovira',
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-7 h-7';
      case 'lg':
        return 'w-10 h-10 sm:w-12 sm:h-12';
      case 'xl':
        return 'w-14 h-14 sm:w-16 sm:h-16';
      case 'md':
      default:
        return 'w-8 h-8';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3.5 h-3.5';
      case 'lg':
        return 'w-6 h-6';
      case 'xl':
        return 'w-8 h-8';
      case 'md':
      default:
        return 'w-4 h-4';
    }
  };

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br from-[#349C96] to-[#1A625E] text-white shadow-xs ${getSizeClasses()} ${className}`}
    >
      {!hasError ? (
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <Heart className={`${getIconSize()} fill-rose-400 text-rose-400`} />
      )}
    </div>
  );
};

export default BrandAvatar;
