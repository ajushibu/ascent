import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Sheet, Stepper } from '../components/ui';
import { I } from '../components/icons';
import { XP_REFLECT } from '../reconcile';
import { hasBackend } from '../supabase';

const MOODS = ['Drained', 'Low', 'Okay', 'Good', 'Great'] as const;

export function ReflectionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, today, saveReflection } = useStore();
  const existing = state.reflections.find(r => r.id === `reflect:${today}` && !r.deleted);
  const [did, setDid] = useState('');
  const [skipped, setSkipped] = useState('');
  const [why, setWhy] = useState('');
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
  useEffect(() => {
    if (!open) return;
    setDid(existing?.did ?? ''); setSkipped(existing?.skipped ?? ''); setWhy(existing?.why ?? ''); setMood(existing?.mood ?? 3);
  }, [open, existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet open={open} onClose={onClose} title="Close the day">
      <div className="stack" style={{ gap: 16 }}>
        <div className="field"><label htmlFor="r1">What did you get done?</label><textarea id="r1" className="textarea" value={did} onChange={e => setDid(e.target.value)} placeholder="Even small counts" /></div>
        <div className="field"><label htmlFor="r2">What did you skip?</label><textarea id="r2" className="textarea" value={skipped} onChange={e => setSkipped(e.target.value)} placeholder="Be specific" /></div>
        <div className="field"><label htmlFor="r3">Why? Be honest.</label><textarea id="r3" className="textarea" value={why} onChange={e => setWhy(e.target.value)} placeholder="Tired, avoided it, ran out of time…" /></div>
        <div className="field">
          <label>How did today feel?</label>
          <div className="chips">{MOODS.map((m, i) => <button key={m} type="button" className={`chip ${mood === i + 1 ? 'on' : ''}`} onClick={() => setMood((i + 1) as 1 | 2 | 3 | 4 | 5)}>{m}</button>)}</div>
        </div>
        <button className="btn" disabled={!did.trim() && !skipped.trim()} onClick={() => { saveReflection({ dateKey: today, did: did.trim(), skipped: skipped.trim(), why: why.trim(), mood }); onClose(); }}>
          {existing ? 'Update reflection' : `Save · +${XP_REFLECT} XP`}
        </button>
      </div>
    </Sheet>
  );
}

export function FutureNoteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, updateSettings } = useStore();
  const [text, setText] = useState('');
  useEffect(() => { if (open) setText(state.settings.futureNote); }, [open, state.settings.futureNote]);
  return (
    <Sheet open={open} onClose={onClose} title="Note to future you">
      <div className="stack" style={{ gap: 16 }}>
        <p className="hint">You’ll see this on a day you haven’t started. Write what you’d want to hear when motivation is gone: why you’re doing this, and how small the first step is.</p>
        <textarea className="textarea" style={{ minHeight: 190 }} aria-label="Note to future you" value={text} onChange={e => setText(e.target.value)} placeholder="Future me — you wanted this because…" />
        <button className="btn" onClick={() => { updateSettings({ futureNote: text.trim() }); onClose(); }}>Save note</button>
      </div>
    </Sheet>
  );
}

export function MenuSheet({ open, onClose, onNote, onReflect }: { open: boolean; onClose: () => void; onNote: () => void; onReflect: () => void }) {
  const { state, updateSettings, signOut, user, sync, resetAll } = useStore();
  const st = state.settings;
  const [name, setName] = useState(st.name);
  useEffect(() => { if (open) setName(st.name); }, [open, st.name]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ascent-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const syncLabel = { local: 'Saved on this device only', syncing: 'Syncing…', synced: 'Synced across devices', offline: 'Offline — will sync later', error: 'Sync problem — retrying' }[sync];

  return (
    <Sheet open={open} onClose={onClose} title="Menu">
      <div className="stack" style={{ gap: 16 }}>
        <div className="row small" style={{ fontWeight: 700 }}>
          <span className={`sync-dot ${sync}`} /> <span className="muted">{syncLabel}{user?.email ? ` · ${user.email}` : ''}</span>
        </div>
        <button className="btn ghost" style={{ justifyContent: 'flex-start' }} onClick={() => { onClose(); onNote(); }}><I.Heart size={22} /> Note to future you</button>
        <button className="btn ghost" style={{ justifyContent: 'flex-start' }} onClick={() => { onClose(); onReflect(); }}><I.Note size={22} /> Evening reflection</button>

        <div className="field">
          <label>Appearance</label>
          <div className="seg">
            {(['system', 'light', 'dark'] as const).map(t => <button key={t} className={st.theme === t ? 'on' : ''} onClick={() => updateSettings({ theme: t })}>{t === 'system' ? 'Auto' : t === 'light' ? 'Light' : 'Dark'}</button>)}
          </div>
        </div>

        <div className="field"><label htmlFor="sn">Your name</label><input id="sn" className="input" value={name} onChange={e => setName(e.target.value)} onBlur={() => name.trim() !== st.name && updateSettings({ name: name.trim() })} /></div>
        <div className="two">
          <div className="field"><label htmlFor="sd">Exam date</label><input id="sd" type="date" className="input" value={st.examDate} onChange={e => e.target.value && updateSettings({ examDate: e.target.value })} /></div>
          <div className="field"><label>Target %ile</label><Stepper value={st.targetPercentile} onChange={v => updateSettings({ targetPercentile: v })} min={50} max={100} /></div>
        </div>
        <div className="two">
          <div className="field"><label>Minimum day (min)</label><Stepper value={st.minDayMinutes} onChange={v => updateSettings({ minDayMinutes: v })} min={10} max={240} step={5} /></div>
          <div className="field"><label>Daily XP cap</label><Stepper value={st.dailyXpCap} onChange={v => updateSettings({ dailyXpCap: v })} min={100} max={2000} step={50} /></div>
        </div>
        <div className="field"><label>Reward unlocks at (%)</label><Stepper value={st.rewardThreshold} onChange={v => updateSettings({ rewardThreshold: v })} min={50} max={100} step={5} /></div>
        <p className="hint">Minimum day: the focus time that keeps your streak alive on a bad day. The XP cap stops you grinding for numbers instead of progress.</p>

        <button className="btn ghost" onClick={exportData}><I.Download size={22} /> Export backup</button>
        {hasBackend && user && <button className="btn ghost" onClick={async () => { onClose(); await signOut(); }}>Sign out</button>}
        <button className="btn ghost" style={{ color: 'var(--bad)' }} onClick={() => { if (confirm('Erase all your goals, sessions, mocks and XP on every device? This cannot be undone.')) { resetAll(); onClose(); } }}>Erase everything</button>
      </div>
    </Sheet>
  );
}
