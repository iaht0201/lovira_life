import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
} from 'firebase/firestore';

interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const rawConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBSdPMChVvhHU5MlIrdff8D48aJXfVq3fE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'chatbot-425916.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'chatbot-425916',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'chatbot-425916.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1064010494754',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1064010494754:web:2eeb793efdb011dd566b7b',
};

// Check if Firebase configuration is provided
export const isFirebaseConfigured = Boolean(
  rawConfig.apiKey &&
  rawConfig.projectId &&
  rawConfig.apiKey !== 'MY_FIREBASE_API_KEY' &&
  !rawConfig.apiKey.includes('undefined')
);

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    appInstance = getApps().length === 0 ? initializeApp(rawConfig) : getApp();
    authInstance = getAuth(appInstance);
    authInstance.languageCode = 'vi';

    // Set persistent browser auth for PWA
    setPersistence(authInstance, browserLocalPersistence).catch((err) => {
      console.warn('[Firebase] Auth persistence warning:', err);
    });

    // Initialize Firestore without offline persistent cache (Lovira local storage is offline source of truth)
    dbInstance = getFirestore(appInstance);

    // Optional App Check scaffold for production
    const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
    if (import.meta.env.PROD && appCheckSiteKey && typeof window !== 'undefined') {
      import('firebase/app-check')
        .then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
          if (appInstance) {
            initializeAppCheck(appInstance, {
              provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
              isTokenAutoRefreshEnabled: true,
            });
            console.log('[Firebase] App Check initialized');
          }
        })
        .catch((err) => {
          console.warn('[Firebase] App Check initialization skipped:', err);
        });
    }
  } catch (err) {
    console.warn('[Firebase] Initialization warning (app will run in local guest mode):', err);
    appInstance = null;
    authInstance = null;
    dbInstance = null;
  }
} else {
  // Silent fallback for guest-first operation
  if (import.meta.env.DEV) {
    console.info('[Firebase] Config not present or incomplete. Lovira is operating in local Guest Mode.');
  }
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
