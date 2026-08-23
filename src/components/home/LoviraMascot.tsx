import React from 'react';

interface LoviraMascotProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoviraMascot: React.FC<LoviraMascotProps> = ({
  className = '',
  size = 'md',
}) => {
  // Dimension presets
  const dimensions = {
    sm: 'w-32 h-32 md:w-40 md:h-40',
    md: 'w-48 h-48 md:w-64 md:h-64',
    lg: 'w-64 h-64 md:w-80 md:h-80',
  }[size];

  return (
    <div className={`relative flex items-center justify-center select-none ${dimensions} ${className}`}>
      {/* Background soft glow aura */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#7C4DFF]/20 via-[#FF5CA8]/15 to-transparent rounded-full blur-2xl transform scale-90 -z-10" />

      {/* Lovira Mascot SVG Vector Illustration */}
      <svg
        viewBox="0 0 320 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xl"
        aria-label="Lovira Mascot - Trợ lý tím vẫy tay thân thiện"
      >
        {/* Shadow under mascot */}
        <ellipse cx="160" cy="295" rx="90" ry="12" fill="#7C4DFF" fillOpacity="0.12" />

        {/* Body / Sweater (Purple sweatshirt with 'Lovira' text) */}
        <path
          d="M95 240 C95 210, 115 195, 160 195 C205 195, 225 210, 225 240 L235 300 L85 300 Z"
          fill="url(#sweaterGrad)"
        />

        {/* Sweater Collar */}
        <path
          d="M130 198 C145 210, 175 210, 190 198 C180 216, 140 216, 130 198 Z"
          fill="#6D3CF0"
        />

        {/* 'Lovira' Text on Shirt */}
        <text
          x="160"
          y="252"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="20"
          fill="#FFFFFF"
          textAnchor="middle"
          letterSpacing="0.5"
        >
          Lovira
        </text>

        {/* Left Arm resting */}
        <path
          d="M95 215 C80 230, 75 255, 88 275 C95 285, 105 270, 102 255 Z"
          fill="#7C4DFF"
        />

        {/* Right Arm Waving (Upwards) */}
        <g className="animate-bounce-subtle origin-bottom-left">
          {/* Sleeve */}
          <path
            d="M225 210 C245 190, 255 165, 250 145 C240 140, 225 160, 215 185 Z"
            fill="#7C4DFF"
          />
          {/* Waving Hand */}
          <circle cx="258" cy="138" r="16" fill="#FFDFC4" />
          {/* Fingers */}
          <circle cx="250" cy="126" r="6" fill="#FFDFC4" />
          <circle cx="260" cy="123" r="6" fill="#FFDFC4" />
          <circle cx="269" cy="126" r="5.5" fill="#FFDFC4" />
          <circle cx="275" cy="134" r="5" fill="#FFDFC4" />
          {/* Wave sparkles */}
          <path d="M282 110 L286 118 L294 122 L286 126 L282 134 L278 126 L270 122 L278 118 Z" fill="#FF5CA8" />
        </g>

        {/* Head Base */}
        <circle cx="160" cy="142" r="52" fill="#FFDFC4" />

        {/* Purple Hair (Back Layer & Side Tufts) */}
        <path
          d="M96 150 C80 110, 90 60, 160 55 C230 60, 240 110, 224 150 C238 180, 220 200, 210 185 C200 170, 205 130, 205 130 C205 130, 115 130, 115 130 C115 130, 120 170, 110 185 C100 200, 82 180, 96 150 Z"
          fill="url(#hairGrad)"
        />

        {/* Front Hair Bangs */}
        <path
          d="M105 110 C120 85, 155 85, 165 112 C175 85, 205 85, 215 110 C205 95, 180 92, 160 102 C140 92, 115 95, 105 110 Z"
          fill="#7C4DFF"
        />

        {/* Cute Ears */}
        <circle cx="107" cy="145" r="9" fill="#FFCBB3" />
        <circle cx="213" cy="145" r="9" fill="#FFCBB3" />

        {/* Big Friendly Eyes */}
        {/* Left Eye */}
        <g>
          <ellipse cx="140" cy="138" rx="10" ry="13" fill="#17151F" />
          <ellipse cx="143" cy="134" rx="4" ry="5" fill="#FFFFFF" />
          <circle cx="137" cy="142" r="2" fill="#FFFFFF" />
          {/* Eyebrow */}
          <path d="M128 118 Q140 112 150 118" stroke="#5B2ECA" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </g>

        {/* Right Eye */}
        <g>
          <ellipse cx="180" cy="138" rx="10" ry="13" fill="#17151F" />
          <ellipse cx="183" cy="134" rx="4" ry="5" fill="#FFFFFF" />
          <circle cx="177" cy="142" r="2" fill="#FFFFFF" />
          {/* Eyebrow */}
          <path d="M170 118 Q180 112 192 118" stroke="#5B2ECA" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </g>

        {/* Rosy Cheeks */}
        <ellipse cx="126" cy="152" rx="9" ry="5" fill="#FF5CA8" fillOpacity="0.35" />
        <ellipse cx="194" cy="152" rx="9" ry="5" fill="#FF5CA8" fillOpacity="0.35" />

        {/* Cute Smile */}
        <path
          d="M148 158 Q160 172 172 158"
          stroke="#B4336B"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Tongue inside smile */}
        <path
          d="M153 164 Q160 172 167 164 Z"
          fill="#FF5CA8"
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="hairGrad" x1="160" y1="55" x2="160" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A45CFF" />
            <stop offset="100%" stopColor="#6D3CF0" />
          </linearGradient>
          <linearGradient id="sweaterGrad" x1="160" y1="195" x2="160" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7C4DFF" />
            <stop offset="100%" stopColor="#5B2ECA" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
