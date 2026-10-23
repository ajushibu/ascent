import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Section } from '../types';
import { SECTION_LABEL } from '../types';
import { MIN_COUNT, useStore } from '../store';
import { dayCounted, dayTasks, focusMinutes, taskDone } from '../logic';
import { colorVar, sectionColor, Stepper } from '../components/ui';
import { I } from '../components/icons';

const SECTIONS: Section[] = ['QA', 'DILR', 'VARC', 'ALL'];

export function Focus({ initial, onClose }: { initial: { section?: Section; taskId?: string | null }; onClose: () => void }) {
  const { state, today, startTimer, pauseTimer, resumeTimer, finishTimer, confirmTimer, discardTimer } = useStore();
  const [revMin, setRevMin] = useState<number | null>(null);
  /* the timer lives in the synced state, so it is the same one on every device */
  const timer = state.timer?.active ? state.timer : null;
  const [duration, setDuration] = useState(50);
  const [section, setSection] = useState<Section>(initial.section ?? 'QA');
  const [taskId, setTaskId] = useState<string | null>(initial.taskId ?? null);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<{ minutes: number; counted: boolean; short: boolean } | null>(null);
  const finishing = useRef(false);

  const tasks = useMemo(() => dayTasks(state, today).filter(t => !taskDone(state, t)), [state, today]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const elapsed = timer ? timer.elapsedBefore + (timer.runningSince ? now - timer.runningSince : 0) : 0;
  const total = (timer?.durationMin ?? duration) * 60_000;
  const remaining = Math.max(0, total - elapsed);
  const running = !!timer?.runningSince;

  /* keep the screen on while running */
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    if (running && 'wakeLock' in navigator) {
      (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen').then(l => (lock = l)).catch(() => {});
    }
    return () => { lock?.release().catch(() => {}); };
  }, [running]);

  const start = () => startTimer({ durationMin: duration, section, taskId });
  const pause = () => pauseTimer();
  const resume = () => resumeTimer();

  const finish = useCallback(() => {
    if (!timer || finishing.current) return;
    finishing.current = true;
    const r = finishTimer();
    if (r) setResult({ minutes: r.minutes, counted: r.counted, short: !r.counted });
    finishing.current = false;
  }, [timer, finishTimer]);

  /* The store ends the timer itself when time is up (even if this screen was closed), or when another device ends it.
     If that happens while this screen is open, show the summary. */
  const lastId = useRef<string | null>(null);
  useEffect(() => {
    if (timer) { lastId.current = timer.id; return; }
    const id = lastId.current;
    if (!id) return;
    lastId.current = null;
    const s = state.sessions.find(x => x.id === `timer:${id}` && !x.deleted);
    if (s) {
      setResult(prev => prev ?? { minutes: s.minutes, counted: true, short: false });
      if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
    }
  }, [timer, state.sessions]);

  const mm = String(Math.floor(remaining / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60_000) / 1000)).padStart(2, '0');
  const activeSection = timer?.section ?? section;
  const ratio = timer ? Math.min(1, elapsed / total) : 0;

  const N = 72;
  const R = 150;
  const dots = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * 2 * Math.PI - Math.PI / 2;
    return { x: 180 + R * Math.cos(a), y: 180 + R * Math.sin(a), on: i < Math.round(ratio * N) };
  });

  /* ── the timer ended while nobody was looking: only log what was really studied ── */
  if (timer?.review && !result) {
    const max = timer.review.max;
    const val = Math.min(max, revMin ?? max);
    return (
      <div className="fullscreen focus" style={colorVar(sectionColor(timer.section))}>
        <div className="inner" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div className="stack" style={{ alignItems: 'center', gap: 18 }}>
            <span className="ico-bubble lg" style={{ ...colorVar('var(--gold)'), width: 84, height: 84, borderRadius: 42 }}><I.Clock size={40} /></span>
            <h1 className="h1">Your timer ended while you were away</h1>
            <p className="body">It was set for {timer.durationMin} minutes. Log only the time you really spent studying.</p>
            <div className="field" style={{ alignItems: 'center' }}>
              <label>Minutes studied</label>
              <Stepper value={val} onChange={setRevMin} min={MIN_COUNT} max={max} step={5} />
            </div>
          </div>
          <div className="stack" style={{ marginTop: 32 }}>
            <button className="btn" onClick={() => { const r = confirmTimer(val); if (r) setResult({ minutes: r.minutes, counted: true, short: false }); }}>Log {val} min</button>
            <button className="btn ghost" onClick={() => { discardTimer(); onClose(); }}>I didn’t study — discard</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── summary ── */
  if (result) {
    const counted = dayCounted(state, today);
    return (
      <div className="fullscreen focus" style={colorVar(sectionColor(activeSection))}>
        <div className="inner" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div className="stack" style={{ alignItems: 'center', gap: 18 }}>
            <span className="ico-bubble lg" style={{ ...colorVar(result.counted ? 'var(--good)' : 'var(--muted)'), width: 84, height: 84, borderRadius: 42 }}>
              {result.counted ? <I.Check size={44} /> : <I.Clock size={40} />}
            </span>
            <h1 className="h1">{result.counted ? 'Session logged' : 'Too short to count'}</h1>
            {result.counted ? (
              <>
                <div className="row" style={{ alignItems: 'baseline', gap: 8 }}><span className="num num-xl">{result.minutes}</span><span className="unit" style={{ fontSize: 30 }}>min</span></div>
                <p className="body">{counted ? 'Your streak is secured for today.' : `${Math.max(0, state.settings.minDayMinutes - focusMinutes(state, today))} more minutes secures today’s streak.`}</p>
              </>
            ) : (
              <p className="body">Sessions under {MIN_COUNT} minutes aren’t logged. Start again whenever you’re ready.</p>
            )}
          </div>
          <div className="stack" style={{ marginTop: 36 }}>
            <button className="btn" onClick={() => { setResult(null); }}>Another session</button>
            <button className="btn ghost" onClick={onClose}>Back to today</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fullscreen focus" style={colorVar(sectionColor(activeSection))}>
      <div className="inner">
        <div className="row between">
          <button className="round-btn" aria-label="Close" onClick={onClose}><I.X /></button>
          <span className="tag"><I.Bolt size={16} />1 XP / min</span>
          <span style={{ width: 54 }} />
        </div>

        <div className="timer-wrap">
          <svg viewBox="0 0 360 360" aria-hidden="true">
            {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.on ? 5.6 : 4.2} className={d.on ? 'dot-on' : 'dot-off'} />)}
          </svg>
          <div className="center">
            <div className={`num ${timer && !running ? 'pulse' : ''}`} style={{ fontSize: 'clamp(56px, 17vw, 78px)' }}>{mm}:{ss}</div>
            <div className="caps" style={{ color: 'var(--c)' }}>{timer ? (running ? 'Focus' : 'Paused') : `${SECTION_LABEL[activeSection]} · ${duration} min`}</div>
          </div>
        </div>

        {!timer && (
          <div className="stack" style={{ gap: 24 }}>
            <div className="field">
              <label>Length</label>
              <div className="chips">
                {[25, 50, 90].map(m => <button key={m} className={`chip ${duration === m ? 'on' : ''}`} onClick={() => setDuration(m)}>{m} min</button>)}
              </div>
              <Stepper value={duration} onChange={setDuration} min={5} max={180} step={5} />
            </div>
            <div className="field">
              <label>Section</label>
              <div className="chips">
                {SECTIONS.map(s => <button key={s} className={`chip ${section === s ? 'on' : ''}`} style={colorVar(sectionColor(s))} onClick={() => { setSection(s); setTaskId(null); }}>{SECTION_LABEL[s]}</button>)}
              </div>
            </div>
            {tasks.length > 0 && (
              <div className="field">
                <label htmlFor="ft">Working on</label>
                <select id="ft" className="select" value={taskId ?? ''} onChange={e => { const t = tasks.find(x => x.id === e.target.value); setTaskId(t?.id ?? null); if (t) setSection(t.section); }}>
                  <option value="">Nothing specific</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
        {!timer && (
          <div className="focus-foot">
            <button className="btn" onClick={start}><I.Play size={24} /> Start {duration} minutes</button>
          </div>
        )}

        {timer && (
          <div className="focus-foot">
            <button className="btn" onClick={running ? pause : resume}>{running ? <><I.Pause size={24} /> Pause</> : <><I.Play size={24} /> Resume</>}</button>
            <button className="btn ghost" onClick={() => finish()}><I.Stop size={20} /> Finish now</button>
            <p className="hint" style={{ textAlign: 'center' }}>Sessions of {MIN_COUNT}+ minutes count. Ending early still logs what you did. This timer is the same on all your devices.</p>
          </div>
        )}
      </div>
    </div>
  );
}
