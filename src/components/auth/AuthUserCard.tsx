import React, { useState } from 'react';
import {
  User,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthUserCardProps {
  onOpenAuthModal: () => void;
  onShowToast?: (msg: string) => void;
}

export const AuthUserCard: React.FC<AuthUserCardProps> = ({
  onOpenAuthModal,
  onShowToast,
}) => {
  const {
    user,
    isAuthenticated,
    logout,
    resendVerification,
    refreshUser,
  } = useAuth();

  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleResend = async () => {
    if (isSendingVerification) return;
    setIsSendingVerification(true);
    try {
      await resendVerification();
      if (onShowToast) onShowToast('Đã gửi email xác minh. Vui lòng kiểm tra hộp thư!');
    } catch (e: any) {
      if (onShowToast) onShowToast(e.message || 'Không thể gửi email xác minh lúc này.');
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshUser();
      if (onShowToast) onShowToast('Đã cập nhật trạng thái tài khoản.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      if (onShowToast) onShowToast('Đã đăng xuất tài khoản.');
    } catch (e: any) {
      if (onShowToast) onShowToast(e.message || 'Lỗi đăng xuất.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="p-5 sm:p-6 rounded-[16px] bg-lovira-card border border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6] dark:hover:border-[#385654] transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[14px] bg-[#E5F3F1] dark:bg-[#1E3A38] text-[#238A83] dark:text-[#42A39E] flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[16px] font-[800] text-lovira-title">
                  Chế độ Khách (Trên thiết bị này)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[12px] font-[700] bg-gray-100 dark:bg-[#202C2C] text-lovira-muted">
                  Đang dùng
                </span>
              </div>
              <p className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted leading-relaxed">
                Tất cả phiên làm việc và ghi chú đang được lưu trực tiếp trên thiết bị của bạn.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-[12px] bg-[#238A83] hover:bg-[#1D7771] text-white font-[700] text-[14px] flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập / Đăng ký</span>
          </button>
        </div>
      </div>
    );
  }

  const isGoogle = user.providerIds.includes('google.com');

  return (
    <div className="p-5 sm:p-6 rounded-[16px] bg-lovira-card border border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6] dark:hover:border-[#385654] transition-all space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* User Info Avatar & Details */}
        <div className="flex items-center gap-3.5">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Tài khoản'}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full object-cover border-2 border-[#238A83] shrink-0 shadow-2xs"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#238A83] text-white font-[800] text-lg flex items-center justify-center shrink-0 shadow-2xs">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[16px] font-[800] text-lovira-title">
                {user.displayName || 'Người dùng Lovira'}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[12px] font-[700] bg-[#E5F3F1] dark:bg-[#1E3A38] text-[#176F69] dark:text-[#42A39E] border border-[#B6DAD6]/50 dark:border-[#385654]/50">
                {isGoogle ? 'Google Account' : 'Email/Password'}
              </span>
            </div>
            <p className="text-[13px] sm:text-[14px] font-[500] text-lovira-muted">
              {user.email || 'Tài khoản đã đăng nhập'}
            </p>
          </div>
        </div>

        {/* Actions (Refresh / Logout) */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-[12px] bg-lovira-input hover:bg-gray-200 dark:hover:bg-[#2A3B3B] text-lovira-muted hover:text-lovira-title transition-colors cursor-pointer"
            title="Làm mới thông tin tài khoản"
            aria-label="Làm mới thông tin tài khoản"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-4 py-2.5 rounded-[12px] bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-[700] text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Verification Notice for Email Accounts if unverified */}
      {!isGoogle && !user.emailVerified && (
        <div className="p-3.5 rounded-[12px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
          <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Email của bạn chưa được xác minh.</span>
          </div>

          <button
            type="button"
            onClick={handleResend}
            disabled={isSendingVerification}
            className="px-3 py-1.5 rounded-lg bg-amber-200/80 dark:bg-amber-800/60 hover:bg-amber-300 text-amber-900 dark:text-amber-100 font-[700] text-[12px] transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          >
            {isSendingVerification ? 'Đang gửi...' : 'Gửi lại email xác minh'}
          </button>
        </div>
      )}
    </div>
  );
};
