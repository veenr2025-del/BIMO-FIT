const CACHE_NAME = "bimo-fit-challenge-v6-account2";
const APP_VERSION = "20260804-account2";
const ASSETS = [
  "./",
  "./index.html",
  `./styles.css?v=${APP_VERSION}`,
  `./app.mjs?v=${APP_VERSION}`,
  `./core.mjs?v=${APP_VERSION}`,
  `./auth-client.mjs?v=${APP_VERSION}`,
  `./supabase-client.mjs?v=${APP_VERSION}`,
  "./supabase-config.js",
  "./supabase-schema.sql",
  "./supabase-auth-update.sql",
  "./manifest.webmanifest",
  "./assets/bimo-logo.webp",
  "./assets/bimo-logo-black.webp",
  "./assets/metcon.webp",
  "./assets/gallab.webp",
  "./assets/online-les.webp",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/qrcode-generator.js",
  "./assets/jsQR.js"
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

  const requestUrl = new URL(event.request.url);
  if (requestUrl.hostname.endsWith("supabase.co")) return;

  const shouldPreferNetwork = ["document", "script", "style", "worker"].includes(event.request.destination);

  event.respondWith(
    (shouldPreferNetwork
      ? fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
      : caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        });
      }))
  );
});
