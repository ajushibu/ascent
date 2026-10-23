import type { AppState, Base } from './types';

function mergeList<T extends Base>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  for (const x of a) map.set(x.id, x);
  for (const x of b) {
    const cur = map.get(x.id);
    if (!cur || x.updatedAt > cur.updatedAt) map.set(x.id, x);
  }
  return [...map.values()];
}

/** Last-writer-wins per item. Deletions are tombstones (deleted: true) so they propagate. */
export function mergeState(a: AppState, b: AppState): AppState {
  return {
    settings: b.settings.updatedAt > a.settings.updatedAt ? b.settings : a.settings,
    goals: mergeList(a.goals, b.goals),
    tasks: mergeList(a.tasks, b.tasks),
    entries: mergeList(a.entries, b.entries),
    sessions: mergeList(a.sessions, b.sessions),
    xp: mergeList(a.xp, b.xp),
    mocks: mergeList(a.mocks, b.mocks),
    reflections: mergeList(a.reflections, b.reflections),
    rewards: mergeList(a.rewards, b.rewards)
  };
}

export function emptyState(): AppState {
  return {
    settings: {
      name: '',
      examDate: '2026-11-29',
      startDate: '',
      targetPercentile: 99,
      minDayMinutes: 45,
      dailyXpCap: 500,
      rewardThreshold: 80,
      futureNote: '',
      theme: 'system',
      setupDone: false,
      updatedAt: 0
    },
    goals: [],
    tasks: [],
    entries: [],
    sessions: [],
    xp: [],
    mocks: [],
    reflections: [],
    rewards: []
  };
}

/** Defensive: fill any missing collections from older / partial documents. */
export function normalizeState(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppState>;
  return {
    settings: { ...base.settings, ...(r.settings ?? {}) },
    goals: r.goals ?? [],
    tasks: r.tasks ?? [],
    entries: r.entries ?? [],
    sessions: r.sessions ?? [],
    xp: r.xp ?? [],
    mocks: r.mocks ?? [],
    reflections: r.reflections ?? [],
    rewards: r.rewards ?? []
  };
}
