import React from 'react';
import { LayoutDashboard, Stethoscope, Camera, Settings, FolderHeart } from 'lucide-react';
import { NavTab } from '../layout/DesktopSidebar';

export type { NavTab };

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  hasActiveSession: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  hasActiveSession,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Trang chủ', icon: LayoutDashboard },
    {
      id: 'session' as NavTab,
      label: 'Phiên hiện tại',
      icon: Stethoscope,
      badge: hasActiveSession ? 'Đang mở' : undefined,
    },
    { id: 'camera' as NavTab, label: 'Nhìn giúp tôi', icon: Camera },
    { id: 'settings' as NavTab, label: 'Cài đặt', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside
        className="hidden md:flex flex-col w-64 border-r border-default bg-surface p-4 shrink-0"
        aria-label="Điều hướng chính"
      >
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-text-secondary px-3 mb-2">
            Danh mục tính năng
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-primary hover:bg-surface-raised border border-transparent hover:border-default'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-3 bg-surface-raised border border-default rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <FolderHeart className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-xs font-bold text-text-primary">Lovira Companion</span>
          </div>
          <p className="text-xs text-text-secondary">
            Mọi dữ liệu phiên luôn được lưu an toàn cục bộ trên thiết bị của bạn.
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-default bg-bg-base/95 backdrop-blur-md px-2 py-1.5 flex items-center justify-around shadow-lg"
        aria-label="Điều hướng di động"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-2 py-1 rounded-xl text-xs font-semibold transition-all ${
                isActive ? 'text-primary font-bold bg-primary/10' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5 mb-0.5" aria-hidden="true" />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <span className="truncate max-w-[72px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
