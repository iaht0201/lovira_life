import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Camera, Sparkles, Loader2, Bot, User, CheckCircle2, Volume2, Copy, Check } from 'lucide-react';
import { LifeSession, SessionMessage, VoiceInteractionState } from '../../types';
import { speakText, stopSpeaking } from '../../services/ttsService';

interface ConversationPaneProps {
  session: LifeSession;
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
  session,
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isListening = voiceStatus === 'listening';
  const isProcessing = voiceStatus === 'processing' || isLoading;

  const messages = session.messages || [];

  // Scroll to bottom when messages update or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, voiceStatus, interimTranscript]);

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

  const handleCopy = (msgId: string, text: string) => {
    const textToCopy = text.replace(/\*\*/g, '');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Derive contextual suggested replies (filter out unhandled capabilities like map search)
  const lastLoviraMessage = [...messages].reverse().find((m) => m.sender === 'lovira' || m.sender === 'system');
  const rawSuggested = lastLoviraMessage?.suggestedReplies;

  const sanitizeSuggestions = (prompts?: string[]): string[] => {
    if (!prompts || prompts.length === 0) {
      return ['Gợi ý cách thực hiện', 'Xong bước hiện tại rồi', 'Nhờ Lovira tư vấn'];
    }
    // Filter out invalid map/store search suggestions if present
    const valid = prompts.filter(
      (p) => !p.toLowerCase().includes('tìm quán') && !p.toLowerCase().includes('bản đồ') && !p.toLowerCase().includes('định vị')
    );
    if (valid.length === 0) {
      return ['Gợi ý cách thực hiện', 'Xong bước hiện tại rồi', 'Nhờ Lovira tư vấn'];
    }
    return valid.slice(0, 4);
  };

  const quickPrompts = sanitizeSuggestions(rawSuggested);

  return (
    <div className="flex-1 flex flex-col h-full bg-lovira-card overflow-hidden relative">
      {/* Messages Stream Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scroll-smooth">
        {/* Empty State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 space-y-4">
            <div className="w-[64px] h-[64px] rounded-full bg-lovira-badge-purple text-lovira-purple flex items-center justify-center text-[28px]">
              👩
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-[18px] font-[800] text-lovira-title">
                Chào {userName} 👋
              </h3>
              <p className="text-[13px] font-[500] text-lovira-muted leading-relaxed">
                Lovira đã sẵn sàng đồng hành cùng chú trong phiên <strong>"{session.title}"</strong>. Chú cứ nói hoặc nhắn tin tự nhiên như nói chuyện với người nhà nhé!
              </p>
            </div>
            <button
              onClick={handleMicClick}
              className="px-5 py-2.5 rounded-full bg-lovira-purple text-white font-[700] text-[13px] hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Mic className="w-[16px] h-[16px]" />
              <span>Nói với Lovira</span>
            </button>
          </div>
        )}

        {/* Message Items Loop */}
        {messages.map((msg, idx) => {
          const isUser = msg.sender === 'user';
          const isSystem = msg.sender === 'system';

          // Grouping logic: Show avatar only on the first message of a consecutive group from Lovira
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const isFirstInGroup = !prevMsg || prevMsg.sender !== msg.sender;

          // System Event Badge (e.g. task completed, action log)
          if (isSystem || msg.actionsApplied?.length) {
            return (
              <div key={msg.id} className="text-center my-3 animate-in fade-in">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[12px] font-[600] bg-[#EAFBF5] dark:bg-[#143B2E] text-[#188B68] dark:text-[#34D399] border border-[#BDE8D8] dark:border-[#1F5441]">
                  <CheckCircle2 className="w-[13px] h-[13px]" />
                  <span>{msg.text}</span>
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 sm:gap-3 group ${
                isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Lovira Avatar (Only on first of group) */}
              {!isUser && (
                <div className="w-[36px] h-[36px] shrink-0">
                  {isFirstInGroup ? (
                    <div className="w-[36px] h-[36px] rounded-full bg-lovira-badge-purple border border-lovira-purple flex items-center justify-center text-[18px] shadow-2xs">
                      👩
                    </div>
                  ) : (
                    <div className="w-[36px] h-[36px]" />
                  )}
                </div>
              )}

              {/* Message Bubble Container */}
              <div
                className={`flex flex-col space-y-1 ${
                  isUser ? 'items-end max-w-[80%] sm:max-w-[65%]' : 'items-start max-w-[88%] sm:max-w-[70%]'
                }`}
              >
                {/* Bubble */}
                <div
                  className={`p-3.5 sm:p-4 rounded-[18px] text-[14px] sm:text-[15px] leading-relaxed shadow-2xs transition-all ${
                    isUser
                      ? 'bg-lovira-purple text-white font-[500] rounded-tr-[4px]'
                      : 'bg-lovira-badge-purple text-lovira-title font-[500] rounded-tl-[4px] border border-lovira-purple/20'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Actions for Lovira message */}
                  {!isUser && (
                    <div className="flex items-center gap-3 pt-2 mt-2 border-t border-lovira-purple/15 text-[11px] font-[600] text-lovira-muted">
                      <button
                        onClick={() => speakText(msg.text)}
                        className="flex items-center gap-1 text-lovira-purple hover:underline cursor-pointer"
                        title="Đọc to"
                      >
                        <Volume2 className="w-[13px] h-[13px]" />
                        <span>Đọc to</span>
                      </button>

                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="flex items-center gap-1 hover:text-lovira-title cursor-pointer"
                        title="Sao chép"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-[13px] h-[13px] text-[#188B68]" />
                            <span className="text-[#188B68]">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-[13px] h-[13px]" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-[10px] font-[500] text-lovira-sub px-1">
                  {msg.timestamp
                    ? new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>
            </div>
          );
        })}

        {/* Terminal Outcome Banner if session completed */}
        {session.status === 'completed' && (
          <div className="p-4 rounded-[18px] bg-[#EAFBF5] dark:bg-[#143B2E] border border-[#BDE8D8] dark:border-[#1F5441] text-center space-y-1 my-4">
            <p className="text-[14px] font-[800] text-[#188B68] dark:text-[#34D399]">
              ✓ Phiên đã hoàn thành
            </p>
            <p className="text-[12px] font-[500] text-lovira-muted">
              Mọi công việc đã được đối chiếu và lưu giữ lịch sử an toàn.
            </p>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 p-3 rounded-[16px] bg-lovira-badge-purple text-lovira-purple text-[13px] font-[600] max-w-[280px] animate-pulse">
            <Loader2 className="w-[16px] h-[16px] animate-spin shrink-0" />
            <span>Lovira đang suy nghĩ...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Fast Reply Chips */}
      {session.status !== 'completed' && (
        <div className="px-4 py-2 border-t border-lovira-subtle bg-lovira-card shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
            <span className="text-[11px] font-[700] text-lovira-muted flex items-center gap-1 shrink-0">
              <Sparkles className="w-[12px] h-[12px] text-amber-500" />
              Gợi ý:
            </span>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickPrompt(prompt)}
                className="h-[34px] sm:h-[36px] px-3.5 rounded-full text-[12px] font-[600] bg-lovira-card border border-lovira-purple/40 text-lovira-title hover:bg-lovira-badge-purple hover:border-lovira-purple hover:text-lovira-purple transition-all shrink-0 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Composer */}
      <div className="p-3 sm:p-4 border-t border-lovira-subtle bg-lovira-card shrink-0">
        {/* Voice Listening Overlay in Composer */}
        {isListening ? (
          <div className="h-[52px] px-4 rounded-[16px] bg-red-500/10 border border-red-500/30 flex items-center justify-between text-[13px] font-[600] text-red-600 dark:text-red-400 animate-pulse">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="truncate">
                🔴 Lovira đang nghe: {interimTranscript ? `"${interimTranscript}"` : 'Hãy nói cho chú biết...'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onCancelVoice}
                className="px-2.5 py-1 rounded-[8px] bg-lovira-card border border-lovira text-[12px] text-lovira-muted hover:text-lovira-title transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={onStopVoice}
                className="px-3 py-1 rounded-[8px] bg-red-500 text-white text-[12px] font-[700] hover:opacity-90 transition-opacity"
              >
                Gửi ngay
              </button>
            </div>
          </div>
        ) : (
          /* Normal Text Input Form */
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {/* Mic Button */}
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isLoading}
              className="w-[44px] h-[44px] rounded-[14px] bg-lovira-badge-purple text-lovira-purple hover:bg-lovira-purple hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-50"
              title="Nói giọng nói"
            >
              <Mic className="w-[20px] h-[20px]" />
            </button>

            {/* Camera Button */}
            <button
              type="button"
              onClick={onOpenCamera}
              disabled={isLoading}
              className="w-[44px] h-[44px] rounded-[14px] bg-lovira-card border border-lovira text-lovira-muted hover:border-lovira-purple hover:text-lovira-purple flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-50"
              title="Chụp ảnh tài liệu"
            >
              <Camera className="w-[20px] h-[20px]" />
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhắn cho Lovira..."
              disabled={isLoading || session.status === 'completed'}
              className="flex-1 h-[44px] px-4 rounded-[14px] bg-lovira-input border border-lovira text-[14px] text-lovira-main placeholder-lovira-sub focus:outline-none focus:border-lovira-purple focus:ring-2 focus:ring-lovira-purple/20 transition-all disabled:opacity-50"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading || session.status === 'completed'}
              className="w-[44px] h-[44px] rounded-[14px] bg-lovira-purple text-white flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-50 active:scale-95 shadow-xs"
              title="Gửi tin nhắn"
            >
              {isLoading ? (
                <Loader2 className="w-[20px] h-[20px] animate-spin" />
              ) : (
                <Send className="w-[20px] h-[20px]" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
