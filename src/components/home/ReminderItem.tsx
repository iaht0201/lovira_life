import React, { useState } from 'react';
import {
  Pill,
  Calendar,
  Users,
  BellRing,
  CheckCircle2,
  Circle,
  Clock,
  MoreVertical,
  Download,
  AlarmClock,
  ExternalLink,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Reminder } from '../../types/reminder';
import { reminderService, formatVietnameseReminderTime } from '../../services/reminderService';
import { sfx } from '../../utils/sfx';

export interface ReminderData {
  id: string;
  title: string;
  time: string;
  category?: 'medication' | 'appointment' | 'family' | 'general';
  completed?: boolean;
}

interface ReminderItemProps {
  reminder: Reminder | ReminderData;
  onToggle?: (id: string) => void;
  onEdit?: (reminder: Reminder) => void;
  onDelete?: (id: string) => void;
  onOpenSession?: (sessionId: string) => void;
  onShowToast?: (msg: string) => void;
  showActions?: boolean;
}

export const ReminderItem: React.FC<ReminderItemProps> = ({
  reminder,
  onToggle,
  onEdit,
  onDelete,
  onOpenSession,
  onShowToast,
  showActions = true,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  const isFullReminder = 'scheduledAt' in reminder;
  const fullReminder = isFullReminder ? (reminder as Reminder) : null;

  const category = reminder.category || 'general';
  const completed = isFullReminder ? fullReminder!.status === 'completed' : (reminder as any).completed || (reminder as any).status === 'completed' || false;

  const displayTime = isFullReminder
    ? formatVietnameseReminderTime(fullReminder!.scheduledAt, fullReminder!.repeat)
    : (reminder as ReminderData).time;

  const getIcon = () => {
    switch (category) {
      case 'medication':
        return {
          Icon: Pill,
          bg: 'bg-[#FFF3E8] dark:bg-[#3D2518]',
          text: 'text-[#FF701A] dark:text-[#FFA066]',
          border: 'border-[#FF701A]/30',
        };
      case 'appointment':
        return {
          Icon: Calendar,
          bg: 'bg-[#EBF5F4] dark:bg-[#1B2928]',
          text: 'text-[#287C78] dark:text-[#42A39E]',
          border: 'border-[#287C78]/30',
        };
      case 'family':
        return {
          Icon: Users,
          bg: 'bg-[#FDF2F4] dark:bg-[#2A181C]',
          text: 'text-[#E76F91] dark:text-[#F296B0]',
          border: 'border-[#E76F91]/30',
        };
      default:
        return {
          Icon: BellRing,
          bg: 'bg-[#E8F2FF] dark:bg-[#1A2A44]',
          text: 'text-[#2B70E4] dark:text-[#70A5FF]',
          border: 'border-[#2B70E4]/30',
        };
    }
  };

  const { Icon, bg, text, border } = getIcon();

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle) {
      onToggle(reminder.id);
    } else {
      reminderService.toggleComplete(reminder.id);
    }
    sfx.playSuccess();
  };

  const handleSnooze = (preset: '10m' | '30m' | '1h' | 'tonight' | 'tomorrow') => {
    reminderService.snoozeReminder(reminder.id, preset);
    setShowSnoozeOptions(false);
    setShowMenu(false);
    sfx.playTap();
    if (onShowToast) onShowToast('⏰ Đã hoãn nhắc nhở');
  };

  const handleExportICS = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullReminder) {
      reminderService.downloadICS(fullReminder);
      if (onShowToast) onShowToast('📅 Đã tải file lịch (.ics)');
    }
  };

  return (
    <div
      className={`group relative flex items-start gap-2.5 sm:gap-3.5 p-3 sm:p-4 rounded-[18px] sm:rounded-[20px] bg-white dark:bg-[#182424] border border-gray-200 dark:border-gray-800 hover:border-[#287C78] transition-all shadow-2xs w-full min-w-0 ${
        completed ? 'opacity-60 bg-gray-50 dark:bg-[#141C1C]' : ''
      }`}
    >
      {/* Interactive Category & Completion Check Icon */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-[14px] ${
          completed
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            : `${bg} ${text} ${border}`
        } border flex items-center justify-center shrink-0 shadow-2xs transition-all active:scale-95 cursor-pointer relative group/icon`}
        title={completed ? 'Đánh dấu chưa xong' : 'Đánh dấu xong'}
        aria-label={completed ? 'Đánh dấu chưa xong' : 'Đánh dấu xong'}
      >
        {completed ? (
          <CheckCircle2 className="w-5 h-5 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 transition-opacity group-hover/icon:opacity-20" />
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 absolute opacity-0 group-hover/icon:opacity-100 transition-opacity text-[#287C78] dark:text-[#42A39E]" />
          </>
        )}
      </button>

      {/* Info Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <h4
            className={`text-[14px] sm:text-[15px] font-[700] leading-snug line-clamp-2 ${
              completed
                ? 'line-through text-gray-400 dark:text-gray-500'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {reminder.title}
          </h4>

          {fullReminder?.priority === 'high' && !completed && (
            <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
              Ưu tiên cao
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 mt-1 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1 font-semibold text-[#287C78] dark:text-[#42A39E] shrink-0">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {displayTime}
          </span>

          {fullReminder?.notes && (
            <span className="text-gray-600 dark:text-gray-400 line-clamp-1 truncate">
              • {fullReminder.notes}
            </span>
          )}
        </div>

        {/* Linked Session Badge */}
        {fullReminder?.sessionId && (
          <div className="mt-1.5">
            <button
              onClick={() => onOpenSession && onOpenSession(fullReminder.sessionId!)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#287C78] dark:text-[#42A39E] bg-[#287C78]/10 hover:bg-[#287C78]/20 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Xem phiên liên quan</span>
            </button>
          </div>
        )}
      </div>

      {/* Actions Menu */}
      {showActions && (
        <div className="relative shrink-0 flex items-center gap-0.5 sm:gap-1">
          {/* Quick Snooze button for uncompleted reminders (desktop only shortcut) */}
          {!completed && (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
                title="Hoãn báo (Snooze)"
              >
                <AlarmClock className="w-4 h-4" />
              </button>

              {showSnoozeOptions && (
                <div className="absolute right-0 top-8 z-30 w-36 bg-white dark:bg-[#1E2B2B] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 animate-in fade-in">
                  <div className="px-2.5 py-1 text-[10px] uppercase font-black text-gray-400">
                    Hoãn nhắc:
                  </div>
                  <button
                    onClick={() => handleSnooze('10m')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    10 phút
                  </button>
                  <button
                    onClick={() => handleSnooze('30m')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    30 phút
                  </button>
                  <button
                    onClick={() => handleSnooze('1h')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    1 giờ
                  </button>
                  <button
                    onClick={() => handleSnooze('tonight')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    Tối nay (20:00)
                  </button>
                  <button
                    onClick={() => handleSnooze('tomorrow')}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    Sáng mai (08:00)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick .ics export button (desktop only shortcut) */}
          {fullReminder && (
            <button
              type="button"
              onClick={handleExportICS}
              className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer hidden sm:block"
              title="Tải file lịch (.ics) vào điện thoại"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* More options dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 z-30 w-40 bg-white dark:bg-[#1E2B2B] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 animate-in fade-in">
                {!completed && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowSnoozeOptions(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer sm:hidden"
                  >
                    <AlarmClock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Hoãn báo 10 phút</span>
                  </button>
                )}
                {fullReminder && (
                  <button
                    onClick={(e) => {
                      setShowMenu(false);
                      handleExportICS(e);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer sm:hidden"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Tải lịch (.ics)</span>
                  </button>
                )}
                {fullReminder && onEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(fullReminder);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#287C78] dark:text-[#42A39E]" />
                    <span>Chỉnh sửa</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (onDelete) {
                      onDelete(reminder.id);
                    } else {
                      reminderService.deleteReminder(reminder.id);
                    }
                    if (onShowToast) onShowToast('🗑️ Đã xóa nhắc nhở');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

