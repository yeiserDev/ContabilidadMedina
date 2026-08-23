// ====== CONTA MEDINA — SERVICE WORKER (Modo Metro) ======
// Versión: bump this string to force a cache refresh after updates
// v53 — la barra inferior baja al borde, donde vive en cualquier app.
// Antes: v52 la barra inferior en cristal líquido,
// Antes: v51 un camión recorre la ruta del mapa,
// Antes: v50 el historial sigue al dedo al arrastrarlo,
// Antes: v49 el camión repostando y el brillo de BCP,
// Antes: v48 la ficha del detalle en dos columnas,
// Antes: v47 los comprobantes entran en la ficha,
// Antes: v46 el repartidor sale de su local,
// Antes: v45 la escena de comida con el repartidor ilustrado,
// Antes: v44 la escena de viaje pasa a mapa con el recorrido,
// Antes: v43 cada gasto estrena su escena en el detalle,
// Antes: v42 el detalle sale delante y sube como hoja inferior,
// Antes: v41 el historial en lista con logotipos redondos,
// Antes: v40 fuera el hueco doble al final de la portada,
// Antes: v39 el historial se va a un panel derecho con gesto,
// Antes: v38 la marca de la tarjeta pasa a VISA,
// Antes: v37 canto curvado y costura en SVG,
// Antes: v36 canto de cuero por los lados y marca suelta,
// Antes: v35 fuera las fichas de Depósito/Gasto,
// Antes: v34 cartera con marco de cuero y costura,
// Antes: v33 la tarjeta de saldo pasa a cartera,
// Antes: v32 gráficos en cristal y globos de datos con la paleta,
// Antes: v31 bordes desvanecidos en los carruseles,
// Antes: v30 métodos de pago y gráficos como carruseles,
// Antes: v29 portada móvil sin el resumen del ciclo,
// Antes: v28 portada móvil: barra propia y tarjeta de saldo,
// Antes: v27 filas del historial en móvil,
// Antes: v26 tarjetas de método de pago en cristal,
// Antes: v25 carrusel móvil alineado y fin del desborde a 320px,
// Antes: v24 intercambio métodos de pago / KPIs,
// Antes: v23 reloj y calendario en cristal, v22 banda KPI de cristal, v21
// cristal del panel derecho con la paleta, v19 último depósito y gastos,
// v18 recordatorios con monto, v17 tarjetas en vertical, v16 mazo de métodos,
// v15 banda KPI, v14 modal de detalle, v13 logo CM, v12 rediseño estético.
// La estrategia del shell es cache-first: sin este bump, las instalaciones
// existentes seguirían sirviendo los assets viejos.
const CACHE_NAME = 'contamedina-v53';

// All app shell files to pre-cache on install
const SHELL = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './ui-controls.js',
    './mobile-shell.js',
    './escenas.js',
    './firebase-config.js',
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
