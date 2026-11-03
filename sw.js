const VER = 'scada-v1';
const STATIC = `${VER}-static`, DYN = `${VER}-dyn`;
const PRECACHE = ['./','index.html','offline.html','manifest.webmanifest','favicon.svg','favicon.ico','css/styles.css','assets/icons.svg',
  'js/app.js','js/modules/tankFarm.js','js/modules/esdMatrix.js','js/modules/lpgPumps.js','js/modules/pipeline.js','js/modules/refinery.js','js/modules/loopCheck.js',
  'icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-192.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png','icons/favicon-16x16.png','icons/favicon-32x32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(STATIC).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(VER)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) { const c = await caches.open(DYN); c.put(req, res.clone()); }
      return res;
    } catch (err) {
      if (req.mode === 'navigate') return caches.match('offline.html');
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
// Background sync hook: notify open clients so the app can flush queued reports.
self.addEventListener('sync', e => {
  if (e.tag === 'sync-reports') e.waitUntil(self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage({ type: 'SYNC_REPORTS' }))));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
