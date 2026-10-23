import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, mergeState, normalizeState } from './merge.ts';
import type { FocusTimer } from './types.ts';

const timer = (over: Partial<FocusTimer>): FocusTimer => ({ id: 't1', active: true, startedAt: 1000, runningSince: 1000, elapsedBefore: 0, durationMin: 50, section: 'QA', taskId: null, updatedAt: 1000, ...over });

test('the newest timer change wins across devices', () => {
  const a = { ...emptyState(), timer: timer({}) };
  const b = { ...emptyState(), timer: timer({ runningSince: null, elapsedBefore: 600_000, updatedAt: 2000 }) }; // paused on the other phone
  assert.equal(mergeState(a, b).timer?.runningSince, null);
  assert.equal(mergeState(b, a).timer?.runningSince, null); // same result either way round
});

test('a stopped timer is not revived by a stale running copy', () => {
  const stopped = { ...emptyState(), timer: timer({ active: false, runningSince: null, updatedAt: 3000 }) };
  const stale = { ...emptyState(), timer: timer({}) };
  assert.equal(mergeState(stale, stopped).timer?.active, false);
  assert.equal(mergeState(stopped, stale).timer?.active, false);
});

test('the same session finished on two devices is logged once', () => {
  const s = { id: 'timer:t1', dateKey: '2026-10-23', startedAt: 1000, minutes: 50, section: 'QA' as const, taskId: null, updatedAt: 5000 };
  const a = { ...emptyState(), sessions: [s] };
  const b = { ...emptyState(), sessions: [{ ...s, updatedAt: 5001 }] };
  assert.equal(mergeState(a, b).sessions.length, 1);
});

test('older saved documents without a timer still load', () => {
  assert.equal(normalizeState({ goals: [] }).timer, null);
});
