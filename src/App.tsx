/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { buildPartialSuccessReply, deduceHonorifics } from './services/conversationStyle';
import { parseLocalIntent } from './services/localIntentEngine';
import { createLifeSessionFromPlan } from './services/sessionFactory';
import { speakText } from './services/ttsService';

import { Header } from './components/common/Header';
import { Navigation, NavTab } from './components/common/Navigation';
import { AccessibilityToolbar } from './components/common/AccessibilityToolbar';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { Toast } from './components/common/Toast';

import { LifeDashboard } from './components/dashboard/LifeDashboard';
import { LifeSessionPage } from './components/session/LifeSessionPage';
import { CameraModal } from './components/camera/CameraModal';
import { VSLFloatingPanel } from './components/vsl/VSLFloatingPanel';
import { SettingsPage } from './components/settings/SettingsPage';
import { ProfileInviteBanner } from './components/profile/ProfileInviteBanner';
import { ProfileSetupFlow } from './components/profile/ProfileSetupFlow';

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
        const newCustomSession = createLifeSessionFromPlan(plan, customGoal, 'custom', accessibilityCtx);

        saveUpdatedSession(newCustomSession);
        storageService.setActiveSessionId(newCustomSession.id);
        setActiveTab('session');
        showToast(`✨ Đã khởi tạo thành công phiên AI: "${newCustomSession.title}"`);
        if (accessibility.speakResponse) {
          speakText(`Lovira đã tạo xong kế hoạch cho ${newCustomSession.title}`);
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
          text: `Chào bạn nha! Mình là Lovira, người bạn đồng hành cùng bạn trong phiên "${tmpl.title}" nè. Bước đầu tiên tụi mình làm sẽ là: "${tmpl.defaultTasks[0] || 'chuẩn bị'}" nha!`,
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

  // 3. Delete Session with Confirm
  const handleDeleteSession = (id: string) => {
    const target = storageService.getSession(id);
    setConfirmModal({
      isOpen: true,
      title: 'Xoá phiên hỗ trợ',
      message: `Bạn có chắc chắn muốn xoá phiên "${target?.title || id}"? Thao tác này sẽ xoá lịch sử và thông tin được lưu trên thiết bị.`,
      onConfirm: () => {
        storageService.deleteSession(id);
        refreshSessionsList();
        if (activeSession?.id === id) {
          const list = storageService.getSessionsList();
          if (list.length > 0) {
            handleOpenSession(list[0].id);
          } else {
            setActiveSession(null);
            setActiveTab('dashboard');
          }
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        showToast('Đã xoá phiên hỗ trợ');
      },
    });
  };

  // 4. Update Session Status
  const handleUpdateStatus = (status: SessionStatus) => {
    if (!activeSession) return;
    const updated = { ...activeSession, status, updatedAt: new Date().toISOString() };
    saveUpdatedSession(updated);
    showToast(`Đã chuyển trạng thái phiên sang ${status}`);
  };

  // 5. Toggle Task Complete
  const handleToggleTask = (taskId: string) => {
    if (!activeSession) return;
    const tasks = activeSession.tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'completed' ? ('pending' as const) : ('completed' as const);
        const updatedSubtasks = t.subtasks
          ? t.subtasks.map((st) => ({ ...st, status: nextStatus }))
          : undefined;
        return { ...t, status: nextStatus, subtasks: updatedSubtasks };
      }
      return t;
    });

    const candidate: LifeSession = { ...activeSession, tasks, updatedAt: new Date().toISOString() };
    const updated = reconcileSessionDerivedState(candidate);
    saveUpdatedSession(updated);
  };

  // 5b. Toggle Subtask Complete
  const handleToggleSubtask = (parentTaskId: string, subtaskId: string) => {
    if (!activeSession) return;
    const tasks = activeSession.tasks.map((t) => {
      if (t.id === parentTaskId && t.subtasks) {
        const updatedSubtasks = t.subtasks.map((st) => {
          if (st.id === subtaskId) {
            return {
              ...st,
              status: st.status === 'completed' ? ('pending' as const) : ('completed' as const),
            };
          }
          return st;
        });
        return { ...t, subtasks: updatedSubtasks };
      }
      return t;
    });

    const candidate: LifeSession = { ...activeSession, tasks, updatedAt: new Date().toISOString() };
    const updated = reconcileSessionDerivedState(candidate);
    saveUpdatedSession(updated);
  };

  // 5c. Add Subtask
  const handleAddSubtask = (parentTaskId: string, title: string) => {
    if (!activeSession) return;
    const tasks = activeSession.tasks.map((t) => {
      if (t.id === parentTaskId) {
        const existingSubtasks = t.subtasks || [];
        const newSubtask = {
          id: `subtask-${Date.now()}`,
          parentTaskId,
          title,
          order: existingSubtasks.length + 1,
          status: 'pending' as const,
        };
        return { ...t, subtasks: [...existingSubtasks, newSubtask] };
      }
      return t;
    });

    const candidate: LifeSession = { ...activeSession, tasks, updatedAt: new Date().toISOString() };
    const updated = reconcileSessionDerivedState(candidate);
    saveUpdatedSession(updated);
    showToast(`Đã thêm bước con: "${title}"`);
  };

  // 6. Add Task
  const handleAddTask = (title: string, description?: string) => {
    if (!activeSession) return;
    const newOrder = activeSession.tasks.length + 1;
    const newTask = {
      id: `task-${Date.now()}`,
      title,
      description,
      order: newOrder,
      status: 'pending' as const,
    };
    const candidate: LifeSession = {
      ...activeSession,
      tasks: [...activeSession.tasks, newTask],
      updatedAt: new Date().toISOString(),
    };
    const updated = reconcileSessionDerivedState(candidate);
    saveUpdatedSession(updated);
    showToast(`Đã thêm việc: "${title}"`);
  };

  // 7. Delete Task
  const handleDeleteTask = (taskId: string) => {
    if (!activeSession) return;
    const targetTask = activeSession.tasks.find((t) => t.id === taskId);
    const candidate: LifeSession = {
      ...activeSession,
      tasks: activeSession.tasks.filter((t) => t.id !== taskId),
      updatedAt: new Date().toISOString(),
    };
    const updated = reconcileSessionDerivedState(candidate);
    saveUpdatedSession(updated);
    showToast(`Đã xoá nhiệm vụ: "${targetTask?.title || ''}"`);
  };

  // 8. Add Important Fact
  const handleAddFact = (fact: { category: ImportantFactType; title: string; value: string }) => {
    if (!activeSession) return;
    const now = new Date().toISOString();
    const newFact = {
      id: `fact-${Date.now()}`,
      type: fact.category,
      title: fact.title,
      value: fact.value,
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

  // 12. Send Message to Lovira
  const handleSendMessage = async (userText: string) => {
    if (!activeSession || isLoading) return;

    const now = new Date().toISOString();
    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user' as const,
      text: userText,
      timestamp: now,
    };

    const sessionWithUserMsg = {
      ...activeSession,
      messages: [...activeSession.messages, userMsg],
      updatedAt: now,
    };

    setActiveSession(sessionWithUserMsg);
    setIsLoading(true);

    try {
      // 1. Send directly to /api/chat (Backend routes through deterministic local router, Groq, or Gemini)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: sessionWithUserMsg,
          message: userText,
          isDemoMode: aiSettings.demoMode || aiSettings.provider === 'demo',
          provider: aiSettings.provider,
          userProfile,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.reply || 'Lovira đã nhận thông tin của bạn.';
      const actions: AgentAction[] = data.actions || [];
      const suggestedReplies: string[] | undefined = data.suggestedReplies;

      // Check for confirmation requirement in actions
      const sensitiveAction = actions.find((a) => a.requiresConfirmation);

      const applyActionsAndSave = (actionsToApply: AgentAction[]) => {
        const batchRes = applyAgentActionBatch(sessionWithUserMsg, actionsToApply, 'chat');

        if (batchRes.status === 'full' || batchRes.status === 'partial') {
          const finalSession = batchRes.newState;
          let consistentReply = replyText;

          let finalSuggestedReplies = suggestedReplies;

          if (batchRes.status === 'partial' && batchRes.rejectedActions.length > 0) {
            console.warn('Some agent actions were ignored by validator:', batchRes.rejectedActions);
            // If AI didn't provide a conversational reply, fallback to state-consistent reply
            if (!replyText || !replyText.trim()) {
              const honorifics = deduceHonorifics(userProfile, userText);
              consistentReply = buildPartialSuccessReply(
                batchRes.appliedActions,
                batchRes.rejectedActions,
                replyText,
                honorifics
              );
            }
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

          if (batchRes.status === 'partial') {
            const failMsg = batchRes.rejectedActions.map((f) => f.reason).join(', ');
            showToast(`⚠️ Lovira đã áp dụng một phần (${batchRes.appliedActions.length}/${actionsToApply.length}): ${failMsg}`);
          } else if (batchRes.logSummaries.length > 0) {
            showToast(batchRes.logSummaries.join(' • '));
          }

          if (accessibility.speakResponse) {
            speakText(data.speech || consistentReply);
          }

          if (actionsToApply.some((a) => a.type === 'OPEN_CAMERA')) {
            setCameraModalOpen(true);
          }
        } else {
          showToast(`⚠️ Lovira chưa thể cập nhật: ${batchRes.rejectedReason || 'Hành động không hợp lệ'}`);
        }
      };

      if (sensitiveAction) {
        setConfirmModal({
          isOpen: true,
          title: 'Xác nhận thao tác nhạy cảm từ Lovira',
          message: sensitiveAction.confirmationPrompt || 'Lovira đề xuất thực hiện thay đổi quan trọng này. Bạn có đồng ý không?',
          onConfirm: () => {
            applyActionsAndSave(actions);
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          },
        });
      } else {
        applyActionsAndSave(actions);
      }
    } catch (e) {
      console.warn('Backend chat unreachable, trying offline local intent fallback:', e);

      // Offline client-side fallback
      const localResult = parseLocalIntent(userText, sessionWithUserMsg, userProfile);
      if (localResult) {
        const batchRes = applyAgentActionBatch(sessionWithUserMsg, localResult.actions, 'chat');
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

        if (accessibility.speakResponse) {
          speakText(localResult.speech || localResult.reply);
        }
      } else {
        showToast('Không có kết nối mạng. Lovira vẫn lưu trữ cục bộ an toàn!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 13. Camera Image Capture & AI Vision Extraction
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
        speakText(replyText);
      }
    } catch (e) {
      console.warn('Vision extraction failed', e);
      showToast('Đã lưu ảnh vào phiên.');
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col font-sans">
      {/* Top Application Header */}
      <Header
        onNewSession={() => handleCreateSessionFromTemplate('medical')}
        onOpenSettings={() => setActiveTab('settings')}
        accessibility={accessibility}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Responsive Desktop Sidebar / Mobile Navigation */}
        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasActiveSession={!!activeSession}
        />

        {/* Main Content Workspace */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden min-w-0">
          {/* Quick Accessibility Toolbar Bar */}
          <AccessibilityToolbar
            settings={accessibility}
            onUpdate={setAccessibility}
          />

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

          {/* Tab 1: Dashboard */}
          {activeTab === 'dashboard' && (
            <LifeDashboard
              activeSession={activeSession}
              sessionsList={sessionsList}
              onOpenSession={handleOpenSession}
              onCreateSessionFromTemplate={handleCreateSessionFromTemplate}
              onDeleteSession={handleDeleteSession}
              onOpenCamera={() => setCameraModalOpen(true)}
            />
          )}

          {/* Tab 2: Life Session Active Screen */}
          {activeTab === 'session' && activeSession && (
            <LifeSessionPage
              session={activeSession}
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
              onSendMessage={handleSendMessage}
              onOpenCamera={() => setCameraModalOpen(true)}
              isLoading={isLoading}
            />
          )}

          {/* Fallback if session tab opened with no session */}
          {activeTab === 'session' && !activeSession && (
            <div className="p-8 text-center bg-surface border border-dashed border-default rounded-2xl space-y-3">
              <p className="text-base font-bold text-text-primary">Chưa mở phiên hỗ trợ nào.</p>
              <button
                onClick={() => handleCreateSessionFromTemplate('medical')}
                className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl"
              >
                Mở phiên Đi khám bệnh mẫu ngay
              </button>
            </div>
          )}

          {/* Tab 3: Camera Assistant Shortcut */}
          {activeTab === 'camera' && (
            <div className="p-8 text-center bg-surface border border-default rounded-2xl space-y-4">
              <h2 className="text-xl font-bold text-text-primary">
                Nhìn giúp tôi — Quét ảnh & Tài liệu
              </h2>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                Chụp phiếu khám, số thứ tự, đơn thuốc hay nhãn hàng hoá để Lovira trích xuất thông tin tự động vào phiên làm việc.
              </p>
              <button
                onClick={() => setCameraModalOpen(true)}
                className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm shadow-md hover:bg-amber-600"
              >
                Mở Camera ngay
              </button>
            </div>
          )}

          {/* Tab 4: Settings */}
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
        </main>
      </div>

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
    </div>
  );
}
