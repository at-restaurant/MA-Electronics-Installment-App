// public/sw.js - PRODUCTION-READY SERVICE WORKER

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `ma-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `ma-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `ma-images-${CACHE_VERSION}`;

// Critical assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png',
    '/offline.html',
];

// ============================================
// INSTALL EVENT
// ============================================

self.addEventListener('install', (event) => {
    console.log('📦 SW: Installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('✅ SW: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('❌ SW: Install failed:', err))
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================

self.addEventListener('activate', (event) => {
    console.log('🚀 SW: Activating...');

    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys
                        .filter(key =>
                            key !== STATIC_CACHE &&
                            key !== DYNAMIC_CACHE &&
                            key !== IMAGE_CACHE
                        )
                        .map(key => {
                            console.log('🗑️ SW: Deleting old cache:', key);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => {
                console.log('✅ SW: Activated');
                return self.clients.claim();
            })
    );
});

// ============================================
// FETCH EVENT - SMART CACHING
// ============================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and other schemes
    if (!url.protocol.startsWith('http')) return;

    // ============================================
    // STRATEGY 1: Network Only (API/External)
    // ============================================

    if (
        url.pathname.startsWith('/api/') ||
        url.hostname.includes('supabase') ||
        url.hostname.includes('googleapis')
    ) {
        event.respondWith(fetch(request));
        return;
    }

    // ============================================
    // STRATEGY 2: Cache First (Images)
    // ============================================

    if (request.destination === 'image') {
        event.respondWith(
            caches.match(request)
                .then(cached => {
                    if (cached) return cached;

                    return fetch(request)
                        .then(response => {
                            if (response && response.ok) {
                                const clone = response.clone();
                                caches.open(IMAGE_CACHE)
                                    .then(cache => cache.put(request, clone));
                            }
                            return response;
                        })
                        .catch(() => {
                            // Return placeholder SVG
                            return new Response(
                                '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect fill="#e5e7eb" width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" fill="#9ca3af" font-size="16">Offline</text></svg>',
                                { headers: { 'Content-Type': 'image/svg+xml' } }
                            );
                        });
                })
        );
        return;
    }

    // ============================================
    // STRATEGY 3: Network First (HTML pages)
    // ============================================

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache successful responses
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    // Try cache first
                    return caches.match(request)
                        .then(cached => {
                            if (cached) return cached;

                            // Fallback to offline page
                            return caches.match('/offline.html');
                        });
                })
        );
        return;
    }

    // ============================================
    // STRATEGY 4: Stale While Revalidate (Assets)
    // ============================================

    event.respondWith(
        caches.match(request)
            .then(cached => {
                const fetchPromise = fetch(request)
                    .then(response => {
                        if (response && response.ok) {
                            const clone = response.clone();
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => cache.put(request, clone));
                        }
                        return response;
                    })
                    .catch(() => cached);

                return cached || fetchPromise;
            })
    );
});

// ============================================
// BACKGROUND SYNC
// ============================================

self.addEventListener('sync', (event) => {
    console.log('🔄 SW: Background sync:', event.tag);

    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    try {
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_NOW',
                timestamp: Date.now(),
            });
        });
        console.log('✅ SW: Sync message sent');
    } catch (error) {
        console.error('❌ SW: Sync failed:', error);
    }
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};

    const options = {
        body: data.body || 'You have a new notification',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [200, 100, 200],
        data: data,
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false,
        actions: [
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(
            data.title || 'MA Installment',
            options
        )
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});

// ============================================
// MESSAGE HANDLER
// ============================================

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(DYNAMIC_CACHE)
                .then(cache => cache.addAll(event.data.urls))
        );
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(keys =>
                Promise.all(keys.map(key => caches.delete(key)))
            )
        );
    }
});

console.log('✅ SW: Loaded successfully');