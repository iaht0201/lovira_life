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
    <section className="p-5 rounded-2xl bg-surface border border-default shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            Tài nguyên & Ảnh đã chụp
          </h3>
          <p className="text-xs text-text-secondary">
            Phiếu khám, đơn thuốc và ảnh tài liệu được lưu trong phiên
          </p>
        </div>

        <button
          onClick={onOpenCamera}
          className="flex items-center gap-1 min-h-[44px] px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white font-bold text-xs transition-all"
        >
          <Camera className="w-4 h-4" aria-hidden="true" />
          <span>Chụp ảnh mới</span>
        </button>
      </div>

      {resources.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-surface-raised border border-dashed border-default space-y-1">
          <p className="text-sm font-medium text-text-primary">Chưa có ảnh hoặc tài liệu nào được đính kèm.</p>
          <p className="text-xs text-text-secondary">
            Nhấn "Chụp ảnh mới" hoặc chọn tệp để Lovira đọc thông tin giúp bạn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {resources.map((res) => (
            <div
              key={res.id}
              className="group relative rounded-xl border border-default bg-surface-raised overflow-hidden shadow-2xs space-y-1 p-2"
            >
              {res.url || res.data ? (
                <img
                  src={res.url || res.data}
                  alt={res.title}
                  className="w-full h-24 object-cover rounded-lg bg-black/10"
                />
              ) : (
                <div className="w-full h-24 flex items-center justify-center bg-primary/10 rounded-lg text-primary">
                  <FileText className="w-8 h-8" />
                </div>
              )}
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-text-primary truncate">
                  {res.title}
                </span>
                <button
                  onClick={() => onDeleteResource(res.id)}
                  className="min-h-[32px] min-w-[32px] flex items-center justify-center text-text-secondary hover:text-danger rounded-md transition-colors"
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
