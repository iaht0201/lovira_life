/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NavTab } from './components/layout/DesktopSidebar';
import { storageService } from './services/storageService';
import { AISettings, UserProfile } from './types';

import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import { useSessionManager } from './hooks/useSessionManager';

import { AppShell } from './components/layout/AppShell';
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
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { Toast } from './components/common/Toast';
import { SplashScreen } from './components/common/SplashScreen';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';
import { PermissionRequestModal } from './components/common/PermissionRequestModal';
import { OnboardingModal } from './components/common/OnboardingModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { notificationService } from './services/notificationService';
import { AppNotification, NotificationType } from './types';

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [aiSettings, setAiSettings] = useState<AISettings>(() => storageService.getAISettings());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => storageService.getUserProfile());
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => storageService.isProfileBannerDismissed());

  // New Modals State
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

  const {
    voiceStatus,
    setVoiceStatus,
    interimTranscript,
    speakWithVoiceStatus,
    startListening,
    stopListening,
    cancelListening,
  } = useVoiceAssistant({
    speakResponse: accessibility.speakResponse,
  });

  const {
    activeSession,
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
    setActiveTab,
    setCameraModalOpen,
    setProfileSetupOpen,
    setAccessibility,
  });

  // Sync AI Settings
  useEffect(() => {
    storageService.saveAISettings(aiSettings);
  }, [aiSettings]);

  return (
    <>
      {/* 1. App Boot Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreateSession={() => handleCreateSessionFromTemplate('medical')}
        userName={userProfile?.preferredName || ''}
        planName="Gói miễn phí"
        voiceStatus={voiceStatus}
        onVoiceClick={
          voiceStatus === 'listening'
            ? stopListening
            : () => startListening((transcript) => sendInteraction(transcript, { inputMode: 'voice', activeTab }))
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

        {/* Tab 1: Full Homepage */}
        {activeTab === 'dashboard' && (
          <HomePage
            userName={userProfile?.preferredName || ''}
            sessionsList={sessionsList}
            onOpenSession={handleOpenSession}
            onCreateSessionFromTemplate={handleCreateSessionFromTemplate}
            onDeleteSession={(id) => handleDeleteSession(id, setConfirmModal)}
            onOpenTasks={() => setActiveTab('tasks')}
            onOpenReminders={() => setActiveTab('reminders')}
            onOpenCamera={() => setCameraModalOpen(true)}
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
            onDeleteSession={() => handleDeleteSession(activeSession.id, setConfirmModal)}
            onCompleteCurrentTask={handleCompleteCurrentTask}
            onToggleTask={handleToggleTask}
            onToggleSubtask={handleToggleSubtask}
            onAddTask={handleAddTask}
            onAddSubtask={handleAddSubtask}
            onDeleteTask={handleDeleteTask}
            onAddFact={handleAddFact}
            onDeleteFact={(id) => handleDeleteFact(id, setConfirmModal)}
            onDeleteResource={handleDeleteResource}
            onSendMessage={(text, opts) => sendInteraction(text, { ...opts, activeTab })}
            onOpenCamera={() => setCameraModalOpen(true)}
            isLoading={isLoading}
            voiceStatus={voiceStatus}
            interimTranscript={interimTranscript}
            userName={userProfile?.preferredName || ''}
            onStartVoice={() => startListening((transcript) => sendInteraction(transcript, { inputMode: 'voice', activeTab }))}
            onStopVoice={stopListening}
            onCancelVoice={cancelListening}
          />
        )}

        {/* Fallback if session/chat tab opened with no session */}
        {(activeTab === 'session' || activeTab === 'chat') && !activeSession && (
          <div className="p-8 text-center bg-surface border border-dashed border-default rounded-2xl space-y-4 max-w-lg mx-auto my-8">
            <p className="text-base font-bold text-text-primary">Chưa mở phiên hỗ trợ nào.</p>
            <p className="text-xs text-text-secondary">Hãy tạo một phiên mới để trò chuyện và được Lovira trợ giúp nhen.</p>
            <button
              onClick={() => handleCreateSessionFromTemplate('medical')}
              className="px-5 py-2.5 bg-[#287C78] hover:bg-[#1F625F] text-white font-bold text-sm rounded-xl transition-all shadow-xs cursor-pointer"
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
            onDeleteSession={(id) => handleDeleteSession(id, setConfirmModal)}
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

        {/* Tab 6: Profile Page */}
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
          onNavigate={(tab) => setActiveTab(tab)}
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
    </>
  );
}

export default function App() {
  return (
    <AccessibilityProvider>
      <AppContent />
    </AccessibilityProvider>
  );
}
