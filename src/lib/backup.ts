import { Platform, Share } from 'react-native';

import { emptyDatabase, type Database } from './types';

/**
 * Yedek alma ve geri yukleme.
 *
 * Yedek, veritabaninin oldugu gibi JSON hali. Disa aktarim web'de gercek bir
 * dosya indirmesi (iOS'ta Dosyalar'a kaydedilebilir), native'de paylasim
 * sayfasi. Ice aktarimda dosya once dogrulanir; bozuk bir dosya mevcut
 * kayitlarin uzerine yazmaz.
 */

export type BackupFile = {
  format: 'kovan-defteri-backup';
  version: 1;
  exportedAt: string;
  data: Database;
};

export function buildBackup(db: Database): BackupFile {
  return {
    format: 'kovan-defteri-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: db,
  };
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `kovan-defteri-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

export type ParseResult =
  | { ok: true; db: Database; summary: string; exportedAt?: string }
  | { ok: false; error: string };

/** Ham metni dogrular. Hicbir sey yazmaz; cagiran karar verir. */
export function parseBackup(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Dosya geçerli bir JSON değil. Yedek dosyasını olduğu gibi seçin.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Dosyanın içeriği beklenen biçimde değil.' };
  }

  // Hem sarmalanmis yedegi hem de ham veritabanini kabul et: ilk surumde
  // "disa aktar" duz veritabani JSON'u veriyordu, o yedekler de yuklenebilsin.
  const candidate = (parsed as BackupFile).format === 'kovan-defteri-backup'
    ? (parsed as BackupFile).data
    : (parsed as Database);

  if (!candidate || typeof candidate !== 'object') {
    return { ok: false, error: 'Dosyada kovan verisi bulunamadı.' };
  }

  const lists: Array<keyof Database> = ['apiaries', 'hives', 'inspections', 'harvests', 'tasks'];
  for (const key of lists) {
    const value = (candidate as Database)[key];
    if (value !== undefined && !Array.isArray(value)) {
      return { ok: false, error: `Dosyadaki "${key}" alanı bozuk görünüyor.` };
    }
  }

  const db: Database = { ...emptyDatabase(), ...(candidate as Partial<Database>), version: 1 };

  const hasAnything =
    db.apiaries.length + db.hives.length + db.inspections.length + db.harvests.length > 0;
  if (!hasAnything) {
    return { ok: false, error: 'Dosya geçerli ama içi boş — yüklenecek kayıt yok.' };
  }

  const summary = `${db.apiaries.length} arılık · ${db.hives.length} kovan · ${db.inspections.length} muayene · ${db.harvests.length} hasat`;

  const exportedAt =
    (parsed as BackupFile).format === 'kovan-defteri-backup'
      ? (parsed as BackupFile).exportedAt
      : undefined;

  return { ok: true, db, summary, exportedAt };
}

export type ExportOutcome =
  | { ok: true; how: 'download' | 'share'; name: string }
  | { ok: false; error: string };

/** Yedegi disa aktarir. Web'de dosya indirir, native'de paylasim acar. */
export async function exportBackup(db: Database): Promise<ExportOutcome> {
  const payload = JSON.stringify(buildBackup(db), null, 2);
  const name = backupFileName();

  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Blob'u hemen birakma: Safari indirmeyi baslatmadan iptal edebiliyor.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return { ok: true, how: 'download', name };
    } catch {
      return { ok: false, error: 'Dosya indirilemedi.' };
    }
  }

  try {
    await Share.share({ title: name, message: payload });
    return { ok: true, how: 'share', name };
  } catch {
    return { ok: false, error: 'Paylaşım açılamadı.' };
  }
}

/** Web'de dosya secme diyalogu acar ve icerigi metin olarak dondurur. */
export function pickBackupFile(): Promise<string | null> {
  if (Platform.OS !== 'web') return Promise.resolve(null);

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    // iOS Safari .json'u her zaman tanimiyor; genis tutuyoruz.
    input.accept = 'application/json,.json,text/plain';
    input.style.display = 'none';

    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return finish(null);
      const reader = new FileReader();
      reader.onload = () => finish(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => finish(null);
      reader.readAsText(file);
    });

    // Kullanici diyalogu iptal ederse change hic gelmez; pencere odaga
    // dondukten sonra hala dosya yoksa vazgecildi sayiyoruz.
    window.addEventListener(
      'focus',
      () => setTimeout(() => { if (!input.files?.length) finish(null); }, 1500),
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
  });
}
