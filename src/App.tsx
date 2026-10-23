import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StoreProvider, useStore } from './store';
import { UiCtx, type Tab, type Ui } from './ui-context';
import type { Section } from './types';
import { I } from './components/icons';
import { Toasts } from './components/ui';
import { Today } from './screens/Today';
import { Plan } from './screens/Plan';
import { Mocks } from './screens/Mocks';
import { Insights } from './screens/Insights';
import { Focus } from './screens/Focus';
import { TaskSheet, type TaskDraft } from './screens/TaskSheet';
import { MenuSheet, ReflectionSheet, FutureNoteSheet } from './screens/Extras';
import { Auth, Setup, Splash } from './screens/Gate';

function TimerPill({ onOpen }: { onOpen: () => void }) {
  const { state } = useStore();
  const t = state.timer;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!t?.active) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [t?.active]);
  if (!t?.active) return null;
  const left = Math.max(0, t.durationMin * 60_000 - (t.elapsedBefore + (t.runningSince ? now - t.runningSince : 0)));
  const mm = String(Math.floor(left / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0');
  return (
    <button className="timer-pill" onClick={onOpen} aria-label="Open focus timer">
      <span className={`live ${t.runningSince && !t.review ? '' : 'paused'}`} />
      <span className="time">{t.review ? 'Confirm' : `${mm}:${ss}`}</span>
      <span className="what">{t.review ? 'Session' : t.runningSince ? 'Focus' : 'Paused'}</span>
    </button>
  );
}

function Shell() {
  const { state, ready, needsAuth } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [focus, setFocus] = useState<{ section?: Section; taskId?: string | null } | null>(null);
  const [menu, setMenu] = useState(false);
  const [reflect, setReflect] = useState(false);
  const [note, setNote] = useState(false);
  const [task, setTask] = useState<TaskDraft | null>(null);

  const ui = useMemo<Ui>(() => ({
    tab, setTab,
    openFocus: o => setFocus(o ?? {}),
    openMenu: () => setMenu(true),
    openReflection: () => setReflect(true),
    openFutureNote: () => setNote(true),
    openTask: d => setTask(d)
  }), [tab]);

  /* a timer that ended while away asks how long you really studied: open that screen straight away */
  const reviewId = state.timer?.active && state.timer.review ? state.timer.id : null;
  useEffect(() => {
    if (reviewId) setFocus({});
  }, [reviewId]);

  if (!ready) return <Splash />;
  if (needsAuth) return <Auth />;
  if (!state.settings.setupDone) return <><Setup /><Toasts /></>;

  const items: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'today', label: 'Today', icon: <I.Home /> },
    { id: 'plan', label: 'Plan', icon: <I.Calendar /> },
    { id: 'mocks', label: 'Mocks', icon: <I.Paper /> },
    { id: 'insights', label: 'Insights', icon: <I.Chart /> }
  ];
  const nav = (it: (typeof items)[number]) => (
    <button key={it.id} className={`nav-item ${tab === it.id ? 'on' : ''}`} aria-current={tab === it.id ? 'page' : undefined} onClick={() => { setTab(it.id); window.scrollTo({ top: 0 }); }}>
      {it.icon}<span>{it.label}</span>
    </button>
  );

  return (
    <UiCtx.Provider value={ui}>
      <div className="app">
        {tab === 'today' && <Today />}
        {tab === 'plan' && <Plan />}
        {tab === 'mocks' && <Mocks />}
        {tab === 'insights' && <Insights />}

        {!focus && <TimerPill onOpen={() => setFocus({})} />}
        <div className="nav-fade" aria-hidden="true" />
        <nav className="nav" aria-label="Main">
          {nav(items[0])}
          {nav(items[1])}
          <button className="fab" aria-label="Start focus session" onClick={() => setFocus({})}><span><I.Play size={32} /></span></button>
          {nav(items[2])}
          {nav(items[3])}
        </nav>
      </div>

      {focus && <Focus initial={focus} onClose={() => setFocus(null)} />}
      <TaskSheet draft={task} onClose={() => setTask(null)} />
      <MenuSheet open={menu} onClose={() => setMenu(false)} onNote={() => setNote(true)} onReflect={() => setReflect(true)} />
      <ReflectionSheet open={reflect} onClose={() => setReflect(false)} />
      <FutureNoteSheet open={note} onClose={() => setNote(false)} />
      <Toasts />
    </UiCtx.Provider>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
