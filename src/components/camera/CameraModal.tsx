import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, Loader2, Sparkles, Timer, Mic, MicOff, Volume2, RefreshCw } from 'lucide-react';
import { speechRecognitionService } from '../../services/voice/speechRecognitionService';
import { speakText } from '../../services/ttsService';

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
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(true);
  const [autoSend, setAutoSend] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const countdownIntervalRef = useRef<any>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (e: any) {
      console.warn('Camera access error:', e);
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

      if (autoSend) {
        setIsProcessing(true);
        // Play shutter feedback
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
    }
  }, [autoSend, onCaptureImage, onClose, stopCamera]);

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

  // Voice Command Listener inside Camera Modal
  useEffect(() => {
    if (!isOpen || previewUrl || !stream || !isListeningVoice) {
      speechRecognitionService.cancelListening();
      return;
    }

    const checkVoiceCommand = (transcript: string) => {
      const lower = transcript.toLowerCase();
      if (
        lower.includes('chụp') ||
        lower.includes('tách') ||
        lower.includes('ok') ||
        lower.includes('xong') ||
        lower.includes('lấy ảnh') ||
        lower.includes('nhìn giúp')
      ) {
        speechRecognitionService.cancelListening();
        handleStartCountdownOrCapture();
      }
    };

    speechRecognitionService.startListening({
      onInterimResult: checkVoiceCommand,
      onFinalResult: checkVoiceCommand,
      onError: () => {},
      onEnd: () => {},
    });

    return () => {
      speechRecognitionService.cancelListening();
    };
  }, [isOpen, previewUrl, stream, isListeningVoice, handleStartCountdownOrCapture]);

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
        if (autoSend) {
          setIsProcessing(true);
          setTimeout(() => {
            onCaptureImage(compressedUrl);
            setIsProcessing(false);
            onClose();
          }, 300);
        }
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg p-5 bg-white dark:bg-[#182222] opacity-100 border-2 border-[#287C78]/40 rounded-3xl shadow-2xl space-y-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-600 rounded-xl">
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
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
            aria-label="Đóng camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Toolbar: Voice Trigger & Auto Timer */}
        {!previewUrl && stream && (
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-2xl text-xs gap-2">
            {/* Voice command indicator */}
            <button
              onClick={() => setIsListeningVoice((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium transition-colors ${
                isListeningVoice
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-surface text-text-secondary border border-default'
              }`}
              title="Bật/tắt chụp bằng giọng nói"
            >
              {isListeningVoice ? <Mic className="w-3.5 h-3.5 animate-pulse" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{isListeningVoice ? 'Nói "Chụp" để tự chụp' : 'Mic tắt'}</span>
            </button>

            {/* Countdown timer toggle */}
            <div className="flex items-center gap-1">
              <span className="text-text-secondary text-[11px] font-medium hidden sm:inline">Hẹn giờ:</span>
              {[0, 3, 5].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setTimerSeconds(sec)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    timerSeconds === sec
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-default text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {sec === 0 ? 'Tắt' : `${sec}s`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Viewfinder or Preview */}
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
                <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-amber-500 text-white font-black text-5xl flex items-center justify-center animate-ping">
                    {countdown}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-6 space-y-3">
              <Camera className="w-12 h-12 text-gray-500 mx-auto animate-bounce" />
              <p className="text-xs text-gray-300 max-w-xs mx-auto">
                {cameraError || 'Đang kết nối camera hoặc chưa cấp quyền truy cập.'}
              </p>
              <button
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary-light rounded-xl text-xs font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Thử lại camera
              </button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {previewUrl ? (
            <>
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  startCamera();
                }}
                className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border border-default text-text-primary font-medium text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Chụp lại
              </button>
              <button
                onClick={handleConfirmImage}
                disabled={isProcessing}
                className="flex items-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-dark transition-colors"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Sử dụng ảnh này để đọc thông tin</span>
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

              {stream && (
                <button
                  onClick={handleStartCountdownOrCapture}
                  disabled={countdown !== null}
                  className="flex items-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-md hover:bg-amber-600 active:scale-95 transition-all"
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

