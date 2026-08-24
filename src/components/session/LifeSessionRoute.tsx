import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LifeSession, SessionStatus, ImportantFactType, VoiceInteractionState } from '../../types';
import { BriefSessionHeader, storageService } from '../../services/storageService';
import { LifeSessionPage } from './LifeSessionPage';
import { ArrowLeft, MessageSquarePlus, History, AlertCircle } from 'lucide-react';

interface LifeSessionRouteProps {
  activeSession: LifeSession | null;
  sessionsList: BriefSessionHeader[];
  onSetSession: (session: LifeSession | null) => void;
  onOpenSession: (id: string) => void;
  onCreateNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onUpdateStatus: (status: SessionStatus) => void;
  onCompleteCurrentTask: () => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddTask: (title: string, important?: boolean) => void;
  onAddSubtask: (parentTaskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddFact: (fact: { type: ImportantFactType; title: string; value: string }) => void;
  onDeleteFact: (factId: string) => void;
  onDeleteResource: (resourceId: string) => void;
  onSendMessage: (text: string, opts?: any) => void;
  onOpenCamera: () => void;
  isLoading: boolean;
  voiceStatus: VoiceInteractionState;
  interimTranscript: string;
  userName: string;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onCancelVoice: () => void;
}

export const LifeSessionRoute: React.FC<LifeSessionRouteProps> = ({
  activeSession,
  sessionsList,
  onSetSession,
  onOpenSession,
  onCreateNewSession,
  onDeleteSession,
  onUpdateStatus,
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
  isLoading,
  voiceStatus,
  interimTranscript,
  userName,
  onStartVoice,
  onStopVoice,
  onCancelVoice,
}) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Load session from storage if URL parameter changed or refreshed
  useEffect(() => {
    if (!sessionId) return;
    if (activeSession?.id === sessionId) return;

    const storedSession = storageService.getSession(sessionId);
    if (storedSession) {
      onSetSession(storedSession);
      storageService.setActiveSessionId(sessionId);
    } else {
      onSetSession(null);
    }
  }, [sessionId, activeSession?.id, onSetSession]);

  // If session is loaded and matches the route param
  if (activeSession && activeSession.id === sessionId) {
    return (
      <LifeSessionPage
        session={activeSession}
        sessionsList={sessionsList}
        onOpenSession={onOpenSession}
        onCreateNewSession={onCreateNewSession}
        onOpenHistory={() => navigate('/history')}
        onBack={() => navigate('/')}
        onUpdateStatus={onUpdateStatus}
        onDeleteSession={() => onDeleteSession(activeSession.id)}
        onCompleteCurrentTask={onCompleteCurrentTask}
        onToggleTask={onToggleTask}
        onToggleSubtask={onToggleSubtask}
        onAddTask={onAddTask}
        onAddSubtask={onAddSubtask}
        onDeleteTask={onDeleteTask}
        onAddFact={onAddFact}
        onDeleteFact={onDeleteFact}
        onDeleteResource={onDeleteResource}
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
    );
  }

  // Not found fallback
  return (
    <div className="max-w-xl mx-auto my-12 p-8 rounded-[24px] bg-lovira-card border border-lovira text-center space-y-5 shadow-lovira">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
        <AlertCircle className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-xl font-[800] text-lovira-title">
          Không tìm thấy phiên làm việc
        </h3>
        <p className="text-sm font-[500] text-lovira-muted leading-relaxed">
          Phiên làm việc có mã <code className="px-1.5 py-0.5 rounded bg-lovira-input text-xs font-bold text-lovira-title">{sessionId}</code> không tồn tại trên thiết bị này hoặc đã được dọn dẹp.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2.5 rounded-xl border border-lovira text-xs font-[700] text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover flex items-center gap-2 cursor-pointer transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang chủ</span>
        </button>

        <button
          onClick={() => navigate('/history')}
          className="px-4 py-2.5 rounded-xl border border-lovira text-xs font-[700] text-lovira-muted hover:text-lovira-title hover:bg-lovira-card-hover flex items-center gap-2 cursor-pointer transition-all"
        >
          <History className="w-4 h-4" />
          <span>Xem lịch sử phiên</span>
        </button>

        <button
          onClick={onCreateNewSession}
          className="px-4 py-2.5 rounded-xl bg-[#287C78] hover:bg-[#1F625F] text-white text-xs font-[700] flex items-center gap-2 cursor-pointer shadow-xs transition-all"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Tạo phiên mới</span>
        </button>
      </div>
    </div>
  );
};
