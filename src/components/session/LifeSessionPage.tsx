import React from 'react';
import { LifeSession, SessionStatus, VoiceInteractionState } from '../../types';
import { SessionHeader } from './SessionHeader';
import { NextRecommendedAction } from './NextRecommendedAction';
import { TaskProgressPanel } from './TaskProgressPanel';
import { ImportantFactsPanel } from './ImportantFactsPanel';
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
  sessionsList?: any[];
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
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Session Header */}
      <SessionHeader
        session={session}
        onBack={onBack}
        onUpdateStatus={onUpdateStatus}
        onDeleteSession={onDeleteSession}
      />

      {/* Next Recommended Action */}
      {session.recommendedAction && (
        <NextRecommendedAction
          action={session.recommendedAction}
          onCompleteCurrentTask={onCompleteCurrentTask}
          onOpenCamera={onOpenCamera}
        />
      )}

      {/* Main Grid Layout: Tasks & Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Tasks & Progress */}
        <div className="space-y-6">
          <TaskProgressPanel
            tasks={session.tasks}
            onToggleTask={onToggleTask}
            onToggleSubtask={onToggleSubtask}
            onAddTask={onAddTask}
            onAddSubtask={onAddSubtask}
            onDeleteTask={onDeleteTask}
          />

          <ImportantFactsPanel
            facts={session.importantFacts}
            onAddFact={onAddFact}
            onDeleteFact={onDeleteFact}
          />

          <SessionResourcePanel
            resources={session.resources}
            onDeleteResource={onDeleteResource}
            onOpenCamera={onOpenCamera}
          />
        </div>

        {/* Right Column: AI Conversation Assistant */}
        <div>
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
      </div>
    </div>
  );
};
