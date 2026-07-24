// Hand-rolled service worker (no Workbox dependency, keeping the project zero-build-step).
// Caches the app shell so the calculator itself loads offline / instantly on repeat visits.
// Cross-origin requests (Google sign-in, Sheets/Drive API, Tailwind/Google Fonts CDN) are
// left alone and always go straight to the network — they need a live connection anyway.

const CACHE_NAME = 'medpacklabcal-v1';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return; // let cross-origin requests pass through untouched

    event.respondWith(
        caches.match(request).then((cached) => {
            const networkFetch = fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => cached); // offline: fall back to whatever's cached

            // Stale-while-revalidate: serve cache immediately if we have it, refresh in background
            return cached || networkFetch;
        })
    );
});
