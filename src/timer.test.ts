import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, creditedMinutes, nextStamp, remainingMs, elapsedMs, LATE_GRACE_MS } from './timer.ts';
import type { FocusTimer } from './types.ts';

const MIN = 60_000;
const t0 = 1_000_000;
const running = (o: Partial<FocusTimer> = {}): FocusTimer => ({ id: 'a', active: true, startedAt: t0, runningSince: t0, elapsedBefore: 0, durationMin: 50, section: 'QA', taskId: null, updatedAt: t0, ...o });

test('countdown comes from timestamps, so it is right after a lock or reload', () => {
  assert.equal(remainingMs(running(), t0 + 20 * MIN), 30 * MIN);
  assert.equal(remainingMs(running(), t0 + 90 * MIN), 0);
  assert.equal(elapsedMs(running({ runningSince: null, elapsedBefore: 12 * MIN }), t0 + 999 * MIN), 12 * MIN); // paused: frozen
});

test('nothing happens before time is up', () => {
  assert.equal(decide(running(), t0 + 49 * MIN, true), null);
});

test('ends on time while the app is open and awake: log it', () => {
  assert.deepEqual(decide(running(), t0 + 50 * MIN + 2_000, true), { kind: 'finish' });
  assert.deepEqual(decide(running(), t0 + 50 * MIN + LATE_GRACE_MS, true), { kind: 'finish' });
});

test('ended while away (late, or app hidden): never logged silently, the person confirms', () => {
  assert.deepEqual(decide(running(), t0 + 55 * MIN, true), { kind: 'review', max: 50 });
  assert.deepEqual(decide(running(), t0 + 50 * MIN + 1_000, false), { kind: 'review', max: 50 });
});

test('a paused timer is left alone for a while, then capped at the time actually run', () => {
  const paused = running({ runningSince: null, elapsedBefore: 12 * MIN, updatedAt: t0 });
  assert.equal(decide(paused, t0 + 2 * 3_600_000, true), null);
  assert.deepEqual(decide(paused, t0 + 4 * 3_600_000, true), { kind: 'review', max: 12 });
  assert.deepEqual(decide({ ...paused, elapsedBefore: 3 * MIN }, t0 + 4 * 3_600_000, true), { kind: 'discard' });
});

test('already in review, or stopped: no further action', () => {
  assert.equal(decide(running({ review: { max: 50 } }), t0 + 99 * MIN, true), null);
  assert.equal(decide(running({ active: false }), t0 + 99 * MIN, true), null);
  assert.equal(decide(null, t0, true), null);
});

test('finishing early credits only whole minutes done; a full timer credits the full length', () => {
  assert.equal(creditedMinutes(running(), t0 + 17 * MIN + 59_000), 17);
  assert.equal(creditedMinutes(running(), t0 + 50 * MIN), 50);
  assert.equal(creditedMinutes(running(), t0 + 80 * MIN), 50); // never more than was set
});

test('a device with a slow clock cannot lose to an older change', () => {
  const prev = running({ updatedAt: 5_000_000 });
  assert.ok(nextStamp(prev, 4_000_000) > prev.updatedAt); // its clock says 4.0M but the last change was 5.0M
  assert.equal(nextStamp(null, 123), 123);
});
