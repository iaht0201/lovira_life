import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Plus,
  Search,
  Calendar as CalendarIcon,
  ListFilter,
  CheckCircle2,
  Clock,
  Pill,
  Users,
  BellRing,
  Volume2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Flame,
  Download,
} from 'lucide-react';
import { DetailedReminderModal } from './DetailedReminderModal';
import { ReminderCalendarView } from './ReminderCalendarView';
import { ReminderItem } from '../home/ReminderItem';
import { Reminder, ReminderCategory } from '../../types/reminder';
import { reminderService, groupRemindersByPeriod } from '../../services/reminderService';
import { storageService, BriefSessionHeader } from '../../services/storageService';
import { sfx } from '../../utils/sfx';

interface RemindersPageProps {
  onOpenSession?: (sessionId: string) => void;
  onShowToast?: (msg: string) => void;
}

export const RemindersPage: React.FC<RemindersPageProps> = ({
  onOpenSession,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'calendar'>('upcoming');
  const [reminders, setReminders] = useState<Reminder[]>(() => reminderService.getReminders());
  const [sessions, setSessions] = useState<BriefSessionHeader[]>(() =>
    storageService.getSessionsList()
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | undefined>(undefined);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string>(() => {
    if (typeof Notification !== 'undefined') return Notification.permission;
    return 'default';
  });

  // Subscribe to updates
  useEffect(() => {
    const unsubReminders = reminderService.subscribe((list) => {
      setReminders(list);
    });
    setSessions(storageService.getSessionsList());
    return unsubReminders;
  }, []);

  const handleRequestNotification = async () => {
    const granted = await reminderService.requestNotificationPermission();
    if (typeof Notification !== 'undefined') {
      setNotificationStatus(Notification.permission);
    }
    if (granted) {
      if (onShowToast) onShowToast('🔔 Đã bật chuông thông báo thành công!');
    } else {
      if (onShowToast) onShowToast('Chưa cấp quyền thông báo');
    }
  };

  const handleOpenCreateModal = (dateStr?: string) => {
    setEditingReminder(null);
    setSelectedCalendarDate(dateStr);
    setIsModalOpen(true);
    sfx.playTap();
  };

  const handleOpenEditModal = (rem: Reminder) => {
    setEditingReminder(rem);
    setSelectedCalendarDate(undefined);
    setIsModalOpen(true);
    sfx.playTap();
  };

  const handleSaveReminder = (newRem: Reminder) => {
    setIsModalOpen(false);
    setEditingReminder(null);
    if (onShowToast) {
      onShowToast(`Đã lưu nhắc nhở: "${newRem.title}"`);
    }
  };

  const handleDeleteReminder = (id: string) => {
    reminderService.deleteReminder(id);
    if (onShowToast) onShowToast('🗑️ Đã xóa nhắc nhở');
  };

  const handleToggleComplete = (id: string) => {
    reminderService.toggleComplete(id);
    sfx.playSuccess();
    if (onShowToast) onShowToast('Đã cập nhật trạng thái');
  };

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = r.title.toLowerCase().includes(query);
        const matchNotes = r.notes?.toLowerCase().includes(query) || false;
        if (!matchTitle && !matchNotes) return false;
      }

      // Category / Filter chip
      if (selectedCategory === 'medication' && r.category !== 'medication') return false;
      if (selectedCategory === 'appointment' && r.category !== 'appointment') return false;
      if (selectedCategory === 'family' && r.category !== 'family') return false;
      if (selectedCategory === 'high_priority' && r.priority !== 'high') return false;
      if (selectedCategory === 'completed' && !r.completed) return false;
      if (selectedCategory !== 'completed' && r.completed && selectedCategory !== 'all')
        return false;

      return true;
    });
  }, [reminders, searchQuery, selectedCategory]);

  // Group active vs completed
  const activeReminders = filteredReminders.filter((r) => !r.completed);
  const completedReminders = filteredReminders.filter((r) => r.completed);

  const groupedActive = useMemo(
    () => groupRemindersByPeriod(activeReminders),
    [activeReminders]
  );

  // Category counts for badges
  const counts = useMemo(() => {
    const uncompleted = reminders.filter((r) => !r.completed);
    return {
      all: uncompleted.length,
      medication: uncompleted.filter((r) => r.category === 'medication').length,
      appointment: uncompleted.filter((r) => r.category === 'appointment').length,
      family: uncompleted.filter((r) => r.category === 'family').length,
      high_priority: uncompleted.filter((r) => r.priority === 'high').length,
      completed: reminders.filter((r) => r.completed).length,
    };
  }, [reminders]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[26px] bg-gradient-to-r from-lovira-card via-lovira-subtle to-lovira-card border border-lovira shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-[800] text-lovira-title">
              Lịch & Nhắc nhở của tôi
            </h2>
            <p className="text-xs sm:text-sm font-[500] text-lovira-muted mt-0.5">
              Theo dõi lịch uống thuốc, tái khám và kế hoạch cuộc sống
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {notificationStatus !== 'granted' && (
            <button
              onClick={handleRequestNotification}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Bật chuông báo</span>
            </button>
          )}

          <button
            onClick={() => handleOpenCreateModal()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#287C78] hover:bg-[#1F625F] text-white font-[800] text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm nhắc nhở</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher: [ Sắp tới ] [ Lịch ] */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => {
            setActiveTab('upcoming');
            sfx.playTap();
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-[800] rounded-xl transition-all cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-[#287C78] text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Danh sách Sắp tới</span>
          <span
            className={`px-2 py-0.5 text-[11px] font-black rounded-full ${
              activeTab === 'upcoming'
                ? 'bg-white/20 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('calendar');
            sfx.playTap();
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-[800] rounded-xl transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-[#287C78] text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Lịch tháng</span>
        </button>
      </div>

      {/* TAB 1: UPCOMING VIEW */}
      {activeTab === 'upcoming' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Search & Filter bar */}
          <div className="space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm kiếm nhắc nhở theo tên thuốc, địa điểm, ghi chú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#182424] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-[#287C78] text-gray-900 dark:text-white transition-all shadow-2xs"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCategory === 'all'
                    ? 'bg-[#287C78] text-white border-[#287C78]'
                    : 'bg-white dark:bg-[#182424] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                Tất cả ({counts.all})
              </button>

              <button
                onClick={() => setSelectedCategory('medication')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCategory === 'medication'
                    ? 'bg-[#FF701A] text-white border-[#FF701A]'
                    : 'bg-white dark:bg-[#182424] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Pill className="w-3.5 h-3.5" />
                <span>Thuốc uống ({counts.medication})</span>
              </button>

              <button
                onClick={() => setSelectedCategory('appointment')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCategory === 'appointment'
                    ? 'bg-[#287C78] text-white border-[#287C78]'
                    : 'bg-white dark:bg-[#182424] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Lịch khám ({counts.appointment})</span>
              </button>

              <button
                onClick={() => setSelectedCategory('family')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCategory === 'family'
                    ? 'bg-[#E76F91] text-white border-[#E76F91]'
                    : 'bg-white dark:bg-[#182424] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Gia đình ({counts.family})</span>
              </button>

              <button
                onClick={() => setSelectedCategory('high_priority')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCategory === 'high_priority'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white dark:bg-[#182424] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Ưu tiên cao ({counts.high_priority})</span>
              </button>

              <button
                onClick={() => setSelectedCategory('completed')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCategory === 'completed'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-[#182424] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã xong ({counts.completed})</span>
              </button>
            </div>
          </div>

          {/* Group: HÔM NAY (Today) */}
          {groupedActive.today.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Hôm nay &bull; {groupedActive.today.length} việc cần làm</span>
                </h4>
              </div>

              <div className="space-y-2.5">
                {groupedActive.today.map((r) => (
                  <ReminderItem
                    key={r.id}
                    reminder={r}
                    onToggle={handleToggleComplete}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteReminder}
                    onOpenSession={onOpenSession}
                    onShowToast={onShowToast}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Group: NGÀY MAI (Tomorrow) */}
          {groupedActive.tomorrow.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#287C78] dark:text-[#42A39E] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#287C78]" />
                <span>Ngày mai &bull; {groupedActive.tomorrow.length} việc</span>
              </h4>

              <div className="space-y-2.5">
                {groupedActive.tomorrow.map((r) => (
                  <ReminderItem
                    key={r.id}
                    reminder={r}
                    onToggle={handleToggleComplete}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteReminder}
                    onOpenSession={onOpenSession}
                    onShowToast={onShowToast}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Group: SẮP TỚI TRONG TUẦN & TƯƠNG LAI */}
          {(groupedActive.thisWeek.length > 0 || groupedActive.later.length > 0) && (
            <div className="space-y-3">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                <span>
                  Sắp tới &bull; {groupedActive.thisWeek.length + groupedActive.later.length} việc
                </span>
              </h4>

              <div className="space-y-2.5">
                {[...groupedActive.thisWeek, ...groupedActive.later].map((r) => (
                  <ReminderItem
                    key={r.id}
                    reminder={r}
                    onToggle={handleToggleComplete}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteReminder}
                    onOpenSession={onOpenSession}
                    onShowToast={onShowToast}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State for Active */}
          {activeReminders.length === 0 && selectedCategory !== 'completed' && (
            <div className="text-center py-12 px-4 rounded-[26px] bg-white dark:bg-[#182424] border border-gray-200 dark:border-gray-800 shadow-2xs space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-[800] text-gray-900 dark:text-white">
                  Tuyệt vời! Không còn nhắc nhở nào đang chờ
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                  Tất cả các việc cần làm, lịch uống thuốc và tái khám đã được hoàn tất hoặc chưa có
                  lịch mới.
                </p>
              </div>
              <button
                onClick={() => handleOpenCreateModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-black bg-[#287C78] hover:bg-[#1F625F] text-white rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo nhắc nhở mới</span>
              </button>
            </div>
          )}

          {/* Group: ĐÃ HOÀN THÀNH (Completed) */}
          {completedReminders.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setShowCompletedSection(!showCompletedSection)}
                className="flex items-center justify-between w-full p-3 rounded-2xl bg-gray-100/70 dark:bg-[#182424] hover:bg-gray-200/70 dark:hover:bg-[#202C2C] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                    Đã hoàn thành ({completedReminders.length})
                  </span>
                </div>
                {showCompletedSection ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {showCompletedSection && (
                <div className="space-y-2.5 animate-in fade-in">
                  {completedReminders.map((r) => (
                    <ReminderItem
                      key={r.id}
                      reminder={r}
                      onToggle={handleToggleComplete}
                      onEdit={handleOpenEditModal}
                      onDelete={handleDeleteReminder}
                      onOpenSession={onOpenSession}
                      onShowToast={onShowToast}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="animate-in fade-in duration-150">
          <ReminderCalendarView
            reminders={reminders}
            sessions={sessions}
            onOpenSession={onOpenSession}
            onAddReminderForDate={handleOpenCreateModal}
            onEditReminder={handleOpenEditModal}
            onShowToast={onShowToast}
          />
        </div>
      )}

      {/* Create / Edit Modal */}
      <DetailedReminderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReminder(null);
          setSelectedCalendarDate(undefined);
        }}
        onSaveReminder={handleSaveReminder}
        initialReminder={editingReminder}
        initialDate={selectedCalendarDate}
      />
    </div>
  );
};
