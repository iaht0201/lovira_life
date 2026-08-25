import React from 'react';
import { Mic, Sparkles, Volume2, AlertTriangle, X, Send, RotateCcw, Square } from 'lucide-react';
import { VoiceInteractionState } from '../../types';

interface VoiceAssistantOverlayProps {
  voiceStatus: VoiceInteractionState;
  interimTranscript?: string;
  audioVolume?: number;
  voiceError?: string;
  lastResponseText?: string;
  onStopListening: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onOpenChat: () => void;
  onStopSpeaking?: () => void;
}

export const VoiceAssistantOverlay: React.FC<VoiceAssistantOverlayProps> = ({
  voiceStatus,
  interimTranscript = '',
  audioVolume = 0,
  voiceError,
  lastResponseText,
  onStopListening,
  onCancel,
  onRetry,
  onOpenChat,
  onStopSpeaking,
}) => {
  // 1. Processing Mode: Floating compact top pill (NO backdrop, allowing page underneath to show & navigate)
  if (voiceStatus === 'processing') {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto animate-in slide-in-from-top duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-lovira-card/95 border border-[#287C78]/40 shadow-xl backdrop-blur-md text-lovira-title text-sm font-bold">
          <Sparkles className="w-4 h-4 text-[#287C78] dark:text-[#42A39E] animate-spin" />
          <span>✨ Lovira đang xử lý...</span>
        </div>
      </div>
    );
  }

  // 2. Speaking Mode: Non-blocking floating response card at top/bottom (NO backdrop, page is fully visible)
  if (voiceStatus === 'speaking') {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto w-[92%] max-w-md animate-in slide-in-from-top duration-200">
        <div className="p-3.5 rounded-2xl bg-lovira-card/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Volume2 className="w-4 h-4 animate-bounce" />
              <span>Lovira đang trả lời</span>
            </div>
            <button
              onClick={onStopSpeaking || onCancel}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer"
              title="Dừng đọc"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Dừng</span>
            </button>
          </div>
          {lastResponseText && (
            <p className="text-lovira-title text-sm font-semibold leading-snug line-clamp-3 text-left">
              "{lastResponseText}"
            </p>
          )}
        </div>
      </div>
    );
  }

  // 3. Listening Mode: Compact non-blocking toast at bottom (no backdrop, no modal)
  if (voiceStatus === 'listening') {
    return (
      <div className="fixed bottom-[80px] lg:bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto w-[92%] max-w-sm animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-lovira-card/96 border border-rose-500/40 shadow-2xl backdrop-blur-md">
          {/* Pulsing mic icon */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#287C78] to-[#1F625F] flex items-center justify-center shrink-0 shadow-md">
            <Mic className="w-4 h-4 text-white animate-pulse" aria-hidden="true" />
          </div>

          {/* Live waveform + transcript */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Đang nghe</span>
            </div>
            <p className="text-xs text-lovira-title font-medium truncate">
              {interimTranscript
                ? `"${interimTranscript}"`
                : audioVolume > 2
                ? 'Đã phát hiện tiếng nói...'
                : 'Hãy nói nhu cầu của bạn...'}
            </p>
          </div>

          {/* Waveform bars */}
          <div className="flex items-center gap-0.5 shrink-0">
            {[0.4, 0.8, 0.5, 1.0, 0.6].map((mult, i) => (
              <span
                key={i}
                className="w-1 bg-[#287C78] rounded-full transition-all duration-75"
                style={{ height: `${Math.max(6, Math.min(20, audioVolume * mult + 4))}px` }}
              />
            ))}
          </div>

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-full bg-lovira-input hover:bg-lovira-card-hover text-lovira-muted hover:text-lovira-title flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label="Hủy nghe"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }


  // 4. Error State Modal
  if (voiceStatus === 'error' || voiceError) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="w-full max-w-md rounded-2xl bg-lovira-card border border-lovira-subtle shadow-2xl p-5 flex flex-col items-center text-center relative animate-in zoom-in-95 duration-150">
          <button
            onClick={onCancel}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-lovira-input hover:bg-lovira-card-hover text-lovira-muted flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/15 text-rose-500 mb-3">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h3 className="text-base font-extrabold text-lovira-title mb-1">
            Chưa nhận dạng được giọng nói
          </h3>
          <p className="text-xs text-lovira-muted font-medium leading-relaxed px-2 mb-4">
            {voiceError ||
              'Micro chưa được mở hoặc không nhận được âm thanh. Chú/bạn kiểm tra lại micro hoặc gõ tin nhắn cho Lovira nhé!'}
          </p>

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={onRetry}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#287C78] to-[#1F625F] hover:opacity-90 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Thử lại bằng giọng nói</span>
            </button>
            <button
              onClick={() => {
                onCancel();
                onOpenChat();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-lovira-input hover:bg-lovira-card-hover text-lovira-title text-sm font-bold transition-all cursor-pointer"
            >
              Nhập câu hỏi bằng tin nhắn (Chat)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

