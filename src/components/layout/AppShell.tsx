import React, { useState } from 'react';
import { DesktopSidebar, NavTab } from './DesktopSidebar';
import { Topbar } from './Topbar';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileSidebarDrawer } from './MobileSidebarDrawer';
import { VoiceInteractionState, AccessibilitySettings } from '../../types';

interface AppShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCreateSession: () => void;
  userName?: string;
  planName?: string;
  voiceStatus: VoiceInteractionState;
  onVoiceClick: () => void;
  accessibility?: AccessibilitySettings;
  onUpdateAccessibility?: (settings: AccessibilitySettings) => void;
  onOpenNotifications?: () => void;
  hasNotifications?: boolean;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onTabChange,
  onCreateSession,
  userName = 'Chú Ba',
  planName = 'Gói miễn phí',
  voiceStatus,
  onVoiceClick,
  accessibility,
  onUpdateAccessibility,
  onOpenNotifications,
  hasNotifications = false,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lovira_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lovira_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isChatTab = activeTab === 'chat' || activeTab === 'session';

  return (
    <div
      className={`bg-lovira-base text-lovira-title flex flex-col md:flex-row antialiased ${
        isChatTab ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Desktop Sidebar */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onCreateSession={onCreateSession}
        userName={userName}
        planName={planName}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Mobile Slide-over Navigation Sidebar Drawer */}
      <MobileSidebarDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onCreateSession={onCreateSession}
        userName={userName}
        planName={planName}
        accessibility={accessibility}
        onUpdateAccessibility={onUpdateAccessibility}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          isChatTab
            ? 'h-full max-h-[100dvh] overflow-hidden pb-[calc(86px+env(safe-area-inset-bottom,0px))] md:pb-0'
            : 'min-h-screen pb-[calc(86px+env(safe-area-inset-bottom,0px))] md:pb-0'
        }`}
      >
        {/* Topbar Header (Only rendered for non-chat pages; Chat tab uses dedicated per-column Messenger headers) */}
        {!isChatTab && (
          <Topbar
            accessibility={accessibility}
            onUpdateAccessibility={onUpdateAccessibility}
            onOpenSettings={() => onTabChange('settings')}
            onOpenProfile={() => onTabChange('profile')}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onOpenNotifications={onOpenNotifications}
            hasNotifications={hasNotifications}
          />
        )}

        {/* Page Main Content */}
        <main
          className={`flex-1 flex flex-col min-h-0 w-full ${
            isChatTab
              ? 'p-0 overflow-hidden h-full'
              : 'px-3.5 sm:px-6 md:px-8 pt-4 pb-6 md:py-6 max-w-[1440px] mx-auto'
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        voiceStatus={voiceStatus}
        onVoiceClick={onVoiceClick}
      />
    </div>
  );
};
