import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Service worker guncellemelerini izler.
 *
 * Yeni bir surum yayinlandiginda tarayici yeni sw.js'i indirip "waiting"
 * durumuna alir ama devralmaz (sw.js icinde bilerek skipWaiting yok).
 * Bu kanca o durumu yakalar; kullanici onaylayinca applyUpdate() devralmayi
 * tetikler ve sayfa yeniden yuklenir.
 */

type UpdateState = {
  /** Yeni surum indirildi, devralmayi bekliyor. */
  updateReady: boolean;
  /** Kullanici "guncelle" dedi, devralma suruyor. */
  applying: boolean;
  /** Son kontrol zamani (kullaniciya "az once bakildi" demek icin). */
  lastChecked: Date | null;
  checking: boolean;
};

const isWeb = Platform.OS === 'web';

function swSupported(): boolean {
  return isWeb && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export function useAppUpdates() {
  const [state, setState] = useState<UpdateState>({
    updateReady: false,
    applying: false,
    lastChecked: null,
    checking: false,
  });

  useEffect(() => {
    if (!swSupported()) return;

    let cancelled = false;
    let registration: ServiceWorkerRegistration | undefined;

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
          // controller yoksa bu ilk kurulum; guncelleme degil.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) markReady();
        });
      });
    };

    /**
     * Tarayici yeni sw.js'i KENDILIGINDEN yalnizca gercek bir sayfa
     * yuklemesinde ve ~24 saatte bir kontrol ediyor. Uygulama acik kalip
     * kullanici sadece sekmeler arasinda gezindiginde (expo-router istemci
     * tarafinda gecis yapar, sayfa yeniden yuklenmez) hicbir kontrol
     * olmuyordu ve guncelleme hic fark edilmiyordu. Bu yuzden kontrolu
     * kendimiz tetikliyoruz.
     */
    let lastCheck = 0;
    const MIN_GAP_MS = 60_000; // sunucuyu gereksiz yormayalim
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
      // Uygulama acilir acilmaz bir kere bak.
      maybeCheck(true);
    });

    // Uygulama one geldiginde (baska uygulamadan donus, ekran acilmasi) bak.
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') maybeCheck();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    // Uzun sure acik kalirsa periyodik bak.
    const timer = setInterval(() => maybeCheck(), POLL_MS);

    // Yeni worker devraldiginda sayfayi tazele ki kod ile varliklar ayni
    // surumden olsun.
    const onControllerChange = () => {
      if (cancelled) return;
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
    } catch {
      // Cevrimdisiyken sessizce gec.
    }
    setState((s) => ({ ...s, checking: false, lastChecked: new Date() }));
  };

  /** Bekleyen surume gec ve sayfayi yenile. */
  const applyUpdate = async () => {
    if (!swSupported()) return;
    setState((s) => ({ ...s, applying: true }));
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      // controllerchange reload'u tetikleyecek; gelmezse elle yenile.
      setTimeout(() => window.location.reload(), 2000);
    } else {
      window.location.reload();
    }
  };

  return { ...state, checkNow, applyUpdate, supported: swSupported() };
}
