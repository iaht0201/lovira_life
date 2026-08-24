export type NotificationType = 'reminder' | 'medical' | 'system' | 'task' | 'warning';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  actionTab?: 'dashboard' | 'session' | 'chat' | 'tasks' | 'reminders' | 'settings' | 'profile';
  sessionId?: string;
  priority?: 'high' | 'normal' | 'low';
}
