/**
 * Kovan Defteri service worker (Safari/WebKit Redirect-Safe & Auto-Update).
 *
 * Uygulama tek sayfalık (web.output: "single") olduğu için her gezinme isteği
 * index.html'e düşer.
 *
 * Safari WebKit kısıtı:
 *   Safari WebKit, event.respondWith'e verilen yanıtın "response.redirected === true"
 *   olmasına izin vermez; aksi halde "Response served by service worker has redirections"
 *   hatası fırlatarak sayfanın açılmasını engeller.
 *   cleanResponse() fonksiyonu yanıtı temiz bir Response nesnesi olarak yeniden kurar.
 *
 * Güncelleme akışı:
 *   Yeni sürüm kurulduğunda self.skipWaiting() ve self.clients.claim() ile
 *   hemen devralınır. scripts/pwa-postbuild.js içerisindeki reg.update() ile
 *   her sayfa açılışında yeni sürüm kontrolü yapılır.
 */
const BUILD_ID = '__BUILD_ID__';
const VERSION = `kovan-defteri-${BUILD_ID}`;
const SHELL = '/';
const NETWORK_TIMEOUT_MS = 3000;

/**
 * Safari WebKit restricts responses passed to event.respondWith from having
 * response.redirected === true. Otherwise, WebKit throws:
 * "Response served by service worker has redirections".
 * This function reconstructs a fresh Response object without the redirected flag.
 */
function cleanResponse(response) {
  if (!response || !response.redirected || response.status === 0) {
    return response;
  }
  try {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err) {
    return response;
  }
}

// 1. Kurulum: Varlıkları önbelleğe al ve hemen aktifleş
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then(async (cache) => {
        try {
          const res = await fetch(SHELL, { redirect: 'follow' });
          if (res.ok) {
            await cache.put(SHELL, cleanResponse(res));
          }
        } catch (err) {
          console.warn('[SW] Precache failed for:', SHELL, err);
        }
      })
      .then(() => self.skipWaiting()),
  );
});

// 2. Etkinleştirme: Eski önbellekleri temizle ve kontrolü hemen devral
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== VERSION)
            .map((k) => {
              console.log('[SW] Eski önbellek siliniyor:', k);
              return caches.delete(k);
            }),
        ),
      )
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

  /**
   * Sayfa "çevrimdışı kopyayı tazele" dediğinde verilen adresleri ağdan
   * zorla çekip önbelleğe yazar.
   */
  if (data.type === 'REFRESH_CACHE' && Array.isArray(data.urls)) {
    const port = event.ports && event.ports[0];
    event.waitUntil(
      (async () => {
        const cache = await caches.open(VERSION);
        const results = await Promise.all(
          data.urls.map(async (url) => {
            try {
              const response = await fetch(url, { cache: 'reload', redirect: 'follow' });
              if (!response || response.status !== 200) return false;
              await cache.put(url === '/' ? SHELL : url, cleanResponse(response));
              return true;
            } catch {
              return false;
            }
          }),
        );
        if (port) port.postMessage({ ok: results.every(Boolean), count: results.filter(Boolean).length });
      })(),
    );
  }
});

/** Ağ yavaşsa önbelleğe düş; sonsuza kadar bekleme. */
function networkWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS);
    fetch(request, { redirect: 'follow' }).then(
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

// 3. İstek Yönetimi: Çevrimdışı destek, hızlı başlatma ve WebKit koruması
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Service worker'ın kendisi önbelleğe girmesin: güncelleme kontrolü her zaman ağdan yapılmalı.
  if (url.pathname === '/sw.js') return;

  // Sayfa yönlendirme / PWA açılış istekleri (Navigasyon)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cachedResponse = (await caches.match(request)) || (await caches.match(SHELL));

        const fetchPromise = networkWithTimeout(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const cache = await caches.open(VERSION);
              cache.put(SHELL, cleanResponse(networkResponse.clone()));
              cache.put(request, cleanResponse(networkResponse.clone()));
            }
            return cleanResponse(networkResponse);
          })
          .catch(() => null);

        // Önbellekte varsa Safari yönlendirme hatasını temizleyip anında sun
        if (cachedResponse) {
          return cleanResponse(cachedResponse);
        }

        // Önbellekte yoksa ağ yanıtını bekle
        const networkResponse = await fetchPromise;
        if (networkResponse) {
          return cleanResponse(networkResponse);
        }

        return new Response('Kovan Defteri - Çevrimdışı', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })(),
    );
    return;
  }

  // Statik dosyalar (JS paketleri, CSS, İkonlar, Fontlar) - Stale While Revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      const fetchPromise = fetch(request)
        .then(async (response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const cache = await caches.open(VERSION);
            cache.put(request, cleanResponse(response.clone()));
          }
          return cleanResponse(response);
        })
        .catch(() => null);

      if (cached) {
        return cleanResponse(cached);
      }

      const network = await fetchPromise;
      if (network) return cleanResponse(network);

      return new Response('', { status: 404 });
    })(),
  );
});
