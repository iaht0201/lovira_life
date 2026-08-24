import React, { useState, useEffect } from 'react';
import { Bell, Plus, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { ReminderItem } from './ReminderItem';
import { Reminder } from '../../types/reminder';
import { reminderService } from '../../services/reminderService';
import { sfx } from '../../utils/sfx';

interface UpcomingRemindersProps {
  reminders?: Reminder[];
  onAddReminder?: () => void;
  onNavigateToReminders?: () => void;
  onOpenSession?: (sessionId: string) => void;
  onShowToast?: (msg: string) => void;
  maxItems?: number;
}

export const UpcomingReminders: React.FC<UpcomingRemindersProps> = ({
  reminders: propReminders,
  onAddReminder,
  onNavigateToReminders,
  onOpenSession,
  onShowToast,
  maxItems = 4,
}) => {
  const [reminders, setReminders] = useState<Reminder[]>(() =>
    propReminders ? propReminders : reminderService.getUpcomingReminders()
  );

  useEffect(() => {
    if (propReminders) {
      setReminders(propReminders);
      return;
    }

    const unsubscribe = reminderService.subscribe((all) => {
      // Filter uncompleted and upcoming
      const upcoming = all
        .filter((r) => r.status === 'active')
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      setReminders(upcoming);
    });

    return unsubscribe;
  }, [propReminders]);

  const displayList = maxItems ? reminders.slice(0, maxItems) : reminders;

  const handleToggle = (id: string) => {
    reminderService.toggleComplete(id);
    sfx.playSuccess();
    if (onShowToast) onShowToast('Đã đánh dấu hoàn thành');
  };

  return (
    <section className="bg-white dark:bg-[#182424] border border-gray-200 dark:border-gray-800 rounded-[24px] p-5 sm:p-6 shadow-xs transition-colors space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FFF3E8] dark:bg-[#3D2518] text-[#FF701A] dark:text-[#FFA066] flex items-center justify-center shrink-0 shadow-2xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-[800] text-gray-900 dark:text-white">
              Nhắc nhở & Lịch hẹn
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {reminders.length > 0
                ? `${reminders.length} việc cần chú ý sắp tới`
                : 'Đã hoàn thành tất cả việc!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAddReminder && (
            <button
              onClick={onAddReminder}
              className="p-2 rounded-xl bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E] hover:bg-[#287C78]/20 flex items-center justify-center transition-colors cursor-pointer"
              title="Thêm nhắc nhở mới"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          {onNavigateToReminders && (
            <button
              onClick={onNavigateToReminders}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#287C78] dark:text-[#42A39E] hover:bg-[#287C78]/10 transition-colors cursor-pointer"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Reminders List */}
      {displayList.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-2xl bg-gray-50 dark:bg-[#202C2C]/50 border border-dashed border-gray-200 dark:border-gray-800">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
            Không có lịch hẹn nào sắp tới!
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Bạn có thể tạo nhắc nhở uống thuốc, đi khám bệnh hoặc việc cần làm
          </p>
          {onAddReminder && (
            <button
              onClick={onAddReminder}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#287C78] hover:bg-[#1F625F] text-white rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo nhắc nhở đầu tiên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayList.map((rem) => (
            <ReminderItem
              key={rem.id}
              reminder={rem}
              onToggle={handleToggle}
              onOpenSession={onOpenSession}
              onShowToast={onShowToast}
            />
          ))}
        </div>
      )}
    </section>
  );
};
