import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
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
  defaultView?: 'calendar' | 'upcoming';
}

export const RemindersPage: React.FC<RemindersPageProps> = ({
  onOpenSession,
  onShowToast,
  defaultView,
}) => {
  const location = useLocation();
  const isCalendarRoute = location.pathname.startsWith('/calendar') || defaultView === 'calendar';
  const [activeTab, setActiveTab] = useState<'calendar' | 'upcoming'>(
    isCalendarRoute ? 'calendar' : 'calendar'
  );
  const [reminders, setReminders] = useState<Reminder[]>(() => reminderService.getReminders());
  const [sessions, setSessions] = useState<BriefSessionHeader[]>(() =>
    storageService.getSessionsList()
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [deletingReminder, setDeletingReminder] = useState<Reminder | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | undefined>(undefined);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string>(() => {
    if (typeof Notification !== 'undefined') return Notification.permission;
    return 'default';
  });

  // Scroll controls for filter chips bar
  const filterBarRef = useRef<HTMLDivElement | null>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [isDraggingFilter, setIsDraggingFilter] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  const checkFilterScroll = () => {
    if (filterBarRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = filterBarRef.current;
      setShowLeftScroll(scrollLeft > 4);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  useEffect(() => {
    checkFilterScroll();
    window.addEventListener('resize', checkFilterScroll);
    return () => window.removeEventListener('resize', checkFilterScroll);
  }, [reminders, selectedCategory, activeTab]);

  const scrollFilterBar = (direction: 'left' | 'right') => {
    if (filterBarRef.current) {
      const amount = direction === 'left' ? -220 : 220;
      filterBarRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkFilterScroll, 250);
    }
  };

  const handleFilterMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!filterBarRef.current) return;
    setIsDraggingFilter(true);
    setStartX(e.pageX - filterBarRef.current.offsetLeft);
    setScrollLeftPos(filterBarRef.current.scrollLeft);
  };

  const handleFilterMouseLeaveOrUp = () => {
    setIsDraggingFilter(false);
  };

  const handleFilterMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingFilter || !filterBarRef.current) return;
    e.preventDefault();
    const x = e.pageX - filterBarRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    filterBarRef.current.scrollLeft = scrollLeftPos - walk;
    checkFilterScroll();
  };

  // Accessibility Refs for Modal Focus
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (deletingReminder) {
      cancelBtnRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setDeletingReminder(null);
        }

        // Focus Trap inside Modal
        if (e.key === 'Tab' && modalContainerRef.current) {
          const focusables = modalContainerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length > 0) {
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (lastFocusedElementRef.current) {
          lastFocusedElementRef.current.focus();
        }
      };
    }
  }, [deletingReminder]);

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
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
    const rem = reminders.find((r) => r.id === id);
    if (rem) {
      setDeletingReminder(rem);
    }
  };

  const handleConfirmDelete = () => {
    if (deletingReminder) {
      reminderService.deleteReminder(deletingReminder.id);
      if (onShowToast) onShowToast(`🗑️ Đã xóa nhắc nhở "${deletingReminder.title}"`);
      setDeletingReminder(null);
    }
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
      if (selectedCategory === 'completed' && r.status !== 'completed') return false;
      if (selectedCategory !== 'completed' && r.status === 'completed' && selectedCategory !== 'all')
        return false;

      return true;
    });
  }, [reminders, searchQuery, selectedCategory]);

  // Group active vs completed
  const activeReminders = filteredReminders.filter((r) => r.status === 'active');
  const completedReminders = filteredReminders.filter((r) => r.status === 'completed');

  const groupedActive = useMemo(
    () => groupRemindersByPeriod(activeReminders),
    [activeReminders]
  );

  // Category counts for badges
  const counts = useMemo(() => {
    const activeOnly = reminders.filter((r) => r.status === 'active');
    return {
      all: activeOnly.length,
      medication: activeOnly.filter((r) => r.category === 'medication').length,
      appointment: activeOnly.filter((r) => r.category === 'appointment').length,
      family: activeOnly.filter((r) => r.category === 'family').length,
      high_priority: activeOnly.filter((r) => r.priority === 'high').length,
      completed: reminders.filter((r) => r.status === 'completed').length,
    };
  }, [reminders]);

  return (
    <div className="w-full min-w-0 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Top Header Card */}
      <div className="w-full min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-3.5 sm:p-6 rounded-[20px] sm:rounded-[26px] bg-gradient-to-r from-lovira-card via-lovira-subtle to-lovira-card border border-lovira shadow-2xs">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-2xl font-[800] text-lovira-title truncate">
              Lịch & Nhắc nhở của tôi
            </h2>
            <p className="text-xs sm:text-sm font-[500] text-lovira-muted mt-0.5 line-clamp-1 sm:line-clamp-none">
              Theo dõi lịch uống thuốc, tái khám và kế hoạch cuộc sống
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          {notificationStatus !== 'granted' && (
            <button
              onClick={handleRequestNotification}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <Volume2 className="w-4 h-4 shrink-0" />
              <span>Bật chuông</span>
            </button>
          )}

          <button
            onClick={() => handleOpenCreateModal()}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-xl bg-[#287C78] hover:bg-[#1F625F] text-white font-[800] text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Thêm nhắc nhở</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher: [ 📅 Lịch biểu & Lịch tháng ] [ ⏰ Danh sách Sắp tới ] */}
      <div className="flex items-center gap-2 border-b border-lovira-subtle pb-2 overflow-x-auto no-scrollbar w-full min-w-0">
        <button
          onClick={() => {
            setActiveTab('calendar');
            sfx.playTap();
          }}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-[800] rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'calendar'
              ? 'bg-[#287C78] text-white shadow-2xs'
              : 'text-lovira-muted hover:text-lovira-title hover:bg-lovira-subtle'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Lịch biểu & Lịch tháng</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('upcoming');
            sfx.playTap();
          }}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-[800] rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'upcoming'
              ? 'bg-[#287C78] text-white shadow-2xs'
              : 'text-lovira-muted hover:text-lovira-title hover:bg-lovira-subtle'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Danh sách Sắp tới</span>
          <span
            className={`px-2 py-0.5 text-[11px] font-black rounded-full ${
              activeTab === 'upcoming'
                ? 'bg-white/20 text-white'
                : 'bg-lovira-subtle text-lovira-muted'
            }`}
          >
            {counts.all}
          </span>
        </button>
      </div>

      {/* TAB 1: UPCOMING VIEW */}
      {activeTab === 'upcoming' && (
        <div className="w-full min-w-0 space-y-4 sm:space-y-6 animate-in fade-in duration-150">
          {/* Search & Filter bar */}
          <div className="space-y-2.5 sm:space-y-3 w-full min-w-0">
            {/* Search input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm kiếm nhắc nhở theo tên thuốc, địa điểm, ghi chú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-[#182424] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-[#287C78] text-gray-900 dark:text-white transition-all shadow-2xs placeholder:truncate placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {/* Filter Chips Container with Scroll Controls */}
            <div className="relative group/filter w-full min-w-0">
              {/* Left Scroll Button (Desktop) */}
              {showLeftScroll && (
                <button
                  type="button"
                  onClick={() => scrollFilterBar('left')}
                  className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-[#182424] border border-gray-200 dark:border-gray-700 shadow-md items-center justify-center text-gray-700 dark:text-gray-200 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  title="Cuộn sang trái"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Right Scroll Button (Desktop) */}
              {showRightScroll && (
                <button
                  type="button"
                  onClick={() => scrollFilterBar('right')}
                  className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-[#182424] border border-gray-200 dark:border-gray-700 shadow-md items-center justify-center text-gray-700 dark:text-gray-200 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  title="Cuộn sang phải"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Scrollable Filter Bar */}
              <div
                ref={filterBarRef}
                onScroll={checkFilterScroll}
                onWheel={(e) => {
                  if (e.deltaY !== 0 && filterBarRef.current) {
                    filterBarRef.current.scrollLeft += e.deltaY;
                    checkFilterScroll();
                  }
                }}
                onMouseDown={handleFilterMouseDown}
                onMouseLeave={handleFilterMouseLeaveOrUp}
                onMouseUp={handleFilterMouseLeaveOrUp}
                onMouseMove={handleFilterMouseMove}
                className={`flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar touch-pan-x w-full min-w-0 scroll-smooth select-none ${
                  isDraggingFilter ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              >
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                    selectedCategory === 'all'
                      ? 'bg-[#287C78] text-white border-[#287C78]'
                      : 'bg-white dark:bg-[#182424] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Tất cả ({counts.all})
                </button>

                <button
                  onClick={() => setSelectedCategory('medication')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
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
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
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
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
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
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
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
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
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
          </div>

          {/* Group: HÔM NAY (Today) */}
          {groupedActive.today.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between select-none">
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
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
            <div className="space-y-2.5">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#287C78] dark:text-[#42A39E] flex items-center gap-2 select-none">
                <span className="w-2.5 h-2.5 rounded-full bg-[#287C78] shrink-0" />
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
            <div className="space-y-2.5">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2 select-none">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" />
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

      {/* Delete Confirmation Modal */}
      {deletingReminder && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-reminder-title"
          aria-describedby="delete-reminder-desc"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingReminder(null);
          }}
        >
          <div ref={modalContainerRef} className="bg-white dark:bg-[#1A2626] rounded-3xl p-6 max-w-sm w-full space-y-4 border border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 rounded-2xl bg-rose-500/10 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 id="delete-reminder-title" className="font-extrabold text-base text-gray-900 dark:text-white">
                  Xóa nhắc nhở?
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Xác nhận thao tác xóa</p>
              </div>
            </div>

            <p id="delete-reminder-desc" className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              Chú có chắc chắn muốn xóa nhắc nhở <strong className="text-gray-900 dark:text-white">"{deletingReminder.title}"</strong> không ạ? Thao tác này không thể hoàn tác.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                ref={cancelBtnRef}
                onClick={() => setDeletingReminder(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
              >
                Xóa nhắc nhở
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
