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
    <div className="w-full h-full min-h-0 overflow-hidden bg-transparent">
      {/* Multi-Column Layout (3 Independent Sibling Columns like Messenger) */}
      <div
        className={`w-full h-full min-h-0 overflow-hidden ${
          isDetailOpen
            ? 'xl:grid xl:grid-cols-[minmax(230px,2fr)_minmax(0,7fr)_minmax(300px,3fr)] lg:grid lg:grid-cols-[minmax(230px,2fr)_minmax(0,8fr)] flex flex-col'
            : 'lg:grid lg:grid-cols-[minmax(230px,2fr)_minmax(0,10fr)] flex flex-col'
        }`}
      >
        {/* Column 1: Desktop Session List (2/12 ratio on desktop, independent scroll) */}
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
          className="hidden lg:flex w-full h-full border-r border-[#EAEFEF] dark:border-[#202E2E] bg-white dark:bg-[#101818]"
        />

        {/* Mobile / Tablet Sessions Drawer Overlay (< 1024px) */}
        {isMobileSessionsOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileSessionsOpen(false)}
            />
            <div className="relative z-[101] w-[85%] max-w-[320px] h-full bg-white dark:bg-[#141E1E] shadow-2xl flex flex-col animate-in slide-in-from-left duration-200 overflow-hidden">
              <div className="p-3.5 border-b border-[#EAEFEF] dark:border-[#202E2E] flex items-center justify-between bg-white dark:bg-[#141E1E] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E4F0EF] text-[#287C78] dark:bg-[#1B2D2C] dark:text-[#42A39E] flex items-center justify-center font-bold text-sm shrink-0">
                    💬
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-[#11181C] dark:text-[#F2F7F7] block leading-tight">
                      Đoạn chat
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-medium text-[#586268] dark:text-[#8E9E9E] block leading-tight mt-0.5">
                      Các phiên đời sống của bạn
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileSessionsOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-[#F0F5F4] dark:hover:bg-[#202E2E] text-[#586268] hover:text-[#11181C] dark:hover:text-[#F2F7F7] cursor-pointer transition-colors"
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

        {/* Column 2: Main Conversation Area (7/12 ratio, active chat header + message stream + fixed composer) */}
        <div
          className={`flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-white dark:bg-[#101818] ${
            isDetailOpen ? 'xl:border-r border-[#EAEFEF] dark:border-[#202E2E]' : ''
          }`}
        >
          <SessionConversationHeader
            session={session}
            onBack={onBack}
            onToggleDetailDrawer={() => setIsDetailOpen((prev) => !prev)}
            onToggleMobileSessionsList={() => setIsMobileSessionsOpen((prev) => !prev)}
            isDetailOpen={isDetailOpen}
          />
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#101818]">
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

        {/* Column 3: Desktop Inline Plan Details Panel (3/12 ratio on >= 1280px) */}
        {isDetailOpen && (
          <div className="hidden xl:flex w-full h-full bg-white dark:bg-[#152020] flex-col overflow-hidden animate-in slide-in-from-right duration-200">
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

        {/* Plan Details Drawer for lg (< 1280px) and Mobile/Tablet (< 1024px) */}
        <div className="xl:hidden">
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
