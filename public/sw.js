// ====== CONTA MEDINA — SERVICE WORKER (Modo Metro) ======
// Versión: bump this string to force a cache refresh after updates
const CACHE_NAME = 'contamedina-v9';

// All app shell files to pre-cache on install
const SHELL = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './firebase-config.js',
    './icon.svg',
    './manifest.json',
];

// External CDN resources to cache on first use
const CDN_HOSTS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'www.gstatic.com',
];

// ====== INSTALL — pre-cache app shell ======
self.addEventListener('install', (e) => {
    self.skipWaiting(); // Activate immediately
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(SHELL);
        }).catch(err => console.warn('[SW] Pre-cache partial failure:', err))
    );
});

// ====== ACTIVATE — remove old caches ======
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k !== CACHE_NAME)
                    .map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ====== FETCH — smart routing strategy ======
self.addEventListener('fetch', (e) => {
    const { request } = e;

    // Skip non-GET requests (Firebase writes, etc.)
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // 1. Firebase Realtime DB & Auth — Network only (real-time data must be fresh)
    if (url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('firebase.com') ||
        url.hostname.includes('googleapis.com') && url.pathname.includes('identitytoolkit')) {
        e.respondWith(fetch(request));
        return;
    }

    // 2. CDN Resources (Chart.js, fonts, jsPDF) — Stale-While-Revalidate
    const isCDN = CDN_HOSTS.some(h => url.hostname.includes(h));
    if (isCDN) {
        e.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cached = await cache.match(request);
                const fetchPromise = fetch(request).then((res) => {
                    if (res.ok) cache.put(request, res.clone());
                    return res;
                }).catch(() => null);
                return cached || fetchPromise;
            })
        );
        return;
    }

    // 3. App Shell (HTML, CSS, JS, icons) — Cache-First, then network update
    e.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(request);
            const fetchPromise = fetch(request).then((res) => {
                if (res && res.ok) cache.put(request, res.clone());
                return res;
            }).catch(() => null);

            // Return cached immediately if available; update in background
            if (cached) {
                fetchPromise.catch(() => {}); // Update silently
                return cached;
            }

            // No cache — try network, fallback to index.html for navigation
            const networkRes = await fetchPromise;
            if (networkRes) return networkRes;

            // Offline fallback: serve index.html for HTML navigation requests
            if (request.headers.get('accept')?.includes('text/html')) {
                return cache.match('./index.html');
            }

            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        })
    );
});

// ====== BACKGROUND SYNC (if supported) ======
// This fires when the device reconnects after being offline
self.addEventListener('sync', (e) => {
    if (e.tag === 'sync-expenses') {
        console.log('[SW] Background sync triggered — reconnected!');
        // The app's own Firebase listener will sync when it comes back online
        // Notify all open clients to re-sync
        e.waitUntil(
            self.clients.matchAll().then((clients) => {
                clients.forEach(client => client.postMessage({ type: 'BACK_ONLINE' }));
            })
        );
    }
});
