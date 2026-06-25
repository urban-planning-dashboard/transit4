// Per-applet service worker — makes "Next service" installable + usable offline.
// (Scoped at the tool root so it can serve transit_eta.html + the schedule cells offline.)
const CACHE = 'next-service-v1';
const SHELL = ['transit_eta.html', 'pwa/departures.webmanifest', 'pwa/icon-192.png', 'pwa/icon-512.png', 'pwa/icon-180.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(()=>{}))); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.pathname.includes('tripupdates') || u.pathname.includes('/model/') || u.hostname.endsWith('mbta.com')) return; // always live
  e.respondWith(
    fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp).catch(()=>{})); return r; })
      .catch(() => caches.match(e.request))
  );
});
