/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { NavTab } from './components/layout/DesktopSidebar';
import { storageService } from './services/storageService';
import { AISettings, UserProfile } from './types';
import { getTabFromPathname, getPathForTab } from './utils/navigation';

import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import { useSessionManager } from './hooks/useSessionManager';
import { cloudSyncService } from './services/firebase/cloudSyncService';

import { AppShell } from './components/layout/AppShell';
import { HomePage } from './components/home/HomePage';
import { LifeDashboard } from './components/dashboard/LifeDashboard';
import { LifeSessionRoute } from './components/session/LifeSessionRoute';
import { GlobalChatPage } from './components/chat/GlobalChatPage';
import { RemindersPage } from './components/reminders/RemindersPage';
import { CameraModal } from './components/camera/CameraModal';
import { VSLFloatingPanel } from './components/vsl/VSLFloatingPanel';
import { SettingsPage } from './components/settings/SettingsPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { ProfileInviteBanner } from './components/profile/ProfileInviteBanner';
import { ProfileSetupFlow } from './components/profile/ProfileSetupFlow';
import { AuthModal } from './components/auth/AuthModal';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { Toast } from './components/common/Toast';
import { SplashScreen } from './components/common/SplashScreen';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';
import { PermissionRequestModal } from './components/common/PermissionRequestModal';
import { OnboardingModal } from './components/common/OnboardingModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { notificationService } from './services/notificationService';
import { reminderService } from './services/reminderService';
import { VoiceAssistantOverlay } from './components/voice/VoiceAssistantOverlay';
import { AppNotification, NotificationType } from './types';

function AppContent() {
  const { user, isAuthenticated, syncSettings } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab: NavTab = getTabFromPathname(location.pathname);
  const isSessionRoute = location.pathname.startsWith('/session/');
  const routeSessionId = isSessionRoute ? location.pathname.replace('/session/', '') : undefined;

  const [showSplash, setShowSplash] = useState(true);
  const [aiSettings, setAiSettings] = useState<AISettings>(() => storageService.getAISettings());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => storageService.getUserProfile());
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => storageService.isProfileBannerDismissed());

  // Auto sync userProfile changes to Cloud when syncProfile is active
  useEffect(() => {
    if (isAuthenticated && user?.uid && syncSettings?.syncProfile && userProfile) {
      cloudSyncService.syncProfile(user.uid, userProfile);
    }
  }, [userProfile, isAuthenticated, user?.uid, syncSettings?.syncProfile]);

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'register' | 'forgot'>('login');

  const handleOpenAuthModal = (mode?: unknown) => {
    let cleanMode: 'login' | 'register' | 'forgot' = 'login';
    if (typeof mode === 'string') {
      if (mode === 'register') cleanMode = 'register';
      else if (mode === 'forgot' || mode === 'forgot-password') cleanMode = 'forgot';
    }
    setAuthModalInitialMode(cleanMode);
    setAuthModalOpen(true);
  };

  // Modals State
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(() => {
    return localStorage.getItem('lovira_onboarded') !== 'true';
  });

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

  // Notification Drawer State
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    notificationService.getNotifications()
  );

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const handleMarkNotifAsRead = (id: string) => {
    const updated = notificationService.markAsRead(id);
    setNotifications(updated);
  };

  const handleMarkAllNotifsAsRead = () => {
    const updated = notificationService.markAllAsRead();
    setNotifications(updated);
    showToast('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  const handleDeleteNotif = (id: string) => {
    const updated = notificationService.deleteNotification(id);
    setNotifications(updated);
  };

  const handleClearAllNotifs = () => {
    const updated = notificationService.clearAll();
    setNotifications(updated);
    showToast('Đã xóa tất cả thông báo');
  };

  const handleResetDefaultNotifs = () => {
    const updated = notificationService.resetToDefaults();
    setNotifications(updated);
    showToast('Đã khôi phục thông báo mặc định');
  };

  const handleAddNotif = (data: {
    title: string;
    message: string;
    type: NotificationType;
    actionTab?: any;
  }) => {
    notificationService.addNotification(data);
    setNotifications(notificationService.getNotifications());
    showToast(`Đã lưu thông báo: "${data.title}"`);
  };

  const { accessibility, setAccessibility } = useAccessibility();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const [lastVoiceResponseText, setLastVoiceResponseText] = useState<string | undefined>(undefined);

  const {
    voiceStatus,
    setVoiceStatus,
    interimTranscript,
    audioVolume,
    voiceError,
    setVoiceError,
    speakWithVoiceStatus: originalSpeak,
    stopSpeakingAudio,
    startListening,
    stopListening,
    cancelListening,
  } = useVoiceAssistant({
    speakResponse: accessibility.speakResponse,
  });

  const speakWithVoiceStatus = React.useCallback((text: string, onEndCallback?: () => void) => {
    setLastVoiceResponseText(text);
    originalSpeak(text, onEndCallback);
  }, [originalSpeak]);

  const {
    activeSession,
    setActiveSession,
    sessionsList,
    isLoading,
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
  } = useSessionManager({
    userProfile,
    aiSettings,
    accessibilitySettings: accessibility,
    showToast,
    speakWithVoiceStatus,
    setVoiceStatus,
    onNavigate: (path) => navigate(path),
    onGoBack: () => navigate(-1),
    setCameraModalOpen,
    setProfileSetupOpen,
    setAccessibility,
    authUser: user,
    syncSettings,
  });

  // Sync AI Settings
  useEffect(() => {
    storageService.saveAISettings(aiSettings);
  }, [aiSettings]);

  // Init reminder scheduler background checker
  useEffect(() => {
    reminderService.initScheduler();
  }, []);

  const handleTabChange = (tab: NavTab) => {
    navigate(getPathForTab(tab));
  };

  const currentGlobalPageContext = {
    page: isSessionRoute ? 'session' : activeTab,
    pathname: location.pathname,
    sessionId: isSessionRoute ? (activeSession?.id || routeSessionId) : undefined,
  };

  const handleVoiceInput = (transcript: string) => {
    if (cameraModalOpen) {
      const lower = transcript.toLowerCase().trim();
      if (
        lower.includes('chụp') ||
        lower.includes('tách') ||
        lower.includes('lấy ảnh') ||
        lower.includes('xong') ||
        lower.includes('ok') ||
        lower === 'chụp ảnh' ||
        lower === 'chụp hình'
      ) {
        console.log('[App] Voice command triggered camera capture:', transcript);
        window.dispatchEvent(new CustomEvent('lovira:trigger-camera-capture'));
        return;
      }
    }

    sendInteraction(transcript, {
      inputMode: 'voice',
      activeTab: isSessionRoute ? 'session' : activeTab,
      pageContext: currentGlobalPageContext,
    });
  };

  return (
    <>
      {/* 1. App Boot Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <AppShell
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCreateSession={() => handleCreateSessionFromTemplate('medical')}
        onOpenAuthModal={handleOpenAuthModal}
        userName={userProfile?.preferredName || ''}
        planName="Gói miễn phí"
        voiceStatus={voiceStatus}
        onVoiceClick={
          voiceStatus === 'listening'
            ? stopListening
            : () => startListening(handleVoiceInput)
        }
        accessibility={accessibility}
        onUpdateAccessibility={setAccessibility}
        onOpenNotifications={() => setNotificationDrawerOpen(true)}
        hasNotifications={unreadNotifCount > 0}
      >
        {/* Profile Invite Banner */}
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

        {/* Declarative URL Routes */}
        <Routes>
          {/* Route 1: Full Homepage */}
          <Route
            path="/"
            element={
              <HomePage
                userName={userProfile?.preferredName || ''}
                sessionsList={sessionsList}
                onOpenSession={handleOpenSession}
                onCreateSessionFromTemplate={handleCreateSessionFromTemplate}
                onDeleteSession={(id) => handleDeleteSession(id, setConfirmModal)}
                onOpenTasks={() => navigate('/tasks')}
                onOpenReminders={() => navigate('/reminders')}
                onOpenCamera={() => setCameraModalOpen(true)}
                onOpenChat={() => {
                  if (activeSession) {
                    navigate(`/session/${activeSession.id}`);
                  } else if (sessionsList.length > 0) {
                    handleOpenSession(sessionsList[0].id);
                  } else {
                    handleCreateSessionFromTemplate('custom', 'Trò chuyện cùng Lovira');
                  }
                }}
              />
            }
          />

          {/* Route 2: Global Chat */}
          <Route
            path="/chat"
            element={
              <GlobalChatPage
                activeSession={activeSession}
                sessionsList={sessionsList}
                onOpenSession={handleOpenSession}
                onCreateSessionFromTemplate={handleCreateSessionFromTemplate}
                userName={userProfile?.preferredName || ''}
              />
            }
          />

          {/* Route 3: Life Session Active Screen / Chat */}
          <Route
            path="/session/:sessionId"
            element={
              <LifeSessionRoute
                activeSession={activeSession}
                sessionsList={sessionsList}
                onSetSession={setActiveSession}
                onOpenSession={handleOpenSession}
                onCreateNewSession={() => handleCreateSessionFromTemplate('medical')}
                onDeleteSession={(id) => handleDeleteSession(id, setConfirmModal)}
                onUpdateStatus={handleUpdateStatus}
                onCompleteCurrentTask={handleCompleteCurrentTask}
                onToggleTask={handleToggleTask}
                onToggleSubtask={handleToggleSubtask}
                onAddTask={handleAddTask}
                onAddSubtask={handleAddSubtask}
                onDeleteTask={handleDeleteTask}
                onAddFact={handleAddFact}
                onDeleteFact={(id) => handleDeleteFact(id, setConfirmModal)}
                onDeleteResource={handleDeleteResource}
                onSendMessage={(text, opts) =>
                  sendInteraction(text, {
                    ...opts,
                    activeTab: 'session',
                    pageContext: {
                      page: 'session',
                      pathname: location.pathname,
                      sessionId: activeSession?.id || routeSessionId,
                    },
                  })
                }
                onOpenCamera={() => setCameraModalOpen(true)}
                isLoading={isLoading}
                voiceStatus={voiceStatus}
                interimTranscript={interimTranscript}
                userName={userProfile?.preferredName || ''}
                onStartVoice={() => startListening(handleVoiceInput)}
                onStopVoice={stopListening}
                onCancelVoice={cancelListening}
              />
            }
          />

          {/* Route 4: Tasks Dashboard */}
          <Route
            path="/tasks"
            element={
              <LifeDashboard
                defaultTab="tasks"
                activeSession={activeSession}
                sessionsList={sessionsList}
                onOpenSession={handleOpenSession}
                onCreateSessionFromTemplate={handleCreateSessionFromTemplate}
                onDeleteSession={(id) => handleDeleteSession(id, setConfirmModal)}
                onOpenCamera={() => setCameraModalOpen(true)}
              />
            }
          />

          {/* Route 5: History / Sessions List */}
          <Route
            path="/history"
            element={
              <LifeDashboard
                defaultTab="sessions"
                activeSession={activeSession}
                sessionsList={sessionsList}
                onOpenSession={handleOpenSession}
                onCreateSessionFromTemplate={handleCreateSessionFromTemplate}
                onDeleteSession={(id) => handleDeleteSession(id, setConfirmModal)}
                onOpenCamera={() => setCameraModalOpen(true)}
              />
            }
          />

          {/* Route 6: Reminders */}
          <Route
            path="/reminders"
            element={<RemindersPage onOpenSession={handleOpenSession} onShowToast={showToast} />}
          />

          {/* Route 7: Settings */}
          <Route
            path="/settings"
            element={
              <SettingsPage
                accessibility={accessibility}
                aiSettings={aiSettings}
                userProfile={userProfile}
                onUpdateAccessibility={setAccessibility}
                onUpdateAISettings={setAiSettings}
                onUpdateUserProfile={setUserProfile}
                onOpenProfileSetup={() => setProfileSetupOpen(true)}
                onOpenAuthModal={handleOpenAuthModal}
                onShowToast={showToast}
              />
            }
          />

          {/* Route 8: Profile */}
          <Route
            path="/profile"
            element={
              <ProfilePage
                userProfile={userProfile}
                onOpenProfileSetup={() => setProfileSetupOpen(true)}
                onUpdateUserProfile={setUserProfile}
                onOpenAuthModal={handleOpenAuthModal}
                onShowToast={showToast}
                totalSessionsCount={sessionsList.length}
              />
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Auth Modal */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authModalInitialMode}
          onSuccess={() => {
            setAuthModalOpen(false);
            showToast('Đăng nhập tài khoản thành công!');
          }}
        />

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

        {/* First Time Onboarding Modal */}
        <OnboardingModal
          isOpen={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          onSaveProfile={(p) => {
            if (p) setUserProfile(p);
            showToast('Đã lưu thiết lập ban đầu!');
          }}
        />

        {/* App Permissions Modal */}
        <PermissionRequestModal
          isOpen={permissionModalOpen}
          onClose={() => setPermissionModalOpen(false)}
        />

        {/* Camera Capture Modal */}
        <CameraModal
          isOpen={cameraModalOpen}
          onClose={() => setCameraModalOpen(false)}
          onCaptureImage={handleCaptureCameraImage}
        />

        {/* Vietnamese Sign Language Panel Placeholder */}
        <VSLFloatingPanel
          isOpen={accessibility.vslEnabled}
          onClose={() => setAccessibility((prev) => ({ ...prev, vslEnabled: false }))}
          latestText={
            activeSession?.messages[activeSession.messages.length - 1]?.text ||
            'Lovira Life sẵn sàng đồng hành cùng bạn!'
          }
        />

        {/* Notification Drawer */}
        <NotificationDrawer
          isOpen={notificationDrawerOpen}
          onClose={() => setNotificationDrawerOpen(false)}
          notifications={notifications}
          onMarkAsRead={handleMarkNotifAsRead}
          onMarkAllAsRead={handleMarkAllNotifsAsRead}
          onDeleteNotification={handleDeleteNotif}
          onClearAll={handleClearAllNotifs}
          onResetDefaults={handleResetDefaultNotifs}
          onAddNotification={handleAddNotif}
          onNavigate={(tab) => {
            if (typeof tab === 'string' && tab.startsWith('/')) {
              navigate(tab);
            } else {
              navigate(getPathForTab(tab as NavTab));
            }
          }}
        />

        {/* PWA Mobile Install Banner */}
        <PWAInstallPrompt />

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

      {/* Global Voice Assistant Listening/Speaking Overlay (Rendered outside AppShell to prevent CSS stacking context clipping) */}
      <VoiceAssistantOverlay
        voiceStatus={voiceStatus}
        interimTranscript={interimTranscript}
        audioVolume={audioVolume}
        voiceError={voiceError}
        lastResponseText={lastVoiceResponseText}
        isCameraOpen={cameraModalOpen}
        onStopListening={stopListening}
        onCancel={() => {
          cancelListening();
          stopSpeakingAudio();
          setVoiceError(undefined);
        }}
        onRetry={() => {
          setVoiceError(undefined);
          startListening(handleVoiceInput);
        }}
        onOpenChat={() => navigate('/chat')}
        onStopSpeaking={stopSpeakingAudio}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AccessibilityProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  );
}
