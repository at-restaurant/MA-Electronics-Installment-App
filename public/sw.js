// public/sw.js
const CACHE_NAME = 'ma-installment-v1';
const urlsToCache = [
    '/',
    '/customers',
    '/daily',
    '/pending',
    '/settings',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});