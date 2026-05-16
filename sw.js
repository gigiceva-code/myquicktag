const CACHE_NAME = 'myquicktag-v1';

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Attivazione e pulizia dei vecchi dati
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercettazione delle richieste: la chiave per non sovrascrivere i profili
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Se la richiesta contiene un utente (?u=), andiamo DIRETTAMENTE alla rete
  // Senza salvare in cache, così eliminiamo il salto da test a tost!
  if (url.searchParams.has('u')) {
    return event.respondWith(fetch(event.request));
  }

  // Per i file statici normali (immagini, loghi), usa la strategia standard
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
