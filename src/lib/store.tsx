import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { byDateDesc, newId, nowStamp } from './beekeeping';
import { clearDatabase, loadDatabase, saveDatabase } from './storage';
import {
  emptyDatabase,
  type Apiary,
  type Database,
  type Harvest,
  type Hive,
  type ID,
  type Inspection,
  type Task,
} from './types';

/**
 * Kayitlar okunamadiginda uygulama kilitlenir: hicbir sey yazilmaz, boylece
 * bozuk ya da cok yeni bir belgenin uzerine yazip veriyi yok etmeyiz.
 */
export type StoreIssue = { message: string; raw: string | null };

type Store = {
  db: Database;
  ready: boolean;
  /** Doluysa uygulama salt-okunur; kullaniciya kurtarma ekrani gosterilir. */
  issue: StoreIssue | null;
  /** Kullanici bilerek sifirdan baslamayi sectiginde kilidi acar. */
  startFresh: () => void;
  /** Goc calistiysa hangi adimlarin uygulandigi. */
  migrationsApplied: string[];

  addApiary: (data: Omit<Apiary, 'id' | 'createdAt'>) => Apiary;
  updateApiary: (id: ID, patch: Partial<Apiary>) => void;
  removeApiary: (id: ID) => void;

  addHive: (data: Omit<Hive, 'id' | 'createdAt'>) => Hive;
  updateHive: (id: ID, patch: Partial<Hive>) => void;
  removeHive: (id: ID) => void;

  addInspection: (data: Omit<Inspection, 'id' | 'createdAt'>) => Inspection;
  removeInspection: (id: ID) => void;

  addHarvest: (data: Omit<Harvest, 'id' | 'createdAt'>) => Harvest;
  removeHarvest: (id: ID) => void;

  addTask: (data: Omit<Task, 'id' | 'createdAt' | 'done'>) => Task;
  toggleTask: (id: ID) => void;
  removeTask: (id: ID) => void;

  replaceAll: (db: Database) => void;
  reset: () => void;
  /** Basarili bir disa aktarimdan sonra cagrilir. */
  markBackupTaken: () => void;

  /** Okuma kolaylıkları */
  hivesOf: (apiaryId: ID) => Hive[];
  inspectionsOf: (hiveId: ID) => Inspection[];
  harvestsOf: (hiveId: ID) => Harvest[];
  lastInspection: (hiveId: ID) => Inspection | undefined;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database>(emptyDatabase);
  const [ready, setReady] = useState(false);
  const [issue, setIssue] = useState<StoreIssue | null>(null);
  const [migrationsApplied, setMigrationsApplied] = useState<string[]>([]);
  const dirty = useRef(false);

  useEffect(() => {
    loadDatabase().then((result) => {
      if (result.ok) {
        setDb(result.db);
        setMigrationsApplied(result.applied);
      } else {
        setIssue({ message: result.message, raw: result.raw });
      }
      setReady(true);
    });
  }, []);

  // İlk yüklemeden sonraki her değişikliği diske yaz.
  useEffect(() => {
    if (!ready || !dirty.current || issue) return;
    saveDatabase(db).catch(() => {});
  }, [db, ready, issue]);

  const mutate = useCallback(
    (fn: (prev: Database) => Database) => {
      // Kilitliyken hicbir degisiklik kabul edilmez; aksi halde kullanici
      // kurtarilamayacak veriyi ezmeye devam eder.
      if (issue) return;
      dirty.current = true;
      setDb(fn);
    },
    [issue],
  );

  const startFresh = useCallback(() => {
    clearDatabase().catch(() => {});
    setDb(emptyDatabase());
    setIssue(null);
    dirty.current = false;
  }, []);

  const value = useMemo<Store>(() => {
    const create = <T extends { id: ID; createdAt: string }>(prefix: string, data: object): T =>
      ({ ...data, id: newId(prefix), createdAt: nowStamp() }) as T;

    return {
      db,
      ready,
      issue,
      startFresh,
      migrationsApplied,

      addApiary(data) {
        const item = create<Apiary>('ap', data);
        mutate((p) => ({ ...p, apiaries: [...p.apiaries, item] }));
        return item;
      },
      updateApiary(id, patch) {
        mutate((p) => ({
          ...p,
          apiaries: p.apiaries.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
      },
      removeApiary(id) {
        mutate((p) => {
          const hiveIds = new Set(p.hives.filter((h) => h.apiaryId === id).map((h) => h.id));
          return {
            ...p,
            apiaries: p.apiaries.filter((a) => a.id !== id),
            hives: p.hives.filter((h) => h.apiaryId !== id),
            inspections: p.inspections.filter((i) => !hiveIds.has(i.hiveId)),
            harvests: p.harvests.filter((h) => !hiveIds.has(h.hiveId)),
            tasks: p.tasks.filter((t) => !t.hiveId || !hiveIds.has(t.hiveId)),
          };
        });
      },

      addHive(data) {
        const item = create<Hive>('hv', data);
        mutate((p) => ({ ...p, hives: [...p.hives, item] }));
        return item;
      },
      updateHive(id, patch) {
        mutate((p) => ({ ...p, hives: p.hives.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
      },
      removeHive(id) {
        mutate((p) => ({
          ...p,
          hives: p.hives.filter((h) => h.id !== id),
          inspections: p.inspections.filter((i) => i.hiveId !== id),
          harvests: p.harvests.filter((h) => h.hiveId !== id),
          tasks: p.tasks.filter((t) => t.hiveId !== id),
        }));
      },

      addInspection(data) {
        const item = create<Inspection>('in', data);
        mutate((p) => ({ ...p, inspections: [...p.inspections, item] }));
        return item;
      },
      removeInspection(id) {
        mutate((p) => ({ ...p, inspections: p.inspections.filter((i) => i.id !== id) }));
      },

      addHarvest(data) {
        const item = create<Harvest>('hr', data);
        mutate((p) => ({ ...p, harvests: [...p.harvests, item] }));
        return item;
      },
      removeHarvest(id) {
        mutate((p) => ({ ...p, harvests: p.harvests.filter((h) => h.id !== id) }));
      },

      addTask(data) {
        const item = create<Task>('tk', { ...data, done: false });
        mutate((p) => ({ ...p, tasks: [...p.tasks, item] }));
        return item;
      },
      toggleTask(id) {
        mutate((p) => ({
          ...p,
          tasks: p.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        }));
      },
      removeTask(id) {
        mutate((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== id) }));
      },

      replaceAll(next) {
        mutate(() => ({ ...emptyDatabase(), ...next, version: 1 }));
      },
      markBackupTaken() {
        mutate((p) => ({ ...p, lastBackupAt: nowStamp() }));
      },
      reset() {
        dirty.current = true;
        clearDatabase().catch(() => {});
        setDb(emptyDatabase());
      },

      hivesOf: (apiaryId) =>
        db.hives.filter((h) => h.apiaryId === apiaryId).sort((a, b) => a.code.localeCompare(b.code, 'tr', { numeric: true })),
      inspectionsOf: (hiveId) => byDateDesc(db.inspections.filter((i) => i.hiveId === hiveId)),
      harvestsOf: (hiveId) => byDateDesc(db.harvests.filter((h) => h.hiveId === hiveId)),
      lastInspection: (hiveId) => byDateDesc(db.inspections.filter((i) => i.hiveId === hiveId))[0],
    };
  }, [db, ready, mutate, issue, startFresh, migrationsApplied]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore, StoreProvider içinde kullanılmalı.');
  return ctx;
}
