import React from 'react';
import { Mic, MicOff, Sparkles, Volume2, AlertTriangle, X, Send, RotateCcw } from 'lucide-react';
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
  const isOpen = voiceStatus !== 'idle' || !!voiceError;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-[24px] bg-lovira-card border border-lovira-subtle shadow-lovira-lg p-5 sm:p-6 flex flex-col items-center text-center relative overflow-hidden animate-in slide-in-from-bottom-4 duration-200">

        {/* Top Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-3.5 right-3.5 w-[36px] h-[36px] rounded-full bg-lovira-input hover:bg-lovira-card-hover text-lovira-muted hover:text-lovira-title flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Đóng"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Listening Mode */}
        {voiceStatus === 'listening' && (
          <div className="flex flex-col items-center w-full py-3 space-y-4">
            {/* Live Recording Badge */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-pulse">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span>BẬT MICRO • ĐANG LẮNG NGHE</span>
            </div>

            <div className="relative flex items-center justify-center w-[88px] h-[88px] rounded-full bg-gradient-to-tr from-[#287C78] to-[#1F625F] text-white shadow-xl">
              <span className="absolute -inset-2 rounded-full border-2 border-[#287C78]/50 animate-ping" />
              <span className="absolute -inset-4 rounded-full border border-[#287C78]/30 animate-pulse" />
              <Mic className="w-10 h-10 text-white z-10 animate-bounce" />
            </div>

            {/* Sound Wave Equalizer & Live Volume Level Meter */}
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="flex items-center justify-center gap-1.5 h-8 py-1">
                <span className="w-1.5 bg-[#287C78] rounded-full transition-all duration-75" style={{ height: `${Math.max(12, Math.min(32, audioVolume * 0.4 + 10))}px` }} />
                <span className="w-1.5 bg-[#287C78] rounded-full transition-all duration-75" style={{ height: `${Math.max(16, Math.min(36, audioVolume * 0.6 + 14))}px` }} />
                <span className="w-1.5 bg-[#287C78] rounded-full transition-all duration-75" style={{ height: `${Math.max(10, Math.min(28, audioVolume * 0.3 + 8))}px` }} />
                <span className="w-1.5 bg-[#287C78] rounded-full transition-all duration-75" style={{ height: `${Math.max(18, Math.min(40, audioVolume * 0.8 + 16))}px` }} />
                <span className="w-1.5 bg-[#287C78] rounded-full transition-all duration-75" style={{ height: `${Math.max(12, Math.min(30, audioVolume * 0.5 + 10))}px` }} />
              </div>
              <span className="text-[11px] font-bold text-lovira-muted">
                Âm lượng Micro đầu vào: <span className={audioVolume > 5 ? 'text-[#287C78] dark:text-[#42A39E]' : 'text-amber-500'}>{audioVolume}%</span>
              </span>
            </div>

            <div className="space-y-2 w-full">
              <h3 className="text-[17px] font-[800] text-lovira-title">
                Lovira đang lắng nghe chú...
              </h3>
              
              {/* Real-time Voice Recognition Box */}
              {interimTranscript ? (
                <div className="p-3.5 rounded-[14px] bg-[#287C78]/10 border-2 border-[#287C78] text-left shadow-md animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#287C78] dark:text-[#42A39E] mb-1 uppercase tracking-wider">
                    <Mic className="w-3.5 h-3.5 animate-pulse" />
                    <span>Nội dung nhận diện được:</span>
                  </div>
                  <p className="text-[#287C78] dark:text-[#42A39E] font-[700] text-[15px] leading-snug">
                    "{interimTranscript}"
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="p-3 rounded-[14px] bg-lovira-input border border-lovira-subtle text-lovira-muted text-[13px] font-[600] flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#287C78] animate-ping" />
                    <span>Đang chờ giọng nói... (Chú hãy nói vào Micro)</span>
                  </div>
                  <p className="text-[12px] text-lovira-muted font-[500]">
                    Ví dụ: "Nhắc chú uống thuốc lúc 7h30 sáng"
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-[14px] bg-lovira-input hover:bg-lovira-card-hover text-lovira-muted text-[14px] font-[700] transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={onStopListening}
                className="flex-1 py-3 px-4 rounded-[14px] bg-gradient-to-r from-[#287C78] to-[#1F625F] hover:opacity-90 text-white text-[14px] font-[700] flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Hoàn tất & Gửi</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Processing Mode */}
        {voiceStatus === 'processing' && (
          <div className="flex flex-col items-center w-full py-4 space-y-4">
            <div className="flex items-center justify-center w-[76px] h-[76px] rounded-full bg-lovira-badge-purple text-[#287C78] dark:text-[#42A39E]">
              <Sparkles className="w-9 h-9 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[17px] font-[800] text-lovira-title">
                Đang xử lý câu nói...
              </h3>
              <p className="text-[13px] text-lovira-muted">
                Lovira đang kiểm tra lịch và sắp xếp nội dung cho chú ạ.
              </p>
            </div>
          </div>
        )}

        {/* 3. Speaking Mode */}
        {voiceStatus === 'speaking' && (
          <div className="flex flex-col items-center w-full py-3 space-y-4">
            <div className="flex items-center justify-center w-[76px] h-[76px] rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Volume2 className="w-9 h-9 animate-bounce" />
            </div>
            <div className="space-y-2 w-full">
              <h3 className="text-[17px] font-[800] text-lovira-title">
                Lovira đang trả lời...
              </h3>
              {lastResponseText && (
                <div className="p-3.5 rounded-[14px] bg-lovira-input text-lovira-title text-[14px] font-[600] leading-relaxed text-left border border-lovira-subtle max-h-[140px] overflow-y-auto">
                  {lastResponseText}
                </div>
              )}
            </div>

            <button
              onClick={onStopSpeaking || onCancel}
              className="w-full py-3 px-4 rounded-[14px] bg-lovira-input hover:bg-lovira-card-hover text-lovira-title text-[14px] font-[700] transition-all cursor-pointer"
            >
              Dừng đọc
            </button>
          </div>
        )}

        {/* 4. Error State */}
        {(voiceStatus === 'error' || voiceError) && (
          <div className="flex flex-col items-center w-full py-3 space-y-4">
            <div className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-rose-500/15 text-rose-500">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-[17px] font-[800] text-lovira-title">
                Chưa nhận dạng được giọng nói
              </h3>
              <p className="text-[13px] text-lovira-muted font-[500] leading-relaxed px-2">
                {voiceError ||
                  'Micro chưa được mở hoặc không tìm thấy âm thanh. Chú kiểm tra lại micro hoặc gõ tin nhắn cho Lovira nhé!'}
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full pt-2">
              <button
                onClick={onRetry}
                className="w-full py-3 px-4 rounded-[14px] bg-gradient-to-r from-[#287C78] to-[#1F625F] hover:opacity-90 text-white text-[14px] font-[700] flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Thử lại bằng giọng nói</span>
              </button>
              <button
                onClick={() => {
                  onCancel();
                  onOpenChat();
                }}
                className="w-full py-3 px-4 rounded-[14px] bg-lovira-input hover:bg-lovira-card-hover text-lovira-title text-[14px] font-[700] transition-all cursor-pointer"
              >
                Nhập câu hỏi bằng tin nhắn (Chat)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
