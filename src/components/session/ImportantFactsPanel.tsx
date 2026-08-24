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
        return { label: 'Địa điểm / Số phòng', icon: MapPin, color: 'text-teal-600 dark:text-teal-400 bg-[#287C78]/10 border-[#287C78]/30' };
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
    <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#182424] border border-[#EAEFEF] dark:border-[#202E2E] shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#11181C] dark:text-[#F2F7F7]">
            Thông tin quan trọng
          </h3>
          <p className="text-xs text-[#586268] dark:text-[#8E9E9E]">
            Giấy tờ, địa điểm, bác sĩ và lưu ý được Lovira trích xuất
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-[#E4F0EF] dark:bg-[#1B2D2C] text-[#287C78] dark:text-[#42A39E] hover:bg-[#287C78] hover:text-white font-bold text-xs transition-all cursor-pointer"
          aria-label="Thêm thông tin quan trọng"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Thêm thủ công</span>
        </button>
      </div>

      {/* Manual Add Form */}
      {showAddForm && (
        <form onSubmit={handleSubmitAdd} className="p-4 rounded-xl border border-[#287C78]/30 bg-[#F4F8F7] dark:bg-[#1E2B2A] space-y-3 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ImportantFactType)}
              className="p-2.5 rounded-lg border border-[#D5ECE8] dark:border-[#202E2E] bg-white dark:bg-[#182424] text-[#11181C] dark:text-[#F2F7F7] text-xs font-medium focus:outline-hidden focus:border-[#287C78]"
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
              className="p-2.5 rounded-lg border border-[#D5ECE8] dark:border-[#202E2E] bg-white dark:bg-[#182424] text-[#11181C] dark:text-[#F2F7F7] text-xs focus:outline-hidden focus:border-[#287C78]"
            />
            <input
              type="text"
              placeholder="Nội dung (VD: Bản chính còn hạn)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="p-2.5 rounded-lg border border-[#D5ECE8] dark:border-[#202E2E] bg-white dark:bg-[#182424] text-[#11181C] dark:text-[#F2F7F7] text-xs focus:outline-hidden focus:border-[#287C78]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg border border-[#EAEFEF] dark:border-[#202E2E] text-xs font-medium text-[#586268] dark:text-[#8E9E9E] hover:bg-[#F0F5F4] dark:hover:bg-[#141E1E] cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !value.trim()}
              className="px-4 py-1.5 rounded-lg bg-[#287C78] hover:bg-[#1F625F] text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
            >
              Lưu thông tin
            </button>
          </div>
        </form>
      )}

      {/* Facts List */}
      {facts.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-[#F8FAFA] dark:bg-[#152020] border border-dashed border-[#D5ECE8] dark:border-[#202E2E] space-y-1">
          <p className="text-sm font-medium text-[#11181C] dark:text-[#F2F7F7]">Chưa có thông tin nào được lưu.</p>
          <p className="text-xs text-[#586268] dark:text-[#8E9E9E]">
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
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-2 shadow-2xs ${
                  isWarning
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200'
                    : 'bg-[#F8FAFA] dark:bg-[#1C2828] border-[#EAEFEF] dark:border-[#253737] text-[#11181C] dark:text-[#F2F7F7]'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg border shrink-0 ${config.color}`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <span className="text-[11px] font-bold text-[#586268] dark:text-[#8E9E9E] block uppercase">
                      {fact.title}
                    </span>
                    <p className="text-sm font-semibold text-[#11181C] dark:text-[#F2F7F7] leading-snug break-words">
                      {fact.value}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteFact(fact.id)}
                  className="min-h-[32px] min-w-[32px] flex items-center justify-center text-[#7A848B] hover:text-rose-600 dark:text-[#8E9E9E] dark:hover:text-rose-400 rounded-lg hover:bg-white dark:hover:bg-[#141E1E] transition-colors shrink-0 cursor-pointer"
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
