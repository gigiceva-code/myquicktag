const CACHE_NAME = 'myquicktag-v3'; // Cambiamo versione per forzare il reset totale

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Il Vigile Urbano aggiornato per i Pretty URLs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Se l'URL contiene la cartella virtuale /u/ o le chiamate API, vai DIRETTAMENTE sulla rete (no cache!)
  if (url.pathname.includes('/u/') || url.pathname.includes('/api/')) {
    return event.respondWith(fetch(event.request));
  }

  // Per tutto il resto (immagini statiche o loghi), usa la rete e cadi sulla cache solo se offline
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

