import React, { useState } from 'react';
import { LifeSession, SessionStatus, VoiceInteractionState, BriefSessionHeader } from '../../types';
import { SessionConversationHeader } from './SessionConversationHeader';
import { SessionListSidebar } from './SessionListSidebar';
import { ConversationPane } from './ConversationPane';
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
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isMobileSessionsOpen, setIsMobileSessionsOpen] = useState(false);

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-surface overflow-hidden relative sm:rounded-2xl sm:border sm:border-default">
      {/* Session Conversation Header */}
      <SessionConversationHeader
        session={session}
        onBack={onBack}
        onToggleDetailDrawer={() => setIsDetailDrawerOpen((prev) => !prev)}
        onToggleMobileSessionsList={() => setIsMobileSessionsOpen((prev) => !prev)}
      />

      {/* Main Conversation Layout */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Desktop Session List Sidebar (visible on lg screens >= 1024px) */}
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
          className="hidden lg:flex"
        />

        {/* Mobile / Tablet Sessions Drawer Overlay (< 1024px) */}
        {isMobileSessionsOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 transition-opacity"
              onClick={() => setIsMobileSessionsOpen(false)}
            />
            <div className="relative z-10 w-[290px] sm:w-[320px] h-full bg-surface shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              <div className="p-3 border-b border-default flex items-center justify-between bg-surface-raised">
                <span className="text-xs font-bold text-text-primary pl-2">Danh sách cuộc trò chuyện</span>
                <button
                  onClick={() => setIsMobileSessionsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-surface text-text-secondary cursor-pointer"
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
                className="flex flex-1 w-full border-r-0"
              />
            </div>
          </div>
        )}

        {/* Center Main Conversation Pane */}
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

      {/* Slide-over Session Detail Drawer */}
      <SessionDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
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
  );
};
