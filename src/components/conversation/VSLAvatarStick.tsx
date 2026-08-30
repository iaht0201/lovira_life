import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ZoomIn, Hand, Play, FastForward } from 'lucide-react';
import { VSL_GESTURE_BANK, VSLSentenceTranslator, VSLPose } from '../../services/vslMotionService';

interface VSLAvatarStickProps {
  currentText?: string;
  isAnimating?: boolean;
  width?: number | string;
  height?: number | string;
  speedMultiplier?: number;
}

export const VSLAvatarStick: React.FC<VSLAvatarStickProps> = ({
  currentText = '',
  isAnimating = true,
  width = '100%',
  height = '100%',
  speedMultiplier = 1.0,
}) => {
  const [poseStep, setPoseStep] = useState(0);
  const [showHandZoom, setShowHandZoom] = useState(false);
  const [activeGlossIndex, setActiveGlossIndex] = useState(0);

  const glosses = VSLSentenceTranslator.parseTextToSignGlosses(currentText);

  // Auto cycle through each gesture in the sentence
  useEffect(() => {
    setActiveGlossIndex(0);
    if (!glosses || glosses.length <= 1) return;

    const intervalDuration = Math.max(800, Math.floor(1800 / speedMultiplier));
    const timer = setInterval(() => {
      setActiveGlossIndex((prev) => (prev + 1) % glosses.length);
    }, intervalDuration);

    return () => clearInterval(timer);
  }, [currentText, speedMultiplier, glosses.length]);

  // Smooth animation ticker (60FPS / 30ms)
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setPoseStep((prev) => (prev + 1) % 100);
    }, 30);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const t = (poseStep / 100) * Math.PI * 2;
  const wave = Math.sin(t * 3 * speedMultiplier);
  const nod = Math.sin(t * 2 * speedMultiplier);

  // Get current active gloss
  const currentGloss = glosses[activeGlossIndex] || glosses[0] || { key: 'neutral', word: 'Sẵn sàng' };
  const gestureFn = VSL_GESTURE_BANK[currentGloss.key] || VSL_GESTURE_BANK.neutral;
  const pose: VSLPose = gestureFn(t, wave, nod);

  // Primary Lovira Green / Teal Palette Synchronized
  const C_MAIN = '#287C78'; // #3b82f6 -> #287C78 (Bones, outlines)
  const C_JOINT = '#42A39E'; // #60a5fa -> #42A39E (Joint circles)
  const C_FILL = '#A8DDD9'; // #93c5fd -> #A8DDD9 (Head & palm fills)

  return (
    <div className="relative flex flex-col items-center justify-center w-full select-none">
      {/* SVG Stickman Canvas (Exact User Dimensions 440 x 460) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 440 460"
        className="w-full h-full max-h-[255px]"
        style={{ width, height }}
      >
        {/* Đầu (Head) */}
        <circle
          cx="220"
          cy={88 + pose.headNod}
          r="34"
          fill={C_FILL}
          stroke={C_MAIN}
          strokeWidth="3.5"
        />

        {/* Cổ (Neck) */}
        <line
          x1="220"
          y1={122 + pose.headNod}
          x2="220"
          y2="148"
          stroke={C_MAIN}
          strokeWidth="6.5"
          strokeLinecap="round"
        />

        {/* Thân (Torso / Spine) */}
        <line
          x1="220"
          y1="148"
          x2="220"
          y2="290"
          stroke={C_MAIN}
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Vai (Shoulders) */}
        <line
          x1="158"
          y1="162"
          x2="282"
          y2="162"
          stroke={C_MAIN}
          strokeWidth="7.5"
          strokeLinecap="round"
        />

        {/* Tay trái (Left Arm) */}
        <line
          x1="158"
          y1="162"
          x2={pose.leftElbow.x}
          y2={pose.leftElbow.y}
          stroke={C_MAIN}
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <line
          x1={pose.leftElbow.x}
          y1={pose.leftElbow.y}
          x2={pose.leftWrist.x}
          y2={pose.leftWrist.y}
          stroke={C_MAIN}
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <circle cx={pose.leftElbow.x} cy={pose.leftElbow.y} r="6" fill={C_JOINT} />

        {/* Bàn tay trái (5 ngón + khớp) */}
        <g
          id="left_hand"
          transform={`translate(${pose.leftWrist.x}, ${pose.leftWrist.y}) rotate(${pose.leftHandRot})`}
        >
          <ellipse cx="0" cy="8" rx="13" ry="11" fill={C_FILL} stroke={C_MAIN} strokeWidth="2.2" />

          {/* Ngón cái */}
          <line
            x1="-10"
            y1="2"
            x2="-18"
            y2="-6"
            stroke={C_MAIN}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <line
            x1="-18"
            y1="-6"
            x2="-24"
            y2="-12"
            stroke={C_MAIN}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle cx="-18" cy="-6" r="2.8" fill={C_JOINT} />

          {/* Ngón trỏ */}
          <line
            x1="-5"
            y1="-2"
            x2="-8"
            y2="-22"
            stroke={C_MAIN}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <line
            x1="-8"
            y1="-22"
            x2="-10"
            y2="-36"
            stroke={C_MAIN}
            strokeWidth="3.3"
            strokeLinecap="round"
          />
          <line
            x1="-10"
            y1="-36"
            x2="-11"
            y2="-46"
            stroke={C_MAIN}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="-8" cy="-22" r="2.6" fill={C_JOINT} />
          <circle cx="-10" cy="-36" r="2.4" fill={C_JOINT} />

          {/* Ngón giữa */}
          <line
            x1="2"
            y1="-3"
            x2="1"
            y2="-24"
            stroke={C_MAIN}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <line
            x1="1"
            y1="-24"
            x2="0"
            y2="-40"
            stroke={C_MAIN}
            strokeWidth="3.3"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="-40"
            x2="-1"
            y2="-52"
            stroke={C_MAIN}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="1" cy="-24" r="2.6" fill={C_JOINT} />
          <circle cx="0" cy="-40" r="2.4" fill={C_JOINT} />

          {/* Ngón áp út */}
          <line
            x1="9"
            y1="-1"
            x2="11"
            y2="-20"
            stroke={C_MAIN}
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <line
            x1="11"
            y1="-20"
            x2="13"
            y2="-34"
            stroke={C_MAIN}
            strokeWidth="3.1"
            strokeLinecap="round"
          />
          <line
            x1="13"
            y1="-34"
            x2="14"
            y2="-44"
            stroke={C_MAIN}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="11" cy="-20" r="2.5" fill={C_JOINT} />
          <circle cx="13" cy="-34" r="2.3" fill={C_JOINT} />

          {/* Ngón út */}
          <line
            x1="15"
            y1="3"
            x2="19"
            y2="-12"
            stroke={C_MAIN}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <line
            x1="19"
            y1="-12"
            x2="22"
            y2="-24"
            stroke={C_MAIN}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <line
            x1="22"
            y1="-24"
            x2="24"
            y2="-32"
            stroke={C_MAIN}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="19" cy="-12" r="2.3" fill={C_JOINT} />
          <circle cx="22" cy="-24" r="2.1" fill={C_JOINT} />
        </g>

        {/* Tay phải (Right Arm) */}
        <line
          x1="282"
          y1="162"
          x2={pose.rightElbow.x}
          y2={pose.rightElbow.y}
          stroke={C_MAIN}
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <line
          x1={pose.rightElbow.x}
          y1={pose.rightElbow.y}
          x2={pose.rightWrist.x}
          y2={pose.rightWrist.y}
          stroke={C_MAIN}
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <circle cx={pose.rightElbow.x} cy={pose.rightElbow.y} r="6" fill={C_JOINT} />

        {/* Bàn tay phải (5 ngón + khớp) */}
        <g
          id="right_hand"
          transform={`translate(${pose.rightWrist.x}, ${pose.rightWrist.y}) rotate(${pose.rightHandRot})`}
        >
          <ellipse cx="0" cy="8" rx="13" ry="11" fill={C_FILL} stroke={C_MAIN} strokeWidth="2.2" />

          {/* Ngón cái */}
          <line
            x1="10"
            y1="2"
            x2="18"
            y2="-6"
            stroke={C_MAIN}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <line
            x1="18"
            y1="-6"
            x2="24"
            y2="-12"
            stroke={C_MAIN}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle cx="18" cy="-6" r="2.8" fill={C_JOINT} />

          {/* Ngón trỏ */}
          <line
            x1="5"
            y1="-2"
            x2="8"
            y2="-22"
            stroke={C_MAIN}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <line
            x1="8"
            y1="-22"
            x2="10"
            y2="-36"
            stroke={C_MAIN}
            strokeWidth="3.3"
            strokeLinecap="round"
          />
          <line
            x1="10"
            y1="-36"
            x2="11"
            y2="-46"
            stroke={C_MAIN}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="8" cy="-22" r="2.6" fill={C_JOINT} />
          <circle cx="10" cy="-36" r="2.4" fill={C_JOINT} />

          {/* Ngón giữa */}
          <line
            x1="-2"
            y1="-3"
            x2="-1"
            y2="-24"
            stroke={C_MAIN}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <line
            x1="-1"
            y1="-24"
            x2="0"
            y2="-40"
            stroke={C_MAIN}
            strokeWidth="3.3"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="-40"
            x2="1"
            y2="-52"
            stroke={C_MAIN}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="-1" cy="-24" r="2.6" fill={C_JOINT} />
          <circle cx="0" cy="-40" r="2.4" fill={C_JOINT} />

          {/* Ngón áp út */}
          <line
            x1="-9"
            y1="-1"
            x2="-11"
            y2="-20"
            stroke={C_MAIN}
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <line
            x1="-11"
            y1="-20"
            x2="-13"
            y2="-34"
            stroke={C_MAIN}
            strokeWidth="3.1"
            strokeLinecap="round"
          />
          <line
            x1="-13"
            y1="-34"
            x2="-14"
            y2="-44"
            stroke={C_MAIN}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="-11" cy="-20" r="2.5" fill={C_JOINT} />
          <circle cx="-13" cy="-34" r="2.3" fill={C_JOINT} />

          {/* Ngón út */}
          <line
            x1="-15"
            y1="3"
            x2="-19"
            y2="-12"
            stroke={C_MAIN}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <line
            x1="-19"
            y1="-12"
            x2="-22"
            y2="-24"
            stroke={C_MAIN}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <line
            x1="-22"
            y1="-24"
            x2="-24"
            y2="-32"
            stroke={C_MAIN}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="-19" cy="-12" r="2.3" fill={C_JOINT} />
          <circle cx="-22" cy="-24" r="2.1" fill={C_JOINT} />
        </g>
      </svg>

      {/* Real-time Gloss Flow Chips */}
      <div className="w-full flex items-center justify-between px-1 mt-1 text-[11px] font-[600]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="px-2 py-0.5 rounded-full bg-[#287C78] text-white text-[10px] font-bold shrink-0 flex items-center gap-1 shadow-xs animate-pulse">
            <Play className="w-2.5 h-2.5 fill-white" />
            <span>{currentGloss.word}</span>
          </span>
          {glosses.length > 1 && (
            <span className="text-[10px] text-lovira-muted truncate">
              ({activeGlossIndex + 1}/{glosses.length})
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowHandZoom(!showHandZoom)}
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-lovira-input border border-lovira text-lovira-title hover:border-[#287C78] cursor-pointer transition-colors shrink-0"
        >
          <Hand className="w-3 h-3 text-[#287C78]" />
          <span>{showHandZoom ? 'Đóng' : 'Soi 5 ngón'}</span>
        </button>
      </div>

      {/* Hand Zoom Modal */}
      {showHandZoom && (
        <div className="absolute top-2 left-2 p-2.5 rounded-xl bg-white/95 dark:bg-black/90 backdrop-blur-md border-2 border-[#287C78] shadow-xl z-20 animate-in zoom-in-95">
          <div className="text-[10px] font-bold text-[#287C78] dark:text-[#42A39E] flex items-center gap-1 mb-1">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Chi tiết 5 ngón tay</span>
          </div>
          <div className="w-24 h-24 overflow-hidden rounded-lg bg-[#A8DDD9]/20 flex items-center justify-center">
            <svg viewBox="-30 -60 60 75" className="w-full h-full">
              <use href="#right_hand" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
