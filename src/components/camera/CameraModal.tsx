import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, Loader2, Sparkles, Timer, RefreshCw } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureImage: (dataUrl: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCaptureImage,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0); // 0 = off, 3 = 3s, 5 = 5s
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Stable stop camera function that operates directly on streamRef without recreating callback
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  // Stable start camera function with fixed dependencies to eliminate hook loops
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (e: any) {
      console.warn('[CameraModal] Camera access error:', e);
      setCameraError(
        'Không thể bật camera trực tiếp (do quyền truy cập hoặc thiết bị). Bạn vẫn có thể tải tệp ảnh từ máy lên.'
      );
    }
  }, []);

  const resizeAndCompressImage = (source: HTMLVideoElement | HTMLImageElement): string => {
    const canvas = document.createElement('canvas');
    let width = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    let height = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

    const maxEdge = 1280;
    if (width > maxEdge || height > maxEdge) {
      if (width > height) {
        height = Math.round((height * maxEdge) / width);
        width = maxEdge;
      } else {
        width = Math.round((width * maxEdge) / height);
        height = maxEdge;
      }
    }

    canvas.width = width || 640;
    canvas.height = height || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    }

    return canvas.toDataURL('image/jpeg', 0.7);
  };

  const executeCapture = useCallback(() => {
    if (videoRef.current) {
      const compressedUrl = resizeAndCompressImage(videoRef.current);
      setPreviewUrl(compressedUrl);
      stopCamera();

      setIsProcessing(true);
      // Play subtle shutter feedback
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch {
        // ignore audio context errors
      }

      setTimeout(() => {
        onCaptureImage(compressedUrl);
        setIsProcessing(false);
        onClose();
      }, 400);
    }
  }, [onCaptureImage, onClose, stopCamera]);

  const handleStartCountdownOrCapture = useCallback(() => {
    if (timerSeconds === 0) {
      executeCapture();
      return;
    }

    setCountdown(timerSeconds);
    let count = timerSeconds;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownIntervalRef.current);
        setCountdown(null);
        executeCapture();
      }
    }, 1000);
  }, [timerSeconds, executeCapture]);

  // Listen to centralized voice capture trigger event from global voice handler
  useEffect(() => {
    if (!isOpen) return;

    const handleVoiceTrigger = () => {
      console.log('[CameraModal] Received lovira:trigger-camera-capture event');
      handleStartCountdownOrCapture();
    };

    window.addEventListener('lovira:trigger-camera-capture', handleVoiceTrigger);
    return () => {
      window.removeEventListener('lovira:trigger-camera-capture', handleVoiceTrigger);
    };
  }, [isOpen, handleStartCountdownOrCapture]);

  // Lifecycle control on modal open / close
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setPreviewUrl(null);
      setCountdown(null);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
    return () => {
      stopCamera();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const compressedUrl = resizeAndCompressImage(img);
        setPreviewUrl(compressedUrl);
        stopCamera();
        setIsProcessing(true);
        setTimeout(() => {
          onCaptureImage(compressedUrl);
          setIsProcessing(false);
          onClose();
        }, 300);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmImage = () => {
    if (previewUrl) {
      setIsProcessing(true);
      onCaptureImage(previewUrl);
      setIsProcessing(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg p-5 bg-white dark:bg-[#182222] opacity-100 border-2 border-[#287C78]/40 rounded-3xl shadow-2xl space-y-3 z-10">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 text-amber-600 rounded-xl">
              <Camera className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Nhìn giúp tôi — Camera AI
              </h3>
              <p className="text-xs text-text-secondary">Chụp phiếu khám, số phòng hay đơn thuốc</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
            aria-label="Đóng camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stable Quick Toolbar */}
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 px-3 py-2 rounded-2xl text-xs gap-2 min-h-[40px]">
          <div className="flex items-center gap-1.5 text-text-secondary font-medium text-[12px]">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Nói "Chụp" qua nút VOICE để tự chụp</span>
          </div>

          {/* Countdown timer toggle */}
          <div className="flex items-center gap-1 shrink-0">
            <Timer className="w-3.5 h-3.5 text-text-secondary mr-0.5" />
            {[0, 3, 5].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setTimerSeconds(sec)}
                className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  timerSeconds === sec
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface border border-default text-text-secondary hover:text-text-primary'
                }`}
              >
                {sec === 0 ? 'Tắt' : `${sec}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Viewfinder or Preview with Stable Aspect Ratio */}
        <div className="relative w-full aspect-4/3 bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-default">
          {previewUrl ? (
            <img src={previewUrl} alt="Ảnh đã chụp" className="w-full h-full object-contain" />
          ) : stream ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-amber-500 text-white font-black text-4xl flex items-center justify-center shadow-2xl scale-100 transition-transform">
                    {countdown}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-6 space-y-3">
              <Camera className="w-10 h-10 text-gray-400 mx-auto" />
              <p className="text-xs text-gray-300 max-w-xs mx-auto">
                {cameraError || 'Đang kết nối camera...'}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary-light rounded-xl text-xs font-medium cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Thử lại camera
              </button>
            </div>
          )}
        </div>

        {/* Action Controls - Fixed Height Row */}
        <div className="flex items-center justify-between gap-3 pt-1 min-h-[48px]">
          {previewUrl ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  startCamera();
                }}
                className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border border-default text-text-primary font-medium text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Chụp lại
              </button>
              <button
                type="button"
                onClick={handleConfirmImage}
                disabled={isProcessing}
                className="flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-dark transition-colors cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Sử dụng ảnh này</span>
              </button>
            </>
          ) : (
            <>
              <label className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border border-default bg-surface text-text-primary font-medium text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Upload className="w-4 h-4 text-primary" />
                <span>Chọn tệp ảnh</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleStartCountdownOrCapture}
                disabled={countdown !== null || !stream}
                className={`flex items-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${
                  stream
                    ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95'
                    : 'bg-slate-300 dark:bg-slate-700 text-text-muted cursor-not-allowed'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>
                  {countdown !== null
                    ? `Đang đếm (${countdown}s)...`
                    : timerSeconds > 0
                    ? `Tự chụp sau ${timerSeconds}s`
                    : 'Chụp ảnh ngay'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
