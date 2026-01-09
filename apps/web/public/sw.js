// Service Worker for PolyBuddy
// Provides offline support and caching

const CACHE_NAME = "polybuddy-v1";
const RUNTIME_CACHE = "polybuddy-runtime";

// Assets to cache on install
const PRECACHE_URLS = [
  "/",
  "/offline",
];

// Install event - cache essential assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => {
            return caches.delete(cacheToDelete);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first, fall back to cache
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // API requests - network first, cache as fallback
  if (event.request.url.includes("/api/")) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            // Cache successful GET requests
            if (event.request.method === "GET" && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Network failed, try cache
            return cache.match(event.request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // No cache, return offline page
              return caches.match("/offline");
            });
          });
      })
    );
    return;
  }

  // Static assets - cache first, network as fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return caches.open(RUNTIME_CACHE).then((cache) => {
        return fetch(event.request).then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      });
    })
  );
});

