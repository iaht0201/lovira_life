import React, { useState, useEffect } from 'react';
import {
  Camera,
  ImagePlus,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  PlusCircle,
  FileText,
  Eye,
  ScanText,
  Package,
  Zap,
  Volume2,
  Mic,
  Loader2,
} from 'lucide-react';
import { CameraModal } from '../camera/CameraModal';
import { VisionResult, UserProfile, AccessibilitySettings, ScenarioType } from '../../types';
import { analyzeVision, fetchApi } from '../../services/api';
import { compressImageBase64 } from '../../lib/imageUtils';
import { speakText } from '../../services/ttsService';

interface VisionViewProps {
  userProfile?: UserProfile | null;
  settings: AccessibilitySettings;
  initialAction?: string;
  onCreateSessionFromTemplate?: (type: ScenarioType, customGoal?: string) => Promise<void>;
  onOpenSession?: (sessionId: string) => void;
  onShowToast?: (msg: string) => void;
}

export const VisionView: React.FC<VisionViewProps> = ({
  userProfile,
  settings,
  initialAction,
  onCreateSessionFromTemplate,
  onOpenSession,
  onShowToast,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [visionMode, setVisionMode] = useState<'scene' | 'text' | 'object' | 'quick'>('scene');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpAnswers, setFollowUpAnswers] = useState<Array<{ q: string; a: string }>>([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialAction === 'camera') {
      setIsCameraOpen(true);
    }

    const handleOpenCamEvent = () => setIsCameraOpen(true);
    const handleCaptureEvent = () => {
      if (!isCameraOpen) setIsCameraOpen(true);
    };

    document.addEventListener('lovira-voice-open-camera', handleOpenCamEvent);
    document.addEventListener('lovira-voice-capture', handleCaptureEvent);

    return () => {
      document.removeEventListener('lovira-voice-open-camera', handleOpenCamEvent);
      document.removeEventListener('lovira-voice-capture', handleCaptureEvent);
    };
  }, [initialAction, isCameraOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      const msg = 'Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP).';
      setError(msg);
      if (onShowToast) onShowToast(msg);
      return;
    }

    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const msg = 'Dung lượng ảnh vượt quá giới hạn 10MB.';
      setError(msg);
      if (onShowToast) onShowToast(msg);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      const compressed = await compressImageBase64(rawBase64, 1280, 0.8);
      setSelectedImage(compressed);
      setResult(null);
      setFollowUpAnswers([]);
      setError(null);
      runVisionAnalysis(compressed, visionMode);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const runVisionAnalysis = async (
    base64Img: string,
    mode: 'scene' | 'text' | 'object' | 'quick'
  ) => {
    setLoading(true);
    setError(null);
    try {
      const compressedImg = await compressImageBase64(base64Img, 1280, 0.8);
      const data = await analyzeVision(
        compressedImg,
        mode,
        undefined,
        localStorage.getItem('lovira_custom_gemini_key') || undefined
      );
      setResult(data);
    } catch (err: unknown) {
      console.error('Vision analysis error:', err);
      const msg = err instanceof Error ? err.message : 'Chưa thể phân tích hình ảnh này.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode: 'scene' | 'text' | 'object' | 'quick') => {
    setVisionMode(mode);
    if (selectedImage) {
      runVisionAnalysis(selectedImage, mode);
    }
  };

  const handleCreateNewTask = async () => {
    if (!result || isCreatingTask) return;
    setIsCreatingTask(true);
    try {
      const goalTitle = `Hỗ trợ xử lý thông tin từ hình ảnh: ${result.summary.slice(0, 60)}...`;
      if (onCreateSessionFromTemplate) {
        await onCreateSessionFromTemplate('vision', goalTitle);
        if (onShowToast) onShowToast('Đã tạo nhiệm vụ mới từ kết quả phân tích ảnh!');
      }
    } catch (err) {
      console.error('Failed to create session from vision result:', err);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim() || !selectedImage || followUpLoading) return;

    const q = followUpQuestion.trim();
    setFollowUpQuestion('');
    setFollowUpLoading(true);

    try {
      const currentSummary = result ? `${result.summary}. Chi tiết: ${result.details.join(', ')}. Chữ nhận diện được: ${result.detectedText.join(' ')}` : 'Ảnh đã chọn';
      
      const res = await fetchApi<{ answer?: string; reply?: string }>('/api/gemini/document-qa', {
        documentText: currentSummary,
        question: q,
        customApiKey: localStorage.getItem('lovira_custom_gemini_key') || undefined,
      }).catch(() => null);

      const answer = res?.answer || res?.reply || `Về câu hỏi "${q}": Dựa vào ảnh, ${result?.summary || 'đã nhận diện các chi tiết xung quanh.'}`;
      setFollowUpAnswers((prev) => [...prev, { q, a: answer }]);
    } catch (err) {
      console.error('Followup error:', err);
      setFollowUpAnswers((prev) => [
        ...prev,
        { q, a: 'Lovira chưa thể trả lời câu hỏi này. Vui lòng thử lại.' },
      ]);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = `[Mô tả từ Lovira]\n${result.summary}\n\n[Chi tiết]\n${result.details.join('\n')}${result.detectedText?.length ? '\n\n[Chữ đọc được]\n' + result.detectedText.join('\n') : ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    if (onShowToast) onShowToast('Đã sao chép nội dung mô tả vào bộ nhớ tạm');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReadResult = () => {
    if (result) {
      const content = `${result.summary}. Chi tiết: ${result.details.join('. ')}`;
      speakText(content);
    }
  };

  const modeButtons = [
    { id: 'scene', label: 'Mô tả cảnh', icon: Eye, desc: 'Nhìn toàn cảnh không gian & đồ vật' },
    { id: 'text', label: 'Đọc chữ', icon: ScanText, desc: 'Đọc nhãn, tài liệu, đơn thuốc' },
    { id: 'object', label: 'Vật thể', icon: Package, desc: 'Định danh đồ vật & khoảng cách' },
    { id: 'quick', label: 'Tóm tắt nhanh', icon: Zap, desc: 'Nói ngắn gọn ý chính trong ảnh' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-[#287C78] dark:text-[#42A39E] font-bold text-xs uppercase tracking-wider mb-1">
            <Eye className="w-4 h-4" />
            <span>Trợ lý thị giác thông minh</span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Nhìn giúp tôi</h1>
          <p className="text-sm text-text-secondary mt-1">
            Chụp hoặc tải ảnh để Lovira nhận diện khung cảnh, đọc nhãn sản phẩm, đơn thuốc và hỗ trợ bạn xử lý mọi công việc liên quan.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCameraOpen(true)}
            className="px-5 py-3 rounded-xl bg-[#287C78] hover:bg-[#1F625F] text-white font-bold text-sm transition-all shadow-md shadow-[#287C78]/20 flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Camera className="w-5 h-5" />
            <span>Mở Camera chụp ngay</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Mode selection & Image Dropzone (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Mode Selector */}
          <div className="bg-surface border border-slate-200 dark:border-slate-800 p-2 rounded-2xl grid grid-cols-2 gap-2 shadow-xs">
            {modeButtons.map((m) => {
              const IconComp = m.icon;
              const isActive = visionMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id as any)}
                  className={`p-3 rounded-xl text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isActive
                      ? 'bg-[#287C78] text-white shadow-md shadow-[#287C78]/20 font-bold'
                      : 'bg-surface-subtle text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{m.label}</span>
                    <IconComp className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#287C78] dark:text-[#42A39E]'}`} />
                  </div>
                  <span className={`text-[11px] leading-tight opacity-90 ${isActive ? 'text-teal-100' : 'text-text-secondary'}`}>
                    {m.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Upload Dropzone / Live Preview Stage */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="bg-surface border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[340px] space-y-4 shadow-xs relative overflow-hidden"
          >
            {selectedImage ? (
              <div className="space-y-4 w-full">
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 max-h-[280px] flex items-center justify-center border border-slate-800 shadow-inner">
                  <img src={selectedImage} alt="Ảnh phân tích" className="max-h-[270px] w-auto object-contain" />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setResult(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-text-primary hover:bg-surface-subtle flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Chọn ảnh khác
                  </button>
                  <button
                    onClick={() => runVisionAnalysis(selectedImage, visionMode)}
                    className="px-4 py-2 rounded-xl bg-[#287C78] hover:bg-[#1F625F] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> Phân tích lại
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center shrink-0 shadow-inner">
                  <ImagePlus className="w-8 h-8 shrink-0" />
                </div>
                <div>
                  <p className="font-bold text-base text-text-primary">Kéo thả ảnh hoặc chọn tệp</p>
                  <p className="text-xs text-text-secondary mt-1">Hỗ trợ JPG, PNG, WEBP (Tối đa 10MB)</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <label className="px-5 py-2.5 rounded-xl bg-[#287C78] hover:bg-[#1F625F] text-white text-xs font-bold shadow-sm cursor-pointer transition-colors">
                    Chọn ảnh từ thiết bị
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
                  </label>
                  <button
                    onClick={() => setIsCameraOpen(true)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-text-primary hover:bg-surface-subtle flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-[#287C78] dark:text-[#42A39E]" /> Mở Camera
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#E4F0EF]/60 dark:bg-[#203A39]/60 border border-[#287C78]/20 text-xs text-[#287C78] dark:text-[#42A39E] leading-relaxed">
            💡 <strong>Mẹo cho người lớn tuổi / thị lực kém:</strong> Bạn có thể dùng tính năng đọc to kết quả bằng giọng nói hoặc yêu cầu Lovira tự động tạo nhiệm vụ nhắc nhở sau khi quét đơn thuốc/tài liệu.
          </div>
        </div>

        {/* Right Column: Result Workspace & Task Creation (7 Cols) */}
        <div className="lg:col-span-7 bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between min-h-[520px] shadow-xs">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-[#287C78] dark:text-[#42A39E] animate-spin mx-auto" />
              <p className="text-sm font-semibold text-text-primary">Lovira đang nhìn và phân tích thông tin chi tiết trong ảnh...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm space-y-3">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Không thể hoàn tất phân tích</span>
              </div>
              <p className="text-xs">{error}</p>
              <button
                onClick={() => selectedImage && runVisionAnalysis(selectedImage, visionMode)}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Thử lại ngay
              </button>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Header Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-bold text-base text-text-primary">Kết quả phân tích</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReadResult}
                    className="px-3.5 py-1.5 rounded-xl border border-[#287C78]/30 text-xs font-semibold text-[#287C78] dark:text-[#42A39E] hover:bg-[#E4F0EF] dark:hover:bg-[#203A39] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Đọc to</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-text-primary hover:bg-surface-subtle flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                  <button
                    onClick={handleCreateNewTask}
                    disabled={isCreatingTask}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{isCreatingTask ? 'Đang tạo...' : 'Tạo task mới'}</span>
                  </button>
                </div>
              </div>

              {/* Structured Output Content */}
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Mô tả tổng quan</h4>
                  <p className="text-sm text-text-primary leading-relaxed bg-surface-subtle p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    {result.summary}
                  </p>
                </div>

                {result.details && result.details.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Chi tiết & Đồ vật nhận diện</h4>
                    <div className="bg-surface-subtle p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <ul className="text-sm text-text-primary space-y-2 list-disc list-inside">
                        {result.details.map((d, i) => (
                          <li key={i} className="leading-relaxed">{d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {result.detectedText && result.detectedText.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#287C78] dark:text-[#42A39E]" />
                      <span>Văn bản & Chữ nhận diện được</span>
                    </h4>
                    <div className="bg-[#E4F0EF]/40 dark:bg-[#203A39]/40 p-4 rounded-xl border border-[#287C78]/20 text-sm font-mono text-gray-900 dark:text-gray-100">
                      {result.detectedText.map((t, i) => (
                        <p key={i} className="py-0.5">{t}</p>
                      ))}
                    </div>
                  </div>
                )}

                {result.possibleHazards && result.possibleHazards.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                      <strong>Cảnh báo an toàn:</strong> {result.possibleHazards.join('. ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Follow-up Q&A Log */}
              {followUpAnswers.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Hỏi đáp thêm về ảnh</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {followUpAnswers.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-[#E4F0EF]/60 dark:bg-slate-800/60 text-xs space-y-1.5 border border-[#287C78]/20 dark:border-slate-700">
                        <p className="font-bold text-[#287C78] dark:text-[#42A39E]">Hỏi: {item.q}</p>
                        <p className="text-text-primary leading-relaxed">Lovira: {item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5 my-auto text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <Eye className="w-8 h-8 text-[#287C78] dark:text-[#42A39E]" />
              </div>
              <div className="max-w-sm mx-auto space-y-2">
                <h3 className="font-bold text-base text-text-primary">Sẵn sàng nhìn giúp bạn</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Hãy mở Camera hoặc tải một bức ảnh lên. Lovira sẽ phân tích ngay lập tức và hỗ trợ bạn tạo nhiệm vụ hoặc đọc chữ to rõ ràng.
                </p>
              </div>
            </div>
          )}

          {/* Follow-up Question Input Form */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <form onSubmit={handleFollowUp} className="flex items-center gap-2">
              <input
                type="text"
                value={followUpQuestion}
                onChange={(e) => setFollowUpQuestion(e.target.value)}
                placeholder="Hỏi thêm về ảnh (Ví dụ: Thuốc này uống lúc nào? Bàn có chìa khóa không?)..."
                disabled={!selectedImage || loading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface text-sm text-text-primary placeholder:text-text-secondary focus:border-[#287C78] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => {
                  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    const recognition = new SpeechRecognition();
                    recognition.lang = 'vi-VN';
                    recognition.onresult = (event: any) => {
                      const transcript = event.results[0][0].transcript;
                      if (transcript) setFollowUpQuestion(transcript);
                    };
                    recognition.start();
                  } else if (onShowToast) {
                    onShowToast('Trình duyệt chưa hỗ trợ nhận diện giọng nói trực tiếp.');
                  }
                }}
                title="Nói câu hỏi của bạn"
                disabled={!selectedImage || loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-surface-subtle disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Mic className="w-5 h-5 text-[#287C78] dark:text-[#42A39E]" />
              </button>
              <button
                type="submit"
                disabled={!selectedImage || !followUpQuestion.trim() || followUpLoading}
                className="px-5 py-2.5 rounded-xl bg-[#287C78] hover:bg-[#1F625F] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center shrink-0 transition-colors shadow-sm cursor-pointer"
              >
                Gửi
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Camera Modal Component */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(dataUrl) => {
          setSelectedImage(dataUrl);
          setResult(null);
          setFollowUpAnswers([]);
          runVisionAnalysis(dataUrl, visionMode);
        }}
      />
    </div>
  );
};
