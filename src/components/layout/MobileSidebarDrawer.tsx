import React from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  History,
  Bell,
  Settings,
  User,
  Plus,
  X,
  SlidersHorizontal,
  Sun,
  Moon,
  Eye,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { NavTab } from './DesktopSidebar';
import { AccessibilitySettings } from '../../types';

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCreateSession: () => void;
  onOpenAuthModal?: () => void;
  userName?: string;
  planName?: string;
  accessibility?: AccessibilitySettings;
  onUpdateAccessibility?: (settings: AccessibilitySettings) => void;
}

export const MobileSidebarDrawer: React.FC<MobileSidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  onCreateSession,
  onOpenAuthModal,
  userName = 'Chú Ba',
  planName = 'Gói miễn phí',
  accessibility,
  onUpdateAccessibility,
}) => {
  const { user, isAuthenticated, syncStatus } = useAuth();
  if (!isOpen) return null;

  const displayName = user?.displayName || (isAuthenticated ? 'Đã đăng nhập' : userName);
  const accountSubtext = isAuthenticated
    ? syncStatus === 'synced'
      ? 'Đã đồng bộ đám mây'
      : user?.email || 'Tài khoản Lovira'
    : 'Chế độ Khách (Cục bộ)';

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Trang chủ', icon: LayoutDashboard },
    { id: 'chat' as NavTab, label: 'Trò chuyện', icon: MessageSquare },
    { id: 'tasks' as NavTab, label: 'Việc cần làm', icon: CheckSquare },
    { id: 'history' as NavTab, label: 'Lịch sử', icon: History },
    { id: 'reminders' as NavTab, label: 'Nhắc nhở', icon: Bell },
    { id: 'settings' as NavTab, label: 'Cài đặt', icon: Settings },
    { id: 'profile' as NavTab, label: 'Hồ sơ', icon: User },
  ];

  const handleSelectTab = (tab: NavTab) => {
    onTabChange(tab);
    onClose();
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
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Sliding Drawer Sidebar */}
      <div className="relative z-10 w-[85%] max-w-[320px] h-full bg-lovira-sidebar text-lovira-title border-r border-lovira flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 select-none overflow-hidden">
        {/* Drawer Header */}
        <div className="h-[64px] px-4 flex items-center justify-between border-b border-lovira-subtle bg-lovira-topbar shrink-0">
          <div className="flex items-center gap-1.5">
            <BrandLogo variant="full" size="md" />
          </div>
          <button
            onClick={onClose}
            className="w-[36px] h-[36px] rounded-[10px] bg-lovira-input hover:bg-lovira-card-hover text-lovira-muted hover:text-lovira-title flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
          {/* 1. User Profile Mini Card */}
          <div className="p-3 rounded-[16px] bg-lovira-card border border-lovira flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-[42px] h-[42px] rounded-full bg-lovira-badge-purple border border-lovira-purple flex items-center justify-center shrink-0 overflow-hidden">
                {isAuthenticated && user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : isAuthenticated && user ? (
                  <span className="font-[800] text-[15px] text-[#287C78] dark:text-[#42A39E]">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </span>
                ) : (
                  <span className="text-[20px]">👴</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-[700] text-lovira-title truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-[11px] font-[500] text-lovira-sub truncate leading-tight mt-0.5">
                  {accountSubtext}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSelectTab('profile')}
              className="px-2.5 py-1.5 rounded-[10px] bg-lovira-input hover:bg-lovira-sidebar-active text-lovira-purple border border-lovira text-[12px] font-bold shrink-0 transition-colors cursor-pointer"
            >
              Hồ sơ
            </button>
          </div>

          {/* 2. Primary Web Navigation Items */}
          <div className="space-y-1">
            <div className="px-2 pb-1.5 text-[11px] font-[800] text-lovira-muted uppercase tracking-wider">
              Menu điều hướng
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 h-[44px] px-3.5 rounded-[12px] text-[14px] font-[600] transition-all cursor-pointer ${
                    isActive
                      ? 'bg-lovira-sidebar-active text-lovira-purple font-[700] border-l-4 border-lovira-purple'
                      : 'text-lovira-muted hover:bg-lovira-card-hover hover:text-lovira-title'
                  }`}
                >
                  <Icon
                    className={`w-[19px] h-[19px] shrink-0 ${
                      isActive ? 'text-lovira-purple' : 'text-lovira-muted'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            {/* Create New Session Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  onCreateSession();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 h-[42px] px-4 rounded-[12px] bg-lovira-badge-purple text-lovira-purple border border-lovira-purple font-[700] text-[13px] hover:opacity-90 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-[18px] h-[18px]" />
                <span>Tạo phiên mới</span>
              </button>
            </div>
          </div>

          {/* 3. Quick Interactive Adjustments (Điều chỉnh tương tác nhanh) */}
          {accessibility && onUpdateAccessibility && (
            <div className="pt-4 border-t border-lovira-subtle space-y-3">
              <div className="flex items-center gap-1.5 px-2 text-[11px] font-[800] text-lovira-purple uppercase tracking-wider">
                <SlidersHorizontal className="w-[14px] h-[14px]" />
                <span>Điều chỉnh tương tác nhanh</span>
              </div>

              {/* Theme & High Contrast */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={toggleTheme}
                  className="px-2.5 py-2.5 rounded-[12px] text-[12px] font-[700] flex items-center justify-center gap-1.5 bg-lovira-card hover:bg-lovira-card-hover border border-lovira text-lovira-title transition-all cursor-pointer"
                >
                  {accessibility.theme === 'dark' ? (
                    <>
                      <Sun className="w-[15px] h-[15px] text-amber-400" />
                      <span>Sáng</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-[15px] h-[15px] text-indigo-600" />
                      <span>Tối</span>
                    </>
                  )}
                </button>

                <button
                  onClick={toggleHighContrast}
                  className={`px-2.5 py-2.5 rounded-[12px] text-[12px] font-[700] flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    accessibility.highContrast
                      ? 'bg-amber-400 text-black border-amber-500 font-bold'
                      : 'bg-lovira-card border-lovira text-lovira-muted hover:text-lovira-title'
                  }`}
                >
                  <Eye className="w-[15px] h-[15px]" />
                  <span>Tương phản</span>
                </button>
              </div>

              {/* Font Scale Buttons */}
              <div className="space-y-1.5 p-2.5 rounded-[14px] bg-lovira-card border border-lovira">
                <div className="flex items-center justify-between text-[11px] font-[700] text-lovira-muted">
                  <span>Cỡ chữ hiển thị</span>
                  <span className="text-lovira-purple font-[800]">
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
                            ? 'bg-lovira-purple text-white shadow-2xs'
                            : 'bg-lovira-input text-lovira-muted hover:text-lovira-title border border-lovira'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assistive Controls */}
              <div className="space-y-2">
                <button
                  onClick={toggleSpeech}
                  className="w-full px-3 py-2.5 rounded-[12px] text-[12px] font-[600] flex items-center justify-between bg-lovira-card hover:bg-lovira-card-hover border border-lovira text-lovira-title transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Volume2 className="w-[16px] h-[16px] text-lovira-purple" />
                    <span>Đọc giọng nói</span>
                  </span>
                  <span
                    className={`text-[11px] font-[800] px-2 py-0.5 rounded-md ${
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
                  className="w-full px-3 py-2.5 rounded-[12px] text-[12px] font-[600] flex items-center justify-between bg-lovira-card hover:bg-lovira-card-hover border border-lovira text-lovira-title transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-[16px] h-[16px] text-indigo-500" />
                    <span>Ngôn ngữ Ký hiệu VSL</span>
                  </span>
                  <span
                    className={`text-[11px] font-[800] px-2 py-0.5 rounded-md ${
                      accessibility.vslEnabled
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
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

        {/* Footer */}
        <div className="p-3.5 border-t border-lovira-subtle bg-lovira-topbar text-center shrink-0">
          <p className="text-[11px] font-[600] text-lovira-sub">
            Lovira AI ♥ - Trợ lý cuộc sống người cao tuổi
          </p>
        </div>
      </div>
    </div>
  );
};
