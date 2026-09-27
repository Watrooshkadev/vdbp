const CACHE = 'vagony-v20';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if(e.request.method !== 'GET') return;

  const isNavigation =
    e.request.mode === 'navigate' ||
    e.request.destination === 'document' ||
    e.request.url.endsWith('/') ||
    e.request.url.includes('/index.html');

  if(isNavigation){
    // Для HTML сначала проверяем сервер.
    // Если сети нет — используем сохранённую версию.
    e.respondWith(
      fetch(e.request, {cache:'no-store'})
        .then((res) => {
          if(res.ok){
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put('./index.html', clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Остальные ресурсы: сначала кэш, затем сеть.
  e.respondWith(
    caches.match(e.request)
      .then((cached) => {
        if(cached) return cached;
        return fetch(e.request).then((res) => {
          if(res.ok){
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return res;
        });
      })
  );
});
