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
} from 'lucide-react';
import { Reminder } from '../../types/reminder';
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    sfx.playTap();
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    sfx.playTap();
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
    sfx.playTap();
  };

  // Days in month calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
    // Adjust for Monday start (0 = Mon, 6 = Sun)
    const startOffset = (firstDayIndex + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      isCurrentMonth: boolean;
      dateKey: string;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const selectedStr = selectedDate.toISOString().split('T')[0];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      const key = d.toISOString().split('T')[0];
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
      const key = d.toISOString().split('T')[0];
      days.push({
        date: d,
        isCurrentMonth: true,
        dateKey: key,
        isToday: key === todayStr,
        isSelected: key === selectedStr,
      });
    }

    // Next month padding to complete 42 cells grid (6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const key = d.toISOString().split('T')[0];
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

  // Map reminders to date keys
  const dateMap = useMemo(() => {
    const map = new Map<string, { reminders: Reminder[]; sessions: BriefSessionHeader[] }>();

    reminders.forEach((r) => {
      const d = new Date(r.scheduledAt);
      if (!isNaN(d.getTime())) {
        const key = d.toISOString().split('T')[0];
        if (!map.has(key)) map.set(key, { reminders: [], sessions: [] });
        map.get(key)!.reminders.push(r);
      }
    });

    sessions.forEach((s) => {
      if (s.scheduledAt) {
        const d = new Date(s.scheduledAt);
        if (!isNaN(d.getTime())) {
          const key = d.toISOString().split('T')[0];
          if (!map.has(key)) map.set(key, { reminders: [], sessions: [] });
          map.get(key)!.sessions.push(s);
        }
      }
    });

    return map;
  }, [reminders, sessions]);

  // Selected date agenda items
  const selectedDateKey = selectedDate.toISOString().split('T')[0];
  const selectedAgenda = useMemo(() => {
    return dateMap.get(selectedDateKey) || { reminders: [], sessions: [] };
  }, [dateMap, selectedDateKey]);

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

  const handleToggleComplete = (id: string) => {
    reminderService.toggleComplete(id);
    sfx.playSuccess();
    if (onShowToast) onShowToast('Đã cập nhật trạng thái');
  };

  const handleExportICS = (r: Reminder) => {
    reminderService.downloadICS(r);
    if (onShowToast) onShowToast('📅 Đã tải file lịch (.ics) về máy');
  };

  return (
    <div className="space-y-6">
      {/* Calendar Card */}
      <div className="bg-white dark:bg-[#182424] rounded-[24px] border border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-xs">
        {/* Month header & Navigation */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-[800] text-gray-900 dark:text-white">
              {monthNames[month]}, {year}
            </h3>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E] hover:bg-[#287C78]/20 transition-colors cursor-pointer"
            >
              Hôm nay
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
              aria-label="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[11px] sm:text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
          <div>T2</div>
          <div>T3</div>
          <div>T4</div>
          <div>T5</div>
          <div>T6</div>
          <div>T7</div>
          <div className="text-red-500">CN</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((d, idx) => {
            const hasData = dateMap.get(d.dateKey);
            const remCount = hasData?.reminders.length || 0;
            const sessCount = hasData?.sessions.length || 0;
            const hasEvents = remCount > 0 || sessCount > 0;

            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedDate(d.date);
                  sfx.playTap();
                }}
                className={`relative min-h-[48px] sm:min-h-[58px] p-1.5 sm:p-2 rounded-2xl flex flex-col items-center justify-between border transition-all cursor-pointer ${
                  d.isSelected
                    ? 'bg-[#287C78] text-white border-[#287C78] shadow-md scale-[1.02] z-10'
                    : d.isToday
                    ? 'bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E] border-[#287C78]/40'
                    : d.isCurrentMonth
                    ? 'bg-gray-50/70 dark:bg-[#202C2C]/40 text-gray-800 dark:text-gray-200 border-transparent hover:border-gray-300 dark:hover:border-gray-700'
                    : 'bg-transparent text-gray-400 dark:text-gray-600 border-transparent opacity-40 hover:opacity-80'
                }`}
              >
                <span className={`text-xs sm:text-sm font-[800]`}>{d.date.getDate()}</span>

                {/* Event Dots */}
                <div className="flex items-center gap-1 mt-1">
                  {hasEvents && (
                    <div className="flex items-center gap-0.5">
                      {remCount > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            d.isSelected ? 'bg-amber-300' : 'bg-[#FF701A]'
                          }`}
                        />
                      )}
                      {sessCount > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            d.isSelected ? 'bg-white' : 'bg-[#2B70E4]'
                          }`}
                        />
                      )}
                      {remCount + sessCount > 2 && (
                        <span className="text-[9px] font-black opacity-80">
                          +{remCount + sessCount - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Section */}
      <div className="bg-white dark:bg-[#182424] rounded-[24px] border border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E] flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-[800] text-gray-900 dark:text-white">
                Lịch trình ngày {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]},{' '}
                {selectedDate.getFullYear()}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedAgenda.reminders.length} nhắc nhở &bull; {selectedAgenda.sessions.length} phiên
                hỗ trợ
              </p>
            </div>
          </div>

          <button
            onClick={() => onAddReminderForDate(selectedDateKey)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#287C78] hover:bg-[#1F625F] text-white rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm việc</span>
          </button>
        </div>

        {/* Agenda Content */}
        {selectedAgenda.reminders.length === 0 && selectedAgenda.sessions.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Sparkles className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Không có lịch trình nào cho ngày này
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Bạn có thể nhấn nút "Thêm việc" để lên lịch trước cho công việc
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Reminders List */}
            {selectedAgenda.reminders.map((r) => {
              const timeDisplay = new Date(r.scheduledAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={r.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                    r.completed
                      ? 'bg-gray-50 dark:bg-[#1C2626] border-gray-200 dark:border-gray-800 opacity-60'
                      : 'bg-white dark:bg-[#202C2C] border-gray-200 dark:border-gray-700 shadow-2xs hover:border-[#287C78]'
                  }`}
                >
                  <button
                    onClick={() => handleToggleComplete(r.id)}
                    className="mt-0.5 text-gray-400 hover:text-[#287C78] transition-colors cursor-pointer shrink-0"
                    aria-label={r.completed ? 'Đánh dấu chưa xong' : 'Đánh dấu xong'}
                  >
                    {r.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-[#287C78] dark:text-[#42A39E] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {timeDisplay}
                      </span>

                      {r.repeat !== 'once' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {r.repeat === 'daily'
                            ? 'Hàng ngày'
                            : r.repeat === 'weekly'
                            ? 'Hàng tuần'
                            : 'Hàng tháng'}
                        </span>
                      )}

                      {r.priority === 'high' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Ưu tiên cao
                        </span>
                      )}
                    </div>

                    <h5
                      className={`text-sm font-[800] mt-1 ${
                        r.completed
                          ? 'line-through text-gray-400 dark:text-gray-500'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {r.title}
                    </h5>

                    {r.notes && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {r.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleExportICS(r)}
                      title="Xuất file lịch (.ics)"
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditReminder(r)}
                      className="p-1.5 text-xs font-bold text-[#287C78] hover:underline cursor-pointer"
                    >
                      Sửa
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Sessions List */}
            {selectedAgenda.sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => onOpenSession && onOpenSession(s.id)}
                className="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-400 transition-all flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">
                        Phiên hỗ trợ &bull; {s.status}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                      {s.title}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                  Mở &rarr;
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
