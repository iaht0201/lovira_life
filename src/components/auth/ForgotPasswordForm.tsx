import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  resetPassword: (email: string) => Promise<void>;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onBackToLogin,
  resetPassword,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(cleanEmail);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu lúc này.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-4 text-center space-y-4 animate-in fade-in duration-200">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-[800] text-lovira-title">Đã gửi liên kết! ✉️</h3>
          <p className="text-[13px] text-lovira-sub max-w-sm mx-auto leading-relaxed">
            Lovira đã gửi hướng dẫn đặt lại mật khẩu tới email{' '}
            <strong className="text-lovira-title">{email}</strong>. Vui lòng kiểm tra hộp thư đến của bạn.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full h-[46px] rounded-[14px] bg-[#287C78] hover:bg-[#1F625F] text-white font-[700] text-[14px] transition-all shadow-xs cursor-pointer"
        >
          Quay lại Đăng nhập
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

      <p className="text-[13px] text-lovira-sub text-left leading-relaxed">
        Nhập địa chỉ email tài khoản của bạn. Lovira sẽ gửi một đường dẫn an toàn để bạn thiết lập mật khẩu mới.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1.5 text-left">
          <label
            htmlFor="reset-email"
            className="block text-[13px] font-[700] text-lovira-title"
          >
            Địa chỉ Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-lovira-sub absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              required
              autoComplete="email"
              disabled={isLoading}
              className="w-full h-[46px] pl-10 pr-4 rounded-[12px] bg-lovira-input text-[14px] text-lovira-main placeholder-lovira-sub border border-transparent focus:border-[#287C78] focus:outline-none transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-[48px] rounded-[14px] bg-[#287C78] hover:bg-[#1F625F] text-white font-[700] text-[15px] flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang gửi liên kết...</span>
            </>
          ) : (
            <span>Gửi hướng dẫn đặt lại mật khẩu</span>
          )}
        </button>
      </form>

      <div className="pt-2">
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex items-center gap-2 text-[13px] font-[600] text-[#287C78] dark:text-[#42A39E] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang Đăng nhập</span>
        </button>
      </div>
    </div>
  );
};
