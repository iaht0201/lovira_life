/**
 * Weather Service for deterministic, real-data weather reporting.
 * Uses Open-Meteo API without invoking LLM tokens.
 */

interface WeatherReportOptions {
  addressing?: string;
  me?: string;
  da?: string;
  lat?: number;
  lon?: number;
  cityName?: string;
}

export function getWeatherConditionText(code: number): { text: string; icon: string } {
  if (code === 0) return { text: 'Trời quang đãng, nắng đẹp', icon: '☀️' };
  if (code >= 1 && code <= 3) return { text: 'Nhiều mây, nắng gián đoạn', icon: '⛅' };
  if (code >= 45 && code <= 48) return { text: 'Có sương mù', icon: '🌫️' };
  if (code >= 51 && code <= 55) return { text: 'Có mưa phun nhẹ', icon: '🌧️' };
  if (code >= 61 && code <= 65) return { text: 'Có mưa rào', icon: '🌧️' };
  if (code >= 80 && code <= 82) return { text: 'Có mưa rào mạnh', icon: '⛈️' };
  if (code >= 95) return { text: 'Có dông bão', icon: '⚡' };
  return { text: 'Mát mẻ, dễ chịu', icon: '🌤️' };
}

export async function fetchCurrentWeatherReport(
  opts: WeatherReportOptions = {}
): Promise<{
  handled: boolean;
  reply: string;
  speech: string;
  suggestedReplies: string[];
}> {
  const addressing = opts.addressing || 'chú';
  const me = opts.me || 'con';
  const da = opts.da || 'Dạ';

  const lat = opts.lat ?? 21.0285;
  const lon = opts.lon ?? 105.8542;
  const cityName = opts.cityName || 'Hà Nội';

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,is_day`
    );

    if (res.ok) {
      const data = await res.json();
      const current = data.current;
      if (current) {
        const temp = Math.round(current.temperature_2m);
        const code = current.weather_code ?? 0;
        const condition = getWeatherConditionText(code);
        const humidity = current.relative_humidity_2m;

        const reply = `${da}, thời tiết tại ${cityName} hiện tại khoảng ${temp}°C, ${condition.text} ${condition.icon}, độ ẩm ${humidity}%. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} nhớ chú ý sức khỏe khi ra ngoài nhé ạ!`;
        const speech = `${da}, thời tiết tại ${cityName} hiện tại khoảng ${temp} độ C, ${condition.text} ạ.`;

        return {
          handled: true,
          reply,
          speech,
          suggestedReplies: ['Lịch hôm nay có gì?', 'Tạo nhắc nhở mang ô'],
        };
      }
    }
  } catch (err) {
    console.warn('Weather fetch error:', err);
  }

  // Graceful fallback if network fails
  const reply = `${da}, ${me} chưa kết nối được mạng thời tiết lúc này. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} có thể xem lại sau vài phút nữa nhé ạ!`;
  return {
    handled: true,
    reply,
    speech: reply,
    suggestedReplies: ['Lịch hôm nay có gì?'],
  };
}
