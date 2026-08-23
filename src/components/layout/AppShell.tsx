import React from 'react';
import { DesktopSidebar, NavTab } from './DesktopSidebar';
import { Topbar } from './Topbar';
import { MobileBottomNav } from './MobileBottomNav';
import { VoiceInteractionState } from '../../types';

interface AppShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCreateSession: () => void;
  userName?: string;
  planName?: string;
  voiceStatus: VoiceInteractionState;
  onVoiceClick: () => void;
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
  children,
}) => {
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-[80px] md:pb-0">
        {/* Topbar Header */}
        <Topbar
          onOpenSettings={() => onTabChange('settings')}
          onOpenProfile={() => onTabChange('profile')}
        />

        {/* Page Main Content */}
        <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 max-w-[1440px] w-full mx-auto">
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
