/* AMS Main Hub — offline service worker */
const CACHE = 'ams-mainhub-v16';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for the page (so updates show up online), cache-first for
// static assets. Everything still works fully offline from the cache.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Version probes (the hub's own update check AND the per-app version chips)
  // must always reach the network and never be cached.
  if (new URL(e.request.url).searchParams.has('vercheck')) {
    e.respondWith(fetch(e.request));
    return;
  }

  const isPage = e.request.mode === 'navigate' ||
    e.request.url.endsWith('/') || e.request.url.endsWith('index.html');

  if (isPage) {
    e.respondWith(
      // `cache: 'no-store'` bypasses the browser's HTTP cache so a fresh push
      // shows up immediately instead of waiting out GitHub Pages' ~10-min TTL.
      fetch(e.request, { cache: 'no-store' }).then((res) => {
        // Only cache/serve a genuinely good page — a 404/500 must NOT
        // overwrite the last known-good copy.
        if (!res.ok) return caches.match('./index.html').then((hit) => hit || res);
        caches.open(CACHE).then((c) => c.put('./index.html', res.clone())).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit || fetch(e.request).then((res) => {
        if (res.ok) {                                 // never cache a failed asset fetch
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
    )
  );
});
