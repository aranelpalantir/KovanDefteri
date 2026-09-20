import type { Database } from './types';

/**
 * Sema gocu.
 *
 * Veri tek bir JSON belgesi olarak saklandigi icin alan eklemek sorunsuz:
 * okurken eksikler varsayilanla doluyor. Ama bir alani yeniden adlandirmak
 * ya da yapisini degistirmek gerekirse eski belgeleri donusturmek sart.
 * Bu modul o donusumleri sirayla uygular.
 *
 * ONEMLI: Bu dosya calisma zamaninda hicbir sey import etmez (yalnizca tip).
 * Boylece `node --test` ile dogrudan calistirilabiliyor; goc mantigini
 * uygulamayi ayaga kaldirmadan test edebiliyoruz.
 */

/** Uygulamanin su an urettigi sema surumu. Her kirici degisiklikte artar. */
export const SCHEMA_VERSION = 1;

/** Surum bilgisi tasimayan belgeler bu surumden sayilir. */
const ASSUMED_VERSION = 1;

type AnyDoc = Record<string, unknown>;

export type Migration = {
  /** Bu gocun urettigi surum. */
  to: number;
  /** Ne yaptigi — kayitlara ve hata mesajlarina yaziliyor. */
  describe: string;
  migrate: (doc: AnyDoc) => AnyDoc;
};

/**
 * Gocler `to` sirasiyla uygulanir. Yeni bir sema degisikligi yaparken:
 *
 *   1. SCHEMA_VERSION'i artirin.
 *   2. Buraya `{ to: <yeni surum>, ... }` ekleyin.
 *   3. scripts/migrations.test.ts icine eski bir belgeyle test ekleyin.
 *
 * Ornek:
 *
 *   {
 *     to: 2,
 *     describe: 'hive.code -> hive.label',
 *     migrate: (doc) => ({
 *       ...doc,
 *       hives: (doc.hives as AnyDoc[]).map(({ code, ...rest }) => ({
 *         ...rest,
 *         label: code,
 *       })),
 *     }),
 *   }
 */
export const MIGRATIONS: Migration[] = [];

export type MigrateFailure =
  | 'not-an-object'
  | 'too-new'
  | 'migration-failed';

export type MigrateResult =
  | { ok: true; db: Database; from: number; to: number; applied: string[] }
  | { ok: false; reason: MigrateFailure; message: string; foundVersion?: number };

const LIST_FIELDS = ['apiaries', 'hives', 'inspections', 'harvests', 'tasks'] as const;

/**
 * Eksik alanlari tamamlar ve surumu damgalar. Gocler calistiktan SONRA
 * uygulanir; gocun kendi isi alanlari donusturmek, bunun isi belgeyi
 * uygulamanin bekledigi sekle sokmak.
 */
function normalize(doc: AnyDoc, version: number): Database {
  const out: AnyDoc = { ...doc, version };
  for (const field of LIST_FIELDS) {
    if (!Array.isArray(out[field])) out[field] = [];
  }
  return out as unknown as Database;
}

function readVersion(doc: AnyDoc): number {
  const raw = doc.version;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return ASSUMED_VERSION;
}

export type MigrateOptions = {
  /** Testler gercek listeyi degistirmeden sentetik gocler deneyebilsin diye. */
  migrations?: Migration[];
  /**
   * Hedef surum. Varsayilan SCHEMA_VERSION. Testlerin ileri bir surume goc
   * senaryosunu gercekten calistirabilmesi icin disari acik; uretim kodunda
   * verilmez.
   */
  targetVersion?: number;
};

/** Ham belgeyi guncel semaya tasir. */
export function migrateDocument(raw: unknown, options: MigrateOptions = {}): MigrateResult {
  const migrations = options.migrations ?? MIGRATIONS;
  const target = options.targetVersion ?? SCHEMA_VERSION;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      reason: 'not-an-object',
      message: 'Kayıt dosyası beklenen biçimde değil.',
    };
  }

  const doc = raw as AnyDoc;
  const from = readVersion(doc);

  /**
   * Belge uygulamadan YENI. Bu gercek bir senaryo: telefonda guncel surum,
   * bilgisayarda eski surum acik. Eski kod yeni alanlari anlamaz; okuyup
   * uzerine yazarsa veri kaybolur. Bu yuzden dokunmuyoruz.
   */
  if (from > target) {
    return {
      ok: false,
      reason: 'too-new',
      foundVersion: from,
      message: `Bu kayıtlar uygulamanın daha yeni bir sürümüyle oluşturulmuş (sürüm ${from}, bu sürüm ${target}). Veriyi bozmamak için dokunulmadı; uygulamayı güncelleyin.`,
    };
  }

  const pending = migrations
    .filter((m) => m.to > from && m.to <= target)
    .sort((a, b) => a.to - b.to);

  let current: AnyDoc = doc;
  const applied: string[] = [];

  for (const step of pending) {
    try {
      current = step.migrate(current);
      applied.push(`${step.to}: ${step.describe}`);
    } catch (error) {
      return {
        ok: false,
        reason: 'migration-failed',
        foundVersion: from,
        message: `Sürüm ${step.to} dönüşümü başarısız oldu (${step.describe}). Veriye dokunulmadı.`,
      };
    }
  }

  return { ok: true, db: normalize(current, target), from, to: target, applied };
}

/** Metinden okuyup goc uygular. JSON hatasini da ayni sekilde raporlar. */
export function migrateRawText(text: string, options: MigrateOptions = {}): MigrateResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      reason: 'not-an-object',
      message: 'Kayıt dosyası okunamadı (geçerli JSON değil).',
    };
  }
  return migrateDocument(parsed, options);
}
