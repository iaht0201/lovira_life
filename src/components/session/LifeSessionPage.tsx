import React, { useState } from 'react';
import { LifeSession, SessionStatus, VoiceInteractionState, BriefSessionHeader } from '../../types';
import { SessionListSidebar } from '../chat/SessionListSidebar';
import { SessionConversationHeader } from '../chat/SessionConversationHeader';
import { ConversationPane } from '../chat/ConversationPane';
import { SessionDetailDrawer } from '../chat/SessionDetailDrawer';
import { X } from 'lucide-react';

interface LifeSessionPageProps {
  session: LifeSession;
  sessionsList?: (BriefSessionHeader | LifeSession)[];
  onOpenSession?: (id: string) => void;
  onCreateNewSession?: () => void;
  onOpenHistory?: () => void;
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
}

export const LifeSessionPage: React.FC<LifeSessionPageProps> = ({
  session,
  sessionsList = [],
  onOpenSession,
  onCreateNewSession,
  onOpenHistory,
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
}) => {
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isSessionListDrawerOpen, setIsSessionListDrawerOpen] = useState(false);

  // Task calculation
  let completedTasksCount = 0;
  let totalTasksCount = 0;
  session.tasks.forEach((t) => {
    if (t.subtasks && t.subtasks.length > 0) {
      t.subtasks.forEach((st) => {
        totalTasksCount += 1;
        if (st.status === 'completed' || st.status === 'skipped') completedTasksCount += 1;
      });
    } else {
      totalTasksCount += 1;
      if (t.status === 'completed' || t.status === 'skipped') completedTasksCount += 1;
    }
  });

  return (
    <div className="flex h-[calc(100dvh-64px)] w-full overflow-hidden bg-lovira-card transition-colors">
      {/* 1. Desktop Session List Column (Visible on >= 1280px xl) */}
      <div className="hidden xl:block">
        <SessionListSidebar
          sessions={sessionsList.length > 0 ? sessionsList : [session]}
          activeSessionId={session.id}
          onSelectSession={(id) => onOpenSession && onOpenSession(id)}
          onCreateNewSession={onCreateNewSession}
          onOpenHistory={onOpenHistory}
        />
      </div>

      {/* 2. Slide-over Session List Drawer (Medium Desktop 1024-1279px) */}
      {isSessionListDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-start bg-black/50 backdrop-blur-xs xl:hidden">
          <div className="relative w-[320px] h-full bg-lovira-card border-r border-lovira z-10 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-3 border-b border-lovira flex justify-end">
              <button
                onClick={() => setIsSessionListDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-lovira-badge-purple text-lovira-purple flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SessionListSidebar
              sessions={sessionsList.length > 0 ? sessionsList : [session]}
              activeSessionId={session.id}
              onSelectSession={(id) => {
                onOpenSession && onOpenSession(id);
                setIsSessionListDrawerOpen(false);
              }}
              onCreateNewSession={() => {
                onCreateNewSession && onCreateNewSession();
                setIsSessionListDrawerOpen(false);
              }}
              onOpenHistory={onOpenHistory}
            />
          </div>
          <div className="flex-1" onClick={() => setIsSessionListDrawerOpen(false)} />
        </div>
      )}

      {/* 3. Main Conversation Canvas Column (Flex-1) */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-lovira-card">
        {/* Chat Conversation Header */}
        <SessionConversationHeader
          session={session}
          onBack={onBack}
          onToggleSessionDrawer={() => setIsSessionListDrawerOpen(true)}
          onOpenDetails={() => setIsDetailsDrawerOpen(true)}
          completedTasksCount={completedTasksCount}
          totalTasksCount={totalTasksCount}
        />

        {/* Conversation Stream & Composer */}
        <ConversationPane
          session={session}
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

      {/* 4. Session Detail Drawer (Tasks, Facts, Resources Side-panel) */}
      <SessionDetailDrawer
        isOpen={isDetailsDrawerOpen}
        onClose={() => setIsDetailsDrawerOpen(false)}
        session={session}
        onUpdateStatus={onUpdateStatus}
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
