import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, computeStreak, dailySuggestions, daysBetween, levelInfo, weekStart, xpForLevel, weekProgress } from './logic.ts';
import { emptyState } from './merge.ts';

test('weekStart returns Monday', () => {
  assert.equal(weekStart('2026-10-23'), '2026-10-19'); // Fri -> Mon
  assert.equal(weekStart('2026-10-25'), '2026-10-19'); // Sun -> Mon
  assert.equal(weekStart('2026-10-19'), '2026-10-19');
});

test('days to CAT', () => {
  assert.equal(daysBetween('2026-10-23', '2026-11-29'), 37);
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
});

test('week progress covers 6 weeks', () => {
  const w = weekProgress('2026-10-23', '2026-11-29', '2026-10-23');
  assert.deepEqual(w, { current: 1, total: 6 });
});

test('plain streak', () => {
  const s = computeStreak(new Set(['2026-10-21', '2026-10-22', '2026-10-23']), '2026-10-23');
  assert.equal(s.current, 3);
  assert.equal(s.atRisk, false);
});

test('today open keeps streak alive and flags risk', () => {
  const s = computeStreak(new Set(['2026-10-21', '2026-10-22']), '2026-10-23');
  assert.equal(s.current, 2);
  assert.equal(s.atRisk, true);
});

test('one missed day in a week is covered by the rest token', () => {
  // Mon, Tue counted, Wed missed, Thu counted
  const s = computeStreak(new Set(['2026-10-19', '2026-10-20', '2026-10-22']), '2026-10-22');
  assert.equal(s.current, 3);
  assert.deepEqual(s.restUsed, ['2026-10-21']);
});

test('second miss in the same week breaks the streak', () => {
  // Mon counted, Tue+Wed missed, Thu counted
  const s = computeStreak(new Set(['2026-10-19', '2026-10-22']), '2026-10-22');
  assert.equal(s.current, 1);
  assert.equal(s.best, 1);
});

test('rest token resets each week', () => {
  // Sat missed (week 1), Tue missed (week 2): both covered
  const c = new Set(['2026-10-23', '2026-10-25', '2026-10-26', '2026-10-28']);
  const s = computeStreak(c, '2026-10-28');
  assert.equal(s.current, 4);
  assert.equal(s.restUsed.length, 2);
});

test('best streak is retained after a break', () => {
  const c = new Set(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-20']);
  const s = computeStreak(c, '2026-10-20');
  assert.equal(s.best, 4);
  assert.equal(s.current, 1);
});

test('levels are monotonic and consistent', () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(xpForLevel(2)).level, 2);
  assert.equal(levelInfo(xpForLevel(2) - 1).level, 1);
  assert.ok(xpForLevel(10) > xpForLevel(9));
  const li = levelInfo(500);
  assert.ok(li.ratio >= 0 && li.ratio < 1);
});

function suggestState(done: number) {
  const st = emptyState();
  st.goals = [{ id: 'g', label: 'Quant', unit: 'topics', total: 40, section: 'QA', xpPerUnit: 20, step: 1, order: 0, updatedAt: 1 }];
  st.tasks = [{ id: 'w', scope: 'week', key: '2026-10-19', title: 'Quant', goalId: 'g', section: 'QA', target: 14, unit: 'topics', updatedAt: 1 }];
  st.entries = done ? [{ id: 'e', dateKey: '2026-10-19', goalId: 'g', taskId: null, amount: done, ts: 1, updatedAt: 1 }] : [];
  return st;
}

test('daily suggestion splits what is left over the days left', () => {
  assert.equal(dailySuggestions(suggestState(0), '2026-10-19')[0].amount, 2); // 14 over 7 days
  const thu = dailySuggestions(suggestState(4), '2026-10-22')[0]; // 10 left, 4 days (Thu-Sun)
  assert.equal(thu.amount, 3);
  assert.equal(thu.overCap, false);
});

test('daily suggestion is capped at double a normal day and flags the shortfall', () => {
  const sun = dailySuggestions(suggestState(4), '2026-10-25')[0]; // 10 left, 1 day
  assert.equal(sun.amount, 4);
  assert.equal(sun.overCap, true);
});

test('no suggestion when the week is done or the goal is already planned today', () => {
  assert.equal(dailySuggestions(suggestState(14), '2026-10-22').length, 0);
  const st = suggestState(0);
  st.tasks.push({ id: 'd', scope: 'day', key: '2026-10-22', title: 'Quant', goalId: 'g', section: 'QA', target: 2, unit: 'topics', updatedAt: 1 });
  assert.equal(dailySuggestions(st, '2026-10-22').length, 0);
});
