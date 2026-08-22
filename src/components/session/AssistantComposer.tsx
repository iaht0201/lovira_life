import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Camera, Sparkles, Volume2, Bot, User, Loader2 } from 'lucide-react';
import { SessionMessage, AgentAction } from '../../types';
import { speakText } from '../../services/ttsService';

interface AssistantComposerProps {
  messages: SessionMessage[];
  onSendMessage: (text: string) => void;
  onOpenCamera: () => void;
  isLoading?: boolean;
  scenarioType?: string;
}

export const AssistantComposer: React.FC<AssistantComposerProps> = ({
  messages,
  onSendMessage,
  onOpenCamera,
  isLoading = false,
}) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordNotice, setRecordNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dynamic suggested replies from the latest assistant message
  const lastAssistantMessage = [...messages].reverse().find((m) => m.sender === 'lovira' || m.sender === 'system');
  const dynamicReplies = lastAssistantMessage?.suggestedReplies;

  const defaultUniversalReplies = [
    'Giờ làm gì tiếp theo?',
    'Xong bước hiện tại rồi',
    'Nhờ Lovira tư vấn',
  ];

  const quickPrompts = (dynamicReplies && dynamicReplies.length > 0)
    ? dynamicReplies.slice(0, 3)
    : defaultUniversalReplies.slice(0, 3);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  const handleMicClick = () => {
    // Check Web Speech API support
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsRecording(true);
          setRecordNotice('Đang lắng nghe giọng nói tiếng Việt...');
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            onSendMessage(transcript);
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition error:', err);
          setIsRecording(false);
          setRecordNotice('Chưa nhận diện được giọng nói. Bạn hãy gõ câu lệnh nhé!');
          setTimeout(() => setRecordNotice(null), 3000);
        };

        recognition.onend = () => {
          setIsRecording(false);
          setRecordNotice(null);
        };

        recognition.start();
      } catch {
        setRecordNotice('Trình duyệt chưa hỗ trợ ghi âm. Bạn hãy gõ phím nhé!');
        setTimeout(() => setRecordNotice(null), 3000);
      }
    } else {
      setRecordNotice('Tính năng giọng nói tiếng Việt nâng cao "Sắp có". Bạn hãy nhập câu hỏi bên dưới!');
      setTimeout(() => setRecordNotice(null), 3000);
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
              Bạn có thể hỏi, trò chuyện hoặc nói cho Lovira biết điều vừa xảy ra.
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
                    <Volume2 className="w-3 h-3" />
                    <span>Đọc lời này</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-medium text-primary p-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Lovira đang suy nghĩ và cập nhật phiên...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Reply Chips */}
      {quickPrompts.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[11px] font-semibold text-text-secondary">
            Gợi ý:
          </span>
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleQuickPrompt(prompt)}
              disabled={isLoading}
              className="min-h-[34px] px-3 py-1 rounded-full bg-surface-raised border border-default hover:border-primary hover:bg-primary/10 text-text-primary text-xs font-medium transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Record Notice Popup */}
      {recordNotice && (
        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-bold animate-fade-in">
          {recordNotice}
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCamera}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-default bg-surface hover:border-primary text-text-primary transition-all"
          aria-label="Chụp ảnh tài liệu hoặc số thứ tự"
        >
          <Camera className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleMicClick}
          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-all ${
            isRecording
              ? 'bg-red-500 text-white border-red-600 animate-pulse'
              : 'border-default bg-surface hover:border-primary text-text-primary'
          }`}
          aria-label="Nói câu lệnh bằng giọng nói"
        >
          <Mic className="w-5 h-5" aria-hidden="true" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi hoặc nói cho Lovira biết điều bạn cần..."
          className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-default bg-surface text-text-primary text-xs md:text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center justify-center"
          aria-label="Gửi tin nhắn cho Lovira"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
};
