// v83 — Nuevo logo corporativo integrado: transporte & contabilidad
const CACHE_NAME = 'contamedina-v122';

// All app shell files to pre-cache on install
const SHELL = [
    './',
    './index.html',
    './styles.css?v=87',
    './receipt-scan.css?v=3',
    './mobile-calendar.css?v=98',
    './distribution.css?v=4',
    './balance-gauge.css?v=6',
    './record-detail.css?v=1',
    './payments.css?v=1',
    './sidebar.css?v=4',
    './card.css?v=8',
    './firebase-config.js',
    './escenas.js?v=73',
    './app.js?v=94',
    './payments.js?v=1',
    './distribution.js?v=5',
    './balance-gauge.js?v=6',
    './record-detail.js?v=1',
    './receipt-scan.js?v=7',
    './ui-controls.js?v=1',
    './mobile-shell.js?v=85',
    './mobile-calendar.js?v=98',
    './card.js?v=8',
    './icon.svg',
    './icon.png',
    './icon-192.png',
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

    // 2.2 Comprobantes de Drive (/api/comprobantes/:id) — Cache-First (los fileId son inmutables)
    if (url.pathname.startsWith('/api/comprobantes/')) {
        e.respondWith(
            caches.open('contamedina-comprobantes-v1').then(async (cache) => {
                const cached = await cache.match(request);
                if (cached) return cached;
                try {
                    const res = await fetch(request);
                    if (res && res.ok) {
                        cache.put(request, res.clone());
                    }
                    return res;
                } catch (err) {
                    return cached || new Response('Error cargando comprobante', { status: 502 });
                }
            })
        );
        return;
    }

    // 2.5 Localhost live development — Network-first
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        e.respondWith(
            fetch(request).then((res) => {
                if (res && res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, clone));
                }
                return res;
            }).catch(() => caches.match(request))
        );
        return;
    }

    // 2.8 Páginas (index.html) — Network-First: con internet siempre llega la
    // versión publicada; sin internet (o si la red tarda más de 4 s) se usa la
    // copia guardada. Los JS/CSS llevan ?v= y pueden seguir en Cache-First.
    if (request.mode === 'navigate') {
        e.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                try {
                    const res = await fetch(request, { signal: AbortSignal.timeout(4000) });
                    if (res && res.ok) cache.put('./index.html', res.clone());
                    return res;
                } catch (err) {
                    return (await cache.match(request)) || (await cache.match('./index.html'))
                        || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
                }
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
