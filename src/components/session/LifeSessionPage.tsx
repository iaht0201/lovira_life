import React from 'react';
import { LifeSession, SessionStatus, ImportantFactType, VoiceInteractionState } from '../../types';
import { SessionHeader } from './SessionHeader';
import { NextRecommendedAction } from './NextRecommendedAction';
import { ImportantFactsPanel } from './ImportantFactsPanel';
import { TaskProgressPanel } from './TaskProgressPanel';
import { SessionResourcePanel } from './SessionResourcePanel';
import { AssistantComposer } from './AssistantComposer';

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
  onAddFact: (fact: { category: ImportantFactType; title: string; value: string }) => void;
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
  userName = 'Bạn',
  onStartVoice,
  onStopVoice,
  onCancelVoice,
}) => {
  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* 1. Session Header */}
      <SessionHeader
        session={session}
        onBack={onBack}
        onUpdateStatus={onUpdateStatus}
        onDeleteSession={onDeleteSession}
      />

      {/* 2. Next Recommended Action Card */}
      <NextRecommendedAction
        action={session.nextRecommendedAction}
        onCompleteCurrentTask={onCompleteCurrentTask}
        onOpenCamera={onOpenCamera}
      />

      {/* 3. Tasks & Important Facts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks Checklist */}
        <TaskProgressPanel
          tasks={session.tasks}
          onToggleTask={onToggleTask}
          onToggleSubtask={onToggleSubtask}
          onAddTask={onAddTask}
          onAddSubtask={onAddSubtask}
          onDeleteTask={onDeleteTask}
        />

        {/* Important Facts Panel */}
        <ImportantFactsPanel
          facts={session.importantFacts}
          onAddFact={onAddFact}
          onDeleteFact={onDeleteFact}
        />
      </div>

      {/* 4. Session Resources (Photos/Documents) */}
      <SessionResourcePanel
        resources={session.resources}
        onOpenCamera={onOpenCamera}
        onDeleteResource={onDeleteResource}
      />

      {/* 5. Lovira Assistant Composer & Message Stream */}
      <AssistantComposer
        messages={session.messages}
        onSendMessage={onSendMessage}
        onOpenCamera={onOpenCamera}
        isLoading={isLoading}
        scenarioType={session.scenarioType}
        voiceStatus={voiceStatus}
        interimTranscript={interimTranscript}
        userName={userName}
        onStartVoice={onStartVoice}
        onStopVoice={onStopVoice}
        onCancelVoice={onCancelVoice}
      />
    </div>
  );
};
