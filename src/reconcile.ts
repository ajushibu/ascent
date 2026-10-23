import type { AppState, Entry, XpEvent } from './types';
import { capRoom, dayTasks, entriesOf, goalsOf, mocksOf, sessionsOf, taskDone, taskProgress, tasksOf, weekDays, weekStart, xpTotal } from './logic.ts';

interface Want {
  reason: string;
  ref: string;
  dateKey: string;
  amount: number;
}

export const XP_TASK = 15;
export const XP_DAY = 30;
export const XP_WEEK = 60;
export const XP_MOCK = 100;
export const XP_MOCK_ANALYSED = 150;
export const XP_REFLECT = 15;

const evId = (reason: string, ref: string) => `${reason}:${ref}`;

function completionDate(s: AppState, taskId: string, goalId: string | null, scope: 'day' | 'week', key: string): string {
  const es = entriesOf(s);
  const days = new Set(scope === 'week' ? weekDays(key) : [key]);
  const rel = es.filter(e => (goalId && scope === 'week' ? e.goalId === goalId && days.has(e.dateKey) : e.taskId === taskId));
  return rel.length ? rel.map(e => e.dateKey).sort().slice(-1)[0] : key;
}

/**
 * Brings derived data in line with the source records, idempotently:
 *  - one progress entry per logged mock (feeds the Mocks goal)
 *  - XP events for everything that earns XP, revoked again if the source is undone
 * Event ids are deterministic so two devices converge on the same events.
 */
export function reconcile(input: AppState, now = Date.now()): { state: AppState; gained: number } {
  const s: AppState = { ...input, entries: [...input.entries], xp: [...input.xp] };

  /* 1 ─ mock → goal entry */
  const mockGoal = goalsOf(s).find(g => g.fromMocks);
  const allMocks = input.mocks;
  for (const m of allMocks) {
    const id = `mock:${m.id}`;
    const idx = s.entries.findIndex(e => e.id === id);
    const want = !m.deleted && !!mockGoal;
    if (want) {
      const entry: Entry = { id, updatedAt: now, dateKey: m.dateKey, goalId: mockGoal!.id, taskId: null, amount: 1, ts: now };
      if (idx === -1) s.entries.push(entry);
      else if (s.entries[idx].deleted || s.entries[idx].dateKey !== m.dateKey || s.entries[idx].goalId !== mockGoal!.id)
        s.entries[idx] = { ...s.entries[idx], dateKey: m.dateKey, goalId: mockGoal!.id, deleted: false, updatedAt: now };
    } else if (idx !== -1 && !s.entries[idx].deleted) {
      s.entries[idx] = { ...s.entries[idx], deleted: true, updatedAt: now };
    }
  }

  /* 2 ─ what XP should exist */
  const wants = new Map<string, Want>();
  const add = (w: Want) => wants.set(evId(w.reason, w.ref), w);

  for (const x of sessionsOf(s)) add({ reason: 'focus', ref: x.id, dateKey: x.dateKey, amount: x.minutes });

  const goals = new Map(goalsOf(s).map(g => [g.id, g]));
  for (const e of entriesOf(s)) {
    if (!e.goalId || e.id.startsWith('mock:')) continue;
    const g = goals.get(e.goalId);
    if (g && g.xpPerUnit > 0 && e.amount > 0) add({ reason: 'unit', ref: e.id, dateKey: e.dateKey, amount: Math.round(e.amount * g.xpPerUnit) });
  }

  const tasks = tasksOf(s);
  for (const t of tasks) {
    if (taskDone(s, t) && taskProgress(s, t) > 0)
      add({ reason: 'task', ref: t.id, dateKey: completionDate(s, t.id, t.goalId, t.scope, t.key), amount: XP_TASK });
  }

  const dayKeys = new Set(tasks.filter(t => t.scope === 'day').map(t => t.key));
  for (const k of dayKeys) {
    const ts = dayTasks(s, k);
    if (ts.length && ts.every(t => taskDone(s, t) && taskProgress(s, t) > 0)) add({ reason: 'day', ref: k, dateKey: k, amount: XP_DAY });
  }

  const weekKeys = new Set(tasks.filter(t => t.scope === 'week').map(t => weekStart(t.key)));
  for (const wk of weekKeys) {
    const ts = tasks.filter(t => t.scope === 'week' && weekStart(t.key) === wk);
    if (ts.length && ts.every(t => taskDone(s, t) && taskProgress(s, t) > 0)) {
      const last = ts.map(t => completionDate(s, t.id, t.goalId, 'week', t.key)).sort().slice(-1)[0];
      add({ reason: 'week', ref: wk, dateKey: last, amount: XP_WEEK });
    }
  }

  for (const m of mocksOf(s)) {
    add({ reason: 'mock', ref: m.id, dateKey: m.dateKey, amount: XP_MOCK });
    if (m.analysed) add({ reason: 'mockA', ref: m.id, dateKey: m.dateKey, amount: XP_MOCK_ANALYSED });
  }

  for (const r of s.reflections) if (!r.deleted) add({ reason: 'reflect', ref: r.dateKey, dateKey: r.dateKey, amount: XP_REFLECT });

  /* 3 ─ apply the difference */
  const before = xpTotal(s);
  const idxById = new Map(s.xp.map((e, i) => [e.id, i]));
  // keep a working copy so the daily cap sees events created in this pass
  const work: AppState = { ...s, xp: s.xp };

  // revoke
  for (const [id, i] of idxById) {
    const ev = s.xp[i];
    if (!ev.deleted && !wants.has(id)) s.xp[i] = { ...ev, deleted: true, updatedAt: now };
  }

  // grant (oldest day first so the cap fills chronologically)
  const ordered = [...wants.entries()].sort((a, b) => a[1].dateKey.localeCompare(b[1].dateKey));
  for (const [id, w] of ordered) {
    const i = idxById.get(id);
    const live = i !== undefined && !s.xp[i].deleted;
    if (live) continue;
    const capped = !w.reason.startsWith('mock');
    const amount = capped ? Math.min(w.amount, capRoom(work, w.dateKey)) : w.amount;
    const ev: XpEvent = { id, dateKey: w.dateKey, amount, reason: w.reason, ref: w.ref, ts: now, updatedAt: now };
    if (i !== undefined) s.xp[i] = ev;
    else {
      idxById.set(id, s.xp.length);
      s.xp.push(ev);
    }
  }

  return { state: s, gained: Math.max(0, xpTotal(s) - before) };
}
