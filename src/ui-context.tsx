import { createContext, useContext } from 'react';
import type { Section } from './types';
import type { TaskDraft } from './screens/TaskSheet';

export type Tab = 'today' | 'plan' | 'mocks' | 'insights';

export interface Ui {
  tab: Tab;
  setTab: (t: Tab) => void;
  openFocus: (opts?: { section?: Section; taskId?: string | null }) => void;
  openMenu: () => void;
  openReflection: () => void;
  openFutureNote: () => void;
  openTask: (d: TaskDraft) => void;
}

export const UiCtx = createContext<Ui | null>(null);
export const useUi = () => {
  const c = useContext(UiCtx);
  if (!c) throw new Error('useUi outside provider');
  return c;
};
