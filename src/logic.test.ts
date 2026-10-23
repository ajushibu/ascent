import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, computeStreak, daysBetween, levelInfo, weekStart, xpForLevel, weekProgress } from './logic.ts';

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
