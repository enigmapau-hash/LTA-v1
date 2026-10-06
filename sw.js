const CACHE_NAME = "lol-team-analyzer-v13";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./shared-utils.js",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./version.json",
  "./version.js",
  "./realtime-mode.js",
  "./smart-search.js",
  "./no-duplicate-options.js",
  "./selected-preview.js",
  "./menu-icons.js",
  "./result-summary.js",
  "./result-summary.css",
  "./stage3-spacing.css",
  "./stage3-visual.css",
  "./stage3-animations.css",
  "./Draft Pool.xlsx",
];

const OFFLINE_SCRIPT = new Request(
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  { mode: "no-cors" }
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);

      // Classic script requests are no-cors, so preserve the opaque response for offline reloads.
      const response = await fetch(OFFLINE_SCRIPT);
      if (response.type !== "opaque" && !response.ok) {
        throw new Error("No se pudo almacenar SheetJS para el modo offline.");
      }
      await cache.put(OFFLINE_SCRIPT, response);
      await self.skipWaiting();
    })()
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
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request).catch(() =>
        event.request.mode === "navigate"
          ? caches.match("./index.html")
          : Response.error()
      )
    )
  );
});
