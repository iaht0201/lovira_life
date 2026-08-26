import React from 'react';
import { ArrowLeft, PauseCircle, CheckCircle2, PlayCircle, Trash2, ShieldAlert } from 'lucide-react';
import { LifeSession, SessionStatus } from '../../types';

interface SessionHeaderProps {
  session: LifeSession;
  onBack: () => void;
  onUpdateStatus: (status: SessionStatus) => void;
  onDeleteSession: () => void;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  session,
  onBack,
  onUpdateStatus,
  onDeleteSession,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-surface border border-default shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-primary transition-colors min-h-[44px] px-2"
          aria-label="Quay lại trang chủ"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Quay lại trang chủ</span>
        </button>

        {/* Status Dropdown / Badge */}
        <div className="flex items-center gap-2">
          {session.status === 'active' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Đang hỗ trợ
            </span>
          )}
          {session.status === 'paused' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              <PauseCircle className="w-3.5 h-3.5" aria-hidden="true" />
              Tạm dừng
            </span>
          )}
          {session.status === 'completed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] border border-[#287C78]/30">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              Hoàn thành
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
          {session.title}
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          {session.goal}
        </p>
      </div>

      {/* Control Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-default text-xs font-semibold">
        <div className="flex items-center gap-2">
          {session.status === 'active' ? (
            <button
              onClick={() => onUpdateStatus('paused')}
              className="flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-xl border border-default hover:bg-surface-raised transition-all"
            >
              <PauseCircle className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span>Tạm dừng</span>
            </button>
          ) : (
            <button
              onClick={() => onUpdateStatus('active')}
              className="flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-xl border border-default hover:bg-surface-raised transition-all text-primary"
            >
              <PlayCircle className="w-4 h-4" aria-hidden="true" />
              <span>Tiếp tục hỗ trợ</span>
            </button>
          )}

          {session.status !== 'completed' && (
            <button
              onClick={() => onUpdateStatus('completed')}
              className="flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-xl border border-default hover:bg-surface-raised transition-all text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>Đánh dấu hoàn thành phiên</span>
            </button>
          )}
        </div>

        <button
          onClick={onDeleteSession}
          className="flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-xl border border-default text-text-secondary hover:text-danger hover:border-danger transition-all"
          aria-label="Xoá phiên hỗ trợ này"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Xóa</span>
        </button>
      </div>
    </div>
  );
};
