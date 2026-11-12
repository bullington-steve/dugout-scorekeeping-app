/* Which device and how the app was opened (SPEC §12, §16). */

/** iPhone or iPad (iPadOS reports itself as a Mac with a touch screen). */
export function isAppleTouch(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isIPad(): boolean {
  const ua = navigator.userAgent;
  return /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Opened from the Home Screen, not a Safari tab. */
export function isHomeScreenApp(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** A Safari tab on iPhone or iPad: where data can be cleared after a week (LESSONS 2). */
export function inSafariTab(): boolean {
  return isAppleTouch() && !isHomeScreenApp();
}

export function reduceMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** One-time flags that belong to this device, not the season (never in backups). */
export function seen(key: string): boolean {
  try {
    return localStorage.getItem(`scorekept:seen:${key}`) === '1';
  } catch {
    return false;
  }
}

export function markSeen(key: string): void {
  try {
    localStorage.setItem(`scorekept:seen:${key}`, '1');
  } catch {
    // Only a convenience.
  }
}
