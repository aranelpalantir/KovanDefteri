import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MIGRATIONS,
  SCHEMA_VERSION,
  migrateDocument,
  migrateRawText,
  type Migration,
} from '../src/lib/migrate.ts';

/**
 * Goc testleri. `npm run test:migrations` ile calisir.
 *
 * migrate.ts calisma zamaninda hicbir sey import etmedigi icin Node onu
 * dogrudan calistirabiliyor; bundler ya da test cercevesi gerekmiyor.
 *
 * Mekanizmayi sinayan testler `targetVersion` veriyor. Aksi halde
 * SCHEMA_VERSION 1 oldugu surece hicbir sentetik goc calismaz ve testler
 * hicbir sey kanitlamamis olurdu.
 */

const v1Doc = () => ({
  version: 1,
  apiaries: [{ id: 'ap_1', name: 'Çam ormanı', createdAt: '2026-01-01T00:00:00.000Z' }],
  hives: [{ id: 'hv_1', apiaryId: 'ap_1', code: '1' }],
  inspections: [{ id: 'in_1', hiveId: 'hv_1', date: '2026-05-01', strength: 4 }],
  harvests: [],
  tasks: [],
});

/** Her adimda iz birakan sentetik gocler. */
const iz = (to: number): Migration => ({
  to,
  describe: `adim-${to}`,
  migrate: (d) => ({ ...d, iz: [...((d.iz as string[]) ?? []), `adim-${to}`] }),
});

// --- Bugunku davranis -------------------------------------------------------

test('gecerli v1 belgesi degismeden gecer', () => {
  const result = migrateDocument(v1Doc());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.from, 1);
  assert.equal(result.to, SCHEMA_VERSION);
  assert.deepEqual(result.applied, []);
  assert.equal(result.db.hives.length, 1);
  assert.equal(result.db.inspections[0].strength, 4);
});

test('surum bilgisi olmayan belge v1 sayilir', () => {
  const { version, ...noVersion } = v1Doc();
  const result = migrateDocument(noVersion);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.from, 1);
  assert.equal(result.db.version, SCHEMA_VERSION);
});

test('eksik diziler tamamlanir, mevcut veri korunur', () => {
  const result = migrateDocument({ version: 1, hives: [{ id: 'hv_1', code: '7' }] });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.db.apiaries, []);
  assert.deepEqual(result.db.tasks, []);
  assert.equal(result.db.hives.length, 1);
});

// --- Reddedilmesi gerekenler ------------------------------------------------

test('uygulamadan yeni belgeye DOKUNULMAZ', () => {
  const result = migrateDocument({ ...v1Doc(), version: SCHEMA_VERSION + 5 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, 'too-new');
  assert.equal(result.foundVersion, SCHEMA_VERSION + 5);
  assert.match(result.message, /güncelleyin/);
});

test('nesne olmayan girdi reddedilir', () => {
  for (const bad of [null, 42, 'metin', [1, 2, 3], true]) {
    const result = migrateDocument(bad);
    assert.equal(result.ok, false, `reddedilmeliydi: ${JSON.stringify(bad)}`);
    if (!result.ok) assert.equal(result.reason, 'not-an-object');
  }
});

test('bozuk JSON metni reddedilir', () => {
  const result = migrateRawText('{ bu bozuk');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'not-an-object');
});

// --- Mekanizma: gercekten goc calistiran testler ----------------------------

test('gocler kucukten buyuge sirayla uygulanir', () => {
  const karisik = [iz(4), iz(2), iz(3)];
  const result = migrateDocument({ version: 1, hives: [] }, {
    migrations: karisik,
    targetVersion: 4,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual((result.db as unknown as { iz: string[] }).iz, ['adim-2', 'adim-3', 'adim-4']);
  assert.deepEqual(result.applied, ['2: adim-2', '3: adim-3', '4: adim-4']);
  assert.equal(result.db.version, 4);
});

test('yalnizca gereken gocler calisir, gecilmisler atlanir', () => {
  const result = migrateDocument({ version: 3, hives: [] }, {
    migrations: [iz(2), iz(3), iz(4)],
    targetVersion: 4,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual((result.db as unknown as { iz: string[] }).iz, ['adim-4']);
  assert.equal(result.from, 3);
});

test('goc hata verirse veri yazilmaz, hata bildirilir', () => {
  const patlayan: Migration[] = [
    iz(2),
    { to: 3, describe: 'patlar', migrate: () => { throw new Error('bum'); } },
    iz(4),
  ];
  const result = migrateDocument(v1Doc(), { migrations: patlayan, targetVersion: 4 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, 'migration-failed');
  assert.match(result.message, /Sürüm 3/);
  assert.match(result.message, /dokunulmadı/);
});

test('goc zinciri veriyi gercekten donusturebiliyor', () => {
  // Gercekci ornek: hive.code -> hive.label yeniden adlandirmasi.
  const yenidenAdlandir: Migration = {
    to: 2,
    describe: 'hive.code -> hive.label',
    migrate: (d) => ({
      ...d,
      hives: (d.hives as Record<string, unknown>[]).map(({ code, ...rest }) => ({
        ...rest,
        label: code,
      })),
    }),
  };

  const result = migrateDocument(v1Doc(), {
    migrations: [yenidenAdlandir],
    targetVersion: 2,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const hive = (result.db.hives as unknown as Record<string, unknown>[])[0];
  assert.equal(hive.label, '1');
  assert.equal(hive.code, undefined);
  assert.equal(hive.apiaryId, 'ap_1', 'diger alanlar korunmali');
});

// --- Gercek listenin tutarliligi --------------------------------------------

test('gercek goc listesi tutarli', () => {
  for (const m of MIGRATIONS) {
    assert.ok(m.to > 1, `goc surumu 1'den buyuk olmali: ${m.describe}`);
    assert.ok(m.to <= SCHEMA_VERSION, `SCHEMA_VERSION artirilmamis: ${m.describe}`);
    assert.ok(m.describe.length > 0, 'her gocun aciklamasi olmali');
  }
  const surumler = MIGRATIONS.map((m) => m.to);
  assert.equal(new Set(surumler).size, surumler.length, 'ayni surume iki goc olamaz');
});
