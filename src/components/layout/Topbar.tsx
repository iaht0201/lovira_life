import React, { useState } from 'react';
import { Search, Bell, Settings, Type, Eye, Sun, Moon, Volume2, VolumeX, Sparkles, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { AccessibilitySettings } from '../../types';

interface TopbarProps {
  accessibility?: AccessibilitySettings;
  onUpdateAccessibility?: (settings: AccessibilitySettings) => void;
  onSearch?: (query: string) => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  hasNotifications?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  accessibility,
  onUpdateAccessibility,
  onSearch,
  onOpenSettings,
  onOpenNotifications,
  onOpenProfile,
  hasNotifications = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAccessPopover, setShowAccessPopover] = useState(false);

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

  return (
    <header className="h-[64px] bg-lovira-topbar backdrop-blur-md border-b border-lovira-subtle px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0 transition-colors">
      {/* Search Input (Desktop & Tablet) */}
      <div className="relative flex-1 max-w-[280px] lg:max-w-[340px] hidden sm:block">
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

      {/* Navbar Accessibility Controls Area */}
      {accessibility && onUpdateAccessibility && (
        <div className="flex items-center gap-2 ml-auto mr-2">
          {/* Desktop Font Scale Segmented Buttons */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-[12px] bg-lovira-card border border-lovira">
            <span className="text-[12px] font-[700] text-lovira-title flex items-center gap-1 mr-1">
              <Type className="w-[14px] h-[14px] text-lovira-purple" />
              <span>Cỡ chữ:</span>
            </span>
            {fontScales.map((scale) => {
              const label = `${Math.round(scale * 100)}%`;
              const isSelected = accessibility.fontScale === scale;
              return (
                <button
                  key={scale}
                  onClick={() => handleFontChange(scale)}
                  title={`Đổi cỡ chữ ${label}`}
                  className={`px-2 py-0.5 rounded-[8px] text-[11px] font-[800] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-lovira-purple text-white shadow-2xs'
                      : 'text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* High Contrast Toggle Button */}
          <button
            onClick={toggleHighContrast}
            title="Bật/Tắt chế độ tương phản cao"
            className={`h-[38px] px-2.5 rounded-[12px] border transition-all flex items-center gap-1.5 cursor-pointer text-[12px] font-[700] ${
              accessibility.highContrast
                ? 'bg-amber-400 text-black border-amber-500 font-bold ring-2 ring-amber-300'
                : 'bg-lovira-card border-lovira text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover'
            }`}
          >
            <Eye className="w-[16px] h-[16px]" />
            <span className="hidden xl:inline">Tương phản</span>
          </button>

          {/* Dark / Light Theme Button */}
          <button
            onClick={toggleTheme}
            title={`Chuyển giao diện ${accessibility.theme === 'dark' ? 'Sáng' : 'Tối'}`}
            className="w-[38px] h-[38px] rounded-[12px] bg-lovira-card border border-lovira hover:bg-lovira-card-hover text-lovira-muted hover:text-lovira-title flex items-center justify-center transition-colors cursor-pointer"
          >
            {accessibility.theme === 'dark' ? (
              <Sun className="w-[18px] h-[18px] text-amber-400" />
            ) : (
              <Moon className="w-[18px] h-[18px] text-indigo-600" />
            )}
          </button>

          {/* Compact Mobile/Tablet Accessibility Menu Trigger */}
          <div className="relative lg:hidden">
            <button
              onClick={() => setShowAccessPopover(!showAccessPopover)}
              className="h-[38px] px-2.5 rounded-[12px] bg-lovira-badge-purple border border-lovira-purple text-lovira-purple flex items-center gap-1 text-[12px] font-[700] transition-colors cursor-pointer"
              title="Tùy chọn Trợ năng"
            >
              <Type className="w-[16px] h-[16px]" />
              <span>{Math.round(accessibility.fontScale * 100)}%</span>
              <ChevronDown className="w-[12px] h-[12px]" />
            </button>

            {/* Accessibility Popover Panel */}
            {showAccessPopover && (
              <div className="absolute right-0 top-[48px] w-[260px] p-3 rounded-[18px] bg-lovira-card border border-lovira shadow-lovira-lg z-50 space-y-3 animate-in fade-in duration-150">
                <div className="space-y-1.5">
                  <div className="text-[11px] font-[700] text-lovira-muted uppercase tracking-wider flex items-center gap-1">
                    <Type className="w-[12px] h-[12px]" />
                    <span>Tăng/Giảm Cỡ Chữ</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {fontScales.map((scale) => {
                      const label = `${Math.round(scale * 100)}%`;
                      const isSelected = accessibility.fontScale === scale;
                      return (
                        <button
                          key={scale}
                          onClick={() => {
                            handleFontChange(scale);
                            setShowAccessPopover(false);
                          }}
                          className={`py-1.5 rounded-[8px] text-[11px] font-[800] text-center transition-all ${
                            isSelected
                              ? 'bg-lovira-purple text-white'
                              : 'bg-lovira-badge-purple text-lovira-purple hover:bg-lovira-purple/20'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-lovira-subtle space-y-1.5">
                  <button
                    onClick={() => {
                      toggleSpeech();
                      setShowAccessPopover(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-[10px] text-[12px] font-[600] flex items-center justify-between bg-lovira-card hover:bg-lovira-card-hover border border-lovira text-lovira-title"
                  >
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-[14px] h-[14px] text-lovira-purple" />
                      <span>Đọc giọng nói</span>
                    </span>
                    <span className="text-[11px] font-[700] text-lovira-purple">
                      {accessibility.speakResponse ? 'Bật' : 'Tắt'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      toggleVSL();
                      setShowAccessPopover(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-[10px] text-[12px] font-[600] flex items-center justify-between bg-lovira-card hover:bg-lovira-card-hover border border-lovira text-lovira-title"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-[14px] h-[14px] text-indigo-500" />
                      <span>Bảng Ký hiệu VSL</span>
                    </span>
                    <span className="text-[11px] font-[700] text-indigo-500">
                      {accessibility.vslEnabled ? 'Hiện' : 'Ẩn'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header Action Buttons */}
      <div className="flex items-center gap-2">
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
          className="w-[40px] h-[40px] rounded-full bg-lovira-badge-purple border border-lovira-purple hover:ring-2 hover:ring-lovira-purple/30 flex items-center justify-center overflow-hidden transition-all cursor-pointer ml-0.5"
          title="Hồ sơ cá nhân"
          aria-label="Hồ sơ cá nhân"
        >
          <span className="text-[20px]">👴</span>
        </button>
      </div>
    </header>
  );
};

