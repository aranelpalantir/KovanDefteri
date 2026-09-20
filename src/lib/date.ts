import type { ISODate } from './types';

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const DAY_MS = 86_400_000;

export function todayISO(): ISODate {
  return toISO(new Date());
}

export function toISO(d: Date): ISODate {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** "14 Nisan 2026" */
export function formatLong(iso: ISODate): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`;
}

/** "14 Nis" */
export function formatShort(iso: ISODate): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()].slice(0, 3)}`;
}

/** Bugünden hedefe gün farkı. Geçmiş için negatif. */
export function daysUntil(iso: ISODate): number {
  return Math.round((fromISO(iso).getTime() - fromISO(todayISO()).getTime()) / DAY_MS);
}

export function daysSince(iso: ISODate): number {
  return -daysUntil(iso);
}

/** "bugün", "3 gün önce", "yarın", "5 gün sonra" */
export function relativeDays(iso: ISODate): string {
  const diff = daysUntil(iso);
  if (diff === 0) return 'bugün';
  if (diff === 1) return 'yarın';
  if (diff === -1) return 'dün';
  return diff > 0 ? `${diff} gün sonra` : `${-diff} gün önce`;
}

/** Arıcılık sezonu etiketi — kabaca mevsime göre ne yapılır. */
export function seasonHint(iso: ISODate = todayISO()): { season: string; tip: string } {
  const month = fromISO(iso).getMonth() + 1;
  if (month <= 2) return { season: 'Kışlatma', tip: 'Kovanları açmayın; ağırlık ve rüzgâr kontrolü yeterli.' };
  if (month === 3) return { season: 'İlkbahar uyanışı', tip: 'İlk kontrol, kek/şurup ve ana kontrolü zamanı.' };
  if (month <= 5) return { season: 'Gelişme', tip: 'Oğul riski yüksek — 7–10 günde bir memeli kontrolü.' };
  if (month <= 8) return { season: 'Nektar akımı', tip: 'Ballık takip ve hasat dönemi.' };
  if (month <= 10) return { season: 'Sonbahar hazırlığı', tip: 'Varroa uygulaması ve kışlık yem takviyesi.' };
  return { season: 'Kışa giriş', tip: 'Kovan ağırlığını ölçün, uçuş deliğini daraltın.' };
}

/**
 * Tam ISO zaman damgasindan "20:07". Diger yardimcilar gun bazli ISODate
 * alir; bu, saat tasiyan damgalar (ornegin son yedek zamani) icindir.
 */
export function formatTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
