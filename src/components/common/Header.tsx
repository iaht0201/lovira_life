import React from 'react';
import { Heart, Settings, Plus, Sparkles, Volume2 } from 'lucide-react';
import { OfflineIndicator } from './OfflineIndicator';
import { AccessibilitySettings } from '../../types';

interface HeaderProps {
  onNewSession: () => void;
  onOpenSettings: () => void;
  accessibility: AccessibilitySettings;
}

export const Header: React.FC<HeaderProps> = ({
  onNewSession,
  onOpenSettings,
  accessibility,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-default bg-bg-base/90 backdrop-blur-md px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md">
            <Heart className="w-6 h-6 fill-current text-white" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-text-primary">
                Lovira <span className="text-primary">Life</span>
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                PWA v2.0
              </span>
            </div>
            <p className="text-xs text-text-secondary hidden sm:block">
              Trợ lý Đời sống thông minh dành cho người cần hỗ trợ
            </p>
          </div>
        </div>

        {/* Action Controls & Offline Badge */}
        <div className="flex items-center gap-2">
          <OfflineIndicator />

          <button
            onClick={onNewSession}
            className="flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-hover transition-all"
            aria-label="Tạo phiên hỗ trợ đời sống mới"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Phiên mới</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-surface border border-default hover:border-primary text-text-primary transition-all"
            aria-label="Mở trang cài đặt"
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};
