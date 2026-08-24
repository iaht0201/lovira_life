import React from 'react';
import { Sparkles, Pill, CalendarCheck, CheckSquare, ArrowRight } from 'lucide-react';

export const LoviraSuggestionsCard: React.FC = () => {
  const suggestions = [
    {
      id: 'sug-1',
      icon: Pill,
      iconBg: 'bg-[#FFF3E8] dark:bg-[#3D2518] text-[#FF701A] dark:text-[#FFA066]',
      text: 'Bạn có lịch uống thuốc huyết áp lúc 07:00 hàng ngày.',
      actionText: 'Đã uống',
    },
    {
      id: 'sug-2',
      icon: CalendarCheck,
      iconBg: 'bg-[#F1E9FF] dark:bg-[#2F2154] text-[#7C4DFF] dark:text-[#C49BFF]',
      text: 'Thứ 6 tuần này có lịch tái khám định kỳ tại Bệnh viện Chợ Rẫy.',
      actionText: 'Xem lịch',
    },
    {
      id: 'sug-3',
      icon: CheckSquare,
      iconBg: 'bg-[#FFEBF5] dark:bg-[#3D1A2B] text-[#E63988] dark:text-[#FF70B5]',
      text: 'Bạn có muốn Lovira chuẩn bị danh sách ghi chú trước khi đi khám không?',
      actionText: 'Tạo ngay',
    },
  ];

  return (
    <section className="bg-lovira-card border border-lovira rounded-[22px] p-5 shadow-lovira transition-all space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[32px] h-[32px] rounded-[10px] bg-lovira-badge-purple text-lovira-purple flex items-center justify-center shrink-0">
            <Sparkles className="w-[16px] h-[16px]" />
          </div>
          <h3 className="text-[18px] font-[800] text-lovira-title">
            Lovira gợi ý hôm nay
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-lovira-purple border border-primary/20">
          AI Assistant
        </span>
      </div>

      {/* Suggestion List */}
      <div className="space-y-3">
        {suggestions.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="p-3 sm:p-3.5 rounded-[16px] bg-lovira-surface border border-lovira-subtle hover:border-lovira-purple transition-all flex items-start gap-3 group"
            >
              <div className={`w-[34px] h-[34px] rounded-[10px] ${item.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon className="w-[16px] h-[16px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-[600] text-lovira-title leading-snug">
                  {item.text}
                </p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-[700] text-lovira-purple hover:underline cursor-pointer"
                >
                  <span>{item.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
