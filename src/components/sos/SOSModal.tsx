import React, { useState, useEffect, useRef } from 'react';
import {
  AlertOctagon,
  X,
  Phone,
  MessageSquare,
  MapPin,
  Share2,
  Volume2,
  VolumeX,
  RefreshCw,
  Copy,
  Check,
  HeartPulse,
  Users,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { UserProfile, getEmergencyContacts, getUserDisplayName } from '../../types/userProfile.js';
import { SOSLocation, NATIONAL_EMERGENCY_SERVICES } from '../../types/sos.js';
import { sosService } from '../../services/sosService.js';
import { speakText } from '../../services/ttsService.js';
import { EmergencyContactsEditor } from './EmergencyContactsEditor.js';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
  onUpdateUserProfile?: (profile: UserProfile) => void;
  onShowToast?: (msg: string) => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onUpdateUserProfile,
  onShowToast,
}) => {
  const [location, setLocation] = useState<SOSLocation | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSirenOn, setIsSirenOn] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showContactsManager, setShowContactsManager] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');

  const contacts = getEmergencyContacts(userProfile);
  const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];

  // Auto-fetch GPS location and trigger reassurance speech upon opening
  useEffect(() => {
    if (isOpen) {
      fetchLocation();

      const name = getUserDisplayName(userProfile, 'Bạn');
      speakText(
        `Đang kích hoạt chế độ khẩn cấp SOS. Vui lòng giữ bình tĩnh, hệ thống đang định vị GPS để hỗ trợ bạn liên lạc khẩn cấp.`
      );
    } else {
      // Stop siren if modal is closed
      if (sosService.getIsSirenPlaying()) {
        sosService.stopSiren();
        setIsSirenOn(false);
      }
    }
  }, [isOpen]);

  // Clean up siren on unmount
  useEffect(() => {
    return () => {
      sosService.stopSiren();
    };
  }, []);

  const fetchLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const loc = await sosService.getCurrentLocation(10000);
      if (loc) {
        setLocation(loc);
      } else {
        setLocationError('Không thể lấy tọa độ vệ tinh GPS chính xác. Vui lòng bật định vị thiết bị.');
      }
    } catch (e: any) {
      setLocationError('Lỗi định vị: ' + (e.message || 'Không xác định'));
    } finally {
      setIsLocating(false);
    }
  };

  const handleToggleSiren = () => {
    if (isSirenOn) {
      sosService.stopSiren();
      setIsSirenOn(false);
      if (onShowToast) onShowToast('🔇 Đã tắt còi báo động');
    } else {
      const started = sosService.playSiren();
      if (started) {
        setIsSirenOn(true);
        if (onShowToast) onShowToast('🚨 Đang phát còi báo động cứu nạn SOS!');
      }
    }
  };

  const currentMessage = sosService.formatSOSMessage({
    userProfile,
    location,
    customNote,
  });

  const handleSendSMS = (phone?: string, contactName?: string) => {
    const targetPhone = phone || primaryContact?.phone || '115';
    const targetName = contactName || primaryContact?.name || 'Người thân';

    // Log action
    sosService.saveSOSLog({
      location,
      message: currentMessage,
      contactsNotified: [
        {
          name: targetName,
          phone: targetPhone,
          action: 'sms',
        },
      ],
      status: 'sent',
    });

    const uri = sosService.getSMSUri(targetPhone, currentMessage);
    window.location.href = uri;

    if (onShowToast) {
      onShowToast(`📲 Đang mở tin nhắn SOS gửi tới ${targetName}`);
    }
  };

  const handleCall = (phone: string, contactName: string) => {
    sosService.saveSOSLog({
      location,
      message: currentMessage,
      contactsNotified: [
        {
          name: contactName,
          phone,
          action: 'call',
        },
      ],
      status: 'sent',
    });

    window.location.href = sosService.getTelUri(phone);
  };

  const handleShare = async () => {
    const res = await sosService.shareEmergencyAlert(currentMessage, location?.mapUrl);
    if (res.success) {
      if (res.method === 'clipboard') {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        if (onShowToast) onShowToast('📋 Đã sao chép tin nhắn & tọa độ khẩn cấp!');
      } else {
        if (onShowToast) onShowToast('📤 Đã mở bảng chia sẻ khẩn cấp');
      }

      sosService.saveSOSLog({
        location,
        message: currentMessage,
        contactsNotified: [
          {
            name: 'Chia sẻ nhanh',
            phone: 'N/A',
            action: 'share',
          },
        ],
        status: 'sent',
      });
    } else {
      // Manual copy
      try {
        await navigator.clipboard.writeText(currentMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        if (onShowToast) onShowToast('📋 Đã sao chép tin nhắn & tọa độ khẩn cấp!');
      } catch {
        if (onShowToast) onShowToast('Không thể chia sẻ tin nhắn.');
      }
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(currentMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      if (onShowToast) onShowToast('📋 Đã sao chép tin nhắn & tọa độ vào bộ nhớ tạm!');
    } catch {
      if (onShowToast) onShowToast('Lỗi khi sao chép.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-dialog-title"
      className="fixed inset-0 z-[999999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className={`bg-white dark:bg-[#151D1D] w-full max-w-xl rounded-[28px] border-4 border-rose-600 shadow-[0_0_50px_rgba(225,29,72,0.4)] overflow-hidden flex flex-col max-h-[92vh] text-lovira-title transition-all ${
          isSirenOn ? 'ring-8 ring-rose-500/50 animate-pulse' : ''
        }`}
      >
        {/* Top Header Banner with Warning Colors */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0 animate-bounce">
              <AlertOctagon className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white text-rose-600 uppercase tracking-widest">
                  SOS KHẨN CẤP
                </span>
                {isSirenOn && (
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-black uppercase animate-pulse">
                    CÒI BÁO ĐỘNG ĐANG BẬT
                  </span>
                )}
              </div>
              <h2 id="sos-dialog-title" className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                Trợ Giúp & Cứu Hộ
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng khẩn cấp"
            className="w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar text-left">
          {/* 1. Live GPS Location Box */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-600 dark:text-rose-400 animate-pulse" />
                <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                  Tọa độ & Vị trí hiện tại của bạn
                </h3>
              </div>
              <button
                type="button"
                onClick={fetchLocation}
                disabled={isLocating}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Đang dò GPS...' : 'Cập nhật vị trí'}</span>
              </button>
            </div>

            {isLocating ? (
              <div className="flex items-center gap-3 py-2 text-rose-600 dark:text-rose-400 text-sm font-semibold">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang kết nối vệ tinh GPS để lấy tọa độ chính xác cao...</span>
              </div>
            ) : location ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono bg-white dark:bg-[#1C2626] p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
                  <div>
                    <span className="font-bold text-lovira-title text-sm">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </span>
                    {location.accuracy && (
                      <span className="text-lovira-muted ml-2">
                        (Sai số: ±{location.accuracy}m)
                      </span>
                    )}
                  </div>
                  <a
                    href={location.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 shrink-0"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {location.address && (
                  <p className="text-lovira-title font-medium text-xs leading-relaxed">
                    🏢 <strong>Địa chỉ ước tính:</strong> {location.address}
                  </p>
                )}
              </div>
            ) : locationError ? (
              <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                ⚠️ {locationError}
              </div>
            ) : (
              <div className="text-xs text-lovira-muted">
                Đang chờ cấp quyền định vị GPS...
              </div>
            )}
          </div>

          {/* 2. PRIMARY ACTION BUTTONS (Large Touch Targets) */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-lovira-muted">
              Hành động cứu nạn khẩn cấp 1 chạm
            </h3>

            {/* A. Send SMS with Coordinates to Primary Contact */}
            {primaryContact ? (
              <button
                type="button"
                onClick={() => handleSendSMS(primaryContact.phone, primaryContact.name)}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-base shadow-lg shadow-rose-600/30 flex items-center justify-between gap-3 transform active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold opacity-90">GỬI SMS CỨU NẠN CÓ TỌA ĐỘ VỊ TRÍ</div>
                    <div className="text-base font-black">
                      Tới: {primaryContact.name} ({primaryContact.phone})
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-white text-rose-600 text-xs font-black shrink-0">
                  Gửi ngay 📲
                </span>
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl border border-dashed border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-center space-y-2">
                <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  Bạn chưa có số điện thoại người thân để gửi SMS tự động.
                </p>
                <button
                  type="button"
                  onClick={() => setShowContactsManager(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  <span>+ Thêm số người thân ngay</span>
                </button>
              </div>
            )}

            {/* B. Call Emergency Hotline (115 or Caregiver) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {primaryContact && (
                <button
                  type="button"
                  onClick={() => handleCall(primaryContact.phone, primaryContact.name)}
                  className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
                >
                  <Phone className="w-5 h-5 animate-pulse" />
                  <span className="truncate">Gọi {primaryContact.name} ({primaryContact.phone})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCall('115', 'Cấp cứu 115')}
                className="p-3.5 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
              >
                <ShieldAlert className="w-5 h-5 text-amber-300" />
                <span>Gọi Cấp Cứu 115 (Miễn phí)</span>
              </button>
            </div>

            {/* C. Secondary Actions: Siren & Share */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleToggleSiren}
                className={`p-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isSirenOn
                    ? 'bg-amber-400 border-amber-500 text-black shadow-md ring-2 ring-amber-300'
                    : 'bg-lovira-card border-lovira text-lovira-title hover:border-amber-500'
                }`}
              >
                {isSirenOn ? (
                  <>
                    <VolumeX className="w-4 h-4 text-black animate-bounce" />
                    <span>Tắt còi báo động</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-amber-500" />
                    <span>Bật còi hú SOS 📢</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="p-3 rounded-2xl border-2 border-lovira bg-lovira-card hover:bg-lovira-card-hover font-bold text-xs text-lovira-title flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-blue-500" />
                <span>Chia sẻ qua Zalo/App</span>
              </button>
            </div>
          </div>

          {/* 3. National Emergency Numbers (115, 114, 113) */}
          <div className="space-y-2 pt-2 border-t border-lovira">
            <div className="text-[11px] font-bold text-lovira-muted uppercase tracking-wider">
              Tổng đài khẩn cấp Việt Nam (24/7)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NATIONAL_EMERGENCY_SERVICES.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => handleCall(svc.phone, svc.name)}
                  className="p-2.5 rounded-xl border border-lovira bg-lovira-input hover:bg-rose-500/10 hover:border-rose-400 text-center transition-all cursor-pointer"
                >
                  <div className="text-base font-black text-rose-600 dark:text-rose-400">
                    {svc.phone}
                  </div>
                  <div className="text-[11px] font-bold text-lovira-title truncate">
                    {svc.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Medical Emergency Facts / Self Reported Conditions */}
          {userProfile?.selfReportedConditions && userProfile.selfReportedConditions.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <HeartPulse className="w-4 h-4" />
                <span>Lưu ý sức khỏe & Bệnh nền của {getUserDisplayName(userProfile)}:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {userProfile.selfReportedConditions.map((cond, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1E2828] border border-amber-400/40 text-xs font-semibold text-lovira-title"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 5. Custom Note (Optional) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-lovira-muted block">
              Ghi chú thêm tình huống khẩn cấp (tùy chọn):
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Ví dụ: Tôi bị ngã trong nhà tắm, khó thở, cửa nhà đang mở..."
              className="w-full px-3 py-2 rounded-xl border border-lovira bg-lovira-input text-xs text-lovira-title focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* 6. Message Preview & Copy */}
          <div className="space-y-2 pt-2 border-t border-lovira">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-lovira-muted uppercase tracking-wider">
                Nội dung tin nhắn sẽ gửi:
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã chép!' : 'Sao chép văn bản'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-lovira-input border border-lovira text-[11px] font-mono text-lovira-title whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
              {currentMessage}
            </pre>
          </div>

          {/* 7. Emergency Contacts Manager Accordion */}
          <div className="pt-2 border-t border-lovira">
            <button
              type="button"
              onClick={() => setShowContactsManager(!showContactsManager)}
              className="w-full flex items-center justify-between text-xs font-bold text-lovira-title hover:text-rose-600 transition-colors py-1 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-500" />
                <span>Quản lý danh sách người thân khẩn cấp ({contacts.length})</span>
              </span>
              {showContactsManager ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showContactsManager && (
              <div className="pt-3">
                <EmergencyContactsEditor
                  userProfile={userProfile}
                  onUpdateProfile={(updated) => {
                    if (onUpdateUserProfile) onUpdateUserProfile(updated);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-lovira-input border-t border-lovira flex items-center justify-between shrink-0">
          <span className="text-[11px] text-lovira-muted">
            🛡️ Lovira không chia sẻ vị trí của bạn ra bên ngoài trừ khi bạn nhấn gửi.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-lovira-card border border-lovira text-lovira-title font-bold text-xs hover:bg-lovira-card-hover transition-colors cursor-pointer shadow-2xs"
          >
            Đóng bảng SOS
          </button>
        </div>
      </div>
    </div>
  );
};
