import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  FileText,
  Copy,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Ear,
  ListTodo,
} from 'lucide-react';
import { VSLAvatarStick } from './VSLAvatarStick';
import { summarizeConversation } from '../../services/api';
import { ConversationSummary } from '../../types';

interface ListenViewProps {
  onNavigate?: (path: string) => void;
  onShowToast?: (msg: string) => void;
}

export const ListenView: React.FC<ListenViewProps> = ({ onNavigate, onShowToast }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [vslCurrentText, setVslCurrentText] = useState<string>('Nghe giúp tôi sẵn sàng');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            currentFinal += res[0].transcript + ' ';
          } else {
            currentInterim += res[0].transcript;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => (prev ? prev + '\n' + currentFinal.trim() : currentFinal.trim()));
          setVslCurrentText(currentFinal.trim());
        }
        setInterimText(currentInterim);
      };

      recognition.onerror = (err: any) => {
        console.warn('[SpeechRecognition error]:', err);
        if (err.error === 'not-allowed') {
          if (onShowToast) onShowToast('Chưa cấp quyền micro');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        if (isRecording) {
          try {
            recognition.start();
          } catch (e) {
            setIsRecording(false);
          }
        }
      };

      recognitionRef.current = recognition;
    }
  }, [isRecording, onShowToast]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      if (onShowToast) onShowToast('Trình duyệt không hỗ trợ nhận diện giọng nói tự động');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimText('');
      if (onShowToast) onShowToast('Đã dừng ghi âm cuộc trò chuyện');
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        if (onShowToast) onShowToast('Đang lắng nghe cuộc trò chuyện...');
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  };

  const handleClear = () => {
    setTranscript('');
    setInterimText('');
    setSummary(null);
    setVslCurrentText('Nghe giúp tôi sẵn sàng');
    if (onShowToast) onShowToast('Đã xóa dữ liệu cuộc trò chuyện');
  };

  const handleGenerateSummary = async () => {
    const fullText = (transcript + ' ' + interimText).trim();
    if (!fullText) {
      if (onShowToast) onShowToast('Hãy bật ghi âm hoặc nhập văn bản trước khi tóm tắt');
      return;
    }

    setIsSummarizing(true);
    try {
      const result = await summarizeConversation(fullText);
      setSummary(result);
      if (result.vslKeywords && result.vslKeywords.length > 0) {
        setVslCurrentText(result.vslKeywords[0]);
      }
      if (onShowToast) onShowToast('Đã tạo tóm tắt cuộc trò chuyện!');
    } catch (err) {
      console.error('Error generating summary:', err);
      if (onShowToast) onShowToast('Không thể tạo tóm tắt. Vui lòng thử lại.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast('Đã sao chép vào bộ nhớ tạm!');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-[20px] bg-lovira-card border border-lovira shadow-sm">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('/')}
              className="p-2.5 rounded-[12px] bg-lovira-input hover:bg-lovira-card-hover text-lovira-title transition-colors cursor-pointer"
              aria-label="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-12 h-12 rounded-[16px] bg-[#E4F0EF] dark:bg-[#203A39] border border-[#287C78]/30 flex items-center justify-center shrink-0">
            <Ear className="w-6 h-6 text-[#287C78] dark:text-[#42A39E]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-[800] text-lovira-title">Nghe giúp tôi</h1>
            <p className="text-xs sm:text-sm text-lovira-muted">
              Lắng nghe, chuyển giọng nói thành văn bản & tóm tắt cuộc trò chuyện
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="p-2.5 rounded-[12px] border border-lovira bg-lovira-card hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 transition-colors cursor-pointer"
            title="Xóa nội dung"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left Recording Panel & Right VSL Avatar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Audio Capture & Text Transcript */}
        <div className="lg:col-span-2 space-y-5">
          {/* Audio Control Box */}
          <div className="p-6 rounded-[24px] bg-lovira-card border border-lovira shadow-sm text-center space-y-4">
            <div className="flex justify-center">
              <button
                onClick={toggleRecording}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-200 dark:ring-rose-900/40'
                    : 'bg-[#287C78] hover:bg-[#1F625F] text-white ring-4 ring-[#E4F0EF] dark:ring-[#203A39]'
                }`}
              >
                {isRecording ? <Square className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
              </button>
            </div>

            <div>
              <p className="text-base font-[700] text-lovira-title">
                {isRecording ? 'Đang lắng nghe cuộc hội thoại...' : 'Nhấn nút để bắt đầu ghi âm'}
              </p>
              <p className="text-xs text-lovira-muted mt-1">
                {isRecording
                  ? 'Đặt thiết bị gần người nói để nhận diện rõ nét nhất'
                  : 'Trợ lý Lovira sẽ lắng nghe và ghi chép lại cho bạn'}
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleGenerateSummary}
                disabled={isSummarizing || (!transcript && !interimText)}
                className="px-5 py-2.5 rounded-[14px] bg-[#287C78] hover:bg-[#1F625F] disabled:opacity-50 text-white font-[700] text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSummarizing ? 'Đang tóm tắt...' : 'Tóm tắt bằng AI'}</span>
              </button>

              {transcript && (
                <button
                  onClick={() => handleCopyText(transcript)}
                  className="px-4 py-2.5 rounded-[14px] bg-lovira-input hover:bg-lovira-card-hover border border-lovira text-lovira-title font-[600] text-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-lovira-muted" />
                  <span>Sao chép</span>
                </button>
              )}
            </div>
          </div>

          {/* Transcript Box */}
          <div className="p-5 rounded-[20px] bg-lovira-card border border-lovira shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-[700] text-sm text-lovira-title">
                <FileText className="w-4 h-4 text-[#287C78] dark:text-[#42A39E]" />
                <span>Nội dung ghi chép trực tiếp</span>
              </div>
              <span className="text-xs text-lovira-muted">
                {transcript.length > 0 ? `${transcript.split(' ').length} từ` : 'Trống'}
              </span>
            </div>

            <div className="min-h-[160px] max-h-[300px] overflow-y-auto p-4 rounded-[14px] bg-lovira-input border border-lovira text-sm leading-relaxed font-sans text-lovira-title whitespace-pre-wrap custom-scrollbar">
              {transcript || interimText ? (
                <>
                  <span>{transcript}</span>
                  {interimText && (
                    <span className="text-[#287C78] dark:text-[#42A39E] italic animate-pulse">
                      {' ' + interimText}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-lovira-muted italic">
                  Văn bản thu âm sẽ hiển thị tại đây khi bạn bấm bắt đầu ghi âm...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: VSL Stickman Avatar & AI Summary Box */}
        <div className="space-y-5">
          {/* Stickman VSL Avatar */}
          <VSLAvatarStick currentText={vslCurrentText} isAnimating={isRecording} />

          {/* Summary Output Box */}
          {summary && (
            <div className="p-5 rounded-[20px] bg-lovira-card border border-lovira shadow-sm space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 pb-2 border-b border-lovira-subtle">
                <Sparkles className="w-5 h-5 text-[#287C78] dark:text-[#42A39E]" />
                <h3 className="font-[800] text-base text-lovira-title">Kết quả tóm tắt</h3>
              </div>

              {/* Main Content */}
              <div>
                <h4 className="text-xs font-[700] text-lovira-muted uppercase tracking-wider mb-1">
                  Nội dung chính
                </h4>
                <p className="text-sm text-lovira-title leading-relaxed font-[500]">
                  {summary.mainContent}
                </p>
              </div>

              {/* Key Points */}
              {summary.keyPoints && summary.keyPoints.length > 0 && (
                <div>
                  <h4 className="text-xs font-[700] text-lovira-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-[#287C78]" />
                    <span>Ý chính ghi nhớ</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {summary.keyPoints.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-lovira-title">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#287C78] mt-1.5 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {summary.actionItems && summary.actionItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-[700] text-lovira-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Việc cần làm</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {summary.actionItems.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-lovira-title">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
