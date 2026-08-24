import React from 'react';
import { Camera, Image as ImageIcon, FileText, Trash2, Plus } from 'lucide-react';
import { SessionResource } from '../../types';

interface SessionResourcePanelProps {
  resources: SessionResource[];
  onOpenCamera: () => void;
  onDeleteResource: (id: string) => void;
}

export const SessionResourcePanel: React.FC<SessionResourcePanelProps> = ({
  resources,
  onOpenCamera,
  onDeleteResource,
}) => {
  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#182424] border border-[#EAEFEF] dark:border-[#202E2E] shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#11181C] dark:text-[#F2F7F7]">
            Tài nguyên & Ảnh đã chụp
          </h3>
          <p className="text-xs text-[#586268] dark:text-[#8E9E9E]">
            Phiếu khám, đơn thuốc và ảnh tài liệu được lưu trong phiên
          </p>
        </div>

        <button
          onClick={onOpenCamera}
          className="flex items-center gap-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white font-bold text-xs transition-all cursor-pointer"
        >
          <Camera className="w-4 h-4" aria-hidden="true" />
          <span>Chụp ảnh mới</span>
        </button>
      </div>

      {resources.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-[#F8FAFA] dark:bg-[#152020] border border-dashed border-[#D5ECE8] dark:border-[#202E2E] space-y-1">
          <p className="text-sm font-medium text-[#11181C] dark:text-[#F2F7F7]">Chưa có ảnh hoặc tài liệu nào được đính kèm.</p>
          <p className="text-xs text-[#586268] dark:text-[#8E9E9E]">
            Nhấn "Chụp ảnh mới" hoặc chọn tệp để Lovira đọc thông tin giúp bạn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {resources.map((res) => (
            <div
              key={res.id}
              className="group relative rounded-xl border border-[#EAEFEF] dark:border-[#202E2E] bg-[#F8FAFA] dark:bg-[#1C2828] overflow-hidden shadow-2xs space-y-1 p-2"
            >
              {res.url || res.data ? (
                <img
                  src={res.url || res.data}
                  alt={res.title}
                  className="w-full h-24 object-cover rounded-lg bg-black/10"
                />
              ) : (
                <div className="w-full h-24 flex items-center justify-center bg-[#E4F0EF] dark:bg-[#1B2D2C] rounded-lg text-[#287C78] dark:text-[#42A39E]">
                  <FileText className="w-8 h-8" />
                </div>
              )}
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-[#11181C] dark:text-[#F2F7F7] truncate">
                  {res.title}
                </span>
                <button
                  onClick={() => onDeleteResource(res.id)}
                  className="min-h-[32px] min-w-[32px] flex items-center justify-center text-[#7A848B] hover:text-rose-600 dark:text-[#8E9E9E] dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                  aria-label={`Xoá tài nguyên ${res.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
