/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LifeSession,
  SessionStatus,
  ScenarioType,
  ImportantFactType,
  AccessibilitySettings,
  AccessibilityContext,
  AISettings,
  AgentAction,
  GeneratedSessionPlan,
  UserProfile,
  ScenarioFamily,
  VoiceInteractionState,
  VoiceErrorType,
  InteractionInputMode,
  AppAction,
  AppInteractionContext,
  PendingInteraction,
} from './types';
import { storageService, BriefSessionHeader } from './services/storageService';
import { indexedDbService } from './services/indexedDbService';
import { SCENARIO_TEMPLATES } from './data/initialData';
import {
  applyAgentActionBatch,
  calculateNextRecommendedAction,
  reconcileParentTaskStatus,
  reconcileSessionDerivedState,
  resolveCurrentStep,
} from './services/actionEngine';
import { buildPartialSuccessReply, deduceHonorifics, formatInitialSessionGreeting } from './services/conversationStyle';
import { parseLocalIntent } from './services/localIntentEngine';
import { createLifeSessionFromPlan } from './services/sessionFactory';
import { speakText, stopSpeaking, isSpeaking } from './services/ttsService';
import { speechRecognitionService } from './services/voice/speechRecognitionService';
import { validateAppAction } from './services/interaction/appActionValidator';
import { applyAppAction } from './services/interaction/appActionEngine';
import { resolvePendingInteraction } from './services/interaction/pendingInteractionResolver';

import { Header } from './components/common/Header';
import { Navigation } from './components/common/Navigation';
import { AccessibilityToolbar } from './components/common/AccessibilityToolbar';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { Toast } from './components/common/Toast';

import { AppShell } from './components/layout/AppShell';
import { NavTab } from './components/layout/DesktopSidebar';
import { HomePage } from './components/home/HomePage';
import { UpcomingReminders } from './components/home/UpcomingReminders';
import { LifeDashboard } from './components/dashboard/LifeDashboard';
import { LifeSessionPage } from './components/session/LifeSessionPage';
import { CameraModal } from './components/camera/CameraModal';
import { VSLFloatingPanel } from './components/vsl/VSLFloatingPanel';
import { SettingsPage } from './components/settings/SettingsPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { ProfileInviteBanner } from './components/profile/ProfileInviteBanner';
import { ProfileSetupFlow } from './components/profile/ProfileSetupFlow';
import { GlobalVoiceButton } from './components/voice/GlobalVoiceButton';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeSession, setActiveSession] = useState<LifeSession | null>(null);
  const [sessionsList, setSessionsList] = useState<BriefSessionHeader[]>([]);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(
    storageService.getAccessibilitySettings()
  );
  const [aiSettings, setAiSettings] = useState<AISettings>(
    storageService.getAISettings()
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    storageService.getUserProfile()
  );
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    storageService.isProfileBannerDismissed()
  );

  // Voice Interaction State (Version 2)
  const [voiceStatus, setVoiceStatus] = useState<VoiceInteractionState>('idle');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | undefined>(undefined);
  const [pendingInteraction, setPendingInteraction] = useState<PendingInteraction | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize storage & active session on mount
  useEffect(() => {
    storageService.init();
    refreshSessionsList();

    const activeId = storageService.getActiveSessionId();
    if (activeId) {
      const session = storageService.getSession(activeId);
      if (session) {
        setActiveSession(session);
      }
    }
  }, []);

  // Sync Accessibility CSS variables & class names
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--font-scale', accessibility.fontScale.toString());

    if (accessibility.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (accessibility.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    storageService.saveAccessibilitySettings(accessibility);
  }, [accessibility]);

  // Sync AI Settings
  useEffect(() => {
    storageService.saveAISettings(aiSettings);
  }, [aiSettings]);

  const refreshSessionsList = () => {
    setSessionsList(storageService.getSessionsList());
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const saveUpdatedSession = (session: LifeSession) => {
    setActiveSession(session);
    storageService.saveSession(session);
    refreshSessionsList();
  };

  // 1. Open Session
  const handleOpenSession = (id: string) => {
    const session = storageService.getSession(id);
    if (session) {
      setActiveSession(session);
      storageService.setActiveSessionId(id);
      setActiveTab('session');
    }
  };

  // 2. Create Session from Template or AI Custom Plan
  const handleCreateSessionFromTemplate = async (
    type: ScenarioType,
    customGoal?: string
  ) => {
    const now = new Date().toISOString();
    const newId = `session-${type}-${Date.now()}`;

    if (type === 'custom' && customGoal) {
      showToast('🤖 AI Lovira đang phân tích và lập kế hoạch phiên hỗ trợ...');
      setIsLoading(true);

      try {
        const res = await fetch('/api/generate-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: customGoal,
            isDemoMode: aiSettings.demoMode || aiSettings.provider === 'demo',
          }),
        });

        const plan: GeneratedSessionPlan = await res.json();
        const accessibilityCtx: AccessibilityContext | undefined = {
          preferredInteraction: accessibility.speakResponse ? 'voice' : 'text',
          oneStepMode: accessibility.reducedMotion,
        };
        const newCustomSession = createLifeSessionFromPlan(
          plan,
          customGoal,
          'custom',
          accessibilityCtx,
          userProfile
        );

        saveUpdatedSession(newCustomSession);
        storageService.setActiveSessionId(newCustomSession.id);
        setActiveTab('session');
        showToast(`✨ Đã khởi tạo thành công phiên AI: "${newCustomSession.title}"`);
        if (accessibility.speakResponse || voiceStatus === 'speaking') {
          speakWithVoiceStatus(`Lovira đã tạo xong kế hoạch cho ${newCustomSession.title}`);
        }
      } catch (err) {
        console.error('Error generating AI session plan:', err);
        showToast('Không thể tạo phiên AI, vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Default template handling for standard scenarios
    const tmpl = SCENARIO_TEMPLATES.find((t) => t.type === type) || SCENARIO_TEMPLATES[0];
    let family: ScenarioFamily = 'custom';
    if (type === 'medical') family = 'healthcare';
    else if (type === 'administrative') family = 'administrative';
    else if (type === 'shopping') family = 'shopping';
    else if (type === 'document') family = 'documents';

    const newSession: LifeSession = {
      id: newId,
      title: tmpl.title,
      scenarioType: type,
      scenarioFamily: family,
      status: 'active',
      goal: tmpl.defaultGoal,
      createdAt: now,
      updatedAt: now,
      currentStepId: 'task-1',
      importantFacts: tmpl.defaultFacts.map((f, i) => ({
        id: `fact-${i + 1}`,
        type: f.type,
        title: f.title,
        value: f.value,
        createdAt: now,
        updatedAt: now,
      })),
      tasks: tmpl.defaultTasks.map((t, i) => ({
        id: `task-${i + 1}`,
        title: t,
        order: i + 1,
        status: 'pending' as const,
      })),
      resources: [],
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'lovira',
          text: formatInitialSessionGreeting(
            tmpl.title,
            tmpl.defaultTasks.map((t) => ({ title: t })),
            deduceHonorifics(userProfile, tmpl.title),
            tmpl.defaultGoal
          ),
          timestamp: now,
        },
      ],
      actionLog: [
        {
          id: `log-${Date.now()}`,
          timestamp: now,
          actionType: 'CREATE_SESSION',
          summary: `Khởi tạo phiên ${tmpl.title}`,
          triggeredBy: 'system',
        },
      ],
    };

    newSession.nextRecommendedAction = calculateNextRecommendedAction(newSession);

    saveUpdatedSession(newSession);
    storageService.setActiveSessionId(newId);
    setActiveTab('session');
    showToast(`Đã khởi tạo phiên "${newSession.title}"`);
  };

  // Helper for TTS synchronized with Voice Status
  const speakWithVoiceStatus = useCallback((text: string) => {
    stopSpeaking();
    setVoiceStatus('speaking');
    speakText(text, {
      onStart: () => setVoiceStatus('speaking'),
      onEnd: () => setVoiceStatus('idle'),
      onError: () => setVoiceStatus('idle'),
    });
  }, []);

  // 3. Delete Session
  const handleDeleteSession = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xoá phiên hỗ trợ',
      message: 'Bạn có chắc chắn muốn xoá toàn bộ dữ liệu phiên này? Thao tác này không thể hoàn tác.',
      onConfirm: () => {
        storageService.deleteSession(id);
        indexedDbService.deleteSessionBlobs(id);
        if (activeSession?.id === id) {
          setActiveSession(null);
          storageService.clearActiveSessionId();
          setActiveTab('dashboard');
        }
        refreshSessionsList();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('Đã xoá phiên hỗ trợ');
      },
    });
  };

  // 4. Update Status (Complete / Pause / Resume / Archive)
  const handleUpdateStatus = (newStatus: SessionStatus) => {
    if (!activeSession) return;
    const now = new Date().toISOString();
    const updated: LifeSession = {
      ...activeSession,
      status: newStatus,
      updatedAt: now,
      actionLog: [
        {
          id: `log-${Date.now()}`,
          timestamp: now,
          actionType: 'UPDATE_STATUS',
          summary: `Chuyển trạng thái sang ${newStatus}`,
          triggeredBy: 'manual',
        },
        ...activeSession.actionLog,
      ],
    };
    saveUpdatedSession(updated);
    showToast(`Đã chuyển trạng thái sang: ${newStatus}`);
  };

  // 5. Toggle Task (Direct & Reconcile Parent)
  const handleToggleTask = (taskId: string) => {
    if (!activeSession) return;
    const now = new Date().toISOString();

    const updatedTasks = activeSession.tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
        // Auto complete all subtasks if task is marked completed
        const updatedSubs = (t.subtasks || []).map((st) => ({
          ...st,
          status: nextStatus === 'completed' ? ('completed' as const) : st.status,
        }));
        return {
          ...t,
          status: nextStatus as any,
          completedAt: nextStatus === 'completed' ? now : undefined,
          subtasks: updatedSubs,
        };
      }
      return t;
    });

    let updatedSession: LifeSession = {
      ...activeSession,
      tasks: updatedTasks,
      updatedAt: now,
    };

    updatedSession = reconcileSessionDerivedState(updatedSession);
    saveUpdatedSession(updatedSession);
  };

  // 6. Toggle Subtask (Direct & Reconcile Parent)
  const handleToggleSubtask = (parentTaskId: string, subtaskId: string) => {
    if (!activeSession) return;
    const now = new Date().toISOString();

    const updatedTasks = activeSession.tasks.map((t) => {
      if (t.id === parentTaskId && t.subtasks) {
        const updatedSubs = t.subtasks.map((st) => {
          if (st.id === subtaskId) {
            const nextStatus = st.status === 'completed' ? 'pending' : 'completed';
            return {
              ...st,
              status: nextStatus as any,
              completedAt: nextStatus === 'completed' ? now : undefined,
            };
          }
          return st;
        });

        const allDone = updatedSubs.every((s) => s.status === 'completed');
        const anyDone = updatedSubs.some((s) => s.status === 'completed');
        const parentStatus = allDone
          ? ('completed' as const)
          : anyDone
          ? ('active' as const)
          : t.status === 'completed'
          ? ('active' as const)
          : t.status;

        return {
          ...t,
          status: parentStatus,
          subtasks: updatedSubs,
        };
      }
      return t;
    });

    let updatedSession: LifeSession = {
      ...activeSession,
      tasks: updatedTasks,
      updatedAt: now,
    };

    updatedSession = reconcileSessionDerivedState(updatedSession);
    saveUpdatedSession(updatedSession);
  };

  // 7. Add / Delete Task
  const handleAddTask = (title: string, important = false) => {
    if (!activeSession || !title.trim()) return;
    const now = new Date().toISOString();
    const newTask = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      order: activeSession.tasks.length + 1,
      status: 'pending' as const,
      important,
    };

    const updated: LifeSession = {
      ...activeSession,
      tasks: [...activeSession.tasks, newTask],
      updatedAt: now,
    };

    const reconciled = reconcileSessionDerivedState(updated);
    saveUpdatedSession(reconciled);
    showToast(`Đã thêm việc: "${title}"`);
  };

  const handleAddSubtask = (parentTaskId: string, title: string) => {
    if (!activeSession || !title.trim()) return;
    const now = new Date().toISOString();
    const newSubtask = {
      id: `sub-${Date.now()}`,
      title: title.trim(),
      order: 1,
      status: 'pending' as const,
    };

    const updatedTasks = activeSession.tasks.map((t) => {
      if (t.id === parentTaskId) {
        const subs = t.subtasks || [];
        return {
          ...t,
          subtasks: [...subs, { ...newSubtask, order: subs.length + 1 }],
        };
      }
      return t;
    });

    const updated: LifeSession = {
      ...activeSession,
      tasks: updatedTasks,
      updatedAt: now,
    };

    const reconciled = reconcileSessionDerivedState(updated);
    saveUpdatedSession(reconciled);
    showToast(`Đã thêm việc con: "${title}"`);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!activeSession) return;
    const updated: LifeSession = {
      ...activeSession,
      tasks: activeSession.tasks.filter((t) => t.id !== taskId),
      updatedAt: new Date().toISOString(),
    };
    const reconciled = reconcileSessionDerivedState(updated);
    saveUpdatedSession(reconciled);
    showToast('Đã xoá công việc');
  };

  // 8. Add Fact
  const handleAddFact = (fact: { title: string; value: string; type: ImportantFactType }) => {
    if (!activeSession || !fact.title.trim()) return;
    const now = new Date().toISOString();
    const newFact = {
      id: `fact-${Date.now()}`,
      type: fact.type,
      title: fact.title.trim(),
      value: fact.value.trim(),
      createdAt: now,
      updatedAt: now,
    };

    const updated: LifeSession = {
      ...activeSession,
      importantFacts: [newFact, ...activeSession.importantFacts],
      updatedAt: now,
    };
    saveUpdatedSession(updated);
    showToast(`Đã thêm thông tin: "${fact.title}"`);
  };

  // 9. Delete Fact (Confirm if warning)
  const handleDeleteFact = (factId: string) => {
    if (!activeSession) return;
    const targetFact = activeSession.importantFacts.find((f) => f.id === factId);
    if (!targetFact) return;

    if (targetFact.type === 'warning' || targetFact.type === 'requirement') {
      setConfirmModal({
        isOpen: true,
        title: 'Xác nhận xoá thông tin quan trọng',
        message: `Thông tin "${targetFact.title}: ${targetFact.value}" rất quan trọng. Lovira cần bạn xác nhận trước khi xoá khỏi phiên!`,
        onConfirm: () => {
          const updated: LifeSession = {
            ...activeSession,
            importantFacts: activeSession.importantFacts.filter((f) => f.id !== factId),
            updatedAt: new Date().toISOString(),
          };
          saveUpdatedSession(updated);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          showToast(`Đã xoá thông tin "${targetFact.title}"`);
        },
      });
    } else {
      const updated: LifeSession = {
        ...activeSession,
        importantFacts: activeSession.importantFacts.filter((f) => f.id !== factId),
        updatedAt: new Date().toISOString(),
      };
      saveUpdatedSession(updated);
      showToast(`Đã xoá thông tin "${targetFact.title}"`);
    }
  };

  // 10. Complete Current Task (Next Recommended Action button)
  const handleCompleteCurrentTask = () => {
    if (!activeSession) return;
    const resolvedStep = resolveCurrentStep(activeSession);
    if (!resolvedStep) return;

    if (resolvedStep.subtask && resolvedStep.parentTask) {
      handleToggleSubtask(resolvedStep.parentTask.id, resolvedStep.subtask.id);
      showToast(`Đã đánh dấu hoàn thành: "${resolvedStep.subtask.title}"`);
    } else if (resolvedStep.task) {
      handleToggleTask(resolvedStep.task.id);
      showToast(`Đã đánh dấu hoàn thành: "${resolvedStep.task.title}"`);
    }
  };

  // 11. Delete Resource
  const handleDeleteResource = (id: string) => {
    if (!activeSession) return;
    indexedDbService.deleteResourceBlob(id);
    const updated: LifeSession = {
      ...activeSession,
      resources: activeSession.resources.filter((r) => r.id !== id),
      updatedAt: new Date().toISOString(),
    };
    saveUpdatedSession(updated);
    showToast('Đã xoá tài nguyên ảnh');
  };

  // ----------------------------------------------------
  // SHARED INTERACTION PIPELINE (V2 Voice & Text Action Engine)
  // ----------------------------------------------------
  const executeValidatedAppAction = async (
    rawAction: AppAction,
    appCtx: AppInteractionContext,
    rtCtx: any
  ): Promise<boolean> => {
    const val = validateAppAction(rawAction, appCtx);
    if (!val.valid || !val.action) {
      if (val.reason) {
        showToast(`⚠️ ${val.reason}`);
      }
      return false;
    }

    const actionToApply = { ...val.action };
    if (actionToApply.type === 'OPEN_SESSION' && val.resolvedSessionId) {
      actionToApply.payload = {
        ...actionToApply.payload,
        sessionId: val.resolvedSessionId,
      };
    }

    return await applyAppAction(actionToApply, rtCtx);
  };

  const sendInteraction = async (
    userText: string,
    options: { inputMode?: InteractionInputMode } = {}
  ) => {
    const inputMode = options.inputMode || 'text';
    if (!userText.trim() || isLoading) return;

    const trimmedText = userText.trim();
    setIsLoading(true);
    setVoiceStatus('processing');

    const runtimeContext = {
      goHome: () => setActiveTab('dashboard'),
      goBack: () => setActiveTab('dashboard'),
      openSettings: () => setActiveTab('settings'),
      openProfile: () => setProfileSetupOpen(true),
      openSession: (sId: string) => handleOpenSession(sId),
      createSession: async (goal: string) => {
        await handleCreateSessionFromTemplate('custom', goal);
      },
      openCamera: () => setCameraModalOpen(true),
      updateAccessibilitySetting: (key: string, value: any) => {
        setAccessibility((prev) => ({ ...prev, [key]: value }));
      },
      showToast,
    };

    const appContext: AppInteractionContext = {
      page: activeTab,
      activeSessionId: activeSession?.id,
      activeSessionTitle: activeSession?.title,
      hasActiveSession: !!activeSession,
      availableSessions: sessionsList,
    };

    // A. Check Pending Interaction FIRST (e.g. User confirms "Có / Tạo đi" for previous proposal)
    if (pendingInteraction) {
      const pendingRes = resolvePendingInteraction(trimmedText, pendingInteraction);
      if (pendingRes.clearPending) {
        setPendingInteraction(null);
      }
      if (pendingRes.resolved) {
        if (pendingRes.appAction) {
          await executeValidatedAppAction(pendingRes.appAction, appContext, runtimeContext);
        }
        if (pendingRes.reply) {
          if (inputMode === 'voice' || accessibility.speakResponse) {
            speakWithVoiceStatus(pendingRes.reply);
          } else {
            showToast(pendingRes.reply);
            setVoiceStatus('idle');
          }
        } else {
          setVoiceStatus('idle');
        }
        setIsLoading(false);
        return;
      }
    }

    // B. Inside Active Session
    if (activeSession && activeTab === 'session') {
      const now = new Date().toISOString();
      const userMsg = {
        id: `msg-${Date.now()}`,
        sender: 'user' as const,
        text: trimmedText,
        timestamp: now,
        inputMode,
      };

      const sessionWithUserMsg = {
        ...activeSession,
        messages: [...activeSession.messages, userMsg],
        updatedAt: now,
      };

      setActiveSession(sessionWithUserMsg);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session: sessionWithUserMsg,
            message: trimmedText,
            isDemoMode: aiSettings.demoMode || aiSettings.provider === 'demo',
            provider: aiSettings.provider,
            userProfile,
            inputMode,
            appContext,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        const replyText = data.reply || 'Lovira đã nhận thông tin của bạn.';
        const speechText = data.speech || replyText;
        const actions: AgentAction[] = data.actions || [];
        const appActions: AppAction[] = data.appActions || [];
        const suggestedReplies: string[] | undefined = data.suggestedReplies;

        const sensitiveAction = actions.find((a) => a.requiresConfirmation);

        const applyActionsAndSave = async (
          actionsToApply: AgentAction[],
          appActionsToApply: AppAction[]
        ) => {
          const batchTrigger = inputMode === 'voice' ? 'voice' : 'chat';
          const batchRes = applyAgentActionBatch(sessionWithUserMsg, actionsToApply, batchTrigger);

          if (batchRes.status === 'full' || batchRes.status === 'partial') {
            const finalSession = batchRes.newState;
            let consistentReply = replyText;
            let finalSuggestedReplies = suggestedReplies;

            if (batchRes.status === 'partial' && batchRes.rejectedActions.length > 0) {
              console.warn('Some agent actions were ignored by validator:', batchRes.rejectedActions);
              const honorifics = deduceHonorifics(userProfile, trimmedText);
              consistentReply = buildPartialSuccessReply(
                batchRes.appliedActions,
                batchRes.rejectedActions,
                replyText,
                honorifics
              );
              finalSuggestedReplies = ['Kiểm tra lại bước hiện tại', 'Giờ tôi cần làm gì?'];
            }

            const loviraMsg = {
              id: `msg-${Date.now()}`,
              sender: 'lovira' as const,
              text: consistentReply,
              timestamp: new Date().toISOString(),
              actionsApplied: batchRes.appliedActions,
              suggestedReplies: finalSuggestedReplies,
            };

            finalSession.messages.push(loviraMsg);
            saveUpdatedSession(finalSession);

            // 3. Process App Actions AFTER session actions are reconciled and persisted
            if (appActionsToApply.length > 0) {
              for (const appAct of appActionsToApply) {
                await executeValidatedAppAction(appAct, appContext, runtimeContext);
              }
            }

            if (batchRes.status === 'partial') {
              const failMsg = batchRes.rejectedActions.map((f) => f.reason).join(', ');
              showToast(`⚠️ Lovira đã áp dụng một phần (${batchRes.appliedActions.length}/${actionsToApply.length}): ${failMsg}`);
            } else if (batchRes.logSummaries.length > 0) {
              showToast(batchRes.logSummaries.join(' • '));
            }

            if (inputMode === 'voice' || accessibility.speakResponse) {
              speakWithVoiceStatus(speechText || consistentReply);
            } else {
              setVoiceStatus('idle');
            }

            if (actionsToApply.some((a) => a.type === 'OPEN_CAMERA')) {
              setCameraModalOpen(true);
            }
          } else {
            // Even if action batch failed, persist the conversational message so dialogue context is never dropped
            const loviraMsg = {
              id: `msg-${Date.now()}`,
              sender: 'lovira' as const,
              text: replyText,
              timestamp: new Date().toISOString(),
              suggestedReplies: suggestedReplies || ['Tiếp tục trò chuyện', 'Giờ tôi cần làm gì?'],
            };

            const fallbackSession = { ...sessionWithUserMsg };
            fallbackSession.messages = [...fallbackSession.messages, loviraMsg];
            saveUpdatedSession(fallbackSession);

            if (actionsToApply.length > 0) {
              const failReasons = batchRes.rejectedActions.map((f) => f.reason).join(', ') || batchRes.rejectedReason || 'Hành động không hợp lệ';
              console.warn('Agent actions were not applied:', failReasons);
            }

            // Still process non-conflicting app actions if session batch had no mutating actions
            if (actionsToApply.length === 0 && appActionsToApply.length > 0) {
              for (const appAct of appActionsToApply) {
                await executeValidatedAppAction(appAct, appContext, runtimeContext);
              }
            }

            if (inputMode === 'voice' || accessibility.speakResponse) {
              speakWithVoiceStatus(speechText || replyText);
            } else {
              setVoiceStatus('idle');
            }
          }
        };

        if (sensitiveAction) {
          setConfirmModal({
            isOpen: true,
            title: 'Xác nhận thao tác nhạy cảm từ Lovira',
            message: sensitiveAction.confirmationPrompt || 'Lovira đề xuất thực hiện thay đổi quan trọng này. Bạn có đồng ý không?',
            onConfirm: async () => {
              await applyActionsAndSave(actions, appActions);
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            },
          });
          setVoiceStatus('idle');
        } else {
          await applyActionsAndSave(actions, appActions);
        }
      } catch (e) {
        console.warn('Backend chat unreachable, trying offline local fallback:', e);
        const localResult = parseLocalIntent(trimmedText, sessionWithUserMsg, userProfile);
        if (localResult) {
          const batchTrigger = inputMode === 'voice' ? 'voice' : 'chat';
          const batchRes = applyAgentActionBatch(sessionWithUserMsg, localResult.actions, batchTrigger);
          const finalSession = batchRes.newState;

          const loviraMsg = {
            id: `msg-${Date.now() + 1}`,
            sender: 'lovira' as const,
            text: localResult.reply,
            timestamp: new Date().toISOString(),
            actionsApplied: localResult.actions,
            suggestedReplies: localResult.suggestedReplies,
          };

          finalSession.messages.push(loviraMsg);
          saveUpdatedSession(finalSession);

          if (batchRes.logSummaries.length > 0) {
            showToast(batchRes.logSummaries.join(' • '));
          }

          if (inputMode === 'voice' || accessibility.speakResponse) {
            speakWithVoiceStatus(localResult.speech || localResult.reply);
          } else {
            setVoiceStatus('idle');
          }
        } else {
          showToast('Không có kết nối mạng. Lovira vẫn lưu trữ cục bộ an toàn!');
          setVoiceStatus('idle');
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // C. Outside Session (Dashboard or other tabs)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: null,
          message: trimmedText,
          isDemoMode: aiSettings.demoMode || aiSettings.provider === 'demo',
          provider: aiSettings.provider,
          userProfile,
          inputMode,
          appContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.reply || 'Lovira đang lắng nghe bạn.';
      const speechText = data.speech || replyText;
      const appActions: AppAction[] = data.appActions || [];

      // 1. Execute app navigation actions
      if (appActions.length > 0) {
        for (const appAct of appActions) {
          await executeValidatedAppAction(appAct, appContext, runtimeContext);
        }
      } else if (data.pendingInteraction) {
        // Structured pending interaction from backend
        setPendingInteraction(data.pendingInteraction);
      } else {
        // Heuristic fallback check if reply proposes to create a session
        const hasCreateProposal =
          replyText.toLowerCase().includes('mở một phiên') ||
          replyText.toLowerCase().includes('tạo một phiên') ||
          replyText.toLowerCase().includes('có muốn tạo') ||
          replyText.toLowerCase().includes('hướng dẫn từng bước');

        if (hasCreateProposal) {
          setPendingInteraction({
            type: 'create_session',
            data: { goal: trimmedText },
            createdAt: new Date().toISOString(),
            expiresAt: Date.now() + 180000,
          });
        }
      }

      showToast(replyText);

      if (inputMode === 'voice' || accessibility.speakResponse) {
        speakWithVoiceStatus(speechText);
      } else {
        setVoiceStatus('idle');
      }
    } catch (e) {
      console.warn('Dashboard interaction error:', e);
      showToast('Lovira chưa thể kết nối lúc này. Bạn thử lại nhé!');
      setVoiceStatus('idle');
    } finally {
      setIsLoading(false);
    }
  };

  // Voice Recording Handlers
  const handleStartVoiceListening = () => {
    stopSpeaking();
    setVoiceError(undefined);
    setInterimTranscript('');

    const started = speechRecognitionService.startListening({
      onStart: () => {
        setVoiceStatus('listening');
        setInterimTranscript('');
      },
      onInterimResult: (transcript) => {
        setInterimTranscript(transcript);
      },
      onFinalResult: (transcript) => {
        setInterimTranscript('');
        if (transcript.trim()) {
          sendInteraction(transcript.trim(), { inputMode: 'voice' });
        } else {
          setVoiceStatus('idle');
        }
      },
      onError: (errType, message) => {
        setVoiceStatus('error');
        setVoiceError(message);
        setInterimTranscript('');
      },
      onEnd: () => {
        if (voiceStatus === 'listening') {
          setVoiceStatus('idle');
        }
      },
    });

    if (!started) {
      setVoiceStatus('error');
      setVoiceError('Trình duyệt chưa hỗ trợ nhận diện giọng nói tiếng Việt.');
    }
  };

  const handleStopVoiceListening = () => {
    speechRecognitionService.finishListening();
  };

  const handleCancelVoiceListening = () => {
    speechRecognitionService.cancelListening();
    setVoiceStatus('idle');
    setInterimTranscript('');
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setVoiceStatus('idle');
  };

  // 12. Camera Image Capture & AI Vision Extraction
  const handleCaptureCameraImage = async (dataUrl: string) => {
    if (!activeSession) return;

    const now = new Date().toISOString();
    const resId = `res-${Date.now()}`;

    // 1. Save Blob to IndexedDB
    await indexedDbService.saveResourceBlob({
      id: resId,
      sessionId: activeSession.id,
      dataUrl,
      mimeType: 'image/jpeg',
      createdAt: now,
    });

    const newResource = {
      id: resId,
      type: 'image' as const,
      title: `Ảnh chụp ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
      data: dataUrl,
      createdAt: now,
    };

    const sessionWithRes = {
      ...activeSession,
      resources: [newResource, ...activeSession.resources],
      updatedAt: now,
    };

    setActiveSession(sessionWithRes);
    showToast('Đã lưu ảnh chụp vào tài nguyên phiên. Đang đọc ảnh...');

    // 2. Vision API extraction directly returning Structured Actions
    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          session: sessionWithRes,
        }),
      });

      const data = await res.json();
      const replyText = data.reply || 'Lovira đã nhận và phân tích ảnh tài liệu.';
      const actions: AgentAction[] = data.actions || [];

      // Apply vision actions directly to session state
      const batchRes = applyAgentActionBatch(sessionWithRes, actions, 'camera');
      const finalSession = batchRes.newState;

      const loviraMsg = {
        id: `msg-${Date.now()}`,
        sender: 'lovira' as const,
        text: replyText,
        timestamp: new Date().toISOString(),
        actionsApplied: actions,
      };

      finalSession.messages.push(loviraMsg);
      saveUpdatedSession(finalSession);

      if (batchRes.logSummaries.length > 0) {
        showToast(batchRes.logSummaries.join(' • '));
      } else {
        showToast('Lovira đã cập nhật thông tin từ ảnh!');
      }

      if (accessibility.speakResponse) {
        speakWithVoiceStatus(replyText);
      }
    } catch (e) {
      console.warn('Vision extraction failed', e);
      showToast('Đã lưu ảnh vào phiên.');
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onCreateSession={() => handleCreateSessionFromTemplate('medical')}
      userName={userProfile?.preferredName || 'Chú Ba'}
      planName="Gói miễn phí"
      voiceStatus={voiceStatus}
      onVoiceClick={
        voiceStatus === 'listening' ? handleStopVoiceListening : handleStartVoiceListening
      }
      accessibility={accessibility}
      onUpdateAccessibility={setAccessibility}
    >
      {/* Profile Invite Banner (Layer 2 Onboarding) */}
      {!userProfile &&
        !bannerDismissed &&
        (sessionsList.filter((s) => s.status === 'completed').length >= 1 ||
          storageService.getAppOpenCount() >= 3) && (
          <ProfileInviteBanner
            onOpenSetup={() => setProfileSetupOpen(true)}
            onDismiss={() => {
              storageService.setProfileBannerDismissed(true);
              setBannerDismissed(true);
            }}
          />
        )}

      {/* Tab 1: Full Homepage (Specification-Compliant) */}
      {activeTab === 'dashboard' && (
        <HomePage
          userName={userProfile?.preferredName || 'Chú Ba'}
          sessionsList={sessionsList}
          onOpenSession={handleOpenSession}
          onCreateSessionFromTemplate={handleCreateSessionFromTemplate}
          onDeleteSession={handleDeleteSession}
          onOpenTasks={() => setActiveTab('tasks')}
          onOpenReminders={() => setActiveTab('reminders')}
          onOpenChat={() => {
            if (activeSession) {
              setActiveTab('session');
            } else if (sessionsList.length > 0) {
              handleOpenSession(sessionsList[0].id);
            } else {
              handleCreateSessionFromTemplate('custom', 'Trò chuyện cùng Lovira');
            }
          }}
        />
      )}

      {/* Tab 2: Life Session Active Screen / Chat */}
      {(activeTab === 'session' || activeTab === 'chat') && activeSession && (
        <LifeSessionPage
          session={activeSession}
          sessionsList={sessionsList}
          onOpenSession={handleOpenSession}
          onCreateNewSession={() => handleCreateSessionFromTemplate('medical')}
          onOpenHistory={() => setActiveTab('history')}
          onBack={() => setActiveTab('dashboard')}
          onUpdateStatus={handleUpdateStatus}
          onDeleteSession={() => handleDeleteSession(activeSession.id)}
          onCompleteCurrentTask={handleCompleteCurrentTask}
          onToggleTask={handleToggleTask}
          onToggleSubtask={handleToggleSubtask}
          onAddTask={handleAddTask}
          onAddSubtask={handleAddSubtask}
          onDeleteTask={handleDeleteTask}
          onAddFact={handleAddFact}
          onDeleteFact={handleDeleteFact}
          onDeleteResource={handleDeleteResource}
          onSendMessage={(text, opts) => sendInteraction(text, opts)}
          onOpenCamera={() => setCameraModalOpen(true)}
          isLoading={isLoading}
          voiceStatus={voiceStatus}
          interimTranscript={interimTranscript}
          userName={userProfile?.preferredName || 'Chú Ba'}
          onStartVoice={handleStartVoiceListening}
          onStopVoice={handleStopVoiceListening}
          onCancelVoice={handleCancelVoiceListening}
        />
      )}

      {/* Fallback if session/chat tab opened with no session */}
      {(activeTab === 'session' || activeTab === 'chat') && !activeSession && (
        <div className="p-8 text-center bg-surface border border-dashed border-default rounded-2xl space-y-4 max-w-lg mx-auto my-8">
          <p className="text-base font-bold text-text-primary">Chưa mở phiên hỗ trợ nào.</p>
          <p className="text-xs text-text-secondary">Hãy tạo một phiên mới để trò chuyện và được Lovira trợ giúp nhen.</p>
          <button
            onClick={() => handleCreateSessionFromTemplate('medical')}
            className="px-5 py-2.5 bg-[#7C4DFF] hover:bg-[#6D3CF0] text-white font-bold text-sm rounded-xl transition-all shadow-xs"
          >
            + Tạo phiên Đi khám bệnh mẫu ngay
          </button>
        </div>
      )}

      {/* Tab 3: Tasks & Session Management Dashboard */}
      {(activeTab === 'tasks' || activeTab === 'history') && (
        <LifeDashboard
          activeSession={activeSession}
          sessionsList={sessionsList}
          onOpenSession={handleOpenSession}
          onCreateSessionFromTemplate={handleCreateSessionFromTemplate}
          onDeleteSession={handleDeleteSession}
          onOpenCamera={() => setCameraModalOpen(true)}
        />
      )}

      {/* Tab 4: Reminders */}
      {activeTab === 'reminders' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-[#17151F]">Quản lý Nhắc nhở</h2>
          <UpcomingReminders />
        </div>
      )}

      {/* Tab 5: Settings */}
      {activeTab === 'settings' && (
        <SettingsPage
          accessibility={accessibility}
          aiSettings={aiSettings}
          userProfile={userProfile}
          onUpdateAccessibility={setAccessibility}
          onUpdateAISettings={setAiSettings}
          onUpdateUserProfile={setUserProfile}
          onOpenProfileSetup={() => setProfileSetupOpen(true)}
        />
      )}

      {/* Tab 6: Profile Setup */}
      {activeTab === 'profile' && (
        <ProfilePage
          userProfile={userProfile}
          onOpenProfileSetup={() => setProfileSetupOpen(true)}
          onUpdateUserProfile={setUserProfile}
          totalSessionsCount={sessionsList.length}
        />
      )}

      {/* Profile Setup Flow Modal */}
      {profileSetupOpen && (
        <ProfileSetupFlow
          initialProfile={userProfile}
          onClose={() => setProfileSetupOpen(false)}
          onSaveSuccess={(savedProfile) => {
            setUserProfile(savedProfile);
            setProfileSetupOpen(false);
            showToast('Đã cập nhật thông tin cá nhân!');
          }}
        />
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCaptureImage={handleCaptureCameraImage}
      />

      {/* Vietnamese Sign Language Panel Placeholder */}
      <VSLFloatingPanel
        isOpen={accessibility.vslEnabled}
        onClose={() => setAccessibility({ ...accessibility, vslEnabled: false })}
        latestText={
          activeSession?.messages[activeSession.messages.length - 1]?.text ||
          'Lovira Life sẵn sàng đồng hành cùng bạn!'
        }
      />

      {/* Accessible Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Toast Notification */}
      {toastMessage && <Toast message={toastMessage} />}
    </AppShell>
  );
}
