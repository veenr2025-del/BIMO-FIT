const CACHE_NAME = "bimo-fit-challenge-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.mjs",
  "./core.mjs",
  "./manifest.webmanifest",
  "./assets/bimo-logo.webp",
  "./assets/bimo-logo-black.webp",
  "./assets/metcon.webp",
  "./assets/gallab.webp",
  "./assets/online-les.webp",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/qrcode-generator.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
