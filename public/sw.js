/**
 * Kovan Defteri service worker.
 *
 * Uygulama tek sayfalık (web.output: "single") olduğu için her gezinme isteği
 * index.html'e düşer. Paket dosya adları derlemede hash aldığından önceden
 * listelenemez; bu yüzden strateji şu:
 *
 *   - gezinme (navigate) istekleri: önce ağ, olmazsa önbellekteki uygulama kabuğu
 *   - aynı origindeki GET istekleri: önbellekten ver, arka planda tazele
 *
 * İlk çevrimiçi açılışta kullanılan her şey önbelleğe girer; sonraki açılışlar
 * arıcının tarlada olduğu gibi tamamen çevrimdışı çalışır.
 */
const VERSION = 'kovan-defteri-v1';
const SHELL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll([SHELL]))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Gezinme: ağ önce, çevrimdışıysa uygulama kabuğu.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(SHELL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL).then((cached) => cached ?? caches.match(request))),
    );
    return;
  }

  // Diğer varlıklar: önbellekten ver, arka planda tazele.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached ?? network;
    }),
  );
});
