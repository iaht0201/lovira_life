import React, { useState } from 'react';
import { Volume2, Check, Copy, Sparkles, Bot, User, CheckCircle2 } from 'lucide-react';
import { SessionMessage } from '../../types';

interface ChatMessageRendererProps {
  message: SessionMessage;
  userName?: string;
  showAvatar?: boolean;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
}

/**
 * Parses markdown bold **text** and returns formatted React nodes.
 */
function renderFormattedInlineText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldContent = part.slice(2, -2);
      return (
        <strong key={idx} className="font-bold text-inherit tracking-tight">
          {boldContent}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

/**
 * Preprocesses raw message text to convert inline lists into clean newline-separated lists.
 */
function normalizeMessageContent(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();

  if (/(?:\s|^)1\)\s+/.test(text) && /\s+2\)\s+/.test(text)) {
    text = text.replace(/(\s+)([1-9]\d*\))\s+/g, '\n$2 ');
    text = text.replace(/(:\s*)(1\)\s+)/g, ':\n$2');
  } else if (/(?:\s|^)1\.\s+/.test(text) && /\s+2\.\s+/.test(text)) {
    text = text.replace(/(\s+)([1-9]\d*\.)\s+/g, '\n$2 ');
    text = text.replace(/(:\s*)(1\.\s+)/g, ':\n$2');
  }

  if (text.includes(' • ') && !text.includes('\n•')) {
    text = text.replace(/\s+•\s+/g, '\n• ');
  }

  return text;
}

export const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({
  message,
  userName = 'Chú Ba',
  showAvatar = true,
  onSpeak,
  isSpeaking = false,
}) => {
  const isUser = message.sender === 'user';
  const isSystemEvent =
    message.text.startsWith('✓') ||
    message.text.startsWith('System:') ||
    message.text.startsWith('STATUS:') ||
    message.text.includes('Đã hoàn thành') ||
    message.text.includes('Đã cập nhật:');

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = message.text.replace(/\*\*/g, '');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Render System Event (e.g., Task completion pill)
  if (isSystemEvent) {
    return (
      <div className="flex justify-center my-3 w-full animate-in fade-in">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-bold shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{message.text}</span>
        </div>
      </div>
    );
  }

  const normalized = normalizeMessageContent(message.text);
  const lines = normalized.split('\n');

  interface Block {
    type: 'paragraph' | 'bullet' | 'numbered';
    number?: string;
    content: string;
  }

  const blocks: Block[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const numMatch = trimmed.match(/^([0-9]{1,2})[.)\]]\s+(.*)$/);
    if (numMatch) {
      blocks.push({
        type: 'numbered',
        number: numMatch[1],
        content: numMatch[2],
      });
      continue;
    }

    const bulletMatch = trimmed.match(/^([•\-*+👉✓✔])\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        type: 'bullet',
        content: bulletMatch[2],
      });
      continue;
    }

    blocks.push({
      type: 'paragraph',
      content: trimmed,
    });
  }

  const cleanSpeechText = message.text.replace(/\*\*/g, '').replace(/•/g, '').trim();
  const timeStr = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      className={`flex items-start gap-2.5 sm:gap-3 w-full group my-1 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar (rendered only when showAvatar is true) */}
      {!isUser ? (
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-2xs mt-1 border border-[#287C78]/20 bg-[#287C78]">
          {showAvatar ? (
            <img src="/images/avatar.png" alt="Lovira" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8" />
          )}
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-[#287C78] text-white flex items-center justify-center shrink-0 shadow-2xs text-xs font-bold mt-1">
          {showAvatar ? <User className="w-4 h-4" /> : <div className="w-8 h-8" />}
        </div>
      )}

      {/* Bubble Container */}
      <div
        className={`flex flex-col space-y-1 min-w-0 ${
          isUser
            ? 'items-end max-w-[78%] sm:max-w-[68%]'
            : 'items-start max-w-[86%] sm:max-w-[72%]'
        }`}
      >
        {/* Message Card */}
        <div
          className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all relative ${
            isUser
              ? 'bg-[#287C78] text-white rounded-tr-xs shadow-2xs font-medium'
              : 'bg-[#EBF5F4] dark:bg-[#1B2928] text-[#20252A] dark:text-[#E2ECEB] rounded-tl-xs border border-lovira-subtle shadow-2xs'
          }`}
        >
          <div className="space-y-2">
            {blocks.map((block, idx) => {
              if (block.type === 'numbered') {
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 p-1.5 rounded-xl ${
                      isUser
                        ? 'bg-[#1F625F] text-white'
                        : 'bg-white dark:bg-[#142221] text-lovira-title border border-lovira-subtle'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold shrink-0 mt-0.5 ${
                        isUser
                          ? 'bg-white text-[#287C78]'
                          : 'bg-[#D2E7E5] text-[#287C78] dark:bg-[#203D3B] dark:text-[#42A39E]'
                      }`}
                    >
                      {block.number}
                    </span>
                    <div className="flex-1 leading-snug">
                      {renderFormattedInlineText(block.content)}
                    </div>
                  </div>
                );
              }

              if (block.type === 'bullet') {
                return (
                  <div key={idx} className="flex items-start gap-2 pl-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${
                        isUser ? 'bg-white' : 'bg-[#287C78]'
                      }`}
                    />
                    <div className="flex-1 leading-snug">
                      {renderFormattedInlineText(block.content)}
                    </div>
                  </div>
                );
              }

              return (
                <p key={idx} className="whitespace-pre-wrap leading-relaxed">
                  {renderFormattedInlineText(block.content)}
                </p>
              );
            })}
          </div>

          {/* Time & Action row */}
          <div
            className={`flex items-center gap-2 pt-2 mt-1 text-[10px] ${
              isUser
                ? 'text-teal-100 justify-end'
                : 'text-lovira-muted justify-between border-t border-lovira-subtle'
            }`}
          >
            {!isUser && (
              <div className="flex items-center gap-2">
                {onSpeak && (
                  <button
                    type="button"
                    onClick={() => onSpeak(cleanSpeechText)}
                    className="inline-flex items-center gap-1 font-bold text-[#287C78] dark:text-[#42A39E] hover:underline transition-colors cursor-pointer"
                  >
                    <Volume2 className={`w-3 h-3 ${isSpeaking ? 'animate-pulse text-amber-500' : ''}`} />
                    <span>Đọc to</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-0.5 hover:text-lovira-title transition-colors cursor-pointer"
                >
                  {copied ? (
                    <span className="text-emerald-600 font-bold">✓ Đã chép</span>
                  ) : (
                    <span>Sao chép</span>
                  )}
                </button>
              </div>
            )}

            {timeStr && <span>{timeStr}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
