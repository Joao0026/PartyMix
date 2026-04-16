// Service Worker para PartyMix - PWA offline support
const CACHE_NAME = 'partymix-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico'
]

// Install - Cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Continue even if some assets fail
      })
    })
  )
  self.skipWaiting()
})

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch - Network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const cache = caches.open(CACHE_NAME)
          cache.then((c) => c.put(event.request, response.clone()))
        }
        return response
      })
      .catch(() => {
        // Fallback to cache on network error
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline - Content not cached')
        })
      })
  )
})
