import type { AppState } from './types';
import { emptyState } from './merge';
import { reconcile } from './reconcile';
import { addDays, weekStart } from './logic';

/** Dev-only sample data (?demo=1) used for visual review. Never shipped to users unless they open ?demo in dev. */
export function buildDemo(today: string, theme: 'light' | 'dark'): AppState {
  const s = emptyState();
  const t = 1;
  s.settings = { ...s.settings, name: 'Aju', startDate: addDays(today, -2), setupDone: true, theme, updatedAt: t, futureNote: 'You have done harder things than this. 45 minutes. Just open the first problem and the rest follows.' };
  s.goals = [
    { id: 'g-mock', label: 'Mocks', unit: 'mocks', total: 10, section: 'ALL', xpPerUnit: 0, step: 1, order: 0, fromMocks: true, updatedAt: t },
    { id: 'g-di', label: 'DI sets', unit: 'sets', total: 40, section: 'DILR', xpPerUnit: 25, step: 1, order: 1, updatedAt: t },
    { id: 'g-qa', label: 'Quant revision · 2 rounds', unit: 'topics', total: 40, section: 'QA', xpPerUnit: 20, step: 1, order: 2, updatedAt: t }
  ];
  s.mocks = [{ id: 'm1', name: 'CAT 2025 Actual Paper Slot 1', dateKey: addDays(today, -6), analysed: false, notes: 'DILR zero — started wrong set, panicked. Quant: skipped geometry.', updatedAt: t, overall: { score: 47, percentile: 78.07 }, varc: { score: 38, percentile: 95.3 }, dilr: { score: 0, percentile: 35 }, qa: { score: 9, percentile: 66.5 } }];
  const d1 = addDays(today, -2), d2 = addDays(today, -1);
  s.sessions = [
    { id: 's1', dateKey: d1, startedAt: 1, minutes: 60, section: 'QA', taskId: null, updatedAt: t },
    { id: 's2', dateKey: d2, startedAt: 2, minutes: 50, section: 'DILR', taskId: null, updatedAt: t },
    { id: 's3', dateKey: d2, startedAt: 3, minutes: 45, section: 'QA', taskId: null, updatedAt: t },
    { id: 's4', dateKey: today, startedAt: 4, minutes: 40, section: 'DILR', taskId: null, updatedAt: t }
  ];
  s.tasks = [
    { id: 't1', scope: 'day', key: today, title: 'DI sets, timed', goalId: 'g-di', section: 'DILR', target: 3, unit: 'sets', updatedAt: t },
    { id: 't2', scope: 'day', key: today, title: 'Revise Algebra types', goalId: 'g-qa', section: 'QA', target: 4, unit: 'topics', updatedAt: t },
    { id: 't3', scope: 'day', key: today, title: 'Analyse yesterday’s sectional', goalId: null, section: 'ALL', target: 1, unit: 'done', updatedAt: t },
    { id: 'w1', scope: 'week', key: weekStart(today), title: 'DI sets this week', goalId: 'g-di', section: 'DILR', target: 10, unit: 'sets', updatedAt: t },
    { id: 'w2', scope: 'week', key: weekStart(today), title: 'Quant revision', goalId: 'g-qa', section: 'QA', target: 14, unit: 'topics', updatedAt: t },
    { id: 'w3', scope: 'week', key: weekStart(today), title: 'Full mock + analysis', goalId: null, section: 'ALL', target: 1, unit: 'mock', updatedAt: t },
    { id: 'y1', scope: 'day', key: d2, title: 'DI sets', goalId: 'g-di', section: 'DILR', target: 2, unit: 'sets', updatedAt: t }
  ];
  const e = (id: string, dateKey: string, goalId: string | null, taskId: string | null, amount: number) => ({ id, dateKey, goalId, taskId, amount, ts: 1, updatedAt: t });
  s.entries = [
    e('e1', d1, 'g-qa', null, 3), e('e2', d2, 'g-di', 'y1', 2), e('e3', d2, 'g-qa', null, 2),
    e('e4', today, 'g-di', 't1', 1), e('e5', today, 'g-qa', 't2', 2)
  ];
  s.reflections = [{ id: `reflect:${d2}`, dateKey: d2, did: 'Two DI sets and quant revision.', skipped: 'Geometry', why: 'Avoided it — felt hard.', mood: 3, updatedAt: t }];
  s.rewards = [{ id: `reward:${weekStart(today)}`, weekKey: weekStart(today), title: 'Saturday night out + biryani', claimedAt: null, updatedAt: t }];
  return reconcile(s).state;
}
