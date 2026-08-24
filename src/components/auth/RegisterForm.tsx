import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface RegisterFormProps {
  onSuccess: () => void;
  onContinueGuest: () => void;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onContinueGuest,
  registerWithEmail,
  signInWithGoogle,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isGoogleLoading) return;
    setErrorMessage(null);

    const cleanName = displayName.trim();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Mật khẩu cần tối thiểu 6 ký tự để bảo đảm an toàn.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu nhập lại không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      await registerWithEmail(cleanName || 'Bạn', cleanEmail, password);
      setRegisteredEmail(cleanEmail);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tạo tài khoản lúc này.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading || isGoogleLoading) return;
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập Google không thành công.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="p-4 sm:p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-[800] text-lovira-title">
            Tài khoản đã được tạo thành công! 🎉
          </h3>
          <p className="text-[13px] text-lovira-sub max-w-sm mx-auto leading-relaxed">
            Lovira đã gửi email xác minh đến{' '}
            <strong className="text-lovira-title font-semibold">{registeredEmail}</strong>.
            Chú/bạn vui lòng kiểm tra hộp thư (bao gồm cả thư rác/spam).
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-lovira-badge-purple border border-lovira-purple/20 text-[12px] text-lovira-purple text-left leading-relaxed">
          💡 Bạn vẫn có thể tiếp tục sử dụng Lovira bình thường trên thiết bị này ngay bây giờ.
        </div>

        <button
          type="button"
          onClick={onSuccess}
          className="w-full h-[48px] rounded-[14px] bg-[#287C78] hover:bg-[#1F625F] text-white font-[700] text-[15px] transition-all shadow-xs cursor-pointer"
        >
          Tiếp tục vào Lovira
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-2.5 text-red-700 dark:text-red-300 text-[13px] animate-in fade-in duration-200"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <p className="leading-snug">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name Field */}
        <div className="space-y-1 text-left">
          <label
            htmlFor="register-name"
            className="block text-[13px] font-[700] text-lovira-title"
          >
            Tên của bạn (Tùy chọn)
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-lovira-sub absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="register-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ví dụ: Chú Ba, Bác Nam..."
              autoComplete="name"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-[44px] pl-10 pr-4 rounded-[12px] bg-lovira-input text-[14px] text-lovira-main placeholder-lovira-sub border border-transparent focus:border-[#287C78] focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-1 text-left">
          <label
            htmlFor="register-email"
            className="block text-[13px] font-[700] text-lovira-title"
          >
            Địa chỉ Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-lovira-sub absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              required
              autoComplete="email"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-[44px] pl-10 pr-4 rounded-[12px] bg-lovira-input text-[14px] text-lovira-main placeholder-lovira-sub border border-transparent focus:border-[#287C78] focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1 text-left">
          <label
            htmlFor="register-password"
            className="block text-[13px] font-[700] text-lovira-title"
          >
            Mật khẩu (Tối thiểu 6 ký tự) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-lovira-sub absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-[44px] pl-10 pr-20 rounded-[12px] bg-lovira-input text-[14px] text-lovira-main placeholder-lovira-sub border border-transparent focus:border-[#287C78] focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-[32px] px-2 rounded-lg text-lovira-muted hover:text-lovira-title flex items-center gap-1 text-[11px] font-[600] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ẩn</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Hiện</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1 text-left">
          <label
            htmlFor="register-confirm-password"
            className="block text-[13px] font-[700] text-lovira-title"
          >
            Nhập lại mật khẩu <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-lovira-sub absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="register-confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-[44px] pl-10 pr-4 rounded-[12px] bg-lovira-input text-[14px] text-lovira-main placeholder-lovira-sub border border-transparent focus:border-[#287C78] focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="w-full h-[48px] rounded-[14px] bg-[#287C78] hover:bg-[#1F625F] text-white font-[700] text-[15px] flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tạo tài khoản...</span>
            </>
          ) : (
            <span>Tạo tài khoản</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center justify-center my-3">
        <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
        <span className="bg-white dark:bg-[#162222] px-3 text-[12px] font-[500] text-lovira-sub shrink-0">
          hoặc
        </span>
      </div>

      {/* Google Sign-in */}
      <GoogleSignInButton
        onClick={handleGoogleSignIn}
        isLoading={isGoogleLoading}
        disabled={isLoading}
      />

      {/* Continue as Guest */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onContinueGuest}
          className="w-full py-2.5 text-[13px] font-[600] text-lovira-muted hover:text-lovira-title text-center transition-colors cursor-pointer"
        >
          Tiếp tục sử dụng Lovira mà không đăng nhập
        </button>
      </div>
    </div>
  );
};
