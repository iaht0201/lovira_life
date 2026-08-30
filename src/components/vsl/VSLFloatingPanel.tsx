import React, { useState } from 'react';
import {
  X,
  Minimize2,
  Maximize2,
  Columns,
  LayoutGrid,
  Volume2,
  HandMetal,
} from 'lucide-react';
import { VSLAvatarStick } from '../conversation/VSLAvatarStick';

interface VSLFloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  latestText?: string;
  isSpeaking?: boolean;
}

export const VSLFloatingPanel: React.FC<VSLFloatingPanelProps> = ({
  isOpen,
  onClose,
  latestText = 'Lovira đồng hành cùng bạn trong các hoạt động đời sống.',
  isSpeaking = false,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setMode] = useState<'pip' | 'dock'>('pip');
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 border-2 border-[#287C78] bg-white/95 dark:bg-[#182222]/95 backdrop-blur-md text-lovira-title rounded-[22px] shadow-2xl ${
        mode === 'dock'
          ? 'top-20 right-3 sm:right-5 w-72 sm:w-80 max-h-[calc(100vh-100px)] p-3.5 flex flex-col'
          : `bottom-20 sm:bottom-24 right-3 sm:right-5 w-64 sm:w-72 ${
              isMinimized ? 'h-13 overflow-hidden p-2.5' : 'p-3.5'
            }`
      }`}
      role="region"
      aria-label="Khung Trợ năng Ngôn ngữ Ký hiệu VSL"
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-lovira-subtle mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#287C78] to-[#42A39E] text-white flex items-center justify-center shrink-0 shadow-xs">
            <HandMetal className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="text-[12px] font-[800] text-lovira-title block truncate leading-tight">
              Ký hiệu VSL
            </span>
            <span className="text-[9px] font-[600] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              {isSpeaking ? 'Đang diễn giải...' : 'Đồng bộ giọng'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Speed switcher */}
          <button
            type="button"
            onClick={() =>
              setSpeed(speed === 'slow' ? 'normal' : speed === 'normal' ? 'fast' : 'slow')
            }
            className="px-1.5 py-0.5 rounded text-[10px] font-bold text-[#287C78] dark:text-[#42A39E] bg-[#287C78]/10 hover:bg-[#287C78]/20 cursor-pointer"
            title="Đổi tốc độ diễn giải"
          >
            {speed === 'slow' ? '0.75x' : speed === 'fast' ? '1.3x' : '1.0x'}
          </button>

          {/* Mode switch: PiP vs Dock */}
          <button
            type="button"
            onClick={() => setMode(mode === 'pip' ? 'dock' : 'pip')}
            className={`p-1 rounded text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover transition-colors cursor-pointer ${
              mode === 'dock' ? 'bg-[#287C78]/15 text-[#287C78] dark:text-[#42A39E] font-bold' : ''
            }`}
            title={mode === 'pip' ? 'Ghim cố định (Dock)' : 'Thu nhỏ nổi (PiP)'}
            aria-label="Đổi Chế độ hiển thị VSL"
          >
            {mode === 'pip' ? <Columns className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize toggle */}
          {mode === 'pip' && (
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover transition-colors cursor-pointer"
              aria-label={isMinimized ? 'Mở rộng khung VSL' : 'Thu nhỏ khung VSL'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-lovira-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            aria-label="Đóng khung VSL"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="space-y-2.5 flex-1 overflow-y-auto">
          {/* 1. Animated Stickman VSL Avatar Container */}
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-[#287C78]/10 via-[#287C78]/5 to-transparent border border-[#287C78]/25 p-1.5 flex flex-col items-center justify-center shadow-inner">
            <VSLAvatarStick
              currentText={latestText}
              isAnimating={true}
              width="100%"
              height={205}
              speedMultiplier={speed === 'slow' ? 0.75 : speed === 'fast' ? 1.35 : 1.0}
            />
          </div>

          {/* 2. Compact Live Subtitle Feedback Panel */}
          <div className="p-2.5 rounded-xl bg-lovira-input border border-lovira text-[11px] leading-relaxed text-lovira-title font-[600] space-y-0.5">
            <span className="text-[9px] font-[800] text-[#287C78] dark:text-[#42A39E] uppercase tracking-wider flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              <span>Phụ đề phản hồi VSL:</span>
            </span>
            <p className="line-clamp-3 font-[700] text-lovira-title text-[11.5px]">
              "{latestText}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
