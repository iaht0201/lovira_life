export type ReminderCategory = 'medication' | 'appointment' | 'family' | 'general';
export type ReminderRepeat = 'once' | 'daily' | 'weekly' | 'monthly';
export type ReminderPriority = 'normal' | 'high';
export type ReminderStatus = 'active' | 'completed' | 'dismissed';

export interface Reminder {
  id: string;
  title: string;
  notes?: string;
  category: ReminderCategory;
  scheduledAt: string; // ISO 8601 string, e.g. "2026-08-25T08:00:00+07:00"
  repeat: ReminderRepeat;
  priority: ReminderPriority;
  status: ReminderStatus;
  sessionId?: string;
  taskId?: string;
  createdAt: string;
  updatedAt: string;
}

export type SnoozePreset = '10m' | '30m' | '1h' | 'tonight' | 'tomorrow';

export interface AgendaItem {
  id: string;
  itemType: 'reminder' | 'session' | 'task';
  title: string;
  subtitle?: string;
  timeDisplay: string;
  scheduledAt: string;
  category: ReminderCategory | 'session' | 'task';
  priority: ReminderPriority;
  status: 'active' | 'completed' | 'dismissed';
  sessionId?: string;
  taskId?: string;
  reminderId?: string;
  notes?: string;
}
