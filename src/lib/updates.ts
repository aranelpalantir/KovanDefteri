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

    navigator.serviceWorker.ready.then((reg) => {
      if (!cancelled) watch(reg);
    });

    // Yeni worker devraldiginda sayfayi tazele ki kod ile varliklar ayni
    // surumden olsun.
    const onControllerChange = () => {
      if (cancelled) return;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      cancelled = true;
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
