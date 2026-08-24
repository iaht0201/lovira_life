import React, { useState } from 'react';
import { UpcomingReminders } from '../home/UpcomingReminders';
import { DetailedReminderModal } from './DetailedReminderModal';
import { ReminderData } from '../home/ReminderItem';
import { Bell, Plus, CheckCircle2, Clock, Calendar } from 'lucide-react';

interface RemindersPageProps {
  onShowToast?: (msg: string) => void;
}

export const RemindersPage: React.FC<RemindersPageProps> = ({ onShowToast }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reminders, setReminders] = useState<ReminderData[]>([
    {
      id: 'rem-1',
      title: '💊 Uống thuốc huyết áp',
      time: 'Hôm nay, 07:00 (Hàng ngày)',
      category: 'medication',
    },
    {
      id: 'rem-2',
      title: '📅 Tái khám định kỳ tại BV Chợ Rẫy',
      time: 'Thứ 6, 8:30 Sáng',
      category: 'appointment',
    },
    {
      id: 'rem-3',
      title: '👨‍👩‍👧 Họp mặt gia đình cuối tuần',
      time: 'Chủ nhật, 17:00',
      category: 'family',
    },
  ]);

  const handleSaveReminder = (newRem: ReminderData & { notes?: string; priority?: 'normal' | 'high' }) => {
    setReminders((prev) => [newRem, ...prev]);
    setIsModalOpen(false);
    if (onShowToast) {
      onShowToast(`Đã thêm nhắc nhở: "${newRem.title}"`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[22px] bg-gradient-to-r from-lovira-card to-lovira-subtle border border-lovira shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-[800] text-lovira-title">
              Quản lý Nhắc nhở & Lịch hẹn
            </h2>
            <p className="text-xs sm:text-sm font-[500] text-lovira-muted mt-0.5">
              Theo dõi lịch uống thuốc, tái khám và các công việc quan trọng trong ngày
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#287C78] hover:bg-[#1F625F] text-white font-[700] text-sm transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm nhắc nhở</span>
        </button>
      </div>

      {/* Main Reminders Component */}
      <UpcomingReminders
        reminders={reminders}
        onAddReminder={() => setIsModalOpen(true)}
      />

      {/* Modal */}
      <DetailedReminderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveReminder={handleSaveReminder}
      />
    </div>
  );
};
