/**
 * Service Worker - Phone Trade-in PWA
 * Caches UI shell + API responses for offline use
 */

const CACHE_VERSION = 'v4.2';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Static files to cache (app shell)
const SHELL_FILES = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
];

// ── INSTALL: Cache app shell ──────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      console.log('[SW] Caching shell files');
      return cache.addAll(SHELL_FILES.filter(f => !f.startsWith('http')));
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: Clean old caches ────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== SHELL_CACHE && k !== API_CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Serve from cache, fallback network ─────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API requests: Network first, cache fallback (10 min TTL)
  if (url.pathname.startsWith('/api/')) {
    if (event.request.method === 'GET') {
      event.respondWith(networkFirstAPI(event.request));
    }
    return;
  }

  // Static assets: Cache first
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline - File not cached', { status: 503 });
  }
}

async function networkFirstAPI(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request.clone(), { signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      // Store with timestamp header
      const cloned = response.clone();
      const body = await cloned.json();
      const withTs = new Response(JSON.stringify({ ...body, _cached_at: Date.now() }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(request, withTs);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Serving cached API response for:', request.url);
      return cached;
    }
    return new Response(JSON.stringify({ error: 'Offline - No cached data' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
