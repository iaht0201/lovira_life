import React, { useState } from 'react';
import { Sparkles, X, Minimize2, Maximize2, Columns, LayoutGrid, Volume2 } from 'lucide-react';

interface VSLFloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  latestText?: string;
}

export const VSLFloatingPanel: React.FC<VSLFloatingPanelProps> = ({
  isOpen,
  onClose,
  latestText = 'Lovira đồng hành cùng bạn trong các hoạt động đời sống.',
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setMode] = useState<'pip' | 'dock'>('pip');

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-40 transition-all duration-300 border-2 border-[#287C78] rounded-[20px] bg-white dark:bg-[#182222] opacity-100 shadow-lovira-lg ${
        mode === 'dock'
          ? 'top-[80px] right-4 w-72 md:w-96 max-h-[80vh] p-4 flex flex-col'
          : `bottom-20 right-4 w-72 md:w-80 ${isMinimized ? 'h-14 overflow-hidden p-3' : 'p-4'}`
      }`}
      role="region"
      aria-label="Khung Ngôn ngữ Ký hiệu VSL"
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between pb-2.5 border-b border-lovira-subtle mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <span className="text-[12px] font-[800] text-lovira-title">Ký hiệu VSL (Split-Screen)</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Mode switch: PiP vs Dock */}
          <button
            type="button"
            onClick={() => setMode(mode === 'pip' ? 'dock' : 'pip')}
            className={`p-1.5 rounded-md text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover transition-colors cursor-pointer ${
              mode === 'dock' ? 'text-[#287C78] dark:text-[#42A39E] font-bold' : ''
            }`}
            title={mode === 'pip' ? 'Chuyển sang dạng Cố định lề (Dock Split)' : 'Chuyển sang dạng Nổi (Picture-in-Picture)'}
            aria-label="Đổi Chế độ hiển thị VSL"
          >
            {mode === 'pip' ? <Columns className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize toggle */}
          {mode === 'pip' && (
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-md text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover transition-colors cursor-pointer"
              aria-label={isMinimized ? 'Mở rộng khung VSL' : 'Thu nhỏ khung VSL'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-lovira-muted hover:text-rose-500 hover:bg-lovira-card-hover transition-colors cursor-pointer"
            aria-label="Đóng khung VSL"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="space-y-3 flex-1 overflow-y-auto">
          {/* Avatar Placeholder for Sign Language Animation */}
          <div className="w-full h-36 bg-gradient-to-b from-[#287C78]/20 to-lovira-input rounded-[16px] border border-[#287C78]/30 flex flex-col items-center justify-center text-center p-3 space-y-2 relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-[#287C78]/20 border border-[#287C78]/40 text-[#287C78] dark:text-[#42A39E] flex items-center justify-center font-bold text-xl animate-pulse shadow-xs">
              🤟
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] font-[800] text-[#287C78] dark:text-[#42A39E]">
                Mô phỏng Ngôn ngữ Ký hiệu Tiếng Việt
              </p>
              <span className="text-[10px] font-[600] text-lovira-muted block">
                {mode === 'dock' ? 'Đang phát song song với đoạn chat' : 'Xem dạng Picture-in-Picture'}
              </span>
            </div>
          </div>

          {/* Live Subtitle Feedback Panel */}
          <div className="p-3 rounded-[14px] bg-lovira-input border border-lovira text-[12px] leading-relaxed text-lovira-title font-[600] space-y-1">
            <span className="text-[10px] font-[700] text-[#287C78] dark:text-[#42A39E] uppercase tracking-wider flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              <span>Phụ đề phản hồi VSL:</span>
            </span>
            <p className="line-clamp-3 italic text-lovira-title">"{latestText}"</p>
          </div>
        </div>
      )}
    </div>
  );
};
