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

  // 3. Listening Mode: Semi-transparent backdrop + Bottom Sheet
  if (voiceStatus === 'listening') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="w-full max-w-lg rounded-[28px] bg-lovira-card border border-lovira-subtle shadow-2xl p-5 sm:p-6 flex flex-col items-center text-center relative overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
          {/* Top Close Button */}
          <button
            onClick={onCancel}
            className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-lovira-input hover:bg-lovira-card-hover text-lovira-muted hover:text-lovira-title flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center w-full py-1 space-y-4">
            {/* Live Recording Badge */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-pulse">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span>BẬT MICRO • ĐANG LẮNG NGHE</span>
            </div>

            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-[#287C78] to-[#1F625F] text-white shadow-lg">
              <span className="absolute -inset-2 rounded-full border-2 border-[#287C78]/40 animate-ping" />
              <Mic className="w-9 h-9 text-white z-10 animate-pulse" />
            </div>

            {/* Equalizer & Volume Level */}
            <div className="flex flex-col items-center gap-1 w-full">
              <div className="flex items-center justify-center gap-1.5 h-7 py-1">
                <span className="w-1.5 bg-[#287C78] rounded-full transition-all duration-75" style={{ height: `${Math.max(10, Math.min(28, audioVolume * 0.4 + 8))}px` }} />
                <span className="w-1.5 bg-[#287C78] rounded-full transition-all duration-75" style={{ height: `${Math.max(14, Math.min(32, audioVolume * 0.6 + 12))}px` }} />
                <span className="w-1.5 bg-[#287C78] rounded-full transition-all duration-75" style={{ height: `${Math.max(8, Math.min(24, audioVolume * 0.3 + 6))}px` }} />
                <span className="w-1.5 bg-[#287C78] rounded-full transition-all duration-75" style={{ height: `${Math.max(16, Math.min(36, audioVolume * 0.8 + 14))}px` }} />
                <span className="w-1.5 bg-[#287C78] rounded-full transition-all duration-75" style={{ height: `${Math.max(10, Math.min(28, audioVolume * 0.5 + 8))}px` }} />
              </div>
              <span className="text-[11px] font-bold text-lovira-muted">
                Âm lượng giọng nói: <span className={audioVolume > 5 ? 'text-[#287C78] dark:text-[#42A39E]' : 'text-amber-500'}>{audioVolume}%</span>
              </span>
            </div>

            <div className="space-y-2 w-full">
              <h3 className="text-base font-extrabold text-lovira-title">
                Lovira đang lắng nghe chú...
              </h3>

              {/* Real-time Voice Recognition Box */}
              {interimTranscript ? (
                <div className="p-3.5 rounded-xl bg-[#287C78]/10 border-2 border-[#287C78] text-left shadow-sm animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#287C78] dark:text-[#42A39E] mb-1 uppercase tracking-wider">
                    <Mic className="w-3.5 h-3.5 animate-pulse" />
                    <span>Nội dung nhận diện realtime:</span>
                  </div>
                  <p className="text-[#287C78] dark:text-[#42A39E] font-bold text-sm leading-snug">
                    "{interimTranscript}"
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="p-3 rounded-xl bg-lovira-input border border-lovira-subtle text-lovira-muted text-xs font-semibold flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#287C78] animate-ping" />
                    <span>Nói vào micro, Lovira sẽ tự nhận diện khi chú im lặng ~1.6 giây</span>
                  </div>
                  <p className="text-[11px] text-lovira-muted font-medium">
                    Ví dụ: "Mở danh sách nhắc nhở cho chú"
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 px-4 rounded-xl bg-lovira-input hover:bg-lovira-card-hover text-lovira-muted text-sm font-bold transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={onStopListening}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#287C78] to-[#1F625F] hover:opacity-90 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Hoàn tất & Gửi</span>
              </button>
            </div>
          </div>
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

