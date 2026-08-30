/**
 * Location Service for browser-based GPS coordinate retrieval.
 * Provides caching (15 minutes) and graceful fallback.
 */

export interface UserLocation {
  lat: number;
  lon: number;
  cityName?: string;
  address?: string;
}

let cachedLocation: { loc: UserLocation; timestamp: number } | null = null;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes cache

/**
 * Format & restore Vietnamese diacritics for location names
 * Fixes unaccented or ALL-CAPS ASCII text like "PHUONG MY THUONG" -> "Phường Mỹ Thường"
 */
export function formatVietnameseLocationName(rawName: string): string {
  if (!rawName || !rawName.trim()) return 'Vị trí hiện tại';

  let text = rawName.trim();

  // Common unaccented administrative replacements
  const replacements: Array<[RegExp, string]> = [
    [/\bPHUONG\b/gi, 'Phường'],
    [/\bQUAN\b/gi, 'Quận'],
    [/\bTHANH PHO\b/gi, 'TP.'],
    [/\bTP\b/gi, 'TP.'],
    [/\bTINH\b/gi, 'Tỉnh'],
    [/\bXA\b/gi, 'Xã'],
    [/\bHUYEN\b/gi, 'Huyện'],
    [/\bTHI XA\b/gi, 'Thị xã'],
    [/\bTHI TRON\b/gi, 'Thị trấn'],
    // Common unaccented ward/locality names
    [/\bMY THUONG\b/gi, 'Mỹ Thường'],
    [/\bMY THANH\b/gi, 'Mỹ Thạnh'],
    [/\bMY THOI\b/gi, 'Mỹ Thới'],
    [/\bMY PHUOC\b/gi, 'Mỹ Phước'],
    [/\bMY HOA\b/gi, 'Mỹ Hòa'],
    [/\bMY BINH\b/gi, 'Mỹ Bình'],
    [/\bMY XUYEN\b/gi, 'Mỹ Xuyên'],
    [/\bLONG XUYEN\b/gi, 'Long Xuyên'],
    [/\bCHAU DOC\b/gi, 'Châu Đốc'],
    [/\bAN GIANG\b/gi, 'An Giang'],
    [/\bHO CHI MINH\b/gi, 'Hồ Chí Minh'],
    [/\bHA NOI\b/gi, 'Hà Nội'],
    [/\bDA NANG\b/gi, 'Đà Nẵng'],
    [/\bHAI PHONG\b/gi, 'Hải Phòng'],
    [/\bCAN THO\b/gi, 'Cần Thơ'],
    [/\bBEN NGHE\b/gi, 'Bến Nghé'],
    [/\bBEN THANH\b/gi, 'Bến Thành'],
    [/\bTAN BINH\b/gi, 'Tân Bình'],
    [/\bTHU DUC\b/gi, 'Thủ Đức'],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  // If text is still in ALL CAPS (e.g. "PHƯỜNG MỸ THƯỜNG"), convert to Title Case
  if (text === text.toUpperCase() && text.length > 3) {
    text = text
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // Fix "Tp. " -> "TP. "
  text = text.replace(/\bTp\.\s*/gi, 'TP. ');

  return text;
}

/**
 * Reverse geocode latitude & longitude with full Vietnamese diacritics
 * Uses OpenStreetMap Nominatim with Vietnamese language first, then BigDataCloud fallback.
 */
export async function reverseGeocodeVietnamese(
  lat: number,
  lon: number
): Promise<{ address?: string; cityName: string }> {
  // 1. Nominatim (OpenStreetMap) with accept-language=vi
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=vi,vi-VN`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const wardOrDistrict =
          addr.suburb ||
          addr.quarter ||
          addr.neighbourhood ||
          addr.village ||
          addr.town ||
          addr.city_district;

        const cityOrProvince =
          addr.city ||
          addr.county ||
          addr.state ||
          addr.province;

        let rawCity = '';
        if (wardOrDistrict) {
          rawCity = wardOrDistrict;
          if (cityOrProvince && !cityOrProvince.includes(wardOrDistrict)) {
            const cleanCity = cityOrProvince.replace(/^Thành phố\s+/i, 'TP. ');
            rawCity = `${wardOrDistrict}, ${cleanCity}`;
          }
        } else if (cityOrProvince) {
          rawCity = cityOrProvince.replace(/^Thành phố\s+/i, 'TP. ');
        } else if (data.name) {
          rawCity = data.name;
        }

        if (rawCity) {
          return {
            address: data.display_name,
            cityName: formatVietnameseLocationName(rawCity),
          };
        }
      }
    }
  } catch (e) {
    console.warn('[LocationService] Nominatim geocoding error or timeout:', e);
  }

  // 2. BigDataCloud Fallback
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`
    );
    if (res.ok) {
      const data = await res.json();
      const locality = data.locality || data.localityInfo?.administrative?.[3]?.name || '';
      const city = data.city || data.principalSubdivision || data.countryName || '';

      let rawCity = 'vị trí hiện tại';
      if (locality && city && locality !== city) {
        rawCity = `${locality}, ${city.replace(/^Thành phố\s+/i, 'TP. ')}`;
      } else if (city || locality) {
        rawCity = (city || locality).replace(/^Thành phố\s+/i, 'TP. ');
      }

      return {
        address: [locality, city].filter(Boolean).join(', '),
        cityName: formatVietnameseLocationName(rawCity),
      };
    }
  } catch (e) {
    console.warn('[LocationService] BigDataCloud geocoding error:', e);
  }

  return { cityName: 'Vị trí hiện tại' };
}

/**
 * Get the current user location via navigator.geolocation.
 * Returns cached coordinates if fresh, otherwise requests from browser.
 */
export async function getCurrentLocation(forceFresh = false): Promise<UserLocation | null> {
  const now = Date.now();

  // Return cached location if valid
  if (!forceFresh && cachedLocation && now - cachedLocation.timestamp < CACHE_DURATION_MS) {
    return cachedLocation.loc;
  }

  // Check if running in browser environment with geolocation support
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.geolocation) {
    return cachedLocation?.loc || null;
  }

  return new Promise((resolve) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        // Fallback to expired cache if available, or null
        resolve(cachedLocation?.loc || null);
      }
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const geo = await reverseGeocodeVietnamese(lat, lon);

        const location: UserLocation = {
          lat,
          lon,
          cityName: geo.cityName,
          address: geo.address,
        };
        cachedLocation = { loc: location, timestamp: Date.now() };
        resolve(location);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        console.warn('[LocationService] Geolocation error or permission denied:', error.message);
        resolve(cachedLocation?.loc || null);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 10 * 60 * 1000, // Accept up to 10-minute-old cached position from OS
      }
    );
  });
}

/**
 * Manually set or clear cached location (useful for testing or profile defaults)
 */
export function setCachedLocation(loc: UserLocation | null): void {
  if (loc) {
    cachedLocation = { loc, timestamp: Date.now() };
  } else {
    cachedLocation = null;
  }
}
