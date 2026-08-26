import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeSession, ScenarioType } from '../../types';
import { BriefSessionHeader } from '../../services/storageService';
import { MessageSquare, Sparkles, Plus, Stethoscope, Landmark, ShoppingBag, ArrowRight } from 'lucide-react';

interface GlobalChatPageProps {
  activeSession: LifeSession | null;
  sessionsList: BriefSessionHeader[];
  onOpenSession: (id: string) => void;
  onCreateSessionFromTemplate: (type: ScenarioType, customGoal?: string) => Promise<void>;
  userName?: string;
}

export const GlobalChatPage: React.FC<GlobalChatPageProps> = ({
  activeSession,
  sessionsList,
  onOpenSession,
  onCreateSessionFromTemplate,
  userName = 'Bạn',
}) => {
  const navigate = useNavigate();

  // If there is already an active session, auto redirect to its specific URL
  useEffect(() => {
    if (activeSession?.id) {
      navigate(`/session/${activeSession.id}`, { replace: true });
    } else if (sessionsList.length > 0) {
      navigate(`/session/${sessionsList[0].id}`, { replace: true });
    }
  }, [activeSession?.id, sessionsList, navigate]);

  return (
    <div className="max-w-2xl mx-auto my-8 space-y-6">
      {/* Intro Card */}
      <div className="p-6 sm:p-8 rounded-[24px] bg-gradient-to-br from-lovira-card to-lovira-subtle border border-lovira shadow-lovira text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center mx-auto shadow-2xs">
          <MessageSquare className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-[800] text-lovira-title">
            Trò chuyện cùng Lovira
          </h2>
          <p className="text-sm sm:text-base font-[500] text-lovira-muted max-w-md mx-auto leading-relaxed">
            Chào {userName}! Hãy tạo một phiên làm việc mới hoặc bắt đầu trò chuyện tự do để Lovira đồng hành và hỗ trợ bạn nhé.
          </p>
        </div>

        <button
          onClick={() => onCreateSessionFromTemplate('custom', 'Trò chuyện tự do cùng Lovira')}
          className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-[14px] bg-[#287C78] hover:bg-[#1F625F] text-white font-[700] text-sm sm:text-base transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-5 h-5" />
          <span>Bắt đầu trò chuyện mới</span>
        </button>
      </div>

      {/* Suggested Quick Scenarios */}
      <div className="space-y-3">
        <h3 className="text-base font-[700] text-lovira-title px-1">
          Hoặc chọn nhanh theo tình huống:
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onCreateSessionFromTemplate('medical')}
            className="p-4 rounded-[16px] bg-lovira-card hover:bg-lovira-card-hover border border-lovira text-left flex flex-col justify-between space-y-3 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="font-[700] text-sm text-lovira-title group-hover:text-[#287C78] dark:group-hover:text-[#42A39E] flex items-center justify-between">
                <span>Đi khám bệnh</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-lovira-muted mt-0.5">Sổ khám, dặn dò & thuốc</p>
            </div>
          </button>

          <button
            onClick={() => onCreateSessionFromTemplate('shopping')}
            className="p-4 rounded-[16px] bg-lovira-card hover:bg-lovira-card-hover border border-lovira text-left flex flex-col justify-between space-y-3 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="font-[700] text-sm text-lovira-title group-hover:text-[#287C78] dark:group-hover:text-[#42A39E] flex items-center justify-between">
                <span>Đi chợ / Mua sắm</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-lovira-muted mt-0.5">Lên danh sách cần mua</p>
            </div>
          </button>

          <button
            onClick={() => onCreateSessionFromTemplate('administrative')}
            className="p-4 rounded-[16px] bg-lovira-card hover:bg-lovira-card-hover border border-lovira text-left flex flex-col justify-between space-y-3 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="font-[700] text-sm text-lovira-title group-hover:text-[#287C78] dark:group-hover:text-[#42A39E] flex items-center justify-between">
                <span>Thủ tục giấy tờ</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-lovira-muted mt-0.5">Hành chính & công chứng</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
