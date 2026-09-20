/**
 * Kovan Defteri service worker.
 *
 * Uygulama tek sayfalık (web.output: "single") olduğu için her gezinme isteği
 * index.html'e düşer. Paket dosya adları derlemede hash aldığından önceden
 * listelenemez; strateji şu:
 *
 *   - gezinme (navigate): önce ağ, NETWORK_TIMEOUT_MS içinde cevap gelmezse
 *     önbellekteki uygulama kabuğu. Arılıkta tek çubuk sinyalde kullanıcı
 *     açılışı bekleyip durmasın diye.
 *   - aynı origindeki GET: önbellekten ver, arka planda tazele.
 *
 * Güncelleme akışı: yeni sürüm kurulduğunda KENDİLİĞİNDEN devralmaz. Bekler,
 * uygulama kullanıcıya "yeni sürüm hazır" der, kullanıcı onaylayınca
 * SKIP_WAITING mesajı gelir ve devralır. Böylece kullanıcı muayene
 * kaydederken ayağının altından paket değişmez.
 *
 * __BUILD_ID__ derleme sonrasında scripts/pwa-postbuild.js tarafından gerçek
 * derleme kimliğiyle değiştirilir; her yayın kendi önbelleğini alır, eskiler
 * activate sırasında silinir.
 */
const BUILD_ID = '__BUILD_ID__';
const VERSION = `kovan-defteri-${BUILD_ID}`;
const SHELL = '/';
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll([SHELL]))
      .catch(() => {}),
  );
  // Bilerek skipWaiting yok: devralma kararı kullanıcının.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'GET_BUILD_ID' && event.ports && event.ports[0]) {
    event.ports[0].postMessage(BUILD_ID);
  }
});

/** Ağ yavaşsa önbelleğe düş; sonsuza kadar bekleme. */
function networkWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Service worker'ın kendisi önbelleğe girmesin: güncelleme kontrolü
  // her zaman ağdan yapılmalı.
  if (url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      networkWithTimeout(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(SHELL, copy));
          return response;
        })
        .catch(async () => {
          const shell = await caches.match(SHELL);
          if (shell) return shell;
          const exact = await caches.match(request);
          if (exact) return exact;
          return Response.error();
        }),
    );
    return;
  }

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
