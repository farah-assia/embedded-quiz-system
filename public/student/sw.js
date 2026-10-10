const CACHE_NAME = 'quizy-student-v1';
const STATIC_ASSETS = [
    '/student',
    '/student/manifest.json',
    '/student/offline.html',
    '/student/icons/icon-192.svg',
    '/student/icons/icon-512.svg',
    '/student/icons/icon-maskable.svg'
];

// Install: cache core application shell
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install event');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Pre-caching static assets');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate event');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[ServiceWorker] Removing old cache', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: network first with offline fallback for pages
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Do not handle non-GET or Socket.IO requests
    if (request.method !== 'GET' || request.url.includes('/socket.io/') || request.url.includes('/api/')) {
        return;
    }

    // HTML Navigation requests: Network First, fallback to offline.html
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    return caches.match(request).then((cached) => {
                        return cached || caches.match('/student/offline.html');
                    });
                })
        );
        return;
    }

    // Static Assets: Stale-While-Revalidate
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Ignore fetch errors for background revalidation
            });

            return cachedResponse || fetchPromise;
        })
    );
});
