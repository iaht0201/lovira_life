import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Camera, Sparkles, Bot, Loader2, X, Volume2 } from 'lucide-react';
import { SessionMessage, VoiceInteractionState } from '../../types';
import { speakText, stopSpeaking } from '../../services/ttsService';
import { ChatMessageRenderer } from './ChatMessageRenderer';

interface ConversationPaneProps {
  messages: SessionMessage[];
  onSendMessage: (text: string, options?: { inputMode?: 'text' | 'voice' }) => void;
  onOpenCamera: () => void;
  isLoading?: boolean;
  voiceStatus?: VoiceInteractionState;
  interimTranscript?: string;
  userName?: string;
  onStartVoice?: () => void;
  onStopVoice?: () => void;
  onCancelVoice?: () => void;
}

export const ConversationPane: React.FC<ConversationPaneProps> = ({
  messages,
  onSendMessage,
  onOpenCamera,
  isLoading = false,
  voiceStatus = 'idle',
  interimTranscript = '',
  userName = 'Chú Ba',
  onStartVoice,
  onStopVoice,
  onCancelVoice,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isListening = voiceStatus === 'listening';

  // Extract dynamic suggested replies from the last message or fallbacks without unbacked capabilities
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.sender === 'lovira' || m.sender === 'system');

  const rawReplies = lastAssistantMessage?.suggestedReplies;

  // Filter out capabilities that don't exist (e.g., search map/stores near me)
  const filterValidReplies = (replies?: string[]) => {
    if (!replies) return [];
    return replies
      .map((r) => {
        if (r.toLowerCase().includes('tìm quán gần đây') || r.toLowerCase().includes('bản đồ')) {
          return 'Gợi ý cách chọn quán';
        }
        return r;
      })
      .slice(0, 4);
  };

  const defaultReplies = [
    'Gợi ý cách thực hiện',
    'Chú xong bước này rồi',
    'Nhờ Lovira tư vấn tiếp',
  ];

  const quickPrompts =
    rawReplies && rawReplies.length > 0
      ? filterValidReplies(rawReplies)
      : defaultReplies;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim(), { inputMode: 'text' });
    setInput('');
  };

  const handleQuickPrompt = (promptText: string) => {
    if (isLoading) return;
    onSendMessage(promptText, { inputMode: 'text' });
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
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#121818] relative overflow-hidden">
      {/* Messages Stream Area */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full overflow-hidden shadow-md border-2 border-[#287C78]/30 animate-bounce bg-[#287C78]">
              <img src="/images/avatar.png" alt="Lovira" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-base font-bold text-text-primary">Chào chú 👋</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Con là Lovira. Con sẽ đồng hành cùng chú trong phiên này. Chú cứ nói tự nhiên như đang nói chuyện với người bên cạnh nhen!
              </p>
            </div>
            <button
              onClick={handleMicClick}
              className="px-5 py-2.5 rounded-full bg-[#287C78] hover:bg-[#1F625F] text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Nói trực tiếp với Lovira</span>
            </button>
          </div>
        ) : (
          messages.map((msg, idx) => {
            // Group consecutive messages by same sender to control avatar display
            const prevMsg = messages[idx - 1];
            const isFirstInGroup = !prevMsg || prevMsg.sender !== msg.sender;

            return (
              <ChatMessageRenderer
                key={msg.id || idx}
                message={msg}
                userName={userName}
                showAvatar={isFirstInGroup}
                onSpeak={speakText}
                isSpeaking={voiceStatus === 'speaking'}
              />
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-[#EBF5F4] dark:bg-[#1B2928] text-xs text-[#287C78] dark:text-[#42A39E] max-w-[85%] animate-pulse border border-lovira-subtle my-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-[#287C78]" />
            <span className="font-semibold">Lovira đang suy nghĩ và sắp xếp thông tin cho chú...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Reply Chips */}
      {quickPrompts.length > 0 && (
        <div className="px-3.5 sm:px-6 py-2.5 bg-surface border-t border-lovira-subtle shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap pb-0.5">
            <span className="text-[11px] font-bold text-text-secondary shrink-0 hidden sm:inline">Gợi ý nhanh:</span>
            {quickPrompts.map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickPrompt(promptText)}
                className="h-[36px] px-4 rounded-full text-xs font-semibold bg-surface-raised text-[#287C78] dark:text-[#42A39E] border border-lovira-subtle hover:bg-[#EBF5F4] dark:hover:bg-[#1B2928] hover:border-lovira-purple transition-all shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Listening / Processing Overlay Status in Chat */}
      {isListening && (
        <div className="mx-3.5 sm:mx-6 mb-2 p-3 rounded-2xl bg-[#EBF5F4] dark:bg-[#1B2928] border border-[#287C78]/20 text-xs font-semibold text-[#287C78] dark:text-[#42A39E] flex items-center justify-between animate-in fade-in shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
            </span>
            <span className="truncate italic">
              {interimTranscript ? `"${interimTranscript}"` : '🔴 Lovira đang nghe chú nói...'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onStopVoice}
              className="px-3 py-1.5 rounded-xl bg-[#287C78] text-white text-xs font-bold hover:bg-[#1F625F] shadow-2xs cursor-pointer"
            >
              Gửi ngay
            </button>
            {onCancelVoice && (
              <button
                type="button"
                onClick={onCancelVoice}
                className="p-1.5 rounded-lg text-text-secondary hover:text-rose-500 cursor-pointer"
                title="Hủy"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sticky Bottom Message Composer */}
      <div className="p-3 sm:p-4 bg-surface border-t border-lovira-subtle shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
          <button
            type="button"
            onClick={handleMicClick}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse shadow-xs'
                : 'bg-surface-raised text-text-secondary border-lovira-subtle hover:text-[#287C78] hover:border-[#287C78]/50'
            }`}
            title={isListening ? 'Bấm để hoàn tất' : 'Nói bằng giọng nói'}
            aria-label="Micro"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={onOpenCamera}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-surface-raised text-text-secondary border border-lovira-subtle hover:text-amber-600 hover:border-amber-500 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            title="Nhìn giúp tôi — Quét ảnh tài liệu"
            aria-label="Mở camera"
          >
            <Camera className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhắn cho Lovira..."
            disabled={isLoading}
            className="flex-1 min-w-0 h-11 sm:h-12 px-4 rounded-2xl bg-surface-raised border border-lovira-subtle text-text-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#287C78] focus:border-transparent transition-all"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#287C78] text-white font-bold disabled:opacity-40 hover:bg-[#1F625F] transition-colors flex items-center justify-center shrink-0 shadow-xs cursor-pointer"
            aria-label="Gửi tin nhắn"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
