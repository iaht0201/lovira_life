import React, { useState } from 'react';
import { Briefcase, Stethoscope, ShoppingBag, Landmark, Sparkles, X, Plus } from 'lucide-react';
import { ScenarioType } from '../../types';

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
  const [selectedType, setSelectedType] = useState<ScenarioType | 'custom_goal'>('medical');
  const [customGoal, setCustomGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const presets = [
    {
      type: 'medical' as ScenarioType,
      title: '🏥 Đi khám sức khỏe',
      desc: 'Bác sĩ, phiếu khám, chuẩn bị giấy tờ & đơn thuốc',
      icon: Stethoscope,
    },
    {
      type: 'administrative' as ScenarioType,
      title: '📄 Thủ tục hành chính',
      desc: 'Làm CCCD, hộ chiếu, xác nhận cư trú, đăng ký xe',
      icon: Landmark,
    },
    {
      type: 'shopping' as ScenarioType,
      title: '🛍️ Mua sắm & Chợ',
      desc: 'Lập danh sách mua hàng, tính tiền & ghi chú',
      icon: ShoppingBag,
    },
    {
      type: 'custom' as ScenarioType,
      title: '💼 Đi phỏng vấn xin việc',
      desc: 'In CV, hồ sơ, trang phục & phỏng vấn',
      icon: Briefcase,
      customText: 'Đi phỏng vấn xin việc',
    },
    {
      type: 'custom_goal' as const,
      title: '✨ Mục tiêu tự chọn khác...',
      desc: 'Nhập bất kỳ mục tiêu đời sống nào chú muốn',
      icon: Sparkles,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedType === 'custom_goal') {
        if (!customGoal.trim()) return;
        await onCreateFromTemplate('custom', customGoal.trim());
      } else if (selectedType === 'custom') {
        await onCreateFromTemplate('custom', 'Đi phỏng vấn xin việc');
      } else {
        await onCreateFromTemplate(selectedType as ScenarioType);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 transition-all">
      {/* Container - Bottom Sheet on Mobile, Modal on Desktop */}
      <div className="w-full sm:max-w-[480px] bg-lovira-card rounded-t-[28px] sm:rounded-[28px] border border-lovira shadow-lovira-lg overflow-hidden p-6 space-y-5 animate-in slide-in-from-bottom duration-200">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-lovira-subtle pb-4">
          <div>
            <h3 className="text-[20px] font-[800] text-lovira-title">
              Tạo phiên mới
            </h3>
            <p className="text-[13px] font-[500] text-lovira-muted mt-0.5">
              Chú muốn Lovira đồng hành công việc gì ạ?
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-full bg-lovira-badge-purple text-lovira-purple hover:opacity-80 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Form Options */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {presets.map((preset) => {
              const isSelected = selectedType === preset.type;
              return (
                <button
                  type="button"
                  key={preset.title}
                  onClick={() => setSelectedType(preset.type as any)}
                  className={`w-full text-left p-3.5 rounded-[16px] border transition-all flex items-center gap-3.5 cursor-pointer ${
                    isSelected
                      ? 'bg-lovira-badge-purple border-lovira-purple text-lovira-purple shadow-xs'
                      : 'bg-lovira-card border-lovira hover:bg-lovira-card-hover text-lovira-title'
                  }`}
                >
                  <div
                    className={`w-[38px] h-[38px] rounded-[12px] flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-lovira-purple text-white' : 'bg-lovira-badge-purple text-lovira-purple'
                    }`}
                  >
                    <preset.icon className="w-[18px] h-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-[700] truncate">{preset.title}</p>
                    <p className="text-[12px] text-lovira-muted truncate mt-0.5">
                      {preset.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Input if 'custom_goal' selected */}
          {selectedType === 'custom_goal' && (
            <div className="pt-2">
              <label className="block text-[12px] font-[700] text-lovira-title mb-1">
                Mục tiêu công việc của chú:
              </label>
              <input
                type="text"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                placeholder="Ví dụ: Đi đón cháu đi học về..."
                autoFocus
                className="w-full h-[44px] px-4 rounded-[12px] bg-lovira-input border border-lovira-purple text-[14px] text-lovira-main focus:outline-none focus:ring-2 focus:ring-lovira-purple/20"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[46px] rounded-[12px] border border-lovira bg-lovira-card hover:bg-lovira-card-hover text-lovira-muted font-[700] text-[14px] transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (selectedType === 'custom_goal' && !customGoal.trim())}
              className="flex-1 h-[46px] rounded-[12px] bg-lovira-purple hover:opacity-90 text-white font-[700] text-[14px] transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-[18px] h-[18px]" />
              <span>{isSubmitting ? 'Đang tạo...' : 'Bắt đầu ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
