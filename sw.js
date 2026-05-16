
const CACHE_NAME = 'myquicktag-v2'; // Cambiato a v2 per forzare l'aggiornamento

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Forza il browser a bypassare sempre la cache per le pagine dei profili e per il manifest
  if (url.searchParams.has('u') || url.pathname.includes('manifest')) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
