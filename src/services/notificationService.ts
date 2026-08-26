import { AppNotification, NotificationType } from '../types.js';

const KEY_NOTIFICATIONS = 'lovira_notifications';

export function createInitialNotifications(userName?: string): AppNotification[] {
  return [];
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

class NotificationService {
  /**
   * Retrieves list of all notifications from localStorage
   */
  getNotifications(): AppNotification[] {
    try {
      const raw = localStorage.getItem(KEY_NOTIFICATIONS);
      if (!raw) {
        this.saveNotifications(INITIAL_NOTIFICATIONS);
        return INITIAL_NOTIFICATIONS;
      }
      return JSON.parse(raw);
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  }

  /**
   * Saves notification list to localStorage
   */
  saveNotifications(list: AppNotification[]): void {
    try {
      localStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify(list));
    } catch {
      // Ignore quota errors
    }
  }

  /**
   * Adds a new notification to the top of the list
   */
  addNotification(
    data: Omit<AppNotification, 'id' | 'timestamp' | 'read'> & { timestamp?: string }
  ): AppNotification {
    const list = this.getNotifications();
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: data.title,
      message: data.message,
      type: data.type || 'system',
      timestamp: data.timestamp || 'Vừa xong',
      read: false,
      actionTab: data.actionTab || 'dashboard',
      sessionId: data.sessionId,
      priority: data.priority || 'normal',
    };

    const updated = [newNotif, ...list];
    this.saveNotifications(updated);
    return newNotif;
  }

  /**
   * Marks a single notification as read
   */
  markAsRead(id: string): AppNotification[] {
    const list = this.getNotifications();
    const updated = list.map((item) => (item.id === id ? { ...item, read: true } : item));
    this.saveNotifications(updated);
    return updated;
  }

  /**
   * Marks all notifications as read
   */
  markAllAsRead(): AppNotification[] {
    const list = this.getNotifications();
    const updated = list.map((item) => ({ ...item, read: true }));
    this.saveNotifications(updated);
    return updated;
  }

  /**
   * Deletes a single notification by ID
   */
  deleteNotification(id: string): AppNotification[] {
    const list = this.getNotifications();
    const updated = list.filter((item) => item.id !== id);
    this.saveNotifications(updated);
    return updated;
  }

  /**
   * Clears all notifications
   */
  clearAll(): AppNotification[] {
    this.saveNotifications([]);
    return [];
  }

  /**
   * Resets notifications to default samples
   */
  resetToDefaults(): AppNotification[] {
    this.saveNotifications(INITIAL_NOTIFICATIONS);
    return INITIAL_NOTIFICATIONS;
  }

  /**
   * Returns count of unread notifications
   */
  getUnreadCount(): number {
    const list = this.getNotifications();
    return list.filter((item) => !item.read).length;
  }
}

export const notificationService = new NotificationService();
