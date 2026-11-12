/*
 * Keep the Screen On During Games (SPEC §16): only while a game is in
 * progress. The Screen Wake Lock where it works; Home Screen apps before
 * iOS 18.4 ignore it, so a tiny silent looping video keeps the screen on
 * instead (LESSONS 9).
 */
import videoUrl from '../assets/stay-awake.mp4';

type Lock = { release: () => Promise<void>; addEventListener?: (t: 'release', fn: () => void) => void };
type WakeNav = { wakeLock?: { request: (t: 'screen') => Promise<Lock> } };

let lock: Lock | null = null;
let video: HTMLVideoElement | null = null;
let wanted = false;

/** How the screen is kept on here, for New Game Defaults. */
export function awakeMethod(): 'wake-lock' | 'video' {
  return (navigator as unknown as WakeNav).wakeLock ? 'wake-lock' : 'video';
}

async function hold(): Promise<void> {
  const nav = navigator as unknown as WakeNav;
  if (nav.wakeLock && !lock) {
    try {
      lock = await nav.wakeLock.request('screen');
      lock.addEventListener?.('release', () => (lock = null));
      return;
    } catch {
      // Refused (an older Home Screen app): fall back to the video.
    }
  }
  if (lock) return;
  if (!video) {
    video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.className = 'sk-awake-video';
    document.body.append(video);
  }
  void video.play().catch(() => undefined);
}

function letGo(): void {
  void lock?.release().catch(() => undefined);
  lock = null;
  video?.pause();
}

/** Called whenever the app changes: keep the screen on only while it's wanted. */
export function keepAwake(want: boolean): void {
  if (want === wanted) return;
  wanted = want;
  if (want) void hold();
  else letGo();
}

// The lock drops when the app goes to the background; take it again on return.
document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible') void hold();
});
// iOS plays video only after a tap: try again on the first tap if it was refused.
document.addEventListener('pointerdown', () => {
  if (wanted && !lock && video?.paused) void video.play().catch(() => undefined);
});
