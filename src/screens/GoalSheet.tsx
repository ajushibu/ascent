import { useEffect, useState } from 'react';
import type { Goal, Section } from '../types';
import { SECTION_LABEL } from '../types';
import { useStore } from '../store';
import { Sheet, Stepper, colorVar, sectionColor } from '../components/ui';

export interface GoalDraft { goal?: Goal }
const SECTIONS: Section[] = ['QA', 'DILR', 'VARC', 'ALL'];

export function GoalSheet({ draft, onClose }: { draft: GoalDraft | null; onClose: () => void }) {
  const { addGoal, updateGoal, deleteGoal } = useStore();
  const [label, setLabel] = useState('');
  const [unit, setUnit] = useState('');
  const [total, setTotal] = useState(10);
  const [section, setSection] = useState<Section>('QA');
  const [xp, setXp] = useState(20);

  useEffect(() => {
    if (!draft) return;
    const g = draft.goal;
    setLabel(g?.label ?? ''); setUnit(g?.unit ?? ''); setTotal(g?.total ?? 10); setSection(g?.section ?? 'QA'); setXp(g?.xpPerUnit ?? 20);
  }, [draft]);
  if (!draft) return null;
  const g = draft.goal;

  const save = () => {
    const rec = { label: label.trim() || 'Goal', unit: unit.trim() || 'units', total: Math.max(1, total), section, xpPerUnit: xp, step: g?.step ?? 1 };
    if (g) updateGoal(g.id, g.fromMocks ? { total: rec.total, label: rec.label } : rec);
    else addGoal(rec);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={g ? 'Edit total goal' : 'New total goal'}>
      <div className="stack" style={{ gap: 18 }}>
        <div className="field">
          <label htmlFor="gl">Name</label>
          <input id="gl" className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Sectional tests" />
        </div>
        <div className="field">
          <label>Total by exam day</label>
          <Stepper value={total} onChange={setTotal} min={1} step={g?.fromMocks ? 1 : total >= 40 ? 5 : 1} />
        </div>
        {!g?.fromMocks && (
          <>
            <div className="two">
              <div className="field">
                <label htmlFor="gu">Unit</label>
                <input id="gu" className="input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="sets, topics…" />
              </div>
              <div className="field">
                <label>XP per unit</label>
                <Stepper value={xp} onChange={setXp} min={0} max={200} step={5} />
              </div>
            </div>
            <div className="field">
              <label>Section</label>
              <div className="chips">
                {SECTIONS.map(s => <button key={s} type="button" className={`chip ${section === s ? 'on' : ''}`} style={colorVar(sectionColor(s))} onClick={() => setSection(s)}>{SECTION_LABEL[s]}</button>)}
              </div>
            </div>
          </>
        )}
        {g?.fromMocks && <p className="hint">Progress here comes from the mocks you log on the Mocks tab.</p>}
        <button className="btn" onClick={save}>{g ? 'Save changes' : 'Add goal'}</button>
        {g && !g.fromMocks && <button className="btn ghost" onClick={() => { deleteGoal(g.id); onClose(); }}>Delete goal</button>}
      </div>
    </Sheet>
  );
}
