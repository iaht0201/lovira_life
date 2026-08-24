import React from 'react';
import { Volume2, Camera, CheckCircle2, Sparkles } from 'lucide-react';
import { RecommendedAction } from '../../types';
import { speakText } from '../../services/ttsService';

interface NextRecommendedActionProps {
  action?: RecommendedAction;
  onCompleteCurrentTask: () => void;
  onOpenCamera: () => void;
  speakEnabled?: boolean;
}

export const NextRecommendedAction: React.FC<NextRecommendedActionProps> = ({
  action,
  onCompleteCurrentTask,
  onOpenCamera,
  speakEnabled = true,
}) => {
  if (!action) return null;

  const handleSpeak = () => {
    speakText(`Bước tiếp theo đề xuất: ${action.title}. ${action.description || ''}`);
  };

  return (
    <section aria-live="polite" className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-[#287C78]/15 via-[#287C78]/10 to-white dark:to-[#182424] border-2 border-[#287C78] dark:border-[#42A39E] shadow-sm relative overflow-hidden space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl">👉</span>
          <h3 className="text-xs font-black uppercase tracking-wider text-[#287C78] dark:text-[#42A39E]">
            Bước tiếp theo đề xuất
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#287C78]/15 text-[#165653] dark:text-[#42A39E]">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          Tự động gợi ý
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#11181C] dark:text-[#F2F7F7] tracking-tight">
            {action.title}
          </h4>
          {action.parentContext && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50">
              thuộc: {action.parentContext}
            </span>
          )}
        </div>
        {action.description && (
          <p className="text-xs sm:text-sm text-[#586268] dark:text-[#A0AFAF] leading-relaxed">
            {action.description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#287C78]/20 dark:border-[#42A39E]/20">
        <button
          onClick={handleSpeak}
          className="flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C2828] border border-[#EAEFEF] dark:border-[#253737] hover:border-[#287C78] text-[#11181C] dark:text-[#F2F7F7] font-bold text-xs shadow-2xs transition-all cursor-pointer"
        >
          <Volume2 className="w-4 h-4 text-[#287C78] dark:text-[#42A39E]" aria-hidden="true" />
          <span>🔊 Đọc hướng dẫn</span>
        </button>

        <button
          onClick={onOpenCamera}
          className="flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#1C2828] border border-[#EAEFEF] dark:border-[#253737] hover:border-[#287C78] text-[#11181C] dark:text-[#F2F7F7] font-bold text-xs shadow-2xs transition-all cursor-pointer"
        >
          <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span>📷 Chụp ảnh</span>
        </button>

        <button
          onClick={onCompleteCurrentTask}
          className="flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white font-bold text-xs shadow-md hover:bg-emerald-700 transition-all ml-auto cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          <span>✅ Hoàn thành bước này</span>
        </button>
      </div>
    </section>
  );
};
