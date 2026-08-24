import {
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  onAuthStateChanged,
  reload,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebaseClient';
import { LoviraAuthUser } from './firebaseTypes';
import { mapFirebaseAuthError } from './firebaseErrors';

export function toLoviraAuthUser(user: FirebaseUser | null): LoviraAuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    providerIds: user.providerData.map((p) => p.providerId),
    emailVerified: user.emailVerified,
    createdAt: user.metadata.creationTime,
    lastLoginAt: user.metadata.lastSignInTime,
  };
}

class AuthService {
  private ensureAuthReady(): void {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Tính năng tài khoản chưa được cấu hình. Bạn vẫn có thể sử dụng Lovira trên thiết bị này.');
    }
  }

  async signInGoogle(): Promise<LoviraAuthUser> {
    this.ensureAuthReady();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth!, provider);
      const user = toLoviraAuthUser(cred.user);
      if (!user) throw new Error('Không nhận được thông tin tài khoản Google.');
      return user;
    } catch (err: any) {
      console.warn('[Firebase Auth Google error]', err);
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.name === 'SecurityError' ||
        String(err).includes('SecurityError') ||
        String(err).includes('cross-origin')
      ) {
        throw new Error(
          'Cửa sổ đăng nhập Google bị chặn trong khung xem trước (iFrame). Vui lòng mở ứng dụng trong Tab mới của trình duyệt hoặc sử dụng Đăng ký/Đăng nhập bằng Email.'
        );
      }
      const msg = mapFirebaseAuthError(err);
      throw new Error(msg);
    }
  }

  async signInEmail(email: string, pass: string): Promise<LoviraAuthUser> {
    this.ensureAuthReady();
    const cleanEmail = email.trim();
    if (!cleanEmail || !pass) {
      throw new Error('Vui lòng nhập đầy đủ Email và Mật khẩu.');
    }
    try {
      const cred = await signInWithEmailAndPassword(auth!, cleanEmail, pass);
      const user = toLoviraAuthUser(cred.user);
      if (!user) throw new Error('Không nhận được thông tin tài khoản.');
      return user;
    } catch (err: any) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }

  async registerEmail(data: {
    displayName: string;
    email: string;
    password: string;
  }): Promise<LoviraAuthUser> {
    this.ensureAuthReady();
    const cleanName = data.displayName.trim();
    const cleanEmail = data.email.trim();
    const pass = data.password;

    if (!cleanEmail || !pass) {
      throw new Error('Vui lòng nhập email và mật khẩu.');
    }
    if (pass.length < 6) {
      throw new Error('Mật khẩu cần có tối thiểu 6 ký tự để đảm bảo an toàn.');
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth!, cleanEmail, pass);
      
      // Update display name if provided
      if (cleanName && cred.user) {
        await updateProfile(cred.user, { displayName: cleanName });
      }

      // Send verification email
      if (cred.user) {
        try {
          await sendEmailVerification(cred.user);
        } catch (e) {
          console.warn('[Firebase] Email verification dispatch warning:', e);
        }
      }

      const user = toLoviraAuthUser(cred.user);
      if (!user) throw new Error('Tài khoản đã tạo nhưng chưa tải được thông tin.');
      return user;
    } catch (err: any) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }

  async sendReset(email: string): Promise<void> {
    this.ensureAuthReady();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      throw new Error('Vui lòng nhập địa chỉ email cần đặt lại mật khẩu.');
    }
    try {
      await sendPasswordResetEmail(auth!, cleanEmail);
    } catch (err: any) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }

  async sendVerification(): Promise<void> {
    this.ensureAuthReady();
    if (!auth?.currentUser) {
      throw new Error('Chưa có tài khoản đang đăng nhập.');
    }
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err: any) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }

  async logout(): Promise<void> {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (err: any) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }

  getCurrentUser(): LoviraAuthUser | null {
    if (!auth || !auth.currentUser) return null;
    return toLoviraAuthUser(auth.currentUser);
  }

  async refreshCurrentUser(): Promise<LoviraAuthUser | null> {
    if (!auth || !auth.currentUser) return null;
    try {
      await reload(auth.currentUser);
      return toLoviraAuthUser(auth.currentUser);
    } catch {
      return this.getCurrentUser();
    }
  }

  subscribeToAuthState(callback: (user: LoviraAuthUser | null) => void): () => void {
    if (!isFirebaseConfigured || !auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(
      auth,
      (firebaseUser) => {
        callback(toLoviraAuthUser(firebaseUser));
      },
      (error) => {
        console.warn('[Firebase] Auth state listener error:', error);
        callback(null);
      }
    );
  }
}

export const authService = new AuthService();
