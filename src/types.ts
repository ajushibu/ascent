export type Section = 'VARC' | 'DILR' | 'QA' | 'ALL';

export interface Base {
  id: string;
  updatedAt: number;
  deleted?: boolean;
}

/** A total target for the whole prep (e.g. 10 mocks, 40 DI sets). */
export interface Goal extends Base {
  label: string;
  unit: string;
  total: number;
  section: Section;
  xpPerUnit: number;
  step: number;
  order: number;
  /** Mocks goal is fed by the Mocks screen, so tasks cannot be linked to it. */
  fromMocks?: boolean;
  /** Finish this many days before the exam (0 = exam day). Weekly suggestions are paced to this date. */
  finishBefore?: number;
}

/** A manually-set daily or weekly target. */
export interface Task extends Base {
  scope: 'day' | 'week';
  /** YYYY-MM-DD for a day, or the Monday of the week for a week. */
  key: string;
  title: string;
  goalId: string | null;
  section: Section;
  target: number;
  unit: string;
  /** XP for finishing a task that isn't linked to a total goal (personal goals). Default 15. */
  xp?: number;
}

/** A unit of progress. Goal progress and task progress are both sums of entries. */
export interface Entry extends Base {
  dateKey: string;
  goalId: string | null;
  taskId: string | null;
  amount: number;
  ts: number;
}

export interface Session extends Base {
  dateKey: string;
  startedAt: number;
  minutes: number;
  section: Section;
  taskId: string | null;
}

export interface XpEvent extends Base {
  dateKey: string;
  amount: number;
  reason: string;
  ref: string;
  ts: number;
}

export interface SectionScore {
  score: number | null;
  percentile: number | null;
}

export interface Mock extends Base {
  name: string;
  dateKey: string;
  overall: SectionScore;
  varc: SectionScore;
  dilr: SectionScore;
  qa: SectionScore;
  analysed: boolean;
  notes: string;
}

export interface Reflection extends Base {
  dateKey: string;
  did: string;
  skipped: string;
  why: string;
  mood: 1 | 2 | 3 | 4 | 5;
}

export interface WeeklyReward extends Base {
  weekKey: string;
  title: string;
  claimedAt: number | null;
}

export interface Settings {
  name: string;
  examDate: string;
  startDate: string;
  targetPercentile: number;
  minDayMinutes: number;
  dailyXpCap: number;
  rewardThreshold: number;
  futureNote: string;
  theme: 'system' | 'light' | 'dark';
  setupDone: boolean;
  updatedAt: number;
}

/** The running focus timer. Lives in the synced state so every device sees (and can control) the same one. */
export interface FocusTimer {
  id: string;
  active: boolean;
  startedAt: number;
  runningSince: number | null;
  elapsedBefore: number;
  durationMin: number;
  section: Section;
  taskId: string | null;
  /** Set when the timer ended while nobody was looking: the time is only logged after the person confirms how long they really studied. */
  review?: { max: number } | null;
  updatedAt: number;
}

export interface AppState {
  settings: Settings;
  goals: Goal[];
  tasks: Task[];
  entries: Entry[];
  sessions: Session[];
  xp: XpEvent[];
  mocks: Mock[];
  reflections: Reflection[];
  rewards: WeeklyReward[];
  timer: FocusTimer | null;
}

export const SECTION_LABEL: Record<Section, string> = {
  VARC: 'VARC',
  DILR: 'DILR',
  QA: 'Quant',
  ALL: 'All'
};
