const CACHE_NAME = 'myquicktag-v5';

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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Vai sempre sulla rete, nessuna cache
  if (url.pathname.includes('/api/') || url.pathname.includes('/u/') || url.pathname.endsWith('.html')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then(cached => {
        return cached || new Response('Offline', { status: 503 });
      });
    })
  );
});
