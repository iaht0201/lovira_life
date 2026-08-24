import React from 'react';
import { Type, Eye, Moon, Sun, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { AccessibilitySettings } from '../../types';

interface AccessibilityToolbarProps {
  settings: AccessibilitySettings;
  onUpdate: (settings: AccessibilitySettings) => void;
}

export const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({ settings, onUpdate }) => {
  const fontScales = [1.0, 1.25, 1.5, 1.75];

  const handleFontChange = (scale: number) => {
    onUpdate({ ...settings, fontScale: scale });
  };

  const toggleHighContrast = () => {
    onUpdate({ ...settings, highContrast: !settings.highContrast });
  };

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    onUpdate({ ...settings, theme: nextTheme });
  };

  const toggleSpeech = () => {
    onUpdate({ ...settings, speakResponse: !settings.speakResponse });
  };

  const toggleVSL = () => {
    onUpdate({ ...settings, vslEnabled: !settings.vslEnabled });
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border mb-4 shadow-sm text-sm ${
        settings.highContrast
          ? 'bg-black text-white border-white border-2'
          : 'bg-lovira-surface border-lovira text-lovira-title'
      }`}
      role="toolbar"
      aria-label="Thanh công cụ trợ năng"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium flex items-center gap-1.5 min-h-[36px] px-1">
          <Type className="w-4 h-4 text-primary" aria-hidden="true" />
          <span>Cỡ chữ:</span>
        </span>
        <div className="flex items-center gap-1">
          {fontScales.map((scale) => {
            const label = `${Math.round(scale * 100)}%`;
            const isSelected = settings.fontScale === scale;
            return (
              <button
                key={scale}
                onClick={() => handleFontChange(scale)}
                aria-pressed={isSelected}
                aria-label={`Thay đổi cỡ chữ sang ${label}`}
                className={`min-w-[44px] min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? settings.highContrast
                      ? 'bg-white text-black ring-2 ring-white'
                      : 'bg-primary text-white shadow-sm'
                    : settings.highContrast
                    ? 'border border-gray-600 text-gray-200 hover:bg-gray-800'
                    : 'bg-surface-raised border border-default hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* High Contrast Toggle */}
        <button
          onClick={toggleHighContrast}
          aria-pressed={settings.highContrast}
          aria-label="Bật hoặc tắt chế độ tương phản cao"
          className={`flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-lg font-medium transition-all ${
            settings.highContrast
              ? 'bg-amber-400 text-black font-bold ring-2 ring-amber-300'
              : 'bg-surface-raised border border-default hover:border-primary'
          }`}
        >
          <Eye className="w-4 h-4" aria-hidden="true" />
          <span>Tương phản cao</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Chuyển sang chế độ giao diện ${settings.theme === 'dark' ? 'sáng' : 'tối'}`}
          className="flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-lg bg-surface-raised border border-default hover:border-primary transition-all"
        >
          {settings.theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Giao diện sáng</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600" aria-hidden="true" />
              <span>Giao diện tối</span>
            </>
          )}
        </button>

        {/* TTS Toggle */}
        <button
          onClick={toggleSpeech}
          aria-pressed={settings.speakResponse}
          aria-label={settings.speakResponse ? 'Tắt đọc phản hồi giọng nói' : 'Bật đọc phản hồi giọng nói'}
          className={`flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-lg font-medium transition-all ${
            settings.speakResponse
              ? 'bg-emerald-700 text-white dark:bg-emerald-600 font-bold'
              : 'bg-surface-raised border border-default'
          }`}
        >
          {settings.speakResponse ? (
            <>
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span>Đọc giọng nói ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 opacity-60" aria-hidden="true" />
              <span>Đọc giọng nói OFF</span>
            </>
          )}
        </button>

        {/* VSL Panel Toggle */}
        <button
          onClick={toggleVSL}
          aria-pressed={settings.vslEnabled}
          aria-label="Mở khung Ngôn ngữ Ký hiệu VSL"
          className={`flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-lg font-medium transition-all ${
            settings.vslEnabled
              ? 'bg-indigo-600 text-white'
              : 'bg-surface-raised border border-default hover:border-primary'
          }`}
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span>Bảng Ký hiệu VSL</span>
        </button>
      </div>
    </div>
  );
};
