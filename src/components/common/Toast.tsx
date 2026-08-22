import React from 'react';
import { Info } from 'lucide-react';

interface ToastProps {
  message: string;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm p-4 bg-surface-raised border-2 border-primary text-text-primary rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up"
    >
      <div className="p-2 rounded-xl bg-primary/20 text-primary shrink-0">
        <Info className="w-5 h-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-bold leading-snug">{message}</p>
    </div>
  );
};
