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
    <div className="p-5 sm:p-6 rounded-[20px] bg-lovira-card border border-lovira-border transition-all space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-teal-50 dark:bg-teal-950/60 text-[#287C78] dark:text-[#42A39E] flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-[800] text-lovira-title">
              Đồng bộ dữ liệu đám mây
            </h3>
            <p className="text-[12px] font-[500] text-lovira-muted">
              Lưu trữ an toàn và tiếp tục công việc trên điện thoại, máy tính bảng
            </p>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2">
          {syncStatus === 'synced' && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-[700] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đã đồng bộ</span>
            </span>
          )}
          {syncStatus === 'syncing' && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-[700] bg-teal-50 dark:bg-teal-950/50 text-[#287C78] dark:text-[#42A39E] border border-teal-200/50 dark:border-teal-800/50 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang đồng bộ...</span>
            </span>
          )}
          {syncStatus === 'error' && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-[700] bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/50 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Lỗi kết nối</span>
            </span>
          )}
          {(syncStatus === 'idle' || syncStatus === 'disabled') && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-[700] bg-gray-100 dark:bg-[#202C2C] text-lovira-muted">
              {syncStatus === 'disabled' ? 'Chưa bật' : 'Sẵn sàng'}
            </span>
          )}
        </div>
      </div>

      {/* Sync Items List */}
      <div className="space-y-3 divide-y divide-gray-100 dark:divide-[#223030]">
        {/* Item 1: Sessions */}
        <div className="pt-2 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Layers className="w-4 h-4 text-lovira-sub mt-1 shrink-0" />
            <div>
              <p className="text-[14px] font-[700] text-lovira-title">
                Phiên công việc & Nhiệm vụ
              </p>
              <p className="text-[12px] text-lovira-muted">
                Đồng bộ các lịch hẹn, danh sách mua sắm, chuẩn bị hồ sơ
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={Boolean(syncSettings.syncSessions)}
              onChange={handleToggleSessionSync}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#287C78]"></div>
          </label>
        </div>

        {/* Item 2: Basic Profile */}
        <div className="pt-3 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-lovira-sub mt-1 shrink-0" />
            <div>
              <p className="text-[14px] font-[700] text-lovira-title">
                Tên gọi & Cách xưng hô
              </p>
              <p className="text-[12px] text-lovira-muted">
                Tên xưng hô và tốc độ phản hồi của trợ lý AI
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={Boolean(syncSettings.syncProfile)}
              onChange={handleToggleProfileSync}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#287C78]"></div>
          </label>
        </div>

        {/* Item 3: Sensitive Health & Caregiver info (Optional, Explicit) */}
        {userProfile && onUpdateUserProfile && (
          <div className="pt-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <HeartPulse className="w-4 h-4 text-rose-500 mt-1 shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[14px] font-[700] text-lovira-title">
                    Thông tin sức khỏe & Trợ năng
                  </p>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-[700] bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                    Bảo mật cao
                  </span>
                </div>
                <p className="text-[12px] text-lovira-muted">
                  Bệnh nền tự khai, số liên hệ người thân khi cần hỗ trợ
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={Boolean(userProfile.syncHealthToCloud)}
                onChange={handleToggleHealthSync}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>
        )}
      </div>

      {/* Footer Info & Manual Sync Button */}
      <div className="pt-2 border-t border-gray-100 dark:border-[#223030] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-lovira-muted">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-lovira-sub" />
          <span>Lần đồng bộ gần nhất: <strong>{formatLastSync(lastSyncAt)}</strong></span>
        </div>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isManualSyncing || syncStatus === 'syncing'}
            className="px-3.5 py-1.5 rounded-[10px] bg-lovira-input hover:bg-gray-200 dark:hover:bg-[#2A3B3B] text-lovira-title font-[700] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
            <span>Đồng bộ ngay</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="text-[12px] font-[700] text-[#287C78] dark:text-[#42A39E] hover:underline cursor-pointer"
          >
            Đăng nhập để đồng bộ
          </button>
        )}
      </div>
    </div>
  );
};
