/*
 * Weather at the field (Steve, Nov 14: OK to use Open-Meteo, save it with the
 * game, use the iPhone's location). Once a game is under way, the app asks
 * the iPhone where it is, rounds that to about a kilometer, and asks
 * Open-Meteo (free, no account, no key) for the temperature, the sky, and
 * the wind. The answer is saved with the game, so the Book keeps it. No
 * signal or no permission: no weather, and nothing else changes.
 */
import type { GameWeather } from '../store/model.ts';

const API = 'https://api.open-meteo.com/v1/forecast';

/** WMO weather codes, in a scoreboard's few words. */
export function skyWord(code: number): string {
  if (code === 0) return 'Clear';
  if (code === 1 || code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snow';
  if (code >= 95) return 'Storms';
  return '';
}

/** "74° · Clear · Wind 6 mph" for the Book. */
export function weatherLine(w: GameWeather): string {
  return [`${w.tempF}°`, w.sky, w.windMph !== undefined ? `Wind ${w.windMph} mph` : ''].filter(Boolean).join(' · ');
}

/** Where the iPhone is; 'denied' when location is turned off for the app; null otherwise (no fix in 15 seconds). */
function position(): Promise<{ lat: number; lon: number } | 'denied' | null> {
  if (!('geolocation' in navigator)) return Promise.resolve('denied');
  return new Promise((resolve) => {
    // Some fixes never call back at all; give up after 16 seconds either way.
    const late = setTimeout(() => resolve(null), 16_000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(late);
        resolve({ lat: p.coords.latitude, lon: p.coords.longitude });
      },
      (e) => {
        clearTimeout(late);
        resolve(e.code === e.PERMISSION_DENIED ? 'denied' : null);
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 30 * 60_000 },
    );
  });
}

/** Ask once for the weather where the iPhone is. Null when it can't be had now; 'denied' when location is off. */
export async function fetchWeather(now = Date.now()): Promise<GameWeather | 'denied' | null> {
  if (!navigator.onLine) return null;
  const at = await position();
  if (!at || at === 'denied') return at;
  // About a kilometer: close enough for the weather, and all the service needs to know.
  const lat = at.lat.toFixed(2);
  const lon = at.lon.toFixed(2);
  const url = `${API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const j = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number } };
    const c = j.current;
    if (!c || typeof c.temperature_2m !== 'number') return null;
    return {
      tempF: Math.round(c.temperature_2m),
      sky: typeof c.weather_code === 'number' ? skyWord(c.weather_code) : '',
      ...(typeof c.wind_speed_10m === 'number' ? { windMph: Math.round(c.wind_speed_10m) } : {}),
      at: now,
    };
  } catch {
    return null;
  }
}
