import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface LoginFormProps {
  onSuccess: () => void;
  onForgotPassword: () => void;
  onContinueGuest: () => void;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onForgotPassword,
  onContinueGuest,
  signInWithEmail,
  signInWithGoogle,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isGoogleLoading) return;
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập không thành công.');
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

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Email Field */}
        <div className="space-y-1.5 text-left">
          <label
            htmlFor="login-email"
            className="block text-[13px] font-[700] text-lovira-title"
          >
            Địa chỉ Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-lovira-sub absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              required
              autoComplete="email"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-[46px] pl-10 pr-4 rounded-[12px] bg-lovira-input text-[14px] text-lovira-main placeholder-lovira-sub border border-transparent focus:border-[#287C78] focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-[13px] font-[700] text-lovira-title"
            >
              Mật khẩu
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[12px] font-[600] text-[#287C78] dark:text-[#42A39E] hover:underline cursor-pointer"
            >
              Quên mật khẩu?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-lovira-sub absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-[46px] pl-10 pr-20 rounded-[12px] bg-lovira-input text-[14px] text-lovira-main placeholder-lovira-sub border border-transparent focus:border-[#287C78] focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-[34px] px-2 rounded-lg text-lovira-muted hover:text-lovira-title flex items-center gap-1 text-[11px] font-[600] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="w-full h-[48px] rounded-[14px] bg-[#287C78] hover:bg-[#1F625F] text-white font-[700] text-[15px] flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang đăng nhập...</span>
            </>
          ) : (
            <span>Đăng nhập</span>
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

      {/* Google Login Button */}
      <GoogleSignInButton
        onClick={handleGoogleSignIn}
        isLoading={isGoogleLoading}
        disabled={isLoading}
      />

      {/* Guest Mode Return Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onContinueGuest}
          className="w-full py-2.5 text-[13px] font-[600] text-lovira-muted hover:text-lovira-title text-center transition-colors cursor-pointer"
        >
          Tiếp tục sử dụng Lovira mà không cần tài khoản
        </button>
      </div>
    </div>
  );
};
