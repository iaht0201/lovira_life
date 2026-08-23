import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Xác nhận thay đổi quan trọng',
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md p-6 bg-white dark:bg-[#1B152B] border-2 border-amber-500 rounded-2xl shadow-2xl text-text-primary opacity-100 relative z-10">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-3 bg-amber-500/20 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="confirm-dialog-title" className="text-lg font-bold text-text-primary">
              {title}
            </h2>
            <p className="mt-1 text-sm text-text-secondary leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-default">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border border-default bg-surface hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-all"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            <span>Hủy / Không</span>
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 min-h-[44px] px-5 py-2 rounded-xl bg-danger text-white font-bold shadow-md hover:bg-red-800 transition-all"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>Đồng ý / Xác nhận</span>
          </button>
        </div>
      </div>
    </div>
  );
};
