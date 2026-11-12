/*
 * Works with no signal (SPEC §16): registers the service worker that keeps a
 * copy of the app on the device (src/sw/sw.js), and shows a small "Offline"
 * note while there's no connection. Only in the published build: during
 * development the files change constantly.
 */
import { h } from './dom.ts';

/** Resolves true once this device has a working offline copy. */
export let offlineReady: Promise<boolean> = Promise.resolve(false);

export function startOffline(root: HTMLElement): void {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    offlineReady = navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(() => true)
      .catch(() => false);
  }
  const note = h('p', { class: 'sk-offline', role: 'status', hidden: navigator.onLine }, 'Offline');
  root.append(note);
  const sync = () => (note.hidden = navigator.onLine);
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
}
