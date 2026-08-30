import React, { useState } from 'react';
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  User,
  HeartPulse,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile } from '../../types';

interface CloudSyncCardProps {
  userProfile?: UserProfile | null;
  onUpdateUserProfile?: (profile: UserProfile) => void;
  onShowToast?: (msg: string) => void;
  onOpenAuthModal: () => void;
}

export const CloudSyncCard: React.FC<CloudSyncCardProps> = ({
  userProfile,
  onUpdateUserProfile,
  onShowToast,
  onOpenAuthModal,
}) => {
  const {
    isAuthenticated,
    syncSettings,
    syncStatus,
    lastSyncAt,
    updateSyncSettings,
    triggerManualSync,
  } = useAuth();

  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleToggleSessionSync = async () => {
    if (!isAuthenticated) {
      onOpenAuthModal();
      return;
    }
    const nextState = !syncSettings.syncSessions;
    try {
      await updateSyncSettings({ syncSessions: nextState });
      if (onShowToast) {
        onShowToast(
          nextState
            ? 'Đã bật đồng bộ phiên công việc lên đám mây.'
            : 'Đã tạm dừng đồng bộ phiên công việc.'
        );
      }
    } catch (e: any) {
      if (onShowToast) onShowToast(e.message || 'Lỗi cập nhật cài đặt đồng bộ.');
    }
  };

  const handleToggleProfileSync = async () => {
    if (!isAuthenticated) {
      onOpenAuthModal();
      return;
    }
    const nextState = !syncSettings.syncProfile;
    try {
      await updateSyncSettings({ syncProfile: nextState });
      if (onShowToast) {
        onShowToast(
          nextState
            ? 'Đã bật đồng bộ hồ sơ cá nhân.'
            : 'Đã tạm dừng đồng bộ hồ sơ cá nhân.'
        );
      }
    } catch (e: any) {
      if (onShowToast) onShowToast(e.message || 'Lỗi cập nhật cài đặt đồng bộ.');
    }
  };

  const handleToggleHealthSync = () => {
    if (!userProfile || !onUpdateUserProfile) return;
    const nextState = !userProfile.syncHealthToCloud;
    const updated: UserProfile = {
      ...userProfile,
      syncHealthToCloud: nextState,
      updatedAt: new Date().toISOString(),
    };
    onUpdateUserProfile(updated);
    if (onShowToast) {
      onShowToast(
        nextState
          ? 'Đã cho phép sao lưu thông tin trợ năng & sức khỏe lên đám mây.'
          : 'Đã tắt sao lưu thông tin sức khỏe (chỉ lưu trên máy).'
      );
    }
  };

  const handleManualSync = async () => {
    if (!isAuthenticated) {
      onOpenAuthModal();
      return;
    }
    setIsManualSyncing(true);
    try {
      const res = await triggerManualSync();
      if (onShowToast) {
        onShowToast(`Đồng bộ hoàn tất! (${res.mergedCount} phiên công việc)`);
      }
    } catch (e: any) {
      if (onShowToast) onShowToast(e.message || 'Không thể đồng bộ lúc này.');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const formatLastSync = (iso?: string) => {
    if (!iso) return 'Chưa thực hiện';
    try {
      const d = new Date(iso);
      return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${d.toLocaleDateString('vi-VN')}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-[16px] bg-lovira-card border border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6] dark:hover:border-[#385654] transition-all space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E3E9E8] dark:border-[#243533]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#E5F3F1] dark:bg-[#1E3A38] text-[#238A83] dark:text-[#42A39E] flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-[800] text-lovira-title">
              Đồng bộ dữ liệu đám mây
            </h3>
            <p className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted">
              Lưu trữ an toàn và tiếp tục công việc trên điện thoại, máy tính bảng
            </p>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2">
          {syncStatus === 'synced' && (
            <span className="px-3 py-1 rounded-full text-[12px] font-[700] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã đồng bộ</span>
            </span>
          )}
          {syncStatus === 'syncing' && (
            <span className="px-3 py-1 rounded-full text-[12px] font-[700] bg-[#E5F3F1] dark:bg-[#1E3A38] text-[#176F69] dark:text-[#42A39E] border border-[#B6DAD6]/50 dark:border-[#385654]/50 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang đồng bộ...</span>
            </span>
          )}
          {syncStatus === 'error' && (
            <span className="px-3 py-1 rounded-full text-[12px] font-[700] bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/50 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Lỗi kết nối</span>
            </span>
          )}
          {(syncStatus === 'idle' || syncStatus === 'disabled') && (
            <span className="px-3 py-1 rounded-full text-[12px] font-[700] bg-gray-100 dark:bg-[#202C2C] text-lovira-muted">
              {syncStatus === 'disabled' ? 'Chưa bật' : 'Sẵn sàng'}
            </span>
          )}
        </div>
      </div>

      {/* Sync Items List */}
      <div className="space-y-4">
        {/* Item 1: Sessions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Layers className="w-5 h-5 text-[#238A83] dark:text-[#42A39E] mt-0.5 shrink-0" />
            <div>
              <p className="text-[15px] sm:text-[16px] font-[700] text-lovira-title">
                Phiên làm việc & Lịch nhắc
              </p>
              <p className="text-[13px] sm:text-[14px] text-lovira-muted">
                Đồng bộ các lịch hẹn, việc cần làm, danh sách mua sắm
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={Boolean(syncSettings.syncSessions)}
            onClick={handleToggleSessionSync}
            className={`w-[48px] h-[28px] rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
              syncSettings.syncSessions ? 'bg-[#238A83]' : 'bg-[#D6DEDD] dark:bg-[#374846]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                syncSettings.syncSessions ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Item 2: Basic Profile */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#E3E9E8]/60 dark:border-[#243533]/60">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-[#238A83] dark:text-[#42A39E] mt-0.5 shrink-0" />
            <div>
              <p className="text-[15px] sm:text-[16px] font-[700] text-lovira-title">
                Thông tin hồ sơ cá nhân
              </p>
              <p className="text-[13px] sm:text-[14px] text-lovira-muted">
                Cách xưng hô và tốc độ phản hồi ưa thích của trợ lý
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={Boolean(syncSettings.syncProfile)}
            onClick={handleToggleProfileSync}
            className={`w-[48px] h-[28px] rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
              syncSettings.syncProfile ? 'bg-[#238A83]' : 'bg-[#D6DEDD] dark:bg-[#374846]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                syncSettings.syncProfile ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Item 3: Sensitive Health & Caregiver info */}
        {userProfile && onUpdateUserProfile && (
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#E3E9E8]/60 dark:border-[#243533]/60">
            <div className="flex items-start gap-3">
              <HeartPulse className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[15px] sm:text-[16px] font-[700] text-lovira-title">
                    Dữ liệu sức khỏe & trợ năng
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-[700] bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                    Bảo mật
                  </span>
                </div>
                <p className="text-[13px] sm:text-[14px] text-lovira-muted">
                  Bệnh nền tự khai, số điện thoại người thân khi cần hỗ trợ
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={Boolean(userProfile.syncHealthToCloud)}
              onClick={handleToggleHealthSync}
              className={`w-[48px] h-[28px] rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                userProfile.syncHealthToCloud ? 'bg-rose-500' : 'bg-[#D6DEDD] dark:bg-[#374846]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  userProfile.syncHealthToCloud ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Footer Info & Manual Sync Button */}
      <div className="pt-3 border-t border-[#E3E9E8] dark:border-[#243533] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px] text-lovira-muted">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-lovira-sub" />
          <span>Lần đồng bộ gần nhất: <strong className="text-lovira-title">{formatLastSync(lastSyncAt)}</strong></span>
        </div>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isManualSyncing || syncStatus === 'syncing'}
            className="px-4 py-2 rounded-[12px] bg-lovira-input hover:bg-gray-200 dark:hover:bg-[#2A3B3B] text-lovira-title font-[700] text-[13px] flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
            <span>Đồng bộ ngay</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="text-[13px] font-[700] text-[#238A83] dark:text-[#42A39E] hover:underline cursor-pointer"
          >
            Đăng nhập để bật đồng bộ đám mây →
          </button>
        )}
      </div>
    </div>
  );
};
