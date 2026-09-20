import { useCallback, useEffect, useState } from 'react';
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
      return;
    }

    const needed = criticalAssets();
    let have = 0;
    for (const url of needed) {
      const hit = await caches.match(url);
      if (hit) have += 1;
    }

    setState((s) => ({
      ...s,
      have,
      need: needed.length,
      status: have === 0 ? 'missing' : have === needed.length ? 'ready' : 'partial',
    }));
  }, []);

  useEffect(() => {
    if (!supported()) {
      setState((s) => ({ ...s, status: 'unsupported' }));
      return;
    }

    let cancelled = false;
    const run = () => {
      if (!cancelled) evaluate();
    };

    /**
     * Ilk ziyarette service worker sayfa yuklendikten SONRA kuruluyor ve
     * onbellegi o sirada dolduruyor. Hemen olcersek "hazir degil" deyip
     * bos yere korkutuyoruz. Bu yuzden once worker'in etkinlesmesini
     * bekliyor, ardindan birkac kez daha bakiyoruz.
     */
    navigator.serviceWorker.ready.then(run).catch(() => {});
    const probes = [0, 1500, 4000].map((delay) => setTimeout(run, delay));

    // Uygulama öne geldiğinde durum değişmiş olabilir.
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      probes.forEach(clearTimeout);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [evaluate]);

  /** Gereken dosyaları ağdan zorla çekip önbelleğe yazdırır. */
  const refresh = useCallback(async () => {
    if (!supported()) return;
    setState((s) => ({ ...s, refreshing: true }));

    const urls = criticalAssets();
    const worker = navigator.serviceWorker.controller;

    if (worker) {
      await new Promise<void>((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => resolve();
        worker.postMessage({ type: 'REFRESH_CACHE', urls }, [channel.port2]);
        setTimeout(resolve, 10_000);
      });
    }

    await evaluate();
    setState((s) => ({ ...s, refreshing: false, lastRefreshed: new Date() }));
  }, [evaluate]);

  return { ...state, refresh, recheck: evaluate };
}
