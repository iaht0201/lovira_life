import React, { useState, useRef, useEffect } from 'react';
import { LifeSession, ScenarioType, GlobalChatMessage, PendingInteraction } from '../../types';
import { BriefSessionHeader } from '../../services/storageService';
import { MessageSquare, Sparkles, Stethoscope, Landmark, ShoppingBag, ArrowRight, Send, Trash2, Bot, User } from 'lucide-react';

interface GlobalChatPageProps {
  activeSession: LifeSession | null;
  sessionsList: BriefSessionHeader[];
  globalMessages?: GlobalChatMessage[];
  onOpenSession: (id: string) => void;
  onCreateSessionFromTemplate: (type: ScenarioType, customGoal?: string) => Promise<void>;
  onSendInteraction?: (text: string) => void;
  onClearGlobalChat?: () => void;
  isLoading?: boolean;
  pendingInteraction?: PendingInteraction | null;
  userName?: string;
}

export const GlobalChatPage: React.FC<GlobalChatPageProps> = ({
  activeSession,
  sessionsList,
  globalMessages = [],
  onOpenSession,
  onCreateSessionFromTemplate,
  onSendInteraction,
  onClearGlobalChat,
  isLoading = false,
  pendingInteraction,
  userName = 'Bạn',
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [globalMessages, isLoading]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;
    if (onSendInteraction) {
      onSendInteraction(trimmed);
    }
    setInputText('');
  };

  const handleQuickReply = (text: string) => {
    if (isLoading) return;
    if (onSendInteraction) {
      onSendInteraction(text);
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-4 space-y-4 px-2 sm:px-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 rounded-[20px] bg-lovira-card border border-lovira shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center shadow-2xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-[800] text-lovira-title leading-tight">
              Trò chuyện cùng Lovira
            </h2>
            <p className="text-xs font-[500] text-lovira-muted">
              Trợ lý cá nhân toàn năng • Hỏi đáp & Lên lịch nhắc nhở
            </p>
          </div>
        </div>

        {globalMessages.length > 0 && onClearGlobalChat && (
          <button
            onClick={onClearGlobalChat}
            className="p-2 rounded-xl text-lovira-muted hover:text-red-500 hover:bg-red-500/10 transition-colors text-xs font-[600] flex items-center gap-1.5 cursor-pointer"
            title="Xóa lịch sử trò chuyện"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Xóa lịch sử</span>
          </button>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="min-h-[380px] max-h-[550px] overflow-y-auto p-4 rounded-[24px] bg-lovira-card border border-lovira shadow-lovira space-y-4">
        {globalMessages.length === 0 ? (
          <div className="text-center py-8 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#287C78]/20 to-[#42A39E]/10 text-[#287C78] dark:text-[#42A39E] flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-[800] text-lovira-title">
                Chào {userName}! Lovira có thể giúp gì cho bạn?
              </h3>
              <p className="text-sm font-[500] text-lovira-muted leading-relaxed">
                Bạn có thể trò chuyện tự do, lên lịch nhắc nhở đi khám, uống thuốc, hoặc tạo các phiên công việc quản lý từng bước.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto text-left">
              <button
                onClick={() => handleQuickReply('Mai chú phải đi khám bệnh')}
                className="p-3 rounded-2xl bg-lovira-subtle hover:bg-[#E4F0EF] dark:hover:bg-[#203A39] border border-lovira text-xs font-[600] text-lovira-title flex items-center justify-between transition-all cursor-pointer group"
              >
                <span>"Mai chú phải đi khám bệnh"</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#287C78] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => handleQuickReply('Nhắc chú uống thuốc lúc 8 giờ tối')}
                className="p-3 rounded-2xl bg-lovira-subtle hover:bg-[#E4F0EF] dark:hover:bg-[#203A39] border border-lovira text-xs font-[600] text-lovira-title flex items-center justify-between transition-all cursor-pointer group"
              >
                <span>"Nhắc chú uống thuốc lúc 8 giờ tối"</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#287C78] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {globalMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-[#287C78] text-white flex items-center justify-center shrink-0 text-xs font-[700] shadow-2xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                    <div
                      className={`p-3.5 sm:p-4 rounded-[18px] text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#287C78] text-white rounded-br-xs shadow-2xs font-[500]'
                          : 'bg-lovira-subtle text-lovira-title border border-lovira rounded-bl-xs font-[500]'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Render Suggested Replies if present */}
                    {!isUser && msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.suggestedReplies.map((reply, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickReply(reply)}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded-xl bg-[#E4F0EF] dark:bg-[#203A39] hover:bg-[#287C78] hover:text-white dark:hover:bg-[#287C78] text-[#287C78] dark:text-[#42A39E] text-xs font-[600] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-lovira-subtle border border-lovira text-lovira-title flex items-center justify-center shrink-0 text-xs font-[700]">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-full bg-[#287C78] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div className="p-3.5 rounded-[18px] bg-lovira-subtle border border-lovira text-xs font-[600] text-lovira-muted animate-pulse">
                  Lovira đang suy nghĩ...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập tin nhắn hoặc yêu cầu nhắc nhở..."
          disabled={isLoading}
          className="flex-1 px-4 py-3 rounded-[16px] bg-lovira-card border border-lovira text-sm font-[500] text-lovira-title placeholder:text-lovira-muted focus:outline-none focus:ring-2 focus:ring-[#287C78] transition-all shadow-2xs"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="px-5 py-3 rounded-[16px] bg-[#287C78] hover:bg-[#1F625F] disabled:opacity-50 text-white font-[700] text-sm flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Suggested Quick Scenarios */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-[700] text-lovira-title uppercase tracking-wider px-1">
          Hoặc mở nhanh phiên công việc:
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => handleQuickReply('Tạo phiên hỗ trợ đi khám bệnh')}
            className="p-3.5 rounded-[16px] bg-lovira-card hover:bg-lovira-card-hover border border-lovira text-left flex items-center gap-3 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <div className="font-[700] text-xs text-lovira-title group-hover:text-[#287C78]">
                Đi khám bệnh
              </div>
              <p className="text-[11px] text-lovira-muted">Sổ khám & dặn dò</p>
            </div>
          </button>

          <button
            onClick={() => handleQuickReply('Tạo phiên hỗ trợ đi chợ mua sắm')}
            className="p-3.5 rounded-[16px] bg-lovira-card hover:bg-lovira-card-hover border border-lovira text-left flex items-center gap-3 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-xl bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="font-[700] text-xs text-lovira-title group-hover:text-[#287C78]">
                Đi chợ / Mua sắm
              </div>
              <p className="text-[11px] text-lovira-muted">Lên danh sách mua</p>
            </div>
          </button>

          <button
            onClick={() => handleQuickReply('Tạo phiên hỗ trợ làm thủ tục giấy tờ')}
            className="p-3.5 rounded-[16px] bg-lovira-card hover:bg-lovira-card-hover border border-lovira text-left flex items-center gap-3 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <div className="font-[700] text-xs text-lovira-title group-hover:text-[#287C78]">
                Thủ tục giấy tờ
              </div>
              <p className="text-[11px] text-lovira-muted">Hành chính & công chứng</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
