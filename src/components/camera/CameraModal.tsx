import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, Loader2, Sparkles, FileText } from 'lucide-react';

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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setPreviewUrl(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (e) {
      console.warn('Camera access error:', e);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

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

  const handleTakePicture = () => {
    if (videoRef.current) {
      const compressedUrl = resizeAndCompressImage(videoRef.current);
      setPreviewUrl(compressedUrl);
      stopCamera();
    }
  };

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
      <div className="w-full max-w-lg p-5 bg-white dark:bg-[#1C162E] opacity-100 border-2 border-purple-500/40 rounded-3xl shadow-2xl space-y-4 z-10">
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
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary"
            aria-label="Đóng camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder or Preview */}
        <div className="relative w-full aspect-4/3 bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-default">
          {previewUrl ? (
            <img src={previewUrl} alt="Ảnh đã chụp" className="w-full h-full object-contain" />
          ) : stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6 space-y-2">
              <Camera className="w-12 h-12 text-gray-500 mx-auto animate-bounce" />
              <p className="text-xs text-gray-400">Không thể bật camera trực tiếp. Vui lòng chọn tệp ảnh từ thiết bị.</p>
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
                className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border border-default text-text-primary font-medium text-xs"
              >
                Chụp lại
              </button>
              <button
                onClick={handleConfirmImage}
                disabled={isProcessing}
                className="flex items-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md"
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
              <label className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border border-default bg-surface text-text-primary font-medium text-xs cursor-pointer">
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
                  onClick={handleTakePicture}
                  className="flex items-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-md hover:bg-amber-600"
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp ảnh</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
