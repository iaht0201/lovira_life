import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="hidden sm:flex fixed bottom-6 right-6 z-[100] max-w-sm w-auto p-4 bg-white dark:bg-[#182222] opacity-100 border-2 border-emerald-500 dark:border-emerald-400 text-gray-900 dark:text-white rounded-2xl shadow-2xl items-center gap-3 animate-in slide-in-from-bottom duration-200 pointer-events-none select-none"
    >
      <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 font-bold">
        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold leading-snug text-gray-900 dark:text-white">
          {message}
        </p>
      </div>
    </div>
  );
};


