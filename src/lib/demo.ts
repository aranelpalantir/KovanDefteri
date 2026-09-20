/** Uygulamayı boş ekranla değil, gerçekçi bir sezonla tanıtmak için örnek veri. */
import { newId, nowStamp } from './beekeeping';
import { addDays, todayISO } from './date';
import { emptyDatabase, type Database, type Hive, type Inspection } from './types';

export function buildDemoDatabase(): Database {
  const db = emptyDatabase();
  const today = todayISO();

  const apiary = {
    id: newId('ap'),
    name: 'Çam ormanı',
    location: 'Marmaris / Osmaniye köyü',
    notes: 'Çam pamuçkası yoğun, su kaynağı 200 m güneyde.',
    createdAt: nowStamp(),
  };
  const second = {
    id: newId('ap'),
    name: 'Yayla konağı',
    location: 'Kızılcahamam',
    createdAt: nowStamp(),
  };
  db.apiaries.push(apiary, second);

  const year = new Date().getFullYear();
  const specs: Array<Partial<Hive> & { code: string; profile: 'güçlü' | 'orta' | 'sorunlu' }> = [
    { code: '1', breed: 'Muğla', queenYear: year, profile: 'güçlü' },
    { code: '2', breed: 'Anadolu', queenYear: year - 1, profile: 'orta' },
    { code: '3', breed: 'Kafkas', queenYear: year - 3, profile: 'sorunlu' },
    { code: '4', breed: 'Karniyol', queenYear: year - 1, profile: 'güçlü' },
    { code: '5', breed: 'Muğla', queenYear: year - 2, profile: 'orta' },
  ];

  specs.forEach((spec, index) => {
    const hive: Hive = {
      id: newId('hv'),
      apiaryId: index < 4 ? apiary.id : second.id,
      code: spec.code,
      type: 'Langstroth',
      breed: spec.breed ?? 'Anadolu',
      queenYear: spec.queenYear ?? year,
      status: spec.profile === 'sorunlu' ? 'zayıf' : 'aktif',
      startedAt: addDays(today, -400 + index * 20),
      createdAt: nowStamp(),
    };
    db.hives.push(hive);

    // Son üç muayene — profile göre gelişen ya da gerileyen bir seyir.
    const base = spec.profile === 'güçlü' ? 3 : spec.profile === 'orta' ? 3 : 3;
    const drift = spec.profile === 'güçlü' ? 1 : spec.profile === 'orta' ? 0 : -1;

    [30, 16, spec.profile === 'sorunlu' ? 24 : 5].forEach((ago, step) => {
      const strength = clamp(base + drift * step);
      const inspection: Inspection = {
        id: newId('in'),
        hiveId: hive.id,
        date: addDays(today, -ago),
        strength,
        temperament: spec.profile === 'sorunlu' ? 4 : 2,
        queenSeen: spec.profile !== 'sorunlu' && step > 0,
        eggsSeen: spec.profile !== 'sorunlu',
        totalFrames: 10,
        broodFrames: clamp(strength + 1, 0, 9),
        honeyFrames: spec.profile === 'güçlü' ? 6 : 3,
        queenCells: spec.profile === 'güçlü' && step === 2 ? 'yüksük' : 'yok',
        stores: spec.profile === 'sorunlu' ? 'az' : 'orta',
        problems: spec.profile === 'sorunlu' ? ['Varroa'] : [],
        actions: step === 0 ? ['Temizlik yapıldı'] : spec.profile === 'sorunlu' ? ['Şurup verildi'] : [],
        notes: step === 2 && spec.profile === 'güçlü' ? 'Ballık takıldı, akım başladı.' : undefined,
        nextCheck: addDays(today, -ago + 10),
        createdAt: nowStamp(),
      };
      db.inspections.push(inspection);
    });

    if (spec.profile !== 'sorunlu') {
      db.harvests.push({
        id: newId('hr'),
        hiveId: hive.id,
        date: addDays(today, -45),
        product: 'Bal',
        amountKg: spec.profile === 'güçlü' ? 18 + index : 9 + index,
        createdAt: nowStamp(),
      });
    }
  });

  db.tasks.push(
    {
      id: newId('tk'),
      title: 'Varroa uygulaması için ilaç al',
      due: addDays(today, 2),
      done: false,
      createdAt: nowStamp(),
    },
    {
      id: newId('tk'),
      hiveId: db.hives[2].id,
      title: '3 nolu kovanı kontrol et',
      due: addDays(today, -3),
      done: false,
      createdAt: nowStamp(),
    },
  );

  return db;
}

function clamp(n: number, min = 1, max = 5) {
  return Math.min(max, Math.max(min, n));
}
