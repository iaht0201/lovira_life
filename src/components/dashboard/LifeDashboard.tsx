import React, { useState } from 'react';
import {
  Stethoscope,
  Landmark,
  ShoppingBag,
  FileText,
  Sparkles,
  ArrowRight,
  Camera,
  Play,
  CheckCircle2,
  Trash2,
  Clock,
  Plus,
} from 'lucide-react';
import { LifeSession, ScenarioType } from '../../types';
import { SCENARIO_TEMPLATES } from '../../data/initialData';
import { BriefSessionHeader } from '../../services/storageService';

interface LifeDashboardProps {
  activeSession: LifeSession | null;
  sessionsList: BriefSessionHeader[];
  onOpenSession: (id: string) => void;
  onCreateSessionFromTemplate: (type: ScenarioType, customGoal?: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenCamera: () => void;
  defaultTab?: 'tasks' | 'sessions';
}

export const LifeDashboard: React.FC<LifeDashboardProps> = ({
  activeSession,
  sessionsList,
  onOpenSession,
  onCreateSessionFromTemplate,
  onDeleteSession,
  onOpenCamera,
  defaultTab = 'tasks',
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  // Clarification Flow state machine
  type ClarificationStep = 'input' | 'checking' | 'question' | 'generating';
  const [clarificationStep, setClarificationStep] = useState<ClarificationStep>('input');
  const [clarifyingQuestion, setClarifyingQuestion] = useState('');
  const [clarificationAnswer, setClarificationAnswer] = useState('');

  const getScenarioIcon = (type: ScenarioType) => {
    switch (type) {
      case 'medical':
        return Stethoscope;
      case 'administrative':
        return Landmark;
      case 'shopping':
        return ShoppingBag;
      case 'document':
        return FileText;
      default:
        return Sparkles;
    }
  };

  const handleStartCustomFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoalInput.trim() || isGeneratingCustom) return;

    setClarificationStep('checking');

    try {
      const res = await fetch('/api/check-clarification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: customGoalInput.trim() }),
      });
      const data = await res.json();

      if (data && data.isSpecificEnough === false && data.clarifyingQuestion) {
        setClarifyingQuestion(data.clarifyingQuestion);
        setClarificationStep('question');
      } else {
        await executeCreateSession(customGoalInput.trim());
      }
    } catch (err) {
      console.warn('Check clarification error, fallback direct create:', err);
      await executeCreateSession(customGoalInput.trim());
    }
  };

  const executeCreateSession = async (finalPrompt: string) => {
    setClarificationStep('generating');
    setIsGeneratingCustom(true);
    try {
      await onCreateSessionFromTemplate('custom', finalPrompt);
      setCustomGoalInput('');
      setClarificationAnswer('');
      setClarifyingQuestion('');
      setClarificationStep('input');
      setShowCustomModal(false);
    } catch (err) {
      console.error(err);
      setClarificationStep('input');
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  const handleSkipClarification = () => {
    executeCreateSession(customGoalInput.trim());
  };

  const handleSubmitAnswerAndCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPrompt = clarificationAnswer.trim()
      ? `${customGoalInput.trim()}\n(Thông tin bổ sung: ${clarificationAnswer.trim()})`
      : customGoalInput.trim();
    executeCreateSession(finalPrompt);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome Banner */}
      <section className="p-6 md:p-8 rounded-3xl bg-linear-to-br from-primary/15 via-primary/5 to-surface border border-primary/20 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>AI lan tỏa sự thấu hiểu</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">
            Xin chào! Lovira có thể trợ giúp bạn làm việc gì hôm nay?
          </h2>
          <p className="text-sm md:text-base text-text-secondary leading-relaxed">
            Lovira là trợ lý đồng hành thực tế — giúp bạn chuẩn bị, theo dõi và hoàn thành từng bước trong mọi sự kiện đời sống: phỏng vấn xin việc, đi khám bệnh, làm thủ tục hành chính, mua sắm, đón người thân hay bảo hành thiết bị.
          </p>
        </div>
      </section>

      {/* Quick Action Shortcuts */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={onOpenCamera}
          className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-default hover:border-primary hover:bg-surface-raised transition-all text-left shadow-2xs group min-h-[72px]"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Camera className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-base">Nhìn giúp tôi</h3>
            <p className="text-xs text-text-secondary">Chụp ảnh phiếu khám, số thứ tự hay đơn thuốc để Lovira đọc</p>
          </div>
        </button>

        {activeSession ? (
          <button
            onClick={() => onOpenSession(activeSession.id)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-primary/10 border-2 border-primary hover:bg-primary/15 transition-all text-left shadow-2xs group min-h-[72px]"
          >
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Play className="w-6 h-6 fill-current" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold text-primary text-base">Tiếp tục phiên hiện tại</h3>
              <p className="text-xs text-text-secondary truncate max-w-[200px]">
                {activeSession.title}
              </p>
            </div>
          </button>
        ) : (
          <button
            onClick={() => onCreateSessionFromTemplate('medical')}
            className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-default hover:border-primary hover:bg-surface-raised transition-all text-left shadow-2xs group min-h-[72px]"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Stethoscope className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-base">Mở phiên Đi khám bệnh</h3>
              <p className="text-xs text-text-secondary">Chuẩn bị giấy tờ & nhắc phòng khám</p>
            </div>
          </button>
        )}

        <button
          onClick={() => setShowCustomModal(true)}
          className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-default hover:border-primary hover:bg-surface-raised transition-all text-left shadow-2xs group min-h-[72px]"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-base">Tạo phiên tùy chỉnh</h3>
            <p className="text-xs text-text-secondary">Gõ mục tiêu cá nhân để Lovira hỗ trợ tự động</p>
          </div>
        </button>
      </section>

      {/* Active Session Highlight Card */}
      {activeSession && (
        <section className="p-6 rounded-2xl bg-surface border-2 border-primary/40 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Phiên đang mở hoạt động
              </span>
            </div>
            <span className="text-xs text-text-secondary flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cập nhật gần đây</span>
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-extrabold text-text-primary">
              {activeSession.title}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {activeSession.goal}
            </p>

            {/* Next Action Box */}
            {activeSession.nextRecommendedAction && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-start gap-3">
                <span className="text-xl">👉</span>
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase text-primary tracking-wider">
                    Bước tiếp theo đề xuất:
                  </span>
                  <p className="text-sm font-bold text-text-primary">
                    {activeSession.nextRecommendedAction.title}
                  </p>
                  {activeSession.nextRecommendedAction.description && (
                    <p className="text-xs text-text-secondary">
                      {activeSession.nextRecommendedAction.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs font-medium text-text-secondary">
                Việc đã làm: {activeSession.tasks.filter(t => t.status === 'completed').length} / {activeSession.tasks.length}
              </div>
              <button
                onClick={() => onOpenSession(activeSession.id)}
                className="flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-hover transition-all"
              >
                <span>Mở màn hình làm việc</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Scenario Templates Selection */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-text-primary">
            Mẫu gợi ý nhanh
          </h3>
          <span className="text-xs text-text-secondary">Chọn mẫu sẵn hoặc tạo phiên bất kỳ</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCENARIO_TEMPLATES.map((tmpl) => {
            const Icon = getScenarioIcon(tmpl.type);
            return (
              <div
                key={tmpl.type}
                className="p-5 rounded-2xl bg-surface border border-default hover:border-primary transition-all flex flex-col justify-between space-y-4 shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h4 className="text-lg font-bold text-text-primary">{tmpl.title}</h4>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {tmpl.subtitle}
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (tmpl.type === 'custom') {
                      setShowCustomModal(true);
                    } else {
                      onCreateSessionFromTemplate(tmpl.type);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-surface-raised border border-default hover:bg-primary hover:text-white hover:border-primary font-bold text-sm transition-all text-text-primary"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {tmpl.type === 'custom' ? 'Nhập mục tiêu tùy chỉnh' : 'Tạo phiên theo mẫu này'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* All Saved Sessions List */}
      <section className="space-y-4 pt-4">
        <h3 className="text-xl font-extrabold text-text-primary">
          Danh sách các phiên hỗ trợ
        </h3>

        {(() => {
          const activeSavedSessions = sessionsList.filter((s) => s.status !== 'archived');
          if (activeSavedSessions.length === 0) {
            return (
              <div className="p-8 text-center bg-surface rounded-2xl border border-dashed border-default space-y-2">
                <p className="text-sm text-text-secondary">Chưa có phiên hỗ trợ nào được lưu.</p>
                <button
                  onClick={() => onCreateSessionFromTemplate('medical')}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm"
                >
                  Tạo phiên Đi khám bệnh đầu tiên
                </button>
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {activeSavedSessions.map((header) => {
                const Icon = getScenarioIcon(header.scenarioType);
                const isActive = activeSession?.id === header.id;

                return (
                  <div
                    key={header.id}
                    className={`p-4 rounded-2xl bg-surface border transition-all flex items-center justify-between gap-3 ${
                      isActive ? 'border-primary ring-1 ring-primary' : 'border-default hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-text-primary truncate">{header.title}</h4>
                        <span className="text-xs text-text-secondary">
                          Thao tác cuối: {new Date(header.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onOpenSession(header.id)}
                        className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold text-xs transition-all"
                      >
                        Xem phiên
                      </button>
                      <button
                        onClick={() => onDeleteSession(header.id)}
                        className="min-h-[44px] w-11 flex items-center justify-center rounded-xl border border-default text-text-secondary hover:text-danger hover:border-danger transition-all"
                        aria-label={`Xoá phiên ${header.title}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>

      {/* Custom Goal Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg p-6 bg-surface-raised border border-default rounded-2xl shadow-2xl space-y-4">
            {clarificationStep === 'input' && (
              <>
                <h3 className="text-xl font-bold text-text-primary">
                  Mô tả việc bạn cần làm
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Ví dụ: "Tôi cần ra ngân hàng làm lại thẻ ATM bị khóa", "Tôi đi nhận lương hưu ở bưu điện", hoặc "Cần tải ứng dụng VssID bảo hiểm y tế".
                </p>
                <form onSubmit={handleStartCustomFlow} className="space-y-4">
                  <textarea
                    value={customGoalInput}
                    onChange={(e) => setCustomGoalInput(e.target.value)}
                    placeholder="Nhập chi tiết mục tiêu của bạn ở đây..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-default bg-surface text-text-primary text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomModal(false)}
                      className="px-4 py-2 rounded-xl border border-default font-medium text-sm text-text-secondary min-h-[44px]"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={!customGoalInput.trim()}
                      className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 flex items-center gap-2 min-h-[44px]"
                    >
                      <span>Tạo phiên AI ngay</span>
                    </button>
                  </div>
                </form>
              </>
            )}

            {clarificationStep === 'checking' && (
              <div className="p-8 text-center space-y-3">
                <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-sm font-bold text-text-primary">
                  Lovira đang xem xét mục tiêu của bạn...
                </p>
              </div>
            )}

            {clarificationStep === 'question' && (
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Mục tiêu của bạn</span>
                  <p className="text-sm font-semibold text-text-primary bg-surface p-2.5 rounded-xl border border-default mt-1">
                    "{customGoalInput}"
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Lovira cần hỏi thêm một chút:</span>
                  </div>
                  <p className="text-sm text-text-primary font-medium leading-relaxed">
                    {clarifyingQuestion}
                  </p>
                </div>

                <form onSubmit={handleSubmitAnswerAndCreate} className="space-y-4">
                  <textarea
                    value={clarificationAnswer}
                    onChange={(e) => setClarificationAnswer(e.target.value)}
                    placeholder="Nhập thông tin bổ sung (tùy chọn)..."
                    rows={2}
                    className="w-full p-3 rounded-xl border border-default bg-surface text-text-primary text-sm focus:ring-2 focus:ring-primary"
                    autoFocus
                  />

                  {/* Equal Size & Priority Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSkipClarification}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border-2 border-default hover:border-gray-400 bg-surface font-bold text-sm text-text-primary transition-all text-center flex items-center justify-center"
                    >
                      <span>Bỏ qua, tạo phiên luôn</span>
                    </button>
                    <button
                      type="submit"
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover shadow-md transition-all text-center flex items-center justify-center"
                    >
                      <span>Trả lời & Tạo phiên</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {clarificationStep === 'generating' && (
              <div className="p-8 text-center space-y-3">
                <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-sm font-bold text-text-primary">
                  Lovira đang lập kế hoạch chi tiết cho phiên...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
