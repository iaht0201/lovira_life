import React from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudFog,
  Snowflake,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';

interface WeatherMiniCardProps {
  location?: string;
  temp?: string;
  condition?: string;
}

export const WeatherMiniCard: React.FC<WeatherMiniCardProps> = ({
  location: propLocation,
  temp: propTemp,
  condition: propCondition,
}) => {
  const { weather, requestGpsLocation } = useWeather();

  // Prefer live weather if props are not explicitly overridden
  const displayLocation = propLocation || weather.location;
  const displayTemp = propTemp || weather.temp;
  const displayCondition = propCondition || weather.condition;

  const renderWeatherIcon = () => {
    const code = weather.weatherCode ?? 0;
    if (code === 0) return <Sun className="w-[26px] h-[26px]" />;
    if (code <= 2) return <CloudSun className="w-[26px] h-[26px]" />;
    if (code === 3) return <Cloud className="w-[26px] h-[26px]" />;
    if (code === 45 || code === 48) return <CloudFog className="w-[26px] h-[26px]" />;
    if (code >= 51 && code <= 82) return <CloudRain className="w-[26px] h-[26px]" />;
    if (code >= 95) return <CloudLightning className="w-[26px] h-[26px]" />;
    if (code >= 71 && code <= 77) return <Snowflake className="w-[26px] h-[26px]" />;
    return <Sun className="w-[26px] h-[26px]" />;
  };

  return (
    <div className="bg-lovira-card border border-lovira rounded-[22px] p-5 shadow-lovira flex items-center justify-between transition-all relative overflow-hidden group">
      <div className="space-y-1">
        <div className="flex items-center space-x-1.5">
          <p className="text-[12px] font-[700] text-lovira-muted uppercase tracking-wider">
            {displayLocation}
          </p>
          {weather.isGps && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              title="Định vị GPS thực tế"
            >
              <Navigation className="w-2.5 h-2.5 mr-0.5 fill-current" />
              GPS
            </span>
          )}
        </div>

        <div className="flex items-baseline space-x-2">
          <p className="text-[26px] font-[900] text-lovira-title leading-none tracking-tight">
            {displayTemp}
          </p>
          {weather.humidity !== undefined && (
            <span className="text-[11px] font-[500] text-lovira-muted">
              Độ ẩm {weather.humidity}%
            </span>
          )}
        </div>

        <p className="text-[12px] font-[500] text-lovira-muted">
          {weather.loading ? 'Đang định vị GPS...' : displayCondition}
        </p>
      </div>

      <div className="flex flex-col items-end space-y-2">
        <div className="w-[48px] h-[48px] rounded-[16px] bg-[#FFF3E8] dark:bg-[#3D2518] text-[#FF701A] dark:text-[#FFA066] flex items-center justify-center shrink-0 shadow-xs">
          {weather.loading ? (
            <RefreshCw className="w-[22px] h-[22px] animate-spin text-[#FF701A] dark:text-[#FFA066]" />
          ) : (
            renderWeatherIcon()
          )}
        </div>

        <button
          onClick={requestGpsLocation}
          disabled={weather.loading}
          className="text-[11px] font-[600] text-lovira-muted hover:text-lovira-primary flex items-center space-x-1 transition-colors px-2 py-0.5 rounded-lg hover:bg-surface-hover active:scale-95"
          title="Định vị lại vị trí hiện tại bằng GPS"
        >
          <RefreshCw className={`w-3 h-3 ${weather.loading ? 'animate-spin' : ''}`} />
          <span>{weather.loading ? 'Đang cập nhật' : 'Định vị lại'}</span>
        </button>
      </div>
    </div>
  );
};
