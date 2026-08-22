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
    { id: 'ban', label: 'Bạn' },
    { id: 'anh', label: 'Anh' },
    { id: 'chi', label: 'Chị' },
    { id: 'ong', label: 'Ông' },
    { id: 'ba', label: 'Bà' },
    { id: 'custom', label: 'Khác' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-surface border border-default rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-default pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-text-primary">
                Hồ sơ cá nhân & Cá nhân hóa
              </h3>
              <p className="text-xs text-text-secondary">
                Bước {step} / {totalSteps} — Hoàn toàn tùy chọn, có thể bỏ qua bất kỳ lúc nào
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Thoát"
            className="p-1.5 rounded-xl border border-default hover:bg-surface-raised text-text-secondary transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-raised h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* STEP CONTENT */}
        <div className="space-y-4 min-h-[220px]">
          {/* STEP 1: Xưng hô */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <User className="w-5 h-5" />
                <span>1. Bạn muốn Lovira gọi bạn là gì?</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text-primary block">
                  Tên của bạn (hoặc biệt danh):
                </label>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="Ví dụ: Minh, Hoa, Hùng..."
                  className="w-full p-3 rounded-xl border border-default bg-surface-raised text-text-primary text-sm font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text-primary block">
                  Cách xưng hô phù hợp:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {pronouns.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPronounStyle(p.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        pronounStyle === p.id
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-raised border-default hover:border-primary text-text-primary'
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
                    className="w-full p-2.5 mt-2 rounded-xl border border-default bg-surface-raised text-text-primary text-xs"
                  />
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Tốc độ giao tiếp */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <MessageSquareText className="w-5 h-5" />
                <span>2. Tốc độ & độ chi tiết phản hồi</span>
              </div>

              <p className="text-xs text-text-secondary">
                Chọn cách bạn muốn Lovira giải thích khi thực hiện công việc và trả lời câu hỏi:
              </p>

              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCommunicationPace('normal')}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${
                    communicationPace === 'normal'
                      ? 'bg-primary/10 border-primary font-bold text-primary shadow-xs'
                      : 'bg-surface-raised border-default text-text-primary hover:border-primary/50'
                  }`}
                >
                  <div className="text-sm font-extrabold flex items-center justify-between">
                    <span>⚡ Trả lời ngắn gọn, đi thẳng vào việc</span>
                    {communicationPace === 'normal' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-text-secondary mt-1 font-normal">
                    Phản hồi xúc tích, cô đọng, phù hợp khi bạn muốn xử lý nhanh các việc cần làm.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCommunicationPace('slow_detailed')}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${
                    communicationPace === 'slow_detailed'
                      ? 'bg-primary/10 border-primary font-bold text-primary shadow-xs'
                      : 'bg-surface-raised border-default text-text-primary hover:border-primary/50'
                  }`}
                >
                  <div className="text-sm font-extrabold flex items-center justify-between">
                    <span>🌱 Hướng dẫn chi tiết từng bước</span>
                    {communicationPace === 'slow_detailed' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-text-secondary mt-1 font-normal">
                    Câu văn rõ ràng, giải thích dễ hiểu, từ tốn nhắc lại ý chính khi cần thiết.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Người thân liên hệ */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <PhoneCall className="w-5 h-5" />
                <span>3. Thông tin người thân liên hệ (tùy chọn)</span>
              </div>

              <p className="text-xs text-text-secondary">
                Người thân hoặc người chăm sóc có thể được liên hệ nhanh nếu bạn cần sự hỗ trợ khẩn cấp.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-text-primary block mb-1">
                    Tên người thân / người chăm sóc:
                  </label>
                  <input
                    type="text"
                    value={caregiverName}
                    onChange={(e) => setCaregiverName(e.target.value)}
                    placeholder="Ví dụ: Con gái Lan, Anh Tuấn..."
                    className="w-full p-3 rounded-xl border border-default bg-surface-raised text-text-primary text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-primary block mb-1">
                    Số điện thoại liên hệ:
                  </label>
                  <input
                    type="tel"
                    value={caregiverPhone}
                    onChange={(e) => setCaregiverPhone(e.target.value)}
                    placeholder="Ví dụ: 0912 345 678"
                    className="w-full p-3 rounded-xl border border-default bg-surface-raised text-text-primary text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Thông tin sức khỏe tự khai báo */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <HeartPulse className="w-5 h-5 text-rose-500" />
                <span>4. Thông tin sức khỏe quan trọng (tùy chọn)</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-text-primary leading-relaxed">
                🛡️ <strong>Lưu ý bảo mật:</strong> Thông tin chỉ được lưu cục bộ trên thiết bị của bạn. Lovira chỉ sử dụng thông tin này khi hỗ trợ bạn trong các phiên đi khám hoặc y tế.
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-primary block">
                  Nhập dị ứng thuốc, bệnh nền hoặc lưu ý y tế (Mỗi dòng 1 ý):
                </label>
                <textarea
                  rows={4}
                  value={conditionsText}
                  onChange={(e) => setConditionsText(e.target.value)}
                  placeholder="Ví dụ:&#10;Dị ứng thuốc Penicillin&#10;Cao huyết áp&#10;Tiểu đường type 2"
                  className="w-full p-3 rounded-xl border border-default bg-surface-raised text-text-primary text-xs leading-relaxed focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM BUTTONS */}
        <div className="flex items-center justify-between border-t border-default pt-4">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => prev - 1)}
                className="px-3 py-2 rounded-xl border border-default text-text-secondary text-xs font-bold flex items-center gap-1 hover:bg-surface-raised"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSkipCurrentStep}
              className="px-3 py-2 text-text-secondary hover:text-text-primary text-xs font-semibold"
            >
              Bỏ qua câu này
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-hover flex items-center gap-1"
            >
              <span>{step === totalSteps ? 'Hoàn tất & Lưu' : 'Tiếp theo'}</span>
              {step < totalSteps && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
