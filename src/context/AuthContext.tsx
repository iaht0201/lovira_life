import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  LoviraAuthStatus,
  LoviraAuthUser,
  CloudSyncSettings,
  CloudSyncStatus,
} from '../services/firebase/firebaseTypes';
import { authService } from '../services/firebase/authService';
import { firestoreService } from '../services/firebase/firestoreService';
import { cloudSyncService } from '../services/firebase/cloudSyncService';
import { isFirebaseConfigured } from '../services/firebase/firebaseClient';

interface AuthContextValue {
  status: LoviraAuthStatus;
  user: LoviraAuthUser | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  isFirebaseAvailable: boolean;

  syncSettings: CloudSyncSettings;
  syncStatus: CloudSyncStatus;
  lastSyncAt?: string;

  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (displayName: string, email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  updateSyncSettings: (settings: Partial<CloudSyncSettings>) => Promise<void>;
  triggerManualSync: () => Promise<{ mergedCount: number }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<LoviraAuthStatus>('initializing');
  const [user, setUser] = useState<LoviraAuthUser | null>(null);
  const [syncSettings, setSyncSettings] = useState<CloudSyncSettings>(() =>
    cloudSyncService.getSyncSettings()
  );
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('disabled');
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>(
    syncSettings.lastSyncAt
  );

  // Sync service status subscription
  useEffect(() => {
    const unsub = cloudSyncService.subscribe((newStatus, syncTime) => {
      setSyncStatus(newStatus);
      if (syncTime) setLastSyncAt(syncTime);
    });
    return unsub;
  }, []);

  // Single authoritative auth state listener
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setStatus('guest');
      setUser(null);
      return;
    }

    const unsub = authService.subscribeToAuthState((authUser) => {
      if (authUser) {
        setUser(authUser);
        setStatus('authenticated');
        // Ensure firestore user doc exists in the background
        firestoreService.ensureUserDocument(authUser).catch((e) => {
          console.warn('[Firebase] Ensure user document warning:', e);
        });
      } else {
        setUser(null);
        setStatus('guest');
      }
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const authUser = await authService.signInGoogle();
    setUser(authUser);
    setStatus('authenticated');
    await firestoreService.ensureUserDocument(authUser).catch(console.warn);
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    const authUser = await authService.signInEmail(email, pass);
    setUser(authUser);
    setStatus('authenticated');
    await firestoreService.ensureUserDocument(authUser).catch(console.warn);
  }, []);

  const registerWithEmail = useCallback(
    async (displayName: string, email: string, pass: string) => {
      const authUser = await authService.registerEmail({
        displayName,
        email,
        password: pass,
      });
      setUser(authUser);
      setStatus('authenticated');
      await firestoreService.ensureUserDocument(authUser).catch(console.warn);
    },
    []
  );

  const resetPassword = useCallback(async (email: string) => {
    await authService.sendReset(email);
  }, []);

  const resendVerification = useCallback(async () => {
    await authService.sendVerification();
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setStatus('guest');
  }, []);

  const refreshUser = useCallback(async () => {
    const updated = await authService.refreshCurrentUser();
    setUser(updated);
  }, []);

  const updateSyncSettings = useCallback(
    async (patch: Partial<CloudSyncSettings>) => {
      const updated = { ...syncSettings, ...patch };
      setSyncSettings(updated);
      cloudSyncService.saveSyncSettings(updated);

      if (user?.uid) {
        await firestoreService
          .setCloudSyncSettings(user.uid, updated)
          .catch(console.warn);

        // If session sync was just enabled, perform initial merge
        if (patch.syncSessions && !syncSettings.syncSessions) {
          await cloudSyncService.performInitialMerge(user.uid);
        }
      }
    },
    [syncSettings, user?.uid]
  );

  const triggerManualSync = useCallback(async () => {
    if (!user?.uid) {
      throw new Error('Cần đăng nhập tài khoản để đồng bộ dữ liệu.');
    }
    return await cloudSyncService.performInitialMerge(user.uid);
  }, [user?.uid]);

  const value: AuthContextValue = {
    status,
    user,
    isGuest: status === 'guest' || !user,
    isAuthenticated: status === 'authenticated' && !!user,
    isFirebaseAvailable: isFirebaseConfigured,
    syncSettings,
    syncStatus,
    lastSyncAt,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resetPassword,
    resendVerification,
    logout,
    refreshUser,
    updateSyncSettings,
    triggerManualSync,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
