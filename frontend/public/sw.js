self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Pass-through fetch handler required for Android WebAPK installability & share_target.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
