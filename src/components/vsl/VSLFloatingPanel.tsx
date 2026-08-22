import React, { useState } from 'react';
import { Sparkles, X, Minimize2, Maximize2 } from 'lucide-react';

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

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-20 right-4 z-40 w-72 md:w-80 bg-surface-raised border-2 border-indigo-500 rounded-2xl shadow-2xl transition-all duration-300 ${
        isMinimized ? 'h-14 overflow-hidden' : 'p-4'
      }`}
      role="region"
      aria-label="Khung Ngôn ngữ Ký hiệu VSL"
    >
      <div className="flex items-center justify-between pb-2 border-b border-default mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" aria-hidden="true" />
          <span className="text-xs font-bold text-text-primary">Bảng Ký hiệu VSL (Demo)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded-md text-text-secondary hover:text-text-primary"
            aria-label={isMinimized ? 'Mở rộng khung VSL' : 'Thu nhỏ khung VSL'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-secondary hover:text-text-primary"
            aria-label="Đóng khung VSL"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="space-y-3">
          {/* Avatar Placeholder for Sign Language Animation */}
          <div className="w-full h-36 bg-linear-to-b from-indigo-900/20 to-surface rounded-xl border border-indigo-500/30 flex flex-col items-center justify-center text-center p-3 space-y-2">
            <div className="w-12 h-12 rounded-full bg-indigo-600/20 text-indigo-500 flex items-center justify-center font-bold text-lg animate-pulse">
              👋
            </div>
            <p className="text-[11px] font-bold text-indigo-400">
              Mô phỏng ngôn ngữ ký hiệu tiếng Việt
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-surface border border-default text-xs leading-relaxed text-text-primary font-medium">
            <span className="text-[10px] font-bold text-text-secondary uppercase block mb-0.5">
              Phụ đề phản hồi gần nhất:
            </span>
            <p className="line-clamp-3">{latestText}</p>
          </div>
        </div>
      )}
    </div>
  );
};
