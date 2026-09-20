/**
 * Arıcılığa özgü türetilmiş bilgiler: ana arı işaret rengi, oğul riski,
 * koloni güç trendi ve muayene gecikmesi.
 */
import { daysSince, daysUntil, todayISO } from './date';
import type { Hive, Inspection } from './types';

/** Uluslararası ana arı işaretleme renkleri — yılın son hanesine göre. */
const QUEEN_MARKS = [
  { label: 'Mavi', hex: '#2F6FD0' }, // 0, 5
  { label: 'Beyaz', hex: '#E8E8E8' }, // 1, 6
  { label: 'Sarı', hex: '#F2C230' }, // 2, 7
  { label: 'Kırmızı', hex: '#CC3B32' }, // 3, 8
  { label: 'Yeşil', hex: '#3A9D5D' }, // 4, 9
] as const;

export function queenMark(year: number) {
  return QUEEN_MARKS[year % 5];
}

export function queenAge(hive: Hive, now = new Date().getFullYear()): number {
  return Math.max(0, now - hive.queenYear);
}

export type Severity = 'ok' | 'info' | 'warning' | 'danger';

export type Alert = {
  key: string;
  label: string;
  severity: Severity;
};

/** Bir kovan için son muayeneden türetilen uyarılar. */
export function hiveAlerts(hive: Hive, last: Inspection | undefined): Alert[] {
  const alerts: Alert[] = [];

  if (hive.status === 'ölü') {
    return [{ key: 'dead', label: 'Kovan ölü', severity: 'danger' }];
  }

  if (!last) {
    alerts.push({ key: 'never', label: 'Hiç muayene yok', severity: 'info' });
  } else {
    const gap = daysSince(last.date);
    if (gap > 21) alerts.push({ key: 'stale', label: `${gap} gündür bakılmadı`, severity: 'danger' });
    else if (gap > 14) alerts.push({ key: 'stale', label: `${gap} gündür bakılmadı`, severity: 'warning' });

    if (last.nextCheck && daysUntil(last.nextCheck) < 0) {
      alerts.push({ key: 'due', label: 'Kontrol tarihi geçti', severity: 'warning' });
    }
    if (swarmRisk(last) >= 2) {
      alerts.push({ key: 'swarm', label: 'Oğul riski', severity: 'danger' });
    }
    if (!last.queenSeen && !last.eggsSeen) {
      alerts.push({ key: 'queen', label: 'Analık şüphesi', severity: 'danger' });
    }
    if (last.stores === 'yok' || last.stores === 'az') {
      alerts.push({ key: 'stores', label: 'Yem az', severity: 'warning' });
    }
    if (last.problems.length > 0) {
      alerts.push({ key: 'problem', label: last.problems.join(', '), severity: 'warning' });
    }
    if (last.temperament >= 5) {
      alerts.push({ key: 'temper', label: 'Çok saldırgan', severity: 'info' });
    }
  }

  const age = queenAge(hive);
  if (age >= 3) alerts.push({ key: 'queenage', label: `Ana ${age} yaşında — yenileyin`, severity: 'warning' });

  return alerts;
}

/** 0–3 arası kaba oğul riski puanı. */
export function swarmRisk(
  last: Pick<Inspection, 'queenCells' | 'strength' | 'honeyFrames' | 'totalFrames'>,
): number {
  let score = 0;
  if (last.queenCells === 'kapalı') score += 3;
  else if (last.queenCells === 'açık') score += 2;
  else if (last.queenCells === 'yüksük') score += 1;
  if (last.strength >= 4) score += 1;
  if (last.totalFrames > 0 && last.honeyFrames / last.totalFrames > 0.6) score += 1;
  return Math.min(3, score);
}

export type Trend = 'up' | 'down' | 'flat' | 'unknown';

/** Son iki muayenenin güç farkına bakar. */
export function strengthTrend(inspections: Inspection[]): Trend {
  if (inspections.length < 2) return 'unknown';
  const [a, b] = inspections; // tarihe göre azalan sıralı gelir
  if (a.strength > b.strength) return 'up';
  if (a.strength < b.strength) return 'down';
  return 'flat';
}

export function worstSeverity(alerts: Alert[]): Severity {
  if (alerts.some((a) => a.severity === 'danger')) return 'danger';
  if (alerts.some((a) => a.severity === 'warning')) return 'warning';
  if (alerts.some((a) => a.severity === 'info')) return 'info';
  return 'ok';
}

/** Tarihe göre azalan (en yeni önce) sıralama. */
export function byDateDesc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

export const STRENGTH_LABELS = ['', 'çok zayıf', 'zayıf', 'orta', 'güçlü', 'çok güçlü'];
export const TEMPERAMENT_LABELS = ['', 'çok sakin', 'sakin', 'normal', 'huysuz', 'saldırgan'];

/** Muayene sonrası önerilen kontrol aralığı (gün). */
export function suggestedInterval(last: Pick<Inspection, 'queenCells' | 'strength'>): number {
  if (last.queenCells !== 'yok') return 7;
  if (last.strength >= 4) return 10;
  return 14;
}

export function nowStamp(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Tarih etiketiyle birlikte gün bazlı toplam. */
export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
