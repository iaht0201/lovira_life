import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  User,
  FileCheck,
  MessageSquare,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { ImportantFact, ImportantFactType } from '../../types';

interface ImportantFactsPanelProps {
  facts: ImportantFact[];
  onAddFact: (fact: { category: ImportantFactType; title: string; value: string }) => void;
  onDeleteFact: (factId: string) => void;
}

export const ImportantFactsPanel: React.FC<ImportantFactsPanelProps> = ({
  facts,
  onAddFact,
  onDeleteFact,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState<ImportantFactType>('requirement');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');

  const getCategoryConfig = (type: ImportantFactType) => {
    switch (type) {
      case 'date':
      case 'time':
        return { label: 'Thời gian & Lịch hẹn', icon: Clock, color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30' };
      case 'location':
        return { label: 'Địa điểm / Số phòng', icon: MapPin, color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30' };
      case 'person':
        return { label: 'Người liên quan', icon: User, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
      case 'requirement':
        return { label: 'Giấy tờ cần có', icon: FileCheck, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'warning':
        return { label: '⚠️ Cảnh báo y tế / Lưu ý', icon: AlertTriangle, color: 'text-red-600 dark:text-red-400 bg-red-500/15 border-red-500/40 font-bold' };
      case 'instruction':
      default:
        return { label: 'Hướng dẫn / Chỉ dẫn', icon: MessageSquare, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !value.trim()) return;
    onAddFact({ category, title: title.trim(), value: value.trim() });
    setTitle('');
    setValue('');
    setShowAddForm(false);
  };

  return (
    <section className="p-5 rounded-2xl bg-surface border border-default shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            Thông tin quan trọng
          </h3>
          <p className="text-xs text-text-secondary">
            Giấy tờ, địa điểm, bác sĩ và lưu ý được Lovira trích xuất
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 min-h-[44px] px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold text-xs transition-all"
          aria-label="Thêm thông tin quan trọng"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Thêm thủ công</span>
        </button>
      </div>

      {/* Manual Add Form */}
      {showAddForm && (
        <form onSubmit={handleSubmitAdd} className="p-4 rounded-xl border border-primary/30 bg-surface-raised space-y-3 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ImportantFactType)}
              className="p-2.5 rounded-lg border border-default bg-surface text-text-primary text-xs font-medium"
            >
              <option value="requirement">📋 Giấy tờ cần có</option>
              <option value="location">📍 Địa điểm / Phòng</option>
              <option value="time">🕒 Thời gian / Lịch hẹn</option>
              <option value="person">👤 Bác sĩ / Cán bộ</option>
              <option value="instruction">💬 Hướng dẫn</option>
              <option value="warning">⚠️ Cảnh báo / Dị ứng</option>
            </select>
            <input
              type="text"
              placeholder="Tiêu đề (VD: CCCD gắn chip)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="p-2.5 rounded-lg border border-default bg-surface text-text-primary text-xs"
            />
            <input
              type="text"
              placeholder="Nội dung (VD: Bản chính còn hạn)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="p-2.5 rounded-lg border border-default bg-surface text-text-primary text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg border border-default text-xs font-medium text-text-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !value.trim()}
              className="px-4 py-1.5 rounded-lg bg-primary text-white font-bold text-xs disabled:opacity-50"
            >
              Lưu thông tin
            </button>
          </div>
        </form>
      )}

      {/* Facts List */}
      {facts.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-surface-raised border border-dashed border-default space-y-1">
          <p className="text-sm font-medium text-text-primary">Chưa có thông tin nào được lưu.</p>
          <p className="text-xs text-text-secondary">
            Bạn có thể chụp ảnh, nói hoặc gõ câu lệnh cho Lovira để tự động trích xuất thông tin nhé!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {facts.map((fact) => {
            const config = getCategoryConfig(fact.type);
            const Icon = config.icon;
            const isWarning = fact.type === 'warning';

            return (
              <div
                key={fact.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                  isWarning
                    ? 'bg-red-500/10 border-red-500/40 text-red-900 dark:text-red-200'
                    : 'bg-surface-raised border-default text-text-primary'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg border shrink-0 ${config.color}`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <span className="text-[11px] font-bold text-text-secondary block uppercase">
                      {fact.title}
                    </span>
                    <p className="text-sm font-semibold text-text-primary leading-snug break-words">
                      {fact.value}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteFact(fact.id)}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center text-text-secondary hover:text-danger rounded-lg hover:bg-surface transition-colors shrink-0"
                  aria-label={`Xoá thông tin ${fact.title}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
