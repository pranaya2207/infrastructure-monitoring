// ==========================================================================
// NIM-PRIS Progressive Web App (PWA) Service Worker
// Offline Cache & Cross-Platform Standalone Execution
// ==========================================================================

const CACHE_NAME = 'nim-pris-v1.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './static/css/style.css',
  './static/js/gov_data.js',
  './static/js/ml_engine_client.js',
  './static/js/charts.js',
  './static/js/main.js',
  './static/icons/icon-192.svg',
  './static/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Stale-while-revalidate or Network-first with Cache fallback
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // If offline and requesting document, return cached index
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
