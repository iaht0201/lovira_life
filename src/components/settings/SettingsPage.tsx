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
import { checkVietnameseVoiceSupport, speakText } from '../../services/ttsService';
import { storageService } from '../../services/storageService';
import { buildAddressing } from '../../utils/filterRelevantConditions';

interface SettingsPageProps {
  accessibility: AccessibilitySettings;
  aiSettings: AISettings;
  userProfile: UserProfile | null;
  onUpdateAccessibility: (settings: AccessibilitySettings) => void;
  onUpdateAISettings: (settings: AISettings) => void;
  onUpdateUserProfile: (profile: UserProfile | null) => void;
  onOpenProfileSetup: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  accessibility,
  aiSettings,
  userProfile,
  onUpdateAccessibility,
  onUpdateAISettings,
  onUpdateUserProfile,
  onOpenProfileSetup,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(aiSettings.apiKey || '');
  const [provider, setProvider] = useState<'gemini' | 'groq' | 'demo'>(aiSettings.provider);
  const [selectedModel, setSelectedModel] = useState(aiSettings.selectedModel || 'gemini-2.5-flash');
  const [voiceSupport, setVoiceSupport] = useState<'available' | 'unavailable' | 'pending'>('pending');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setVoiceSupport(checkVietnameseVoiceSupport());
  }, []);

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

  const handleTestTTS = () => {
    speakText('Xin chào! Đây là thử nghiệm giọng nói tiếng Việt của ứng dụng Lovira Life.');
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
      <div className="p-6 sm:p-8 rounded-[24px] bg-lovira-badge-purple border border-lovira-purple/30 shadow-lovira relative overflow-hidden">
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
            <div className="w-[36px] h-[36px] rounded-[12px] bg-lovira-badge-purple text-lovira-purple flex items-center justify-center font-[700]">
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] bg-lovira-badge-purple hover:bg-lovira-purple hover:text-white text-lovira-purple font-[700] text-[12px] transition-all cursor-pointer"
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
                  {addressing || 'Chú Ba'}
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
                  <Cloud className="w-[16px] h-[16px] text-indigo-500" />
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
                  userProfile.syncHealthToCloud ? 'bg-lovira-purple' : 'bg-gray-400'
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
              className="px-4 py-2 rounded-[12px] bg-lovira-purple text-white text-[12px] font-[700] shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              Thiết lập hồ sơ cá nhân
            </button>
          </div>
        )}
      </section>

      {/* 2. ACCESSIBILITY SECTION */}
      <section className="p-6 rounded-[22px] bg-lovira-card border border-lovira shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-lovira-subtle pb-3.5">
          <div className="w-[36px] h-[36px] rounded-[12px] bg-lovira-badge-purple text-lovira-purple flex items-center justify-center font-[700]">
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
                    ? 'bg-lovira-purple text-white border-lovira-purple shadow-2xs'
                    : 'bg-lovira-input border-lovira hover:border-lovira-purple text-lovira-title'
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
              {accessibility.theme === 'dark' ? <Moon className="w-[16px] h-[16px] text-amber-400" /> : <Sun className="w-[16px] h-[16px] text-indigo-600" />}
            </button>
          </div>
        </div>
      </section>

      {/* 3. VIETNAMESE VOICE PACK CHECK & TTS */}
      <section className="p-6 rounded-[22px] bg-lovira-card border border-lovira shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-lovira-subtle pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-[36px] h-[36px] rounded-[12px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#059669] dark:text-[#34D399] flex items-center justify-center font-[700]">
              <Volume2 className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="text-[16px] font-[800] text-lovira-title">
                Giọng nói tiếng Việt (Text-to-Speech)
              </h3>
              <p className="text-[12px] font-[500] text-lovira-muted">Tự động đọc to phản hồi bằng giọng tiếng Việt</p>
            </div>
          </div>

          <span
            className={`text-[11px] font-[700] px-3 py-1 rounded-full border ${
              voiceSupport === 'available'
                ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] dark:bg-[#064E3B] dark:text-[#34D399] dark:border-[#047857]'
                : 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D] dark:bg-[#451A03] dark:text-[#FDE68A] dark:border-[#78350F]'
            }`}
          >
            {voiceSupport === 'available' ? '✓ Đã có gói vi-VN' : '⚠️ Chưa có gói vi-VN'}
          </span>
        </div>

        <div className="space-y-3">
          <p className="text-[12px] font-[500] text-lovira-muted leading-relaxed">
            Lovira sử dụng động cơ tổng hợp giọng nói của thiết bị để phát âm tự nhiên nhất.
          </p>

          <button
            onClick={handleTestTTS}
            className="flex items-center gap-2 min-h-[42px] px-5 py-2.5 rounded-[12px] bg-[#287C78] hover:bg-[#1F625F] text-white font-[700] text-[13px] shadow-xs transition-colors cursor-pointer"
          >
            <Volume2 className="w-[18px] h-[18px]" />
            <span>Thử nghe giọng đọc tiếng Việt</span>
          </button>

          {voiceSupport === 'unavailable' && (
            <div className="p-4 rounded-[16px] bg-[#FFFBEB] dark:bg-[#2A1808] border border-[#FCD34D] dark:border-[#B45309] space-y-2 text-[12px]">
              <div className="flex items-center gap-1.5 font-[800] text-[#B45309] dark:text-[#FBBF24]">
                <HelpCircle className="w-[18px] h-[18px] shrink-0" />
                <span>Hướng dẫn tải gói giọng nói tiếng Việt:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-[#78350F] dark:text-[#FEF3C7] font-[500]">
                <li><strong className="font-[800] text-[#92400E] dark:text-[#FDE68A]">Android:</strong> Cài đặt hệ thống → Ngôn ngữ & Nhập liệu → Đầu ra chuyển văn bản thành giọng nói (TTS) → Tải gói giọng nói tiếng Việt.</li>
                <li><strong className="font-[800] text-[#92400E] dark:text-[#FDE68A]">iOS / iPhone:</strong> Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Việt → Tải gói giọng nói.</li>
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* 4. GEMINI API KEY SECTION */}
      <section className="p-6 rounded-[22px] bg-lovira-card border border-lovira shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-lovira-subtle pb-3.5">
          <div className="w-[36px] h-[36px] rounded-[12px] bg-lovira-badge-purple text-lovira-purple flex items-center justify-center font-[700]">
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
                className="w-full p-3 pr-10 rounded-[12px] border border-lovira bg-lovira-input text-lovira-title text-[12px] font-mono focus:outline-none focus:border-lovira-purple"
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
              className="min-h-[42px] px-6 py-2 rounded-[12px] bg-lovira-purple text-white font-[700] text-[12px] shadow-xs hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Lưu khóa Gemini API Key</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
