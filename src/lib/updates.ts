import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Service worker guncellemelerini izler.
 *
 * ONEMLI: Uygulama kodu zaten kendini tazeliyor. Gezinme istegi once aga
 * gidiyor, gelen yeni index.html onbellege yaziliyor, onun gosterdigi yeni
 * paket de onbellekte olmadigi icin agdan cekilip onbellege yaziliyor.
 * Yani cevrimici bir acilis, cevrimdisi kopyayi da guncelliyor.
 *
 * Geriye kalan tek fark service worker'in KENDI kodu (onbellekleme mantigi,
 * ag zaman asimi gibi). O da bekleyen worker'in devralmasiyla gelir ve bu
 * kendiliginden olur: uygulama tamamen kapatilip acildiginda eski worker'i
 * kullanan istemci kalmaz, bekleyen worker etkinlesir.
 *
 * Bu yuzden kullaniciya "guncelle" diye bir is cikarmiyoruz. Durum yalnizca
 * Ayarlar'da, soruldugunda bildiriliyor.
 */

type UpdateState = {
  /** Yeni bir service worker indirildi, devralmak icin bekliyor. */
  updateReady: boolean;
  lastChecked: Date | null;
  checking: boolean;
};

function swSupported(): boolean {
  return Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export function useAppUpdates() {
  const [state, setState] = useState<UpdateState>({
    updateReady: false,
    lastChecked: null,
    checking: false,
  });

  useEffect(() => {
    if (!swSupported()) return;

    let cancelled = false;
    let registration: ServiceWorkerRegistration | undefined;

    // Sayfa yuklenirken zaten bir worker tarafindan kontrol ediliyor muydu?
    // Ilk kez kontrol altina alinmak guncelleme degil, normal ilk kurulumdur;
    // o durumda sayfayi yeniden yuklemek gereksiz bir sicrama olur.
    const hadController = !!navigator.serviceWorker.controller;

    const markReady = () => {
      if (!cancelled) setState((s) => ({ ...s, updateReady: true }));
    };

    const watch = (reg: ServiceWorkerRegistration) => {
      registration = reg;
      if (reg.waiting && navigator.serviceWorker.controller) markReady();

      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) markReady();
        });
      });
    };

    /**
     * Tarayici yeni sw.js'i kendiliginden yalnizca gercek bir sayfa
     * yuklemesinde ve ~24 saatte bir kontrol ediyor. Uygulama acik kalip
     * kullanici sekmeler arasinda gezindiginde (expo-router istemci tarafinda
     * gecis yapar) hicbir kontrol olmuyor. Bu yuzden kendimiz tetikliyoruz.
     */
    let lastCheck = 0;
    const MIN_GAP_MS = 60_000;
    const POLL_MS = 15 * 60_000;

    const maybeCheck = async (force = false) => {
      if (cancelled || !registration) return;
      const now = Date.now();
      if (!force && now - lastCheck < MIN_GAP_MS) return;
      lastCheck = now;
      try {
        await registration.update();
      } catch {
        // Cevrimdisiyken sessizce gec.
      }
    };

    navigator.serviceWorker.ready.then((reg) => {
      if (cancelled) return;
      watch(reg);
      maybeCheck(true);
    });

    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') maybeCheck();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    const timer = setInterval(() => maybeCheck(), POLL_MS);

    // Devralma normalde uygulama kapaliyken olur. Yine de calisan bir sayfa
    // devredilirse kod ile varliklar ayni surumden olsun diye tazeliyoruz.
    let refreshing = false;
    const onControllerChange = () => {
      if (cancelled || refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      registration = undefined;
    };
  }, []);

  /** Sunucuda yeni surum var mi diye elle sorar. */
  const checkNow = async () => {
    if (!swSupported()) return;
    setState((s) => ({ ...s, checking: true }));
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.update();
      // Kurulumun bitmesi icin kisa bir pay birak.
      await new Promise((r) => setTimeout(r, 1500));
      const fresh = await navigator.serviceWorker.getRegistration();
      if (fresh?.waiting && navigator.serviceWorker.controller) {
        setState((s) => ({ ...s, updateReady: true }));
      }
    } catch {
      // Cevrimdisiyken sessizce gec.
    }
    setState((s) => ({ ...s, checking: false, lastChecked: new Date() }));
  };

  return { ...state, checkNow, supported: swSupported() };
}
