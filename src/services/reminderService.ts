import { Reminder, ReminderCategory, ReminderPriority, ReminderRepeat, ReminderStatus, AgendaItem, SnoozePreset } from '../types/reminder.js';
import { BriefSessionHeader, storageService } from './storageService.js';
import { notificationService } from './notificationService.js';

const KEY_REMINDERS = 'lovira_reminders';
const NOTIFIED_CACHE = new Set<string>();

const LEGACY_SEED_REMINDER_IDS = new Set(['rem-1', 'rem-2', 'rem-3', 'rem-4']);
const LEGACY_SEED_REMINDER_TITLES = [
  '💊 uống thuốc huyết áp buổi sáng',
  'uống thuốc huyết áp buổi sáng',
  '💧 uống 1 ly nước ấm & tập thể dục nhẹ',
  'uống 1 ly nước ấm & tập thể dục nhẹ',
  '🏥 tái khám bệnh viện chợ rẫy',
  'tái khám bệnh viện chợ rẫy',
  '👨‍👩‍👧 họp mặt gia đình cuối tuần',
  'họp mặt gia đình cuối tuần',
];

function isLegacySeedReminder(r: Reminder): boolean {
  if (!r) return true;
  if (LEGACY_SEED_REMINDER_IDS.has(r.id)) return true;
  const t = (r.title || '').toLowerCase().trim();
  if (LEGACY_SEED_REMINDER_TITLES.some((seed) => t === seed || t.includes('bệnh viện chợ rẫy') || t.includes('huyết áp buổi sáng'))) {
    return true;
  }
  return false;
}

// Helper to create today/future ISO date
function getRelativeISODate(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

let memoryStorage: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return memoryStorage[key] || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch {}
  memoryStorage[key] = value;
}

export function createInitialReminders(): Reminder[] {
  return [];
}

export const INITIAL_REMINDERS: Reminder[] = [];

class ReminderService {
  private listeners: Array<(reminders: Reminder[]) => void> = [];
  private schedulerInterval: any = null;

  /**
   * Subscribe to reminder changes
   */
  subscribe(listener: (reminders: Reminder[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    const list = this.getReminders();
    this.listeners.forEach((l) => {
      try {
        l(list);
      } catch (err) {
        console.error('Error in reminder listener', err);
      }
    });
  }

  /**
   * Get upcoming uncompleted reminders sorted by scheduled time
   */
  getUpcomingReminders(): Reminder[] {
    const list = this.getReminders();
    return list
      .filter((r) => r.status === 'active')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  /**
   * Get all reminders from storage
   */
  getReminders(): Reminder[] {
    try {
      const raw = safeGetItem(KEY_REMINDERS);
      if (!raw) {
        this.saveReminders(INITIAL_REMINDERS);
        return INITIAL_REMINDERS;
      }
      const list: Reminder[] = JSON.parse(raw);
      if (!Array.isArray(list)) return INITIAL_REMINDERS;

      // Automatically cleanse any leftover legacy demo/seed reminders
      const cleaned = list.filter((r) => !isLegacySeedReminder(r));
      if (cleaned.length !== list.length) {
        this.saveReminders(cleaned);
      }
      return cleaned;
    } catch {
      return INITIAL_REMINDERS;
    }
  }

  /**
   * Save reminders to storage
   */
  saveReminders(list: Reminder[]): void {
    try {
      safeSetItem(KEY_REMINDERS, JSON.stringify(list));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save reminders', e);
    }
  }

  /**
   * Get a single reminder by ID
   */
  getReminder(id: string): Reminder | null {
    const list = this.getReminders();
    return list.find((r) => r.id === id) || null;
  }

  /**
   * Create a new reminder
   */
  createReminder(data: {
    title: string;
    scheduledAt: string;
    notes?: string;
    category?: ReminderCategory;
    repeat?: ReminderRepeat;
    priority?: ReminderPriority;
    sessionId?: string;
    taskId?: string;
  }): Reminder {
    const list = this.getReminders();
    const now = new Date().toISOString();
    const newReminder: Reminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: data.title.trim(),
      notes: data.notes?.trim() || '',
      category: data.category || 'general',
      scheduledAt: data.scheduledAt,
      repeat: data.repeat || 'once',
      priority: data.priority || 'normal',
      status: 'active',
      sessionId: data.sessionId,
      taskId: data.taskId,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newReminder, ...list];
    this.saveReminders(updated);

    // Also register into notification history
    notificationService.addNotification({
      title: `🔔 Đã lên lịch: ${newReminder.title}`,
      message: `${this.formatReminderDateTime(newReminder.scheduledAt)} ${newReminder.notes ? `• ${newReminder.notes}` : ''}`,
      type: newReminder.category === 'medication' ? 'medical' : 'reminder',
      actionTab: 'reminders',
      sessionId: newReminder.sessionId,
      priority: newReminder.priority,
    });

    return newReminder;
  }

  /**
   * Clear notified cache markers for a reminder when updated or rescheduled
   */
  clearNotifiedCache(id: string): void {
    for (const key of Array.from(NOTIFIED_CACHE)) {
      if (key.startsWith(`${id}:`)) {
        NOTIFIED_CACHE.delete(key);
      }
    }
  }

  /**
   * Update an existing reminder
   */
  updateReminder(id: string, updates: Partial<Reminder>): Reminder | null {
    const list = this.getReminders();
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) return null;

    if (updates.scheduledAt) {
      this.clearNotifiedCache(id);
    }

    const updated: Reminder = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    this.saveReminders(list);
    return updated;
  }

  /**
   * Delete a reminder by ID
   */
  deleteReminder(id: string): void {
    const list = this.getReminders();
    const updated = list.filter((r) => r.id !== id);
    this.saveReminders(updated);
  }

  /**
   * Clear all reminders
   */
  clearAllReminders(): void {
    this.saveReminders([]);
  }

  /**
   * Reset reminders to initial dynamic samples
   */
  resetToInitialReminders(): void {
    const initials = createInitialReminders();
    this.saveReminders(initials);
  }

  /**
   * Toggle or complete reminder
   */
  toggleComplete(id: string): Reminder | null {
    const rem = this.getReminder(id);
    if (!rem) return null;

    if (rem.status === 'completed') {
      return this.updateReminder(id, { status: 'active' });
    } else {
      // If recurring (daily, weekly, monthly), advance to next scheduled date
      if (rem.repeat !== 'once') {
        const nextDate = this.calculateNextRecurringDate(rem.scheduledAt, rem.repeat);
        return this.updateReminder(id, {
          scheduledAt: nextDate.toISOString(),
          status: 'active',
        });
      } else {
        return this.updateReminder(id, { status: 'completed' });
      }
    }
  }

  /**
   * Snooze a reminder (e.g. 10m, 30m, 1h, tonight, tomorrow)
   */
  snoozeReminder(id: string, snoozeOption: number | SnoozePreset): Reminder | null {
    const rem = this.getReminder(id);
    if (!rem) return null;

    const now = new Date();
    let newScheduled = new Date(Math.max(now.getTime(), new Date(rem.scheduledAt).getTime()));

    if (typeof snoozeOption === 'number') {
      newScheduled = new Date(now.getTime() + snoozeOption * 60 * 1000);
    } else {
      switch (snoozeOption) {
        case '10m':
          newScheduled = new Date(now.getTime() + 10 * 60 * 1000);
          break;
        case '15m':
          newScheduled = new Date(now.getTime() + 15 * 60 * 1000);
          break;
        case '30m':
          newScheduled = new Date(now.getTime() + 30 * 60 * 1000);
          break;
        case '1h':
          newScheduled = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case 'tonight':
          newScheduled = new Date();
          newScheduled.setHours(20, 0, 0, 0);
          if (newScheduled.getTime() <= now.getTime()) {
            newScheduled.setDate(newScheduled.getDate() + 1);
          }
          break;
        case 'tomorrow':
          newScheduled = new Date();
          newScheduled.setDate(newScheduled.getDate() + 1);
          newScheduled.setHours(8, 0, 0, 0);
          break;
      }
    }

    const updated = this.updateReminder(id, {
      scheduledAt: newScheduled.toISOString(),
      status: 'active',
    });

    // Notify
    notificationService.addNotification({
      title: `⏰ Đã hoãn nhắc nhở: ${rem.title}`,
      message: `Sẽ nhắc lại vào lúc ${this.formatReminderDateTime(newScheduled.toISOString())}`,
      type: 'reminder',
      actionTab: 'reminders',
      sessionId: rem.sessionId,
      priority: rem.priority,
    });

    return updated;
  }

  /**
   * Calculate next date for recurring reminders
   */
  private calculateNextRecurringDate(currentIso: string, repeat: ReminderRepeat): Date {
    const d = new Date(currentIso);
    const now = new Date();
    
    // Ensure base is at least today
    while (d.getTime() <= now.getTime()) {
      if (repeat === 'daily') {
        d.setDate(d.getDate() + 1);
      } else if (repeat === 'weekly') {
        d.setDate(d.getDate() + 7);
      } else if (repeat === 'monthly') {
        d.setMonth(d.getMonth() + 1);
      } else {
        break;
      }
    }
    return d;
  }

  /**
   * Group reminders by timeline category
   */
  getUpcomingGroups(remindersList?: Reminder[]) {
    const list = remindersList || this.getReminders();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
    const dayAfterTomorrowStart = tomorrowStart + 24 * 60 * 60 * 1000;

    const today: Reminder[] = [];
    const tomorrow: Reminder[] = [];
    const upcoming: Reminder[] = [];
    const completed: Reminder[] = [];

    // Sort by scheduledAt ascending
    const sorted = [...list].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

    for (const rem of sorted) {
      if (rem.status === 'completed' || rem.status === 'dismissed') {
        completed.push(rem);
        continue;
      }

      const time = new Date(rem.scheduledAt).getTime();
      if (time < tomorrowStart) {
        today.push(rem);
      } else if (time >= tomorrowStart && time < dayAfterTomorrowStart) {
        tomorrow.push(rem);
      } else {
        upcoming.push(rem);
      }
    }

    return { today, tomorrow, upcoming, completed };
  }

  /**
   * Format ISO date time into user-friendly Vietnamese
   */
  formatReminderDateTime(isoString: string): string {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;

      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow =
        d.getDate() === tomorrow.getDate() &&
        d.getMonth() === tomorrow.getMonth() &&
        d.getFullYear() === tomorrow.getFullYear();

      const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      if (isToday) {
        return `Hôm nay, ${timeStr}`;
      }
      if (isTomorrow) {
        return `Ngày mai, ${timeStr}`;
      }

      // Check if within current week
      const dayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const dayName = dayNames[d.getDay()];
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;

      return `${dayName}, ${dateStr} lúc ${timeStr}`;
    } catch {
      return isoString;
    }
  }

  /**
   * Format repeat label
   */
  getRepeatLabel(repeat: ReminderRepeat): string {
    switch (repeat) {
      case 'daily':
        return '🔄 Hàng ngày';
      case 'weekly':
        return '📅 Hàng tuần';
      case 'monthly':
        return '🗓️ Hàng tháng';
      default:
        return '1️⃣ 1 lần';
    }
  }

  /**
   * Aggregates today's agenda including active reminders, today sessions, and due tasks
   */
  getTodayAgenda(sessionsList?: BriefSessionHeader[]): AgendaItem[] {
    const reminders = this.getReminders();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;

    const agenda: AgendaItem[] = [];

    // 1. Reminders for today
    for (const rem of reminders) {
      const time = new Date(rem.scheduledAt).getTime();
      const isToday = (time >= todayStart && time < tomorrowStart) || (time < todayStart && rem.status === 'active');
      if (isToday) {
        agenda.push({
          id: rem.id,
          itemType: 'reminder',
          title: rem.title,
          subtitle: rem.notes,
          timeDisplay: this.formatReminderDateTime(rem.scheduledAt),
          scheduledAt: rem.scheduledAt,
          category: rem.category,
          priority: rem.priority,
          status: rem.status,
          sessionId: rem.sessionId,
          taskId: rem.taskId,
          reminderId: rem.id,
          notes: rem.notes,
        });
      }
    }

    // 2. Scheduled sessions for today
    const sessions = sessionsList || storageService.getSessionsList();
    for (const s of sessions) {
      if (s.scheduledAt) {
        const time = new Date(s.scheduledAt).getTime();
        if (time >= todayStart && time < tomorrowStart) {
          agenda.push({
            id: `agenda-session-${s.id}`,
            itemType: 'session',
            title: `📋 ${s.title}`,
            subtitle: s.goal,
            timeDisplay: this.formatReminderDateTime(s.scheduledAt),
            scheduledAt: s.scheduledAt,
            category: 'session',
            priority: 'high',
            status: s.status === 'completed' ? 'completed' : 'active',
            sessionId: s.id,
          });
        }
      }
    }

    // Sort agenda by time
    return agenda.sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }

  /**
   * Request browser Notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  /**
   * Play an accessible chime sound via Web Audio API
   */
  playChimeSound(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2: B5 (987.77 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.15);
      gain2.gain.setValueAtTime(0.2, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.8);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  /**
   * Triggers scheduled checks for due reminders
   */
  checkDueReminders(onDue?: (reminder: Reminder) => void): void {
    const list = this.getReminders();
    const now = new Date().getTime();

    for (const rem of list) {
      if (rem.status !== 'active') continue;

      const scheduledTime = new Date(rem.scheduledAt).getTime();
      const diff = now - scheduledTime;

      // Trigger if due in last 2 minutes and not notified yet
      const cacheKey = `${rem.id}:${rem.scheduledAt}`;
      if (diff >= 0 && diff < 120000) {
        if (!NOTIFIED_CACHE.has(cacheKey)) {
          NOTIFIED_CACHE.add(cacheKey);

          this.playChimeSound();

          // Native browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`⏰ ${rem.title}`, {
                body: rem.notes || `Đến giờ hẹn: ${this.formatReminderDateTime(rem.scheduledAt)}`,
                icon: '/brand/logo-icon.png',
                tag: rem.id,
              });
            } catch (e) {
              console.warn('Native notification failed:', e);
            }
          }

          if (onDue) {
            onDue(rem);
          }
        }
      }
    }
  }

  /**
   * Start scheduler background loop
   */
  initScheduler(onDue?: (reminder: Reminder) => void): () => void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }

    // Check every 10 seconds
    this.schedulerInterval = setInterval(() => {
      this.checkDueReminders(onDue);
    }, 10000);

    return () => {
      if (this.schedulerInterval) {
        clearInterval(this.schedulerInterval);
        this.schedulerInterval = null;
      }
    };
  }

  /**
   * Generate standard iCalendar (.ics) content
   */
  generateICS(item: {
    title: string;
    description?: string;
    scheduledAt: string;
    location?: string;
    repeat?: ReminderRepeat;
  }): string {
    const startDate = new Date(item.scheduledAt);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 mins default duration

    const formatICSDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const dtStart = formatICSDate(startDate);
    const dtEnd = formatICSDate(endDate);
    const dtStamp = formatICSDate(new Date());
    const uid = `lovira-${Date.now()}-${Math.random().toString(36).substr(2, 6)}@lovira.app`;

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Lovira AI//Lich Nhac Nho//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
    ];

    if (item.repeat === 'daily') icsLines.push('RRULE:FREQ=DAILY');
    else if (item.repeat === 'weekly') icsLines.push('RRULE:FREQ=WEEKLY');
    else if (item.repeat === 'monthly') icsLines.push('RRULE:FREQ=MONTHLY');

    icsLines.push(
      `SUMMARY:${item.title.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(item.description || 'Lên lịch bởi Lovira Trợ lý Đời sống').replace(/\n/g, '\\n')}`,
      item.location ? `LOCATION:${item.location}` : '',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Nhắc nhở: ${item.title}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    );

    return icsLines.filter(Boolean).join('\r\n');
  }

  /**
   * Download .ics file to user device
   */
  downloadICS(item: {
    title: string;
    description?: string;
    scheduledAt: string;
    location?: string;
    repeat?: ReminderRepeat;
  }): void {
    const icsData = this.generateICS(item);
    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanTitle = item.title.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || 'nhac-nho';
    a.download = `${cleanTitle}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get active reminders scheduled specifically for a given date
   */
  getRemindersForDate(targetDate: Date = new Date()): Reminder[] {
    const list = this.getReminders();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0).getTime();
    const endOfDay = startOfDay + 86400000 - 1;

    return list
      .filter((r) => {
        if (r.status !== 'active') return false;
        const rTime = new Date(r.scheduledAt).getTime();
        if (isNaN(rTime)) return false;

        // Exact day match
        if (rTime >= startOfDay && rTime <= endOfDay) return true;

        // Recurring match
        if (r.repeat === 'daily' && rTime <= endOfDay) return true;

        const rDate = new Date(r.scheduledAt);
        if (r.repeat === 'weekly' && rDate.getDay() === targetDate.getDay() && rTime <= endOfDay) return true;
        if (r.repeat === 'monthly' && rDate.getDate() === targetDate.getDate() && rTime <= endOfDay) return true;

        return false;
      })
      .sort((a, b) => {
        const da = new Date(a.scheduledAt);
        const db = new Date(b.scheduledAt);
        const timeA = da.getHours() * 60 + da.getMinutes();
        const timeB = db.getHours() * 60 + db.getMinutes();
        return timeA - timeB;
      });
  }
}

export const reminderService = new ReminderService();

/**
 * Format ISO datetime into friendly Vietnamese display string
 */
export function formatVietnameseReminderTime(scheduledAt: string, repeat?: ReminderRepeat): string {
  const d = new Date(scheduledAt);
  if (isNaN(d.getTime())) return scheduledAt;

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const timeStr = `${hh}:${mm}`;

  let prefix = '';
  if (isToday) {
    prefix = `Hôm nay, ${timeStr}`;
  } else if (isTomorrow) {
    prefix = `Ngày mai, ${timeStr}`;
  } else {
    const daysOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dow = daysOfWeek[d.getDay()];
    const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    prefix = `${dow}, ${dateFormatted} lúc ${timeStr}`;
  }

  if (repeat === 'daily') {
    prefix += ' (Hàng ngày)';
  } else if (repeat === 'weekly') {
    prefix += ' (Hàng tuần)';
  } else if (repeat === 'monthly') {
    prefix += ' (Hàng tháng)';
  }

  return prefix;
}

/**
 * Group list of reminders into time categories: today, tomorrow, thisWeek, later
 */
export function groupRemindersByPeriod(reminders: Reminder[]): {
  today: Reminder[];
  tomorrow: Reminder[];
  thisWeek: Reminder[];
  later: Reminder[];
} {
  const today: Reminder[] = [];
  const tomorrow: Reminder[] = [];
  const thisWeek: Reminder[] = [];
  const later: Reminder[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000 - 1;
  const endOfTomorrow = endOfToday + 86400000;
  const endOfWeek = startOfToday + 7 * 86400000;

  for (const rem of reminders) {
    const time = new Date(rem.scheduledAt).getTime();
    if (isNaN(time)) {
      later.push(rem);
      continue;
    }

    if (time <= endOfToday) {
      today.push(rem);
    } else if (time <= endOfTomorrow) {
      tomorrow.push(rem);
    } else if (time <= endOfWeek) {
      thisWeek.push(rem);
    } else {
      later.push(rem);
    }
  }

  return { today, tomorrow, thisWeek, later };
}
