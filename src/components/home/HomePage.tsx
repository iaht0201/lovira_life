import React, { useState } from 'react';
import { HomeHero } from './HomeHero';
import { QuickActions } from './QuickActions';
import { RecentSessions } from './RecentSessions';
import { UpcomingReminders } from './UpcomingReminders';
import { LoviraSuggestionsCard } from './LoviraSuggestionsCard';
import { DailyProgress } from './DailyProgress';
import { WeatherMiniCard } from './WeatherMiniCard';
import { HomeOfflineBanner } from './HomeOfflineBanner';
import { CreateSessionModal } from './CreateSessionModal';
import { DetailedReminderModal } from '../reminders/DetailedReminderModal';
import { BriefSessionHeader } from '../../services/storageService';
import { ScenarioType } from '../../types';
import { ReminderData } from './ReminderItem';
import { notificationService } from '../../services/notificationService';

interface HomePageProps {
  userName?: string;
  sessionsList: BriefSessionHeader[];
  onOpenSession: (id: string) => void;
  onCreateSessionFromTemplate: (type: ScenarioType, customGoal?: string) => Promise<void>;
  onDeleteSession: (id: string) => void;
  onOpenTasks: () => void;
  onOpenReminders: () => void;
  onOpenChat: () => void;
  onOpenCamera?: () => void;
  isOffline?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  userName = 'Chú Ba',
  sessionsList,
  onOpenSession,
  onCreateSessionFromTemplate,
  onDeleteSession,
  onOpenTasks,
  onOpenReminders,
  onOpenChat,
  onOpenCamera,
  isOffline = false,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminders, setReminders] = useState<ReminderData[]>([
    {
      id: 'rem-1',
      title: '💊 Uống thuốc huyết áp',
      time: 'Hôm nay, 07:00 (Hàng ngày)',
      category: 'medication',
    },
    {
      id: 'rem-2',
      title: '📅 Tái khám định kỳ tại BV Chợ Rẫy',
      time: 'Thứ 6, 8:30 Sáng',
      category: 'appointment',
    },
    {
      id: 'rem-3',
      title: '👨‍👩‍👧 Họp mặt gia đình cuối tuần',
      time: 'Chủ nhật, 17:00',
      category: 'family',
    },
  ]);

  const handleOpenRemindersModal = () => {
    setIsReminderModalOpen(true);
  };

  const handleSaveReminder = (newRem: ReminderData & { notes?: string; priority?: 'normal' | 'high' }) => {
    setReminders((prev) => [newRem, ...prev]);

    // Also add to global notifications service
    notificationService.addNotification({
      title: newRem.title,
      message: newRem.notes || `Nhắc nhở hẹn lúc: ${newRem.time}`,
      type: newRem.category === 'medication' ? 'medical' : 'reminder',
      actionTab: 'reminders',
      priority: newRem.priority || 'normal',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Offline Banner if disconnected */}
      <HomeOfflineBanner isOffline={isOffline} />

      {/* 8. Hero Section */}
      <HomeHero userName={userName} />

      {/* 10. Quick Action Cards */}
      <QuickActions
        onCreateSession={() => setIsCreateModalOpen(true)}
        onOpenCamera={onOpenCamera}
        onOpenTasks={onOpenTasks}
        onOpenReminders={handleOpenRemindersModal}
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
            reminders={reminders}
            onAddReminder={handleOpenRemindersModal}
          />
          <LoviraSuggestionsCard />
          <DailyProgress completedTasks={3} totalTasks={7} />
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
