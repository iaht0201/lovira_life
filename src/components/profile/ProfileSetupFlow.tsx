import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  User,
  MessageSquareText,
  PhoneCall,
  HeartPulse,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { UserProfile, PronounStyle, CommunicationPace, DEFAULT_USER_PROFILE } from '../../types';
import { storageService } from '../../services/storageService';

interface ProfileSetupFlowProps {
  initialProfile?: UserProfile | null;
  onClose: () => void;
  onSaveSuccess: (profile: UserProfile) => void;
}

export const ProfileSetupFlow: React.FC<ProfileSetupFlowProps> = ({
  initialProfile,
  onClose,
  onSaveSuccess,
}) => {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 4;

  const [preferredName, setPreferredName] = useState(initialProfile?.preferredName || '');
  const [pronounStyle, setPronounStyle] = useState<PronounStyle>(initialProfile?.pronounStyle || 'ban');
  const [customPronoun, setCustomPronoun] = useState(initialProfile?.customPronoun || '');

  const [communicationPace, setCommunicationPace] = useState<CommunicationPace>(
    initialProfile?.communicationPace || 'normal'
  );

  const [caregiverName, setCaregiverName] = useState(initialProfile?.caregiverName || '');
  const [caregiverPhone, setCaregiverPhone] = useState(initialProfile?.caregiverPhone || '');

  const [conditionsText, setConditionsText] = useState(
    (initialProfile?.selfReportedConditions || []).join('\n')
  );

  const handleSave = () => {
    const conditions = conditionsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const updatedProfile: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      ...initialProfile,
      preferredName: preferredName.trim() || undefined,
      pronounStyle,
      customPronoun: pronounStyle === 'custom' ? customPronoun.trim() : undefined,
      communicationPace,
      hasCaregiverContact: Boolean(caregiverName.trim() || caregiverPhone.trim()),
      caregiverName: caregiverName.trim() || undefined,
      caregiverPhone: caregiverPhone.trim() || undefined,
      selfReportedConditions: conditions,
      createdAt: initialProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.saveUserProfile(updatedProfile);
    onSaveSuccess(updatedProfile);
  };

  const handleNextStep = () => {
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
    } else {
      handleSave();
    }
  };

  const handleSkipCurrentStep = () => {
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
    } else {
      handleSave();
    }
  };

  const pronouns: { id: PronounStyle; label: string }[] = [
    { id: 'ban', label: 'Mặc định (Không xưng hô tên)' },
    { id: 'chu', label: 'Chú' },
    { id: 'bac', label: 'Bác' },
    { id: 'ong', label: 'Ông' },
    { id: 'ba', label: 'Bà' },
    { id: 'anh', label: 'Anh' },
    { id: 'chi', label: 'Chị' },
    { id: 'custom', label: 'Khác' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-lovira-card border border-lovira rounded-[24px] max-w-lg w-full p-6 shadow-lovira-lg space-y-5 relative">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-lovira-subtle pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-[36px] h-[36px] rounded-[12px] bg-lovira-badge-purple text-lovira-purple flex items-center justify-center font-[700]">
              <Sparkles className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="text-[16px] font-[800] text-lovira-title">
                Thiết lập Hồ sơ cá nhân
              </h3>
              <p className="text-[12px] font-[500] text-lovira-muted">
                Bước {step} / {totalSteps} — Tùy chỉnh xưng hô & phong cách AI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Thoát"
            className="p-2 rounded-[12px] border border-lovira hover:bg-lovira-card-hover text-lovira-muted hover:text-lovira-title transition-all cursor-pointer"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-lovira-input h-2 rounded-full overflow-hidden border border-lovira-subtle">
          <div
            className="bg-lovira-purple h-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* STEP CONTENT */}
        <div className="space-y-4 min-h-[220px]">
          {/* STEP 1: Xưng hô */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-lovira-purple font-[700] text-[14px]">
                <User className="w-[18px] h-[18px]" />
                <span>1. Tên gọi & Danh xưng mong muốn</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-[700] text-lovira-title block">
                  Tên của bạn (hoặc biệt danh):
                </label>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="Ví dụ: Ba, Hoa, Hùng, Minh..."
                  className="w-full p-3 rounded-[12px] border border-lovira bg-lovira-input text-lovira-title text-[13px] font-[600] focus:outline-none focus:border-lovira-purple"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-[700] text-lovira-title block">
                  Cách xưng hô phù hợp:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {pronouns.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPronounStyle(p.id)}
                      className={`p-2.5 rounded-[12px] border text-[12px] font-[700] transition-all cursor-pointer ${
                        pronounStyle === p.id
                          ? 'bg-lovira-purple text-white border-lovira-purple shadow-2xs'
                          : 'bg-lovira-input border-lovira hover:border-lovira-purple text-lovira-title'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {pronounStyle === 'custom' && (
                  <input
                    type="text"
                    value={customPronoun}
                    onChange={(e) => setCustomPronoun(e.target.value)}
                    placeholder="Nhập xưng hô tùy chỉnh (vd: Bác, Chú, Cậu...)"
                    className="w-full p-2.5 mt-2 rounded-[12px] border border-lovira bg-lovira-input text-lovira-title text-[12px]"
                  />
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Tốc độ giao tiếp */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-lovira-purple font-[700] text-[14px]">
                <MessageSquareText className="w-[18px] h-[18px]" />
                <span>2. Tốc độ & Độ chi tiết phản hồi</span>
              </div>

              <p className="text-[12px] font-[500] text-lovira-muted">
                Cách Lovira giải thích khi hướng dẫn bạn làm việc:
              </p>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setCommunicationPace('normal')}
                  className={`w-full p-3.5 rounded-[16px] border text-left transition-all cursor-pointer ${
                    communicationPace === 'normal'
                      ? 'bg-lovira-badge-purple border-lovira-purple font-[700] text-lovira-purple shadow-2xs'
                      : 'bg-lovira-input border-lovira text-lovira-title hover:border-lovira-purple'
                  }`}
                >
                  <div className="text-[13px] font-[800] flex items-center justify-between">
                    <span>⚡ Trả lời ngắn gọn, đi thẳng vào việc</span>
                    {communicationPace === 'normal' && <CheckCircle2 className="w-[16px] h-[16px] text-lovira-purple" />}
                  </div>
                  <p className="text-[11px] font-[500] text-lovira-muted mt-1">
                    Phản hồi súc tích, cô đọng, phù hợp với thao tác nhanh.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCommunicationPace('slow_detailed')}
                  className={`w-full p-3.5 rounded-[16px] border text-left transition-all cursor-pointer ${
                    communicationPace === 'slow_detailed'
                      ? 'bg-lovira-badge-purple border-lovira-purple font-[700] text-lovira-purple shadow-2xs'
                      : 'bg-lovira-input border-lovira text-lovira-title hover:border-lovira-purple'
                  }`}
                >
                  <div className="text-[13px] font-[800] flex items-center justify-between">
                    <span>🌱 Hướng dẫn chi tiết từng bước</span>
                    {communicationPace === 'slow_detailed' && <CheckCircle2 className="w-[16px] h-[16px] text-lovira-purple" />}
                  </div>
                  <p className="text-[11px] font-[500] text-lovira-muted mt-1">
                    Giải thích từ tốn, chi tiết từng bước (Phù hợp cho người cao tuổi).
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Người thân liên hệ */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-lovira-purple font-[700] text-[14px]">
                <PhoneCall className="w-[18px] h-[18px]" />
                <span>3. Người thân hỗ trợ khẩn cấp (tùy chọn)</span>
              </div>

              <p className="text-[12px] font-[500] text-lovira-muted">
                Thông tin người chăm sóc hoặc con cháu để gọi nhanh khi cần.
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[12px] font-[700] text-lovira-title block">
                    Tên người thân:
                  </label>
                  <input
                    type="text"
                    value={caregiverName}
                    onChange={(e) => setCaregiverName(e.target.value)}
                    placeholder="Ví dụ: Con gái Lan, Anh Tuấn..."
                    className="w-full p-3 rounded-[12px] border border-lovira bg-lovira-input text-lovira-title text-[13px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-[700] text-lovira-title block">
                    Số điện thoại:
                  </label>
                  <input
                    type="tel"
                    value={caregiverPhone}
                    onChange={(e) => setCaregiverPhone(e.target.value)}
                    placeholder="Ví dụ: 0912 345 678"
                    className="w-full p-3 rounded-[12px] border border-lovira bg-lovira-input text-lovira-title text-[13px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Thông tin sức khỏe tự khai báo */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-[700] text-[14px]">
                <HeartPulse className="w-[18px] h-[18px]" />
                <span>4. Bệnh nền / Món kiêng (tùy chọn)</span>
              </div>

              <div className="p-3 rounded-[12px] bg-amber-500/10 border border-amber-500/30 text-[11px] font-[500] text-lovira-title leading-relaxed">
                🛡️ <strong>Lưu ý:</strong> Thông tin lưu cục bộ an toàn trên thiết bị của bạn.
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-[700] text-lovira-title block">
                  Nhập dị ứng, bệnh nền hoặc món ăn kiêng (Mỗi dòng 1 ý):
                </label>
                <textarea
                  rows={4}
                  value={conditionsText}
                  onChange={(e) => setConditionsText(e.target.value)}
                  placeholder="Ví dụ:&#10;Dị ứng thuốc Penicillin&#10;Cao huyết áp&#10;Kiêng hải sản"
                  className="w-full p-3 rounded-[12px] border border-lovira bg-lovira-input text-lovira-title text-[12px] leading-relaxed focus:outline-none focus:border-lovira-purple"
                />
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM BUTTONS */}
        <div className="flex items-center justify-between border-t border-lovira-subtle pt-4">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => prev - 1)}
                className="px-3.5 py-2 rounded-[12px] border border-lovira text-lovira-muted hover:text-lovira-title text-[12px] font-[700] flex items-center gap-1 hover:bg-lovira-card-hover cursor-pointer"
              >
                <ChevronLeft className="w-[16px] h-[16px]" />
                <span>Quay lại</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSkipCurrentStep}
              className="px-3 py-2 text-lovira-sub hover:text-lovira-title text-[12px] font-[600] cursor-pointer"
            >
              Bỏ qua
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2 rounded-[12px] bg-lovira-purple text-white text-[12px] font-[700] shadow-xs hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
            >
              <span>{step === totalSteps ? 'Hoàn tất & Lưu' : 'Tiếp theo'}</span>
              {step < totalSteps && <ChevronRight className="w-[16px] h-[16px]" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
