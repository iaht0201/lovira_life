import { firestoreService } from './firestoreService.js';
import { storageService } from '../storageService.js';
import { CloudSyncSettings, CloudSyncStatus } from './firebaseTypes.js';
import { LifeSession, UserProfile } from '../../types.js';

const KEY_CLOUD_SYNC_SETTINGS_PREFIX = 'lovira_cloud_sync_settings';

const DEFAULT_SYNC_SETTINGS: CloudSyncSettings = {
  syncSessions: false,
  syncProfile: false,
};

type SyncStatusListener = (status: CloudSyncStatus, lastSyncAt?: string) => void;

class CloudSyncService {
  private syncStatus: CloudSyncStatus = 'idle';
  private lastSyncAt: string | undefined = undefined;
  private listeners: Set<SyncStatusListener> = new Set();
  private debounceTimers: Map<string, any> = new Map();
  private currentUid: string | null = null;

  constructor() {
    const saved = this.getSyncSettings();
    this.lastSyncAt = saved.lastSyncAt;
    if (!saved.syncSessions && !saved.syncProfile) {
      this.syncStatus = 'disabled';
    }
  }

  private getStorageKey(uid?: string | null): string {
    const effectiveUid = uid || this.currentUid;
    return effectiveUid ? `${KEY_CLOUD_SYNC_SETTINGS_PREFIX}_${effectiveUid}` : KEY_CLOUD_SYNC_SETTINGS_PREFIX;
  }

  setCurrentUid(uid: string | null): void {
    this.currentUid = uid;
    const settings = this.getSyncSettings(uid || undefined);
    this.lastSyncAt = settings.lastSyncAt;
    if (!settings.syncSessions && !settings.syncProfile) {
      this.setStatus('disabled');
    } else {
      this.setStatus('idle');
    }
  }

  getSyncSettings(uid?: string): CloudSyncSettings {
    try {
      const key = this.getStorageKey(uid);
      const raw = localStorage.getItem(key);
      if (!raw) return DEFAULT_SYNC_SETTINGS;
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SYNC_SETTINGS;
    }
  }

  saveSyncSettings(settings: CloudSyncSettings, uid?: string): void {
    try {
      const key = this.getStorageKey(uid);
      localStorage.setItem(key, JSON.stringify(settings));
      this.lastSyncAt = settings.lastSyncAt;
      if (!settings.syncSessions && !settings.syncProfile) {
        this.setStatus('disabled');
      } else {
        this.setStatus('idle');
      }
    } catch (e) {
      console.error('Failed to save sync settings', e);
    }
  }

  subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.syncStatus, this.lastSyncAt);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: CloudSyncStatus): void {
    this.syncStatus = status;
    this.listeners.forEach((l) => l(this.syncStatus, this.lastSyncAt));
  }

  getSyncState(): { status: CloudSyncStatus; lastSyncAt?: string } {
    return {
      status: this.syncStatus,
      lastSyncAt: this.lastSyncAt,
    };
  }

  /**
   * Performs full merge between local sessions and cloud sessions
   */
  async performInitialMerge(uid: string): Promise<{ mergedCount: number }> {
    if (!uid) return { mergedCount: 0 };
    this.setStatus('syncing');

    try {
      // 1. Get cloud sessions
      const cloudSessions = await firestoreService.getCloudSessions(uid);
      const cloudMap = new Map<string, any>();
      cloudSessions.forEach((cs) => cloudMap.set(cs.id, cs));

      // 2. Get local sessions
      const localHeaders = storageService.getSessionsList();
      const localMap = new Map<string, LifeSession>();
      localHeaders.forEach((h) => {
        const full = storageService.getSession(h.id);
        if (full) localMap.set(full.id, full);
      });

      // 3. Merge by ID
      const allSessionIds = new Set([...Array.from(cloudMap.keys()), ...Array.from(localMap.keys())]);
      let count = 0;

      for (const sessionId of Array.from(allSessionIds)) {
        const local = localMap.get(sessionId);
        const cloud = cloudMap.get(sessionId);

        if (local && cloud) {
          // Compare timestamps (last-write-wins by updatedAt)
          const localTime = new Date(local.updatedAt || 0).getTime();
          const cloudTime = new Date(cloud.updatedAt || 0).getTime();

          if (cloudTime > localTime) {
            // Cloud is newer -> save to local
            storageService.saveSession(cloud);
          } else {
            // Local is newer or equal -> upload to cloud
            await firestoreService.upsertCloudSession(uid, local);
          }
        } else if (local && !cloud) {
          // Only local -> upload to cloud
          await firestoreService.upsertCloudSession(uid, local);
        } else if (!local && cloud) {
          // Only cloud -> save to local
          storageService.saveSession(cloud);
        }
        count++;
      }

      const now = new Date().toISOString();
      this.lastSyncAt = now;
      const settings = this.getSyncSettings();
      this.saveSyncSettings({ ...settings, lastSyncAt: now });

      await firestoreService.setCloudSyncSettings(uid, {
        ...settings,
        lastSyncAt: now,
      });

      this.setStatus('synced');
      return { mergedCount: count };
    } catch (err) {
      console.warn('[CloudSync] Merge failed:', err);
      this.setStatus('error');
      throw err;
    }
  }

  async syncSessions(uid: string): Promise<void> {
    const settings = this.getSyncSettings();
    if (!settings.syncSessions || !uid) return;
    await this.performInitialMerge(uid);
  }

  /**
   * Debounced single-session sync when a session is updated locally
   */
  queueSessionUpload(uid: string, session: LifeSession): void {
    const settings = this.getSyncSettings();
    if (!settings.syncSessions || !uid || !session?.id) return;

    if (this.debounceTimers.has(session.id)) {
      clearTimeout(this.debounceTimers.get(session.id));
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(session.id);
      try {
        await firestoreService.upsertCloudSession(uid, session);
        const now = new Date().toISOString();
        this.lastSyncAt = now;
        this.setStatus('synced');
      } catch (err) {
        console.warn('[CloudSync] Debounced session upload warning:', err);
      }
    }, 1200);

    this.debounceTimers.set(session.id, timer);
  }

  async deleteSession(uid: string, sessionId: string): Promise<void> {
    if (!uid || !sessionId) return;
    if (this.debounceTimers.has(sessionId)) {
      clearTimeout(this.debounceTimers.get(sessionId));
      this.debounceTimers.delete(sessionId);
    }
    try {
      await firestoreService.deleteCloudSession(uid, sessionId, true);
    } catch (err) {
      console.warn('[CloudSync] Delete session on cloud warning:', err);
    }
  }

  async syncProfile(uid: string, profile: UserProfile | null): Promise<void> {
    const settings = this.getSyncSettings(uid);
    if (!settings.syncProfile || !uid || !profile) return;

    try {
      await firestoreService.setCloudProfile(
        uid,
        profile,
        Boolean(profile.syncHealthToCloud)
      );
    } catch (err) {
      console.warn('[CloudSync] Profile sync warning:', err);
    }
  }

  resetSyncState(): void {
    this.syncStatus = 'disabled';
    this.lastSyncAt = undefined;
    this.debounceTimers.forEach((t) => clearTimeout(t));
    this.debounceTimers.clear();
    this.saveSyncSettings(DEFAULT_SYNC_SETTINGS, this.currentUid || undefined);
    this.currentUid = null;
  }
}

export const cloudSyncService = new CloudSyncService();
