const CACHE_NAME = 'myquicktag-v7';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Nessun gestore 'fetch': il sito va sempre in rete. Un gestore vuoto rallenta solo le
// navigazioni (avviso di Chrome) e non serve più per rendere l'app installabile.
