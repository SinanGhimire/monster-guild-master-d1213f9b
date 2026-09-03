/**
 * Echo Vanguards — service worker
 * Caches the app shell + versioned assets for offline play.
 * Strategy: cache-first for static assets, network-first for navigation.
 */

const CACHE_NAME = "echo-v1";
const SHELL = [
  "/",
  "/manifest.json",
  "/favicon.png",
  "/icon.svg",
  "/favicon.svg",
];

/* ---- install ---- */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

/* ---- activate ---- */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/* ---- fetch ---- */
self.addEventListener("fetch", (e) => {
  const { request } = e;

  // Only handle same-origin GET requests
  if (request.method !== "GET") return;

  // Navigation: network-first, fall back to cache (the app shell)
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Assets (images, scripts, styles, fonts): cache-first
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        // Cache successful same-origin responses
        if (res.ok && request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      });
    }),
  );
});
