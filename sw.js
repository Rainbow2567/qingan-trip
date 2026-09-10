/* 青甘遛弯记 · Service Worker
   缓存应用外壳，支持离线打开；导航请求网络优先（保证拿到最新 index.html），断网回退缓存。 */
const CACHE = 'qingan-trip-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.add('./')).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // 只接管同源请求（应用外壳在 /qingan-trip/ 内）；高德 CDN 等跨域资源不拦截
  if (url.origin !== self.location.origin) return;

  if (e.request.mode === 'navigate') {
    // 导航：网络优先，失败回退缓存外壳
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put('./', clone));
          return resp;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  // 其它同源静态资源：缓存优先
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((resp) => {
      if (resp && resp.status === 200) {
        const clone = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
      }
      return resp;
    }))
  );
});
