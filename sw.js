/* Skill Match service worker — app shell cached; job data always fresh.
   A posting is only ever as current as its source feed: jobs.json is
   network-only and never served stale from cache.
   Runtime caching is restricted to same-origin shell assets only:
   cross-origin requests are never intercepted, and no API or
   cross-origin response is ever written to the cache. */
var CACHE = "skillmatch-shell-v2";
var SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(e){
  var url = new URL(e.request.url);
  /* Same-origin GETs only — anything else passes through untouched. */
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("jobs.json") !== -1){
    /* Job data: network only. If the network is down, no jobs — never stale ones. */
    e.respondWith(fetch(e.request, {cache: "no-store"}));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(hit){
      return hit || fetch(e.request).then(function(resp){
        if (resp && resp.ok){
          var copy = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return resp;
      });
    })
  );
});
