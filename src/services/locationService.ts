/**
 * Location Service for browser-based GPS coordinate retrieval.
 * Provides caching (15 minutes) and graceful fallback.
 */

export interface UserLocation {
  lat: number;
  lon: number;
  cityName?: string;
}

let cachedLocation: { loc: UserLocation; timestamp: number } | null = null;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes cache

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
        let cityName = 'vị trí hiện tại';

        // Attempt reverse geocoding for a friendlier city name if possible
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`
          );
          if (res.ok) {
            const data = await res.json();
            const city =
              data.city ||
              data.locality ||
              data.principalSubdivision ||
              data.countryName;
            if (city) {
              cityName = city.replace(/^Thành phố\s+/i, 'TP. ');
            }
          }
        } catch {
          // Keep default 'vị trí hiện tại'
        }

        const location: UserLocation = { lat, lon, cityName };
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
