import { LifeSession, AccessibilitySettings, AISettings, UserProfile, DEFAULT_USER_PROFILE } from '../types';
import { DEMO_MEDICAL_SESSION } from '../data/initialData';

const KEY_SESSIONS_LIST = 'lovira_sessions';
const KEY_SESSION_PREFIX = 'lovira_session_';
const KEY_SETTINGS = 'lovira_settings';
const KEY_ACCESSIBILITY = 'lovira_accessibility';
const KEY_ACTIVE_SESSION = 'lovira_active_session';
const KEY_USER_PROFILE = 'lovira_user_profile';
const KEY_APP_OPEN_COUNT = 'lovira_app_open_count';
const KEY_BANNER_DISMISSED = 'lovira_profile_banner_dismissed';

export interface BriefSessionHeader {
  id: string;
  title: string;
  status: LifeSession['status'];
  scenarioType: LifeSession['scenarioType'];
  updatedAt: string;
}

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  fontScale: 1.0, // 100%
  highContrast: false,
  theme: 'dark',
  speakResponse: true,
  vslEnabled: false,
  reducedMotion: false,
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'demo',
  apiKey: '',
  selectedModel: 'gemini-3.7-flash',
  demoMode: true,
};

class StorageService {
  /**
   * Initializes storage with demo data if empty and increments app launch counter
   */
  init(): void {
    const list = this.getSessionsList();
    if (list.length === 0) {
      this.saveSession(DEMO_MEDICAL_SESSION);
      this.setActiveSessionId(DEMO_MEDICAL_SESSION.id);
    }
    this.incrementAppOpenCount();
  }

  getSessionsList(): BriefSessionHeader[] {
    try {
      const raw = localStorage.getItem(KEY_SESSIONS_LIST);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  getSession(id: string): LifeSession | null {
    try {
      const raw = localStorage.getItem(`${KEY_SESSION_PREFIX}${id}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  saveSession(session: LifeSession): void {
    try {
      // 1. Save detailed session
      localStorage.setItem(`${KEY_SESSION_PREFIX}${session.id}`, JSON.stringify(session));

      // 2. Update brief sessions list
      const list = this.getSessionsList();
      const existingIdx = list.findIndex(item => item.id === session.id);
      const brief: BriefSessionHeader = {
        id: session.id,
        title: session.title,
        status: session.status,
        scenarioType: session.scenarioType,
        updatedAt: session.updatedAt,
      };

      if (existingIdx >= 0) {
        list[existingIdx] = brief;
      } else {
        list.unshift(brief);
      }

      localStorage.setItem(KEY_SESSIONS_LIST, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save session to localStorage', e);
    }
  }

  deleteSession(id: string): void {
    try {
      localStorage.removeItem(`${KEY_SESSION_PREFIX}${id}`);
      const list = this.getSessionsList().filter(s => s.id !== id);
      localStorage.setItem(KEY_SESSIONS_LIST, JSON.stringify(list));

      if (this.getActiveSessionId() === id) {
        const nextActive = list[0]?.id || null;
        if (nextActive) {
          this.setActiveSessionId(nextActive);
        } else {
          localStorage.removeItem(KEY_ACTIVE_SESSION);
        }
      }
    } catch (e) {
      console.error('Failed to delete session', e);
    }
  }

  getActiveSessionId(): string | null {
    return localStorage.getItem(KEY_ACTIVE_SESSION);
  }

  setActiveSessionId(id: string): void {
    localStorage.setItem(KEY_ACTIVE_SESSION, id);
  }

  getAccessibilitySettings(): AccessibilitySettings {
    try {
      const raw = localStorage.getItem(KEY_ACCESSIBILITY);
      return raw ? { ...DEFAULT_ACCESSIBILITY, ...JSON.parse(raw) } : DEFAULT_ACCESSIBILITY;
    } catch {
      return DEFAULT_ACCESSIBILITY;
    }
  }

  saveAccessibilitySettings(settings: AccessibilitySettings): void {
    try {
      localStorage.setItem(KEY_ACCESSIBILITY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save accessibility settings', e);
    }
  }

  getAISettings(): AISettings {
    try {
      const raw = localStorage.getItem(KEY_SETTINGS);
      return raw ? { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) } : DEFAULT_AI_SETTINGS;
    } catch {
      return DEFAULT_AI_SETTINGS;
    }
  }

  saveAISettings(settings: AISettings): void {
    try {
      localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save AI settings', e);
    }
  }

  // --- USER PROFILE & PERSONALIZATION ---
  getUserProfile(): UserProfile | null {
    try {
      const raw = localStorage.getItem(KEY_USER_PROFILE);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveUserProfile(profile: UserProfile): void {
    try {
      const updated: UserProfile = {
        ...profile,
        updatedAt: new Date().toISOString(),
        createdAt: profile.createdAt || new Date().toISOString(),
      };
      localStorage.setItem(KEY_USER_PROFILE, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save user profile', e);
    }
  }

  clearUserProfile(): void {
    try {
      localStorage.removeItem(KEY_USER_PROFILE);
    } catch (e) {
      console.error('Failed to clear user profile', e);
    }
  }

  getAppOpenCount(): number {
    try {
      const raw = localStorage.getItem(KEY_APP_OPEN_COUNT);
      return raw ? parseInt(raw, 10) : 0;
    } catch {
      return 0;
    }
  }

  incrementAppOpenCount(): number {
    try {
      const current = this.getAppOpenCount();
      const next = current + 1;
      localStorage.setItem(KEY_APP_OPEN_COUNT, next.toString());
      return next;
    } catch {
      return 1;
    }
  }

  isProfileBannerDismissed(): boolean {
    try {
      return localStorage.getItem(KEY_BANNER_DISMISSED) === 'true';
    } catch {
      return false;
    }
  }

  setProfileBannerDismissed(dismissed: boolean): void {
    try {
      localStorage.setItem(KEY_BANNER_DISMISSED, dismissed ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to save banner dismissed state', e);
    }
  }
}

export const storageService = new StorageService();
