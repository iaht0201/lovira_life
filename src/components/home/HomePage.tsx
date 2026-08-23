import React, { useState } from 'react';
import { HomeHero } from './HomeHero';
import { QuickActions } from './QuickActions';
import { RecentSessions } from './RecentSessions';
import { UpcomingReminders } from './UpcomingReminders';
import { DailyProgress } from './DailyProgress';
import { WeatherMiniCard } from './WeatherMiniCard';
import { HomeOfflineBanner } from './HomeOfflineBanner';
import { CreateSessionModal } from './CreateSessionModal';
import { BriefSessionHeader } from '../../services/storageService';
import { ScenarioType } from '../../types';

interface HomePageProps {
  userName?: string;
  sessionsList: BriefSessionHeader[];
  onOpenSession: (id: string) => void;
  onCreateSessionFromTemplate: (type: ScenarioType, customGoal?: string) => Promise<void>;
  onDeleteSession: (id: string) => void;
  onOpenTasks: () => void;
  onOpenReminders: () => void;
  onOpenChat: () => void;
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
  isOffline = false,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const activeSessionsCount = sessionsList.filter(s => s.status === 'active' || s.status === 'in_progress').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Offline Banner if disconnected */}
      <HomeOfflineBanner isOffline={isOffline} />

      {/* 8. Hero Section */}
      <HomeHero userName={userName} />

      {/* 10. Quick Action Cards */}
      <QuickActions
        onCreateSession={() => setIsCreateModalOpen(true)}
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
          <UpcomingReminders onAddReminder={onOpenReminders} />
          <DailyProgress completedTasks={3} totalTasks={7} />
          <WeatherMiniCard location="Hà Nội" temp="28°C" condition="Trời nắng nhẹ ☀️" />
        </div>
      </div>

      {/* Create Session Modal / Bottom Sheet */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateFromTemplate={onCreateSessionFromTemplate}
      />
    </div>
  );
};
