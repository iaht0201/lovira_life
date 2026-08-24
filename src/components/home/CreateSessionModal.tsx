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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTopic = topicInput.trim() || 'Phiên làm việc tự do cùng Lovira';
    setIsSubmitting(true);
    sfx.playSuccess();
    try {
      // Create session with custom topic
      await onCreateFromTemplate('custom', finalTopic);
      setTopicInput('');
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
      <div className="bg-white dark:bg-[#1C162E] opacity-100 border-2 border-purple-500/40 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 relative z-10 text-gray-900 dark:text-white my-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#7C4DFF] to-[#A45CFF] text-white flex items-center justify-center shadow-md shrink-0">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 dark:text-white">
                Tạo phiên làm việc mới
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Tự do gõ chủ đề hoặc chọn gợi ý nhanh bên dưới
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
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Custom Topic Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Chủ đề / Mục tiêu công việc của chú:</span>
            </label>

            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Ví dụ: Đăng ký BHYT, Hỏi đường đi Chợ Rẫy, Học dùng Zalo..."
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                className="w-full h-12 px-4 text-sm font-bold bg-gray-50 dark:bg-[#251D3A] border-2 border-purple-500/50 dark:border-purple-400/60 rounded-2xl focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none text-gray-900 dark:text-white transition-all shadow-inner"
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
              💡 Chú có thể nhập bất kỳ nội dung hoặc mục tiêu cá nhân nào mà không bị bó buộc.
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
                        ? 'bg-purple-500/15 border-purple-600 text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'bg-gray-50 dark:bg-[#251D3A] border-gray-200 dark:border-gray-800 hover:border-purple-500/40 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
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
              disabled={isSubmitting}
              className="flex-1 py-3 text-xs font-black bg-gradient-to-r from-[#7C4DFF] to-[#A45CFF] hover:opacity-90 text-white rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang khởi tạo...' : 'Bắt đầu phiên ngay'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
