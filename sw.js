const CACHE_NAME = "lol-team-analyzer-v31";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./src/utils/text.js",
  "./src/domain/composition-logic.js",
  "./src/domain/composition-engine.js",
  "./src/data/workbook-reader.js",
  "./src/data/champion-metadata.js",
  "./src/report/composition-table.js",
  "./src/ui/app.js",
  "./manifest.json",
  "./icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./version.json",
  "./src/ui/version.js",
  "./src/ui/realtime-mode.js",
  "./src/ui/smart-search.js",
  "./src/ui/no-duplicate-options.js",
  "./src/ui/selected-preview.js",
  "./src/ui/menu-icons.js",
  "./src/report/result-summary.js",
  "./src/report/result-summary.css",
  "./stage3-spacing.css",
  "./stage3-visual.css",
  "./stage3-animations.css",
  "./vendor/xlsx.full.min.js",
  "./Draft Pool.xlsx",
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
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() =>
      event.request.mode === "navigate"
        ? caches.match("./index.html")
        : Response.error()
    ))
  );
});
