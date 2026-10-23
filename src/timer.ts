import type { FocusTimer } from './types.ts';

/** Minutes needed for a focus session to count. */
export const MIN_COUNT = 5;
/** A timer that ends while the app is open and awake (within this slack) is logged straight away. */
export const LATE_GRACE_MS = 90_000;
/** A timer left paused this long is ended. */
export const PAUSED_LIMIT_MS = 3 * 3_600_000;

export const totalMs = (t: FocusTimer) => t.durationMin * 60_000;
export const elapsedMs = (t: FocusTimer, now: number) => t.elapsedBefore + (t.runningSince ? Math.max(0, now - t.runningSince) : 0);
export const remainingMs = (t: FocusTimer, now: number) => Math.max(0, totalMs(t) - elapsedMs(t, now));

/**
 * Timestamp for a change to the timer. Always later than the previous change, even if this device's clock is behind,
 * so the newest action is never lost when devices merge ("last writer wins").
 */
export const nextStamp = (prev: FocusTimer | null | undefined, now: number) => Math.max(now, (prev?.updatedAt ?? 0) + 1);

/** Minutes to credit if the timer is ended by the person right now ("Finish now", or time simply ran out). */
export const creditedMinutes = (t: FocusTimer, now: number) => {
  const el = elapsedMs(t, now);
  return el >= totalMs(t) - 500 ? t.durationMin : Math.floor(el / 60_000);
};

export type TimerAction =
  | { kind: 'finish' } //            ended while someone was watching: log it
  | { kind: 'review'; max: number } // ended while away: ask how long they really studied
  | { kind: 'discard' } //            abandoned and too short to count
  | null;

/** What should happen to this timer right now, if anything. Pure, so it can be tested. */
export function decide(t: FocusTimer | null, now: number, visible: boolean): TimerAction {
  if (!t?.active || t.review) return null;
  if (t.runningSince) {
    const el = elapsedMs(t, now);
    if (el < totalMs(t) - 500) return null;
    return el - totalMs(t) <= LATE_GRACE_MS && visible ? { kind: 'finish' } : { kind: 'review', max: t.durationMin };
  }
  if (now - t.updatedAt > PAUSED_LIMIT_MS) {
    const max = Math.floor(t.elapsedBefore / 60_000);
    return max >= MIN_COUNT ? { kind: 'review', max } : { kind: 'discard' };
  }
  return null;
}
