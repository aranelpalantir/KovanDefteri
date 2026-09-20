/** Kovan Defteri — veri modeli. Tüm kayıtlar cihazda, çevrimdışı tutulur. */

export type ID = string;

/** ISO tarih (YYYY-MM-DD). Saat tutmuyoruz; arıcılıkta gün yeterli. */
export type ISODate = string;

export const HIVE_TYPES = ['Langstroth', 'Dadant', 'Karadeniz', 'Sepet', 'Diğer'] as const;
export type HiveType = (typeof HIVE_TYPES)[number];

export const BREEDS = ['Kafkas', 'Anadolu', 'Muğla', 'Karniyol', 'İtalyan', 'Melez'] as const;
export type Breed = (typeof BREEDS)[number];

export const HIVE_STATUSES = ['aktif', 'zayıf', 'kışlatmada', 'bölündü', 'ölü'] as const;
export type HiveStatus = (typeof HIVE_STATUSES)[number];

export type Apiary = {
  id: ID;
  name: string;
  location?: string;
  notes?: string;
  createdAt: string;
};

export type Hive = {
  id: ID;
  apiaryId: ID;
  /** Kovan üzerindeki numara/etiket. */
  code: string;
  type: HiveType;
  breed: Breed;
  /** Ana arının doğduğu yıl — yaş ve uluslararası işaret rengi bundan türetilir. */
  queenYear: number;
  status: HiveStatus;
  startedAt: ISODate;
  notes?: string;
  createdAt: string;
};

export const QUEEN_CELL_STATES = ['yok', 'yüksük', 'açık', 'kapalı'] as const;
export type QueenCellState = (typeof QUEEN_CELL_STATES)[number];

export const STORE_LEVELS = ['yok', 'az', 'orta', 'bol'] as const;
export type StoreLevel = (typeof STORE_LEVELS)[number];

export const PROBLEMS = [
  'Varroa',
  'Kireç hastalığı',
  'Yavru çürüklüğü',
  'Nosema',
  'Mum güvesi',
  'Eşek arısı',
  'Yağmacılık',
  'Analık sorunu',
] as const;
export type Problem = (typeof PROBLEMS)[number];

export const ACTIONS = [
  'Şurup verildi',
  'Kek verildi',
  'Çerçeve eklendi',
  'Çerçeve alındı',
  'Ballık takıldı',
  'Ballık alındı',
  'İlaç uygulandı',
  'Bölme yapıldı',
  'Ana değiştirildi',
  'Temizlik yapıldı',
] as const;
export type HiveAction = (typeof ACTIONS)[number];

export type Inspection = {
  id: ID;
  hiveId: ID;
  date: ISODate;
  /** 1–5: koloni gücü (çerçeve doluluğu ve arı yoğunluğu). */
  strength: number;
  /** 1–5: huy — 1 çok sakin, 5 çok saldırgan. */
  temperament: number;
  queenSeen: boolean;
  eggsSeen: boolean;
  broodFrames: number;
  honeyFrames: number;
  totalFrames: number;
  queenCells: QueenCellState;
  stores: StoreLevel;
  problems: Problem[];
  actions: HiveAction[];
  notes?: string;
  /** Bir sonraki kontrol için hedef tarih. */
  nextCheck?: ISODate;
  createdAt: string;
};

export const PRODUCTS = ['Bal', 'Polen', 'Propolis', 'Arı sütü', 'Bal mumu'] as const;
export type Product = (typeof PRODUCTS)[number];

export type Harvest = {
  id: ID;
  hiveId: ID;
  date: ISODate;
  product: Product;
  amountKg: number;
  notes?: string;
  createdAt: string;
};

export type Task = {
  id: ID;
  /** Kovana bağlı olmayan genel görevler için boş bırakılır. */
  hiveId?: ID;
  title: string;
  due: ISODate;
  done: boolean;
  createdAt: string;
};

export type Database = {
  version: 1;
  apiaries: Apiary[];
  hives: Hive[];
  inspections: Inspection[];
  harvests: Harvest[];
  tasks: Task[];
  /** En son ne zaman yedek dosyasi alindi (ISO zaman damgasi). */
  lastBackupAt?: string;
};

export const emptyDatabase = (): Database => ({
  version: 1,
  apiaries: [],
  hives: [],
  inspections: [],
  harvests: [],
  tasks: [],
});
