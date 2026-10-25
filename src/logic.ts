import type { AppState, Entry, Goal, Mock, Section, Task } from './types';

/* ───────────── dates (all local-time, YYYY-MM-DD keys) ───────────── */

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // noon avoids DST edge cases
}

export const todayKey = (now = new Date()) => toKey(now);

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

/** Monday of the week containing `key`. */
export function weekStart(key: string): string {
  const d = fromKey(key);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  return addDays(key, -dow);
}

export function weekDays(key: string): string[] {
  const s = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

export function daysLeft(examDate: string, today: string): number {
  return Math.max(0, daysBetween(today, examDate));
}

/** Week number of `key` counting from the week containing `startKey` (1-based) and total weeks until the exam. */
export function weekProgress(startKey: string, examDate: string, key: string) {
  const first = weekStart(startKey);
  const last = weekStart(examDate);
  const total = Math.round(daysBetween(first, last) / 7) + 1;
  const current = Math.min(total, Math.max(1, Math.round(daysBetween(first, weekStart(key)) / 7) + 1));
  return { current, total };
}

/* ───────────── live (non-deleted) accessors ───────────── */

const live = <T extends { deleted?: boolean }>(xs: T[]) => xs.filter(x => !x.deleted);

export const goalsOf = (s: AppState) => live(s.goals).sort((a, b) => a.order - b.order);
export const tasksOf = (s: AppState) => live(s.tasks);
export const entriesOf = (s: AppState) => live(s.entries);
export const sessionsOf = (s: AppState) => live(s.sessions);
export const mocksOf = (s: AppState) => live(s.mocks).sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.updatedAt - b.updatedAt);

/* ───────────── progress ───────────── */

const round2 = (n: number) => Math.round(n * 100) / 100;

export function goalDone(s: AppState, goalId: string): number {
  return round2(entriesOf(s).filter(e => e.goalId === goalId).reduce((a, e) => a + e.amount, 0));
}

export function taskProgress(s: AppState, t: Task): number {
  const es = entriesOf(s);
  if (t.scope === 'week' && t.goalId) {
    const days = new Set(weekDays(t.key));
    return round2(es.filter(e => e.goalId === t.goalId && days.has(e.dateKey)).reduce((a, e) => a + e.amount, 0));
  }
  return round2(es.filter(e => e.taskId === t.id).reduce((a, e) => a + e.amount, 0));
}

export const taskRatio = (s: AppState, t: Task) => (t.target <= 0 ? 1 : Math.min(1, taskProgress(s, t) / t.target));
export const taskDone = (s: AppState, t: Task) => taskProgress(s, t) >= t.target - 1e-9;

export const dayTasks = (s: AppState, key: string) => tasksOf(s).filter(t => t.scope === 'day' && t.key === key);
export const weekTasks = (s: AppState, key: string) => tasksOf(s).filter(t => t.scope === 'week' && t.key === weekStart(key));

export function focusMinutes(s: AppState, key: string): number {
  return sessionsOf(s).filter(x => x.dateKey === key).reduce((a, x) => a + x.minutes, 0);
}

export function focusMinutesBySection(s: AppState, keys?: string[]): Record<Section, number> {
  const out: Record<Section, number> = { VARC: 0, DILR: 0, QA: 0, ALL: 0 };
  const set = keys ? new Set(keys) : null;
  for (const x of sessionsOf(s)) if (!set || set.has(x.dateKey)) out[x.section] += x.minutes;
  return out;
}

/** 0..1 completion of a day: task completion if tasks exist, otherwise focus vs the minimum day. */
export function dayRatio(s: AppState, key: string): number {
  const ts = dayTasks(s, key);
  if (ts.length) return ts.reduce((a, t) => a + taskRatio(s, t), 0) / ts.length;
  return Math.min(1, focusMinutes(s, key) / Math.max(1, s.settings.minDayMinutes));
}

/** A day "counts" for the streak if the minimum focus is met, or every planned task is done. */
export function dayCounted(s: AppState, key: string): boolean {
  if (focusMinutes(s, key) >= s.settings.minDayMinutes) return true;
  const ts = dayTasks(s, key);
  return ts.length > 0 && ts.every(t => taskDone(s, t));
}

export type DayStatus = 'counted' | 'partial' | 'empty' | 'future';
export function dayStatus(s: AppState, key: string, today: string): DayStatus {
  if (key > today) return 'future';
  if (dayCounted(s, key)) return 'counted';
  const any = focusMinutes(s, key) > 0 || entriesOf(s).some(e => e.dateKey === key);
  return any ? 'partial' : 'empty';
}

/* ───────────── streak with one rest token per week ───────────── */

export interface StreakInfo {
  current: number;
  best: number;
  restUsed: string[];
  atRisk: boolean;
  totalDays: number;
  restLeftThisWeek: boolean;
}

export function computeStreak(counted: Set<string>, today: string, tokensPerWeek = 1): StreakInfo {
  const days = [...counted].filter(d => d <= today).sort();
  if (!days.length) return { current: 0, best: 0, restUsed: [], atRisk: false, totalDays: 0, restLeftThisWeek: true };
  let streak = 0, best = 0;
  const used: Record<string, number> = {};
  const restUsed: string[] = [];
  for (let d = days[0]; d <= today; d = addDays(d, 1)) {
    if (counted.has(d)) {
      streak++;
      best = Math.max(best, streak);
    } else if (d === today) {
      // today is still open — streak stays alive
    } else {
      const w = weekStart(d);
      if (streak > 0 && (used[w] ?? 0) < tokensPerWeek) {
        used[w] = (used[w] ?? 0) + 1;
        restUsed.push(d);
      } else {
        streak = 0;
      }
    }
  }
  const thisWeek = weekStart(today);
  return {
    current: streak,
    best,
    restUsed,
    atRisk: streak > 0 && !counted.has(today),
    totalDays: days.length,
    restLeftThisWeek: (used[thisWeek] ?? 0) < tokensPerWeek
  };
}

export function streakOf(s: AppState, today: string): StreakInfo {
  const keys = new Set<string>();
  const candidates = new Set<string>([
    ...sessionsOf(s).map(x => x.dateKey),
    ...tasksOf(s).filter(t => t.scope === 'day').map(t => t.key)
  ]);
  for (const k of candidates) if (k <= today && dayCounted(s, k)) keys.add(k);
  return computeStreak(keys, today);
}

/* ───────────── XP & levels ───────────── */

export const xpTotal = (s: AppState) => live(s.xp).reduce((a, e) => a + e.amount, 0);
export const xpOnDay = (s: AppState, key: string) => live(s.xp).filter(e => e.dateKey === key).reduce((a, e) => a + e.amount, 0);

/** Cumulative XP needed to reach level L (level 1 = 0 XP). */
export const xpForLevel = (L: number) => Math.round(120 * Math.pow(Math.max(0, L - 1), 1.5));

export function levelInfo(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, floor, next, into: xp - floor, span: next - floor, ratio: (xp - floor) / (next - floor) };
}

const TITLES = ['Rookie', 'Warming up', 'Grinder', 'Locked in', 'Sharp', 'Relentless', 'Sectional ace', 'Top decile', 'Percentile hunter', '99er'];
export const levelTitle = (level: number) => TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))];

/** Amount of XP that can still be earned today under the daily cap (mocks bypass the cap). */
export function capRoom(s: AppState, key: string): number {
  const used = live(s.xp).filter(e => e.dateKey === key && !e.reason.startsWith('mock')).reduce((a, e) => a + e.amount, 0);
  return Math.max(0, s.settings.dailyXpCap - used);
}

/* ───────────── mocks ───────────── */

export function mockTrend(mocks: Mock[]) {
  return mocks.map(m => ({
    id: m.id,
    name: m.name,
    dateKey: m.dateKey,
    overall: m.overall.percentile,
    varc: m.varc.percentile,
    dilr: m.dilr.percentile,
    qa: m.qa.percentile,
    score: m.overall.score
  }));
}

/** The section with the lowest latest percentile, if known. */
export function weakestSection(mocks: Mock[]): { section: Section; percentile: number } | null {
  const last = mocks[mocks.length - 1];
  if (!last) return null;
  const c: { section: Section; percentile: number }[] = [];
  if (last.varc.percentile != null) c.push({ section: 'VARC', percentile: last.varc.percentile });
  if (last.dilr.percentile != null) c.push({ section: 'DILR', percentile: last.dilr.percentile });
  if (last.qa.percentile != null) c.push({ section: 'QA', percentile: last.qa.percentile });
  return c.sort((a, b) => a.percentile - b.percentile)[0] ?? null;
}

/* ───────────── pace ───────────── */

/** Honest pacing: share of total goals done vs share of prep time elapsed. */
export function pace(s: AppState, startKey: string, today: string) {
  const goals = goalsOf(s);
  const total = goals.reduce((a, g) => a + g.total, 0);
  const done = goals.reduce((a, g) => a + Math.min(g.total, goalDone(s, g.id)), 0);
  const span = Math.max(1, daysBetween(startKey, s.settings.examDate));
  const elapsed = Math.min(span, Math.max(0, daysBetween(startKey, today)));
  const doneRatio = total ? done / total : 0;
  const timeRatio = elapsed / span;
  return { doneRatio, timeRatio, gap: doneRatio - timeRatio };
}

/** The day a total goal should be finished by: the exam day, or `finishBefore` days earlier. */
export const goalDeadline = (g: Goal, examDate: string) => addDays(examDate, -Math.max(0, Math.round(g.finishBefore ?? 0)));

/** The deadline that still lies ahead; a deadline already missed falls back to the exam day so suggestions stay sane. */
function effectiveDeadline(g: Goal, examDate: string, today: string) {
  const d = goalDeadline(g, examDate);
  return d >= today ? { date: d, missed: false } : { date: examDate, missed: true };
}

/** Units per day needed from today to finish a goal by its deadline. */
export function neededPerDay(g: Goal, done: number, today: string, examDate: string): number {
  const left = Math.max(0, g.total - done);
  const days = Math.max(1, daysBetween(today, effectiveDeadline(g, examDate, today).date) + 1);
  return left / days;
}

export interface WeeklyPlan {
  /** units to aim for in that week (0 = nothing needed) */
  amount: number;
  /** units still to do at the start of the current week */
  left: number;
  weeksLeft: number;
  deadline: string;
  /** the goal's own deadline has passed: paced to the exam day instead */
  missed: boolean;
}

/**
 * What to aim for in a week so the goal is finished by its deadline: what was left when the current week began,
 * spread evenly over the weeks from now until the deadline. Same number for every upcoming week, so it doesn't
 * change as the person logs progress during the week. Null for weeks already gone.
 */
export function weeklyPlan(s: AppState, g: Goal, weekKey: string, today: string): WeeklyPlan | null {
  const base = weekStart(today);
  const wk = weekStart(weekKey);
  if (wk < base) return null;
  const { date, missed } = effectiveDeadline(g, s.settings.examDate, today);
  const doneBefore = round2(entriesOf(s).filter(e => e.goalId === g.id && e.dateKey < base).reduce((a, e) => a + e.amount, 0));
  const left = Math.max(0, round2(g.total - doneBefore));
  const weeksLeft = Math.max(1, Math.floor(daysBetween(base, weekStart(date)) / 7) + 1);
  const step = g.step || 1;
  const up = (n: number) => Math.ceil(n / step - 1e-9) * step;
  const pastDeadlineWeek = wk > weekStart(date);
  const amount = left <= 1e-9 || pastDeadlineWeek ? 0 : Math.max(step, up(left / weeksLeft));
  return { amount: Math.min(amount, up(left)), left, weeksLeft, deadline: date, missed };
}

export function entriesForGoalOnDay(es: Entry[], goalId: string, key: string) {
  return es.filter(e => e.goalId === goalId && e.dateKey === key);
}

export const fmtNum = (n: number) => (Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : String(round2(n)));
export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + 'm' : ''}`.trim() : `${m}m`);

/* ───────────── daily suggestions ───────────── */

export interface Suggestion {
  weekTaskId: string;
  title: string;
  goalId: string;
  section: Section;
  unit: string;
  amount: number;
  left: number;
  days: number;
  /** Even the capped amount won't finish the week: the weekly target is probably too high. */
  overCap: boolean;
  need: number;
}

/**
 * Today's share of every linked weekly goal: what is left this week, spread over the days left (today included).
 * Never suggests more than double a normal day, so falling behind doesn't produce a scary number.
 */
export function dailySuggestions(s: AppState, today: string): Suggestion[] {
  const days = daysBetween(today, addDays(weekStart(today), 6)) + 1;
  const goals = new Map(goalsOf(s).map(g => [g.id, g]));
  const planned = new Set(dayTasks(s, today).map(t => t.goalId).filter(Boolean));
  const out: Suggestion[] = [];
  for (const wt of weekTasks(s, today)) {
    const g = wt.goalId ? goals.get(wt.goalId) : undefined;
    if (!g || g.fromMocks || planned.has(g.id)) continue;
    const left = wt.target - taskProgress(s, wt);
    if (left <= 1e-9) continue;
    const step = g.step || 1;
    const up = (n: number) => Math.ceil(n / step - 1e-9) * step;
    const need = up(left / days);
    const base = Math.max(step, up(wt.target / 7));
    const cap = base * 2;
    out.push({ weekTaskId: wt.id, title: wt.title.replace(/\s+(this|for the) week$/i, '').trim() || wt.title, goalId: g.id, section: g.section, unit: g.unit, amount: Math.min(need, cap, up(left)), left: round2(left), days, overCap: need > cap, need });
  }
  return out;
}
