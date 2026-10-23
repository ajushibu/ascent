import { useEffect, useState } from 'react';
import type { Section, Task } from '../types';
import { SECTION_LABEL } from '../types';
import { useStore } from '../store';
import { goalsOf } from '../logic';
import { Sheet, Stepper, colorVar, sectionColor } from '../components/ui';

export interface TaskDraft {
  scope: 'day' | 'week';
  key: string;
  task?: Task;
}

const SECTIONS: Section[] = ['QA', 'DILR', 'VARC', 'ALL'];

export function TaskSheet({ draft, onClose }: { draft: TaskDraft | null; onClose: () => void }) {
  const { state, addTask, updateTask, deleteTask } = useStore();
  const isWeek = draft?.scope === 'week';
  /* Mocks can only be linked from weekly goals: progress is counted from the mocks logged that week. */
  const goals = goalsOf(state).filter(g => isWeek || !g.fromMocks);
  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [target, setTarget] = useState(1);
  const [unit, setUnit] = useState('');
  const [section, setSection] = useState<Section>('QA');

  useEffect(() => {
    if (!draft) return;
    const t = draft.task;
    setTitle(t?.title ?? '');
    setGoalId(t?.goalId ?? null);
    setTarget(t?.target ?? (draft.scope === 'week' ? 5 : 1));
    setUnit(t?.unit ?? '');
    setSection(t?.section ?? 'QA');
  }, [draft]);

  if (!draft) return null;
  const goal = goals.find(g => g.id === goalId) ?? null;
  const week = draft.scope === 'week';

  const pickGoal = (id: string | null) => {
    setGoalId(id);
    const g = goals.find(x => x.id === id);
    if (g) {
      setSection(g.section);
      setUnit(g.unit);
      if (!title.trim() || goals.some(x => x.label === title)) setTitle(g.label);
    }
  };

  const preset = (t: string, s: Section, u: string, n = 1) => {
    setGoalId(null); setTitle(t); setSection(s); setUnit(u); setTarget(n);
  };

  const save = () => {
    const base = { scope: draft.scope, key: draft.key, title: title.trim() || goal?.label || 'Task', goalId, section: goal?.section ?? section, target: Math.max(0.25, target), unit: goal?.unit ?? (unit.trim() || 'done') };
    if (draft.task) updateTask(draft.task.id, base);
    else addTask(base);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={draft.task ? 'Edit goal' : week ? 'New weekly goal' : 'Add to today'}>
      <div className="stack" style={{ gap: 18 }}>
        {!draft.task && (
          <div className="field">
            <label>Quick pick</label>
            <div className="chips">
              {goals.map(g => (
                <button key={g.id} type="button" className={`chip ${goalId === g.id ? 'on' : ''}`} style={colorVar(sectionColor(g.section))} onClick={() => { pickGoal(g.id); setTarget(week ? Math.max(1, Math.round(g.total / 6)) : g.step || 1); }}>{g.label.split(' · ')[0]}</button>
              ))}
              <button type="button" className="chip" onClick={() => { const m = goals.find(g => g.fromMocks); if (week && m) { pickGoal(m.id); setTitle('Full mock'); setTarget(1); } else preset('Full mock', 'ALL', 'mock', 1); }}>Full mock</button>
              <button type="button" className="chip" onClick={() => preset('Mock analysis', 'ALL', 'mock', 1)}>Mock analysis</button>
            </div>
          </div>
        )}
        <div className="field">
          <label htmlFor="tt">What</label>
          <input id="tt" className="input" value={title} placeholder="e.g. 2 DI sets, timed" onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tg">Counts toward</label>
          <select id="tg" className="select" value={goalId ?? ''} onChange={e => pickGoal(e.target.value || null)}>
            <option value="">Nothing — just a task</option>
            {goals.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
          <p className="hint">{goal?.fromMocks ? 'Fills itself when you log a mock on the Mocks tab this week.' : goal ? 'Progress here moves your total goal and earns XP.' : 'Not linked to a total goal — it won’t earn per-unit XP, but finishing it still counts.'}</p>
        </div>
        <div className="two">
          <div className="field">
            <label>Target</label>
            <Stepper value={target} onChange={setTarget} min={goal?.step ? goal.step : 1} step={goal?.step ?? 1} />
          </div>
          {!goal && (
            <div className="field">
              <label htmlFor="tu">Unit</label>
              <input id="tu" className="input" value={unit} placeholder="sets, topics…" onChange={e => setUnit(e.target.value)} />
            </div>
          )}
        </div>
        {!goal && (
          <div className="field">
            <label>Section</label>
            <div className="chips">
              {SECTIONS.map(s => <button key={s} type="button" className={`chip ${section === s ? 'on' : ''}`} style={colorVar(sectionColor(s))} onClick={() => setSection(s)}>{SECTION_LABEL[s]}</button>)}
            </div>
          </div>
        )}
        <button className="btn" type="button" onClick={save}>{draft.task ? 'Save changes' : 'Add goal'}</button>
        {draft.task && <button className="btn ghost" type="button" onClick={() => { deleteTask(draft.task!.id); onClose(); }}>Delete goal</button>}
      </div>
    </Sheet>
  );
}
