import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState } from './merge.ts';
import { reconcile } from './reconcile.ts';
import { levelInfo, xpTotal, goalDone, dayCounted } from './logic.ts';
import type { AppState } from './types';

const T = '2026-10-23';
function base(): AppState {
  const s = emptyState();
  s.settings.setupDone = true;
  s.goals = [
    { id: 'g-mock', label: 'Mocks', unit: 'mocks', total: 10, section: 'ALL', xpPerUnit: 0, step: 1, order: 0, fromMocks: true, updatedAt: 1 },
    { id: 'g-di', label: 'DI sets', unit: 'sets', total: 40, section: 'DILR', xpPerUnit: 25, step: 1, order: 1, updatedAt: 1 }
  ];
  return s;
}

test('focus minutes earn 1 XP each and respect the daily cap', () => {
  const s = base();
  s.sessions.push({ id: 's1', dateKey: T, startedAt: 1, minutes: 300, section: 'QA', taskId: null, updatedAt: 1 });
  s.sessions.push({ id: 's2', dateKey: T, startedAt: 2, minutes: 300, section: 'QA', taskId: null, updatedAt: 1 });
  const { state } = reconcile(s);
  assert.equal(xpTotal(state), 500); // capped at dailyXpCap
});

test('task progress earns unit XP, task bonus and day bonus; undo revokes them', () => {
  const s = base();
  s.tasks.push({ id: 't1', scope: 'day', key: T, title: '3 DI sets', goalId: 'g-di', section: 'DILR', target: 2, unit: 'sets', updatedAt: 1 });
  s.entries.push({ id: 'e1', dateKey: T, goalId: 'g-di', taskId: 't1', amount: 1, ts: 1, updatedAt: 1 });
  let r = reconcile(s);
  assert.equal(xpTotal(r.state), 25); // 1 unit, task not done yet
  r.state.entries.push({ id: 'e2', dateKey: T, goalId: 'g-di', taskId: 't1', amount: 1, ts: 2, updatedAt: 2 });
  r = reconcile(r.state);
  assert.equal(xpTotal(r.state), 25 + 25 + 15 + 30); // units + task + day
  // undo the second entry
  const i = r.state.entries.findIndex(e => e.id === 'e2');
  r.state.entries[i] = { ...r.state.entries[i], deleted: true, updatedAt: 3 };
  r = reconcile(r.state);
  assert.equal(xpTotal(r.state), 25);
});

test('reconcile is idempotent', () => {
  const s = base();
  s.sessions.push({ id: 's1', dateKey: T, startedAt: 1, minutes: 50, section: 'QA', taskId: null, updatedAt: 1 });
  const a = reconcile(s).state;
  const b = reconcile(a).state;
  assert.equal(xpTotal(a), xpTotal(b));
  assert.equal(a.xp.length, b.xp.length);
});

test('a mock feeds the Mocks goal and earns uncapped XP; analysing adds more', () => {
  const s = base();
  s.mocks.push({
    id: 'm1', name: 'CAT 2025 Slot 1', dateKey: T, analysed: false, notes: '', updatedAt: 1,
    overall: { score: 47, percentile: 78.07 }, varc: { score: 38, percentile: 95.3 }, dilr: { score: 0, percentile: 35 }, qa: { score: 9, percentile: 66.5 }
  });
  let r = reconcile(s);
  assert.equal(goalDone(r.state, 'g-mock'), 1);
  assert.equal(xpTotal(r.state), 100);
  r.state.mocks[0] = { ...r.state.mocks[0], analysed: true, updatedAt: 2 };
  r = reconcile(r.state);
  assert.equal(xpTotal(r.state), 250);
  r.state.mocks[0] = { ...r.state.mocks[0], deleted: true, updatedAt: 3 };
  r = reconcile(r.state);
  assert.equal(goalDone(r.state, 'g-mock'), 0);
  assert.equal(xpTotal(r.state), 0);
});

test('minimum-viable day counts at 45 focus minutes', () => {
  const s = base();
  s.sessions.push({ id: 's1', dateKey: T, startedAt: 1, minutes: 44, section: 'QA', taskId: null, updatedAt: 1 });
  assert.equal(dayCounted(s, T), false);
  s.sessions.push({ id: 's2', dateKey: T, startedAt: 2, minutes: 1, section: 'QA', taskId: null, updatedAt: 1 });
  assert.equal(dayCounted(s, T), true);
  assert.ok(levelInfo(xpTotal(reconcile(s).state)).level >= 1);
});

test('a personal task earns the XP typed on it, not the default', () => {
  const s = base();
  s.tasks.push({ id: 'p1', scope: 'day', key: T, title: 'Gym', goalId: null, section: 'ALL', target: 1, unit: 'done', xp: 40, updatedAt: 1 });
  s.entries.push({ id: 'e1', dateKey: T, goalId: null, taskId: 'p1', amount: 1, ts: 1, updatedAt: 1 });
  const r = reconcile(s);
  assert.equal(xpTotal(r.state), 40 + 30); // custom XP + day bonus
});

test('a daily mock task ticks itself from the mock logged that day, and only that day', () => {
  const s = base();
  s.tasks.push({ id: 'dm', scope: 'day', key: T, title: 'Full mock', goalId: 'g-mock', section: 'ALL', target: 1, unit: 'mock', updatedAt: 1 });
  let r = reconcile(s);
  assert.equal(xpTotal(r.state), 0); // nothing logged, nothing earned
  r.state.mocks.push({ id: 'm1', name: 'Mock 1', dateKey: '2026-10-22', overall: { score: null, percentile: 80 }, varc: { score: null, percentile: null }, dilr: { score: null, percentile: null }, qa: { score: null, percentile: null }, notes: '', analysed: false, updatedAt: 1 } as never);
  r = reconcile(r.state);
  assert.equal(r.state.tasks[0].id, 'dm');
  const done = (st: AppState) => import('./logic.ts').then(m => m.taskDone(st, st.tasks[0]));
  return done(r.state).then(d => {
    assert.equal(d, false); // a mock from another day doesn't tick today's task
    r.state.mocks.push({ ...r.state.mocks[0], id: 'm2', dateKey: T } as never);
    r = reconcile(r.state);
    return done(r.state).then(d2 => assert.equal(d2, true));
  });
});
