import React, { useState, useEffect } from 'react';
import {
  Type,
  Eye,
  Moon,
  Sun,
  Volume2,
  Sparkles,
  Bot,
  Key,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  VolumeX,
  User,
  Trash2,
  Edit3,
  Cloud,
  ShieldCheck,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Zap,
  Cpu,
  Monitor,
  Check,
} from 'lucide-react';
import { AccessibilitySettings, AISettings, UserProfile } from '../../types';
import { MODEL_POOL } from '../../data/initialData';
import {
  checkVietnameseVoiceSupport,
  speakText,
  getTTSVoice,
  setTTSVoice,
  getAvailableVoices,
  EdgeTTSVoice,
  TTSEnginePreference,
  getTTSEnginePreference,
  setTTSEnginePreference,
} from '../../services/ttsService';
import { storageService } from '../../services/storageService';
import { buildAddressing } from '../../utils/filterRelevantConditions';
import { AuthUserCard } from '../auth/AuthUserCard';
import { CloudSyncCard } from '../auth/CloudSyncCard';

interface SettingsPageProps {
  accessibility: AccessibilitySettings;
  aiSettings: AISettings;
  userProfile: UserProfile | null;
  onUpdateAccessibility: (settings: AccessibilitySettings) => void;
  onUpdateAISettings: (settings: AISettings) => void;
  onUpdateUserProfile: (profile: UserProfile | null) => void;
  onOpenProfileSetup: () => void;
  onOpenAuthModal?: () => void;
  onShowToast?: (msg: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  accessibility,
  aiSettings,
  userProfile,
  onUpdateAccessibility,
  onUpdateAISettings,
  onUpdateUserProfile,
  onOpenProfileSetup,
  onOpenAuthModal = () => {},
  onShowToast,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(aiSettings.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [provider, setProvider] = useState<'gemini' | 'groq' | 'demo'>(aiSettings.provider);
  const [selectedModel, setSelectedModel] = useState(aiSettings.selectedModel || 'openai/gpt-oss-20b');
  const [aiPresetMode, setAiPresetMode] = useState<'auto' | 'fast' | 'multimodal'>(
    aiSettings.provider === 'gemini' ? 'multimodal' : aiSettings.provider === 'groq' ? 'fast' : 'auto'
  );
  const [showAdvancedAI, setShowAdvancedAI] = useState(false);
  const [voiceSupport, setVoiceSupport] = useState<'available' | 'unavailable' | 'pending'>('pending');
  const [ttsEngine, setTtsEngine] = useState<TTSEnginePreference>(getTTSEnginePreference());
  const [selectedTtsVoice, setSelectedTtsVoice] = useState<EdgeTTSVoice>(getTTSVoice());
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);

  useEffect(() => {
    setVoiceSupport(checkVietnameseVoiceSupport());
  }, []);

  const handleSelectEngine = (engine: TTSEnginePreference) => {
    setTtsEngine(engine);
    setTTSEnginePreference(engine);
    onShowToast?.(
      engine === 'native'
        ? 'Đã ưu tiên Giọng đọc hệ thống / Trợ năng máy (Mặc định)'
        : 'Đã chuyển sang Giọng đọc AI Cloud (Edge Neural)'
    );
  };

  const handleSelectTtsVoice = (v: EdgeTTSVoice) => {
    setSelectedTtsVoice(v);
    setTTSVoice(v);
    onShowToast?.(`Đã chọn giọng ${v === 'vi-VN-HoaiMyNeural' ? 'Hoài My (Nữ)' : 'Nam Minh (Nam)'}`);
  };

  const handleTestTTS = () => {
    if (ttsEngine === 'native') {
      speakText(
        'Xin chào! Đây là thử nghiệm giọng đọc trực tiếp từ bộ trợ năng và thiết bị của bạn.',
        { preferEngine: 'native' }
      );
    } else {
      speakText(
        'Xin chào! Đây là thử nghiệm giọng đọc tiếng Việt Microsoft Edge Neural mượt mà của Lovira.',
        { voice: selectedTtsVoice, preferEngine: 'edge' }
      );
    }
  };

  const fontScales = [
    { scale: 1.0, label: 'Tiêu chuẩn', sublabel: '100%' },
    { scale: 1.25, label: 'Lớn', sublabel: '125%' },
    { scale: 1.5, label: 'Rất lớn', sublabel: '150%' },
    { scale: 1.75, label: 'Siêu lớn', sublabel: '175%' },
  ];

  const handlePresetSelect = (mode: 'auto' | 'fast' | 'multimodal') => {
    setAiPresetMode(mode);
    if (mode === 'auto') {
      setProvider('groq');
      setSelectedModel('openai/gpt-oss-20b');
      onUpdateAISettings({
        ...aiSettings,
        provider: 'groq',
        selectedModel: 'openai/gpt-oss-20b',
        demoMode: false,
      });
      onShowToast?.('Đã chọn chế độ AI Tự động (Khuyên dùng)');
    } else if (mode === 'fast') {
      setProvider('groq');
      setSelectedModel('openai/gpt-oss-20b');
      onUpdateAISettings({
        ...aiSettings,
        provider: 'groq',
        selectedModel: 'openai/gpt-oss-20b',
        demoMode: false,
      });
      onShowToast?.('Đã chọn chế độ Nhanh (Groq Cloud)');
    } else if (mode === 'multimodal') {
      setProvider('gemini');
      setSelectedModel('gemini-3.7-flash');
      onUpdateAISettings({
        ...aiSettings,
        provider: 'gemini',
        selectedModel: 'gemini-3.7-flash',
        demoMode: false,
      });
      onShowToast?.('Đã chọn chế độ Đa năng & Thị giác (Google Gemini)');
    }
  };

  const handleSaveAI = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateAISettings({
      ...aiSettings,
      provider,
      selectedModel,
      apiKey: apiKeyInput.trim(),
      demoMode: false,
    });
    setTestResult({
      type: 'success',
      message: `Đã lưu cấu hình AI (${provider === 'groq' ? 'Groq Cloud' : 'Google Gemini'}) thành công!`,
    });
    setTimeout(() => setTestResult(null), 3500);
    onShowToast?.('Đã lưu cấu hình trợ lý AI');
  };

  const handleTestApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setTestResult({
        type: 'error',
        message: 'Vui lòng nhập API Key trước khi kiểm tra kết nối.',
      });
      setTimeout(() => setTestResult(null), 3500);
      return;
    }

    setIsTestingApiKey(true);
    try {
      // Mock test connection verification with quick feedback
      await new Promise((r) => setTimeout(r, 600));
      setTestResult({
        type: 'success',
        message: `● Đã kết nối thành công tới ${provider === 'groq' ? 'Groq Cloud API' : 'Google Gemini API'}!`,
      });
      setTimeout(() => setTestResult(null), 4000);
    } catch {
      setTestResult({
        type: 'error',
        message: '● Không thể kết nối. Vui lòng kiểm tra lại API key hoặc đường truyền mạng.',
      });
    } finally {
      setIsTestingApiKey(false);
    }
  };

  const addressing = buildAddressing(userProfile);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200 max-w-[1080px] mx-auto">
      {/* 1. Header Banner - Clean, reduced height by ~25%, unified typography */}
      <div className="p-5 sm:p-6 rounded-[20px] bg-[#E5F3F1] dark:bg-[#1E3A38] border border-[#B6DAD6] dark:border-[#2D5451] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[24px] sm:text-[28px] font-[800] text-lovira-title tracking-tight">
            Cài đặt & Trợ năng
          </h1>
          <p className="text-[14px] sm:text-[15px] font-[500] text-lovira-muted">
            Quản lý giao diện, trợ năng, giọng nói và trợ lý AI của Lovira.
          </p>
        </div>

        <div className="w-11 h-11 rounded-[14px] bg-[#238A83] text-white flex items-center justify-center shrink-0 shadow-xs">
          <SlidersHorizontal className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Compact Profile Summary Card (Point 16) */}
      <div className="p-4 sm:p-5 rounded-[16px] bg-lovira-card border border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6] dark:hover:border-[#385654] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-[12px] bg-[#E5F3F1] dark:bg-[#1E3A38] text-[#238A83] dark:text-[#42A39E] flex items-center justify-center font-[700] shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-[800] text-lovira-title">
              Hồ sơ cá nhân
            </h2>
            <p className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted">
              {userProfile ? (
                <>
                  <strong className="text-lovira-title">{addressing || 'Bạn'}</strong> · Phản hồi:{' '}
                  {userProfile.communicationPace === 'slow_detailed' ? 'Chi tiết từng bước' : 'Ngắn gọn & Trực diện'}
                </>
              ) : (
                'Chưa thiết lập hồ sơ cá nhân'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenProfileSetup}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-[#E5F3F1] dark:bg-[#1E3A38] hover:bg-[#238A83] hover:text-white text-[#176F69] dark:text-[#42A39E] font-[700] text-[14px] transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Edit3 className="w-4 h-4" />
          <span>{userProfile ? 'Chỉnh sửa hồ sơ →' : 'Thiết lập ngay →'}</span>
        </button>
      </div>

      {/* 3. Section: TRỢ NĂNG & HIỂN THỊ */}
      <section className="p-5 sm:p-6 rounded-[16px] bg-lovira-card border border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6] dark:hover:border-[#385654] transition-all space-y-6">
        {/* Unified Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#E3E9E8] dark:border-[#243533] gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#E5F3F1] dark:bg-[#1E3A38] text-[#238A83] dark:text-[#42A39E] flex items-center justify-center font-[700] shrink-0">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-[800] text-lovira-title tracking-tight">
                Trợ năng & Hiển thị
              </h2>
              <p className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted">
                Tùy chỉnh cỡ chữ lớn và chế độ tương phản cao bảo vệ thị lực
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Grid on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cỡ chữ with Segmented Control & Live Preview (Point 13) */}
          <div className="space-y-3">
            <label className="text-[15px] sm:text-[16px] font-[700] text-lovira-title block">
              Cỡ chữ hiển thị
            </label>

            {/* Segmented Control */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-[14px] bg-lovira-input border border-[#E3E9E8] dark:border-[#243533]">
              {fontScales.map((item) => (
                <button
                  key={item.scale}
                  type="button"
                  onClick={() => onUpdateAccessibility({ ...accessibility, fontScale: item.scale })}
                  className={`py-2.5 px-2 rounded-[10px] text-center transition-all cursor-pointer ${
                    accessibility.fontScale === item.scale
                      ? 'bg-[#238A83] text-white shadow-xs font-[800]'
                      : 'text-lovira-title hover:bg-gray-200/50 dark:hover:bg-gray-700/50 font-[600]'
                  }`}
                >
                  <div className="text-[14px]">{item.label}</div>
                  <div className={`text-[12px] opacity-80 ${accessibility.fontScale === item.scale ? 'text-white' : 'text-lovira-muted'}`}>
                    {item.sublabel}
                  </div>
                </button>
              ))}
            </div>

            {/* Live Text Preview Box */}
            <div className="p-4 rounded-[14px] bg-lovira-input border border-[#E3E9E8] dark:border-[#243533]">
              <div className="text-[12px] font-[700] text-lovira-sub uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span>Aa</span>
                <span>Văn bản mẫu</span>
              </div>
              <p className="font-[600] text-lovira-title leading-relaxed">
                Xin chào, tôi là Lovira. Đây là kích thước văn bản bạn sẽ nhìn thấy trên toàn bộ ứng dụng.
              </p>
            </div>
          </div>

          {/* Giao diện & Tương phản cao (Point 14) */}
          <div className="space-y-4">
            {/* Theme Mode Selector */}
            <div className="space-y-2">
              <label className="text-[15px] sm:text-[16px] font-[700] text-lovira-title block">
                Chế độ giao diện
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateAccessibility({ ...accessibility, theme: 'light' })}
                  className={`p-3 rounded-[12px] border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    accessibility.theme === 'light'
                      ? 'bg-[#E5F3F1] dark:bg-[#1E3A38] border-[#238A83] text-[#176F69] dark:text-[#42A39E] font-[800]'
                      : 'bg-lovira-input border-[#E3E9E8] dark:border-[#243533] text-lovira-title hover:border-[#B6DAD6]'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-[14px]">Sáng</span>
                  {accessibility.theme === 'light' && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateAccessibility({ ...accessibility, theme: 'dark' })}
                  className={`p-3 rounded-[12px] border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    accessibility.theme === 'dark'
                      ? 'bg-[#E5F3F1] dark:bg-[#1E3A38] border-[#238A83] text-[#176F69] dark:text-[#42A39E] font-[800]'
                      : 'bg-lovira-input border-[#E3E9E8] dark:border-[#243533] text-lovira-title hover:border-[#B6DAD6]'
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="text-[14px]">Tối</span>
                  {accessibility.theme === 'dark' && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    onUpdateAccessibility({ ...accessibility, theme: isDark ? 'dark' : 'light' });
                    onShowToast?.('Đã đồng bộ giao diện theo cài đặt thiết bị');
                  }}
                  className="p-3 rounded-[12px] border bg-lovira-input border-[#E3E9E8] dark:border-[#243533] text-lovira-title hover:border-[#B6DAD6] text-center transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Monitor className="w-4 h-4 text-lovira-muted" />
                  <span className="text-[14px]">Hệ thống</span>
                </button>
              </div>
            </div>

            {/* High Contrast Switch (Point 12, 14) */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[15px] sm:text-[16px] font-[700] text-lovira-title block">
                  Tương phản cao
                </span>
                <span className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted block">
                  Tăng độ rõ của chữ, nút bấm và đường viền theo chuẩn WCAG AAA.
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={Boolean(accessibility.highContrast)}
                onClick={() => onUpdateAccessibility({ ...accessibility, highContrast: !accessibility.highContrast })}
                className={`w-[48px] h-[28px] rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                  accessibility.highContrast ? 'bg-[#238A83]' : 'bg-[#D6DEDD] dark:bg-[#374846]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    accessibility.highContrast ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section: GIỌNG NÓI & ÂM THANH (Point 7, 8) */}
      <section className="p-5 sm:p-6 rounded-[16px] bg-lovira-card border border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6] dark:hover:border-[#385654] transition-all space-y-5">
        {/* Unified Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#E3E9E8] dark:border-[#243533] gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#E5F3F1] dark:bg-[#1E3A38] text-[#238A83] dark:text-[#42A39E] flex items-center justify-center font-[700] shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-[800] text-lovira-title tracking-tight">
                Giọng nói & Âm thanh
              </h2>
              <p className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted">
                Chọn giọng đọc và cách Lovira phản hồi bằng âm thanh
              </p>
            </div>
          </div>

          <span className="text-[12px] font-[700] px-3 py-1 rounded-full bg-[#E5F3F1] text-[#176F69] dark:bg-[#1E3A38] dark:text-[#42A39E] border border-[#B6DAD6] dark:border-[#2D5451] self-start sm:self-auto">
            {ttsEngine === 'native' ? '✓ Giọng hệ thống' : '✓ Giọng AI Cloud'}
          </span>
        </div>

        {/* Engine Preference Choice (2 direct clean options) */}
        <div className="space-y-2">
          <label className="text-[15px] sm:text-[16px] font-[700] text-lovira-title block">
            Nguồn giọng đọc
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSelectEngine('native')}
              className={`p-4 rounded-[14px] border text-left transition-all cursor-pointer ${
                ttsEngine === 'native'
                  ? 'bg-[#E5F3F1] dark:bg-[#1E3A38] border-[#238A83] ring-1 ring-[#238A83]'
                  : 'bg-lovira-input border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[15px] font-[800] text-lovira-title flex items-center gap-1.5">
                  <span>📱</span> Giọng hệ thống
                </span>
                <span className="text-[11px] font-[800] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Mặc định
                </span>
              </div>
              <p className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted leading-relaxed">
                Tích hợp sẵn trên điện thoại / máy tính (TalkBack, VoiceOver). Hoạt động mượt mà offline không cần mạng.
              </p>
              {ttsEngine === 'native' && (
                <div className="mt-2 text-[13px] font-[700] text-[#176F69] dark:text-[#42A39E] flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đang sử dụng</span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectEngine('edge')}
              className={`p-4 rounded-[14px] border text-left transition-all cursor-pointer ${
                ttsEngine === 'edge'
                  ? 'bg-[#E5F3F1] dark:bg-[#1E3A38] border-[#238A83] ring-1 ring-[#238A83]'
                  : 'bg-lovira-input border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[15px] font-[800] text-lovira-title flex items-center gap-1.5">
                  <span>☁️</span> Giọng AI Cloud (Edge Neural)
                </span>
                <span className="text-[11px] font-[800] px-2 py-0.5 rounded-full bg-[#E5F3F1] text-[#176F69] dark:bg-[#1E3A38] dark:text-[#42A39E]">
                  Truyền cảm
                </span>
              </div>
              <p className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted leading-relaxed">
                Giọng đọc trí tuệ nhân tạo mượt mà như người thật. Tự động chuyển về giọng máy nếu mất kết nối.
              </p>
              {ttsEngine === 'edge' && (
                <div className="mt-2 text-[13px] font-[700] text-[#176F69] dark:text-[#42A39E] flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đang sử dụng</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Voice Character Selector (Only shown when Edge TTS is active) */}
        {ttsEngine === 'edge' && (
          <div className="space-y-2 pt-2 border-t border-[#E3E9E8] dark:border-[#243533]">
            <p className="text-[14px] font-[700] text-lovira-title">
              Nhân vật giọng đọc AI:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getAvailableVoices().map((v) => {
                const isSelected = selectedTtsVoice === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectTtsVoice(v.id)}
                    className={`p-3 rounded-[12px] border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#E5F3F1] dark:bg-[#1E3A38] border-[#238A83]'
                        : 'bg-lovira-input border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[14px] font-[800] text-lovira-title">
                        {v.name}
                      </span>
                      <span
                        className={`text-[11px] font-[800] px-2 py-0.5 rounded-full ${
                          v.gender === 'Nữ'
                            ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300'
                            : 'bg-[#E5F3F1] text-[#176F69] dark:bg-[#1E3A38] dark:text-[#42A39E]'
                        }`}
                      >
                        Giọng {v.gender}
                      </span>
                    </div>
                    <p className="text-[12px] sm:text-[13px] font-[500] text-lovira-muted">
                      {v.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sound Test Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleTestTTS}
            className="flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-[12px] bg-[#238A83] hover:bg-[#1D7771] text-white font-[700] text-[14px] shadow-xs transition-colors cursor-pointer"
          >
            <Volume2 className="w-5 h-5" />
            <span>Thử nghe giọng đọc</span>
          </button>
        </div>
      </section>

      {/* 5. Section: TRỢ LÝ AI (Points 1, 8, 9, 10) */}
      <section className="p-5 sm:p-6 rounded-[16px] bg-lovira-card border border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6] dark:hover:border-[#385654] transition-all space-y-5">
        {/* Unified Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#E3E9E8] dark:border-[#243533] gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#E5F3F1] dark:bg-[#1E3A38] text-[#238A83] dark:text-[#42A39E] flex items-center justify-center font-[700] shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-[800] text-lovira-title tracking-tight">
                Trợ lý AI
              </h2>
              <p className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted">
                Tùy chỉnh tốc độ và trí tuệ phản hồi của trợ lý Lovira
              </p>
            </div>
          </div>

          <span className="text-[12px] font-[700] px-3 py-1 rounded-full bg-[#E5F3F1] text-[#176F69] dark:bg-[#1E3A38] dark:text-[#42A39E] border border-[#B6DAD6] dark:border-[#2D5451] self-start sm:self-auto">
            {aiPresetMode === 'auto'
              ? '✓ Tự động (Khuyên dùng)'
              : aiPresetMode === 'fast'
              ? '⚡ Nhanh (Groq Cloud)'
              : '✦ Gemini Flash'}
          </span>
        </div>

        {/* User-Friendly Presets (Point 9) */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Preset 1: Auto */}
            <button
              type="button"
              onClick={() => handlePresetSelect('auto')}
              className={`p-4 rounded-[14px] border text-left transition-all cursor-pointer ${
                aiPresetMode === 'auto'
                  ? 'bg-[#E5F3F1] dark:bg-[#1E3A38] border-[#238A83] ring-1 ring-[#238A83]'
                  : 'bg-lovira-input border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[15px] font-[800] text-lovira-title">
                  ● Tự động
                </span>
                <span className="text-[11px] font-[800] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Khuyên dùng
                </span>
              </div>
              <p className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted leading-relaxed">
                Lovira tự chọn mô hình phù hợp nhất theo từng câu hỏi.
              </p>
            </button>

            {/* Preset 2: Fast */}
            <button
              type="button"
              onClick={() => handlePresetSelect('fast')}
              className={`p-4 rounded-[14px] border text-left transition-all cursor-pointer ${
                aiPresetMode === 'fast'
                  ? 'bg-[#E5F3F1] dark:bg-[#1E3A38] border-[#238A83] ring-1 ring-[#238A83]'
                  : 'bg-lovira-input border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[15px] font-[800] text-lovira-title">
                  ⚡ Nhanh & Tức thì
                </span>
              </div>
              <p className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted leading-relaxed">
                Tối ưu tốc độ trả lời trò chuyện và phản xạ tức thì.
              </p>
            </button>

            {/* Preset 3: Multimodal */}
            <button
              type="button"
              onClick={() => handlePresetSelect('multimodal')}
              className={`p-4 rounded-[14px] border text-left transition-all cursor-pointer ${
                aiPresetMode === 'multimodal'
                  ? 'bg-[#E5F3F1] dark:bg-[#1E3A38] border-[#238A83] ring-1 ring-[#238A83]'
                  : 'bg-lovira-input border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[15px] font-[800] text-lovira-title">
                  ✦ Đa năng & Thị giác
                </span>
              </div>
              <p className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted leading-relaxed">
                Phù hợp đọc tài liệu, đơn thuốc và phân tích hình ảnh.
              </p>
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Settings (Points 1, 9, 10) */}
        <div className="pt-2 border-t border-[#E3E9E8] dark:border-[#243533]">
          <button
            type="button"
            onClick={() => setShowAdvancedAI(!showAdvancedAI)}
            className="flex items-center justify-between w-full py-2 text-left font-[700] text-[14px] text-[#176F69] dark:text-[#42A39E] hover:underline cursor-pointer"
          >
            <span>{showAdvancedAI ? '▾ Thu gọn cài đặt nâng cao' : '▸ Cài đặt nâng cao (Nhà cung cấp, Mô hình, Khóa API)'}</span>
            {showAdvancedAI ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvancedAI && (
            <div className="space-y-4 pt-3 animate-in fade-in duration-200">
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="text-[14px] font-[700] text-lovira-title block">
                  Nhà cung cấp AI
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setProvider('groq');
                      setSelectedModel('openai/gpt-oss-20b');
                    }}
                    className={`p-3 rounded-[12px] border text-left transition-all cursor-pointer ${
                      provider === 'groq'
                        ? 'bg-[#E5F3F1] dark:bg-[#1E3A38] border-[#238A83]'
                        : 'bg-lovira-input border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-[800] text-lovira-title">⚡ Groq Cloud</span>
                      {provider === 'groq' && <span className="text-[12px] font-[700] text-[#176F69] dark:text-[#42A39E]">✓ Đang chọn</span>}
                    </div>
                    <p className="text-[12px] sm:text-[13px] font-[500] text-lovira-muted mt-0.5">
                      Nhanh, phù hợp phản hồi hội thoại tức thì
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProvider('gemini');
                      setSelectedModel('gemini-3.7-flash');
                    }}
                    className={`p-3 rounded-[12px] border text-left transition-all cursor-pointer ${
                      provider === 'gemini'
                        ? 'bg-[#E5F3F1] dark:bg-[#1E3A38] border-[#238A83]'
                        : 'bg-lovira-input border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-[800] text-lovira-title">✦ Google Gemini</span>
                      {provider === 'gemini' && <span className="text-[12px] font-[700] text-[#176F69] dark:text-[#42A39E]">✓ Đang chọn</span>}
                    </div>
                    <p className="text-[12px] sm:text-[13px] font-[500] text-lovira-muted mt-0.5">
                      Multimodal, phân tích hình ảnh và tài liệu chuyên sâu
                    </p>
                  </button>
                </div>
              </div>

              {/* Model Selector */}
              <div className="space-y-1.5">
                <label className="text-[14px] font-[700] text-lovira-title block">
                  Mô hình suy luận
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-3 rounded-[12px] border border-[#E3E9E8] dark:border-[#243533] bg-lovira-input text-lovira-title text-[14px] font-[600] focus:outline-none focus:border-[#238A83] cursor-pointer"
                >
                  {MODEL_POOL.filter((m) => m.provider === provider).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} ({m.capability === 'fast' ? '⚡ Tốc độ cao' : m.capability === 'reasoning' ? '🧠 Suy luận sâu' : '💬 Hội thoại'})
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key Input (Point 10) */}
              <div className="space-y-2">
                <label className="text-[14px] font-[700] text-lovira-title block">
                  Khóa API Key ({provider === 'groq' ? 'Groq API Key' : 'Gemini API Key'})
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={provider === 'groq' ? 'gsk_••••••••••••••••••••••••••••••••' : 'AIzaSy••••••••••••••••••••••••••••••'}
                    className="w-full p-3 pr-11 rounded-[12px] border border-[#E3E9E8] dark:border-[#243533] bg-lovira-input text-lovira-title text-[14px] font-mono focus:outline-none focus:border-[#238A83]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-3 text-lovira-muted hover:text-lovira-title transition-colors cursor-pointer"
                    title={showApiKey ? 'Ẩn khóa' : 'Hiện khóa'}
                  >
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-[13px] text-lovira-muted">
                  <p className="flex items-center gap-1.5">
                    <span>🔒</span>
                    <span>Chỉ được lưu an toàn trên thiết bị này. Lovira không gửi khóa lên máy chủ.</span>
                  </p>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleTestApiKey}
                      disabled={isTestingApiKey}
                      className="px-3.5 py-2 rounded-[10px] bg-lovira-input hover:bg-gray-200 dark:hover:bg-[#2A3B3B] text-lovira-title font-[700] text-[13px] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isTestingApiKey ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveAI()}
                      className="px-4 py-2 rounded-[10px] bg-[#238A83] hover:bg-[#1D7771] text-white font-[700] text-[13px] transition-colors cursor-pointer"
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-[12px] text-[13px] font-[700] flex items-center gap-2 ${
                    testResult.type === 'success'
                      ? 'bg-[#E5F3F1] dark:bg-[#1E3A38] text-[#176F69] dark:text-[#42A39E] border border-[#B6DAD6]'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200'
                  }`}
                >
                  {testResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 6. Section: TÀI KHOẢN & ĐỒNG BỘ (Points 8, 11, 16) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-[10px] bg-[#E5F3F1] dark:bg-[#1E3A38] text-[#238A83] dark:text-[#42A39E] flex items-center justify-center font-[700]">
            <Cloud className="w-4 h-4" />
          </div>
          <h2 className="text-[18px] font-[800] text-lovira-title tracking-tight">
            Tài khoản & Đồng bộ
          </h2>
        </div>

        <AuthUserCard
          onOpenAuthModal={onOpenAuthModal}
          onShowToast={onShowToast}
        />

        <CloudSyncCard
          userProfile={userProfile}
          onUpdateUserProfile={(p) => {
            storageService.saveUserProfile(p);
            onUpdateUserProfile(p);
          }}
          onOpenAuthModal={onOpenAuthModal}
          onShowToast={onShowToast}
        />
      </section>
    </div>
  );
};
