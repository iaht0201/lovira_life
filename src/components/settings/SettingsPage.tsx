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
      provider,
      selectedModel,
      apiKey: apiKeyInput.trim(),
      demoMode: provider === 'demo',
    });
    setTestResult('Đã lưu cấu hình AI thành công!');
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
    <div className="space-y-6 pb-16 animate-fade-in max-w-4xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
          Cài đặt hệ thống & Hồ sơ cá nhân
        </h2>
        <p className="text-sm text-text-secondary">
          Tùy chỉnh thông tin cá nhân, cỡ chữ, giọng nói tiếng Việt và mô hình AI
        </p>
      </div>

      {/* 0. USER PROFILE & PERSONALIZATION SECTION */}
      <section className="p-6 rounded-2xl bg-surface border border-default shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-default pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-bold text-text-primary">
              Hồ sơ cá nhân & Cá nhân hóa
            </h3>
          </div>

          <button
            onClick={onOpenProfileSetup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{userProfile ? 'Chỉnh sửa hồ sơ' : 'Thêm hồ sơ ngay'}</span>
          </button>
        </div>

        {userProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-default bg-surface-raised space-y-1">
                <span className="text-xs text-text-secondary block font-medium">Cách xưng hô:</span>
                <span className="text-sm font-bold text-text-primary block">
                  {addressing || 'Bạn'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-default bg-surface-raised space-y-1">
                <span className="text-xs text-text-secondary block font-medium">Tốc độ & Độ chi tiết:</span>
                <span className="text-sm font-bold text-text-primary block">
                  {userProfile.communicationPace === 'slow_detailed'
                    ? '🌱 Hướng dẫn chi tiết từng bước'
                    : '⚡ Ngắn gọn & Trực diện'}
                </span>
              </div>

              {userProfile.hasCaregiverContact && (
                <div className="p-3.5 rounded-xl border border-default bg-surface-raised space-y-1 col-span-1 sm:col-span-2">
                  <span className="text-xs text-text-secondary block font-medium">Người thân liên hệ:</span>
                  <span className="text-sm font-bold text-text-primary block">
                    {userProfile.caregiverName || 'Người thân'} — {userProfile.caregiverPhone || 'Chưa nhập SĐT'}
                  </span>
                </div>
              )}

              {userProfile.selfReportedConditions && userProfile.selfReportedConditions.length > 0 && (
                <div className="p-3.5 rounded-xl border border-default bg-surface-raised space-y-1.5 col-span-1 sm:col-span-2">
                  <span className="text-xs text-text-secondary block font-medium">Thông tin sức khỏe / Dị ứng tự khai báo:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {userProfile.selfReportedConditions.map((cond, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold">
                        {cond}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cloud Health Sync Toggle */}
            <div className="p-4 rounded-xl border border-default bg-surface-raised flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-sm text-text-primary">
                  <Cloud className="w-4 h-4 text-indigo-500" />
                  <span>Đồng bộ thông tin cá nhân & sức khỏe lên đám mây</span>
                </div>
                <p className="text-xs text-text-secondary">
                  Mặc định TẮT. Chỉ bật nếu bạn muốn đồng bộ dữ liệu hồ sơ cá nhân qua tài khoản đám mây.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleHealthSync}
                className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 ${
                  userProfile.syncHealthToCloud ? 'bg-primary' : 'bg-gray-400'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    userProfile.syncHealthToCloud ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Clear Profile Button */}
            <div className="pt-2 flex items-center justify-between border-t border-default">
              <span className="text-xs text-text-secondary">
                Bạn có thể xóa hồ sơ cá nhân bất kỳ lúc nào mà không làm ảnh hưởng đến danh sách các phiên hiện tại.
              </span>

              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/30 transition-all flex items-center gap-1 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa thông tin cá nhân</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-default bg-surface-raised text-center space-y-2">
            <p className="text-xs text-text-secondary">
              Chưa có thông tin cá nhân. Thêm hồ sơ giúp Lovira xưng hô đúng và điều chỉnh câu trả lời phù hợp với nhu cầu của bạn.
            </p>
            <button
              onClick={onOpenProfileSetup}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-hover"
            >
              Thiết lập hồ sơ cá nhân
            </button>
          </div>
        )}

        {/* Clear Confirm Dialog */}
        {showClearConfirm && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5" />
              <span>Xác nhận xóa thông tin cá nhân?</span>
            </div>
            <p className="text-xs text-text-primary leading-relaxed">
              Thao tác này sẽ xóa toàn bộ dữ liệu xưng hô, dị ứng và cài đặt cá nhân hóa khỏi thiết bị này. Các phiên làm việc hiện có của bạn sẽ KHÔNG bị ảnh hưởng.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-xl border border-default text-xs font-semibold text-text-secondary"
              >
                Hủy
              </button>
              <button
                onClick={handleClearProfile}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 1. ACCESSIBILITY SECTION */}
      <section className="p-6 rounded-2xl bg-surface border border-default shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-default pb-3">
          <Type className="w-5 h-5 text-primary" aria-hidden="true" />
          <h3 className="text-lg font-bold text-text-primary">
            Cài đặt Trợ năng & Hiển thị
          </h3>
        </div>

        {/* Font Scaling */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-text-primary block">
            Cỡ chữ hiển thị
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {fontScales.map((item) => (
              <button
                key={item.scale}
                onClick={() => onUpdateAccessibility({ ...accessibility, fontScale: item.scale })}
                className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                  accessibility.fontScale === item.scale
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface-raised border-default hover:border-primary text-text-primary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* High Contrast & Theme */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-default bg-surface-raised flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-text-primary block">Tương phản cao</span>
              <span className="text-xs text-text-secondary block">Tăng tối đa độ tương phản WCAG AAA</span>
            </div>
            <button
              onClick={() => onUpdateAccessibility({ ...accessibility, highContrast: !accessibility.highContrast })}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                accessibility.highContrast ? 'bg-amber-500' : 'bg-gray-400'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  accessibility.highContrast ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-xl border border-default bg-surface-raised flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-text-primary block">Chế độ giao diện</span>
              <span className="text-xs text-text-secondary block">
                {accessibility.theme === 'dark' ? 'Giao diện Tối (Mặc định)' : 'Giao diện Sáng'}
              </span>
            </div>
            <button
              onClick={() => onUpdateAccessibility({ ...accessibility, theme: accessibility.theme === 'dark' ? 'light' : 'dark' })}
              className="p-2 rounded-xl bg-surface border border-default text-text-primary font-bold text-xs flex items-center gap-1.5"
            >
              {accessibility.theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </div>
      </section>

      {/* 2. VIETNAMESE VOICE PACK CHECK & TTS */}
      <section className="p-6 rounded-2xl bg-surface border border-default shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-default pb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h3 className="text-lg font-bold text-text-primary">
              Giọng nói tiếng Việt (Text-to-Speech)
            </h3>
          </div>

          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              voiceSupport === 'available'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
            }`}
          >
            {voiceSupport === 'available' ? '✓ Đã có gói vi-VN' : '⚠️ Chưa có gói vi-VN'}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-text-secondary leading-relaxed">
            Lovira sử dụng động cơ tổng hợp giọng nói có sẵn trên thiết bị của bạn để đọc to các phản hồi và hướng dẫn bước tiếp theo.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTestTTS}
              className="flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700"
            >
              <Volume2 className="w-4 h-4" />
              <span>Thử nghe giọng đọc tiếng Việt</span>
            </button>
          </div>

          {voiceSupport === 'unavailable' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs text-text-primary">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <HelpCircle className="w-4 h-4" />
                <span>Hướng dẫn cài gói tiếng Việt trên điện thoại:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                <li><strong>Android:</strong> Cài đặt hệ thống → Ngôn ngữ & Nhập liệu → Đầu ra chuyển văn bản thành giọng nói (TTS) → Chọn "Gói giọng nói tiếng Việt" và tải về.</li>
                <li><strong>iOS / iPhone:</strong> Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Việt → Tải gói giọng nói Tiếng Việt.</li>
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* 3. AI PROVIDER & MODEL POOL */}
      <section className="p-6 rounded-2xl bg-surface border border-default shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-default pb-3">
          <Bot className="w-5 h-5 text-indigo-500" aria-hidden="true" />
          <h3 className="text-lg font-bold text-text-primary">
            Cấu hình Nhà cung cấp AI & Model Pool
          </h3>
        </div>

        <form onSubmit={handleSaveAI} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-primary block">
              Chế độ hoạt động & Nhà cung cấp:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setProvider('demo')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'demo'
                    ? 'bg-primary/10 border-primary font-bold text-primary'
                    : 'bg-surface-raised border-default text-text-primary'
                }`}
              >
                <div className="text-xs font-bold">Chế độ Demo Cục bộ</div>
                <div className="text-[11px] text-text-secondary">Không cần API key, phản hồi tức thì</div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'gemini'
                    ? 'bg-primary/10 border-primary font-bold text-primary'
                    : 'bg-surface-raised border-default text-text-primary'
                }`}
              >
                <div className="text-xs font-bold">Google Gemini API</div>
                <div className="text-[11px] text-text-secondary">Đọc ảnh đa thức & suy luận tự động</div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('groq')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'groq'
                    ? 'bg-primary/10 border-primary font-bold text-primary'
                    : 'bg-surface-raised border-default text-text-primary'
                }`}
              >
                <div className="text-xs font-bold">Groq API</div>
                <div className="text-[11px] text-text-secondary">Tốc độ xử lý ngôn ngữ siêu nhanh</div>
              </button>
            </div>
          </div>

          {/* Model selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-primary block">
              Chọn Mô hình (Model Profile):
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-default bg-surface text-text-primary text-xs font-semibold"
            >
              {MODEL_POOL.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} ({m.provider.toUpperCase()} • {m.capability})
                </option>
              ))}
            </select>
          </div>

          {provider !== 'demo' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-primary block">
                Khóa API Secret Key ({provider.toUpperCase()}):
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={`Nhập ${provider.toUpperCase()} API Key...`}
                  className="w-full p-2.5 pr-10 rounded-xl border border-default bg-surface text-text-primary text-xs"
                />
                <Key className="w-4 h-4 absolute right-3 top-3 text-text-secondary" />
              </div>
              <p className="text-[11px] text-text-secondary">
                Khoá API được lưu an toàn cục bộ trong trình duyệt và không bao giờ lộ ra công cộng.
              </p>
            </div>
          )}

          {testResult && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              {testResult}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-hover"
            >
              Lưu cấu hình AI
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
