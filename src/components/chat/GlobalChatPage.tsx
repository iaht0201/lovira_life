import React, { useState, useRef, useEffect } from 'react';
import { LifeSession, ScenarioType, GlobalChatMessage, PendingInteraction, VoiceInteractionState } from '../../types';
import { BriefSessionHeader } from '../../services/storageService';
import { SessionListSidebar } from '../session/SessionListSidebar';
import {
  MessageSquare,
  Sparkles,
  Stethoscope,
  Landmark,
  ShoppingBag,
  ArrowRight,
  Send,
  Trash2,
  Bot,
  User,
  Mic,
  Camera,
  Compass,
  FileText,
  Car,
  HeartPulse,
  Plane,
  CreditCard,
  Pill,
  Menu,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface SuggestedTopic {
  id: string;
  category: 'health' | 'admin' | 'life' | 'travel';
  categoryLabel: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  prompt: string;
  scenarioType?: ScenarioType;
}

const SUGGESTED_TOPICS: SuggestedTopic[] = [
  {
    id: 'topic-medical',
    category: 'health',
    categoryLabel: 'Y tế • Sức khỏe',
    icon: <Stethoscope className="w-5 h-5" />,
    iconBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    title: 'Đi khám bệnh tại bệnh viện',
    description: 'Sổ khám, BHYT, thứ tự phòng khám, xét nghiệm và dặn dò của bác sĩ.',
    prompt: 'Đi khám sức khỏe tổng quát tại bệnh viện',
    scenarioType: 'medical',
  },
  {
    id: 'topic-medicine',
    category: 'health',
    categoryLabel: 'Y tế • Thuốc men',
    icon: <Pill className="w-5 h-5" />,
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'Lên lịch & Nhắc uống thuốc',
    description: 'Quản lý liều lượng, phân loại thuốc trước/sau ăn và nhắc giờ uống.',
    prompt: 'Lập kế hoạch uống thuốc theo đơn bác sĩ và nhắc nhở uống đúng giờ',
    scenarioType: 'custom',
  },
  {
    id: 'topic-cccd',
    category: 'admin',
    categoryLabel: 'Hành chính • Công dân',
    icon: <Landmark className="w-5 h-5" />,
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    title: 'Làm thẻ Căn cước / VNeID',
    description: 'Hồ sơ cần chuẩn bị, chụp ảnh thẻ, lấy vân tay và kích hoạt tài khoản.',
    prompt: 'Làm thủ tục cấp đổi thẻ Căn cước công dân gắn chip tại cơ quan công an',
    scenarioType: 'administrative',
  },
  {
    id: 'topic-passport',
    category: 'admin',
    categoryLabel: 'Hành chính • Xuất cảnh',
    icon: <FileText className="w-5 h-5" />,
    iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    title: 'Làm hộ chiếu trực tuyến',
    description: 'Nộp hồ sơ qua Dịch vụ công, thanh toán lệ phí và nhận tại nhà.',
    prompt: 'Làm hộ chiếu phổ thông trực tuyến qua Cổng Dịch vụ công Quốc gia',
    scenarioType: 'custom',
  },
  {
    id: 'topic-shopping',
    category: 'life',
    categoryLabel: 'Đời sống • Mua sắm',
    icon: <ShoppingBag className="w-5 h-5" />,
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    title: 'Đi chợ & Mua sắm thực phẩm',
    description: 'Lên danh sách thực phẩm tươi sống, rau củ và ước tính chi phí.',
    prompt: 'Lên danh sách đi chợ mua sắm thực phẩm tươi ngon cho gia đình',
    scenarioType: 'shopping',
  },
  {
    id: 'topic-travel',
    category: 'travel',
    categoryLabel: 'Du lịch • Di chuyển',
    icon: <Plane className="w-5 h-5" />,
    iconBg: 'bg-sky-500/10 dark:bg-sky-500/20',
    iconColor: 'text-sky-600 dark:text-sky-400',
    title: 'Chuẩn bị hành lý đi xa',
    description: 'Quần áo, giấy tờ tùy thân, thuốc men cá nhân và kiểm tra trước khi đi.',
    prompt: 'Chuẩn bị hành lý, giấy tờ và kế hoạch trước chuyến đi xa về quê hoặc du lịch',
    scenarioType: 'custom',
  },
  {
    id: 'topic-car',
    category: 'life',
    categoryLabel: 'Phương tiện • Xe cộ',
    icon: <Car className="w-5 h-5" />,
    iconBg: 'bg-orange-500/10 dark:bg-orange-500/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    title: 'Đăng kiểm & Bảo dưỡng xe',
    description: 'Giấy tờ xe, bảo hiểm bắt buộc, đặt hẹn đăng kiểm và kiểm tra an toàn.',
    prompt: 'Đi đăng kiểm xe ô tô và bảo dưỡng định kỳ',
    scenarioType: 'custom',
  },
  {
    id: 'topic-nutrition',
    category: 'health',
    categoryLabel: 'Sức khỏe • Dinh dưỡng',
    icon: <HeartPulse className="w-5 h-5" />,
    iconBg: 'bg-teal-500/10 dark:bg-teal-500/20',
    iconColor: 'text-teal-600 dark:text-teal-400',
    title: 'Thực đơn & Vận động dưỡng sinh',
    description: 'Thực đơn tốt cho tim mạch, huyết áp và bài tập thể dục dưỡng sinh.',
    prompt: 'Lên thực đơn ăn uống dinh dưỡng và bài tập thể dục dưỡng sinh mỗi ngày',
    scenarioType: 'custom',
  },
  {
    id: 'topic-bills',
    category: 'life',
    categoryLabel: 'Đời sống • Tiện ích',
    icon: <CreditCard className="w-5 h-5" />,
    iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    title: 'Thanh toán hóa đơn định kỳ',
    description: 'Tra cứu mã hóa đơn điện, nước, internet và nhắc hẹn thanh toán.',
    prompt: 'Kiểm tra và lên lịch thanh toán hóa đơn điện nước trong tháng',
    scenarioType: 'custom',
  },
];

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
  onOpenCamera?: () => void;
  onStartVoice?: () => void;
  voiceStatus?: VoiceInteractionState;
  interimTranscript?: string;
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
  onOpenCamera,
  onStartVoice,
  voiceStatus = 'idle',
  interimTranscript = '',
}) => {
  const [goalInput, setGoalInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'health' | 'admin' | 'life' | 'travel'>('all');
  const [isMobileSessionsOpen, setIsMobileSessionsOpen] = useState(false);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [activeTabMode, setActiveTabMode] = useState<'create' | 'freeChat'>('create');
  const [freeChatInput, setFreeChatInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredTopics = selectedCategory === 'all'
    ? SUGGESTED_TOPICS
    : SUGGESTED_TOPICS.filter((t) => t.category === selectedCategory);

  const handleCreateCustomGoal = async (promptText?: string) => {
    const text = (promptText || goalInput).trim();
    if (!text || isLoading || isCreatingTopic) return;
    setIsCreatingTopic(true);
    try {
      await onCreateSessionFromTemplate('custom', text);
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleSelectSuggestedTopic = async (topic: SuggestedTopic) => {
    if (isLoading || isCreatingTopic) return;
    setIsCreatingTopic(true);
    try {
      if (topic.scenarioType && topic.scenarioType !== 'custom') {
        await onCreateSessionFromTemplate(topic.scenarioType);
      } else {
        await onCreateSessionFromTemplate('custom', topic.prompt);
      }
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleSendFreeChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = freeChatInput.trim();
    if (!trimmed || isLoading) return;
    if (onSendInteraction) {
      onSendInteraction(trimmed);
    }
    setFreeChatInput('');
  };

  useEffect(() => {
    if (activeTabMode === 'freeChat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [globalMessages, activeTabMode, isLoading]);

  return (
    <div className="w-full h-full min-h-0 overflow-hidden bg-transparent">
      {/* 2-Column Desktop Layout (Session List Sidebar + Main Topic Creation Board) */}
      <div className="w-full h-full min-h-0 overflow-hidden lg:grid lg:grid-cols-[minmax(260px,3fr)_minmax(0,9fr)] flex flex-col">
        {/* Column 1: Desktop Session List ("Đoạn chat") */}
        <SessionListSidebar
          sessionsList={sessionsList}
          activeSessionId={activeSession?.id}
          onOpenSession={(id) => {
            onOpenSession(id);
            setIsMobileSessionsOpen(false);
          }}
          onCreateNewSession={() => {
            setActiveTabMode('create');
            setIsMobileSessionsOpen(false);
            inputRef.current?.focus();
          }}
          className="hidden lg:flex w-full h-full border-r border-[#EAEFEF] dark:border-[#202E2E] bg-white dark:bg-[#101818]"
        />

        {/* Mobile / Tablet Sessions Drawer Overlay (< 1024px) */}
        {isMobileSessionsOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileSessionsOpen(false)}
            />
            <div className="relative w-[85%] max-w-[320px] h-full bg-white dark:bg-[#101818] shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between p-3 border-b border-[#EAEFEF] dark:border-[#202E2E]">
                <span className="text-xs font-bold text-lovira-title">Danh sách đoạn chat</span>
                <button
                  onClick={() => setIsMobileSessionsOpen(false)}
                  className="p-1.5 rounded-lg text-lovira-muted hover:text-lovira-title"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SessionListSidebar
                  sessionsList={sessionsList}
                  activeSessionId={activeSession?.id}
                  showHeader={false}
                  onOpenSession={(id) => {
                    onOpenSession(id);
                    setIsMobileSessionsOpen(false);
                  }}
                  onCreateNewSession={() => {
                    setActiveTabMode('create');
                    setIsMobileSessionsOpen(false);
                    inputRef.current?.focus();
                  }}
                  className="h-full border-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Column 2: Main Content Area */}
        <div className="flex-1 flex flex-col h-full min-h-0 bg-lovira-base overflow-hidden">
          {/* Top Bar Navigation */}
          <header className="h-[62px] px-4 sm:px-6 bg-white dark:bg-[#141E1E] border-b border-[#EAEFEF] dark:border-[#202E2E] flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsMobileSessionsOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-lovira-subtle hover:bg-lovira-card-hover border border-lovira text-lovira-title cursor-pointer transition-colors"
                title="Mở danh sách đoạn chat"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="w-8 h-8 rounded-xl bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold text-lovira-title truncate">
                  Tạo chủ đề & Trò chuyện
                </h1>
                <p className="text-[11px] font-semibold text-lovira-muted truncate">
                  {sessionsList.length > 0
                    ? `Bạn có ${sessionsList.length} phiên đã tạo • Chọn hoặc thêm chủ đề mới`
                    : 'Bắt đầu chủ đề đầu tiên để Lovira đồng hành cùng bạn'}
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-lovira-input rounded-xl border border-lovira">
              <button
                onClick={() => setActiveTabMode('create')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTabMode === 'create'
                    ? 'bg-[#287C78] text-white shadow-2xs'
                    : 'text-lovira-muted hover:text-lovira-title'
                }`}
              >
                Tạo chủ đề mới
              </button>
              <button
                onClick={() => setActiveTabMode('freeChat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTabMode === 'freeChat'
                    ? 'bg-[#287C78] text-white shadow-2xs'
                    : 'text-lovira-muted hover:text-lovira-title'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Hỏi đáp tự do</span>
              </button>
            </div>
          </header>

          {/* Body Content */}
          {activeTabMode === 'create' ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-6 pb-12">
                {/* Hero Greeting */}
                <div className="text-center sm:text-left space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Trợ lý lập kế hoạch & đồng hành Lovira</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-lovira-title tracking-tight">
                    Chào {userName}! Bạn muốn lên kế hoạch cho việc gì hôm nay?
                  </h2>
                  <p className="text-sm font-medium text-lovira-muted max-w-2xl leading-relaxed">
                    Nhập mục tiêu cụ thể hoặc bấm chọn các chủ đề gợi ý bên dưới. Lovira sẽ tự động phân tích và tạo danh sách việc cần làm, dặn dò từng bước bằng tiếng Việt ân cần.
                  </p>
                </div>

                {/* Custom Topic Input Card */}
                <div className="p-4 sm:p-5 rounded-[24px] bg-lovira-card border-2 border-[#287C78]/30 hover:border-[#287C78]/60 focus-within:border-[#287C78] shadow-sm transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-lovira-title uppercase tracking-wider flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[#287C78]" />
                      <span>Nhập mục tiêu của bạn:</span>
                    </label>
                    <span className="text-[11px] font-semibold text-lovira-muted">
                      100% Tiếng Việt • Phân tích tức thì
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      ref={inputRef}
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleCreateCustomGoal();
                        }
                      }}
                      placeholder="Ví dụ: Mai tôi đi khám mắt ở viện Mắt Hà Nội, Làm thủ tục đổi thẻ CCCD gắn chip, Đi chợ mua thực phẩm nấu tiệc cuối tuần..."
                      rows={3}
                      disabled={isLoading || isCreatingTopic}
                      className="w-full p-3.5 rounded-[16px] bg-lovira-input border border-lovira text-sm font-medium text-lovira-title placeholder:text-lovira-muted focus:outline-none focus:ring-1 focus:ring-[#287C78] resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-2">
                      {onStartVoice && (
                        <button
                          type="button"
                          onClick={onStartVoice}
                          disabled={isLoading || isCreatingTopic}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                            voiceStatus === 'listening'
                              ? 'bg-red-500 text-white border-red-500 animate-pulse'
                              : 'bg-lovira-subtle hover:bg-lovira-card-hover text-lovira-title border-lovira'
                          }`}
                          title="Nói mục tiêu bằng giọng nói"
                        >
                          <Mic className="w-4 h-4 text-[#287C78]" />
                          <span className="hidden sm:inline">Nói mục tiêu</span>
                        </button>
                      )}

                      {onOpenCamera && (
                        <button
                          type="button"
                          onClick={onOpenCamera}
                          disabled={isLoading || isCreatingTopic}
                          className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-lovira-subtle hover:bg-lovira-card-hover text-lovira-title border border-lovira transition-all"
                          title="Chụp ảnh đơn thuốc hoặc giấy tờ để tạo mục tiêu"
                        >
                          <Camera className="w-4 h-4 text-[#287C78]" />
                          <span className="hidden sm:inline">Chụp tài liệu/ảnh</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCreateCustomGoal()}
                      disabled={!goalInput.trim() || isLoading || isCreatingTopic}
                      className="px-5 py-2.5 rounded-xl bg-[#287C78] hover:bg-[#1F625F] disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      {isCreatingTopic || isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>AI đang lập kế hoạch...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>✨ Tạo kế hoạch thông minh</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Suggested Topics Section */}
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-lovira-subtle pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-lovira-title flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#287C78]" />
                        <span>Chủ đề gợi ý phổ biến</span>
                      </h3>
                      <p className="text-xs font-medium text-lovira-muted">
                        Bấm vào một chủ đề để Lovira tự động tạo phiên và hướng dẫn bạn từng bước
                      </p>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                      {[
                        { id: 'all', label: 'Tất cả' },
                        { id: 'health', label: '🏥 Sức khỏe' },
                        { id: 'admin', label: '🏛️ Thủ tục' },
                        { id: 'life', label: '🛒 Đời sống' },
                        { id: 'travel', label: '✈️ Đi xa' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id as any)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                            selectedCategory === cat.id
                              ? 'bg-[#287C78] text-white shadow-2xs'
                              : 'bg-lovira-card border border-lovira text-lovira-muted hover:text-lovira-title'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Topics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredTopics.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => handleSelectSuggestedTopic(topic)}
                        disabled={isLoading || isCreatingTopic}
                        className="p-4 rounded-[20px] bg-lovira-card hover:bg-[#E4F0EF]/50 dark:hover:bg-[#1B2A2A] border border-lovira hover:border-[#287C78]/60 text-left flex flex-col justify-between transition-all group shadow-2xs hover:shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div
                              className={`w-10 h-10 rounded-[14px] ${topic.iconBg} ${topic.iconColor} flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform`}
                            >
                              {topic.icon}
                            </div>
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-lovira-subtle text-lovira-muted group-hover:text-[#287C78] border border-lovira">
                              {topic.categoryLabel}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-extrabold text-lovira-title group-hover:text-[#287C78] transition-colors leading-snug">
                              {topic.title}
                            </h4>
                            <p className="text-[11px] font-medium text-lovira-muted mt-1 line-clamp-2 leading-relaxed">
                              {topic.description}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 mt-2 border-t border-lovira-subtle flex items-center justify-between text-xs font-bold text-[#287C78] dark:text-[#42A39E]">
                          <span>Bắt đầu ngay</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Free Chat Mode */
            <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 rounded-[24px] bg-lovira-card border border-lovira shadow-2xs space-y-4 custom-scrollbar">
                {globalMessages.length === 0 ? (
                  <div className="text-center py-12 space-y-4 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center mx-auto shadow-2xs">
                      <MessageSquare className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-extrabold text-lovira-title">
                        Trò chuyện tự do cùng Lovira
                      </h3>
                      <p className="text-xs font-medium text-lovira-muted leading-relaxed">
                        Bạn có thể hỏi đáp sức khỏe, thời tiết, mẹo sinh hoạt, hoặc yêu cầu Lovira giải thích bất kỳ nội dung nào.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {globalMessages.map((msg) => {
                      const isUser = msg.sender === 'user';
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isUser && (
                            <div className="w-7 h-7 rounded-full bg-[#287C78] text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] sm:max-w-[70%] p-3.5 rounded-[18px] text-xs sm:text-sm leading-relaxed ${
                              isUser
                                ? 'bg-[#287C78] text-white rounded-br-xs font-medium shadow-2xs'
                                : 'bg-lovira-subtle text-lovira-title border border-lovira rounded-bl-xs font-medium'
                            }`}
                          >
                            {msg.text}
                          </div>
                          {isUser && (
                            <div className="w-7 h-7 rounded-full bg-lovira-subtle border border-lovira text-lovira-title flex items-center justify-center shrink-0 text-xs font-bold">
                              <User className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {isLoading && (
                      <div className="flex gap-2.5 items-center">
                        <div className="w-7 h-7 rounded-full bg-[#287C78] text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Bot className="w-3.5 h-3.5 animate-spin" />
                        </div>
                        <div className="p-3 rounded-2xl bg-lovira-subtle border border-lovira text-xs font-medium text-lovira-muted animate-pulse">
                          Lovira đang trả lời...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Free Chat Input Form */}
              <form onSubmit={handleSendFreeChat} className="flex gap-2 pt-3">
                <input
                  type="text"
                  value={freeChatInput}
                  onChange={(e) => setFreeChatInput(e.target.value)}
                  placeholder="Nhập câu hỏi hoặc nội dung trò chuyện..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-[16px] bg-lovira-card border border-lovira text-xs sm:text-sm font-medium text-lovira-title placeholder:text-lovira-muted focus:outline-none focus:ring-1 focus:ring-[#287C78] shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!freeChatInput.trim() || isLoading}
                  className="px-5 py-3 rounded-[16px] bg-[#287C78] hover:bg-[#1F625F] disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
                {globalMessages.length > 0 && onClearGlobalChat && (
                  <button
                    type="button"
                    onClick={onClearGlobalChat}
                    className="p-3 rounded-[16px] border border-lovira text-lovira-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Xóa lịch sử trò chuyện"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
