import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LifeSession,
  SessionStatus,
  ScenarioType,
  ImportantFactType,
  GeneratedSessionPlan,
  UserProfile,
  ScenarioFamily,
  AgentAction,
  AppAction,
  AppInteractionContext,
  InteractionInputMode,
  PendingInteraction,
  PendingDraftReminder,
  AccessibilityContext,
  GlobalChatMessage,
} from '../types';
import { storageService, BriefSessionHeader } from '../services/storageService';
import { indexedDbService } from '../services/indexedDbService';
import { SCENARIO_TEMPLATES } from '../data/initialData';
import {
  applyAgentActionBatch,
  calculateNextRecommendedAction,
  reconcileSessionDerivedState,
  resolveCurrentStep,
} from '../services/actionEngine';
import { buildPartialSuccessReply, deduceHonorifics, formatInitialSessionGreeting } from '../services/conversationStyle';
import { parseLocalIntent } from '../services/localIntentEngine';
import { createLifeSessionFromPlan, createLifeSessionFromScenario } from '../services/sessionFactory';
import { validateAppAction } from '../services/interaction/appActionValidator';
import { applyAppAction } from '../services/interaction/appActionEngine';
import { resolvePendingInteraction } from '../services/interaction/pendingInteractionResolver';
import { validateAndGroundAIResponse } from '../services/interaction/CapabilityResponseValidator';
import { cloudSyncService } from '../services/firebase/cloudSyncService';
import { LoviraAuthUser, CloudSyncSettings } from '../services/firebase/firebaseTypes';
import { parseVietnameseReminderText } from '../utils/dateTimeResolver';
import { routeFastIntent } from '../services/interaction/FastIntentRouter';
import { matchAccessibilityVoiceCommand } from '../services/interaction/AccessibilityVoiceController';

export interface InteractionOptions {
  inputMode?: InteractionInputMode;
  activeTab?: any;
  pageContext?: {
    page?: string;
    pathname?: string;
    sessionId?: string;
  };
}

interface UseSessionManagerProps {
  userProfile: UserProfile | null;
  aiSettings: any;
  accessibilitySettings: any;
  showToast: (msg: string) => void;
  speakWithVoiceStatus: (text: string, onEnd?: () => void) => void;
  setVoiceStatus: (status: any) => void;
  setActiveTab?: (tab: any) => void;
  onNavigate?: (path: string) => void;
  onGoBack?: () => void;
  setCameraModalOpen: (open: boolean) => void;
  setProfileSetupOpen: (open: boolean) => void;
  setAccessibility: React.Dispatch<React.SetStateAction<any>>;
  triggerSOS?: (options?: { reason?: string; autoSendLocation?: boolean; playSiren?: boolean }) => void;
  openSOS?: () => void;
  authUser?: LoviraAuthUser | null;
  syncSettings?: CloudSyncSettings;
}

export function useSessionManager({
  userProfile,
  aiSettings,
  accessibilitySettings,
  showToast,
  speakWithVoiceStatus,
  setVoiceStatus,
  setActiveTab,
  onNavigate,
  onGoBack,
  setCameraModalOpen,
  setProfileSetupOpen,
  setAccessibility,
  triggerSOS,
  openSOS,
  authUser,
  syncSettings,
}: UseSessionManagerProps) {
  const [activeSession, setActiveSession] = useState<LifeSession | null>(null);
  const [sessionsList, setSessionsList] = useState<BriefSessionHeader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInteraction, setPendingInteractionState] = useState<PendingInteraction | null>(() => storageService.getPendingInteraction());
  const [globalMessages, setGlobalMessages] = useState<GlobalChatMessage[]>(() =>
    storageService.getGlobalChatMessages()
  );

  const setPendingInteraction = useCallback((pending: PendingInteraction | null) => {
    setPendingInteractionState(pending);
    storageService.savePendingInteraction(pending);
  }, []);

  const addGlobalMessage = useCallback((userText: string, loviraText: string, options?: { inputMode?: InteractionInputMode; suggestedReplies?: string[] }) => {
    const now = new Date().toISOString();
    const uMsg: GlobalChatMessage = {
      id: `gmsg-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: now,
      inputMode: options?.inputMode,
    };
    const lMsg: GlobalChatMessage = {
      id: `gmsg-${Date.now() + 1}`,
      sender: 'lovira',
      text: loviraText,
      timestamp: new Date().toISOString(),
      suggestedReplies: options?.suggestedReplies,
    };
    setGlobalMessages((prev) => {
      const updated = [...prev, uMsg, lMsg];
      storageService.saveGlobalChatMessages(updated);
      return updated;
    });
  }, []);

  const clearGlobalChat = useCallback(() => {
    setGlobalMessages([]);
    storageService.clearGlobalChatMessages();

    if (pendingInteraction?.scope === 'global-chat' || !pendingInteraction?.scope) {
      setPendingInteraction(null);
    }
  }, [pendingInteraction, setPendingInteraction]);

  // AbortController for cancelling stale fetch requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshSessionsList = useCallback(() => {
    setSessionsList(storageService.getSessionsList());
  }, []);

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
  }, [refreshSessionsList]);

  const saveUpdatedSession = useCallback((session: LifeSession) => {
    setActiveSession(session);
    storageService.saveSession(session);
    refreshSessionsList();

    if (authUser?.uid && syncSettings?.syncSessions) {
      cloudSyncService.queueSessionUpload(authUser.uid, session);
    }
  }, [authUser?.uid, syncSettings?.syncSessions, refreshSessionsList]);

  const handleOpenSession = useCallback((id: string) => {
    const session = storageService.getSession(id);
    if (session) {
      setActiveSession(session);
      storageService.setActiveSessionId(id);
      if (onNavigate) {
        onNavigate(`/session/${id}`);
      } else if (setActiveTab) {
        setActiveTab('session');
      }
    }
  }, [setActiveTab, onNavigate]);

  const handleCreateSessionFromTemplate = useCallback(
    async (type: ScenarioType, customGoal?: string) => {
      const now = new Date().toISOString();
      const newId = `session-${type}-${Date.now()}`;

      if (type === 'custom' && customGoal) {
        showToast('🤖 AI Lovira đang phân tích và lập kế hoạch phiên hỗ trợ...');
        setIsLoading(true);

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const res = await fetch('/api/generate-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: customGoal,
              isDemoMode: aiSettings.demoMode || aiSettings.provider === 'demo',
            }),
            signal: controller.signal,
          });

          const plan: GeneratedSessionPlan = await res.json();
          const accessibilityCtx: AccessibilityContext = {
            preferredInteraction: accessibilitySettings.speakResponse ? 'voice' : 'text',
            oneStepMode: accessibilitySettings.reducedMotion,
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
          if (onNavigate) {
            onNavigate(`/session/${newCustomSession.id}`);
          } else if (setActiveTab) {
            setActiveTab('session');
          }
          showToast(`✨ Đã khởi tạo thành công phiên AI: "${newCustomSession.title}"`);
          if (accessibilitySettings.speakResponse) {
            speakWithVoiceStatus(`Lovira đã tạo xong kế hoạch cho ${newCustomSession.title}`);
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error('Error generating AI session plan:', err);
            showToast('Không thể tạo phiên AI, vui lòng thử lại.');
          }
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
      if (onNavigate) {
        onNavigate(`/session/${newId}`);
      } else if (setActiveTab) {
        setActiveTab('session');
      }
      showToast(`Đã khởi tạo phiên "${newSession.title}"`);
    },
    [aiSettings, accessibilitySettings, userProfile, saveUpdatedSession, setActiveTab, onNavigate, showToast, speakWithVoiceStatus]
  );

  const handleCreateSessionFromScenario = useCallback(
    (scenarioKey: ScenarioFamily, customGoal?: string) => {
      const accessibilityCtx: AccessibilityContext = {
        preferredInteraction: accessibilitySettings.speakResponse ? 'voice' : 'text',
        oneStepMode: accessibilitySettings.reducedMotion,
      };
      const newSession = createLifeSessionFromScenario(
        scenarioKey,
        customGoal || '',
        accessibilityCtx,
        userProfile
      );
      saveUpdatedSession(newSession);
      storageService.setActiveSessionId(newSession.id);
      if (onNavigate) {
        onNavigate(`/session/${newSession.id}`);
      } else if (setActiveTab) {
        setActiveTab('session');
      }
      showToast(`⚡ Đã khởi tạo phiên: "${newSession.title}"`);
      if (accessibilitySettings.speakResponse) {
        speakWithVoiceStatus(`Lovira đã chuẩn bị xong phiên ${newSession.title}`);
      }
    },
    [accessibilitySettings, userProfile, saveUpdatedSession, onNavigate, setActiveTab, showToast, speakWithVoiceStatus]
  );

  const handleDeleteSession = useCallback((id: string, onConfirmModalShow: (modal: any) => void) => {
    onConfirmModalShow({
      isOpen: true,
      title: 'Xoá phiên hỗ trợ',
      message: 'Bạn có chắc chắn muốn xoá toàn bộ dữ liệu phiên này? Thao tác này không thể hoàn tác.',
      onConfirm: async () => {
        storageService.deleteSession(id);
        indexedDbService.deleteSessionBlobs(id);

        if (authUser?.uid && syncSettings?.syncSessions) {
          await cloudSyncService.deleteSession(authUser.uid, id).catch((err) => {
            console.warn('[CloudSync] Session deletion on cloud warning:', err);
          });
        }

        if (activeSession?.id === id) {
          setActiveSession(null);
          storageService.clearActiveSessionId();
          if (onNavigate) {
            onNavigate('/history');
          } else if (setActiveTab) {
            setActiveTab('dashboard');
          }
        }
        refreshSessionsList();
        onConfirmModalShow({ isOpen: false, message: '', onConfirm: () => {} });
        showToast('Đã xoá phiên hỗ trợ');
      },
    });
  }, [activeSession, authUser?.uid, syncSettings?.syncSessions, refreshSessionsList, setActiveTab, onNavigate, showToast]);

  const handleUpdateStatus = useCallback((newStatus: SessionStatus) => {
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
  }, [activeSession, saveUpdatedSession, showToast]);

  const handleToggleTask = useCallback((taskId: string) => {
    if (!activeSession) return;
    const now = new Date().toISOString();

    const updatedTasks = activeSession.tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
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
  }, [activeSession, saveUpdatedSession]);

  const handleToggleSubtask = useCallback((parentTaskId: string, subtaskId: string) => {
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
  }, [activeSession, saveUpdatedSession]);

  const handleAddTask = useCallback((title: string, important = false) => {
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
  }, [activeSession, saveUpdatedSession, showToast]);

  const handleAddSubtask = useCallback((parentTaskId: string, title: string) => {
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
  }, [activeSession, saveUpdatedSession, showToast]);

  const handleDeleteTask = useCallback((taskId: string) => {
    if (!activeSession) return;
    const updated: LifeSession = {
      ...activeSession,
      tasks: activeSession.tasks.filter((t) => t.id !== taskId),
      updatedAt: new Date().toISOString(),
    };
    const reconciled = reconcileSessionDerivedState(updated);
    saveUpdatedSession(reconciled);
    showToast('Đã xoá công việc');
  }, [activeSession, saveUpdatedSession, showToast]);

  const handleAddFact = useCallback((fact: { title: string; value: string; type: ImportantFactType }) => {
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
  }, [activeSession, saveUpdatedSession, showToast]);

  const handleDeleteFact = useCallback((factId: string, onConfirmModalShow: (modal: any) => void) => {
    if (!activeSession) return;
    const targetFact = activeSession.importantFacts.find((f) => f.id === factId);
    if (!targetFact) return;

    if (targetFact.type === 'warning' || targetFact.type === 'requirement') {
      onConfirmModalShow({
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
          onConfirmModalShow({ isOpen: false, message: '', onConfirm: () => {} });
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
  }, [activeSession, saveUpdatedSession, showToast]);

  const handleCompleteCurrentTask = useCallback(() => {
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
  }, [activeSession, handleToggleSubtask, handleToggleTask, showToast]);

  const handleDeleteResource = useCallback((id: string) => {
    if (!activeSession) return;
    indexedDbService.deleteResourceBlob(id);
    const updated: LifeSession = {
      ...activeSession,
      resources: activeSession.resources.filter((r) => r.id !== id),
      updatedAt: new Date().toISOString(),
    };
    saveUpdatedSession(updated);
    showToast('Đã xoá tài nguyên ảnh');
  }, [activeSession, saveUpdatedSession, showToast]);

  const executeValidatedAppAction = useCallback(async (
    rawAction: AppAction,
    appCtx: AppInteractionContext,
    rtCtx: any,
    options?: { trustedSource?: boolean }
  ): Promise<{
    status: 'executed' | 'pending_confirmation' | 'rejected';
    executed: boolean;
    action: AppAction;
    reason?: string;
    confirmationPrompt?: string;
  }> => {
    const val = validateAppAction(rawAction, appCtx, options);
    if (!val.valid || !val.action) {
      if (val.reason) {
        showToast(`⚠️ ${val.reason}`);
      }
      return {
        status: 'rejected',
        executed: false,
        action: rawAction,
        reason: val.reason || 'Hành động không hợp lệ',
      };
    }

    const actionToApply = { ...val.action };
    if (actionToApply.type === 'OPEN_SESSION' && val.resolvedSessionId) {
      actionToApply.payload = {
        ...actionToApply.payload,
        sessionId: val.resolvedSessionId,
      };
    }

    if (val.action.requiresConfirmation) {
      const prompt = val.action.confirmationPrompt || 'Chú có chắc chắn muốn thực hiện thao tác này không ạ?';
      setPendingInteraction({
        type: 'confirm_action',
        data: {
          action: {
            ...val.action,
            payload: { ...val.action.payload, skipConfirmation: true },
          },
          actionType: val.action.type,
          payload: val.action.payload,
          successReply: `Dạ vâng, con đã xóa nhắc nhở "${val.action.payload?.title || ''}" rồi ạ.`,
          cancelReply: 'Dạ vâng, con đã giữ nguyên nhắc nhở cho chú rồi ạ.',
          question: prompt,
        },
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 180000,
      });
      showToast(prompt);
      return {
        status: 'pending_confirmation',
        executed: false,
        action: val.action,
        confirmationPrompt: prompt,
      };
    }

    const executed = await applyAppAction(actionToApply, rtCtx);
    return {
      status: executed ? 'executed' : 'rejected',
      executed,
      action: actionToApply,
      reason: executed ? undefined : 'Lỗi khi thực thi thao tác',
    };
  }, [showToast]);

  const sendInteraction = useCallback(async (
    userText: string,
    options: InteractionOptions
  ) => {
    const inputMode = options.inputMode || 'text';
    const activeTab = options.activeTab;
    const pageContext = options.pageContext;
    if (!userText.trim() || isLoading) return;

    const isSessionContext =
      activeTab === 'session' ||
      pageContext?.page === 'session' ||
      (pageContext?.pathname && pageContext.pathname.startsWith('/session/'));

    const trimmedText = userText.trim();
    const { addressing, me } = deduceHonorifics(userProfile);
    setIsLoading(true);
    setVoiceStatus('processing');

    // Cancel old pending request if user sends new message
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const runtimeContext = {
      goHome: () => (onNavigate ? onNavigate('/') : setActiveTab?.('dashboard')),
      goBack: () => (onGoBack ? onGoBack() : onNavigate ? onNavigate('/history') : setActiveTab?.('dashboard')),
      openSettings: () => (onNavigate ? onNavigate('/settings') : setActiveTab?.('settings')),
      openProfile: () => (onNavigate ? onNavigate('/profile') : setProfileSetupOpen(true)),
      openReminders: () => (onNavigate ? onNavigate('/reminders') : setActiveTab?.('reminders')),
      openSession: (sId: string) => handleOpenSession(sId),
      createSession: async (goal: string) => {
        await handleCreateSessionFromTemplate('custom', goal);
      },
      createSessionFromScenario: async (scenarioKey: string, goal: string) => {
        handleCreateSessionFromScenario(scenarioKey as ScenarioFamily, goal);
      },
      openCamera: () => setCameraModalOpen(true),
      openVision: () => (onNavigate ? onNavigate('/vision') : setActiveTab?.('vision')),
      openListen: () => (onNavigate ? onNavigate('/listen') : setActiveTab?.('listen')),
      updateAccessibilitySetting: (key: string, value: any) => {
        setAccessibility((prev: any) => ({ ...prev, [key]: value }));
      },
      triggerSOS: (opts?: any) => (triggerSOS ? triggerSOS(opts) : openSOS ? openSOS() : undefined),
      openSOS: () => (openSOS ? openSOS() : triggerSOS ? triggerSOS() : undefined),
      saveUpdatedSession,
      refreshSessionsList,
      showToast,
    };

    const appContext: AppInteractionContext = {
      page: isSessionContext ? 'session' : (pageContext?.page || activeTab || 'dashboard'),
      activeSessionId: isSessionContext ? (activeSession?.id || pageContext?.sessionId) : undefined,
      activeSessionTitle: isSessionContext ? activeSession?.title : undefined,
      hasActiveSession: isSessionContext && !!activeSession,
      availableSessions: sessionsList,
    };

    // A0. Check Instant Accessibility & System Voice Commands (Highest Priority)
    const directAccessCmd = matchAccessibilityVoiceCommand(trimmedText, accessibilitySettings);
    if (directAccessCmd && directAccessCmd.handled && directAccessCmd.appAction) {
      setPendingInteraction(null);
      await executeValidatedAppAction(directAccessCmd.appAction, appContext, runtimeContext, { trustedSource: true });
      const finalReply = directAccessCmd.reply || 'Dạ vâng, Lovira đã thực hiện điều chỉnh rồi ạ.';
      const speechToPlay = directAccessCmd.speech || finalReply;

      if (!isSessionContext) {
        addGlobalMessage(trimmedText, finalReply, { inputMode });
      } else if (activeSession) {
        const now = new Date().toISOString();
        const userMsg = {
          id: `msg-${Date.now()}`,
          sender: 'user' as const,
          text: trimmedText,
          timestamp: now,
          inputMode,
        };
        const loviraMsg = {
          id: `msg-${Date.now() + 1}`,
          sender: 'lovira' as const,
          text: finalReply,
          timestamp: new Date().toISOString(),
        };
        const updated = {
          ...activeSession,
          messages: [...activeSession.messages, userMsg, loviraMsg],
          updatedAt: now,
        };
        setActiveSession(updated);
        saveUpdatedSession(updated);
      }

      showToast(finalReply);
      if (inputMode === 'voice' || accessibilitySettings.speakResponse) {
        speakWithVoiceStatus(speechToPlay);
      } else {
        setVoiceStatus('idle');
      }
      setIsLoading(false);
      return;
    }

    // A. Check Pending Interaction FIRST
    if (pendingInteraction) {
      const pendingScope = pendingInteraction.scope || 'global-chat';
      const currentPage = isSessionContext ? 'session' : (pageContext?.page || activeTab || 'dashboard');
      const currentSessionId = isSessionContext ? (activeSession?.id || pageContext?.sessionId) : undefined;

      const isScopeValid =
        (pendingScope === 'session' && isSessionContext && (!pendingInteraction.sessionId || pendingInteraction.sessionId === currentSessionId)) ||
        (pendingScope === 'global-chat' && !isSessionContext) ||
        (pendingScope === 'vision' && (currentPage === 'vision' || pageContext?.page === 'vision' || activeTab === 'vision')) ||
        (pendingScope === 'easy-understand' && (currentPage === 'easy-understand' || pageContext?.page === 'easy-understand' || activeTab === 'easy-understand'));

      if (!isScopeValid) {
        setPendingInteraction(null);
      } else {
        const honorifics = deduceHonorifics(userProfile, trimmedText);
        const pendingRes = await resolvePendingInteraction(trimmedText, pendingInteraction, honorifics);
        if (pendingRes.newPending) {
          setPendingInteraction({
            ...pendingRes.newPending,
            scope: isSessionContext ? 'session' : 'global-chat',
            sessionId: isSessionContext ? activeSession?.id : undefined,
          });
        } else if (pendingRes.clearPending) {
          setPendingInteraction(null);
        }

        if (pendingRes.resolved) {
          let finalReply = pendingRes.reply || '';
          if (pendingRes.appAction) {
            const execRes = await executeValidatedAppAction(pendingRes.appAction, appContext, runtimeContext, { trustedSource: true });
            if (execRes.executed) {
              finalReply = pendingRes.reply || 'Dạ vâng, con đã thực hiện xong rồi ạ.';
            } else {
              finalReply = execRes.reason || 'Dạ, con chưa thực hiện được thao tác này do có lỗi xảy ra.';
            }
          }
          let sessionAfterPending = activeSession;

        if (pendingRes.agentActions && pendingRes.agentActions.length > 0 && sessionAfterPending) {
          const batchTrigger = inputMode === 'voice' ? 'voice' : 'chat';
          const batchRes = applyAgentActionBatch(sessionAfterPending, pendingRes.agentActions, batchTrigger);
          sessionAfterPending = batchRes.newState;
        }

        if (finalReply) {
          if (sessionAfterPending && isSessionContext) {
            const now = new Date().toISOString();
            const userMsg = {
              id: `msg-${Date.now()}`,
              sender: 'user' as const,
              text: trimmedText,
              timestamp: now,
              inputMode,
            };
            const loviraMsg = {
              id: `msg-${Date.now() + 1}`,
              sender: 'lovira' as const,
              text: finalReply,
              timestamp: new Date().toISOString(),
            };
            sessionAfterPending = {
              ...sessionAfterPending,
              messages: [...sessionAfterPending.messages, userMsg, loviraMsg],
              updatedAt: now,
            };
            setActiveSession(sessionAfterPending);
            saveUpdatedSession(sessionAfterPending);
          } else if (!isSessionContext) {
            addGlobalMessage(trimmedText, finalReply, { inputMode });
          }

          showToast(finalReply);
          if (inputMode === 'voice' || accessibilitySettings.speakResponse) {
            speakWithVoiceStatus(finalReply);
          } else {
            setVoiceStatus('idle');
          }
        } else {
          if (sessionAfterPending) {
            setActiveSession(sessionAfterPending);
            saveUpdatedSession(sessionAfterPending);
          }
          setVoiceStatus('idle');
        }
        setIsLoading(false);
        return;
      }
    }
  }

  // A2. Fast Deterministic Vietnamese Reminder Parsing
    const parseRes = parseVietnameseReminderText(trimmedText);
    if (parseRes.status === 'needs_clarification') {
      const hasDateStr = parseRes.targetDateStr;
      let dayInfo = '';
      if (hasDateStr) {
        const d = new Date(hasDateStr);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow =
          d.getFullYear() === tomorrow.getFullYear() &&
          d.getMonth() === tomorrow.getMonth() &&
          d.getDate() === tomorrow.getDate();
        if (isTomorrow) dayInfo = 'ngày mai ';
      }

      const askMsg = `Dạ, ${dayInfo}chú muốn con nhắc ${parseRes.title ? `"${parseRes.title}" ` : ''}vào lúc mấy giờ ạ?`;

      setPendingInteraction({
        type: 'clarification',
        data: {
          actionType: 'CREATE_REMINDER',
          payload: {
            title: parseRes.title,
            category: parseRes.category,
            repeat: parseRes.repeat,
            priority: parseRes.priority,
            targetDateStr: parseRes.targetDateStr,
            sessionId: isSessionContext && activeSession ? activeSession.id : undefined,
          },
          question: askMsg,
        },
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 180000,
      });

      if (activeSession && isSessionContext) {
        const now = new Date().toISOString();
        const userMsg = {
          id: `msg-${Date.now()}`,
          sender: 'user' as const,
          text: trimmedText,
          timestamp: now,
          inputMode,
        };
        const loviraMsg = {
          id: `msg-${Date.now() + 1}`,
          sender: 'lovira' as const,
          text: askMsg,
          timestamp: new Date().toISOString(),
          suggestedReplies: ['7 giờ sáng', '8 giờ tối', '15 phút nữa'],
        };
        const updatedSession = {
          ...activeSession,
          messages: [...activeSession.messages, userMsg, loviraMsg],
          updatedAt: now,
        };
        setActiveSession(updatedSession);
        saveUpdatedSession(updatedSession);
      } else if (!isSessionContext) {
        addGlobalMessage(trimmedText, askMsg, { inputMode, suggestedReplies: ['7 giờ sáng', '8 giờ tối', '15 phút nữa'] });
      }

      showToast(askMsg);
      if (inputMode === 'voice' || accessibilitySettings.speakResponse) {
        speakWithVoiceStatus(askMsg);
      } else {
        setVoiceStatus('idle');
      }
      setIsLoading(false);
      return;
    }

    if (parseRes.status === 'resolved') {
      const parsedReminder = parseRes.reminder;
      const dObj = new Date(parsedReminder.scheduledAt);
      const timeFormatted = !isNaN(dObj.getTime())
        ? dObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : 'đã chọn';
      const dateFormatted = !isNaN(dObj.getTime())
        ? dObj.toLocaleDateString('vi-VN')
        : 'hôm nay';
      const confirmQuestion = `Dạ, con xin xác nhận lại lời nhắc: "${parsedReminder.title}" vào lúc ${timeFormatted} (${dateFormatted}). ${addressing} có đồng ý tạo không ạ?`;

      const draftReminder: PendingDraftReminder = {
        title: parsedReminder.title,
        scheduledAt: parsedReminder.scheduledAt,
        category: parsedReminder.category,
        repeat: parsedReminder.repeat,
        priority: parsedReminder.priority,
        notes: parsedReminder.notes,
        sessionId: isSessionContext && activeSession ? activeSession.id : undefined,
      };

      const newPending: PendingInteraction = {
        type: 'confirm_reminder',
        scope: isSessionContext ? 'session' : 'global-chat',
        sessionId: isSessionContext && activeSession ? activeSession.id : undefined,
        data: {
          actionType: 'CONFIRM_REMINDER',
          draftReminder,
          question: confirmQuestion,
          suggestedReplies: ['Đồng ý tạo', 'Đổi giờ', 'Đổi tiêu đề', 'Hủy bỏ'],
        },
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 180000,
      };

      setPendingInteraction(newPending);

      const displayPrompt = `${confirmQuestion} (${addressing.charAt(0).toUpperCase() + addressing.slice(1)} có thể bấm xác nhận, đổi giờ hoặc sửa tiêu đề).`;

      if (activeSession && isSessionContext) {
        const now = new Date().toISOString();
        const userMsg = {
          id: `msg-${Date.now()}`,
          sender: 'user' as const,
          text: trimmedText,
          timestamp: now,
          inputMode,
        };
        const loviraMsg = {
          id: `msg-${Date.now() + 1}`,
          sender: 'lovira' as const,
          text: displayPrompt,
          timestamp: new Date().toISOString(),
          suggestedReplies: ['Đồng ý tạo', 'Đổi giờ', 'Đổi tiêu đề', 'Hủy bỏ'],
        };
        const updatedSession = {
          ...activeSession,
          messages: [...activeSession.messages, userMsg, loviraMsg],
          updatedAt: now,
        };
        setActiveSession(updatedSession);
        saveUpdatedSession(updatedSession);
      } else if (!isSessionContext) {
        addGlobalMessage(trimmedText, displayPrompt, {
          inputMode,
          suggestedReplies: ['Đồng ý tạo', 'Đổi giờ', 'Đổi tiêu đề', 'Hủy bỏ'],
        });
      }

      showToast(confirmQuestion);
      if (inputMode === 'voice' || accessibilitySettings.speakResponse) {
        speakWithVoiceStatus(confirmQuestion);
      } else {
        setVoiceStatus('idle');
      }
      setIsLoading(false);
      return;
    }

    // A3. Fast Intent Router (Hybrid Local-First Deterministic Pipeline)
    const fastRoute = await routeFastIntent(trimmedText, {
      session: isSessionContext ? activeSession : null,
      userProfile,
      activeTab,
      page: isSessionContext ? 'session' : (pageContext?.page || activeTab || 'dashboard'),
      hasActiveSession: isSessionContext && !!activeSession,
    });

    if (fastRoute.handled) {
      if (fastRoute.needsClarification) {
        const q = fastRoute.clarificationQuestion || 'Chú có thể nói rõ hơn được không ạ?';
        setPendingInteraction({
          type: 'clarification',
          data: {
            actionType: fastRoute.clarificationActionType,
            payload: fastRoute.clarificationPayload || { originalQuery: trimmedText },
            question: q,
            candidates: fastRoute.clarificationCandidates || [],
            suggestedReplies: fastRoute.suggestedReplies,
          },
          createdAt: new Date().toISOString(),
          expiresAt: Date.now() + 180000,
        });

        if (activeSession && isSessionContext) {
          const now = new Date().toISOString();
          const userMsg = {
            id: `msg-${Date.now()}`,
            sender: 'user' as const,
            text: trimmedText,
            timestamp: now,
            inputMode,
          };
          const loviraMsg = {
            id: `msg-${Date.now() + 1}`,
            sender: 'lovira' as const,
            text: q,
            timestamp: new Date().toISOString(),
            suggestedReplies: fastRoute.suggestedReplies,
          };
          const updatedSession = {
            ...activeSession,
            messages: [...activeSession.messages, userMsg, loviraMsg],
            updatedAt: now,
          };
          setActiveSession(updatedSession);
          saveUpdatedSession(updatedSession);
        } else if (!isSessionContext) {
          addGlobalMessage(trimmedText, q, { inputMode, suggestedReplies: fastRoute.suggestedReplies });
        }

        showToast(q);
        if (inputMode === 'voice' || accessibilitySettings.speakResponse) {
          speakWithVoiceStatus(q);
        } else {
          setVoiceStatus('idle');
        }
        setIsLoading(false);
        return;
      }

      if (fastRoute.requiresConfirmation) {
        const prompt = fastRoute.confirmationPrompt || fastRoute.reply || 'Chú có chắc muốn thực hiện thao tác này không ạ?';
        const actionWithSkip = fastRoute.appAction
          ? {
              ...fastRoute.appAction,
              payload: {
                ...fastRoute.appAction.payload,
                skipConfirmation: true,
              },
            }
          : undefined;

        setPendingInteraction({
          type: 'confirm_action',
          data: {
            action: actionWithSkip,
            agentActions: fastRoute.agentActions,
            intentId: fastRoute.intentId,
            payload: actionWithSkip?.payload,
            question: prompt,
            successReply: fastRoute.confirmSuccessReply,
            cancelReply: fastRoute.confirmCancelReply,
            suggestedReplies: fastRoute.suggestedReplies,
          },
          createdAt: new Date().toISOString(),
          expiresAt: Date.now() + 180000,
        });

        if (activeSession && isSessionContext) {
          const now = new Date().toISOString();
          const userMsg = {
            id: `msg-${Date.now()}`,
            sender: 'user' as const,
            text: trimmedText,
            timestamp: now,
            inputMode,
          };
          const loviraMsg = {
            id: `msg-${Date.now() + 1}`,
            sender: 'lovira' as const,
            text: prompt,
            timestamp: new Date().toISOString(),
            suggestedReplies: fastRoute.suggestedReplies || ['Đồng ý', 'Thôi không cần'],
          };
          const updatedSession = {
            ...activeSession,
            messages: [...activeSession.messages, userMsg, loviraMsg],
            updatedAt: now,
          };
          setActiveSession(updatedSession);
          saveUpdatedSession(updatedSession);
        } else if (!isSessionContext) {
          addGlobalMessage(trimmedText, prompt, { inputMode, suggestedReplies: fastRoute.suggestedReplies || ['Đồng ý', 'Thôi không cần'] });
        }

        showToast(prompt);
        if (inputMode === 'voice' || accessibilitySettings.speakResponse) {
          speakWithVoiceStatus(prompt);
        } else {
          setVoiceStatus('idle');
        }
        setIsLoading(false);
        return;
      }

      let replyText = fastRoute.reply || 'Dạ, con đã thực hiện xong thao tác rồi ạ.';
      let speechText = fastRoute.speech || replyText;

      // Handle AppAction if provided by Fast Router
      if (fastRoute.appAction) {
        const execRes = await executeValidatedAppAction(fastRoute.appAction, appContext, runtimeContext);
        if (!execRes.executed && execRes.reason) {
          replyText = execRes.reason;
          speechText = replyText;
        }
      }

      // Handle AgentActions if provided by Fast Router
      let sessionToSave = isSessionContext ? activeSession : null;
      if (fastRoute.agentActions && fastRoute.agentActions.length > 0 && sessionToSave) {
        const batchTrigger = inputMode === 'voice' ? 'voice' : 'chat';
        const batchRes = applyAgentActionBatch(sessionToSave, fastRoute.agentActions, batchTrigger);
        sessionToSave = batchRes.newState;
      }

      // Record messages in active session if present
      if (sessionToSave && isSessionContext) {
        const now = new Date().toISOString();
        const userMsg = {
          id: `msg-${Date.now()}`,
          sender: 'user' as const,
          text: trimmedText,
          timestamp: now,
          inputMode,
        };
        const loviraMsg = {
          id: `msg-${Date.now() + 1}`,
          sender: 'lovira' as const,
          text: replyText,
          timestamp: new Date().toISOString(),
          suggestedReplies: fastRoute.suggestedReplies,
        };
        const updatedSession = {
          ...sessionToSave,
          messages: [...sessionToSave.messages, userMsg, loviraMsg],
          updatedAt: now,
        };
        setActiveSession(updatedSession);
        saveUpdatedSession(updatedSession);
      } else if (!isSessionContext) {
        addGlobalMessage(trimmedText, replyText, { inputMode, suggestedReplies: fastRoute.suggestedReplies });
      }

      showToast(replyText);
      if (inputMode === 'voice' || accessibilitySettings.speakResponse) {
        speakWithVoiceStatus(speechText);
      } else {
        setVoiceStatus('idle');
      }
      setIsLoading(false);
      return;
    }

    // B. Main Interaction Flow (Fallback to AI Chat when Fast Router returns handled = false)
    const sessionToUse = isSessionContext ? activeSession : null;

    if (sessionToUse) {
      const now = new Date().toISOString();
      const userMsg = {
        id: `msg-${Date.now()}`,
        sender: 'user' as const,
        text: trimmedText,
        timestamp: now,
        inputMode,
      };

      const sessionWithUserMsg = {
        ...sessionToUse,
        messages: [...sessionToUse.messages, userMsg],
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
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        const rawReply = data.reply || '';
        const rawSpeech = data.speech;
        const actions: AgentAction[] = data.actions || [];
        const appActions: AppAction[] = data.appActions || [];
        const suggestedReplies: string[] | undefined = data.suggestedReplies;

        // Step 1: Session Actions (AgentAction[]) Validation & Application
        const batchTrigger = inputMode === 'voice' ? 'voice' : 'chat';
        const batchRes = applyAgentActionBatch(sessionWithUserMsg, actions, batchTrigger);
        const sessionAfterActions = batchRes.newState;
        const appliedSessionActions = batchRes.appliedActions;
        const rejectedSessionActions = batchRes.rejectedActions;

        // Step 2: App Actions (AppAction[]) Validation & Execution
        const executedAppActions: AppAction[] = [];
        const pendingAppActions: AppAction[] = [];
        const rejectedAppActions: { action: AppAction; reason: string }[] = [];

        if (appActions.length > 0) {
          for (const appAct of appActions) {
            const execRes = await executeValidatedAppAction(appAct, appContext, runtimeContext);
            if (execRes.status === 'executed') {
              executedAppActions.push(execRes.action);
            } else if (execRes.status === 'pending_confirmation') {
              pendingAppActions.push(execRes.action);
            } else {
              rejectedAppActions.push({ action: appAct, reason: execRes.reason || 'Thao tác bị từ chối' });
            }
          }
        }

        // Step 3: CAPABILITY / RESPONSE GROUNDING
        const groundingResult = validateAndGroundAIResponse({
          rawReply,
          rawSpeech,
          suggestedReplies,
          appliedSessionActions,
          rejectedSessionActions,
          executedAppActions,
          pendingAppActions,
          rejectedAppActions,
          session: sessionAfterActions,
          userProfile,
          userInput: trimmedText,
        });

        const finalReplyText = groundingResult.finalReply;
        const finalSpeechText = groundingResult.finalSpeech;
        const finalSuggestedReplies = groundingResult.finalSuggestedReplies;

        // Step 4: Save Lovira message with grounded text
        const loviraMsg = {
          id: `msg-${Date.now()}`,
          sender: 'lovira' as const,
          text: finalReplyText,
          timestamp: new Date().toISOString(),
          actionsApplied: appliedSessionActions,
          suggestedReplies: finalSuggestedReplies,
        };

        sessionAfterActions.messages.push(loviraMsg);
        saveUpdatedSession(sessionAfterActions);

        // Step 5: Visual Side Effects & State-Consistent TTS
        if (
          appliedSessionActions.some((a) => a.type === 'OPEN_CAMERA') ||
          executedAppActions.some((a) => a.type === 'OPEN_CAMERA')
        ) {
          setCameraModalOpen(true);
        }

        showToast(finalReplyText);

        if (inputMode === 'voice' || accessibilitySettings.speakResponse) {
          speakWithVoiceStatus(finalSpeechText);
        } else {
          setVoiceStatus('idle');
        }
      } catch (e: any) {
        if (e.name === 'AbortError') return;

        console.warn('Backend chat unreachable or offline, running local intent engine:', e);
        const localResult = parseLocalIntent(trimmedText, sessionWithUserMsg, userProfile);
        if (localResult) {
          const batchTrigger = inputMode === 'voice' ? 'voice' : 'chat';
          const batchRes = applyAgentActionBatch(sessionWithUserMsg, localResult.actions, batchTrigger);
          const sessionAfterActions = batchRes.newState;

          const groundingResult = validateAndGroundAIResponse({
            rawReply: localResult.reply,
            rawSpeech: localResult.speech,
            suggestedReplies: localResult.suggestedReplies,
            appliedSessionActions: batchRes.appliedActions,
            rejectedSessionActions: batchRes.rejectedActions,
            executedAppActions: [],
            rejectedAppActions: [],
            session: sessionAfterActions,
            userProfile,
            userInput: trimmedText,
          });

          const loviraMsg = {
            id: `msg-${Date.now() + 1}`,
            sender: 'lovira' as const,
            text: groundingResult.finalReply,
            timestamp: new Date().toISOString(),
            actionsApplied: batchRes.appliedActions,
            suggestedReplies: groundingResult.finalSuggestedReplies,
          };

          sessionAfterActions.messages.push(loviraMsg);
          saveUpdatedSession(sessionAfterActions);

          showToast(groundingResult.finalReply);

          if (inputMode === 'voice' || accessibilitySettings.speakResponse) {
            speakWithVoiceStatus(groundingResult.finalSpeech);
          } else {
            setVoiceStatus('idle');
          }
        } else {
          const errMsg = 'Dạ, con đã nghe thấy nhưng tạm thời chưa có kết nối mạng. Chú có thể thử lại nhé!';
          showToast(errMsg);
          if (inputMode === 'voice' || accessibilitySettings.speakResponse) {
            speakWithVoiceStatus(errMsg);
          } else {
            setVoiceStatus('idle');
          }
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // C. Fallback when no session exists at all
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: null,
          message: trimmedText,
          conversationHistory: globalMessages.slice(-12).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            text: m.text,
          })),
          isDemoMode: aiSettings.demoMode || aiSettings.provider === 'demo',
          provider: aiSettings.provider,
          userProfile,
          inputMode,
          appContext,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const rawReply = data.reply || 'Lovira đang lắng nghe bạn.';
      const rawSpeech = data.speech;
      const appActions: AppAction[] = data.appActions || [];
      const executedAppActions: AppAction[] = [];
      const pendingAppActions: AppAction[] = [];
      const rejectedAppActions: { action: AppAction; reason: string }[] = [];

      if (appActions.length > 0) {
        for (const appAct of appActions) {
          const execRes = await executeValidatedAppAction(appAct, appContext, runtimeContext);
          if (execRes.status === 'executed') {
            executedAppActions.push(execRes.action);
          } else if (execRes.status === 'pending_confirmation') {
            pendingAppActions.push(execRes.action);
          } else {
            rejectedAppActions.push({ action: appAct, reason: execRes.reason || 'Thao tác bị từ chối' });
          }
        }
      } else if (data.pendingInteraction) {
        setPendingInteraction({
          ...data.pendingInteraction,
          scope: 'global-chat',
        });
      } else {
        const hasCreateProposal =
          rawReply.toLowerCase().includes('mở một phiên') ||
          rawReply.toLowerCase().includes('tạo một phiên') ||
          rawReply.toLowerCase().includes('có muốn tạo') ||
          rawReply.toLowerCase().includes('hướng dẫn từng bước');

        if (hasCreateProposal) {
          setPendingInteraction({
            type: 'create_session',
            scope: 'global-chat',
            data: { goal: trimmedText },
            createdAt: new Date().toISOString(),
            expiresAt: Date.now() + 180000,
          });
        }
      }

      const groundingResult = validateAndGroundAIResponse({
        rawReply,
        rawSpeech,
        suggestedReplies: data.suggestedReplies,
        appliedSessionActions: [],
        rejectedSessionActions: [],
        executedAppActions,
        pendingAppActions,
        rejectedAppActions,
        session: null,
        userProfile,
        userInput: trimmedText,
      });

      addGlobalMessage(trimmedText, groundingResult.finalReply, {
        inputMode,
        suggestedReplies: groundingResult.finalSuggestedReplies,
      });

      showToast(groundingResult.finalReply);

      if (inputMode === 'voice' || accessibilitySettings.speakResponse) {
        speakWithVoiceStatus(groundingResult.finalSpeech);
      } else {
        setVoiceStatus('idle');
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.warn('Dashboard interaction error:', e);
      showToast('Lovira chưa thể kết nối lúc này. Bạn thử lại nhé!');
      setVoiceStatus('idle');
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    pendingInteraction,
    activeSession,
    authUser,
    userProfile,
    aiSettings,
    accessibilitySettings,
    syncSettings,
    sessionsList,
    onNavigate,
    setActiveTab,
    onGoBack,
    setProfileSetupOpen,
    handleOpenSession,
    handleCreateSessionFromTemplate,
    handleCreateSessionFromScenario,
    setCameraModalOpen,
    setAccessibility,
    showToast,
    setVoiceStatus,
    executeValidatedAppAction,
    globalMessages,
    addGlobalMessage,
    setPendingInteraction,
    speakWithVoiceStatus,
    saveUpdatedSession,
    refreshSessionsList,
  ]);

  const handleCaptureCameraImage = useCallback(async (dataUrl: string) => {
    let currentTarget = activeSession;
    if (!currentTarget) {
      // RULE 7: Camera without active session -> Open Vision Assistant without auto-creating LifeSession!
      showToast('Đã chụp hình! Đang chuyển sang Nhìn giúp tôi...');
      if (onNavigate) {
        onNavigate('/vision');
      }
      setCameraModalOpen(false);
      return;
    }

    const now = new Date().toISOString();
    const resId = `res-${Date.now()}`;

    await indexedDbService.saveResourceBlob({
      id: resId,
      sessionId: currentTarget.id,
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
      ...currentTarget,
      resources: [newResource, ...(currentTarget.resources || [])],
      updatedAt: now,
    };

    setActiveSession(sessionWithRes);
    storageService.saveSession(sessionWithRes);
    showToast('Đã lưu ảnh chụp vào tài nguyên phiên. Đang đọc ảnh...');

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

      if (accessibilitySettings.speakResponse) {
        speakWithVoiceStatus(replyText);
      }
    } catch (e) {
      console.warn('Vision extraction failed', e);
      showToast('Đã lưu ảnh vào phiên.');
    }
  }, [activeSession, showToast, saveUpdatedSession, accessibilitySettings, speakWithVoiceStatus]);

  const confirmDraftReminder = useCallback(
    async (overrideDraft?: PendingDraftReminder) => {
      const draft = overrideDraft || pendingInteraction?.data?.draftReminder;
      if (!draft) return;

      const reminderAction: AppAction = {
        type: 'CREATE_REMINDER',
        payload: {
          title: draft.title,
          scheduledAt: draft.scheduledAt,
          category: draft.category || 'general',
          repeat: draft.repeat || 'once',
          priority: draft.priority || 'normal',
          leadTimeMinutes: draft.leadTimeMinutes,
          eventTime: draft.eventTime,
          eventDate: draft.eventDate,
          notes: draft.notes,
          sessionId: draft.sessionId || (activeSession ? activeSession.id : undefined),
          skipConfirmation: true,
        },
      };

      const appContext = {
        activeTab: (activeSession ? 'session' : 'chat') as any,
        activeSessionId: activeSession?.id,
        currentStepNumber: activeSession?.currentStepIndex !== undefined ? activeSession.currentStepIndex + 1 : undefined,
        currentStepTitle: activeSession?.steps?.[activeSession.currentStepIndex]?.title,
        availableSessions: sessionsList,
      };
      const runtimeContext = {
        userProfile,
        showToast,
        setCameraModalOpen,
        setProfileSetupOpen,
        onNavigate: onNavigate || (() => {}),
        onGoBack: onGoBack || (() => {}),
      };

      const execRes = await executeValidatedAppAction(reminderAction, appContext, runtimeContext, { trustedSource: true });
      setPendingInteraction(null);

      if (execRes.executed) {
        const dObj = new Date(draft.scheduledAt);
        const timeFormatted = !isNaN(dObj.getTime())
          ? dObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : draft.eventTime || 'đã chọn';
        const dateFormatted = !isNaN(dObj.getTime())
          ? dObj.toLocaleDateString('vi-VN')
          : draft.eventDate || 'hôm nay';
        const successMsg = `Dạ, con đã lên lịch nhắc "${draft.title}" vào lúc ${timeFormatted} (${dateFormatted}) rồi ạ.`;

        showToast(successMsg);
        if (accessibilitySettings.speakResponse) {
          speakWithVoiceStatus(successMsg);
        }
      }
    },
    [
      pendingInteraction,
      activeSession,
      sessionsList,
      userProfile,
      showToast,
      setCameraModalOpen,
      setProfileSetupOpen,
      onNavigate,
      onGoBack,
      accessibilitySettings,
      speakWithVoiceStatus,
      executeValidatedAppAction,
      setPendingInteraction,
    ]
  );

  const updateDraftReminder = useCallback(
    (updatedDraft: PendingDraftReminder) => {
      if (!pendingInteraction) return;
      const dObj = new Date(updatedDraft.scheduledAt);
      const timeFormatted = !isNaN(dObj.getTime())
        ? dObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : updatedDraft.eventTime || 'đã chọn';
      const dateFormatted = !isNaN(dObj.getTime())
        ? dObj.toLocaleDateString('vi-VN')
        : updatedDraft.eventDate || 'hôm nay';
      const confirmQuestion = `Dạ, con xin xác nhận lại lời nhắc: "${updatedDraft.title}" vào lúc ${timeFormatted} (${dateFormatted}). Chú/bác có đồng ý tạo không ạ?`;

      setPendingInteraction({
        ...pendingInteraction,
        type: 'confirm_reminder',
        data: {
          ...pendingInteraction.data,
          actionType: 'CONFIRM_REMINDER',
          draftReminder: updatedDraft,
          question: confirmQuestion,
          suggestedReplies: ['Đồng ý tạo', 'Đổi giờ', 'Đổi tiêu đề', 'Hủy bỏ'],
        },
      });
    },
    [pendingInteraction, setPendingInteraction]
  );

  const cancelDraftReminder = useCallback(() => {
    setPendingInteraction(null);
    showToast('Đã hủy bỏ tạo lời nhắc.');
  }, [showToast, setPendingInteraction]);

  return {
    activeSession,
    setActiveSession,
    sessionsList,
    isLoading,
    refreshSessionsList,
    saveUpdatedSession,
    handleOpenSession,
    handleCreateSessionFromTemplate,
    handleDeleteSession,
    handleUpdateStatus,
    handleToggleTask,
    handleToggleSubtask,
    handleAddTask,
    handleAddSubtask,
    handleDeleteTask,
    handleAddFact,
    handleDeleteFact,
    handleCompleteCurrentTask,
    handleDeleteResource,
    sendInteraction,
    handleCaptureCameraImage,
    globalMessages,
    clearGlobalChat,
    pendingInteraction,
    confirmDraftReminder,
    updateDraftReminder,
    cancelDraftReminder,
  };
}
