import React, { useState, useRef, useEffect } from 'react';
import { BrandLogo } from '../common/BrandLogo';
import {
  Search,
  Bell,
  Settings,
  Type,
  Eye,
  Sun,
  Moon,
  Volume2,
  Sparkles,
  ChevronDown,
  SlidersHorizontal,
  Menu,
} from 'lucide-react';
import { AccessibilitySettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { User, LogIn, Cloud } from 'lucide-react';

interface TopbarProps {
  accessibility?: AccessibilitySettings;
  onUpdateAccessibility?: (settings: AccessibilitySettings) => void;
  onSearch?: (query: string) => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenAuthModal?: () => void;
  onOpenMobileMenu?: () => void;
  hasNotifications?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  accessibility,
  onUpdateAccessibility,
  onSearch,
  onOpenSettings,
  onOpenNotifications,
  onOpenProfile,
  onOpenAuthModal,
  onOpenMobileMenu,
  hasNotifications = true,
}) => {
  const { user, isAuthenticated, syncStatus } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const fontScales = [1.0, 1.25, 1.5, 1.75];

  const handleFontChange = (scale: number) => {
    if (!accessibility || !onUpdateAccessibility) return;
    onUpdateAccessibility({ ...accessibility, fontScale: scale });
  };

  const toggleHighContrast = () => {
    if (!accessibility || !onUpdateAccessibility) return;
    onUpdateAccessibility({ ...accessibility, highContrast: !accessibility.highContrast });
  };

  const toggleTheme = () => {
    if (!accessibility || !onUpdateAccessibility) return;
    const nextTheme = accessibility.theme === 'dark' ? 'light' : 'dark';
    onUpdateAccessibility({ ...accessibility, theme: nextTheme });
  };

  const toggleSpeech = () => {
    if (!accessibility || !onUpdateAccessibility) return;
    onUpdateAccessibility({ ...accessibility, speakResponse: !accessibility.speakResponse });
  };

  const toggleVSL = () => {
    if (!accessibility || !onUpdateAccessibility) return;
    onUpdateAccessibility({ ...accessibility, vslEnabled: !accessibility.vslEnabled });
  };

  const isCustomAccessActive =
    accessibility &&
    (accessibility.fontScale > 1.0 ||
      accessibility.highContrast ||
      accessibility.speakResponse ||
      accessibility.vslEnabled);

  return (
    <header className="h-[48px] sm:h-[64px] bg-lovira-topbar backdrop-blur-md px-2.5 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0 transition-colors shadow-2xs">
      {/* Mobile Hamburger Menu & Brand Name (< 1024px) */}
      <div className="lg:hidden flex items-center gap-2">
        <button
          onClick={onOpenMobileMenu}
          className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-[10px] sm:rounded-[12px] bg-lovira-card hover:bg-lovira-card-hover text-lovira-title flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          title="Mở menu điều hướng"
          aria-label="Mở menu điều hướng"
        >
          <Menu className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] text-[#287C78] dark:text-[#42A39E]" />
        </button>
        <div className="flex items-center gap-1.5">
          <BrandLogo variant="full" size="sm" />
        </div>
      </div>

      {/* Search Input (Desktop & Tablet) */}
      <div className="relative flex-1 max-w-[240px] sm:max-w-[280px] lg:max-w-[320px] hidden sm:block">
        <Search className="w-[18px] h-[18px] text-lovira-sub absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Tìm kiếm..."
          className="w-full h-[40px] pl-10 pr-4 rounded-[12px] bg-lovira-input text-[14px] text-lovira-main placeholder-lovira-sub focus:outline-none focus:ring-2 focus:ring-[#287C78] transition-all"
        />
      </div>

      {/* Right Controls Area */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
        {/* Unified Accessibility & Display Dropdown (Desktop/Tablet only) */}
        {accessibility && onUpdateAccessibility && (
          <div className="relative hidden sm:block" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={`h-[38px] px-3.5 rounded-[12px] transition-all flex items-center gap-1.5 cursor-pointer text-[12px] font-[700] shadow-2xs ${
                isCustomAccessActive
                  ? 'bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E]'
                  : 'bg-lovira-card text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover'
              }`}
              title="Tùy chỉnh giao diện & Trợ năng"
              aria-expanded={showDropdown}
            >
              <SlidersHorizontal className="w-[15px] h-[15px] text-[#287C78] dark:text-[#42A39E]" />
              <span>Trợ năng & Giao diện</span>
              <ChevronDown
                className={`w-[13px] h-[13px] transition-transform duration-200 ${
                  showDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Panel */}
            {showDropdown && (
              <div className="absolute right-0 top-[46px] w-[280px] p-3.5 rounded-[18px] bg-lovira-card shadow-lovira-lg z-50 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header title */}
                <div className="flex items-center justify-between pb-2">
                  <span className="text-[12px] font-[800] text-lovira-title flex items-center gap-1.5">
                    <SlidersHorizontal className="w-[14px] h-[14px] text-[#287C78] dark:text-[#42A39E]" />
                    Tùy chỉnh Trợ năng
                  </span>
                  {isCustomAccessActive && (
                    <span className="text-[10px] font-[700] px-1.5 py-0.5 rounded-full bg-[#287C78] text-white">
                      Đang bật
                    </span>
                  )}
                </div>

                {/* 1. Theme & High Contrast */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-[700] text-lovira-muted uppercase tracking-wider">
                    Giao diện & Tương phản
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={toggleTheme}
                      className="px-2.5 py-2 rounded-[10px] text-[12px] font-[700] flex items-center justify-center gap-1.5 bg-lovira-input hover:bg-lovira-card-hover text-lovira-title transition-all cursor-pointer shadow-2xs"
                    >
                      {accessibility.theme === 'dark' ? (
                        <>
                          <Sun className="w-[14px] h-[14px] text-amber-400" />
                          <span>Chế độ Tối</span>
                        </>
                      ) : (
                        <>
                          <Moon className="w-[14px] h-[14px] text-[#287C78] dark:text-[#42A39E]" />
                          <span>Chế độ Sáng</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={toggleHighContrast}
                      className={`px-2.5 py-2 rounded-[10px] text-[12px] font-[700] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                        accessibility.highContrast
                          ? 'bg-amber-400 text-black font-bold'
                          : 'bg-lovira-input text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover'
                      }`}
                    >
                      <Eye className="w-[14px] h-[14px]" />
                      <span>Tương phản</span>
                    </button>
                  </div>
                </div>

                {/* 2. Font Scale */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-[700] text-lovira-muted uppercase tracking-wider flex items-center justify-between">
                    <span>Cỡ chữ hiển thị</span>
                    <span className="text-[#287C78] dark:text-[#42A39E] font-[800]">
                      {Math.round(accessibility.fontScale * 100)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {fontScales.map((scale) => {
                      const label = `${Math.round(scale * 100)}%`;
                      const isSelected = accessibility.fontScale === scale;
                      return (
                        <button
                          key={scale}
                          onClick={() => handleFontChange(scale)}
                          className={`py-1.5 rounded-[8px] text-[11px] font-[800] text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#287C78] text-white shadow-2xs'
                              : 'bg-lovira-input text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Assistive Toggles */}
                <div className="pt-2 space-y-1.5">
                  <button
                    onClick={toggleSpeech}
                    className="w-full px-2.5 py-2 rounded-[10px] text-[12px] font-[600] flex items-center justify-between bg-lovira-input hover:bg-lovira-card-hover text-lovira-title transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-[14px] h-[14px] text-[#287C78] dark:text-[#42A39E]" />
                      <span>Đọc phản hồi bằng giọng nói</span>
                    </span>
                    <span
                      className={`text-[11px] font-[800] px-1.5 py-0.5 rounded-md ${
                        accessibility.speakResponse
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'text-lovira-muted'
                      }`}
                    >
                      {accessibility.speakResponse ? 'Bật' : 'Tắt'}
                    </span>
                  </button>

                  <button
                    onClick={toggleVSL}
                    className="w-full px-2.5 py-2 rounded-[10px] text-[12px] font-[600] flex items-center justify-between bg-lovira-input hover:bg-lovira-card-hover text-lovira-title transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-[14px] h-[14px] text-[#287C78] dark:text-[#42A39E]" />
                      <span>Bảng Ngôn ngữ Ký hiệu VSL</span>
                    </span>
                    <span
                      className={`text-[11px] font-[800] px-1.5 py-0.5 rounded-md ${
                        accessibility.vslEnabled
                          ? 'bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E]'
                          : 'text-lovira-muted'
                      }`}
                    >
                      {accessibility.vslEnabled ? 'Hiện' : 'Ẩn'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notification Button */}
        <button
          onClick={onOpenNotifications}
          className="relative w-[34px] h-[34px] sm:w-[40px] sm:h-[40px] rounded-[10px] sm:rounded-[12px] bg-lovira-card hover:bg-lovira-card-hover text-lovira-muted hover:text-lovira-main flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          title="Thông báo"
          aria-label="Thông báo"
        >
          <Bell className="w-[16px] h-[16px] sm:w-[20px] sm:h-[20px]" />
          {hasNotifications && (
            <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] sm:w-[8px] sm:h-[8px] rounded-full bg-[#E76F91] ring-2 ring-white dark:ring-[#121818]" />
          )}
        </button>

        {/* Settings Button (Desktop/Tablet only) */}
        <button
          onClick={onOpenSettings}
          className="hidden sm:flex w-[40px] h-[40px] rounded-[12px] bg-lovira-card hover:bg-lovira-card-hover text-lovira-muted hover:text-lovira-main items-center justify-center transition-colors cursor-pointer shadow-2xs"
          title="Cài đặt"
          aria-label="Cài đặt"
        >
          <Settings className="w-[20px] h-[20px]" />
        </button>

        {/* User Account / Avatar Button */}
        {isAuthenticated && user ? (
          <button
            onClick={onOpenProfile}
            className="relative w-[34px] h-[34px] sm:w-[40px] sm:h-[40px] rounded-full hover:ring-2 hover:ring-[#287C78]/40 flex items-center justify-center overflow-hidden transition-all cursor-pointer ml-0.5 shadow-2xs"
            title={`Tài khoản: ${user.displayName || user.email || 'Đã đăng nhập'}`}
            aria-label="Tài khoản cá nhân"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Tài khoản'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#287C78] text-white font-[800] text-[14px] sm:text-[16px] flex items-center justify-center">
                {user.displayName
                  ? user.displayName.charAt(0).toUpperCase()
                  : user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}

            {syncStatus === 'synced' && (
              <span
                className="absolute bottom-0 right-0 w-[9px] h-[9px] rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121818]"
                title="Đã đồng bộ đám mây"
              />
            )}
          </button>
        ) : (
          <button
            onClick={onOpenProfile}
            className="w-[34px] h-[34px] sm:w-[40px] sm:h-[40px] rounded-full bg-[#E4F0EF] dark:bg-[#203A39] hover:ring-2 hover:ring-[#287C78]/30 flex items-center justify-center overflow-hidden transition-all cursor-pointer ml-0.5 shadow-2xs"
            title="Hồ sơ & Tài khoản (Chế độ Khách)"
            aria-label="Hồ sơ & Tài khoản"
          >
            <span className="text-[16px] sm:text-[20px]">👴</span>
          </button>
        )}
      </div>
    </header>
  );
};

