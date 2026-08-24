import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Pill,
  Calendar,
  Users,
  BellRing,
  Clock,
  Sparkles,
  CheckCircle2,
  FileText,
  Volume2,
  Repeat,
  Tag,
} from 'lucide-react';
import { Reminder, ReminderCategory, ReminderPriority, ReminderRepeat } from '../../types/reminder';
import { sfx } from '../../utils/sfx';
import { reminderService } from '../../services/reminderService';
import { storageService, BriefSessionHeader } from '../../services/storageService';

interface DetailedReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveReminder?: (reminder: Reminder) => void;
  initialReminder?: Reminder | null;
  initialDate?: string; // e.g. "2026-08-25"
  initialSessionId?: string;
}

export const DetailedReminderModal: React.FC<DetailedReminderModalProps> = ({
  isOpen,
  onClose,
  onSaveReminder,
  initialReminder,
  initialDate,
  initialSessionId,
}) => {
  const [title, setTitle] = useState('');
  const [dateType, setDateType] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [timeStr, setTimeStr] = useState('08:00');
  const [repeat, setRepeat] = useState<ReminderRepeat>('daily');
  const [category, setCategory] = useState<ReminderCategory>('medication');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<ReminderPriority>('normal');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [sessionsList, setSessionsList] = useState<BriefSessionHeader[]>([]);

  useEffect(() => {
    if (isOpen) {
      const list = storageService.getSessionsList();
      setSessionsList(list);

      if (initialReminder) {
        setTitle(initialReminder.title);
        setNotes(initialReminder.notes || '');
        setCategory(initialReminder.category);
        setRepeat(initialReminder.repeat);
        setPriority(initialReminder.priority);
        setSessionId(initialReminder.sessionId);

        const d = new Date(initialReminder.scheduledAt);
        if (!isNaN(d.getTime())) {
          const now = new Date();
          const isToday =
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear();

          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const isTomorrow =
            d.getDate() === tomorrow.getDate() &&
            d.getMonth() === tomorrow.getMonth() &&
            d.getFullYear() === tomorrow.getFullYear();

          if (isToday) {
            setDateType('today');
          } else if (isTomorrow) {
            setDateType('tomorrow');
          } else {
            setDateType('custom');
            setCustomDate(d.toISOString().split('T')[0]);
          }

          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          setTimeStr(`${hh}:${mm}`);
        }
      } else {
        // New reminder defaults
        setTitle('');
        setNotes('');
        setCategory('medication');
        setRepeat('daily');
        setPriority('normal');
        setSessionId(initialSessionId);

        if (initialDate) {
          setDateType('custom');
          setCustomDate(initialDate);
        } else {
          setDateType('today');
        }
        setTimeStr('08:00');
      }
    }
  }, [isOpen, initialReminder, initialDate, initialSessionId]);

  if (!isOpen) return null;

  const presets = [
    {
      label: '💊 Uống thuốc huyết áp',
      cat: 'medication' as const,
      time: '07:30',
      note: 'Uống 1 viên Amlodipine 5mg sau bữa ăn sáng',
      repeat: 'daily' as const,
      priority: 'high' as const,
    },
    {
      label: '🏥 Lịch tái khám bệnh viện',
      cat: 'appointment' as const,
      time: '08:30',
      note: 'Mang theo thẻ BHYT, Căn cước công dân và sổ khám bệnh',
      repeat: 'once' as const,
      priority: 'high' as const,
    },
    {
      label: '💧 Uống nước & tập thể dục nhẹ',
      cat: 'general' as const,
      time: '15:00',
      note: 'Xoay khớp nhẹ nhàng và uống 1 ly nước ấm',
      repeat: 'daily' as const,
      priority: 'normal' as const,
    },
    {
      label: '👨‍👩‍👧 Gọi điện hỏi thăm con cháu',
      cat: 'family' as const,
      time: '19:30',
      note: 'Hỏi thăm tình hình tuần này',
      repeat: 'weekly' as const,
      priority: 'normal' as const,
    },
  ];

  const handleApplyPreset = (p: (typeof presets)[0]) => {
    setTitle(p.label);
    setCategory(p.cat);
    setTimeStr(p.time);
    setNotes(p.note);
    setRepeat(p.repeat);
    setPriority(p.priority);
    sfx.playTap();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Calculate real ISO scheduledAt date
    const now = new Date();
    let targetDate = new Date();

    if (dateType === 'today') {
      targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateType === 'tomorrow') {
      targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else {
      const [y, m, d] = customDate.split('-').map(Number);
      targetDate = new Date(y, m - 1, d);
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    targetDate.setHours(hours || 8, minutes || 0, 0, 0);

    let savedReminder: Reminder;
    if (initialReminder) {
      const updated = reminderService.updateReminder(initialReminder.id, {
        title: title.trim(),
        notes: notes.trim(),
        category,
        scheduledAt: targetDate.toISOString(),
        repeat,
        priority,
        sessionId: sessionId || undefined,
      });
      savedReminder = updated || initialReminder;
    } else {
      savedReminder = reminderService.createReminder({
        title: title.trim(),
        notes: notes.trim(),
        category,
        scheduledAt: targetDate.toISOString(),
        repeat,
        priority,
        sessionId: sessionId || undefined,
      });
    }

    sfx.playSuccess();
    if (onSaveReminder) {
      onSaveReminder(savedReminder);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#182424] w-full max-w-xl rounded-[28px] shadow-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#287C78]/15 via-[#287C78]/5 to-transparent border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#287C78] text-white flex items-center justify-center shadow-sm">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-[800] text-gray-900 dark:text-white">
                {initialReminder ? 'Chỉnh sửa nhắc nhở' : 'Tạo lịch nhắc nhở mới'}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Lovira sẽ theo dõi và phát chuông báo đúng giờ cho bạn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick Presets */}
          {!initialReminder && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Gợi ý mẫu nhanh:</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-[#287C78]/15 hover:text-[#287C78] dark:hover:text-[#42A39E] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition-all cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 1. Title Input */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
              1. Tên nhắc nhở / Sự kiện *
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Uống thuốc huyết áp buổi sáng..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-semibold bg-gray-50 dark:bg-[#202C2C] border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-[#287C78] outline-none text-gray-900 dark:text-white transition-all"
            />
          </div>

          {/* 2. Category selection */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
              2. Phân loại nhắc nhở
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setCategory('medication')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-bold ${
                  category === 'medication'
                    ? 'border-[#FF701A] bg-[#FFF3E8] dark:bg-[#3D2518] text-[#FF701A] dark:text-[#FFA066]'
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#202C2C] text-gray-600 dark:text-gray-400'
                }`}
              >
                <Pill className="w-4 h-4" />
                <span>Thuốc uống</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('appointment')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-bold ${
                  category === 'appointment'
                    ? 'border-[#287C78] bg-[#EBF5F4] dark:bg-[#1B2928] text-[#287C78] dark:text-[#42A39E]'
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#202C2C] text-gray-600 dark:text-gray-400'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Tái khám</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('family')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-bold ${
                  category === 'family'
                    ? 'border-[#E76F91] bg-[#FDF2F4] dark:bg-[#2A181C] text-[#E76F91] dark:text-[#F296B0]'
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#202C2C] text-gray-600 dark:text-gray-400'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Gia đình</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('general')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-bold ${
                  category === 'general'
                    ? 'border-[#2B70E4] bg-[#E8F2FF] dark:bg-[#1A2A44] text-[#2B70E4] dark:text-[#70A5FF]'
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#202C2C] text-gray-600 dark:text-gray-400'
                }`}
              >
                <BellRing className="w-4 h-4" />
                <span>Khác</span>
              </button>
            </div>
          </div>

          {/* 3. Date & Time & Repeat */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-gray-50 dark:bg-[#202C2C]/50 border border-gray-200 dark:border-gray-800">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
              3. Thời gian & Tần suất lặp
            </label>

            {/* Date selection pill buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDateType('today')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                  dateType === 'today'
                    ? 'bg-[#287C78] text-white border-[#287C78]'
                    : 'bg-white dark:bg-[#202C2C] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setDateType('tomorrow')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                  dateType === 'tomorrow'
                    ? 'bg-[#287C78] text-white border-[#287C78]'
                    : 'bg-white dark:bg-[#202C2C] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Ngày mai
              </button>
              <button
                type="button"
                onClick={() => setDateType('custom')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                  dateType === 'custom'
                    ? 'bg-[#287C78] text-white border-[#287C78]'
                    : 'bg-white dark:bg-[#202C2C] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Chọn ngày
              </button>
            </div>

            {dateType === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-[#202C2C] border border-gray-300 dark:border-gray-700 rounded-xl outline-none"
              />
            )}

            {/* Time input & Frequency */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Giờ hẹn:
                </label>
                <div className="relative flex items-center">
                  <Clock className="w-4 h-4 absolute left-3 text-gray-400 pointer-events-none" />
                  <input
                    type="time"
                    required
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-bold bg-white dark:bg-[#202C2C] border border-gray-300 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Lặp lại:
                </label>
                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value as ReminderRepeat)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-[#202C2C] border border-gray-300 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-white"
                >
                  <option value="daily">🔄 Hàng ngày</option>
                  <option value="once">1️⃣ Chỉ 1 lần</option>
                  <option value="weekly">📅 Hàng tuần</option>
                  <option value="monthly">🗓️ Hàng tháng</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Link to Session (Optional) */}
          {sessionsList.length > 0 && (
            <div className="space-y-1">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#287C78]" />
                <span>Gắn với phiên hỗ trợ (Tùy chọn)</span>
              </label>
              <select
                value={sessionId || ''}
                onChange={(e) => setSessionId(e.target.value || undefined)}
                className="w-full px-3 py-2 text-xs font-medium bg-gray-50 dark:bg-[#202C2C] border border-gray-300 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-white"
              >
                <option value="">-- Không gắn phiên --</option>
                {sessionsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 5. Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#287C78]" />
              <span>Ghi chú & Lời dặn chi tiết</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Uống 1 viên sau khi ăn sáng, nhớ uống với nhiều nước ấm..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-xs font-medium bg-gray-50 dark:bg-[#202C2C] border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-[#287C78] outline-none text-gray-900 dark:text-white transition-all"
            />
          </div>

          {/* Priority Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  Âm báo ưu tiên cao
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Chuông báo to & nhắc nhở nổi bật trên màn hình
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPriority(priority === 'high' ? 'normal' : 'high')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-colors cursor-pointer ${
                priority === 'high'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {priority === 'high' ? 'BẬT' : 'TẮT'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex-1 py-3 text-xs font-black bg-gradient-to-r from-[#287C78] to-[#1F625F] text-white rounded-xl shadow-lg hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{initialReminder ? 'Lưu Thay Đổi' : 'Lưu Nhắc Nhở'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
