const CACHE_NAME = "jk-foundry-app-v2";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/app-icon.svg",
  "/app-icon-192.png",
  "/app-icon-512.png",
  "/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      const indexHtml = await (await cache.match("/index.html")).text();
      const appAssets = Array.from(
        indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g),
        ([, assetPath]) => assetPath,
      );
      await cache.addAll(appAssets);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                (cacheName.startsWith("jk-foundry-app-") ||
                  cacheName.startsWith("el-foundry-app-")) &&
                cacheName !== CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) {
            await (await caches.open(CACHE_NAME)).put("/index.html", response.clone());
          }
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || caches.match("/index.html")),
    );
    return;
  }

  if (requestUrl.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cachedResponse) =>
          cachedResponse ||
          fetch(event.request).then(async (response) => {
            if (response.ok) {
              await (await caches.open(CACHE_NAME)).put(event.request, response.clone());
            }
            return response;
          }),
      ),
    );
  }
});
