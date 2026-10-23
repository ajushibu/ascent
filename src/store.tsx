import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session as AuthSession } from '@supabase/supabase-js';
import type { AppState, Goal, Mock, Reflection, Section, Settings, Task } from './types';
import { emptyState, mergeState, normalizeState } from './merge';
import { reconcile } from './reconcile';
import { addDays, levelInfo, todayKey, xpTotal } from './logic';
import { hasBackend, supabase } from './supabase';
import { buildDemo } from './demo';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  xp?: number;
  levelUp?: number;
}

export interface SetupConfig {
  name: string;
  examDate: string;
  targetPercentile: number;
  mocks: number;
  diSets: number;
  topicsPerRound: number;
  rounds: number;
  minDayMinutes: number;
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const stamp = <T extends object>(x: T): T & { updatedAt: number } => ({ ...x, updatedAt: Date.now() });
/** Progress is dated to when the work was done: today, unless the goal belongs to a day/week that is already over. */
const entryDate = (t: Task) => {
  const today = todayKey();
  const end = t.scope === 'day' ? t.key : addDays(t.key, 6);
  return today > end ? end : today;
};
const cacheKey = (userId: string | null) => `ascent:state:v1:${userId ?? 'local'}`;

function loadCache(userId: string | null): AppState {
  if (import.meta.env.DEV && typeof location !== 'undefined' && location.search.includes('demo')) {
    return buildDemo(todayKey(), location.search.includes('dark') ? 'dark' : 'light');
  }
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    return raw ? normalizeState(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

interface Store {
  state: AppState;
  today: string;
  ready: boolean;
  user: AuthSession['user'] | null;
  needsAuth: boolean;
  sync: SyncStatus;
  toast: Toast | null;
  dismissToast: () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  completeSetup: (c: SetupConfig) => void;
  updateSettings: (p: Partial<Settings>) => void;
  addGoal: (g: Omit<Goal, 'id' | 'updatedAt' | 'order'>) => void;
  updateGoal: (id: string, p: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addTask: (t: Omit<Task, 'id' | 'updatedAt'>) => string;
  updateTask: (id: string, p: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  logProgress: (task: Task, amount: number) => void;
  undoProgress: (task: Task) => void;
  addSession: (p: { minutes: number; section: Section; taskId: string | null; startedAt: number }) => void;
  saveMock: (m: Omit<Mock, 'updatedAt' | 'id'> & { id?: string }) => void;
  deleteMock: (id: string) => void;
  saveReflection: (r: Omit<Reflection, 'id' | 'updatedAt'>) => void;
  setWeeklyReward: (weekKey: string, title: string) => void;
  claimReward: (weekKey: string) => void;
  resetAll: () => void;
  importState: (s: unknown) => void;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore outside provider');
  return c;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(!hasBackend);
  const userId = auth?.user?.id ?? null;
  const [state, setState] = useState<AppState>(() => loadCache(null));
  const [ready, setReady] = useState(!hasBackend);
  const [sync, setSync] = useState<SyncStatus>(hasBackend ? 'syncing' : 'local');
  const [today, setToday] = useState(todayKey());
  const [toast, setToast] = useState<Toast | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pushTimer = useRef<number | null>(null);
  const dirty = useRef(false);

  /* keep "today" fresh across midnight / app resume */
  useEffect(() => {
    const tick = () => setToday(todayKey());
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  /* auth */
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setAuth(data.session);
      setAuthChecked(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setAuth(s));
    return () => data.subscription.unsubscribe();
  }, []);

  /* local cache */
  useEffect(() => {
    if (hasBackend && !userId) return;
    try {
      localStorage.setItem(cacheKey(userId), JSON.stringify(state));
    } catch {
      /* storage full or blocked — sync still works */
    }
  }, [state, userId]);

  /* theme */
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const t = state.settings.theme;
      const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme = dark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
      if (meta) meta.content = dark ? '#0F1020' : '#EEF0FB';
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [state.settings.theme]);

  /* ── sync ── */
  const pull = useCallback(async (uidNow: string): Promise<AppState | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('user_state').select('data').eq('user_id', uidNow).maybeSingle();
    if (error) throw error;
    return data?.data ? normalizeState(data.data) : null;
  }, []);

  const push = useCallback(async () => {
    if (!supabase || !userId) return;
    try {
      setSync('syncing');
      const remote = await pull(userId);
      const merged = remote ? mergeState(stateRef.current, remote) : stateRef.current;
      const { error } = await supabase.from('user_state').upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() });
      if (error) throw error;
      dirty.current = false;
      if (remote) setState(prev => reconcile(mergeState(prev, merged)).state);
      setSync('synced');
    } catch (e) {
      setSync(navigator.onLine ? 'error' : 'offline');
    }
  }, [pull, userId]);

  const schedulePush = useCallback(() => {
    if (!supabase || !userId) return;
    dirty.current = true;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(push, 900);
  }, [push, userId]);

  /* initial load per user */
  useEffect(() => {
    if (!supabase || !authChecked) return;
    if (!userId) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const local = loadCache(userId);
      try {
        setSync('syncing');
        const remote = await pull(userId);
        if (cancelled) return;
        const merged = reconcile(remote ? mergeState(local, remote) : local).state;
        setState(merged);
        setReady(true);
        const { error } = await supabase!.from('user_state').upsert({ user_id: userId, data: merged, updated_at: new Date().toISOString() });
        if (error) throw error;
        setSync('synced');
      } catch {
        if (cancelled) return;
        setState(local);
        setReady(true);
        setSync(navigator.onLine ? 'error' : 'offline');
      }
    })();

    const channel = supabase
      .channel(`user_state:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_state', filter: `user_id=eq.${userId}` }, payload => {
        const row = (payload.new ?? {}) as { data?: unknown };
        if (row.data) setState(prev => reconcile(mergeState(prev, normalizeState(row.data))).state);
      })
      .subscribe();
    const onOnline = () => push();
    window.addEventListener('online', onOnline);
    const onVis = () => document.visibilityState === 'visible' && push();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      supabase!.removeChannel(channel);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [authChecked, userId, pull, push]);

  /* ── mutations ── */
  const showToast = useCallback((t: Omit<Toast, 'id'>) => setToast({ ...t, id: Date.now() }), []);

  const commit = useCallback(
    (fn: (s: AppState) => AppState, opts?: { toast?: string }) => {
      const prev = stateRef.current;
      const { state: next, gained } = reconcile(fn(prev));
      const lvBefore = levelInfo(xpTotal(prev)).level;
      const lvAfter = levelInfo(xpTotal(next)).level;
      stateRef.current = next;
      setState(next);
      schedulePush();
      if (lvAfter > lvBefore) showToast({ title: `Level ${lvAfter}`, body: 'You levelled up.', xp: gained, levelUp: lvAfter });
      else if (gained > 0) showToast({ title: opts?.toast ?? 'Nice work', xp: gained });
    },
    [schedulePush, showToast]
  );

  const api = useMemo<Omit<Store, 'state' | 'today' | 'ready' | 'user' | 'needsAuth' | 'sync' | 'toast' | 'dismissToast'>>(
    () => ({
      signIn: async (email, password) => {
        if (!supabase) return 'Backend not configured';
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error?.message ?? null;
      },
      signUp: async (email, password) => {
        if (!supabase) return 'Backend not configured';
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return error.message;
        if (!data.session) return 'Check your email to confirm your account, then sign in.';
        return null;
      },
      signOut: async () => {
        await supabase?.auth.signOut();
        setState(emptyState());
        setReady(!hasBackend);
      },
      completeSetup: c =>
        commit(s => {
          const now = Date.now();
          const mk = (order: number, g: Omit<Goal, 'id' | 'updatedAt' | 'order'>): Goal => ({ ...g, id: uid(), order, updatedAt: now });
          const goals: Goal[] = [
            mk(0, { label: 'Mocks', unit: 'mocks', total: c.mocks, section: 'ALL', xpPerUnit: 0, step: 1, fromMocks: true }),
            mk(1, { label: 'DI sets', unit: 'sets', total: c.diSets, section: 'DILR', xpPerUnit: 25, step: 1 }),
            mk(2, { label: `Quant revision · ${c.rounds} ${c.rounds === 1 ? 'round' : 'rounds'}`, unit: 'topics', total: c.topicsPerRound * c.rounds, section: 'QA', xpPerUnit: 20, step: 1 })
          ];
          return {
            ...s,
            goals: [...s.goals.filter(g => g.deleted), ...goals],
            settings: { ...s.settings, name: c.name, examDate: c.examDate, startDate: todayKey(), targetPercentile: c.targetPercentile, minDayMinutes: c.minDayMinutes, setupDone: true, updatedAt: now }
          };
        }),
      updateSettings: p => commit(s => ({ ...s, settings: { ...s.settings, ...p, updatedAt: Date.now() } })),
      addGoal: g =>
        commit(s => ({ ...s, goals: [...s.goals, { ...g, id: uid(), order: s.goals.length, updatedAt: Date.now() }] })),
      updateGoal: (id, p) => commit(s => ({ ...s, goals: s.goals.map(g => (g.id === id ? stamp({ ...g, ...p }) : g)) })),
      deleteGoal: id =>
        commit(s => ({
          ...s,
          goals: s.goals.map(g => (g.id === id ? stamp({ ...g, deleted: true }) : g)),
          tasks: s.tasks.map(t => (t.goalId === id ? stamp({ ...t, goalId: null }) : t))
        })),
      addTask: t => {
        const id = uid();
        commit(s => ({ ...s, tasks: [...s.tasks, { ...t, id, updatedAt: Date.now() }] }));
        return id;
      },
      updateTask: (id, p) =>
        commit(s => {
          const old = s.tasks.find(t => t.id === id);
          const moved = old && 'goalId' in p && p.goalId !== old.goalId;
          return {
            ...s,
            tasks: s.tasks.map(t => (t.id === id ? stamp({ ...t, ...p }) : t)),
            // moving a goal to another total carries its progress along
            entries: moved ? s.entries.map(e => (e.taskId === id && !e.deleted ? stamp({ ...e, goalId: p.goalId ?? null }) : e)) : s.entries
          };
        }),
      deleteTask: id =>
        commit(s => ({
          ...s,
          tasks: s.tasks.map(t => (t.id === id ? stamp({ ...t, deleted: true }) : t)),
          // work already done stays in your totals; only progress that fed nothing is dropped
          entries: s.entries.map(e => (e.taskId === id && !e.goalId ? stamp({ ...e, deleted: true }) : e))
        })),
      logProgress: (task, amount) =>
        commit(
          s => ({
            ...s,
            entries: [...s.entries, { id: uid(), dateKey: entryDate(task), goalId: task.goalId, taskId: task.scope === 'week' && task.goalId ? null : task.id, amount, ts: Date.now(), updatedAt: Date.now() }]
          }),
          { toast: 'Logged' }
        ),
      undoProgress: task =>
        commit(s => {
          const rel = s.entries
            .filter(e => !e.deleted && !e.id.startsWith('mock:') && (task.scope === 'week' && task.goalId ? e.goalId === task.goalId : e.taskId === task.id))
            .sort((a, b) => b.ts - a.ts)[0];
          return rel ? { ...s, entries: s.entries.map(e => (e.id === rel.id ? stamp({ ...e, deleted: true }) : e)) } : s;
        }),
      addSession: p =>
        commit(
          s => ({ ...s, sessions: [...s.sessions, { id: uid(), dateKey: todayKey(new Date(p.startedAt)), startedAt: p.startedAt, minutes: p.minutes, section: p.section, taskId: p.taskId, updatedAt: Date.now() }] }),
          { toast: 'Session saved' }
        ),
      saveMock: m =>
        commit(
          s => {
            const id = m.id ?? uid();
            const exists = s.mocks.some(x => x.id === id);
            const rec: Mock = { ...m, id, updatedAt: Date.now() };
            return { ...s, mocks: exists ? s.mocks.map(x => (x.id === id ? rec : x)) : [...s.mocks, rec] };
          },
          { toast: 'Mock logged' }
        ),
      deleteMock: id => commit(s => ({ ...s, mocks: s.mocks.map(m => (m.id === id ? stamp({ ...m, deleted: true }) : m)) })),
      saveReflection: r =>
        commit(
          s => {
            const id = `reflect:${r.dateKey}`;
            const rec: Reflection = { ...r, id, updatedAt: Date.now() };
            return { ...s, reflections: s.reflections.some(x => x.id === id) ? s.reflections.map(x => (x.id === id ? rec : x)) : [...s.reflections, rec] };
          },
          { toast: 'Reflection saved' }
        ),
      setWeeklyReward: (weekKey, title) =>
        commit(s => {
          const id = `reward:${weekKey}`;
          const cur = s.rewards.find(x => x.id === id);
          const rec = { id, weekKey, title, claimedAt: cur?.claimedAt ?? null, updatedAt: Date.now() };
          return { ...s, rewards: cur ? s.rewards.map(x => (x.id === id ? rec : x)) : [...s.rewards, rec] };
        }),
      claimReward: weekKey =>
        commit(s => ({ ...s, rewards: s.rewards.map(r => (r.weekKey === weekKey ? stamp({ ...r, claimedAt: Date.now() }) : r)) }), { toast: 'Reward claimed' }),
      resetAll: () => {
        const e = emptyState();
        e.settings.updatedAt = Date.now() + 1;
        // tombstone everything we know about so other devices converge to empty
        const s = stateRef.current;
        const dead = <T extends { updatedAt: number; deleted?: boolean }>(xs: T[]) => xs.map(x => ({ ...x, deleted: true, updatedAt: Date.now() + 1 }));
        commit(() => ({ ...e, goals: dead(s.goals), tasks: dead(s.tasks), entries: dead(s.entries), sessions: dead(s.sessions), xp: dead(s.xp), mocks: dead(s.mocks), reflections: dead(s.reflections), rewards: dead(s.rewards) }));
      },
      importState: raw => commit(s => mergeState(s, normalizeState(raw)))
    }),
    [commit]
  );

  const value: Store = {
    state,
    today,
    ready: ready && authChecked,
    user: auth?.user ?? null,
    needsAuth: hasBackend && authChecked && !auth,
    sync,
    toast,
    dismissToast: () => setToast(null),
    ...api
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
