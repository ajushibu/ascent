import { useState, type FormEvent } from 'react';
import { useStore, type SetupConfig } from '../store';
import { Stepper } from '../components/ui';
import { I } from '../components/icons';
import { todayKey, daysBetween } from '../logic';

export function Splash() {
  return <div className="auth"><div className="logo" style={{ animation: 'breathe 1.6s ease-in-out infinite' }}><I.Rocket size={34} /></div></div>;
}

export function Auth() {
  const { signIn, signUp, requestReset } = useStore();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [info, setInfo] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    const err = mode === 'in' ? await signIn(email.trim(), pw) : await signUp(email.trim(), pw);
    setBusy(false);
    if (err) setMsg(err);
  };
  return (
    <div className="app">
      <div className="auth">
        <form className="card wash stack" style={{ gap: 18 }} onSubmit={submit}>
          <span className="logo"><I.Rocket size={32} /></span>
          <div>
            <h1 className="h1">Ascent</h1>
            <p className="body" style={{ marginTop: 8 }}>{mode === 'in' ? 'Sign in to pick up where you left off.' : 'Create your account. Anyone you share the login with sees the same data.'}</p>
          </div>
          <div className="field"><label htmlFor="em">Email</label><input id="em" className="input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="field"><label htmlFor="pw">Password</label><input id="pw" className="input" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={6} required value={pw} onChange={e => setPw(e.target.value)} /></div>
          {msg && <p className="err" role="alert">{msg}</p>}
          {info && <p className="hint" role="status">{info}</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
          {mode === 'in' && (
            <button type="button" className="btn-link" disabled={busy} onClick={async () => {
              setMsg(''); setInfo('');
              if (!email.trim()) { setMsg('Type your email above first.'); return; }
              setBusy(true);
              const err = await requestReset(email.trim());
              setBusy(false);
              if (err) setMsg(err); else setInfo('Check your inbox for a link to choose a new password.');
            }}>Forgot password?</button>
          )}
          <button type="button" className="btn-link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(''); setInfo(''); }}>{mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}</button>
        </form>
      </div>
    </div>
  );
}

export function NewPassword() {
  const { setPassword } = useStore();
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    const err = await setPassword(pw);
    setBusy(false);
    if (err) setMsg(err);
  };
  return (
    <div className="app">
      <div className="auth">
        <form className="card wash stack" style={{ gap: 18 }} onSubmit={submit}>
          <span className="logo"><I.Rocket size={32} /></span>
          <div>
            <h1 className="h1">New password</h1>
            <p className="body" style={{ marginTop: 8 }}>Choose a new password. Anyone sharing this login will need to use it too.</p>
          </div>
          <div className="field"><label htmlFor="npw">Password</label><input id="npw" className="input" type="password" autoComplete="new-password" minLength={6} required value={pw} onChange={e => setPw(e.target.value)} /></div>
          {msg && <p className="err" role="alert">{msg}</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'One moment…' : 'Save password'}</button>
        </form>
      </div>
    </div>
  );
}

export function Setup() {
  const { completeSetup, state } = useStore();
  const [c, setC] = useState<SetupConfig>({ name: state.settings.name, examDate: state.settings.examDate, targetPercentile: 99, mocks: 10, diSets: 40, topicsPerRound: 20, rounds: 2, minDayMinutes: 45 });
  const set = <K extends keyof SetupConfig>(k: K, v: SetupConfig[K]) => setC(p => ({ ...p, [k]: v }));
  const days = daysBetween(todayKey(), c.examDate);
  return (
    <div className="app">
      <div className="screen">
        <header>
          <span className="logo"><I.Rocket size={32} /></span>
          <h1 className="h1" style={{ marginTop: 18 }}>Set your totals</h1>
          <p className="body" style={{ marginTop: 8 }}>The big numbers you want to hit by exam day. You can change any of them later.</p>
        </header>
        <section className="card stack" style={{ gap: 18 }}>
          <div className="field"><label htmlFor="n">Your name</label><input id="n" className="input" value={c.name} onChange={e => set('name', e.target.value)} placeholder="What should the app call you?" /></div>
          <div className="two">
            <div className="field"><label htmlFor="ed">Exam date</label><input id="ed" type="date" className="input" value={c.examDate} onChange={e => e.target.value && set('examDate', e.target.value)} /></div>
            <div className="field"><label>Target %ile</label><Stepper value={c.targetPercentile} onChange={v => set('targetPercentile', v)} min={50} max={100} /></div>
          </div>
          <p className="hint">{days > 0 ? `${days} days from today.` : 'Pick a date in the future.'}</p>
        </section>
        <section className="card stack" style={{ gap: 18 }}>
          <h3 className="card-title">Totals by exam day</h3>
          <div className="field"><label>Mocks</label><Stepper value={c.mocks} onChange={v => set('mocks', v)} min={1} max={60} /></div>
          <div className="field"><label>DI / LR sets</label><Stepper value={c.diSets} onChange={v => set('diSets', v)} min={1} max={400} step={5} /></div>
          <div className="two">
            <div className="field"><label>Quant topics / round</label><Stepper value={c.topicsPerRound} onChange={v => set('topicsPerRound', v)} min={1} max={100} /></div>
            <div className="field"><label>Revision rounds</label><Stepper value={c.rounds} onChange={v => set('rounds', v)} min={1} max={6} /></div>
          </div>
          <p className="hint">Quant revision total = {c.topicsPerRound} topics × {c.rounds} rounds = {c.topicsPerRound * c.rounds}. Use the number of question types in your Notion notes.</p>
        </section>
        <section className="card stack" style={{ gap: 14 }}>
          <h3 className="card-title">Your minimum day</h3>
          <Stepper value={c.minDayMinutes} onChange={v => set('minDayMinutes', v)} min={10} max={240} step={5} />
          <p className="hint">The least focused time that still counts as a day. On a bad day, this is the only thing you have to do to keep your streak.</p>
        </section>
        <button className="btn" disabled={days <= 0} onClick={() => completeSetup(c)}>Start Ascent</button>
      </div>
    </div>
  );
}
