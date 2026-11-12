/*
 * ScoreKept's offline copy (SPEC §16). The build fills in the cache name and
 * the file list (vite.config.ts). Plain JavaScript: it runs on its own, outside
 * the app.
 *
 * - Install: keep a copy of every file the app needs.
 * - Opening the app: ask the network for the newest page, but if it hasn't
 *   answered in 4 seconds (or there's no signal), open the saved copy.
 * - Everything else: the saved copy first (file names change with every build,
 *   so a saved file is never stale), then the network.
 * - Activate: clear copies from older versions.
 */
const CACHE = '__CACHE__';
const FILES = __FILES__;
const WAIT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('scorekept-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('slow')), WAIT_MS);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        if (response.ok) resolve(response);
        else reject(new Error(String(response.status)));
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fromNetwork(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./', copy));
          return response;
        })
        .catch(() => caches.match('./', { ignoreVary: true }).then((saved) => saved || fetch(request))),
    );
    return;
  }
  // ignoreVary: the app's scripts are fetched with an Origin header, and a saved
  // response marked "Vary: Origin" would otherwise never match.
  event.respondWith(caches.match(request, { ignoreVary: true }).then((saved) => saved || fetch(request)));
});

self.addEventListener('message', (event) => {
  if (event.data === 'version') event.source?.postMessage({ cache: CACHE });
});
