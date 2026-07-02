/* ============================================================
   sw.js — Service Worker
   Offline page caching and request routing
   ============================================================ */

const CACHE_NAME = 'sb-mentorfile-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/auth.css',
  './js/db.js',
  './js/utils.js',
  './pages/admin.html',
  './pages/mentor.html',
  './pages/hod.html',
  './pages/student.html',
  './pages/parent.html',
  './pages/set-password.html',
  './pages/forgot-password.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Caching strategy: network-first fallback to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, toCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
