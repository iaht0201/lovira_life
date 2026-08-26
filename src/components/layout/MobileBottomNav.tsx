import React from 'react';
import { LayoutDashboard, MessageSquare, Eye, Mic, CheckSquare, Settings, Sparkles, Volume2, AlertCircle } from 'lucide-react';
import { NavTab } from './DesktopSidebar';
import { VoiceInteractionState } from '../../types';

interface MobileBottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  voiceStatus: VoiceInteractionState;
  onVoiceClick: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  voiceStatus,
  onVoiceClick,
}) => {
  const isVoiceActive = voiceStatus !== 'idle';

  const getVoiceButtonContent = () => {
    switch (voiceStatus) {
      case 'listening':
        return (
          <div className="flex flex-col items-center justify-center h-[42px] w-[42px]">
            <Mic className="w-[24px] h-[24px] animate-pulse text-white" />
            <span className="text-[9px] font-bold text-white mt-0.5 whitespace-nowrap">Đang nghe</span>
          </div>
        );
      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center h-[42px] w-[42px]">
            <Sparkles className="w-[24px] h-[24px] animate-spin text-white" />
            <span className="text-[9px] font-bold text-white mt-0.5 whitespace-nowrap">Xử lý</span>
          </div>
        );
      case 'speaking':
        return (
          <div className="flex flex-col items-center justify-center h-[42px] w-[42px]">
            <Volume2 className="w-[24px] h-[24px] text-white" />
            <span className="text-[9px] font-bold text-white mt-0.5 whitespace-nowrap">Đang nói</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center h-[42px] w-[42px]">
            <AlertCircle className="w-[24px] h-[24px] text-white" />
            <span className="text-[9px] font-bold text-white mt-0.5 whitespace-nowrap">Thử lại</span>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[42px] w-[42px]">
            <Mic className="w-[24px] h-[24px] text-white" />
            <span className="text-[10px] font-bold text-white tracking-wider mt-0.5 whitespace-nowrap">VOICE</span>
          </div>
        );
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[99999999] bg-lovira-topbar/95 backdrop-blur-md border-t border-lovira-subtle h-[calc(66px+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] px-2 flex items-center justify-around shadow-2xl select-none"
      aria-label="Điều hướng di động"
    >
      {/* 1. Trang chủ */}
      <button
        onClick={() => onTabChange('dashboard')}
        aria-current={activeTab === 'dashboard' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-1 py-1 rounded-[12px] text-[11px] font-[600] transition-colors cursor-pointer ${
          activeTab === 'dashboard' ? 'text-[#287C78] dark:text-[#42A39E] font-[700]' : 'text-lovira-muted'
        }`}
      >
        <LayoutDashboard className="w-[22px] h-[22px] mb-0.5" />
        <span className="truncate">Trang chủ</span>
      </button>

      {/* 2. Trò chuyện */}
      <button
        onClick={() => onTabChange('chat')}
        aria-current={activeTab === 'chat' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center min-w-[50px] min-h-[48px] px-1 py-1 rounded-[12px] text-[11px] font-[600] transition-colors cursor-pointer ${
          activeTab === 'chat' ? 'text-[#287C78] dark:text-[#42A39E] font-[700]' : 'text-lovira-muted'
        }`}
      >
        <MessageSquare className="w-[22px] h-[22px] mb-0.5" />
        <span className="truncate">Chat</span>
      </button>

      {/* 2.5 Nhìn giúp tôi */}
      <button
        onClick={() => onTabChange('vision')}
        aria-current={activeTab === 'vision' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center min-w-[50px] min-h-[48px] px-1 py-1 rounded-[12px] text-[11px] font-[600] transition-colors cursor-pointer ${
          activeTab === 'vision' ? 'text-[#287C78] dark:text-[#42A39E] font-[700]' : 'text-lovira-muted'
        }`}
      >
        <Eye className="w-[22px] h-[22px] mb-0.5" />
        <span className="truncate">Nhìn giúp</span>
      </button>

      {/* 3. Floating Center Voice Button */}
      <div className="relative -mt-[22px] shrink-0">
        <button
          onClick={onVoiceClick}
          aria-label="Nói chuyện bằng giọng nói với Lovira"
          className={`w-[60px] h-[60px] rounded-full bg-gradient-to-tr from-[#287C78] to-[#1F625F] text-white flex flex-col items-center justify-center shadow-lovira-lg ring-[4px] ring-lovira-base transition-transform active:scale-95 cursor-pointer ${
            isVoiceActive
              ? 'ring-[#E76F91]/50 shadow-[0_0_15px_rgba(231,111,145,0.4)]'
              : 'hover:scale-105'
          }`}
        >
          {getVoiceButtonContent()}
        </button>
      </div>

      {/* 4. Việc cần làm */}
      <button
        onClick={() => onTabChange('tasks')}
        aria-current={activeTab === 'tasks' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-1 py-1 rounded-[12px] text-[11px] font-[600] transition-colors cursor-pointer ${
          activeTab === 'tasks' ? 'text-[#287C78] dark:text-[#42A39E] font-[700]' : 'text-lovira-muted'
        }`}
      >
        <CheckSquare className="w-[22px] h-[22px] mb-0.5" />
        <span className="truncate">Việc cần làm</span>
      </button>

      {/* 5. Cài đặt */}
      <button
        onClick={() => onTabChange('settings')}
        aria-current={activeTab === 'settings' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-1 py-1 rounded-[12px] text-[11px] font-[600] transition-colors cursor-pointer ${
          activeTab === 'settings' ? 'text-[#287C78] dark:text-[#42A39E] font-[700]' : 'text-lovira-muted'
        }`}
      >
        <Settings className="w-[22px] h-[22px] mb-0.5" />
        <span className="truncate">Cài đặt</span>
      </button>
    </nav>
  );
};
