import React, { useEffect, useState } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, CheckCircle2, Monitor, HelpCircle } from 'lucide-react';
import { sfx } from '../../utils/sfx';
import { BrandAvatar } from './BrandAvatar';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone app mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Check dismiss state
    const dismissedAt = localStorage.getItem('lovira_pwa_dismissed');
    if (dismissedAt) {
      const hoursPassed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hoursPassed < 24) return; // Hide for 24h if dismissed
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleMobile);

    // Check if window already captured beforeinstallprompt event early
    const earlyPrompt = (window as unknown as { deferredPWAInstallPrompt?: BeforeInstallPromptEvent }).deferredPWAInstallPrompt;
    if (earlyPrompt) {
      setDeferredPrompt(earlyPrompt);
      setVisible(true);
    }

    // Listen for native PWA install prompt (Android/Chrome/Edge)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as unknown as { deferredPWAInstallPrompt?: BeforeInstallPromptEvent }).deferredPWAInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setVisible(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
      (window as unknown as { deferredPWAInstallPrompt?: BeforeInstallPromptEvent }).deferredPWAInstallPrompt = undefined;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show banner after brief delay on mobile devices or if prompt is ready
    const isMobileDevice = /mobile|iphone|ipad|ipod|android/i.test(userAgent);
    if (isMobileDevice || isAppleMobile) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 2500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    sfx.playTap();

    // Retrieve active prompt from state or global window
    const activePrompt =
      deferredPrompt ||
      (window as unknown as { deferredPWAInstallPrompt?: BeforeInstallPromptEvent }).deferredPWAInstallPrompt;

    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          sfx.playSuccess();
          setInstalled(true);
          setVisible(false);
        }
        setDeferredPrompt(null);
        (window as unknown as { deferredPWAInstallPrompt?: BeforeInstallPromptEvent }).deferredPWAInstallPrompt = undefined;
      } catch (err) {
        console.warn('[PWA] Native prompt trigger error:', err);
        setShowManualGuide(true);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Show clean step-by-step guidance modal instead of alert
      setShowManualGuide(true);
    }
  };

  const handleDismiss = () => {
    sfx.playTap();
    localStorage.setItem('lovira_pwa_dismissed', String(Date.now()));
    setVisible(false);
  };

  if (!visible || installed) return null;

  return (
    <>
      {/* Bottom Floating Install Banner */}
      <div className="fixed bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom duration-300">
        <div className="bg-lovira-card border-2 border-lovira-purple rounded-2xl p-4 shadow-2xl flex flex-col space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandAvatar size="lg" alt="Lovira" className="shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-lovira-title flex items-center gap-1.5">
                  <span>Tải Lovira về Màn hình chính</span>
                  <span className="text-xs text-[#FF5CA8]">♥</span>
                </h4>
                <p className="text-[11px] text-lovira-muted leading-tight mt-0.5">
                  Ứng dụng PWA mượt mà, khởi động tức thì, có biểu tượng riêng trên thiết bị.
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="p-1.5 text-lovira-muted hover:text-lovira-title rounded-lg transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2 px-3 bg-lovira-purple hover:bg-lovira-purple-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Cài đặt PWA ngay</span>
            </button>

            <button
              onClick={handleDismiss}
              className="py-2 px-3 bg-lovira-surface hover:bg-lovira-card-hover text-lovira-muted text-xs font-semibold rounded-xl border border-lovira transition-all cursor-pointer"
            >
              Để sau
            </button>
          </div>
        </div>
      </div>

      {/* iOS Modal Instructions */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-lovira-card border border-lovira rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-lovira-subtle pb-3">
              <h3 className="text-sm font-bold text-lovira-title flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-lovira-purple" />
                <span>Cài đặt Lovira trên iPhone / iPad</span>
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-lovira-muted hover:text-lovira-title"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-lovira-title">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-lovira-surface border border-lovira-subtle">
                <div className="p-1.5 rounded-lg bg-lovira-badge-purple text-lovira-purple shrink-0">
                  <Share className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">Bước 1</p>
                  <p className="text-lovira-muted text-[11px]">
                    Nhấn nút <strong>Chia sẻ (Share)</strong> ở thanh công cụ trình duyệt Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-lovira-surface border border-lovira-subtle">
                <div className="p-1.5 rounded-lg bg-lovira-badge-purple text-lovira-purple shrink-0">
                  <PlusSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">Bước 2</p>
                  <p className="text-lovira-muted text-[11px]">
                    Kéo danh sách tùy chọn và chọn <strong>Thêm vào Màn hình chính (Add to Home Screen)</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-lovira-surface border border-lovira-subtle">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">Bước 3</p>
                  <p className="text-lovira-muted text-[11px]">
                    Nhấn <strong>Thêm (Add)</strong> ở góc trên bên phải để hoàn tất cài đặt.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-lovira-purple text-white font-bold text-xs rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
            >
              Đã hiểu, cảm ơn!
            </button>
          </div>
        </div>
      )}

      {/* Manual Guidance Modal for Android/Desktop when native prompt is pending */}
      {showManualGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-lovira-card border border-lovira rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-lovira-subtle pb-3">
              <h3 className="text-sm font-bold text-lovira-title flex items-center gap-2">
                <Monitor className="w-5 h-5 text-lovira-purple" />
                <span>Hướng dẫn cài đặt PWA</span>
              </h3>
              <button
                onClick={() => setShowManualGuide(false)}
                className="p-1 rounded-lg text-lovira-muted hover:text-lovira-title"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-lovira-title">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-lovira-surface border border-lovira-subtle">
                <div className="p-1.5 rounded-lg bg-lovira-badge-purple text-lovira-purple shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">Cách 1: Biểu tượng trên thanh địa chỉ (URL)</p>
                  <p className="text-lovira-muted text-[11px]">
                    Nhấp vào biểu tượng <strong>Tải xuống / Cài đặt</strong> ở góc phải thanh nhập địa chỉ trang web của Chrome hoặc Edge.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-lovira-surface border border-lovira-subtle">
                <div className="p-1.5 rounded-lg bg-lovira-badge-purple text-lovira-purple shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold">Cách 2: Menu trình duyệt</p>
                  <p className="text-lovira-muted text-[11px]">
                    Mở <strong>Menu (⋮)</strong> ở góc phải → Chọn <strong>Cài đặt Lovira Life...</strong> hoặc <strong>Thêm vào màn hình chính</strong>.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowManualGuide(false)}
              className="w-full py-2.5 bg-lovira-purple text-white font-bold text-xs rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
            >
              Đã hiểu!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
