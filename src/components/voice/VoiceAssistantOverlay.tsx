import React from 'react';
import { Mic, Sparkles, Volume2, AlertTriangle, X, RotateCcw, Square } from 'lucide-react';
import { VoiceInteractionState } from '../../types';

interface VoiceAssistantOverlayProps {
  voiceStatus: VoiceInteractionState;
  interimTranscript?: string;
  audioVolume?: number;
  voiceError?: string;
  lastResponseText?: string;
  isCameraOpen?: boolean;
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
  isCameraOpen = false,
  onStopListening,
  onCancel,
  onRetry,
  onOpenChat,
  onStopSpeaking,
}) => {
  // 1. Processing Mode: Floating compact top pill (NO backdrop, allowing page underneath to show & navigate)
  if (voiceStatus === 'processing') {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999999] pointer-events-auto animate-in slide-in-from-top duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-lovira-card/95 border border-[#287C78]/40 shadow-2xl backdrop-blur-md text-lovira-title text-sm font-bold">
          <Sparkles className="w-4 h-4 text-[#287C78] dark:text-[#42A39E] animate-spin" />
          <span>✨ Lovira đang xử lý...</span>
        </div>
      </div>
    );
  }

  // 2. Speaking Mode: Non-blocking floating response card at top (NO backdrop, page is fully visible)
  if (voiceStatus === 'speaking') {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999999] pointer-events-auto w-[92%] max-w-md animate-in slide-in-from-top duration-200">
        <div className="p-3.5 rounded-2xl bg-lovira-card/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Volume2 className="w-4 h-4" />
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

  // 3. Listening Mode: Compact non-blocking toast at bottom (or top if camera is open to avoid blocking camera buttons)
  if (voiceStatus === 'listening') {
    return (
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-[99999999] pointer-events-auto w-[92%] max-w-sm duration-200 ${
          isCameraOpen
            ? 'top-4 animate-in slide-in-from-top-4'
            : 'bottom-[80px] lg:bottom-6 animate-in slide-in-from-bottom-4'
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-lovira-card/96 border border-rose-500/40 shadow-2xl backdrop-blur-md">
          {/* Mic icon */}
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
                : isCameraOpen
                ? 'Nói "Chụp" để chụp ảnh ngay...'
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

  // 4. Error Mode: Compact non-blocking toast
  if (voiceStatus === 'error' && voiceError) {
    return (
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-[99999999] pointer-events-auto w-[92%] max-w-sm duration-200 ${
          isCameraOpen
            ? 'top-4 animate-in slide-in-from-top-4'
            : 'bottom-[80px] lg:bottom-6 animate-in slide-in-from-bottom-4'
        }`}
      >
        <div className="p-3.5 rounded-2xl bg-lovira-card/96 border border-amber-500/50 shadow-2xl backdrop-blur-md flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Chưa nghe rõ</span>
            </div>
            <button
              onClick={onCancel}
              className="text-lovira-muted hover:text-lovira-title p-1 rounded-lg cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-lovira-text leading-relaxed text-left">{voiceError}</p>

          <div className="flex items-center gap-2 pt-1 border-t border-lovira-subtle">
            <button
              onClick={onRetry}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-dark transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nói lại</span>
            </button>
            <button
              onClick={onOpenChat}
              className="py-1.5 px-3 rounded-xl bg-lovira-input text-lovira-title text-xs font-semibold hover:bg-lovira-card-hover transition-colors cursor-pointer"
            >
              Nhắn tin
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
