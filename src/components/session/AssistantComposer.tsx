import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Camera, Sparkles, Volume2, Bot, User, Loader2 } from 'lucide-react';
import { SessionMessage, AgentAction } from '../../types';
import { speakText, stopSpeaking } from '../../services/ttsService';
import { speechRecognitionService } from '../../services/voice/speechRecognitionService';

interface AssistantComposerProps {
  messages: SessionMessage[];
  onSendMessage: (text: string, options?: { inputMode?: 'text' | 'voice' }) => void;
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
  const [interimText, setInterimText] = useState<string | null>(null);
  const [recordNotice, setRecordNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (isRecording) {
      speechRecognitionService.stopListening();
      setIsRecording(false);
      setInterimText(null);
      return;
    }

    // Stop speaking if Lovira is currently talking
    stopSpeaking();

    const started = speechRecognitionService.startListening({
      onStart: () => {
        setIsRecording(true);
        setInterimText(null);
        setRecordNotice('Đang lắng nghe giọng nói...');
      },
      onInterimResult: (transcript) => {
        setInterimText(transcript);
      },
      onFinalResult: (transcript) => {
        setIsRecording(false);
        setInterimText(null);
        setRecordNotice(null);
        if (transcript.trim()) {
          onSendMessage(transcript.trim(), { inputMode: 'voice' });
        }
      },
      onError: (errType, message) => {
        setIsRecording(false);
        setInterimText(null);
        setRecordNotice(message);
        setTimeout(() => setRecordNotice(null), 3500);
      },
      onEnd: () => {
        setIsRecording(false);
        setInterimText(null);
      },
    });

    if (!started) {
      setRecordNotice('Chưa bật được micro. Bạn hãy nhập câu hỏi bằng bàn phím nhé!');
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

      {/* Speech notice or interim feedback */}
      {(recordNotice || interimText) && (
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium text-text-primary flex items-center justify-between animate-in fade-in">
          <span>{interimText ? `Đang nghe: "${interimText}"` : recordNotice}</span>
          {isRecording && (
            <button
              onClick={() => speechRecognitionService.stopListening()}
              className="text-[11px] font-bold text-primary underline ml-2 shrink-0"
            >
              Gửi ngay
            </button>
          )}
        </div>
      )}

      {/* User Input & Action Buttons Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleMicClick}
          className={`p-3 rounded-xl border transition-all ${
            isRecording
              ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
              : 'bg-surface-raised text-text-secondary border-default hover:text-primary hover:border-primary'
          }`}
          title={isRecording ? 'Bấm để dừng thu âm' : 'Nói chuyện bằng giọng nói'}
          aria-label={isRecording ? 'Dừng thu âm' : 'Bật micro'}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
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
