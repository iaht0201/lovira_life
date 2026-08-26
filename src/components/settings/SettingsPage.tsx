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
  const [provider, setProvider] = useState<'gemini' | 'groq' | 'demo'>(aiSettings.provider);
  const [selectedModel, setSelectedModel] = useState(aiSettings.selectedModel || 'gemini-2.5-flash');
  const [voiceSupport, setVoiceSupport] = useState<'available' | 'unavailable' | 'pending'>('pending');
  const [ttsEngine, setTtsEngine] = useState<TTSEnginePreference>(getTTSEnginePreference());
  const [selectedTtsVoice, setSelectedTtsVoice] = useState<EdgeTTSVoice>(getTTSVoice());
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setVoiceSupport(checkVietnameseVoiceSupport());
  }, []);

  const handleSelectEngine = (engine: TTSEnginePreference) => {
    setTtsEngine(engine);
    setTTSEnginePreference(engine);
    onShowToast?.(
      engine === 'native'
        ? 'Đã ưu tiên Giọng đọc máy / Trợ năng thiết bị (Mặc định)'
        : 'Đã chuyển sang Giọng đọc AI Cloud (Microsoft Edge Neural)'
    );
  };

  const handleSelectTtsVoice = (v: EdgeTTSVoice) => {
    setSelectedTtsVoice(v);
    setTTSVoice(v);
    onShowToast?.(`Đã chọn giọng đọc ${v === 'vi-VN-HoaiMyNeural' ? 'Hoài My (Nữ)' : 'Nam Minh (Nam)'}`);
  };

  const handleTestTTS = () => {
    if (ttsEngine === 'native') {
      speakText(
        'Xin chào! Đây là thử nghiệm giọng đọc trực tiếp từ bộ trợ năng và thiết bị của bạn.',
        { preferEngine: 'native' }
      );
    } else {
      speakText(
        'Xin chào! Đây là thử nghiệm giọng đọc tiếng Việt Microsoft Edge Neural mượt mà của ứng dụng Lovira Life.',
        { voice: selectedTtsVoice, preferEngine: 'edge' }
      );
    }
  };

  const fontScales = [
    { scale: 1.0, label: '100% (Tiêu chuẩn)' },
    { scale: 1.25, label: '125% (Lớn)' },
    { scale: 1.5, label: '150% (Rất lớn)' },
    { scale: 1.75, label: '175% (Siêu lớn)' },
  ];

  const handleSaveAI = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAISettings({
      ...aiSettings,
      provider: 'gemini',
      selectedModel: 'gemini-2.5-flash',
      apiKey: apiKeyInput.trim(),
      demoMode: false,
    });
    setTestResult('Đã lưu Gemini API Key thành công!');
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleToggleHealthSync = () => {
    if (!userProfile) return;
    const updated: UserProfile = {
      ...userProfile,
      syncHealthToCloud: !userProfile.syncHealthToCloud,
      updatedAt: new Date().toISOString(),
    };
    storageService.saveUserProfile(updated);
    onUpdateUserProfile(updated);
  };

  const handleClearProfile = () => {
    storageService.clearUserProfile();
    onUpdateUserProfile(null);
    setShowClearConfirm(false);
  };

  const addressing = buildAddressing(userProfile);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-[24px] bg-[#E4F0EF] dark:bg-[#203A39] border border-[#287C78]/30 shadow-lovira relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-[22px] sm:text-[26px] font-[800] text-lovira-title tracking-tight">
              Cài đặt hệ thống & Trợ năng
            </h2>
            <p className="text-[13px] font-[500] text-lovira-muted">
              Tùy chỉnh cỡ chữ, độ tương phản, giọng đọc tiếng Việt và cấu hình AI Lovira
            </p>
          </div>

          <div className="w-[48px] h-[48px] rounded-[16px] bg-[#287C78] text-white flex items-center justify-center shrink-0 shadow-xs">
            <SlidersHorizontal className="w-[24px] h-[24px]" />
          </div>
        </div>
      </div>

      {/* 1. USER PROFILE & PERSONALIZATION SECTION */}
      <section className="p-6 rounded-[22px] bg-lovira-card border border-lovira shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-lovira-subtle pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-[36px] h-[36px] rounded-[12px] bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center font-[700]">
              <User className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="text-[16px] font-[800] text-lovira-title">
                Tóm tắt Hồ sơ cá nhân
              </h3>
              <p className="text-[12px] font-[500] text-lovira-muted">
                Danh xưng và tùy chỉnh riêng khi Lovira phản hồi
              </p>
            </div>
          </div>

          <button
            onClick={onOpenProfileSetup}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] bg-[#E4F0EF] dark:bg-[#203A39] hover:bg-[#287C78] hover:text-white text-[#287C78] dark:text-[#42A39E] font-[700] text-[12px] transition-all cursor-pointer"
          >
            <Edit3 className="w-[14px] h-[14px]" />
            <span>{userProfile ? 'Chỉnh sửa hồ sơ' : 'Thêm hồ sơ ngay'}</span>
          </button>
        </div>

        {userProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-[14px] border border-lovira bg-lovira-input space-y-1">
                <span className="text-[11px] font-[700] uppercase tracking-wider text-lovira-sub">Cách xưng hô:</span>
                <span className="text-[14px] font-[700] text-lovira-title block">
                  {addressing || 'Bạn'}
                </span>
              </div>

              <div className="p-3.5 rounded-[14px] border border-lovira bg-lovira-input space-y-1">
                <span className="text-[11px] font-[700] uppercase tracking-wider text-lovira-sub">Tốc độ & Độ chi tiết:</span>
                <span className="text-[14px] font-[700] text-lovira-title block">
                  {userProfile.communicationPace === 'slow_detailed'
                    ? '🌱 Hướng dẫn chi tiết từng bước'
                    : '⚡ Ngắn gọn & Trực diện'}
                </span>
              </div>

              {userProfile.hasCaregiverContact && (
                <div className="p-3.5 rounded-[14px] border border-lovira bg-lovira-input space-y-1 col-span-1 sm:col-span-2">
                  <span className="text-[11px] font-[700] uppercase tracking-wider text-lovira-sub">Người thân liên hệ:</span>
                  <span className="text-[14px] font-[700] text-lovira-title block">
                    {userProfile.caregiverName || 'Người thân'} — {userProfile.caregiverPhone || 'Chưa nhập SĐT'}
                  </span>
                </div>
              )}

              {userProfile.selfReportedConditions && userProfile.selfReportedConditions.length > 0 && (
                <div className="p-3.5 rounded-[14px] border border-lovira bg-lovira-input space-y-1.5 col-span-1 sm:col-span-2">
                  <span className="text-[11px] font-[700] uppercase tracking-wider text-lovira-sub">Lưu ý sức khỏe / Món kiêng:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {userProfile.selfReportedConditions.map((cond, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-[8px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[12px] font-[700]">
                        {cond}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cloud Health Sync Toggle */}
            <div className="p-4 rounded-[16px] border border-lovira bg-lovira-input flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-[700] text-[13px] text-lovira-title">
                  <Cloud className="w-[16px] h-[16px] text-[#287C78] dark:text-[#42A39E]" />
                  <span>Đồng bộ thông tin cá nhân lên đám mây</span>
                </div>
                <p className="text-[11px] font-[500] text-lovira-muted">
                  Mặc định TẮT. Chỉ bật nếu bạn muốn đồng bộ dữ liệu hồ sơ cá nhân qua đám mây.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleHealthSync}
                className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                  userProfile.syncHealthToCloud ? 'bg-[#287C78]' : 'bg-gray-400'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    userProfile.syncHealthToCloud ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-[16px] border border-dashed border-lovira bg-lovira-input text-center space-y-2">
            <p className="text-[13px] font-[500] text-lovira-muted">
              Chưa có thông tin cá nhân. Bổ sung hồ sơ giúp Lovira xưng hô đúng cách và gợi ý chính xác hơn.
            </p>
            <button
              onClick={onOpenProfileSetup}
              className="px-4 py-2 rounded-[12px] bg-[#287C78] text-white text-[12px] font-[700] shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              Thiết lập hồ sơ cá nhân
            </button>
          </div>
        )}
      </section>

      {/* 2. ACCESSIBILITY SECTION */}
      <section className="p-6 rounded-[22px] bg-lovira-card border border-lovira shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-lovira-subtle pb-3.5">
          <div className="w-[36px] h-[36px] rounded-[12px] bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center font-[700]">
            <Type className="w-[18px] h-[18px]" />
          </div>
          <div>
            <h3 className="text-[16px] font-[800] text-lovira-title">
              Trợ năng & Hiển thị
            </h3>
            <p className="text-[12px] font-[500] text-lovira-muted">Tùy chỉnh cỡ chữ và giao diện tương phản cao</p>
          </div>
        </div>

        {/* Font Scaling */}
        <div className="space-y-2">
          <label className="text-[12px] font-[700] text-lovira-title block">
            Cỡ chữ hiển thị
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {fontScales.map((item) => (
              <button
                key={item.scale}
                onClick={() => onUpdateAccessibility({ ...accessibility, fontScale: item.scale })}
                className={`p-3 rounded-[14px] border text-[12px] font-[700] transition-all cursor-pointer ${
                  accessibility.fontScale === item.scale
                    ? 'bg-[#287C78] text-white border-[#287C78] shadow-2xs'
                    : 'bg-lovira-input border-lovira hover:border-[#287C78] text-lovira-title'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* High Contrast & Theme */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-4 rounded-[16px] border border-lovira bg-lovira-input flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[13px] font-[700] text-lovira-title block">Tương phản cao</span>
              <span className="text-[11px] font-[500] text-lovira-muted block">Tăng tối đa độ tương phản WCAG AAA</span>
            </div>
            <button
              onClick={() => onUpdateAccessibility({ ...accessibility, highContrast: !accessibility.highContrast })}
              className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                accessibility.highContrast ? 'bg-amber-400' : 'bg-gray-400'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  accessibility.highContrast ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-[16px] border border-lovira bg-lovira-input flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[13px] font-[700] text-lovira-title block">Chế độ giao diện</span>
              <span className="text-[11px] font-[500] text-lovira-muted block">
                {accessibility.theme === 'dark' ? 'Giao diện Tối' : 'Giao diện Sáng'}
              </span>
            </div>
            <button
              onClick={() => onUpdateAccessibility({ ...accessibility, theme: accessibility.theme === 'dark' ? 'light' : 'dark' })}
              className="p-2.5 rounded-[12px] bg-lovira-card border border-lovira text-lovira-title font-[700] text-[12px] flex items-center gap-1.5 cursor-pointer hover:bg-lovira-card-hover transition-colors"
            >
              {accessibility.theme === 'dark' ? <Moon className="w-[16px] h-[16px] text-amber-400" /> : <Sun className="w-[16px] h-[16px] text-[#287C78] dark:text-[#42A39E]" />}
            </button>
          </div>
        </div>
      </section>

      {/* 3. VIETNAMESE VOICE PACK CHECK & TTS ENGINE */}
      <section className="p-6 rounded-[22px] bg-lovira-card border border-lovira shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-lovira-subtle pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-[36px] h-[36px] rounded-[12px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#059669] dark:text-[#34D399] flex items-center justify-center font-[700]">
              <Volume2 className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="text-[16px] font-[800] text-lovira-title">
                Động cơ giọng đọc & Trợ năng âm thanh
              </h3>
              <p className="text-[12px] font-[500] text-lovira-muted">
                Tùy chọn ưu tiên giọng đọc nội bộ của máy hoặc giọng đọc AI Cloud truyền cảm
              </p>
            </div>
          </div>

          <span className="text-[11px] font-[700] px-3 py-1 rounded-full border bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] dark:bg-[#064E3B] dark:text-[#34D399] dark:border-[#047857]">
            {ttsEngine === 'native' ? '✓ Trợ năng máy (Mặc định)' : '✓ Edge Neural TTS'}
          </span>
        </div>

        {/* Engine Preference Selector */}
        <div className="space-y-2">
          <label className="text-[12px] font-[700] text-lovira-title block">
            Ưu tiên nguồn giọng đọc:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSelectEngine('native')}
              className={`p-4 rounded-[16px] border text-left transition-all cursor-pointer relative ${
                ttsEngine === 'native'
                  ? 'bg-[#E4F0EF] dark:bg-[#203A39] border-[#287C78] ring-2 ring-[#287C78]/20'
                  : 'bg-lovira-input border-lovira hover:border-[#287C78]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-[800] text-lovira-title">
                  📱 Giọng đọc máy / Trợ năng máy
                </span>
                <span className="text-[10px] font-[800] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Mặc định
                </span>
              </div>
              <p className="text-[11px] font-[500] text-lovira-muted leading-relaxed">
                Sử dụng bộ trợ năng âm thanh tích hợp sẵn của máy (TalkBack, VoiceOver, Android TTS). Hoạt động hoàn toàn offline, không phụ thuộc mạng.
              </p>
              {ttsEngine === 'native' && (
                <div className="mt-2.5 text-[11px] font-[700] text-[#287C78] dark:text-[#42A39E] flex items-center gap-1">
                  <CheckCircle2 className="w-[14px] h-[14px]" />
                  <span>Đang ưu tiên sử dụng</span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectEngine('edge')}
              className={`p-4 rounded-[16px] border text-left transition-all cursor-pointer relative ${
                ttsEngine === 'edge'
                  ? 'bg-[#E4F0EF] dark:bg-[#203A39] border-[#287C78] ring-2 ring-[#287C78]/20'
                  : 'bg-lovira-input border-lovira hover:border-[#287C78]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-[800] text-lovira-title">
                  ☁️ Giọng đọc AI Cloud (Edge TTS)
                </span>
                <span className="text-[10px] font-[800] px-2 py-0.5 rounded-full bg-[#E4F0EF] text-[#287C78] dark:bg-[#203A39] dark:text-[#42A39E]">
                  Neural AI
                </span>
              </div>
              <p className="text-[11px] font-[500] text-lovira-muted leading-relaxed">
                Giọng đọc AI ngữ điệu tự nhiên, truyền cảm như người thật. Tự động chuyển về giọng máy nếu mất kết nối mạng.
              </p>
              {ttsEngine === 'edge' && (
                <div className="mt-2.5 text-[11px] font-[700] text-[#287C78] dark:text-[#42A39E] flex items-center gap-1">
                  <CheckCircle2 className="w-[14px] h-[14px]" />
                  <span>Đang ưu tiên sử dụng</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Voice selector cards for Edge TTS */}
        {ttsEngine === 'edge' && (
          <div className="space-y-3 pt-2 border-t border-lovira-subtle animate-in fade-in duration-200">
            <p className="text-[12px] font-[700] text-lovira-title">
              Chọn nhân vật giọng đọc AI:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getAvailableVoices().map((v) => {
                const isSelected = selectedTtsVoice === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectTtsVoice(v.id)}
                    className={`p-3.5 rounded-[14px] border text-left transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-[#E4F0EF] dark:bg-[#203A39] border-[#287C78] ring-1 ring-[#287C78]'
                        : 'bg-lovira-input border-lovira hover:border-[#287C78]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-[800] text-lovira-title">
                        {v.name}
                      </span>
                      <span
                        className={`text-[10px] font-[800] px-2 py-0.5 rounded-full ${
                          v.gender === 'Nữ'
                            ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300'
                            : 'bg-[#E4F0EF] text-[#287C78] dark:bg-[#203A39] dark:text-[#42A39E]'
                        }`}
                      >
                        Giọng {v.gender}
                      </span>
                    </div>
                    <p className="text-[11px] font-[500] text-lovira-muted leading-snug">
                      {v.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleTestTTS}
            className="flex items-center gap-2 min-h-[42px] px-5 py-2.5 rounded-[12px] bg-[#287C78] hover:bg-[#1F625F] text-white font-[700] text-[13px] shadow-xs transition-colors cursor-pointer"
          >
            <Volume2 className="w-[18px] h-[18px]" />
            <span>
              {ttsEngine === 'native'
                ? 'Thử nghe giọng đọc máy của bạn'
                : 'Thử nghe giọng đọc Edge AI'}
            </span>
          </button>
        </div>
      </section>

      {/* 4. GEMINI API KEY SECTION */}
      <section className="p-6 rounded-[22px] bg-lovira-card border border-lovira shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-lovira-subtle pb-3.5">
          <div className="w-[36px] h-[36px] rounded-[12px] bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center font-[700]">
            <Key className="w-[18px] h-[18px]" />
          </div>
          <div>
            <h3 className="text-[16px] font-[800] text-lovira-title">
              Cấu hình khóa Google Gemini API
            </h3>
            <p className="text-[12px] font-[500] text-lovira-muted">
              Nhập API Key để Lovira hỗ trợ phân tích đơn thuốc, đọc ảnh và suy luận trí tuệ nhân tạo
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveAI} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-[700] text-lovira-title block">
              Khóa Gemini API Secret Key:
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Nhập Gemini API Key (AIzaSy...)..."
                className="w-full p-3 pr-10 rounded-[12px] border border-lovira bg-lovira-input text-lovira-title text-[12px] font-mono focus:outline-none focus:border-[#287C78]"
              />
              <Key className="w-[16px] h-[16px] absolute right-3 top-3.5 text-lovira-muted pointer-events-none" />
            </div>
            <p className="text-[11px] font-[500] text-lovira-muted">
              🔒 Khoá API của bạn được bảo mật và lưu an toàn cục bộ trong trình duyệt.
            </p>
          </div>

          {testResult && (
            <div className="p-3 rounded-[12px] bg-[#EAFBF5] dark:bg-[#143B2E] border border-[#BDE8D8] text-[#188B68] dark:text-[#34D399] text-[12px] font-[700]">
              {testResult}
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              className="min-h-[42px] px-6 py-2 rounded-[12px] bg-[#287C78] text-white font-[700] text-[12px] shadow-xs hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Lưu khóa Gemini API Key</span>
            </button>
          </div>
        </form>
      </section>

      {/* 5. ACCOUNT & CLOUD SYNC SECTION */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="w-[18px] h-[18px] text-[#287C78] dark:text-[#42A39E]" />
          <h3 className="text-[16px] font-[800] text-lovira-title">
            Tài khoản & Đồng bộ Đám mây
          </h3>
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
