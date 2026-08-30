import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Play,
  ArrowRight,
  Clock,
  MoreVertical,
  CheckCircle2,
  Stethoscope,
  Landmark,
  ShoppingBag,
  FileText,
  Sparkles,
  Pin,
  Edit2,
  Trash2,
  Share2,
  Calendar,
  Layers,
  Filter,
  Check,
  Plus,
} from 'lucide-react';
import { LifeSession, ScenarioType } from '../../types';
import { BriefSessionHeader, storageService } from '../../services/storageService';
import { calculateSessionTaskProgress } from '../../services/actionEngine';

interface HistoryPageProps {
  activeSession: LifeSession | null;
  sessionsList: BriefSessionHeader[];
  onOpenSession: (id: string) => void;
  onCreateSession?: () => void;
  onDeleteSession: (id: string) => void;
  onShowToast?: (msg: string) => void;
}

type StatusFilter = 'all' | 'in_progress' | 'completed' | 'pinned';
type SortOrder = 'newest' | 'oldest' | 'alphabetical';

export const HistoryPage: React.FC<HistoryPageProps> = ({
  activeSession,
  sessionsList,
  onOpenSession,
  onCreateSession,
  onDeleteSession,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Icon mapping for scenario types with Lucide & pastel badge colors
  const getScenarioIconData = (type: ScenarioType) => {
    switch (type) {
      case 'medical':
        return {
          icon: Stethoscope,
          bg: 'bg-emerald-50 dark:bg-emerald-950/60',
          color: 'text-emerald-700 dark:text-emerald-400',
          label: 'Khám sức khỏe',
        };
      case 'administrative':
        return {
          icon: Landmark,
          bg: 'bg-blue-50 dark:bg-blue-950/60',
          color: 'text-blue-700 dark:text-blue-400',
          label: 'Thủ tục hành chính',
        };
      case 'shopping':
        return {
          icon: ShoppingBag,
          bg: 'bg-amber-50 dark:bg-amber-950/60',
          color: 'text-amber-700 dark:text-amber-400',
          label: 'Mua sắm & Đi chợ',
        };
      case 'document':
        return {
          icon: FileText,
          bg: 'bg-purple-50 dark:bg-purple-950/60',
          color: 'text-purple-700 dark:text-purple-400',
          label: 'Đọc & Hiểu tài liệu',
        };
      default:
        return {
          icon: Sparkles,
          bg: 'bg-[#E5F3F1] dark:bg-[#1E3A38]',
          color: 'text-[#176F69] dark:text-[#42A39E]',
          label: 'Phiên tùy chỉnh',
        };
    }
  };

  // Filter and sort items
  const filteredSessions = useMemo(() => {
    return sessionsList
      .filter((s) => s.status !== 'archived')
      .filter((s) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = s.title?.toLowerCase().includes(q);
          const matchGoal = s.goal?.toLowerCase().includes(q);
          if (!matchTitle && !matchGoal) return false;
        }

        // Status filter
        if (statusFilter === 'in_progress') {
          return s.status === 'in_progress' || s.status === 'draft' || s.status === 'active';
        }
        if (statusFilter === 'completed') {
          return s.status === 'completed';
        }
        if (statusFilter === 'pinned') {
          return Boolean(s.pinned);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'alphabetical') {
          return a.title.localeCompare(b.title, 'vi');
        }
        const timeA = new Date(a.updatedAt || 0).getTime();
        const timeB = new Date(b.updatedAt || 0).getTime();
        if (sortOrder === 'oldest') {
          return timeA - timeB;
        }
        // Newest (with pinned prioritized)
        if (Boolean(a.pinned) !== Boolean(b.pinned)) {
          return a.pinned ? -1 : 1;
        }
        return timeB - timeA;
      });
  }, [sessionsList, searchQuery, statusFilter, sortOrder]);

  // Group filtered sessions by relative date sections (Hôm nay, Hôm qua, Tuần này, Trước đây)
  const groupedSessions = useMemo(() => {
    const groups: { key: string; label: string; items: BriefSessionHeader[] }[] = [
      { key: 'today', label: 'Hôm nay', items: [] },
      { key: 'yesterday', label: 'Hôm qua', items: [] },
      { key: 'this_week', label: 'Tuần này', items: [] },
      { key: 'earlier', label: 'Trước đây', items: [] },
    ];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOf7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;

    for (const session of filteredSessions) {
      const sessionTime = new Date(session.updatedAt || 0).getTime();
      if (sessionTime >= startOfToday) {
        groups[0].items.push(session);
      } else if (sessionTime >= startOfYesterday) {
        groups[1].items.push(session);
      } else if (sessionTime >= startOf7Days) {
        groups[2].items.push(session);
      } else {
        groups[3].items.push(session);
      }
    }

    return groups.filter((g) => g.items.length > 0);
  }, [filteredSessions]);

  // Calculate quick stats for active session
  const activeStats = useMemo(() => {
    if (!activeSession) return null;
    const { totalUnits: total, completedUnits: completed, progressPercent: pct } = calculateSessionTaskProgress(activeSession.tasks);
    return { total, completed, pct };
  }, [activeSession]);

  const handleTogglePin = (header: BriefSessionHeader) => {
    const fullSession = storageService.getSession(header.id);
    if (fullSession) {
      fullSession.pinned = !fullSession.pinned;
      storageService.saveSession(fullSession);
      onShowToast?.(fullSession.pinned ? 'Đã ghim phiên lên đầu' : 'Đã bỏ ghim phiên');
    }
    setActiveMenuId(null);
  };

  const handleStartRename = (header: BriefSessionHeader) => {
    setRenamingId(header.id);
    setRenameValue(header.title);
    setActiveMenuId(null);
  };

  const handleSaveRename = (id: string) => {
    if (renameValue.trim()) {
      const fullSession = storageService.getSession(id);
      if (fullSession) {
        fullSession.title = renameValue.trim();
        storageService.saveSession(fullSession);
        onShowToast?.('Đã đổi tên phiên làm việc');
      }
    }
    setRenamingId(null);
  };

  // Format time display
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200 max-w-[1080px] mx-auto">
      {/* 1. Header Banner - Focused specifically on History / Reviewing */}
      <div className="p-5 sm:p-6 rounded-[20px] bg-[#E5F3F1] dark:bg-[#1E3A38] border border-[#B6DAD6] dark:border-[#2D5451] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[24px] sm:text-[28px] font-[800] text-lovira-title tracking-tight">
            Lịch sử hỗ trợ
          </h1>
          <p className="text-[14px] sm:text-[15px] font-[500] text-lovira-muted">
            Xem lại và tiếp tục những việc Lovira đã đồng hành cùng bạn.
          </p>
        </div>

        {onCreateSession && (
          <button
            type="button"
            onClick={onCreateSession}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#238A83] hover:bg-[#1D7771] text-white font-[700] text-[14px] shadow-xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo phiên mới</span>
          </button>
        )}
      </div>

      {/* 2. Active Session Card - Compact, 3px teal accent, reduced height by ~35% */}
      {activeSession && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#238A83] animate-pulse" />
            <h2 className="text-[13px] font-[800] uppercase tracking-wider text-[#176F69] dark:text-[#42A39E]">
              Phiên đang hoạt động
            </h2>
          </div>

          <div className="p-5 rounded-[16px] bg-lovira-card border-l-[3.5px] border-l-[#238A83] border-y border-r border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6] dark:hover:border-[#385654] transition-all shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {(() => {
                    const data = getScenarioIconData(activeSession.scenarioType);
                    const Icon = data.icon;
                    return (
                      <div className={`p-2 rounded-[10px] ${data.bg} ${data.color} shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    );
                  })()}
                  <h3 className="text-[17px] sm:text-[18px] font-[800] text-lovira-title">
                    {activeSession.title}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[12px] font-[700] bg-[#E5F3F1] text-[#176F69] dark:bg-[#1E3A38] dark:text-[#42A39E]">
                    {activeStats?.completed} / {activeStats?.total} việc hoàn thành
                  </span>
                </div>

                {/* Next action hint */}
                {activeSession.nextRecommendedAction && (
                  <p className="text-[13px] sm:text-[14px] text-lovira-muted font-[500] flex items-center gap-2">
                    <span className="font-[700] text-lovira-title">Bước tiếp theo:</span>
                    <span>→ {activeSession.nextRecommendedAction.title}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onOpenSession(activeSession.id)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#238A83] hover:bg-[#1D7771] text-white font-[700] text-[14px] shadow-xs transition-colors cursor-pointer"
                >
                  <span>Tiếp tục phiên</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Search & Filter Bar */}
      <section className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-lovira-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, nội dung hoặc mục tiêu..."
              className="w-full pl-10 pr-4 py-2.5 rounded-[12px] border border-[#E3E9E8] dark:border-[#243533] bg-lovira-card text-lovira-title text-[14px] font-[500] focus:outline-none focus:border-[#238A83] transition-colors placeholder:text-lovira-muted"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-[700] text-lovira-muted hover:text-lovira-title"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="px-3 py-2.5 rounded-[12px] border border-[#E3E9E8] dark:border-[#243533] bg-lovira-card text-lovira-title text-[13px] font-[600] focus:outline-none focus:border-[#238A83] cursor-pointer"
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
              <option value="alphabetical">Tên A → Z</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { id: 'all' as StatusFilter, label: 'Tất cả' },
            { id: 'in_progress' as StatusFilter, label: 'Đang làm' },
            { id: 'completed' as StatusFilter, label: 'Hoàn thành' },
            { id: 'pinned' as StatusFilter, label: 'Đã ghim' },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-[700] transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#238A83] text-white shadow-xs'
                    : 'bg-lovira-card border border-[#E3E9E8] dark:border-[#243533] text-lovira-muted hover:text-lovira-title hover:border-[#B6DAD6]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Grouped History Timeline List */}
      <section className="space-y-6">
        {groupedSessions.length === 0 ? (
          /* Empty Search or History State */
          <div className="p-10 text-center rounded-[16px] bg-lovira-card border border-dashed border-[#E3E9E8] dark:border-[#243533] space-y-3">
            <div className="w-12 h-12 rounded-[14px] bg-[#E5F3F1] dark:bg-[#1E3A38] text-[#238A83] dark:text-[#42A39E] flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[16px] font-[800] text-lovira-title">
                {searchQuery ? 'Không tìm thấy phiên nào phù hợp' : 'Chưa có phiên hỗ trợ nào'}
              </h3>
              <p className="text-[13px] text-lovira-muted max-w-sm mx-auto">
                {searchQuery
                  ? 'Hãy thử tìm bằng từ khóa khác hoặc xóa bộ lọc để xem toàn bộ lịch sử.'
                  : 'Bắt đầu một phiên hỗ trợ mới, Lovira sẽ lưu lại tiến trình tại đây.'}
              </p>
            </div>
            {onCreateSession && !searchQuery && (
              <button
                type="button"
                onClick={onCreateSession}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#238A83] text-white font-[700] text-[13px] shadow-xs cursor-pointer hover:bg-[#1D7771]"
              >
                <Plus className="w-4 h-4" />
                <span>Bắt đầu phiên đầu tiên</span>
              </button>
            )}
          </div>
        ) : (
          groupedSessions.map((group) => (
            <div key={group.key} className="space-y-3">
              {/* Date Group Heading */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-[13px] font-[800] uppercase tracking-wider text-lovira-sub">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-[#E3E9E8] dark:bg-[#243533]" />
              </div>

              {/* Items in this date group */}
              <div className="space-y-2.5">
                {group.items.map((session) => {
                  const iconData = getScenarioIconData(session.scenarioType);
                  const Icon = iconData.icon;
                  const isActive = activeSession?.id === session.id;
                  const isCompleted = session.status === 'completed';
                  const isRenaming = renamingId === session.id;

                  // Pull full session details if cached to count completed tasks
                  const full = storageService.getSession(session.id);
                  const { totalUnits: totalTasks, completedUnits: completedTasks } = calculateSessionTaskProgress(full?.tasks || []);

                  return (
                    <div
                      key={session.id}
                      className={`p-4 sm:p-4.5 rounded-[16px] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative ${
                        isActive
                          ? 'bg-[#F7FBFA] dark:bg-[#172524] border-[1.5px] border-[#238A83]'
                          : 'bg-lovira-card border border-[#E3E9E8] dark:border-[#243533] hover:border-[#B6DAD6] dark:hover:border-[#385654]'
                      }`}
                    >
                      {/* Left: Icon & Meta Info */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-[12px] ${iconData.bg} ${iconData.color} flex items-center justify-center shrink-0 mt-0.5 sm:mt-0`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          {isRenaming ? (
                            <div className="flex items-center gap-2 py-1">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="px-2.5 py-1 rounded-[8px] border border-[#238A83] text-[14px] font-[700] text-lovira-title bg-lovira-input focus:outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(session.id);
                                  if (e.key === 'Escape') setRenamingId(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(session.id)}
                                className="px-2.5 py-1 rounded-[8px] bg-[#238A83] text-white text-[12px] font-[700]"
                              >
                                Lưu
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4
                                onClick={() => onOpenSession(session.id)}
                                className="text-[15px] sm:text-[16px] font-[800] text-lovira-title truncate hover:text-[#238A83] cursor-pointer"
                              >
                                {session.title}
                              </h4>
                              {session.pinned && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-[700] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                  <Pin className="w-3 h-3" />
                                  <span>Đã ghim</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Semantic Subtitle */}
                          <div className="flex items-center gap-2 text-[12px] sm:text-[13px] font-[500] text-lovira-muted flex-wrap">
                            <span>{formatTime(session.updatedAt)}</span>
                            <span>·</span>
                            {totalTasks > 0 ? (
                              <span>
                                {completedTasks}/{totalTasks} việc
                              </span>
                            ) : (
                              <span>{iconData.label}</span>
                            )}
                            <span>·</span>
                            {isCompleted ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-[700] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Hoàn thành</span>
                              </span>
                            ) : (
                              <span className="text-[#176F69] dark:text-[#42A39E] font-[700]">
                                Đang thực hiện
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => onOpenSession(session.id)}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-[10px] bg-[#E5F3F1] dark:bg-[#1E3A38] hover:bg-[#238A83] hover:text-white text-[#176F69] dark:text-[#42A39E] font-[700] text-[13px] transition-colors cursor-pointer"
                        >
                          <span>{isCompleted ? 'Xem lại →' : 'Tiếp tục →'}</span>
                        </button>

                        {/* More Menu Popup */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === session.id ? null : session.id)}
                            className="p-1.5 rounded-[8px] text-lovira-muted hover:text-lovira-title hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            aria-label="Tùy chọn khác"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === session.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-44 rounded-[12px] bg-lovira-card border border-[#E3E9E8] dark:border-[#243533] shadow-lg py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100"
                              onMouseLeave={() => setActiveMenuId(null)}
                            >
                              <button
                                type="button"
                                onClick={() => handleStartRename(session)}
                                className="w-full px-3 py-2 text-left text-[13px] font-[600] text-lovira-title hover:bg-lovira-input flex items-center gap-2 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-lovira-muted" />
                                <span>Đổi tên phiên</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTogglePin(session)}
                                className="w-full px-3 py-2 text-left text-[13px] font-[600] text-lovira-title hover:bg-lovira-input flex items-center gap-2 cursor-pointer"
                              >
                                <Pin className="w-3.5 h-3.5 text-lovira-muted" />
                                <span>{session.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}</span>
                              </button>

                              <div className="border-t border-[#E3E9E8] dark:border-[#243533] my-1" />

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onDeleteSession(session.id);
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-[600] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>Xóa phiên...</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};
