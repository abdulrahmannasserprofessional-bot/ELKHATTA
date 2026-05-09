
const CACHE_NAME = 'platform-premium-v2';
const ASSETS_TO_CACHE = [
  '/student/index.html',
  '/student/student.js',
  '/student/student.css',
  '/admin/index.html',
  '/admin/admin.js',
  '/admin/admin.css',
  '/css/modern_ui.css',
  '/offline.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap'
];

// Install Event - Pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching Premium Assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting Old Cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and local/trusted origins
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin;
  const isCdn = url.hostname.includes('cdnjs') || url.hostname.includes('fonts.googleapis') || url.hostname.includes('fonts.gstatic');

  if (!isLocal && !isCdn) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Update cache with new version from network
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to offline page if network fails and no cache
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });

      // Return cached response immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
