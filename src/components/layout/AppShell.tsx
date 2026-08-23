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
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isChatTab = activeTab === 'chat' || activeTab === 'session';

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col md:flex-row antialiased">
      {/* Desktop Sidebar */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onCreateSession={onCreateSession}
        userName={userName}
        planName={planName}
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
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-[76px] md:pb-0">
        {/* Topbar Header */}
        <Topbar
          accessibility={accessibility}
          onUpdateAccessibility={onUpdateAccessibility}
          onOpenSettings={() => onTabChange('settings')}
          onOpenProfile={() => onTabChange('profile')}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Page Main Content */}
        <main
          className={`flex-1 flex flex-col min-h-0 w-full mx-auto ${
            isChatTab
              ? 'p-0 sm:px-6 md:px-8 md:py-6 max-w-[1440px]'
              : 'px-3.5 sm:px-6 md:px-8 pt-4 pb-6 md:py-6 max-w-[1440px]'
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
