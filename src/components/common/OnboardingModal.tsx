import React, { useState } from 'react';
import {
  Sparkles,
  Heart,
  Mic,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  User,
  Shield,
  Eye,
} from 'lucide-react';
import { UserProfile, PronounStyle, DEFAULT_USER_PROFILE } from '../../types';
import { storageService } from '../../services/storageService';
import { sfx } from '../../utils/sfx';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: UserProfile | null) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile,
}) => {
  const [slide, setSlide] = useState<number>(0);
  const totalSlides = 3; // 0, 1, 2 = feature slides, 3 = profile setup step

  // Step 3 Profile State
  const [preferredName, setPreferredName] = useState('');
  const [pronounStyle, setPronounStyle] = useState<PronounStyle>('ban');
  const [customPronoun, setCustomPronoun] = useState('');

  if (!isOpen) return null;

  const slidesData = [
    {
      icon: <Heart className="w-10 h-10 text-[#FF5CA8] fill-[#FF5CA8]" />,
      title: 'Chào mừng ông/bà đến với Lovira ♥',
      subtitle: 'Trợ lý cuộc sống thông minh & chu đáo',
      description:
        'Lovira đồng hành giúp ông/bà chuẩn bị lịch đi khám bệnh, thủ tục hành chính, mua sắm và ghi nhớ các công việc hàng ngày một cách nhẹ nhàng.',
      highlight: '🌸 Được thiết kế đặc biệt ấm áp, dễ dùng cho gia đình Việt.',
    },
    {
      icon: <Mic className="w-10 h-10 text-[#7C4DFF]" />,
      title: 'Nói chuyện & Thao tác cực dễ dàng',
      subtitle: 'Giọng nói Tiếng Việt & Chữ to rõ ràng',
      description:
        'Không cần gõ phím phức tạp! Ông/bà chỉ cần bấm micro và nói những điều cần trợ giúp. Lovira sẽ tự động chia nhỏ thành các bước đơn giản.',
      highlight: '🔊 Có hỗ trợ đọc giọng nói, phóng to chữ và Ngôn ngữ ký hiệu VSL.',
    },
    {
      icon: <Shield className="w-10 h-10 text-emerald-500" />,
      title: 'Bảo mật & Tự do kiểm soát',
      subtitle: 'Thông tin cá nhân an toàn tuyệt đối',
      description:
        'Toàn bộ dữ liệu được lưu trữ riêng tư trên thiết bị của bạn. Lovira hoàn toàn không chia sẻ thông tin cá nhân hay lịch trình sức khỏe ra ngoài.',
      highlight: '🛡️ An toàn, đáng tin cậy và không quảng cáo phiền phức.',
    },
  ];

  const handleNextSlide = () => {
    sfx.playTap();
    if (slide < totalSlides) {
      setSlide((prev) => prev + 1);
    }
  };

  const handlePrevSlide = () => {
    sfx.playTap();
    if (slide > 0) {
      setSlide((prev) => prev - 1);
    }
  };

  const handleSkipAndUseDefault = () => {
    sfx.playSuccess();
    // Use default profile with NO specific name and generic neutral pronoun style
    const defaultProfile: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      preferredName: undefined, // Empty name -> no name greeting!
      pronounStyle: 'ban', // Neutral default
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.saveUserProfile(defaultProfile);
    localStorage.setItem('lovira_onboarded', 'true');
    onSaveProfile(defaultProfile);
    onClose();
  };

  const handleSaveCustomProfile = () => {
    sfx.playSuccess();
    const updatedProfile: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      preferredName: preferredName.trim() || undefined,
      pronounStyle,
      customPronoun: pronounStyle === 'custom' ? customPronoun.trim() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.saveUserProfile(updatedProfile);
    localStorage.setItem('lovira_onboarded', 'true');
    onSaveProfile(updatedProfile);
    onClose();
  };

  const pronounOptions: { id: PronounStyle; label: string }[] = [
    { id: 'ban', label: 'Không xưng hô tên (Mặc định)' },
    { id: 'chu', label: 'Xưng Chú' },
    { id: 'bac', label: 'Xưng Bác' },
    { id: 'ong', label: 'Xưng Ông' },
    { id: 'ba', label: 'Xưng Bà' },
    { id: 'anh', label: 'Xưng Anh' },
    { id: 'chi', label: 'Xưng Chị' },
    { id: 'custom', label: 'Khác' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-purple-500/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative">
        {/* Top Header / Progress Dots */}
        <div className="flex items-center justify-between border-b border-default pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-[#7C4DFF] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-text-primary">
              {slide < totalSlides ? `Giới thiệu Lovira (${slide + 1}/${totalSlides})` : 'Cài đặt xưng hô ban đầu'}
            </span>
          </div>

          <button
            onClick={handleSkipAndUseDefault}
            className="text-xs text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg border border-default hover:bg-surface-raised cursor-pointer font-medium transition-colors"
          >
            Bỏ qua & Dùng mặc định
          </button>
        </div>

        {/* Carousel Slide Indicators */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                slide === idx ? 'w-8 bg-[#7C4DFF]' : 'w-2 bg-purple-500/20'
              }`}
            />
          ))}
        </div>

        {/* SLIDE CONTENT (0, 1, 2) */}
        {slide < totalSlides && (
          <div className="space-y-4 py-2 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-2xl bg-surface-raised border border-purple-500/20 flex items-center justify-center mx-auto shadow-xs">
              {slidesData[slide].icon}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-extrabold text-text-primary">
                {slidesData[slide].title}
              </h3>
              <p className="text-xs font-bold text-[#7C4DFF]">
                {slidesData[slide].subtitle}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
              {slidesData[slide].description}
            </p>

            <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-xs font-semibold text-text-primary leading-snug">
              {slidesData[slide].highlight}
            </div>
          </div>
        )}

        {/* SLIDE 3: INITIAL USER PROFILE SETUP */}
        {slide === totalSlides && (
          <div className="space-y-4 py-1 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-[#7C4DFF] font-bold text-sm">
              <User className="w-5 h-5" />
              <span>Cách Lovira xưng hô với bạn</span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Bạn có thể điền thông tin để Lovira xưng hô thân mật, hoặc chọn <strong>bỏ qua</strong> để giữ cách xưng hô trung tính (không dùng tên).
            </p>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-primary block">
                  Tên hoặc danh xưng mong muốn (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="Ví dụ: Thái, Ba, Hoa... (Hoặc để trống)"
                  className="w-full p-3 rounded-xl border border-default bg-surface-raised text-text-primary text-xs font-medium focus:outline-none focus:border-[#7C4DFF]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-primary block">
                  Cách xưng hô phù hợp:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {pronounOptions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        sfx.playTap();
                        setPronounStyle(p.id);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                        pronounStyle === p.id
                          ? 'bg-[#7C4DFF] text-white border-[#7C4DFF] shadow-2xs'
                          : 'bg-surface-raised border-default hover:border-[#7C4DFF]/50 text-text-primary'
                      }`}
                    >
                      <span>{p.label}</span>
                      {pronounStyle === p.id && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                    </button>
                  ))}
                </div>

                {pronounStyle === 'custom' && (
                  <input
                    type="text"
                    value={customPronoun}
                    onChange={(e) => setCustomPronoun(e.target.value)}
                    placeholder="Nhập danh xưng khác (VD: Bác, Cậu, Cô...)"
                    className="w-full p-2.5 mt-2 rounded-xl border border-default bg-surface-raised text-text-primary text-xs"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION BUTTONS */}
        <div className="flex items-center justify-between border-t border-default pt-4">
          <div className="flex items-center gap-2">
            {slide > 0 && (
              <button
                type="button"
                onClick={handlePrevSlide}
                className="px-3.5 py-2.5 rounded-xl border border-default text-text-secondary hover:text-text-primary text-xs font-bold flex items-center gap-1 hover:bg-surface-raised cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trở lại</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSkipAndUseDefault}
              className="px-3 py-2 text-text-secondary hover:text-text-primary text-xs font-medium cursor-pointer"
            >
              Bỏ qua (Dùng mặc định)
            </button>
          </div>

          <div>
            {slide < totalSlides ? (
              <button
                type="button"
                onClick={handleNextSlide}
                className="px-5 py-2.5 rounded-xl bg-[#7C4DFF] hover:bg-[#6D3CF0] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Tiếp tục</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveCustomProfile}
                className="px-5 py-2.5 rounded-xl bg-[#7C4DFF] hover:bg-[#6D3CF0] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Hoàn tất & Bắt đầu</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
