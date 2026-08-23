import React, { useState } from 'react';
import { Search, Bell, Settings } from 'lucide-react';

interface TopbarProps {
  onSearch?: (query: string) => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  hasNotifications?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  onSearch,
  onOpenSettings,
  onOpenNotifications,
  onOpenProfile,
  hasNotifications = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <header className="h-[64px] bg-lovira-topbar backdrop-blur-md border-b border-lovira-subtle px-6 md:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0 transition-colors">
      {/* Search Input (Desktop & Tablet) */}
      <div className="relative flex-1 max-w-[380px] hidden sm:block">
        <Search className="w-[18px] h-[18px] text-lovira-sub absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Tìm kiếm..."
          className="w-full h-[40px] pl-10 pr-4 rounded-[12px] bg-lovira-input border border-lovira text-[14px] text-lovira-main placeholder-lovira-sub focus:outline-none focus:border-lovira-purple focus:ring-2 focus:ring-lovira-purple/20 transition-all"
        />
      </div>

      {/* Mobile Title if small screen */}
      <div className="sm:hidden flex items-center gap-1">
        <span className="text-[22px] font-[900] text-lovira-purple">Lovira</span>
        <span className="text-[18px] text-[#FF5CA8] font-black">♥</span>
      </div>

      {/* Header Action Buttons */}
      <div className="flex items-center gap-2.5 ml-auto">
        {/* Notification Button */}
        <button
          onClick={onOpenNotifications}
          className="relative w-[40px] h-[40px] rounded-[12px] bg-lovira-card border border-lovira hover:bg-lovira-card-hover text-lovira-muted hover:text-lovira-main flex items-center justify-center transition-colors cursor-pointer"
          title="Thông báo"
          aria-label="Thông báo"
        >
          <Bell className="w-[20px] h-[20px]" />
          {hasNotifications && (
            <span className="absolute top-2 right-2 w-[8px] h-[8px] rounded-full bg-[#FF5CA8] ring-2 ring-white dark:ring-[#1E1830]" />
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="w-[40px] h-[40px] rounded-[12px] bg-lovira-card border border-lovira hover:bg-lovira-card-hover text-lovira-muted hover:text-lovira-main flex items-center justify-center transition-colors cursor-pointer"
          title="Cài đặt"
          aria-label="Cài đặt"
        >
          <Settings className="w-[20px] h-[20px]" />
        </button>

        {/* User Avatar Button */}
        <button
          onClick={onOpenProfile}
          className="w-[40px] h-[40px] rounded-full bg-lovira-badge-purple border border-lovira-purple hover:ring-2 hover:ring-lovira-purple/30 flex items-center justify-center overflow-hidden transition-all cursor-pointer ml-1"
          title="Hồ sơ cá nhân"
          aria-label="Hồ sơ cá nhân"
        >
          <span className="text-[20px]">👴</span>
        </button>
      </div>
    </header>
  );
};
