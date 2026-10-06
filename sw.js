const CACHE_NAME = "lol-team-analyzer-v12";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./shared-utils.js",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
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
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match("./index.html")))
  );
});