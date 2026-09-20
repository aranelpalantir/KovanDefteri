import AsyncStorage from '@react-native-async-storage/async-storage';

import { migrateRawText } from './migrate';
import { emptyDatabase, type Database } from './types';

const KEY = 'kovan-defteri/v1';

export type LoadResult =
  | { ok: true; db: Database; applied: string[] }
  | { ok: false; message: string; raw: string | null };

/**
 * Kayitlari okur ve gerekirse guncel semaya tasir.
 *
 * Okunamayan bir belgeyi ASLA bos veritabaniyla degistirmiyoruz. Onceki
 * surum bunu yapiyordu: JSON bozuksa bos donuyor, ardindan ilk kayitta
 * orijinalin uzerine yaziliyordu. Bir arinin sezonu boyle kaybolur.
 * Artik hata yukari bildiriliyor, ham metin de rapor icin yaninda geliyor.
 */
export async function loadDatabase(): Promise<LoadResult> {
  let raw: string | null = null;

  try {
    raw = await AsyncStorage.getItem(KEY);
  } catch {
    return { ok: false, message: 'Cihaz deposu okunamadı.', raw: null };
  }

  if (!raw) return { ok: true, db: emptyDatabase(), applied: [] };

  const result = migrateRawText(raw);

  if (!result.ok) {
    return { ok: false, message: result.message, raw };
  }

  // Goc calistiysa sonucu hemen kalicilastir; yoksa her acilista tekrar eder.
  if (result.applied.length > 0) {
    try {
      await saveDatabase(result.db);
    } catch {
      // Yazamazsak da uygulama calismaya devam etsin; bir sonraki
      // degisiklikte yeniden denenecek.
    }
  }

  return { ok: true, db: result.db, applied: result.applied };
}

export async function saveDatabase(db: Database): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(db));
}

export async function clearDatabase(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

/** Okunamayan belgeyi kurtarmak icin: ham metni oldugu gibi verir. */
export async function readRawDocument(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}
