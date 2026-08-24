import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, auth } from './firebaseClient';
import {
  LoviraAuthUser,
  CloudSyncSettings,
  CloudLifeSession,
  CloudUserProfile,
  FirestoreOperationType,
  FirestoreErrorInfo,
} from './firebaseTypes';
import { LifeSession, UserProfile } from '../../types';

function handleFirestoreError(
  error: unknown,
  operationType: FirestoreOperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(errInfo.error);
}

/**
 * Removes undefined fields to prevent Firestore serialization errors
 */
function sanitizeData<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? null : v)));
}

class FirestoreService {
  private ensureDbReady(): void {
    if (!isFirebaseConfigured || !db) {
      throw new Error('Cơ sở dữ liệu đám mây chưa sẵn sàng. Dữ liệu đang được lưu an toàn trên máy của bạn.');
    }
  }

  async ensureUserDocument(authUser: LoviraAuthUser): Promise<void> {
    this.ensureDbReady();
    const docPath = `users/${authUser.uid}`;
    try {
      const userRef = doc(db!, 'users', authUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(
          userRef,
          sanitizeData({
            uid: authUser.uid,
            displayName: authUser.displayName,
            email: authUser.email,
            photoURL: authUser.photoURL,
            providers: authUser.providerIds,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            schemaVersion: 1,
            sync: {
              sessions: false,
              profile: false,
            },
          }),
          { merge: true }
        );
      } else {
        await setDoc(
          userRef,
          {
            displayName: authUser.displayName,
            email: authUser.email,
            photoURL: authUser.photoURL,
            providers: authUser.providerIds,
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      handleFirestoreError(err, FirestoreOperationType.WRITE, docPath);
    }
  }

  async getCloudSessions(uid: string): Promise<CloudLifeSession[]> {
    this.ensureDbReady();
    const colPath = `users/${uid}/sessions`;
    try {
      const colRef = collection(db!, 'users', uid, 'sessions');
      const snap = await getDocs(colRef);
      const sessions: CloudLifeSession[] = [];
      snap.forEach((d) => {
        const data = d.data() as CloudLifeSession;
        if (!data.deletedAt) {
          sessions.push(data);
        }
      });
      return sessions;
    } catch (err) {
      handleFirestoreError(err, FirestoreOperationType.LIST, colPath);
    }
  }

  async getCloudSession(uid: string, sessionId: string): Promise<CloudLifeSession | null> {
    this.ensureDbReady();
    const docPath = `users/${uid}/sessions/${sessionId}`;
    try {
      const docRef = doc(db!, 'users', uid, 'sessions', sessionId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      const data = snap.data() as CloudLifeSession;
      return data.deletedAt ? null : data;
    } catch (err) {
      handleFirestoreError(err, FirestoreOperationType.GET, docPath);
    }
  }

  async upsertCloudSession(uid: string, session: LifeSession): Promise<void> {
    this.ensureDbReady();
    const docPath = `users/${uid}/sessions/${session.id}`;
    try {
      const docRef = doc(db!, 'users', uid, 'sessions', session.id);
      const cloudPayload: CloudLifeSession = {
        id: session.id,
        ownerId: uid,
        title: session.title || 'Phiên làm việc',
        goal: session.goal || '',
        scenarioType: session.scenarioType || 'custom',
        scenarioFamily: session.scenarioFamily,
        subtype: session.subtype,
        status: session.status || 'active',
        tasks: session.tasks || [],
        importantFacts: session.importantFacts || [],
        messages: session.messages || [],
        actionLog: session.actionLog || [],
        currentStepId: session.currentStepId,
        nextRecommendedAction: session.nextRecommendedAction,
        createdAt: session.createdAt || new Date().toISOString(),
        updatedAt: session.updatedAt || new Date().toISOString(),
        schemaVersion: 1,
      };

      await setDoc(docRef, sanitizeData(cloudPayload), { merge: true });
    } catch (err) {
      handleFirestoreError(err, FirestoreOperationType.WRITE, docPath);
    }
  }

  async deleteCloudSession(uid: string, sessionId: string, softDelete = true): Promise<void> {
    this.ensureDbReady();
    const docPath = `users/${uid}/sessions/${sessionId}`;
    try {
      const docRef = doc(db!, 'users', uid, 'sessions', sessionId);
      if (softDelete) {
        await setDoc(
          docRef,
          {
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } else {
        await deleteDoc(docRef);
      }
    } catch (err) {
      handleFirestoreError(err, FirestoreOperationType.DELETE, docPath);
    }
  }

  async getCloudProfile(uid: string): Promise<CloudUserProfile | null> {
    this.ensureDbReady();
    const docPath = `users/${uid}/profile/main`;
    try {
      const docRef = doc(db!, 'users', uid, 'profile', 'main');
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return snap.data() as CloudUserProfile;
    } catch (err) {
      handleFirestoreError(err, FirestoreOperationType.GET, docPath);
    }
  }

  async setCloudProfile(
    uid: string,
    profile: UserProfile,
    syncHealthApproved: boolean
  ): Promise<void> {
    this.ensureDbReady();
    const docPath = `users/${uid}/profile/main`;
    try {
      const docRef = doc(db!, 'users', uid, 'profile', 'main');
      
      // Basic non-sensitive identity fields
      const cloudProfile: CloudUserProfile = {
        preferredName: profile.preferredName,
        pronounStyle: profile.pronounStyle,
        customPronoun: profile.customPronoun,
        communicationPace: profile.communicationPace,
        updatedAt: profile.updatedAt || new Date().toISOString(),
        schemaVersion: 1,
      };

      // Sensitive health/accessibility/caregiver fields are ONLY included if explicitly approved
      if (syncHealthApproved && profile.syncHealthToCloud === true) {
        cloudProfile.accessibilityContext = profile.accessibilityContext;
        cloudProfile.livesAlone = profile.livesAlone;
        cloudProfile.hasCaregiverContact = profile.hasCaregiverContact;
        cloudProfile.caregiverName = profile.caregiverName;
        cloudProfile.caregiverPhone = profile.caregiverPhone;
        cloudProfile.selfReportedConditions = profile.selfReportedConditions;
        cloudProfile.syncHealthToCloud = true;
      }

      await setDoc(docRef, sanitizeData(cloudProfile), { merge: true });
    } catch (err) {
      handleFirestoreError(err, FirestoreOperationType.WRITE, docPath);
    }
  }

  async getCloudSyncSettings(uid: string): Promise<CloudSyncSettings | null> {
    this.ensureDbReady();
    const docPath = `users/${uid}/sync/metadata`;
    try {
      const docRef = doc(db!, 'users', uid, 'sync', 'metadata');
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return snap.data() as CloudSyncSettings;
    } catch (err) {
      handleFirestoreError(err, FirestoreOperationType.GET, docPath);
    }
  }

  async setCloudSyncSettings(uid: string, settings: CloudSyncSettings): Promise<void> {
    this.ensureDbReady();
    const docPath = `users/${uid}/sync/metadata`;
    try {
      const docRef = doc(db!, 'users', uid, 'sync', 'metadata');
      await setDoc(docRef, sanitizeData(settings), { merge: true });
    } catch (err) {
      handleFirestoreError(err, FirestoreOperationType.WRITE, docPath);
    }
  }
}

export const firestoreService = new FirestoreService();
