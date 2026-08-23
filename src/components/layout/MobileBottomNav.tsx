import React from 'react';
import { LayoutDashboard, MessageSquare, Mic, CheckSquare, Settings, Sparkles, Volume2, AlertCircle } from 'lucide-react';
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
          <div className="flex flex-col items-center justify-center">
            <Mic className="w-[26px] h-[26px] animate-pulse text-white" />
            <span className="text-[9px] font-bold text-white mt-0.5">Đang nghe</span>
          </div>
        );
      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center">
            <Sparkles className="w-[26px] h-[26px] animate-spin text-white" />
            <span className="text-[9px] font-bold text-white mt-0.5">Đang xử lý</span>
          </div>
        );
      case 'speaking':
        return (
          <div className="flex flex-col items-center justify-center">
            <Volume2 className="w-[26px] h-[26px] animate-bounce text-white" />
            <span className="text-[9px] font-bold text-white mt-0.5">Đang nói</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center">
            <AlertCircle className="w-[26px] h-[26px] text-white" />
            <span className="text-[9px] font-bold text-white mt-0.5">Thử lại</span>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="flex flex-col items-center justify-center">
            <Mic className="w-[26px] h-[26px] text-white" />
            <span className="text-[10px] font-bold text-white tracking-wider mt-0.5">VOICE</span>
          </div>
        );
    }
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#ECE8F5] h-[76px] px-2 flex items-center justify-around shadow-lg select-none"
      aria-label="Điều hướng di động"
    >
      {/* 1. Trang chủ */}
      <button
        onClick={() => onTabChange('dashboard')}
        aria-current={activeTab === 'dashboard' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-1 py-1 rounded-[12px] text-[11px] font-[600] transition-colors ${
          activeTab === 'dashboard' ? 'text-[#7C4DFF] font-[700]' : 'text-[#667085]'
        }`}
      >
        <LayoutDashboard className="w-[22px] h-[22px] mb-0.5" />
        <span className="truncate">Trang chủ</span>
      </button>

      {/* 2. Trò chuyện */}
      <button
        onClick={() => onTabChange('chat')}
        aria-current={activeTab === 'chat' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-1 py-1 rounded-[12px] text-[11px] font-[600] transition-colors ${
          activeTab === 'chat' ? 'text-[#7C4DFF] font-[700]' : 'text-[#667085]'
        }`}
      >
        <MessageSquare className="w-[22px] h-[22px] mb-0.5" />
        <span className="truncate">Trò chuyện</span>
      </button>

      {/* 3. Floating Center Voice Button */}
      <div className="relative -mt-[26px] shrink-0">
        <button
          onClick={onVoiceClick}
          aria-label="Nói chuyện bằng giọng nói với Lovira"
          className={`w-[64px] h-[64px] rounded-full bg-gradient-to-tr from-[#7C4DFF] to-[#A45CFF] text-white flex flex-col items-center justify-center shadow-lovira-lg ring-[6px] ring-white dark:ring-[#1B152B] transition-transform active:scale-95 cursor-pointer ${
            isVoiceActive ? 'animate-pulse ring-[#FF5CA8]/40' : 'hover:scale-105'
          }`}
        >
          {getVoiceButtonContent()}
        </button>
      </div>

      {/* 4. Việc cần làm */}
      <button
        onClick={() => onTabChange('tasks')}
        aria-current={activeTab === 'tasks' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-1 py-1 rounded-[12px] text-[11px] font-[600] transition-colors ${
          activeTab === 'tasks' ? 'text-[#7C4DFF] font-[700]' : 'text-[#667085]'
        }`}
      >
        <CheckSquare className="w-[22px] h-[22px] mb-0.5" />
        <span className="truncate">Việc cần làm</span>
      </button>

      {/* 5. Cài đặt */}
      <button
        onClick={() => onTabChange('settings')}
        aria-current={activeTab === 'settings' ? 'page' : undefined}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-1 py-1 rounded-[12px] text-[11px] font-[600] transition-colors ${
          activeTab === 'settings' ? 'text-[#7C4DFF] font-[700]' : 'text-[#667085]'
        }`}
      >
        <Settings className="w-[22px] h-[22px] mb-0.5" />
        <span className="truncate">Cài đặt</span>
      </button>
    </nav>
  );
};
