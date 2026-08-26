import { useState, useEffect, useCallback } from 'react';
import { getCurrentLocation } from '../services/locationService';

export interface WeatherData {
  location: string;
  temp: string;
  condition: string;
  humidity?: number;
  weatherCode?: number;
  isGps: boolean;
  loading: boolean;
  error?: string;
}

function getWeatherConditionText(code: number): { text: string; iconType: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'lightning' | 'fog' | 'snowflake' } {
  switch (code) {
    case 0:
      return { text: 'Trời quang mây ☀️', iconType: 'sun' };
    case 1:
      return { text: 'Nắng nhẹ, ít mây 🌤️', iconType: 'cloud-sun' };
    case 2:
      return { text: 'Trời có mây ⛅', iconType: 'cloud-sun' };
    case 3:
      return { text: 'Trời u âm ☁️', iconType: 'cloud' };
    case 45:
    case 48:
      return { text: 'Có sương mù 🌫️', iconType: 'fog' };
    case 51:
    case 53:
    case 55:
      return { text: 'Mưa phùn nhẹ 🌧️', iconType: 'rain' };
    case 61:
    case 63:
      return { text: 'Mưa vừa 🌧️', iconType: 'rain' };
    case 65:
    case 80:
    case 81:
    case 82:
      return { text: 'Mưa rào lớn 🌧️', iconType: 'rain' };
    case 95:
    case 96:
    case 99:
      return { text: 'Dông bão ⛈️', iconType: 'lightning' };
    case 71:
    case 73:
    case 75:
      return { text: 'Có tuyết ❄️', iconType: 'snowflake' };
    default:
      return { text: 'Nắng nhẹ ☀️', iconType: 'sun' };
  }
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData>({
    location: 'Hà Nội',
    temp: '28°C',
    condition: 'Đang kết nối GPS...',
    isGps: false,
    loading: true,
  });

  const fetchWeather = useCallback(async (latitude?: number, longitude?: number) => {
    setWeather((prev) => ({ ...prev, loading: true, error: undefined }));

    let lat = latitude;
    let lon = longitude;
    let isGpsUsed = lat !== undefined && lon !== undefined;
    let locationName = 'Hà Nội';

    try {
      // 1. If GPS coordinates provided, reverse geocode to get city name
      if (isGpsUsed && lat !== undefined && lon !== undefined) {
        try {
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const city =
              geoData.city ||
              geoData.locality ||
              geoData.principalSubdivision ||
              geoData.countryName;

            if (city) {
              // Clean up prefixes like "Thành phố " for compact display if needed or keep full
              locationName = city.replace(/^Thành phố\s+/i, 'TP. ');
            }
          }
        } catch (geoErr) {
          console.warn('Reverse geocoding warning:', geoErr);
          locationName = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
        }
      } else {
        // Default to Hanoi coordinates if no GPS
        lat = 21.0285;
        lon = 105.8542;
        locationName = 'Hà Nội';
      }

      // 2. Fetch real weather data from Open-Meteo API
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,is_day`
      );

      if (!weatherRes.ok) {
        throw new Error('Không thể tải dữ liệu thời tiết');
      }

      const weatherData = await weatherRes.json();
      const current = weatherData.current;

      if (current) {
        const tempVal = Math.round(current.temperature_2m);
        const code = current.weather_code ?? 0;
        const conditionInfo = getWeatherConditionText(code);

        setWeather({
          location: locationName,
          temp: `${tempVal}°C`,
          condition: conditionInfo.text,
          humidity: current.relative_humidity_2m,
          weatherCode: code,
          isGps: isGpsUsed,
          loading: false,
        });
        return;
      }
    } catch (err: any) {
      console.warn('Weather API fetch failed:', err);
      setWeather({
        location: locationName,
        temp: '28°C',
        condition: 'Trời nắng nhẹ ☀️',
        isGps: isGpsUsed,
        loading: false,
        error: 'Không tải được thời tiết thực',
      });
    }
  }, []);

  const requestGpsLocation = useCallback(async (forceFresh = false) => {
    setWeather((prev) => ({ ...prev, loading: true, condition: 'Đang định vị GPS...' }));
    try {
      const loc = await getCurrentLocation(forceFresh);
      if (loc) {
        await fetchWeather(loc.lat, loc.lon);
      } else {
        await fetchWeather();
      }
    } catch (err) {
      console.warn('GPS location request error:', err);
      await fetchWeather();
    }
  }, [fetchWeather]);

  useEffect(() => {
    requestGpsLocation();
  }, [requestGpsLocation]);

  return {
    weather,
    requestGpsLocation,
  };
}
