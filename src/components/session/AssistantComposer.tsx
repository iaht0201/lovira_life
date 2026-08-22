import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Camera, Sparkles, Volume2, Bot, User, Loader2, X } from 'lucide-react';
import { SessionMessage, VoiceInteractionState } from '../../types';
import { speakText, stopSpeaking } from '../../services/ttsService';

interface AssistantComposerProps {
  messages: SessionMessage[];
  onSendMessage: (text: string, options?: { inputMode?: 'text' | 'voice' }) => void;
  onOpenCamera: () => void;
  isLoading?: boolean;
  scenarioType?: string;
  voiceStatus?: VoiceInteractionState;
  interimTranscript?: string;
  onStartVoice?: () => void;
  onStopVoice?: () => void;
  onCancelVoice?: () => void;
}

export const AssistantComposer: React.FC<AssistantComposerProps> = ({
  messages,
  onSendMessage,
  onOpenCamera,
  isLoading = false,
  voiceStatus = 'idle',
  interimTranscript = '',
  onStartVoice,
  onStopVoice,
  onCancelVoice,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isListening = voiceStatus === 'listening';

  // Dynamic suggested replies from the latest assistant message
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.sender === 'lovira' || m.sender === 'system');
  const dynamicReplies = lastAssistantMessage?.suggestedReplies;

  const defaultUniversalReplies = [
    'Giờ làm gì tiếp theo?',
    'Xong bước hiện tại rồi',
    'Nhờ Lovira tư vấn',
  ];

  const quickPrompts =
    dynamicReplies && dynamicReplies.length > 0
      ? dynamicReplies.slice(0, 3)
      : defaultUniversalReplies.slice(0, 3);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim(), { inputMode: 'text' });
    setInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    onSendMessage(prompt, { inputMode: 'text' });
  };

  const handleMicClick = () => {
    if (isListening) {
      onStopVoice?.();
    } else {
      stopSpeaking();
      onStartVoice?.();
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-surface border border-default shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary text-white">
            <Bot className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">
              Hỏi hoặc dặn dò Lovira trong phiên này
            </h3>
            <p className="text-xs text-text-secondary">
              Bạn có thể gõ phím hoặc bấm micro để trò chuyện tự nhiên với Lovira.
            </p>
          </div>
        </div>
      </div>

      {/* Messages Stream Box */}
      <div className="max-h-80 overflow-y-auto space-y-3 p-3 rounded-xl bg-surface-raised border border-default scroll-smooth">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const cleanText = msg.text.replace(/\*\*/g, '');
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser ? 'bg-primary text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed space-y-1 ${
                  isUser
                    ? 'bg-primary text-white rounded-tr-none font-medium'
                    : 'bg-surface border border-default text-text-primary rounded-tl-none shadow-2xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{cleanText}</p>

                {/* Speak button for assistant replies */}
                {!isUser && (
                  <button
                    onClick={() => speakText(cleanText)}
                    className="flex items-center gap-1 text-[10px] font-bold text-primary mt-1 hover:underline"
                    aria-label="Đọc lại câu trả lời này"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Đọc to câu này
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 text-xs text-text-secondary">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Lovira đang lắng nghe và suy nghĩ...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Fast Quick Reply Chips */}
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="text-[11px] font-bold text-text-secondary flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Gợi ý nhanh:
        </span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleQuickPrompt(prompt)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface-raised border border-default hover:border-primary hover:text-primary transition-colors text-text-primary active:scale-95 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Speech feedback in Composer (synchronized with Global Voice) */}
      {isListening && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-xs font-medium text-text-primary flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
            </span>
            <span className="truncate italic">
              {interimTranscript ? `"${interimTranscript}"` : 'Đang lắng nghe giọng nói của bạn...'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onStopVoice}
              className="px-2 py-1 rounded bg-primary text-white text-[11px] font-bold hover:bg-primary-hover"
            >
              Gửi ngay
            </button>
            {onCancelVoice && (
              <button
                type="button"
                onClick={onCancelVoice}
                className="p-1 rounded text-text-secondary hover:text-rose-500"
                title="Hủy"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* User Input & Action Buttons Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleMicClick}
          className={`p-3 rounded-xl border transition-all ${
            isListening
              ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
              : 'bg-surface-raised text-text-secondary border-default hover:text-primary hover:border-primary'
          }`}
          title={isListening ? 'Bấm để hoàn tất và gửi câu nói' : 'Nói chuyện bằng giọng nói'}
          aria-label={isListening ? 'Dừng và gửi giọng nói' : 'Bật micro'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          type="button"
          onClick={onOpenCamera}
          className="p-3 rounded-xl bg-surface-raised text-text-secondary border border-default hover:text-amber-600 hover:border-amber-500 transition-colors"
          title="Nhìn giúp tôi — Quét ảnh tài liệu"
          aria-label="Mở máy ảnh"
        >
          <Camera className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhắn hoặc dặn dò Lovira..."
          disabled={isLoading}
          className="flex-1 px-4 py-3 rounded-xl bg-surface-raised border border-default text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-3 rounded-xl bg-primary text-white font-bold disabled:opacity-40 hover:bg-primary-hover transition-colors shadow-xs"
          aria-label="Gửi tin nhắn"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
