import { LifeSession, AccessibilitySettings, AISettings, UserProfile, ScenarioFamily } from '../types';
import { DEMO_MEDICAL_SESSION } from '../data/initialData';
import { calculateNextRecommendedAction, resolveCurrentStep } from './actionEngine';

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
  goal?: string;
  status: LifeSession['status'];
  scenarioType: LifeSession['scenarioType'];
  scenarioFamily?: ScenarioFamily;
  subtype?: string;
  scheduledAt?: string;
  deadlineAt?: string;
  pinned?: boolean;
  updatedAt: string;
}

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  fontScale: 1.0, // 100%
  highContrast: false,
  theme: 'light',
  speakResponse: true,
  vslEnabled: false,
  reducedMotion: false,
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'groq',
  apiKey: '',
  selectedModel: 'openai/gpt-oss-20b',
  demoMode: false,
};

/**
 * Migration helper to ensure loaded sessions are backwards-compatible and well-formed
 */
export function migrateSession(raw: any): LifeSession {
  if (!raw || typeof raw !== 'object') return DEMO_MEDICAL_SESSION;

  let family: ScenarioFamily = raw.scenarioFamily || 'custom';
  if (!raw.scenarioFamily) {
    if (raw.scenarioType === 'medical') family = 'healthcare';
    else if (raw.scenarioType === 'administrative') family = 'administrative';
    else if (raw.scenarioType === 'shopping') family = 'shopping';
    else if (raw.scenarioType === 'document') family = 'documents';
  }

  const tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  const importantFacts = Array.isArray(raw.importantFacts) ? raw.importantFacts : [];
  const resources = Array.isArray(raw.resources) ? raw.resources : [];
  const messages = Array.isArray(raw.messages) ? raw.messages : [];
  const actionLog = Array.isArray(raw.actionLog) ? raw.actionLog : [];

  const session: LifeSession = {
    ...raw,
    scenarioFamily: family,
    tasks,
    importantFacts,
    resources,
    messages,
    actionLog,
  };

  if (!session.nextRecommendedAction) {
    session.nextRecommendedAction = calculateNextRecommendedAction(session);
  }

  if (!session.currentStepId) {
    const resolved = resolveCurrentStep(session);
    session.currentStepId = resolved?.subtask?.id || resolved?.task?.id || tasks[0]?.id || 'task-1';
  }

  return session;
}

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
      if (!raw) return [];
      const list: BriefSessionHeader[] = JSON.parse(raw);
      if (!Array.isArray(list)) return [];

      // Sort: pinned first, then updatedAt descending
      return list.sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) {
          return a.pinned ? -1 : 1;
        }
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });
    } catch {
      return [];
    }
  }

  getSession(id: string): LifeSession | null {
    try {
      const raw = localStorage.getItem(`${KEY_SESSION_PREFIX}${id}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return migrateSession(parsed);
    } catch {
      return null;
    }
  }

  saveSession(session: LifeSession): void {
    try {
      const migrated = migrateSession(session);

      // 1. Save detailed session
      localStorage.setItem(`${KEY_SESSION_PREFIX}${migrated.id}`, JSON.stringify(migrated));

      // 2. Update brief sessions list
      const list = this.getSessionsList();
      const existingIdx = list.findIndex((item) => item.id === migrated.id);
      const brief: BriefSessionHeader = {
        id: migrated.id,
        title: migrated.title,
        goal: migrated.goal,
        status: migrated.status,
        scenarioType: migrated.scenarioType,
        scenarioFamily: migrated.scenarioFamily,
        subtype: migrated.subtype,
        scheduledAt: migrated.scheduledAt,
        deadlineAt: migrated.deadlineAt,
        pinned: migrated.pinned,
        updatedAt: migrated.updatedAt,
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
      const list = this.getSessionsList().filter((s) => s.id !== id);
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

  clearActiveSessionId(): void {
    localStorage.removeItem(KEY_ACTIVE_SESSION);
  }

  getAccessibilitySettings(): AccessibilitySettings {
    try {
      const raw = localStorage.getItem(KEY_ACCESSIBILITY);
      if (!raw) return DEFAULT_ACCESSIBILITY;
      const parsed = JSON.parse(raw);
      const theme: 'light' | 'dark' = parsed.theme === 'dark' ? 'dark' : 'light';
      return {
        ...DEFAULT_ACCESSIBILITY,
        ...parsed,
        theme,
      };
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
      if (!raw) return DEFAULT_AI_SETTINGS;
      const parsed = JSON.parse(raw);
      
      // Auto-migrate legacy demo mode or unconfigured settings to Groq openai/gpt-oss-20b
      if (parsed.provider === 'demo' || parsed.demoMode === true || !parsed.selectedModel) {
        const migrated: AISettings = {
          ...DEFAULT_AI_SETTINGS,
          ...parsed,
          provider: 'groq',
          selectedModel: parsed.selectedModel || 'openai/gpt-oss-20b',
          demoMode: false,
        };
        localStorage.setItem(KEY_SETTINGS, JSON.stringify(migrated));
        return migrated;
      }

      return { ...DEFAULT_AI_SETTINGS, ...parsed };
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
