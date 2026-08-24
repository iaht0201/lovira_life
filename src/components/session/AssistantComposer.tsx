import React, { useState, useRef, useEffect } from 'react';
import { APP_IMAGES } from '../../assets/images';
import { Send, Mic, MicOff, Camera, Sparkles, Bot, Loader2, X } from 'lucide-react';
import { SessionMessage, VoiceInteractionState } from '../../types';
import { speakText, stopSpeaking } from '../../services/ttsService';
import { ChatMessageRenderer } from './ChatMessageRenderer';

interface AssistantComposerProps {
  messages: SessionMessage[];
  onSendMessage: (text: string, options?: { inputMode?: 'text' | 'voice' }) => void;
  onOpenCamera: () => void;
  isLoading?: boolean;
  scenarioType?: string;
  voiceStatus?: VoiceInteractionState;
  interimTranscript?: string;
  userName?: string;
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
  userName = 'Bạn',
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
    <div className="p-3.5 sm:p-5 rounded-2xl bg-lovira-card border border-lovira shadow-xs space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-2xs shrink-0 border border-[#287C78]/20 bg-[#287C78]">
            <img src={APP_IMAGES.avatar} alt="Lovira" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-lovira-title">
              Trò chuyện & Tham vấn cùng Lovira
            </h3>
            <p className="text-[11px] sm:text-xs text-lovira-muted">
              Hỏi đáp, xin gợi ý đời sống hoặc dặn dò Lovira cập nhật tiến độ công việc.
            </p>
          </div>
        </div>
      </div>

      {/* Messages Stream Box */}
      <div className="max-h-80 sm:max-h-96 overflow-y-auto space-y-3.5 p-3 sm:p-4 rounded-xl bg-[#FAF9F6] dark:bg-[#101818] border border-[#EDEAE1] dark:border-transparent scroll-smooth">
        {messages.length === 0 ? (
          <div className="text-center py-6 text-xs text-lovira-muted">
            Chưa có tin nhắn nào. Hãy gõ hoặc bấm micro để bắt đầu trò chuyện cùng Lovira!
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageRenderer
              key={msg.id}
              message={msg}
              userName={userName}
              onSpeak={speakText}
              isSpeaking={voiceStatus === 'speaking'}
            />
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-lovira-card border border-lovira text-xs text-lovira-muted animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-[#287C78] shrink-0" />
            <span>Lovira đang lắng nghe và chuẩn bị câu trả lời phù hợp...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Fast Quick Reply Chips */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
        <span className="text-[11px] font-bold text-lovira-muted flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Gợi ý nhanh:
        </span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleQuickPrompt(prompt)}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-lovira-input border border-lovira hover:border-[#287C78] hover:text-[#287C78] hover:bg-lovira-badge-purple transition-all text-lovira-title active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Speech feedback in Composer (synchronized with Global Voice) */}
      {isListening && (
        <div className="p-2.5 sm:p-3 rounded-xl bg-[#287C78]/10 border border-[#287C78]/25 text-xs font-medium text-lovira-title flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
            </span>
            <span className="truncate italic text-[11px] sm:text-xs">
              {interimTranscript ? `"${interimTranscript}"` : 'Đang lắng nghe giọng nói của bạn...'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onStopVoice}
              className="px-2.5 py-1 rounded-lg bg-[#287C78] text-white text-[10px] sm:text-[11px] font-bold hover:bg-[#1F625F] shadow-2xs cursor-pointer"
            >
              Gửi ngay
            </button>
            {onCancelVoice && (
              <button
                type="button"
                onClick={onCancelVoice}
                className="p-1 rounded text-lovira-muted hover:text-rose-500 cursor-pointer"
                title="Hủy"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* User Input & Action Buttons Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={handleMicClick}
          className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
            isListening
              ? 'bg-rose-500 text-white border-rose-600 animate-pulse shadow-2xs'
              : 'bg-lovira-input text-lovira-muted border-lovira hover:text-[#287C78] hover:border-[#287C78]'
          }`}
          title={isListening ? 'Bấm để hoàn tất và gửi câu nói' : 'Nói chuyện bằng giọng nói'}
          aria-label={isListening ? 'Dừng và gửi giọng nói' : 'Bật micro'}
        >
          {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        <button
          type="button"
          onClick={onOpenCamera}
          className="p-2.5 sm:p-3 rounded-xl bg-lovira-input text-lovira-muted border border-lovira hover:text-amber-600 hover:border-amber-500 transition-colors cursor-pointer"
          title="Nhìn giúp tôi — Quét ảnh tài liệu"
          aria-label="Mở máy ảnh"
        >
          <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhắn hoặc hỏi Lovira..."
          disabled={isLoading}
          className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-lovira-input border border-lovira text-lovira-title text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#287C78] focus:border-transparent transition-all"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 sm:p-3 rounded-xl bg-[#287C78] text-white font-bold disabled:opacity-40 hover:bg-[#1F625F] transition-colors shadow-xs cursor-pointer"
          aria-label="Gửi tin nhắn"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </form>
    </div>
  );
};

