import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, Square, Loader2, AlertCircle } from 'lucide-react';
import { VoiceInteractionState, VoiceErrorType } from '../../services/voice/voiceTypes';

interface GlobalVoiceButtonProps {
  status: VoiceInteractionState;
  interimTranscript?: string;
  errorMessage?: string;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopSpeaking: () => void;
  disabled?: boolean;
}

export const GlobalVoiceButton: React.FC<GlobalVoiceButtonProps> = ({
  status,
  interimTranscript,
  errorMessage,
  onStartListening,
  onStopListening,
  onStopSpeaking,
  disabled = false,
}) => {
  const [clickNotice, setClickNotice] = useState<string | null>(null);
  const lastClickRef = useRef<number>(0);

  // Auto clear click notice
  useEffect(() => {
    if (errorMessage) {
      setClickNotice(errorMessage);
      const t = setTimeout(() => setClickNotice(null), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (disabled) return;

    const now = Date.now();
    // Debounce fast double clicks (under 350ms)
    if (now - lastClickRef.current < 350) {
      return;
    }
    lastClickRef.current = now;

    if (status === 'listening') {
      onStopListening();
    } else if (status === 'speaking') {
      onStopSpeaking();
    } else if (status === 'idle' || status === 'error') {
      onStartListening();
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'listening':
        return 'Lovira đang lắng nghe bạn nói...';
      case 'processing':
        return 'Lovira đang xử lý yêu cầu...';
      case 'speaking':
        return 'Lovira đang trả lời. Bấm để dừng.';
      case 'error':
        return clickNotice || 'Có lỗi xảy ra. Bấm để thử lại.';
      default:
        return 'Bấm để nói chuyện với Lovira';
    }
  };

  return (
    <div
      id="global-voice-container"
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none select-none"
      aria-live="polite"
    >
      {/* Live Interim Transcript or Notice Bubble */}
      {(interimTranscript || clickNotice || status === 'listening' || status === 'processing') && (
        <div
          id="voice-transcript-bubble"
          className="pointer-events-auto max-w-xs md:max-w-md p-3.5 rounded-2xl bg-surface-raised/95 backdrop-blur-md border border-default shadow-xl text-text-primary text-xs md:text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-2"
        >
          {status === 'listening' && (
            <div className="flex items-center gap-2 text-primary font-bold mb-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              <span>Đang nghe bạn nói...</span>
            </div>
          )}

          {status === 'processing' && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold mb-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang xử lý yêu cầu...</span>
            </div>
          )}

          {clickNotice && status === 'error' && (
            <div className="flex items-start gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-xs leading-tight">{clickNotice}</span>
            </div>
          )}

          {interimTranscript && (
            <p className="text-text-primary italic mt-1 leading-relaxed bg-surface/60 p-2 rounded-lg border border-default">
              "{interimTranscript}"
            </p>
          )}

          {status === 'listening' && !interimTranscript && (
            <p className="text-text-secondary text-[11px] mt-0.5">
              Nói tự nhiên, ví dụ: "Xong việc này rồi", "Về trang chủ", hoặc "Mở cài đặt"...
            </p>
          )}
        </div>
      )}

      {/* Main Floating Voice Button */}
      <div className="pointer-events-auto relative group">
        {/* Pulsing visual halo ring */}
        {status === 'listening' && (
          <span className="absolute -inset-2 rounded-full bg-primary/25 animate-ping pointer-events-none" />
        )}
        {status === 'speaking' && (
          <span className="absolute -inset-1.5 rounded-full bg-emerald-500/25 animate-pulse pointer-events-none" />
        )}

        <button
          id="global-voice-action-btn"
          type="button"
          onClick={handleClick}
          disabled={disabled || status === 'processing'}
          aria-label={getStatusDescription()}
          title={getStatusDescription()}
          className={`relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl transition-all transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/40 ${
            status === 'listening'
              ? 'bg-rose-600 text-white shadow-rose-500/40 scale-105'
              : status === 'speaking'
              ? 'bg-emerald-600 text-white shadow-emerald-500/40'
              : status === 'processing'
              ? 'bg-primary/80 text-white cursor-wait opacity-90'
              : status === 'error'
              ? 'bg-amber-600 text-white shadow-amber-500/30'
              : 'bg-primary text-white hover:bg-primary-hover shadow-primary/30'
          }`}
        >
          {status === 'listening' && (
            <div className="flex flex-col items-center">
              <Square className="w-6 h-6 fill-current animate-pulse" />
            </div>
          )}

          {status === 'speaking' && (
            <div className="flex flex-col items-center">
              <Volume2 className="w-7 h-7 animate-bounce" />
            </div>
          )}

          {status === 'processing' && (
            <Loader2 className="w-7 h-7 animate-spin" />
          )}

          {(status === 'idle' || status === 'error') && (
            <Mic className="w-7 h-7" />
          )}
        </button>

        {/* Accessible visual tooltip on desktop hover */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden md:group-hover:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-raised border border-default shadow-lg text-text-primary text-xs font-bold whitespace-nowrap">
          <span>{getStatusDescription()}</span>
        </div>
      </div>
    </div>
  );
};
