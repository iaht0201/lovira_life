import React, { useState } from 'react';
import { Volume2, Check, Copy, Sparkles, Bot, User } from 'lucide-react';
import { SessionMessage } from '../../types';

interface ChatMessageRendererProps {
  message: SessionMessage;
  userName?: string;
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
        <strong key={idx} className="font-bold text-text-primary text-inherit tracking-tight">
          {boldContent}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

/**
 * Preprocesses raw message text to convert inline lists like "1) ... 2) ..." or "1. ... 2. ..."
 * into clean newline-separated lists if AI returned them compressed.
 */
function normalizeMessageContent(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();

  // If text contains inline numbered lists like "1) ... 2) ... 3) ...", add newlines before numbers
  if (/(?:\s|^)1\)\s+/.test(text) && /\s+2\)\s+/.test(text)) {
    text = text.replace(/(\s+)([1-9]\d*\))\s+/g, '\n$2 ');
    // Also separate the intro before 1)
    text = text.replace(/(:\s*)(1\)\s+)/g, ':\n$2');
  } else if (/(?:\s|^)1\.\s+/.test(text) && /\s+2\.\s+/.test(text)) {
    text = text.replace(/(\s+)([1-9]\d*\.)\s+/g, '\n$2 ');
    text = text.replace(/(:\s*)(1\.\s+)/g, ':\n$2');
  }

  // Also normalize inline bullets like " - " or " • "
  if (text.includes(' • ') && !text.includes('\n•')) {
    text = text.replace(/\s+•\s+/g, '\n• ');
  }

  return text;
}

/**
 * Rich, accessible Chat Message renderer.
 * Formats recommendations, bullet points, numbers, and structured guidance into scannable UI.
 */
export const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({
  message,
  userName = 'Bạn',
  onSpeak,
  isSpeaking = false,
}) => {
  const isUser = message.sender === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = message.text.replace(/\*\*/g, '');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const normalized = normalizeMessageContent(message.text);
  const lines = normalized.split('\n');

  // Group lines into blocks (paragraphs, bullet lists, numbered lists)
  interface Block {
    type: 'paragraph' | 'bullet' | 'numbered';
    number?: string;
    content: string;
  }

  const blocks: Block[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Numbered list item: "1. ...", "1) ...", "[1] ..."
    const numMatch = trimmed.match(/^([0-9]{1,2})[.)\]]\s+(.*)$/);
    if (numMatch) {
      blocks.push({
        type: 'numbered',
        number: numMatch[1],
        content: numMatch[2],
      });
      continue;
    }

    // Bullet list item: "• ...", "- ...", "* ...", "+ ..."
    const bulletMatch = trimmed.match(/^([•\-*+👉✓✔])\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        type: 'bullet',
        content: bulletMatch[2],
      });
      continue;
    }

    // Regular paragraph
    blocks.push({
      type: 'paragraph',
      content: trimmed,
    });
  }

  const cleanSpeechText = message.text.replace(/\*\*/g, '').replace(/•/g, '').trim();

  return (
    <div
      className={`flex items-start gap-3 w-full group ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs ${
          isUser
            ? 'bg-primary text-white ring-2 ring-primary/20'
            : 'bg-emerald-600 text-white ring-2 ring-emerald-500/20'
        }`}
        aria-hidden="true"
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble Container */}
      <div className="max-w-[92%] sm:max-w-[85%] flex flex-col space-y-1.5 min-w-0">
        {/* Header Sender Badge */}
        <div
          className={`flex items-center gap-2 px-1 text-[11px] font-semibold text-text-secondary ${
            isUser ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>{isUser ? userName : 'Lovira Đồng Hành'}</span>
          {!isUser && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
              <Sparkles className="w-2.5 h-2.5" />
              Trợ lý AI
            </span>
          )}
        </div>

        {/* Message Card */}
        <div
          className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed border transition-shadow ${
            isUser
              ? 'bg-primary text-white border-primary/40 rounded-tr-xs shadow-2xs font-medium'
              : 'bg-surface border-default text-text-primary rounded-tl-xs shadow-2xs'
          }`}
        >
          <div className="space-y-2.5">
            {blocks.map((block, idx) => {
              if (block.type === 'numbered') {
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                      isUser
                        ? 'bg-white/10 text-white'
                        : 'bg-surface-raised/70 border border-default/60 hover:border-primary/40 text-text-primary'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-extrabold shrink-0 mt-0.5 ${
                        isUser
                          ? 'bg-white text-primary'
                          : 'bg-primary/15 text-primary'
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
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                      isUser
                        ? 'bg-white/10 text-white'
                        : 'bg-surface-raised/70 border border-default/60 hover:border-emerald-500/30 text-text-primary'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${
                        isUser ? 'bg-white' : 'bg-emerald-500'
                      }`}
                    />
                    <div className="flex-1 leading-snug">
                      {renderFormattedInlineText(block.content)}
                    </div>
                  </div>
                );
              }

              return (
                <p
                  key={idx}
                  className={`${
                    isUser ? 'text-white' : 'text-text-primary'
                  } whitespace-pre-wrap leading-relaxed`}
                >
                  {renderFormattedInlineText(block.content)}
                </p>
              );
            })}
          </div>

          {/* Action Row for Lovira replies */}
          {!isUser && (
            <div className="flex items-center gap-3 pt-2 mt-2 border-t border-default/50 text-[11px] text-text-secondary">
              {onSpeak && (
                <button
                  type="button"
                  onClick={() => onSpeak(cleanSpeechText)}
                  className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
                  aria-label="Đọc to câu trả lời này"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse text-amber-500' : ''}`} />
                  <span>Đọc to</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 font-medium hover:text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
                aria-label="Sao chép nội dung tin nhắn"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
