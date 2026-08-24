import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Cloud, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { BrandAvatar } from '../common/BrandAvatar';

export type AuthView = 'login' | 'register' | 'forgot-password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: AuthView;
  initialMode?: string;
  onSuccess?: () => void;
  onVoiceCancel?: () => void;
  onShowToast?: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialView = 'login',
  initialMode,
  onSuccess,
  onVoiceCancel,
  onShowToast,
}) => {
  // Normalize initial view
  const resolvedInitialView: AuthView =
    initialView === 'register' || initialMode === 'register'
      ? 'register'
      : initialView === 'forgot-password' || initialMode === 'forgot' || initialMode === 'forgot-password'
      ? 'forgot-password'
      : 'login';

  const [currentView, setCurrentView] = useState<AuthView>(resolvedInitialView);
  const [showPostLoginPrompt, setShowPostLoginPrompt] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    user,
    isAuthenticated,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resetPassword,
    updateSyncSettings,
  } = useAuth();

  // Reset view when opened and stop voice assistant if active
  useEffect(() => {
    if (isOpen) {
      setCurrentView(resolvedInitialView);
      setShowPostLoginPrompt(false);
      if (onVoiceCancel) {
        try {
          onVoiceCancel();
        } catch {
          // Ignore
        }
      }
    }
  }, [isOpen, resolvedInitialView, onVoiceCancel]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAuthSuccess = () => {
    setShowPostLoginPrompt(true);
    if (onSuccess) {
      try {
        onSuccess();
      } catch (e) {
        console.warn('onSuccess callback error', e);
      }
    }
  };

  const handleEnableSync = async () => {
    try {
      await updateSyncSettings({ syncSessions: true, syncProfile: true });
      if (onShowToast) onShowToast('Đã bật đồng bộ tài khoản thành công!');
    } catch (e) {
      console.warn('Failed to enable sync', e);
    } finally {
      onClose();
    }
  };

  const handleDismissSync = () => {
    if (onShowToast) onShowToast('Đăng nhập thành công!');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Backdrop click */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-white dark:bg-[#162222] rounded-t-[28px] sm:rounded-[24px] shadow-2xl border border-gray-100 dark:border-[#243333] overflow-hidden z-10 max-h-[90dvh] flex flex-col animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-[#223030] flex items-center justify-between shrink-0 bg-white dark:bg-[#162222]">
          <div className="flex items-center gap-2.5">
            <BrandAvatar size="sm" alt="Lovira" />
            <div>
              <h2
                id="auth-modal-title"
                className="text-[16px] font-[800] text-lovira-title leading-tight"
              >
                {showPostLoginPrompt
                  ? 'Đăng nhập thành công 🎉'
                  : currentView === 'login'
                  ? 'Đăng nhập tài khoản'
                  : currentView === 'register'
                  ? 'Tạo tài khoản mới'
                  : 'Đặt lại mật khẩu'}
              </h2>
              <p className="text-[12px] font-[500] text-lovira-sub leading-tight mt-0.5">
                {showPostLoginPrompt
                  ? 'Tài khoản đã kết nối với Lovira'
                  : 'Tùy chọn đồng bộ dữ liệu trên nhiều thiết bị'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#202C2C] hover:bg-gray-200 dark:hover:bg-[#2A3B3B] text-lovira-muted hover:text-lovira-title flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
          {showPostLoginPrompt ? (
            /* Post Login Sync Option */
            <div className="space-y-4 text-center py-2 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/60 text-[#287C78] dark:text-[#42A39E] flex items-center justify-center mx-auto shadow-xs">
                <Cloud className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-[800] text-lovira-title">
                  Chào mừng {user?.displayName || 'chú/bạn'}!
                </h3>
                <p className="text-[13px] text-lovira-sub leading-relaxed max-w-sm mx-auto">
                  Bạn có muốn bật <strong>Đồng bộ dữ liệu</strong> để lưu các phiên công việc và tiếp tục trên các thiết bị khác không?
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1A2525] border border-gray-200/60 dark:border-[#2C3B3B] text-[12px] text-lovira-muted text-left flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#287C78] shrink-0 mt-0.5" />
                <span>
                  Các phiên làm việc hiện tại trên máy của bạn vẫn được giữ nguyên đầy đủ.
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleEnableSync}
                  className="w-full h-[46px] rounded-[14px] bg-[#287C78] hover:bg-[#1F625F] text-white font-[700] text-[14px] flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Bật đồng bộ ngay</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismissSync}
                  className="w-full h-[44px] rounded-[14px] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-lovira-muted hover:text-lovira-title font-[600] text-[13px] transition-colors cursor-pointer"
                >
                  Để sau (Chỉ dùng trên thiết bị này)
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Segmented Tab Control for Login / Register */}
              {currentView !== 'forgot-password' && (
                <div className="grid grid-cols-2 p-1 rounded-[14px] bg-lovira-input mb-5">
                  <button
                    type="button"
                    onClick={() => setCurrentView('login')}
                    className={`h-[38px] rounded-[11px] text-[13px] font-[700] transition-all cursor-pointer ${
                      currentView === 'login'
                        ? 'bg-white dark:bg-[#1E2929] text-lovira-title shadow-2xs'
                        : 'text-lovira-muted hover:text-lovira-title'
                    }`}
                  >
                    Đăng nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('register')}
                    className={`h-[38px] rounded-[11px] text-[13px] font-[700] transition-all cursor-pointer ${
                      currentView === 'register'
                        ? 'bg-white dark:bg-[#1E2929] text-lovira-title shadow-2xs'
                        : 'text-lovira-muted hover:text-lovira-title'
                    }`}
                  >
                    Tạo tài khoản
                  </button>
                </div>
              )}

              {/* View Switcher */}
              {currentView === 'login' && (
                <LoginForm
                  onSuccess={handleAuthSuccess}
                  onForgotPassword={() => setCurrentView('forgot-password')}
                  onContinueGuest={onClose}
                  signInWithEmail={signInWithEmail}
                  signInWithGoogle={signInWithGoogle}
                />
              )}

              {currentView === 'register' && (
                <RegisterForm
                  onSuccess={handleAuthSuccess}
                  onContinueGuest={onClose}
                  registerWithEmail={registerWithEmail}
                  signInWithGoogle={signInWithGoogle}
                />
              )}

              {currentView === 'forgot-password' && (
                <ForgotPasswordForm
                  onBackToLogin={() => setCurrentView('login')}
                  resetPassword={resetPassword}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
