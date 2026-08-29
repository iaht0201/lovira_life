import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Pill,
  Users,
  BellRing,
  Download,
  CheckCircle2,
  Circle,
  MoreVertical,
  Layers,
  Sparkles,
  Stethoscope,
  Landmark,
  ShoppingBag,
  ListTodo,
  CalendarDays,
  CalendarRange,
  View,
  Share2,
  Trash2,
  Edit,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { Reminder, ReminderCategory } from '../../types/reminder';
import { reminderService } from '../../services/reminderService';
import { BriefSessionHeader } from '../../services/storageService';
import { sfx } from '../../utils/sfx';

interface ReminderCalendarViewProps {
  reminders: Reminder[];
  sessions: BriefSessionHeader[];
  onOpenSession?: (sessionId: string) => void;
  onAddReminderForDate: (dateStr: string) => void;
  onEditReminder: (reminder: Reminder) => void;
  onShowToast?: (msg: string) => void;
}

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

function getLocalDateKey(d: Date | string): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const ReminderCalendarView: React.FC<ReminderCalendarViewProps> = ({
  reminders,
  sessions,
  onOpenSession,
  onAddReminderForDate,
  onEditReminder,
  onShowToast,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];

  const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const fullDaysOfWeek = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else if (viewMode === 'day') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 1);
      setSelectedDate(d);
      setCurrentDate(d);
    }
    sfx.playTap();
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else if (viewMode === 'day') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 1);
      setSelectedDate(d);
      setCurrentDate(d);
    }
    sfx.playTap();
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
    sfx.playTap();
  };

  // Filter reminders based on category
  const filteredReminders = useMemo(() => {
    if (filterCategory === 'all') return reminders;
    if (filterCategory === 'medication') return reminders.filter((r) => r.category === 'medication');
    if (filterCategory === 'appointment') return reminders.filter((r) => r.category === 'appointment');
    if (filterCategory === 'family') return reminders.filter((r) => r.category === 'family');
    if (filterCategory === 'high') return reminders.filter((r) => r.priority === 'high');
    return reminders;
  }, [reminders, filterCategory]);

  // Days in month calculation (42 cells grid)
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
    const startOffset = (firstDayIndex + 6) % 7; // Monday start
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      isCurrentMonth: boolean;
      dateKey: string;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    const todayStr = getLocalDateKey(new Date());
    const selectedStr = getLocalDateKey(selectedDate);

    // Prev month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      const key = getLocalDateKey(d);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateKey: key,
        isToday: key === todayStr,
        isSelected: key === selectedStr,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = getLocalDateKey(d);
      days.push({
        date: d,
        isCurrentMonth: true,
        dateKey: key,
        isToday: key === todayStr,
        isSelected: key === selectedStr,
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const key = getLocalDateKey(d);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateKey: key,
        isToday: key === todayStr,
        isSelected: key === selectedStr,
      });
    }

    return days;
  }, [year, month, selectedDate]);

  // Days in week calculation
  const weekDays = useMemo(() => {
    const current = new Date(currentDate);
    const dayOfWeek = (current.getDay() + 6) % 7; // 0 = Mon
    const monday = new Date(current);
    monday.setDate(current.getDate() - dayOfWeek);

    const todayStr = getLocalDateKey(new Date());
    const selectedStr = getLocalDateKey(selectedDate);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = getLocalDateKey(d);
      days.push({
        date: d,
        dateKey: key,
        dayName: fullDaysOfWeek[i],
        shortDay: daysOfWeek[i],
        isToday: key === todayStr,
        isSelected: key === selectedStr,
      });
    }
    return days;
  }, [currentDate, selectedDate]);

  // Map events to date keys
  const dateMap = useMemo(() => {
    const map = new Map<string, { reminders: Reminder[]; sessions: BriefSessionHeader[] }>();

    filteredReminders.forEach((r) => {
      const d = new Date(r.scheduledAt);
      if (!isNaN(d.getTime())) {
        const key = getLocalDateKey(d);
        if (!map.has(key)) map.set(key, { reminders: [], sessions: [] });
        map.get(key)!.reminders.push(r);
      }
    });

    sessions.forEach((s) => {
      if (s.scheduledAt) {
        const d = new Date(s.scheduledAt);
        if (!isNaN(d.getTime())) {
          const key = getLocalDateKey(d);
          if (!map.has(key)) map.set(key, { reminders: [], sessions: [] });
          map.get(key)!.sessions.push(s);
        }
      }
    });

    return map;
  }, [filteredReminders, sessions]);

  // Selected date agenda items
  const selectedDateKey = getLocalDateKey(selectedDate);
  const selectedAgenda = useMemo(() => {
    const raw = dateMap.get(selectedDateKey) || { reminders: [], sessions: [] };
    // Sort reminders by time
    const sortedReminders = [...raw.reminders].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    return { reminders: sortedReminders, sessions: raw.sessions };
  }, [dateMap, selectedDateKey]);

  const handleToggleComplete = (id: string) => {
    reminderService.toggleComplete(id);
    sfx.playSuccess();
    if (onShowToast) onShowToast('Đã cập nhật trạng thái sự kiện');
  };

  const handleExportICS = (r: Reminder) => {
    reminderService.downloadICS(r);
    if (onShowToast) onShowToast('📅 Đã tải file lịch (.ics) về máy');
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'medication':
        return {
          icon: <Pill className="w-3.5 h-3.5" />,
          label: 'Thuốc men',
          bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-500',
        };
      case 'appointment':
        return {
          icon: <Stethoscope className="w-3.5 h-3.5" />,
          label: 'Khám bệnh',
          bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
          dot: 'bg-rose-500',
        };
      case 'family':
        return {
          icon: <Users className="w-3.5 h-3.5" />,
          label: 'Gia đình',
          bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
          dot: 'bg-purple-500',
        };
      default:
        return {
          icon: <BellRing className="w-3.5 h-3.5" />,
          label: 'Nhắc nhở',
          bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500',
        };
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Main Calendar Controller Header */}
      <div className="p-4 sm:p-5 rounded-[24px] bg-lovira-card border border-lovira shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Month / Period Heading & Navigator */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                className="p-2 rounded-xl border border-lovira hover:bg-lovira-card-hover text-lovira-title transition-colors cursor-pointer"
                title="Thời gian trước"
                aria-label="Thời gian trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className="p-2 rounded-xl border border-lovira hover:bg-lovira-card-hover text-lovira-title transition-colors cursor-pointer"
                title="Thời gian sau"
                aria-label="Thời gian sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-lovira-title">
              {viewMode === 'day'
                ? `Ngày ${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]}, ${selectedDate.getFullYear()}`
                : `${monthNames[month]}, ${year}`}
            </h3>

            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-extrabold rounded-xl bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E] hover:bg-[#287C78]/20 transition-all cursor-pointer"
            >
              Hôm nay
            </button>
          </div>

          {/* View Mode Switcher + Add Event */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* View Mode Buttons */}
            <div className="flex items-center gap-1 p-1 bg-lovira-input rounded-xl border border-lovira">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-[#287C78] text-white shadow-2xs'
                    : 'text-lovira-muted hover:text-lovira-title'
                }`}
              >
                Tháng
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-[#287C78] text-white shadow-2xs'
                    : 'text-lovira-muted hover:text-lovira-title'
                }`}
              >
                Tuần
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'day'
                    ? 'bg-[#287C78] text-white shadow-2xs'
                    : 'text-lovira-muted hover:text-lovira-title'
                }`}
              >
                Ngày
              </button>
            </div>

            {/* Quick Add Button */}
            <button
              onClick={() => onAddReminderForDate(selectedDateKey)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#287C78] hover:bg-[#1F625F] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm lịch</span>
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar pt-1 border-t border-lovira-subtle">
          <span className="text-[11px] font-bold text-lovira-muted shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Lọc:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'appointment', label: '🏥 Khám bệnh' },
            { id: 'medication', label: '💊 Uống thuốc' },
            { id: 'family', label: '👨‍👩‍👧 Gia đình' },
            { id: 'high', label: '⚡ Ưu tiên cao' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                filterCategory === cat.id
                  ? 'bg-[#287C78] text-white shadow-2xs'
                  : 'bg-lovira-subtle hover:bg-lovira-card-hover text-lovira-muted hover:text-lovira-title border border-lovira'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Calendar Display based on viewMode */}
      {viewMode === 'month' && (
        <div className="p-4 sm:p-6 rounded-[24px] bg-lovira-card border border-lovira shadow-2xs space-y-4">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-lovira-muted">
            {daysOfWeek.map((day, i) => (
              <div key={day} className={i === 6 ? 'text-red-500' : ''}>
                {day}
              </div>
            ))}
          </div>

          {/* 42-cell Month Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((d, idx) => {
              const hasData = dateMap.get(d.dateKey);
              const rems = hasData?.reminders || [];
              const sess = hasData?.sessions || [];
              const remCount = rems.length;
              const sessCount = sess.length;
              const hasEvents = remCount > 0 || sessCount > 0;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedDate(d.date);
                    sfx.playTap();
                  }}
                  className={`relative min-h-[58px] sm:min-h-[76px] p-1.5 sm:p-2 rounded-[18px] flex flex-col justify-between border transition-all text-left cursor-pointer group ${
                    d.isSelected
                      ? 'bg-[#287C78] text-white border-[#287C78] shadow-md scale-[1.02] z-10'
                      : d.isToday
                      ? 'bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E] border-[#287C78]/40'
                      : d.isCurrentMonth
                      ? 'bg-lovira-subtle text-lovira-title border-lovira hover:border-[#287C78]/40'
                      : 'bg-transparent text-lovira-muted border-transparent opacity-40 hover:opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs sm:text-sm font-extrabold">{d.date.getDate()}</span>
                    {d.isToday && !d.isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#287C78] dark:bg-[#42A39E]" />
                    )}
                  </div>

                  {/* Event Badges / Dots */}
                  <div className="w-full space-y-1 mt-1">
                    {hasEvents ? (
                      <div className="space-y-0.5">
                        {rems.slice(0, 2).map((r) => {
                          const badge = getCategoryBadge(r.category);
                          return (
                            <div
                              key={r.id}
                              className={`text-[9px] sm:text-[10px] font-bold truncate px-1 py-0.5 rounded-md ${
                                d.isSelected
                                  ? 'bg-white/20 text-white'
                                  : `${badge.bg} border`
                              }`}
                            >
                              {r.title}
                            </div>
                          );
                        })}
                        {remCount + sessCount > 2 && (
                          <span
                            className={`text-[8px] sm:text-[9px] font-extrabold block text-center ${
                              d.isSelected ? 'text-white/80' : 'text-lovira-muted'
                            }`}
                          >
                            +{remCount + sessCount - 2} việc nữa
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-3" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="p-4 sm:p-6 rounded-[24px] bg-lovira-card border border-lovira shadow-2xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
            {weekDays.map((d) => {
              const hasData = dateMap.get(d.dateKey);
              const rems = hasData?.reminders || [];
              const sess = hasData?.sessions || [];

              return (
                <div
                  key={d.dateKey}
                  onClick={() => {
                    setSelectedDate(d.date);
                    sfx.playTap();
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    d.isSelected
                      ? 'bg-[#287C78]/10 border-[#287C78] shadow-xs'
                      : d.isToday
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-lovira-subtle border-lovira hover:border-[#287C78]/40'
                  }`}
                >
                  <div className="border-b border-lovira-subtle pb-2 mb-2">
                    <div className="text-[11px] font-bold text-lovira-muted">{d.dayName}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-extrabold text-lovira-title">{d.date.getDate()}</span>
                      {d.isToday && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600">
                          Hôm nay
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 min-h-[90px]">
                    {rems.length === 0 && sess.length === 0 ? (
                      <span className="text-[10px] font-medium text-lovira-muted italic block pt-2">
                        Trống
                      </span>
                    ) : (
                      rems.map((r) => {
                        const badge = getCategoryBadge(r.category);
                        return (
                          <div
                            key={r.id}
                            className={`p-1.5 rounded-lg border text-[11px] font-bold truncate ${badge.bg}`}
                          >
                            <span className="block truncate">{r.title}</span>
                            <span className="text-[9px] opacity-80">
                              {new Date(r.scheduledAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Selected Day Detailed Timeline & Agenda */}
      <div className="p-4 sm:p-6 rounded-[24px] bg-lovira-card border border-lovira shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-lovira-subtle pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center font-extrabold">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-lovira-title">
                Lịch trình ngày {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]}, {selectedDate.getFullYear()}
              </h4>
              <p className="text-xs font-semibold text-lovira-muted">
                {selectedAgenda.reminders.length} nhắc nhở/lịch hẹn &bull; {selectedAgenda.sessions.length} phiên liên quan
              </p>
            </div>
          </div>

          <button
            onClick={() => onAddReminderForDate(selectedDateKey)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#287C78] hover:bg-[#1F625F] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm việc vào ngày này</span>
          </button>
        </div>

        {/* Empty State */}
        {selectedAgenda.reminders.length === 0 && selectedAgenda.sessions.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-lovira-muted/60" />
            <p className="text-sm font-extrabold text-lovira-title">
              Không có lịch trình nào cho ngày này
            </p>
            <p className="text-xs font-medium text-lovira-muted max-w-sm mx-auto">
              Bạn có thể nhấn nút "Thêm việc vào ngày này" để lên kế hoạch uống thuốc, khám bệnh hoặc dặn dò công việc.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Reminders list for the day */}
            {selectedAgenda.reminders.map((r) => {
              const timeDisplay = new Date(r.scheduledAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const badge = getCategoryBadge(r.category);

              return (
                <div
                  key={r.id}
                  className={`p-3.5 sm:p-4 rounded-[20px] border transition-all flex items-start gap-3.5 ${
                    r.status === 'completed'
                      ? 'bg-lovira-subtle/50 border-lovira opacity-60'
                      : 'bg-lovira-card border-lovira hover:border-[#287C78]/60 shadow-2xs'
                  }`}
                >
                  <button
                    onClick={() => handleToggleComplete(r.id)}
                    className="mt-0.5 text-lovira-muted hover:text-[#287C78] transition-colors cursor-pointer shrink-0"
                    title={r.status === 'completed' ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu đã hoàn thành'}
                  >
                    {r.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-[#287C78] dark:text-[#42A39E] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {timeDisplay}
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>

                      {r.repeat !== 'once' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-lovira-subtle text-lovira-muted border border-lovira">
                          {r.repeat === 'daily'
                            ? 'Hàng ngày'
                            : r.repeat === 'weekly'
                            ? 'Hàng tuần'
                            : 'Hàng tháng'}
                        </span>
                      )}

                      {r.priority === 'high' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          ⚡ Ưu tiên cao
                        </span>
                      )}
                    </div>

                    <h5
                      className={`text-sm font-extrabold mt-1.5 ${
                        r.status === 'completed'
                          ? 'line-through text-lovira-muted'
                          : 'text-lovira-title'
                      }`}
                    >
                      {r.title}
                    </h5>

                    {r.notes && (
                      <p className="text-xs font-medium text-lovira-muted mt-1 leading-relaxed">
                        {r.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleExportICS(r)}
                      title="Xuất file lịch (.ics) sang Google Calendar"
                      className="p-2 rounded-xl hover:bg-lovira-subtle text-lovira-muted hover:text-lovira-title transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditReminder(r)}
                      className="px-2.5 py-1 text-xs font-bold text-[#287C78] hover:bg-[#287C78]/10 rounded-lg transition-colors cursor-pointer"
                    >
                      Sửa
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Sessions scheduled for this date */}
            {selectedAgenda.sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => onOpenSession && onOpenSession(s.id)}
                className="p-3.5 sm:p-4 rounded-[20px] border border-[#287C78]/30 bg-[#E4F0EF]/40 dark:bg-[#203A39]/30 hover:border-[#287C78] transition-all flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-[#287C78] dark:text-[#42A39E]">
                      Phiên hỗ trợ &bull; {s.status === 'in_progress' ? 'Đang thực hiện' : 'Đã hoàn thành'}
                    </span>
                    <p className="text-xs sm:text-sm font-extrabold text-lovira-title truncate">
                      {s.title}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-extrabold text-[#287C78] dark:text-[#42A39E] shrink-0">
                  Mở phiên &rarr;
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
