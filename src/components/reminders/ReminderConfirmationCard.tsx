import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  X,
  Clock,
  Calendar as CalendarIcon,
  Pill,
  Stethoscope,
  Users,
  Repeat,
  Sparkles,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import { PendingDraftReminder } from '../../types';
import { ReminderCategory, ReminderRepeat } from '../../types/reminder';

interface ReminderConfirmationCardProps {
  draft: PendingDraftReminder;
  question?: string;
  onConfirm: (draft: PendingDraftReminder) => void;
  onUpdateDraft?: (updatedDraft: PendingDraftReminder) => void;
  onCancel: () => void;
}

export const ReminderConfirmationCard: React.FC<ReminderConfirmationCardProps> = ({
  draft,
  question,
  onConfirm,
  onUpdateDraft,
  onCancel,
}) => {
  // Parse date and time from scheduledAt
  const initialDateObj = React.useMemo(() => {
    const d = new Date(draft.scheduledAt);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [draft.scheduledAt]);

  const formatDateForInput = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForInput = (d: Date) => {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [title, setTitle] = useState(draft.title);
  const [dateStr, setDateStr] = useState(() => formatDateForInput(initialDateObj));
  const [timeStr, setTimeStr] = useState(() => formatTimeForInput(initialDateObj));
  const [category, setCategory] = useState<ReminderCategory>(draft.category || 'general');
  const [repeat, setRepeat] = useState<ReminderRepeat>(draft.repeat || 'once');
  const [isModified, setIsModified] = useState(false);

  // Sync if external draft updates
  useEffect(() => {
    setTitle(draft.title);
    const d = new Date(draft.scheduledAt);
    if (!isNaN(d.getTime())) {
      setDateStr(formatDateForInput(d));
      setTimeStr(formatTimeForInput(d));
    }
    if (draft.category) setCategory(draft.category);
    if (draft.repeat) setRepeat(draft.repeat);
  }, [draft]);

  const handleApplyPreset = (minutesToAdd: number) => {
    const now = new Date();
    const target = new Date(now.getTime() + minutesToAdd * 60 * 1000);
    setDateStr(formatDateForInput(target));
    setTimeStr(formatTimeForInput(target));
    setIsModified(true);
    triggerDraftUpdate(title, formatDateForInput(target), formatTimeForInput(target), category, repeat);
  };

  const handleApplyTomorrowMorning = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    setDateStr(formatDateForInput(tomorrow));
    setTimeStr('08:00');
    setIsModified(true);
    triggerDraftUpdate(title, formatDateForInput(tomorrow), '08:00', category, repeat);
  };

  const handleApplyTonight = () => {
    const tonight = new Date();
    tonight.setHours(20, 0, 0, 0);
    if (tonight.getTime() <= Date.now()) {
      tonight.setDate(tonight.getDate() + 1);
    }
    setDateStr(formatDateForInput(tonight));
    setTimeStr('20:00');
    setIsModified(true);
    triggerDraftUpdate(title, formatDateForInput(tonight), '20:00', category, repeat);
  };

  const triggerDraftUpdate = (
    newTitle: string,
    newDate: string,
    newTime: string,
    newCat: ReminderCategory,
    newRep: ReminderRepeat
  ) => {
    if (!onUpdateDraft) return;
    try {
      const [year, month, day] = newDate.split('-').map(Number);
      const [hour, minute] = newTime.split(':').map(Number);
      const targetDate = new Date(year, month - 1, day, hour, minute, 0);
      const isoStr = !isNaN(targetDate.getTime()) ? targetDate.toISOString() : draft.scheduledAt;

      onUpdateDraft({
        ...draft,
        title: newTitle.trim() || draft.title,
        scheduledAt: isoStr,
        category: newCat,
        repeat: newRep,
      });
    } catch (e) {
      console.warn('Error updating draft reminder', e);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setIsModified(true);
    triggerDraftUpdate(val, dateStr, timeStr, category, repeat);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateStr(val);
    setIsModified(true);
    triggerDraftUpdate(title, val, timeStr, category, repeat);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTimeStr(val);
    setIsModified(true);
    triggerDraftUpdate(title, dateStr, val, category, repeat);
  };

  const handleCategorySelect = (cat: ReminderCategory) => {
    setCategory(cat);
    setIsModified(true);
    triggerDraftUpdate(title, dateStr, timeStr, cat, repeat);
  };

  const handleRepeatSelect = (rep: ReminderRepeat) => {
    setRepeat(rep);
    setIsModified(true);
    triggerDraftUpdate(title, dateStr, timeStr, category, rep);
  };

  const handleConfirmClick = () => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    const targetDate = new Date(year, month - 1, day, hour, minute, 0);
    const isoStr = !isNaN(targetDate.getTime()) ? targetDate.toISOString() : draft.scheduledAt;

    onConfirm({
      ...draft,
      title: title.trim() || draft.title,
      scheduledAt: isoStr,
      category,
      repeat,
    });
  };

  const categoryOptions: { id: ReminderCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'medication', label: 'Uống thuốc', icon: <Pill className="w-3.5 h-3.5" /> },
    { id: 'appointment', label: 'Lịch khám / Hẹn', icon: <Stethoscope className="w-3.5 h-3.5" /> },
    { id: 'family', label: 'Gia đình', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'general', label: 'Chung', icon: <Bell className="w-3.5 h-3.5" /> },
  ];

  const repeatOptions: { id: ReminderRepeat; label: string }[] = [
    { id: 'once', label: '1 lần' },
    { id: 'daily', label: 'Hàng ngày' },
    { id: 'weekly', label: 'Hàng tuần' },
    { id: 'monthly', label: 'Hàng tháng' },
  ];

  return (
    <div
      id="reminder-confirmation-card"
      className="my-3 p-4 sm:p-5 rounded-2xl border-2 border-amber-400 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-500 shadow-md backdrop-blur-sm transition-all animate-fadeIn"
      role="region"
      aria-label="Hộp thoại xác nhận và chỉnh sửa lời nhắc"
    >
      {/* Header Banner */}
      <div className="flex items-start gap-3 pb-3 border-b border-amber-200 dark:border-amber-800/60">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Bell className="w-5 h-5 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
              Xác nhận tạo lời nhắc
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 font-semibold">
                Chờ duyệt
              </span>
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-amber-900/80 dark:text-amber-200/90 mt-0.5">
            {question || 'Hệ thống chưa lưu. Bạn có thể chỉnh sửa lại tiêu đề, ngày giờ bên dưới trước khi xác nhận.'}
          </p>
        </div>
      </div>

      {/* Editable Fields Form */}
      <div className="mt-3.5 space-y-3">
        {/* Title Input */}
        <div>
          <label
            htmlFor="reminder-draft-title"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Tiêu đề lời nhắc:
          </label>
          <input
            id="reminder-draft-title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Nhập nội dung nhắc nhở..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
          />
        </div>

        {/* Date & Time Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Date Picker */}
          <div>
            <label
              htmlFor="reminder-draft-date"
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Ngày nhắc:
            </label>
            <input
              id="reminder-draft-date"
              type="date"
              value={dateStr}
              onChange={handleDateChange}
              className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>

          {/* Time Picker */}
          <div>
            <label
              htmlFor="reminder-draft-time"
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Giờ nhắc:
            </label>
            <input
              id="reminder-draft-time"
              type="time"
              value={timeStr}
              onChange={handleTimeChange}
              className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>
        </div>

        {/* Quick Time Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
            Chỉnh nhanh:
          </span>
          <button
            type="button"
            id="preset-15m"
            onClick={() => handleApplyPreset(15)}
            className="px-2 py-1 text-xs font-medium rounded-lg bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 transition-colors"
          >
            +15 phút
          </button>
          <button
            type="button"
            id="preset-30m"
            onClick={() => handleApplyPreset(30)}
            className="px-2 py-1 text-xs font-medium rounded-lg bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 transition-colors"
          >
            +30 phút
          </button>
          <button
            type="button"
            id="preset-1h"
            onClick={() => handleApplyPreset(60)}
            className="px-2 py-1 text-xs font-medium rounded-lg bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 transition-colors"
          >
            +1 giờ
          </button>
          <button
            type="button"
            id="preset-tomorrow-morning"
            onClick={handleApplyTomorrowMorning}
            className="px-2 py-1 text-xs font-medium rounded-lg bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 transition-colors"
          >
            Sáng mai 08:00
          </button>
          <button
            type="button"
            id="preset-tonight"
            onClick={handleApplyTonight}
            className="px-2 py-1 text-xs font-medium rounded-lg bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 transition-colors"
          >
            Tối nay 20:00
          </button>
        </div>

        {/* Category & Repeat Selectors */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Category */}
          <div>
            <span className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Phân loại:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {categoryOptions.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    id={`cat-select-${cat.id}`}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-amber-400'
                    }`}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Repeat */}
          <div>
            <span className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Lặp lại:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {repeatOptions.map((rep) => {
                const isSelected = repeat === rep.id;
                return (
                  <button
                    key={rep.id}
                    type="button"
                    id={`repeat-select-${rep.id}`}
                    onClick={() => handleRepeatSelect(rep.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-amber-400'
                    }`}
                  >
                    {rep.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
        <button
          type="button"
          id="btn-cancel-draft-reminder"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors shadow-sm order-2 sm:order-1"
        >
          <X className="w-4 h-4" />
          Hủy bỏ
        </button>

        <button
          type="button"
          id="btn-confirm-draft-reminder"
          onClick={handleConfirmClick}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg order-1 sm:order-2 active:scale-[0.98]"
        >
          <CheckCircle2 className="w-5 h-5 text-white" />
          Xác nhận tạo lời nhắc
        </button>
      </div>
    </div>
  );
};
