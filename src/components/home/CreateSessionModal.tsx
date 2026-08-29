import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Plus,
  Stethoscope,
  Landmark,
  ShoppingBag,
  Briefcase,
  Smartphone,
  Car,
  Plane,
  Eye,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { ScenarioType } from '../../types';
import { sfx } from '../../utils/sfx';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFromTemplate: (type: ScenarioType, customGoal?: string) => Promise<void>;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onCreateFromTemplate,
}) => {
  const [topicInput, setTopicInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [chosenGoal, setChosenGoal] = useState('');

  if (!isOpen) return null;

  const quickTopics = [
    {
      title: '🏥 Đi khám sức khỏe',
      desc: 'Bác sĩ, phiếu khám, đơn thuốc & xét nghiệm',
      scenario: 'medical' as ScenarioType,
      text: 'Đi khám sức khỏe tại bệnh viện',
      icon: Stethoscope,
    },
    {
      title: '📄 Làm thủ tục hành chính',
      desc: 'Làm CCCD, hộ chiếu, xác nhận cư trú, sổ đỏ',
      scenario: 'administrative' as ScenarioType,
      text: 'Làm thủ tục hành chính & giấy tờ',
      icon: Landmark,
    },
    {
      title: '🛒 Mua sắm & Đi chợ',
      desc: 'Lập danh sách mua sắm, tính tiền & ghi chú',
      scenario: 'shopping' as ScenarioType,
      text: 'Lập danh sách đi chợ & mua sắm',
      icon: ShoppingBag,
    },
    {
      title: '📱 Hỏi cách dùng điện thoại',
      desc: 'Cách dùng Zalo, gửi ảnh, gọi video, đọc tin tức',
      scenario: 'custom' as ScenarioType,
      text: 'Hướng dẫn sử dụng điện thoại & Zalo',
      icon: Smartphone,
    },
    {
      title: '🚗 Đăng ký xe & Bằng lái',
      desc: 'Đổi bằng lái, đăng ký xe máy/ô tô',
      scenario: 'custom' as ScenarioType,
      text: 'Đăng ký xe & Đổi bằng lái',
      icon: Car,
    },
    {
      title: '💼 Đi xin việc & Phỏng vấn',
      desc: 'Hồ sơ, CV, trang phục & câu hỏi phỏng vấn',
      scenario: 'custom' as ScenarioType,
      text: 'Đi phỏng vấn & Chuẩn bị hồ sơ xin việc',
      icon: Briefcase,
    },
  ];

  const handleSelectTopic = (text: string) => {
    setTopicInput(text);
    sfx.playTap();
  };

  const handleSubmitInput = (e: React.FormEvent) => {
    e.preventDefault();
    const goal = topicInput.trim() || 'Phiên làm việc tự do cùng Lovira';
    setChosenGoal(goal);
    setStep('confirm');
    sfx.playTap();
  };

  const handleConfirmCreateSession = async () => {
    setIsSubmitting(true);
    sfx.playSuccess();
    try {
      await onCreateFromTemplate('custom', chosenGoal);
      setTopicInput('');
      setStep('input');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      {/* Modal Container - Solid 100% opacity background (no transparency) */}
      <div className="bg-white dark:bg-[#182222] opacity-100 border-2 border-[#287C78]/40 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 relative z-10 text-gray-900 dark:text-white my-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#287C78] to-[#1F625F] text-white flex items-center justify-center shadow-md shrink-0">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 dark:text-white">
                Bạn đang cần làm gì?
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Hãy nói việc bạn sắp làm, Lovira sẽ đề xuất cách hỗ trợ phù hợp.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Form */}
        {step === 'input' ? (
          <form onSubmit={handleSubmitInput} className="space-y-4">
            
            {/* Custom Topic Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-[#287C78] dark:text-[#42A39E] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#287C78]" />
                <span>Việc bạn chuẩn bị thực hiện:</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="Ví dụ: Mai tôi đi khám bệnh, Chiều tôi phải ra ngân hàng..."
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  className="w-full h-12 px-4 text-sm font-bold bg-gray-50 dark:bg-[#202C2C] border-2 border-[#287C78]/50 dark:border-[#42A39E]/60 rounded-2xl focus:border-[#287C78] focus:ring-2 focus:ring-[#287C78]/20 outline-none text-gray-900 dark:text-white transition-all shadow-inner"
                />
                {topicInput && (
                  <button
                    type="button"
                    onClick={() => setTopicInput('')}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 pl-1 font-medium">
                💡 Bạn có thể nói những việc đời thường như &quot;Mai đi khám&quot;, &quot;Cần làm lại BHYT&quot;... Lovira sẽ hỏi bạn cách hỗ trợ thích hợp.
              </p>
            </div>

            {/* Quick Topic Chips / Suggestions */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Hoặc bấm chọn nhanh các chủ đề gợi ý phổ biến:</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {quickTopics.map((topic) => {
                  const isSelected = topicInput === topic.text;
                  const Icon = topic.icon;
                  return (
                    <button
                      key={topic.title}
                      type="button"
                      onClick={() => handleSelectTopic(topic.text)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-[#287C78]/15 border-[#287C78] text-[#287C78] dark:text-[#42A39E] shadow-xs'
                          : 'bg-gray-50 dark:bg-[#202C2C] border-gray-200 dark:border-gray-800 hover:border-[#287C78]/40 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#287C78] text-white'
                            : 'bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold truncate">{topic.title}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                          {topic.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-700 dark:text-gray-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-3 text-xs font-black bg-gradient-to-r from-[#287C78] to-[#1F625F] hover:opacity-90 text-white rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Tiếp tục</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#E4F0EF] dark:bg-[#203A39] border border-[#287C78]/30 space-y-2">
              <h4 className="text-sm font-bold text-[#287C78] dark:text-[#42A39E] flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Xác nhận khởi tạo phiên làm việc
              </h4>
              <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed font-medium">
                Lovira sẽ khởi tạo phiên hỗ trợ từng bước cho mục tiêu: <strong>&ldquo;{chosenGoal}&rdquo;</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={isSubmitting}
                className="flex-1 py-3 text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateSession}
                disabled={isSubmitting}
                className="flex-1 py-3 text-xs font-black bg-gradient-to-r from-[#287C78] to-[#1F625F] hover:opacity-90 text-white rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang tạo...' : 'Xác nhận tạo phiên'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
