const CACHE = "waylink-shell-v2"
const SHELL = ["/", "/index.html", "/manifest.webmanifest"]
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
})
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener("fetch", (event) => {
  const request = event.request
  const url = new URL(request.url)
  // API reads (for example GET /driver/routes/today) are private and change constantly, so they are
  // never intercepted or cached here: they are cross-origin and/or under /api/ and go straight to the network.
  if (request.method !== "GET" || url.pathname.startsWith("/api/") || url.origin !== self.location.origin) return
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")))
    return
  }
  // Built files under /assets/ have content-hashed names, so a cached copy never goes stale.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          // Clone on the untouched response, before it is returned: once the page starts reading the
          // body, clone() throws "Response body is already used". The cache write is kept alive with waitUntil.
          const copy = response.clone()
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)).catch((error) => console.warn("Asset cache write failed", error)))
        }
        return response
      })
    }))
  }
})
