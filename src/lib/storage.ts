import AsyncStorage from '@react-native-async-storage/async-storage';

import { emptyDatabase, type Database } from './types';

const KEY = 'kovan-defteri/v1';

export async function loadDatabase(): Promise<Database> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyDatabase();
    const parsed = JSON.parse(raw) as Partial<Database>;
    // Eksik alanlara karşı savunmacı birleştirme (sürüm atlamalarında veri kaybolmasın).
    return { ...emptyDatabase(), ...parsed, version: 1 };
  } catch {
    return emptyDatabase();
  }
}

export async function saveDatabase(db: Database): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(db));
}

export async function clearDatabase(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
