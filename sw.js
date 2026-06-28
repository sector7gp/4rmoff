const CACHE_NAME = "4rmoff-cache-v2";
const APP_SHELL = "./index.html";
const ASSETS = [
  "./",
  APP_SHELL,
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./src/db/indexeddb.js",
  "./src/auth/pin-auth.js",
  "./src/fields/fields-config.js",
  "./src/records/records-service.js",
  "./src/export/csv-export.js",
  "./src/ui/router.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(event.request);
        if (event.request.method === "GET" && response.ok) {
          const responseClone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, responseClone);
        }
        return response;
      } catch (error) {
        if (event.request.mode === "navigate") {
          const appShell = await caches.match(APP_SHELL, { ignoreSearch: true });
          if (appShell) {
            return appShell;
          }
        }
        throw error;
      }
    })()
  );
});
