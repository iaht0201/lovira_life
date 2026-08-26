import React, { useState } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Plus,
  Pill,
  Sparkles,
  CheckSquare,
  AlertTriangle,
  Clock,
  ChevronRight,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { AppNotification, NotificationType } from '../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAll: () => void;
  onResetDefaults: () => void;
  onAddNotification: (data: {
    title: string;
    message: string;
    type: NotificationType;
    actionTab?: any;
  }) => void;
  onNavigate?: (tab: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAll,
  onResetDefaults,
  onAddNotification,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'reminder' | 'system'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<NotificationType>('reminder');

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return !item.read;
    if (filter === 'reminder') return item.type === 'reminder' || item.type === 'medical';
    if (filter === 'system') return item.type === 'system' || item.type === 'task' || item.type === 'warning';
    return true;
  });

  const handleCreateNotif = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddNotification({
      title: newTitle.trim(),
      message: newMessage.trim() || 'Nhắc nhở từ Lovira',
      type: newType,
      actionTab: newType === 'medical' || newType === 'reminder' ? 'reminders' : 'dashboard',
    });
    setNewTitle('');
    setNewMessage('');
    setShowAddForm(false);
  };

  const getNotifIcon = (type: NotificationType) => {
    switch (type) {
      case 'medical':
        return <Pill className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      case 'task':
        return <CheckSquare className="w-5 h-5 text-[#287C78] dark:text-[#42A39E]" />;
      case 'system':
      default:
        return <Sparkles className="w-5 h-5 text-[#287C78] dark:text-[#42A39E]" />;
    }
  };

  const getNotifBg = (type: NotificationType) => {
    switch (type) {
      case 'medical':
        return 'bg-emerald-500/15 border-emerald-500/30';
      case 'reminder':
        return 'bg-amber-500/15 border-amber-500/30';
      case 'warning':
        return 'bg-rose-500/15 border-rose-500/30';
      case 'task':
        return 'bg-teal-500/15 border-teal-500/30';
      case 'system':
      default:
        return 'bg-[#287C78]/15 border-[#287C78]/30';
    }
  };

  const handleNotificationClick = (item: AppNotification) => {
    if (!item.read) {
      onMarkAsRead(item.id);
    }
    if (item.actionTab && onNavigate) {
      onNavigate(item.actionTab);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop - Darkened for strong depth & contrast */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container - Solid 100% opacity background (no transparency) */}
      <div className="relative z-10 w-full sm:w-[440px] md:w-[480px] h-full max-h-[100dvh] bg-white dark:bg-slate-900 opacity-100 border-l-2 border-[#287C78]/30 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 text-gray-900 dark:text-white">
        
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#287C78] to-[#1F625F] text-white flex items-center justify-center shadow-md shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
                  Thông báo
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-black rounded-full bg-[#E76F91] text-white">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Nhắc nhở y tế, công việc và cập nhật hệ thống
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="Đóng thông báo"
            aria-label="Đóng thông báo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Quick Actions */}
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#182222] space-y-3 shrink-0">
          {/* Action Buttons Row */}
          <div className="flex items-center justify-between text-xs font-bold gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-[#287C78] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Tất cả ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filter === 'unread'
                    ? 'bg-[#E76F91] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Chưa đọc ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('reminder')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filter === 'reminder'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Nhắc nhở
              </button>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-2.5 py-1.5 rounded-xl bg-[#E4F0EF] dark:bg-[#203A39] text-[#287C78] dark:text-[#42A39E] font-extrabold flex items-center gap-1 hover:bg-[#287C78]/20 transition-colors cursor-pointer shrink-0"
              title="Thêm thông báo mới"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo mới</span>
            </button>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
            {unreadCount > 0 ? (
              <button
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Đọc tất cả</span>
              </button>
            ) : (
              <span className="text-gray-400">Đã đọc hết</span>
            )}

            {notifications.length > 0 ? (
              <button
                onClick={onClearAll}
                className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-bold hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hết</span>
              </button>
            ) : (
              <button
                onClick={onResetDefaults}
                className="flex items-center gap-1 text-[#287C78] dark:text-[#42A39E] font-bold hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục thông báo mẫu</span>
              </button>
            )}
          </div>
        </div>

        {/* Optional Add Notification Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateNotif}
            className="p-4 bg-[#EBF5F4] dark:bg-[#202C2C] border-b border-[#287C78]/20 space-y-3 animate-in slide-in-from-top duration-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#287C78] dark:text-[#42A39E] flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Thêm nhắc nhở / thông báo mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                Hủy
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Tiêu đề thông báo (ví dụ: Uống thuốc huyết áp)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-[#182222] border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#287C78] outline-none text-gray-900 dark:text-white"
              />
              <textarea
                placeholder="Nội dung chi tiết (ví dụ: Uống 1 viên sau khi ăn sáng)..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-[#182222] border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#287C78] outline-none text-gray-900 dark:text-white"
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as NotificationType)}
                  className="px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-[#182222] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 outline-none"
                >
                  <option value="reminder">🔔 Nhắc nhở</option>
                  <option value="medical">💊 Y tế / Thuốc</option>
                  <option value="task">📋 Công việc</option>
                  <option value="warning">⚠️ Cảnh báo</option>
                  <option value="system">🌸 Hệ thống</option>
                </select>

                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-extrabold bg-[#287C78] hover:bg-[#1F625F] text-white rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Lưu thông báo
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Notifications List Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto">
                <Bell className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                Không có thông báo nào trong mục này
              </p>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Tất cả thông báo hoặc nhắc nhở quan trọng sẽ hiển thị ngay tại đây.
              </p>
              <button
                onClick={onResetDefaults}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#287C78]/10 text-[#287C78] dark:text-[#42A39E] text-xs font-bold hover:bg-[#287C78]/20 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Khôi phục danh sách mặc định
              </button>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`group relative p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                  item.read
                    ? 'bg-gray-50/80 dark:bg-[#202C2C]/50 border-gray-200 dark:border-gray-800 opacity-80 hover:opacity-100 hover:border-[#287C78]/40'
                    : 'bg-white dark:bg-[#243232] border-[#287C78]/50 dark:border-[#42A39E]/60 shadow-md hover:shadow-lg hover:border-[#287C78]'
                }`}
              >
                {/* Type Icon Badge */}
                <div
                  className={`p-2.5 rounded-xl border shrink-0 flex items-center justify-center ${getNotifBg(
                    item.type
                  )}`}
                >
                  {getNotifIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-sm font-black leading-snug line-clamp-2 ${
                        item.read
                          ? 'text-gray-700 dark:text-gray-300'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between pt-1.5 text-[11px] font-bold text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.timestamp}
                    </span>

                    {item.actionTab && (
                      <span className="text-[#287C78] dark:text-[#42A39E] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        <span>Xem chi tiết</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Unread indicator dot */}
                {!item.read && (
                  <span
                    className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-[#E76F91] ring-2 ring-white dark:ring-[#243232]"
                    title="Chưa đọc"
                  />
                )}

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNotification(item.id);
                  }}
                  className="absolute bottom-3.5 right-3 p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-500/15 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Xóa thông báo"
                  aria-label="Xóa thông báo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#162222] flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
          <span>{notifications.length} thông báo trong hệ thống</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
