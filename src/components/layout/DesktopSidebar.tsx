import React from 'react';
import { APP_IMAGES } from '../../assets/images';

import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  History,
  Bell,
  Settings,
  User,
  Plus,
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
  userName?: string;
  planName?: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onTabChange,
  onCreateSession,
  userName = 'Chú Ba',
  planName = 'Gói miễn phí',
}) => {
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
      className="hidden md:flex flex-col w-[230px] h-screen sticky top-0 bg-lovira-sidebar shrink-0 z-30 select-none transition-colors shadow-xs"
      aria-label="Sidebar điều hướng"
    >
      {/* 6.1 Logo Area */}
      <div className="h-[76px] px-6 flex items-center shrink-0">
        <button
          onClick={() => onTabChange('dashboard')}
          className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
        >
          <img
            src={APP_IMAGES.logoClient}
            alt="Lovira"
            className="h-[38px] w-auto max-w-[160px] object-contain group-hover:scale-[1.02] transition-transform select-none"
          />
        </button>
      </div>

      {/* 6.2 Navigation List */}
      <div className="flex-1 px-3.5 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 h-[46px] px-4 rounded-[12px] text-[14px] font-[600] transition-all cursor-pointer ${
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
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        {/* 6.3 Nút "+ Tạo phiên mới" */}
        <div className="pt-3">
          <button
            onClick={onCreateSession}
            className="w-full flex items-center justify-center gap-2 h-[44px] px-4 rounded-[12px] bg-[#287C78] hover:bg-[#1F625F] text-white font-[700] text-[14px] transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-[18px] h-[18px]" aria-hidden="true" />
            <span>Tạo phiên mới</span>
          </button>
        </div>
      </div>

      {/* 6.4 User Profile Mini Card */}
      <div className="p-3.5 bg-lovira-sidebar shrink-0">
        <div className="flex items-center justify-between p-2 rounded-[14px] bg-lovira-card shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-[40px] h-[40px] rounded-full bg-lovira-badge-purple flex items-center justify-center shrink-0 overflow-hidden">
              <span className="text-[18px] font-bold">👴</span>
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-[700] text-lovira-title truncate leading-tight">
                {userName}
              </p>
              <p className="text-[11px] font-[500] text-lovira-sub truncate leading-tight mt-0.5">
                {planName}
              </p>
            </div>
          </div>
          <button
            onClick={() => onTabChange('profile')}
            className="w-[28px] h-[28px] rounded-full bg-lovira-input hover:bg-lovira-sidebar-active text-lovira-purple flex items-center justify-center text-[14px] font-bold shrink-0 transition-colors cursor-pointer"
            title="Quản lý hồ sơ"
            aria-label="Quản lý hồ sơ"
          >
            +
          </button>
        </div>
      </div>
    </aside>
  );
};
