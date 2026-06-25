// Per-applet service worker for "Next service" — installable + offline, and ALWAYS the
// latest applet on open when online. Strategy: NETWORK-FIRST for the app shell + data
// (so an update you deploy shows up immediately), cache only as an OFFLINE fallback.
// Bump VERSION to force every installed app to drop its old cache on next open.
const VERSION = 'v2-2026-06-25';
const CACHE = 'next-service-' + VERSION;
const SHELL = [
  'transit_eta.html', 'pwa/departures.webmanifest',
  'pwa/icon-192.png', 'pwa/icon-512.png', 'pwa/icon-180.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

self.addEventListener('install', e => {
  self.skipWaiting(); // a new version takes over right away
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // delete old versioned caches so updates never pile up
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith('next-service-') && k !== CACHE)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  // live data is never cached — always straight to the network
  if (u.pathname.includes('tripupdates') || u.pathname.includes('/model/') || u.hostname.endsWith('mbta.com')) return;
  // the app shell is fetched FRESH (bypassing the HTTP cache) so a deploy is picked up on
  // the very next open; everything else is network-first with a cache fallback for offline
  const isShell = e.request.mode === 'navigate' || u.pathname.endsWith('/transit_eta.html');
  e.respondWith(
    fetch(isShell ? new Request(e.request, { cache: 'no-store' }) : e.request)
      .then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp).catch(() => {}));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
