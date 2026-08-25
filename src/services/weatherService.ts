/**
 * Weather Service for deterministic, real-data weather reporting.
 * Uses Open-Meteo API without invoking LLM tokens.
 * Supports explicit city detection, daily precipitation probabilities, and location clarification.
 */

interface WeatherReportOptions {
  addressing?: string;
  me?: string;
  da?: string;
  lat?: number;
  lon?: number;
  cityName?: string;
  rawText?: string;
}

const VIETNAM_CITIES: Record<string, { name: string; lat: number; lon: number }> = {
  'hà nội': { name: 'Hà Nội', lat: 21.0285, lon: 105.8542 },
  'ha noi': { name: 'Hà Nội', lat: 21.0285, lon: 105.8542 },
  'hồ chí minh': { name: 'TP. Hồ Chí Minh', lat: 10.8231, lon: 106.6297 },
  'ho chi minh': { name: 'TP. Hồ Chí Minh', lat: 10.8231, lon: 106.6297 },
  'sài gòn': { name: 'TP. Hồ Chí Minh', lat: 10.8231, lon: 106.6297 },
  'sai gon': { name: 'TP. Hồ Chí Minh', lat: 10.8231, lon: 106.6297 },
  'tphcm': { name: 'TP. Hồ Chí Minh', lat: 10.8231, lon: 106.6297 },
  'đà nẵng': { name: 'Đà Nẵng', lat: 16.0544, lon: 108.2022 },
  'da nang': { name: 'Đà Nẵng', lat: 16.0544, lon: 108.2022 },
  'hải phòng': { name: 'Hải Phòng', lat: 20.8449, lon: 106.6881 },
  'hai phong': { name: 'Hải Phòng', lat: 20.8449, lon: 106.6881 },
  'cần thơ': { name: 'Cần Thơ', lat: 10.0452, lon: 105.7469 },
  'can tho': { name: 'Cần Thơ', lat: 10.0452, lon: 105.7469 },
  'nha trang': { name: 'Nha Trang', lat: 12.2388, lon: 109.1967 },
  'đà lạt': { name: 'Đà Lạt', lat: 11.9404, lon: 108.4583 },
  'da lat': { name: 'Đà Lạt', lat: 11.9404, lon: 108.4583 },
  'huế': { name: 'Huế', lat: 16.4637, lon: 107.5909 },
  'vũng tàu': { name: 'Vũng Tàu', lat: 10.3460, lon: 107.0843 },
  'quy nhơn': { name: 'Quy Nhơn', lat: 13.7820, lon: 109.2194 },
  'hạ long': { name: 'Hạ Long', lat: 20.9599, lon: 107.0425 },
  'quảng ninh': { name: 'Quảng Ninh', lat: 20.9599, lon: 107.0425 },
  'bình dương': { name: 'Bình Dương', lat: 10.9805, lon: 106.6519 },
  'đồng nai': { name: 'Đồng Nai', lat: 10.9575, lon: 106.8427 },
  'thanh hóa': { name: 'Thanh Hóa', lat: 19.8073, lon: 105.7764 },
  'nghệ an': { name: 'Nghệ An', lat: 18.6734, lon: 105.6813 },
  'vinh': { name: 'Vinh', lat: 18.6734, lon: 105.6813 },
  'nam định': { name: 'Nam Định', lat: 20.4200, lon: 106.1683 },
  'thái bình': { name: 'Thái Bình', lat: 20.4464, lon: 106.3365 },
  'ninh bình': { name: 'Ninh Bình', lat: 20.2506, lon: 105.9745 },
  'phú quốc': { name: 'Phú Quốc', lat: 10.2289, lon: 103.9572 },
  'đắk lắk': { name: 'Đắk Lắk', lat: 12.6667, lon: 108.0500 },
  'buôn ma thuột': { name: 'Buôn Ma Thuột', lat: 12.6667, lon: 108.0500 },
};

function extractCityFromText(text?: string): { name: string; lat: number; lon: number } | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [key, cityInfo] of Object.entries(VIETNAM_CITIES)) {
    if (lower.includes(key)) {
      return cityInfo;
    }
  }
  return null;
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

  // 1. Try extracting city from user's raw query text
  const extractedCity = extractCityFromText(opts.rawText);

  let lat = opts.lat;
  let lon = opts.lon;
  let cityName = opts.cityName;

  if (extractedCity) {
    lat = extractedCity.lat;
    lon = extractedCity.lon;
    cityName = extractedCity.name;
  }

  // 2. If no city in query AND no location explicitly passed, ask for location clarification instead of defaulting to Hanoi
  if (lat === undefined || lon === undefined || !cityName) {
    const askReply = `${da}, ${addressing} muốn xem thời tiết ở đâu hay tỉnh thành phố nào ạ?`;
    return {
      handled: true,
      reply: askReply,
      speech: askReply,
      suggestedReplies: ['Thời tiết Hà Nội', 'Thời tiết TP.HCM', 'Thời tiết Đà Nẵng'],
    };
  }

  const isRainQuery =
    opts.rawText &&
    (opts.rawText.toLowerCase().includes('mưa') ||
      opts.rawText.toLowerCase().includes('dù') ||
      opts.rawText.toLowerCase().includes('ô'));

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
    );

    if (res.ok) {
      const data = await res.json();
      const current = data.current;
      const daily = data.daily;

      if (current) {
        const temp = Math.round(current.temperature_2m);
        const code = current.weather_code ?? 0;
        const condition = getWeatherConditionText(code);
        const humidity = current.relative_humidity_2m;

        const maxTemp = daily?.temperature_2m_max?.[0] ? Math.round(daily.temperature_2m_max[0]) : temp;
        const minTemp = daily?.temperature_2m_min?.[0] ? Math.round(daily.temperature_2m_min[0]) : temp;
        const rainProb = daily?.precipitation_probability_max?.[0] ?? 0;

        let reply = '';
        let speech = '';

        if (isRainQuery) {
          if (rainProb >= 40) {
            reply = `${da}, thời tiết tại ${cityName} hôm nay có khả năng mưa cao (khoảng ${rainProb}%), nhiệt độ khoảng ${minTemp}°C - ${maxTemp}°C. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} nhớ mang theo ô (dù) khi ra ngoài nhé ạ!`;
            speech = `${da}, thời tiết tại ${cityName} hôm nay có khả năng mưa cao khoảng ${rainProb} phần trăm ạ. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} nhớ mang theo ô khi ra ngoài ạ.`;
          } else {
            reply = `${da}, thời tiết tại ${cityName} hôm nay tỉ lệ mưa khá thấp (chỉ khoảng ${rainProb}%), nhiệt độ từ ${minTemp}°C - ${maxTemp}°C, trời khá khô ráo ạ!`;
            speech = `${da}, thời tiết tại ${cityName} hôm nay tỉ lệ có mưa rất thấp, trời khá khô ráo ạ.`;
          }
        } else {
          reply = `${da}, thời tiết tại ${cityName} hiện tại khoảng ${temp}°C (cao nhất ${maxTemp}°C, thấp nhất ${minTemp}°C), ${condition.text} ${condition.icon}, tỉ lệ mưa ${rainProb}%. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} nhớ chú ý giữ gìn sức khỏe nhé ạ!`;
          speech = `${da}, thời tiết tại ${cityName} hiện tại khoảng ${temp} độ C, ${condition.text} ạ.`;
        }

        return {
          handled: true,
          reply,
          speech,
          suggestedReplies: ['Lịch hôm nay có gì?', 'Tạo nhắc nhở mới'],
        };
      }
    }
  } catch (err) {
    console.warn('Weather fetch error:', err);
  }

  // Graceful fallback if network fails
  const fallbackReply = `${da}, ${me} chưa kết nối được mạng thời tiết lúc này. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} có thể kiểm tra lại sau vài phút nữa nhé ạ!`;
  return {
    handled: true,
    reply: fallbackReply,
    speech: fallbackReply,
    suggestedReplies: ['Lịch hôm nay có gì?'],
  };
}
