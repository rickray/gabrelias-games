/* Gabrelia's Games — offline cache.

   Strategy: serve from the cache immediately (a tablet with no signal must
   still work, and a 4-year-old will not wait for the network), then quietly
   refresh that entry in the background. So a game always starts instantly,
   and a deploy lands on the next launch instead of never.

   VERSION only needs bumping to force-drop everything at once, e.g. after
   renaming files. Ordinary content changes now propagate on their own. */

var VERSION = "9";
var CACHE = "gabrelias-games-v" + VERSION;

var FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "css/hub.css",
  "css/game.css",
  "css/controls.css",
  "js/audio.js",
  "js/animals.js",
  "js/shell.js",
  "js/scene.js",
  "games/bubble-zoo/index.html",
  "games/bubble-zoo/js/game.js",
  "games/snack-time/index.html",
  "games/snack-time/js/foods.js",
  "games/snack-time/js/game.js",
  "games/hide-and-seek/index.html",
  "games/hide-and-seek/js/game.js",
  "games/zoo-train/index.html",
  "games/zoo-train/js/game.js",
  "games/abc-zoo/index.html",
  "games/abc-zoo/js/animals.js",
  "games/abc-zoo/js/game.js",
  "games/zoo-count/index.html",
  "games/zoo-count/js/animals.js",
  "games/zoo-count/js/game.js",
  "games/letter-pop/index.html",
  "games/letter-pop/js/animals.js",
  "games/letter-pop/js/game.js",
  "games/which-box/index.html",
  "games/which-box/js/animals.js",
  "games/which-box/js/game.js",
  "voice/index.json"
];

/* The spoken lines are listed in voice/index.json rather than here, so
   re-baking the voice does not mean editing this file. */
function voiceFiles() {
  return fetch("voice/index.json", { cache: "reload" })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (!data || !data.clips) return [];
      return Object.keys(data.clips).map(function (text) {
        return "voice/" + data.clips[text];
      });
    })["catch"](function () { return []; });
}

self.addEventListener("install", function (e) {
  e.waitUntil(
    Promise.all([caches.open(CACHE), voiceFiles()])
      .then(function (both) {
        var cache = both[0];
        /* One bad entry must not fail the whole install, or the app never
           goes offline-capable at all. */
        return Promise.all(FILES.concat(both[1]).map(function (file) {
          return cache.add(new Request(file, { cache: "reload" }))["catch"](function () {});
        }));
      })
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

function refresh(request) {
  return fetch(request).then(function (res) {
    if (res && res.ok && res.type !== "opaque") {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
    }
    return res;
  });
}

self.addEventListener("fetch", function (e) {
  var request = e.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(request, { ignoreSearch: true }).then(function (hit) {
      if (hit) {
        /* Update in the background; the child gets the cached copy now. */
        e.waitUntil(refresh(request)["catch"](function () {}));
        return hit;
      }
      return refresh(request)["catch"](function () {
        /* Offline and never cached: a navigation still has somewhere to go. */
        if (request.mode === "navigate") return caches.match("index.html");
        return new Response("", { status: 504, statusText: "Offline" });
      });
    })
  );
});
