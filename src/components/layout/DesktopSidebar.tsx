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
  PanelLeftClose,
  PanelLeftOpen,
  LogIn,
  Cloud,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'chat'
  | 'tasks'
  | 'history'
  | 'reminders'
  | 'settings'
  | 'profile';

interface DesktopSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCreateSession: () => void;
  onOpenAuthModal?: () => void;
  userName?: string;
  planName?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onTabChange,
  onCreateSession,
  onOpenAuthModal,
  userName = 'Chú Ba',
  planName = 'Gói miễn phí',
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, isAuthenticated, syncStatus } = useAuth();
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

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-lovira-sidebar shrink-0 z-30 select-none transition-all duration-300 ${
        isCollapsed ? 'w-[74px]' : 'w-[230px]'
      }`}
      aria-label="Sidebar điều hướng"
    >
      {/* 6.1 Logo & Collapse Button Area */}
      <div className={`h-[70px] flex items-center shrink-0 ${
        isCollapsed ? 'px-3 justify-center' : 'px-4 justify-between'
      }`}>
        <button
          onClick={() => onTabChange('dashboard')}
          className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none min-w-0"
          title="Lovira - Về trang chủ"
        >
          <BrandLogo variant={isCollapsed ? 'icon' : 'full'} />
        </button>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`p-2 rounded-xl text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover transition-colors cursor-pointer shrink-0 ${
              isCollapsed ? 'hidden' : 'block'
            }`}
            title="Thu gọn thanh điều hướng"
            aria-label="Thu gọn thanh điều hướng"
          >
            <PanelLeftClose className="w-[18px] h-[18px] text-[#287C78] dark:text-[#42A39E]" />
          </button>
        )}
      </div>

      {/* 6.2 Navigation List */}
      <div className="flex-1 px-2.5 py-3.5 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center h-[46px] rounded-[12px] text-[14px] font-[600] transition-all cursor-pointer ${
                isCollapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3.5'
              } ${
                isActive
                  ? 'bg-lovira-sidebar-active text-[#287C78] dark:text-[#42A39E] shadow-2xs font-[700]'
                  : 'text-lovira-muted hover:bg-lovira-card-hover hover:text-lovira-title'
              }`}
            >
              <Icon
                className={`w-[20px] h-[20px] shrink-0 ${
                  isActive ? 'text-[#287C78] dark:text-[#42A39E]' : 'text-lovira-muted'
                }`}
                aria-hidden="true"
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* 6.3 Nút "+ Tạo phiên mới" */}
        <div className="pt-2.5">
          <button
            onClick={onCreateSession}
            title="Tạo phiên làm việc mới"
            className={`w-full flex items-center justify-center rounded-[12px] bg-[#287C78] hover:bg-[#1F625F] text-white font-[700] text-[14px] transition-all shadow-xs cursor-pointer active:scale-[0.98] ${
              isCollapsed ? 'h-[44px] px-0' : 'h-[44px] px-3.5 gap-2'
            }`}
          >
            <Plus className="w-[18px] h-[18px]" aria-hidden="true" />
            {!isCollapsed && <span>Tạo phiên mới</span>}
          </button>
        </div>
      </div>

      {/* 6.4 User Profile Mini Card & Expand Toggle */}
      <div className="p-2.5 bg-lovira-sidebar shrink-0">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => onTabChange('profile')}
              className="w-[42px] h-[42px] rounded-2xl hover:ring-2 hover:ring-[#287C78]/40 flex items-center justify-center overflow-hidden transition-all cursor-pointer shadow-2xs bg-lovira-card"
              title={`Hồ sơ & Tài khoản: ${displayName} (${accountSubtext})`}
            >
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
            </button>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="w-[36px] h-[36px] rounded-xl text-lovira-muted hover:text-[#287C78] hover:bg-lovira-card-hover flex items-center justify-center transition-colors cursor-pointer"
                title="Mở rộng thanh điều hướng"
                aria-label="Mở rộng thanh điều hướng"
              >
                <PanelLeftOpen className="w-[18px] h-[18px] text-[#287C78] dark:text-[#42A39E]" />
              </button>
            )}
          </div>
        ) : (
          <div className="p-2 rounded-[14px] bg-lovira-card shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <button
                onClick={() => onTabChange('profile')}
                className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-90 transition-opacity cursor-pointer flex-1"
              >
                <div className="w-[38px] h-[38px] rounded-full bg-lovira-badge-purple flex items-center justify-center shrink-0 overflow-hidden">
                  {isAuthenticated && user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : isAuthenticated && user ? (
                    <span className="font-[800] text-[14px] text-[#287C78] dark:text-[#42A39E]">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </span>
                  ) : (
                    <span className="text-[17px] font-bold">👴</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-[700] text-lovira-title truncate leading-tight">
                    {displayName}
                  </p>
                  <p className="text-[11px] font-[500] text-lovira-sub truncate leading-tight mt-0.5">
                    {accountSubtext}
                  </p>
                </div>
              </button>

              <button
                onClick={() => onTabChange('profile')}
                className="w-[28px] h-[28px] rounded-full bg-lovira-input hover:bg-lovira-sidebar-active text-lovira-purple flex items-center justify-center text-[13px] font-bold shrink-0 transition-colors cursor-pointer"
                title="Xem hồ sơ & tài khoản"
                aria-label="Xem hồ sơ & tài khoản"
              >
                ⚙️
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
