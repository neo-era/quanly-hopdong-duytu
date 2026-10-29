// sw.js — Service worker: cache app shell cho PWA (mở offline được).
const CACHE = 'hdduytu-v6';
const SHELL = [
  './', './index.html', './app.css',
  './js/app.js', './js/ui.js', './js/store.js', './js/drive.js',
  './js/calc.js', './js/export.js', './js/config.js', './sample/seed.js',
  './manifest.webmanifest', './vendor/xlsx.full.min.js', './vendor/exceljs.min.js',
  './js/kl/ui.js', './js/kl/core.js', './js/kl/parse.js', './js/kl/templates.js', './js/kl/export.js', './js/kl/worker.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Request cross-origin (Google API/GIS/Fonts) đi thẳng, SW không đụng vào
  if (url.origin !== location.origin) return;
  // Same-origin: NETWORK-FIRST — luôn lấy bản mới khi có mạng, offline thì dùng cache.
  // Nhờ vậy sửa code/config rồi deploy là app cập nhật ngay, không kẹt bản cũ.
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
