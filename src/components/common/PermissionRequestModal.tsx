import React, { useState, useEffect } from 'react';
import { Mic, Camera, Bell, MapPin, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { sfx } from '../../utils/sfx';

interface PermissionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PermissionStatus = 'granted' | 'denied' | 'prompt';

export const PermissionRequestModal: React.FC<PermissionRequestModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [micState, setMicState] = useState<PermissionStatus>('prompt');
  const [cameraState, setCameraState] = useState<PermissionStatus>('prompt');
  const [notificationState, setNotificationState] = useState<PermissionStatus>('prompt');
  const [locationState, setLocationState] = useState<PermissionStatus>('prompt');

  useEffect(() => {
    if (!isOpen) return;

    // Check Notifications status
    if ('Notification' in window) {
      if (Notification.permission === 'granted') setNotificationState('granted');
      else if (Notification.permission === 'denied') setNotificationState('denied');
      else setNotificationState('prompt');
    }

    // Check permissions API if available
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((res) => {
        setLocationState(res.state as PermissionStatus);
      }).catch(() => {});
    }
  }, [isOpen]);

  const requestMicrophone = async () => {
    sfx.playTap();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicState('granted');
      sfx.playSuccess();
    } catch {
      setMicState('denied');
    }
  };

  const requestCamera = async () => {
    sfx.playTap();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setCameraState('granted');
      sfx.playSuccess();
    } catch {
      setCameraState('denied');
    }
  };

  const requestNotification = async () => {
    sfx.playTap();
    if (!('Notification' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ thông báo đẩy.');
      return;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setNotificationState('granted');
      sfx.playSuccess();
    } else {
      setNotificationState('denied');
    }
  };

  const requestLocation = () => {
    sfx.playTap();
    if (!('geolocation' in navigator)) {
      alert('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationState('granted');
        sfx.playSuccess();
      },
      () => {
        setLocationState('denied');
      }
    );
  };

  const requestAllPermissions = async () => {
    sfx.playTap();
    await requestMicrophone();
    await requestCamera();
    await requestNotification();
    requestLocation();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#182222] opacity-100 border-2 border-[#287C78]/40 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-default pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E] flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-text-primary">
                Cấp quyền ứng dụng Lovira
              </h3>
              <p className="text-xs text-text-secondary">
                Để Lovira phục vụ bạn chu đáo và trọn vẹn nhất
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sfx.playTap();
              onClose();
            }}
            className="p-1.5 rounded-xl border border-default hover:bg-surface-raised text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Allow All Banner */}
        <button
          onClick={requestAllPermissions}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#287C78] to-[#1F625F] hover:from-[#1F625F] hover:to-[#164947] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer transform active:scale-98"
        >
          <ShieldCheck className="w-5 h-5 text-emerald-300" />
          <span>Cho phép tất cả quyền (Khuyên dùng)</span>
        </button>

        {/* Permission List */}
        <div className="space-y-3">
          {/* Micro */}
          <div className="p-3.5 rounded-xl bg-surface-raised border border-default flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">

              <div className="w-9 h-9 rounded-xl bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E] flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm font-bold text-text-primary">Micro / Giọng nói</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E] font-bold">Quan trọng</span>
                </div>
                <p className="text-[11px] text-text-secondary truncate">Trò chuyện và nhập liệu bằng giọng nói Tiếng Việt</p>
              </div>
            </div>

            {micState === 'granted' ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-4 h-4" /> Đã cấp
              </span>
            ) : (
              <button
                onClick={requestMicrophone}
                className="px-3 py-1.5 bg-[#287C78] hover:bg-[#1F625F] text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer"
              >
                Cấp quyền
              </button>
            )}
          </div>

          {/* Camera */}
          <div className="p-3.5 rounded-xl bg-surface-raised border border-default flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-text-primary">Máy ảnh / Camera</p>
                <p className="text-[11px] text-text-secondary truncate">Tính năng "Nhìn giúp tôi" & quét tài liệu y tế</p>
              </div>
            </div>

            {cameraState === 'granted' ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-4 h-4" /> Đã cấp
              </span>
            ) : (
              <button
                onClick={requestCamera}
                className="px-3 py-1.5 bg-[#287C78] hover:bg-[#1F625F] text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer"
              >
                Cấp quyền
              </button>
            )}
          </div>

          {/* Notifications */}
          <div className="p-3.5 rounded-xl bg-surface-raised border border-default flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-text-primary">Thông báo nhắc nhở</p>
                <p className="text-[11px] text-text-secondary truncate">Nhắc lịch khám bệnh, uống thuốc và việc cần làm</p>
              </div>
            </div>

            {notificationState === 'granted' ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-4 h-4" /> Đã cấp
              </span>
            ) : (
              <button
                onClick={requestNotification}
                className="px-3 py-1.5 bg-[#287C78] hover:bg-[#1F625F] text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer"
              >
                Cấp quyền
              </button>
            )}
          </div>

          {/* Geolocation */}
          <div className="p-3.5 rounded-xl bg-surface-raised border border-default flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-text-primary">Vị trí & Định vị</p>
                <p className="text-[11px] text-text-secondary truncate">Hỗ trợ tìm bệnh viện, nhà thuốc và chỉ đường</p>
              </div>
            </div>

            {locationState === 'granted' ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-4 h-4" /> Đã cấp
              </span>
            ) : (
              <button
                onClick={requestLocation}
                className="px-3 py-1.5 bg-[#287C78] hover:bg-[#1F625F] text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer"
              >
                Cấp quyền
              </button>
            )}
          </div>
        </div>

        {/* Security Assurance */}
        <div className="p-3 rounded-xl bg-[#287C78]/5 border border-[#287C78]/20 flex items-center gap-2 text-xs text-text-secondary">
          <AlertCircle className="w-4 h-4 text-[#287C78] shrink-0" />
          <span>Thông tin của bạn được bảo mật tuyệt đối trên thiết bị cá nhân.</span>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-default">
          <button
            onClick={() => {
              sfx.playTap();
              requestAllPermissions();
            }}
            className="px-4 py-2.5 bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E] hover:bg-[#287C78]/20 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            ⚡ Cấp tất cả quyền cùng lúc
          </button>

          <button
            onClick={() => {
              sfx.playTap();
              onClose();
            }}
            className="px-5 py-2.5 bg-[#287C78] text-white hover:bg-[#1F625F] font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
};
