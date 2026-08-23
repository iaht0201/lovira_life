import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { BriefSessionHeader } from '../../services/storageService';
import { RecentSessionItem } from './RecentSessionItem';
import { LoviraMascot } from './LoviraMascot';

interface RecentSessionsProps {
  sessions: BriefSessionHeader[];
  onOpenSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onViewAll?: () => void;
  onCreateSession: () => void;
}

export const RecentSessions: React.FC<RecentSessionsProps> = ({
  sessions,
  onOpenSession,
  onDeleteSession,
  onViewAll,
  onCreateSession,
}) => {
  return (
    <section className="bg-lovira-card border border-lovira rounded-[22px] p-5 sm:p-6 shadow-lovira transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[18px] sm:text-[20px] font-[800] text-lovira-title">
          Phiên gần đây
        </h3>
        {sessions.length > 0 && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-[13px] sm:text-[14px] font-[700] text-lovira-purple hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-[16px] h-[16px]" />
          </button>
        )}
      </div>

      {/* Sessions List or Empty State */}
      {sessions.length > 0 ? (
        <div className="space-y-2.5">
          {sessions.slice(0, 5).map((session) => (
            <RecentSessionItem
              key={session.id}
              session={session}
              onOpen={onOpenSession}
              onDelete={onDeleteSession}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-8 px-4 text-center flex flex-col items-center justify-center space-y-3">
          <LoviraMascot size="sm" />
          <div className="max-w-sm space-y-1">
            <h4 className="text-[16px] font-[700] text-lovira-title">
              Chưa có phiên nào
            </h4>
            <p className="text-[13px] text-lovira-muted leading-relaxed">
              Hãy tạo một phiên mới để Lovira đồng hành cùng chú nhé!
            </p>
          </div>
          <button
            onClick={onCreateSession}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-lovira-purple text-white font-[700] text-[14px] transition-all shadow-sm cursor-pointer hover:opacity-90"
          >
            <Plus className="w-[18px] h-[18px]" />
            <span>+ Tạo phiên mới</span>
          </button>
        </div>
      )}
    </section>
  );
};
