import React, { useState } from 'react';
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
  AlertCircle,
  FileText,
  Volume2,
} from 'lucide-react';
import { ReminderData } from '../home/ReminderItem';
import { sfx } from '../../utils/sfx';

interface DetailedReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveReminder: (reminder: ReminderData & { notes?: string; priority?: 'normal' | 'high' }) => void;
}

export const DetailedReminderModal: React.FC<DetailedReminderModalProps> = ({
  isOpen,
  onClose,
  onSaveReminder,
}) => {
  const [title, setTitle] = useState('');
  const [dateType, setDateType] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [timeStr, setTimeStr] = useState('08:00');
  const [repeat, setRepeat] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [category, setCategory] = useState<'medication' | 'appointment' | 'family' | 'general'>('medication');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('high');

  if (!isOpen) return null;

  const presets = [
    {
      label: '💊 Uống thuốc huyết áp',
      cat: 'medication' as const,
      time: '07:00',
      note: 'Uống 1 viên Amlodipine 5mg sau bữa ăn sáng',
    },
    {
      label: '🏥 Lịch tái khám bệnh viện',
      cat: 'appointment' as const,
      time: '08:30',
      note: 'Mang theo thẻ BHYT, Căn cước công dân và sổ khám bệnh',
    },
    {
      label: '🍲 Tắt bếp gas sau khi nấu',
      cat: 'general' as const,
      time: '11:30',
      note: 'Kiểm tra khóa van gas an toàn',
    },
    {
      label: '⚡ Đóng tiền điện & nước',
      cat: 'general' as const,
      time: '09:00',
      note: 'Đóng tiền điện tháng này qua viettelpay/ngân hàng',
    },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setTitle(p.label);
    setCategory(p.cat);
    setTimeStr(p.time);
    setNotes(p.note);
    sfx.playTap();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let timeDisplay = '';
    if (dateType === 'today') {
      timeDisplay = `Hôm nay, ${timeStr}`;
    } else if (dateType === 'tomorrow') {
      timeDisplay = `Ngày mai, ${timeStr}`;
    } else {
      const d = new Date(customDate);
      const formattedDate = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      timeDisplay = `${formattedDate}, ${timeStr}`;
    }

    if (repeat !== 'once') {
      const repeatText =
        repeat === 'daily' ? ' (Hàng ngày)' : repeat === 'weekly' ? ' (Hàng tuần)' : ' (Hàng tháng)';
      timeDisplay += repeatText;
    }

    onSaveReminder({
      id: `rem-${Date.now()}`,
      title: title.trim(),
      time: timeDisplay,
      category,
      completed: false,
      notes: notes.trim(),
      priority,
    });

    sfx.playSuccess();

    // Reset form
    setTitle('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      {/* Modal Container - Solid 100% opacity background (no transparency) */}
      <div className="bg-white dark:bg-[#1C162E] opacity-100 border-2 border-purple-500/40 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 relative z-10 text-gray-900 dark:text-white my-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF8C42] to-[#FF5CA8] text-white flex items-center justify-center shadow-md shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 dark:text-white">
                Tạo & Ghi chú Nhắc nhở
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Ghi chép đầy đủ chi tiết lịch hẹn, thuốc uống & công việc
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Presets Chips */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Gợi ý mẫu nhắc nhở nhanh:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 transition-all cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 1. Title Input */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
              1. Tên nhắc nhở <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Uống thuốc huyết áp Amlodipine..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 text-sm font-bold bg-gray-50 dark:bg-[#251D3A] border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-purple-500 outline-none text-gray-900 dark:text-white transition-all"
            />
          </div>

          {/* 2. Category Selection */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
              2. Phân loại nhắc nhở
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'medication', label: 'Uống thuốc', icon: Pill, color: 'text-amber-500 border-amber-500/40 bg-amber-500/10' },
                { id: 'appointment', label: 'Tái khám', icon: Calendar, color: 'text-purple-500 border-purple-500/40 bg-purple-500/10' },
                { id: 'family', label: 'Gia đình', icon: Users, color: 'text-pink-500 border-pink-500/40 bg-pink-500/10' },
                { id: 'general', label: 'Công việc', icon: BellRing, color: 'text-blue-500 border-blue-500/40 bg-blue-500/10' },
              ].map((item) => {
                const isSel = category === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCategory(item.id as any);
                      sfx.playTap();
                    }}
                    className={`p-2.5 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                      isSel
                        ? `${item.color} shadow-xs ring-1 ring-purple-500`
                        : 'bg-gray-50 dark:bg-[#251D3A] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Date & Time Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
              3. Thời gian nhắc nhở
            </label>

            {/* Date options */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDateType('today')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                  dateType === 'today'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-gray-50 dark:bg-[#251D3A] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setDateType('tomorrow')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                  dateType === 'tomorrow'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-gray-50 dark:bg-[#251D3A] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Ngày mai
              </button>
              <button
                type="button"
                onClick={() => setDateType('custom')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                  dateType === 'custom'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-gray-50 dark:bg-[#251D3A] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
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
                className="w-full px-3 py-2 text-xs font-bold bg-gray-50 dark:bg-[#251D3A] border border-gray-300 dark:border-gray-700 rounded-xl outline-none"
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
                    className="w-full pl-9 pr-3 py-2 text-sm font-bold bg-gray-50 dark:bg-[#251D3A] border border-gray-300 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                  Lặp lại:
                </label>
                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-bold bg-gray-50 dark:bg-[#251D3A] border border-gray-300 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-white"
                >
                  <option value="daily">🔄 Hàng ngày</option>
                  <option value="once">1️⃣ Chỉ 1 lần</option>
                  <option value="weekly">📅 Hàng tuần</option>
                  <option value="monthly">🗓️ Hàng tháng</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Notes / Instructions */}
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-purple-500" />
              <span>4. Ghi chú & Lời dặn chi tiết</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Uống 1 viên sau khi ăn sáng, nhớ uống với nhiều nước ấm..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-xs font-medium bg-gray-50 dark:bg-[#251D3A] border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-purple-500 outline-none text-gray-900 dark:text-white transition-all"
            />
          </div>

          {/* Priority & Alert sound */}
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
              className="flex-1 py-3 text-xs font-black bg-gradient-to-r from-[#7C4DFF] to-[#A45CFF] text-white rounded-xl shadow-lg hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu Nhắc Nhở Chi Tiết</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
