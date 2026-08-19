/* Gabrelia's Games — offline cache.
   IMPORTANT: bump VERSION every time any site file changes, or tablets
   will keep serving the old copy from the cache. */

var VERSION = "1";
var CACHE = "gabrelias-games-v" + VERSION;

var FILES = [
  "./",
  "index.html",
  "css/hub.css",
  "icon.svg",
  "manifest.webmanifest",
  "games/bubble-zoo/index.html",
  "games/bubble-zoo/css/style.css",
  "games/bubble-zoo/js/audio.js",
  "games/bubble-zoo/js/animals.js",
  "games/bubble-zoo/js/game.js",
  "games/snack-time/index.html",
  "games/snack-time/css/style.css",
  "games/snack-time/js/audio.js",
  "games/snack-time/js/animals.js",
  "games/snack-time/js/foods.js",
  "games/snack-time/js/game.js",
  "games/hide-and-seek/index.html",
  "games/hide-and-seek/css/style.css",
  "games/hide-and-seek/js/audio.js",
  "games/hide-and-seek/js/animals.js",
  "games/hide-and-seek/js/game.js",
  "games/zoo-train/index.html",
  "games/zoo-train/css/style.css",
  "games/zoo-train/js/audio.js",
  "games/zoo-train/js/animals.js",
  "games/zoo-train/js/game.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key !== CACHE) return caches.delete(key);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res.ok && new URL(e.request.url).origin === self.location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(e.request, copy); });
        }
        return res;
      });
    })
  );
});
