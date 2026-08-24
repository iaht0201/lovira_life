import React, { useState } from 'react';
import { Bell, Plus } from 'lucide-react';
import { ReminderItem, ReminderData } from './ReminderItem';

const DEFAULT_REMINDERS: ReminderData[] = [
  {
    id: 'rem-1',
    title: '💊 Uống thuốc huyết áp',
    time: 'Hôm nay, 07:00',
    category: 'medication',
  },
  {
    id: 'rem-2',
    title: '📅 Tái khám định kỳ',
    time: 'Thứ 6, 20/05/2024',
    category: 'appointment',
  },
  {
    id: 'rem-3',
    title: '👨‍👩‍👧 Họp mặt gia đình',
    time: 'CN, 22/05/2024',
    category: 'family',
  },
];

interface UpcomingRemindersProps {
  reminders?: ReminderData[];
  onAddReminder?: () => void;
}

export const UpcomingReminders: React.FC<UpcomingRemindersProps> = ({
  reminders,
  onAddReminder,
}) => {
  const [localItems, setLocalItems] = useState<ReminderData[]>(DEFAULT_REMINDERS);

  const displayItems = reminders || localItems;

  const handleToggle = (id: string) => {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  return (
    <section className="bg-lovira-card border border-lovira rounded-[22px] p-5 sm:p-6 shadow-lovira transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-[32px] h-[32px] rounded-[10px] bg-[#FFF3E8] dark:bg-[#3D2518] text-[#FF701A] dark:text-[#FFA066] flex items-center justify-center shrink-0">
            <Bell className="w-[16px] h-[16px]" />
          </div>
          <h3 className="text-[18px] sm:text-[20px] font-[800] text-lovira-title">
            Nhắc nhở sắp tới
          </h3>
        </div>

        {onAddReminder && (
          <button
            onClick={onAddReminder}
            className="w-[28px] h-[28px] rounded-full bg-lovira-badge-purple text-lovira-purple hover:opacity-80 flex items-center justify-center transition-colors cursor-pointer"
            title="Tạo & Ghi chú nhắc nhở chi tiết"
          >
            <Plus className="w-[16px] h-[16px]" />
          </button>
        )}
      </div>

      {/* Reminders List */}
      <div className="space-y-2.5">
        {displayItems.map((rem) => (
          <ReminderItem key={rem.id} reminder={rem} onToggle={handleToggle} />
        ))}
      </div>
    </section>
  );
};
