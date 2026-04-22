const CACHE_NAME = 'voidrun-v1';

// All CSS files are explicitly listed so they are pre-cached on install.
// The whole point of this demo: the game is fully playable offline.
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/main.js',
  '/css/theme.css',
  '/css/stars.css',
  '/css/player.css',
  '/css/enemies.css',
  '/css/bullets.css',
  '/css/explosions.css',
  '/css/hud.css',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients
      .claim()
      .then(() =>
        caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            )
          )
      )
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      });
    })
  );
});

async function notifyClients(payload) {
  const all = await clients.matchAll({ type: 'window' });
  all.forEach((c) => c.postMessage(payload));
}

self.addEventListener('message', (event) => {
  const { action } = event.data || {};
  if (!action) return;
  event.waitUntil(
    (async () => {
      try {
        if (action === 'CLEAN_UP') {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
          await notifyClients({ type: 'ACTION_DONE', action, ok: true });
        } else if (action === 'REFRESH_ALL') {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
          const cache = await caches.open(CACHE_NAME);
          await cache.addAll(PRECACHE_ASSETS);
          await notifyClients({ type: 'ACTION_DONE', action, ok: true });
        }
      } catch (err) {
        await notifyClients({
          type: 'ACTION_DONE',
          action,
          ok: false,
          error: err.message,
        });
      }
    })()
  );
});
