import React, { useState } from 'react';
import { HomeHero } from './HomeHero';
import { QuickActions } from './QuickActions';
import { RecentSessions } from './RecentSessions';
import { UpcomingReminders } from './UpcomingReminders';
import { DailyProgress } from './DailyProgress';
import { WeatherMiniCard } from './WeatherMiniCard';
import { HomeOfflineBanner } from './HomeOfflineBanner';
import { CreateSessionModal } from './CreateSessionModal';
import { DetailedReminderModal } from '../reminders/DetailedReminderModal';
import { BriefSessionHeader } from '../../services/storageService';
import { ScenarioType } from '../../types';
import { UserProfile } from '../../types/userProfile';
import { ReminderData } from './ReminderItem';
import { notificationService } from '../../services/notificationService';

interface HomePageProps {
  userName?: string;
  userProfile?: UserProfile | null;
  sessionsList: BriefSessionHeader[];
  onOpenSession: (id: string) => void;
  onCreateSessionFromTemplate: (type: ScenarioType, customGoal?: string) => Promise<void>;
  onDeleteSession: (id: string) => void;
  onOpenTasks: () => void;
  onOpenReminders: () => void;
  onOpenChat: () => void;
  onOpenCamera?: () => void;
  onOpenListen?: () => void;
  onTriggerSOS?: () => void;
  isOffline?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  userName = 'Bạn',
  userProfile,
  sessionsList,
  onOpenSession,
  onCreateSessionFromTemplate,
  onDeleteSession,
  onOpenTasks,
  onOpenReminders,
  onOpenChat,
  onOpenCamera,
  onOpenListen,
  onTriggerSOS,
  isOffline = false,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  const handleOpenRemindersModal = () => {
    setIsReminderModalOpen(true);
  };

  const handleSaveReminder = (newRem: any) => {
    // Handled by DetailedReminderModal through reminderService
    setIsReminderModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Offline Banner if disconnected */}
      <HomeOfflineBanner isOffline={isOffline} />

      {/* 8. Hero Section */}
      <HomeHero userName={userName} userProfile={userProfile} />

      {/* 10. Quick Action Cards */}
      <QuickActions
        onCreateSession={() => setIsCreateModalOpen(true)}
        onOpenCamera={onOpenCamera}
        onOpenListen={onOpenListen}
        onOpenTasks={onOpenTasks}
        onOpenReminders={onOpenReminders}
        onOpenChat={onOpenChat}
      />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Recent Sessions */}
        <div className="lg:col-span-2 space-y-6">
          <RecentSessions
            sessions={sessionsList}
            onOpenSession={onOpenSession}
            onDeleteSession={onDeleteSession}
            onCreateSession={() => setIsCreateModalOpen(true)}
            onViewAll={onOpenTasks}
          />
        </div>

        {/* Right 1 Column: Upcoming Reminders & Widgets */}
        <div className="space-y-6">
          <UpcomingReminders
            onAddReminder={handleOpenRemindersModal}
            onNavigateToReminders={onOpenReminders}
            onOpenSession={onOpenSession}
          />
          <DailyProgress />
          <WeatherMiniCard />
        </div>
      </div>

      {/* Create Session Modal / Bottom Sheet */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateFromTemplate={onCreateSessionFromTemplate}
      />

      {/* Detailed Reminder Creator Modal */}
      <DetailedReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSaveReminder={handleSaveReminder}
      />
    </div>
  );
};
