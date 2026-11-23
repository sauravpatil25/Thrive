import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { backend } from '../lib/backend';
import { addDays, today } from '../lib/dates';
import { toEntryMap, type EntryMap } from '../lib/stats';
import { emptyEntry, type DailyEntry, type Profile, type WeightEntry } from '../lib/types';
import { useToast } from './toast';

const HISTORY_DAYS = 400;

interface Snapshot {
  profile: Profile | null;
  entries: EntryMap;
  weights: WeightEntry[];
}

interface DataCtx extends Snapshot {
  userId: string;
  loading: boolean;
  /** Showing cached data because the server could not be reached. */
  offline: boolean;
  todayISO: string;
  entryFor(date: string): DailyEntry;
  saveProfile(p: Profile): Promise<void>;
  updateEntry(date: string, patch: Partial<DailyEntry>): Promise<void>;
  toggleItem(date: string, itemId: string): void;
  addWeight(kg: number, date: string): Promise<void>;
  deleteWeight(id: string): Promise<void>;
  deleteAllData(): Promise<void>;
  reload(): Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);
const cacheKey = (uid: string) => `thrive-cache:${uid}`;

function readCache(uid: string): Snapshot | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

function writeCache(uid: string, s: Snapshot) {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(s));
  } catch {
    /* storage full or blocked: the cache is a convenience only */
  }
}

/** Keeps "today" correct when the app stays open past midnight. */
function useToday(): string {
  const [d, setD] = useState(today());
  useEffect(() => {
    const tick = () => setD(today());
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return d;
}

export function DataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const toast = useToast();
  const todayISO = useToday();
  const cached = useMemo(() => readCache(userId), [userId]);
  const [snap, setSnap] = useState<Snapshot>(cached ?? { profile: null, entries: {}, weights: [] });
  const [loading, setLoading] = useState(!cached);
  const [offline, setOffline] = useState(false);

  const snapRef = useRef(snap);
  const commit = useCallback(
    (next: Snapshot) => {
      snapRef.current = next;
      setSnap(next);
      writeCache(userId, next);
    },
    [userId],
  );

  const reload = useCallback(async () => {
    try {
      const from = addDays(today(), -HISTORY_DAYS);
      const [profile, entries, weights] = await Promise.all([
        backend.loadProfile(userId),
        backend.loadEntries(userId, from),
        backend.loadWeights(userId),
      ]);
      commit({ profile, entries: toEntryMap(entries), weights });
      setOffline(false);
    } catch (e) {
      if (snapRef.current.profile) setOffline(true);
      else toast.error(e instanceof Error ? e.message : 'Could not load your data.');
    } finally {
      setLoading(false);
    }
  }, [userId, commit, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Entry writes go out one at a time, each sending the latest state of that day,
  // so quick taps can never land out of order.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const persistEntry = useCallback(
    (date: string) => {
      const run = queue.current.then(async () => {
        const e = snapRef.current.entries[date];
        if (e) await backend.saveEntry(userId, e);
      });
      queue.current = run.catch(() => undefined);
      return run;
    },
    [userId],
  );

  const entryFor = useCallback((date: string) => snap.entries[date] ?? emptyEntry(date), [snap.entries]);

  const updateEntry = useCallback(
    async (date: string, patch: Partial<DailyEntry>) => {
      const prev = snapRef.current;
      const base = prev.entries[date] ?? emptyEntry(date);
      commit({ ...prev, entries: { ...prev.entries, [date]: { ...base, ...patch, date } } });
      try {
        await persistEntry(date);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not save. Please try again.');
        throw e;
      }
    },
    [commit, persistEntry, toast],
  );

  const toggleItem = useCallback(
    (date: string, itemId: string) => {
      const cur = snapRef.current.entries[date] ?? emptyEntry(date);
      const completed = cur.completed.includes(itemId)
        ? cur.completed.filter((x) => x !== itemId)
        : [...cur.completed, itemId];
      updateEntry(date, { completed }).catch(() => undefined);
    },
    [updateEntry],
  );

  const saveProfile = useCallback(
    async (p: Profile) => {
      await backend.saveProfile(p);
      commit({ ...snapRef.current, profile: p });
    },
    [commit],
  );

  const addWeight = useCallback(
    async (kg: number, date: string) => {
      const w: WeightEntry = { id: crypto.randomUUID(), date, weightKg: Math.round(kg * 100) / 100 };
      await backend.addWeight(userId, w);
      commit({ ...snapRef.current, weights: [...snapRef.current.weights, w] });
    },
    [userId, commit],
  );

  const deleteWeight = useCallback(
    async (id: string) => {
      await backend.deleteWeight(userId, id);
      commit({ ...snapRef.current, weights: snapRef.current.weights.filter((w) => w.id !== id) });
    },
    [userId, commit],
  );

  const deleteAllData = useCallback(async () => {
    await backend.deleteAllData(userId);
    commit({ profile: null, entries: {}, weights: [] });
  }, [userId, commit]);

  const value: DataCtx = {
    ...snap,
    userId,
    loading,
    offline,
    todayISO,
    entryFor,
    saveProfile,
    updateEntry,
    toggleItem,
    addWeight,
    deleteWeight,
    deleteAllData,
    reload,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData outside DataProvider');
  return c;
}

/** For screens that only render once onboarding is done. */
export function useProfile(): Profile {
  const { profile } = useData();
  if (!profile) throw new Error('Profile not loaded');
  return profile;
}
