import React, { useState } from 'react';
import { Mic, Volume2, Sparkles } from 'lucide-react';
import { DesktopSidebar, NavTab } from './DesktopSidebar';
import { Topbar } from './Topbar';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileSidebarDrawer } from './MobileSidebarDrawer';
import { VoiceInteractionState, AccessibilitySettings } from '../../types';

interface AppShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCreateSession: () => void;
  onOpenAuthModal?: () => void;
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
  onOpenAuthModal,
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
  const isVoiceActive = voiceStatus !== 'idle';

  return (
    <div
      className={`bg-lovira-base text-lovira-title flex flex-col lg:flex-row antialiased ${
        isChatTab ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Desktop Sidebar */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onCreateSession={onCreateSession}
        onOpenAuthModal={onOpenAuthModal}
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
        onOpenAuthModal={onOpenAuthModal}
        userName={userName}
        planName={planName}
        accessibility={accessibility}
        onUpdateAccessibility={onUpdateAccessibility}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          isChatTab
            ? 'h-full max-h-[100dvh] overflow-hidden pb-[calc(86px+env(safe-area-inset-bottom,0px))] lg:pb-0'
            : 'min-h-screen pb-[calc(86px+env(safe-area-inset-bottom,0px))] lg:pb-0'
        }`}
      >
        {/* Topbar Header (Only rendered for non-chat pages; Chat tab uses dedicated per-column Messenger headers) */}
        {!isChatTab && (
          <Topbar
            accessibility={accessibility}
            onUpdateAccessibility={onUpdateAccessibility}
            onOpenSettings={() => onTabChange('settings')}
            onOpenProfile={() => onTabChange('profile')}
            onOpenAuthModal={onOpenAuthModal}
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
              : 'px-3.5 sm:px-6 md:px-8 pt-4 pb-6 lg:py-6 max-w-[1440px] mx-auto'
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (< 1024px) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        voiceStatus={voiceStatus}
        onVoiceClick={onVoiceClick}
      />

      {/* Desktop & Tablet Floating Global Voice Trigger Button (>= 1024px) */}
      <div className="hidden lg:flex fixed right-6 bottom-6 z-40 items-center justify-center pointer-events-auto select-none">
        <button
          type="button"
          onClick={onVoiceClick}
          aria-label="Nói chuyện bằng giọng nói với Lovira"
          title={
            voiceStatus === 'listening'
              ? 'Lovira đang lắng nghe... Bấm để gửi'
              : voiceStatus === 'speaking'
              ? 'Lovira đang nói. Bấm để ngắt lời'
              : voiceStatus === 'processing'
              ? 'Đang xử lý...'
              : 'Nói chuyện với Lovira'
          }
          className={`group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#287C78] to-[#1F625F] text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer border-2 border-white/20 ${
            isVoiceActive ? 'animate-pulse ring-4 ring-[#287C78]/40' : ''
          }`}
        >
          {voiceStatus === 'listening' ? (
            <Mic className="w-6 h-6 text-white animate-pulse" />
          ) : voiceStatus === 'processing' ? (
            <Sparkles className="w-6 h-6 text-white animate-spin" />
          ) : voiceStatus === 'speaking' ? (
            <Volume2 className="w-6 h-6 text-white animate-bounce" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}

          {/* Accessible Desktop Tooltip */}
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center px-3 py-1.5 rounded-xl bg-lovira-topbar border border-lovira-subtle shadow-lg text-lovira-title text-xs font-bold whitespace-nowrap pointer-events-none">
            {voiceStatus === 'listening'
              ? 'Đang nghe... Bấm để gửi'
              : voiceStatus === 'speaking'
              ? 'Bấm để ngắt lời'
              : 'Nói chuyện với Lovira 🎙'}
          </span>
        </button>
      </div>
    </div>
  );
};
