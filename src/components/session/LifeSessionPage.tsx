import React, { useState } from 'react';
import { LifeSession, SessionStatus, VoiceInteractionState, BriefSessionHeader } from '../../types';
import { SessionConversationHeader } from './SessionConversationHeader';
import { SessionListSidebar } from './SessionListSidebar';
import { ConversationPane } from './ConversationPane';
import { SessionPlanDetailContent } from './SessionPlanDetailContent';
import { SessionDetailDrawer } from './SessionDetailDrawer';
import { X } from 'lucide-react';

interface LifeSessionPageProps {
  session: LifeSession;
  onBack: () => void;
  onUpdateStatus: (status: SessionStatus) => void;
  onDeleteSession: () => void;
  onCompleteCurrentTask: () => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubtask?: (parentTaskId: string, subtaskId: string) => void;
  onAddTask: (title: string, description?: string) => void;
  onAddSubtask?: (parentTaskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddFact: (fact: { type: 'requirement' | 'preference' | 'note' | 'warning'; title: string; value: string }) => void;
  onDeleteFact: (factId: string) => void;
  onDeleteResource: (id: string) => void;
  onSendMessage: (text: string, options?: { inputMode?: 'text' | 'voice' }) => void;
  onOpenCamera: () => void;
  isLoading?: boolean;
  voiceStatus?: VoiceInteractionState;
  interimTranscript?: string;
  userName?: string;
  onStartVoice?: () => void;
  onStopVoice?: () => void;
  onCancelVoice?: () => void;
  sessionsList?: BriefSessionHeader[];
  onOpenSession?: (id: string) => void;
  onCreateNewSession?: () => void;
  onOpenHistory?: () => void;
}

export const LifeSessionPage: React.FC<LifeSessionPageProps> = ({
  session,
  onBack,
  onUpdateStatus,
  onDeleteSession,
  onCompleteCurrentTask,
  onToggleTask,
  onToggleSubtask,
  onAddTask,
  onAddSubtask,
  onDeleteTask,
  onAddFact,
  onDeleteFact,
  onDeleteResource,
  onSendMessage,
  onOpenCamera,
  isLoading = false,
  voiceStatus = 'idle',
  interimTranscript = '',
  userName = 'Chú Ba',
  onStartVoice,
  onStopVoice,
  onCancelVoice,
  sessionsList = [],
  onOpenSession,
  onCreateNewSession,
}) => {
  // Plan details panel is open by default on larger desktop screens for instant visibility
  const [isDetailOpen, setIsDetailOpen] = useState(true);
  const [isMobileSessionsOpen, setIsMobileSessionsOpen] = useState(false);

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-white dark:bg-[#141E1E] overflow-hidden relative border border-[#F0EDE4] dark:border-[#1F2E2E] shadow-lovira sm:rounded-2xl">
      {/* Multi-Column Layout (3 Independent Columns like Messenger) */}
      <div className="flex-1 flex min-h-0 h-full relative overflow-hidden">
        {/* Column 1: Desktop Session List Sidebar (Independent Header + Scrollable Chat List) */}
        <SessionListSidebar
          sessionsList={sessionsList}
          activeSessionId={session.id}
          onOpenSession={(id) => {
            onOpenSession?.(id);
            setIsMobileSessionsOpen(false);
          }}
          onCreateNewSession={() => {
            onCreateNewSession?.();
            setIsMobileSessionsOpen(false);
          }}
          className="hidden lg:flex w-[280px] xl:w-[320px] shrink-0"
        />

        {/* Mobile / Tablet Sessions Drawer Overlay (< 1024px) */}
        {isMobileSessionsOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileSessionsOpen(false)}
            />
            <div className="relative z-[101] w-[85%] max-w-[320px] h-full bg-white dark:bg-[#141E1E] shadow-2xl flex flex-col animate-in slide-in-from-left duration-200 overflow-hidden">
              <div className="p-3.5 border-b border-[#F0EDE4] dark:border-[#202E2E] flex items-center justify-between bg-white dark:bg-[#141E1E] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E4F0EF] text-[#287C78] dark:bg-[#1B2D2C] dark:text-[#42A39E] flex items-center justify-center font-bold text-sm shrink-0">
                    💬
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-[#1C2226] dark:text-[#F2F7F7] block leading-tight">
                      Đoạn chat
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-medium text-[#7A848B] dark:text-[#8E9E9E] block leading-tight mt-0.5">
                      Các phiên đời sống của bạn
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileSessionsOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-[#F6F4EF] dark:hover:bg-[#202E2E] text-[#7A848B] hover:text-[#1C2226] dark:hover:text-[#F2F7F7] cursor-pointer transition-colors"
                  aria-label="Đóng danh sách"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SessionListSidebar
                sessionsList={sessionsList}
                activeSessionId={session.id}
                onOpenSession={(id) => {
                  onOpenSession?.(id);
                  setIsMobileSessionsOpen(false);
                }}
                onCreateNewSession={() => {
                  onCreateNewSession?.();
                  setIsMobileSessionsOpen(false);
                }}
                showHeader={false}
                isMobile
                className="flex flex-1 w-full border-r-0"
              />
            </div>
          </div>
        )}

        {/* Column 2: Center Main Conversation Area (Independent Active Chat Header + Message Stream + Input Composer) */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-white dark:bg-[#121818]">
          <SessionConversationHeader
            session={session}
            onBack={onBack}
            onToggleDetailDrawer={() => setIsDetailOpen((prev) => !prev)}
            onToggleMobileSessionsList={() => setIsMobileSessionsOpen((prev) => !prev)}
            isDetailOpen={isDetailOpen}
          />
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ConversationPane
              messages={session.messages}
              onSendMessage={onSendMessage}
              onOpenCamera={onOpenCamera}
              isLoading={isLoading}
              voiceStatus={voiceStatus}
              interimTranscript={interimTranscript}
              userName={userName}
              onStartVoice={onStartVoice}
              onStopVoice={onStopVoice}
              onCancelVoice={onCancelVoice}
            />
          </div>
        </div>

        {/* Column 3: Desktop Inline Plan Details Panel (Independent Header + Scrollable Plan + Footer Actions) */}
        {isDetailOpen && (
          <div className="hidden lg:flex w-[340px] xl:w-[380px] shrink-0 border-l border-[#F0EDE4] dark:border-[#202E2E] bg-white dark:bg-[#152020] flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
            <SessionPlanDetailContent
              session={session}
              onClose={() => setIsDetailOpen(false)}
              onUpdateStatus={onUpdateStatus}
              onDeleteSession={onDeleteSession}
              onCompleteCurrentTask={onCompleteCurrentTask}
              onToggleTask={onToggleTask}
              onToggleSubtask={onToggleSubtask}
              onAddTask={onAddTask}
              onAddSubtask={onAddSubtask}
              onDeleteTask={onDeleteTask}
              onAddFact={onAddFact}
              onDeleteFact={onDeleteFact}
              onDeleteResource={onDeleteResource}
              onOpenCamera={onOpenCamera}
            />
          </div>
        )}

        {/* Mobile / Tablet Plan Details Drawer (< 1024px) */}
        <div className="lg:hidden">
          <SessionDetailDrawer
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            session={session}
            onUpdateStatus={onUpdateStatus}
            onDeleteSession={onDeleteSession}
            onCompleteCurrentTask={onCompleteCurrentTask}
            onToggleTask={onToggleTask}
            onToggleSubtask={onToggleSubtask}
            onAddTask={onAddTask}
            onAddSubtask={onAddSubtask}
            onDeleteTask={onDeleteTask}
            onAddFact={onAddFact}
            onDeleteFact={onDeleteFact}
            onDeleteResource={onDeleteResource}
            onOpenCamera={onOpenCamera}
          />
        </div>
      </div>
    </div>
  );
};
