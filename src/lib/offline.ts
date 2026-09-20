import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * "Şimdi sinyalim kesilse bu uygulama açılır mı?"
 *
 * Arıcının arılığa çıkmadan önce soracağı asıl soru bu. Cevap ölçülebilir:
 * uygulamanın açılması için gereken dosyalar (kabuk, çalışan paket, ikon
 * fontu) service worker önbelleğinde var mı, yok mu.
 *
 * Yeni sürüm olup olmadığını sormanın kullanıcı için bir karşılığı yoktu —
 * uygulama kodu çevrimiçi her açılışta kendini zaten tazeliyor. Bu ekranda
 * karar verdiren bilgi, çevrimdışı hazırlık.
 */

export type OfflineStatus = 'unsupported' | 'checking' | 'ready' | 'partial' | 'missing';

type State = {
  status: OfflineStatus;
  /** Önbellekte bulunan / gereken dosya sayısı. */
  have: number;
  need: number;
  refreshing: boolean;
  lastRefreshed: Date | null;
};

function supported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof caches !== 'undefined'
  );
}

/**
 * Uygulamanın açılabilmesi için gereken adresler. Paket adı her derlemede
 * değiştiği ve font yolu pakete gömülü olduğu için listeyi çalışma anında
 * belgeden topluyoruz; sabit liste bir sonraki derlemede yanlış olurdu.
 */
export function criticalAssets(): string[] {
  if (typeof document === 'undefined') return ['/'];

  const urls = new Set<string>(['/']);

  const script = document.querySelector('script[src]')?.getAttribute('src');
  if (script) urls.add(new URL(script, location.origin).pathname);

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (typeof CSSFontFaceRule !== 'undefined' && rule instanceof CSSFontFaceRule) {
          const src = rule.style.getPropertyValue('src');
          const match = src.match(/url\(["']?([^"')]+)["']?\)/);
          if (match) urls.add(new URL(match[1], location.origin).pathname);
        }
      }
    } catch {
      // Farklı kaynaktan gelen stil sayfaları okunamaz; sorun değil.
    }
  }

  return Array.from(urls);
}

/** Verilen adresleri service worker'a ağdan çektirip önbelleğe yazdırır. */
async function askWorkerToCache(urls: string[]): Promise<void> {
  const worker = navigator.serviceWorker.controller;
  if (!worker) return;

  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    worker.postMessage({ type: 'REFRESH_CACHE', urls }, [channel.port2]);
    // Cevap gelmezse takılı kalmayalım.
    setTimeout(resolve, 10_000);
  });
}

export function useOfflineReadiness() {
  const [state, setState] = useState<State>({
    status: supported() ? 'checking' : 'unsupported',
    have: 0,
    need: 0,
    refreshing: false,
    lastRefreshed: null,
  });

  const evaluate = useCallback(async () => {
    if (!supported()) {
      setState((s) => ({ ...s, status: 'unsupported' }));
      return 'unsupported' as OfflineStatus;
    }

    const needed = criticalAssets();
    let have = 0;
    for (const url of needed) {
      if (await caches.match(url)) have += 1;
    }

    const status: OfflineStatus =
      have === 0 ? 'missing' : have === needed.length ? 'ready' : 'partial';

    setState((s) => ({ ...s, have, need: needed.length, status }));
    return status;
  }, []);

  /** Gereken dosyaları ağdan zorla çekip önbelleğe yazdırır. */
  const refresh = useCallback(async () => {
    if (!supported()) return;
    setState((s) => ({ ...s, refreshing: true }));
    await askWorkerToCache(criticalAssets());
    await evaluate();
    setState((s) => ({ ...s, refreshing: false, lastRefreshed: new Date() }));
  }, [evaluate]);

  const healed = useRef(false);

  useEffect(() => {
    if (!supported()) {
      setState((s) => ({ ...s, status: 'unsupported' }));
      return;
    }

    let cancelled = false;

    /**
     * Ölçüm zamanlaması: ilk ziyarette service worker sayfa yüklendikten
     * SONRA kuruluyor. Hemen ölçersek boş buluruz ve boş yere korkuturuz.
     * Önce worker'ın etkinleşmesini bekliyor, sonra birkaç kez daha
     * bakıyoruz.
     *
     * Ayrıca ilk ziyarette sayfa worker kontrolü almadan yüklendiği için
     * paket ve font onun üzerinden geçmiyor, yani önbelleğe girmiyor.
     * Kullanıcıya "düğmeye bas" demek yerine, o an internetteyse bir kez
     * kendimiz tamamlıyoruz — aksi halde uygulamayı kurup doğruca arılığa
     * giden biri çevrimdışı açılmadığını orada öğrenirdi.
     */
    const run = async () => {
      if (cancelled) return;
      const status = await evaluate();
      if (cancelled || healed.current) return;
      if (status !== 'partial' && status !== 'missing') return;
      if (navigator.onLine === false) return;
      if (!navigator.serviceWorker.controller) return;
      healed.current = true;
      await askWorkerToCache(criticalAssets());
      if (!cancelled) await evaluate();
    };

    navigator.serviceWorker.ready.then(run).catch(() => {});
    const probes = [0, 1500, 4000].map((delay) => setTimeout(run, delay));

    const onVisible = () => {
      if (document.visibilityState === 'visible') void evaluate();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      probes.forEach(clearTimeout);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [evaluate]);

  return { ...state, refresh, recheck: evaluate };
}
