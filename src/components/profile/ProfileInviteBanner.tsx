import React from 'react';
import { Sparkles, X, UserCheck } from 'lucide-react';

interface ProfileInviteBannerProps {
  onOpenSetup: () => void;
  onDismiss: () => void;
}

export const ProfileInviteBanner: React.FC<ProfileInviteBannerProps> = ({
  onOpenSetup,
  onDismiss,
}) => {
  return (
    <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/10 to-indigo-500/10 border border-primary/30 shadow-sm animate-fade-in my-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary text-white shadow-xs shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-text-primary flex items-center gap-1.5">
              <span>Cá nhân hóa trải nghiệm với Lovira</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                Tùy chọn
              </span>
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Lovira có thể hỗ trợ bạn tốt hơn nếu biết một chút về bạn (xưng hô, độ chi tiết khi trả lời). Bạn có muốn chia sẻ không?
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={onOpenSetup}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-xs transition-all flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Chia sẻ thông tin</span>
              </button>

              <button
                onClick={onDismiss}
                className="px-3 py-2 rounded-xl border border-default text-text-secondary text-xs font-semibold hover:bg-surface-raised transition-all"
              >
                Bỏ qua
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          aria-label="Đóng thông báo"
          className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
