import { useStore } from '../store';
import { useUi } from '../ui-context';
import {
  addDays, daysLeft, focusMinutes, focusMinutesBySection, fromKey, levelInfo, levelTitle, mocksOf, pace, sessionsOf, streakOf, weakestSection, xpTotal
} from '../logic';
import { DotArc, Slant, colorVar, sectionColor } from '../components/ui';
import { I } from '../components/icons';
import type { Section } from '../types';

const MOODS = ['Drained', 'Low', 'Okay', 'Good', 'Great'];

export function Insights() {
  const { state, today } = useStore();
  const ui = useUi();
  const st = state.settings;
  const xp = xpTotal(state);
  const lv = levelInfo(xp);
  const streak = streakOf(state, today);
  const mocks = mocksOf(state);
  const pc = pace(state, st.startDate || today, today);
  const allMins = sessionsOf(state).reduce((a, s) => a + s.minutes, 0);
  const left = daysLeft(st.examDate, today);

  const by = focusMinutesBySection(state);
  const sections: Section[] = ['QA', 'DILR', 'VARC'];
  const secTotal = sections.reduce((a, s) => a + by[s], 0) || 1;
  const weak = weakestSection(mocks);
  const weakShare = weak ? Math.round((by[weak.section] / secTotal) * 100) : null;
  const weakName = weak ? ({ VARC: 'VARC', DILR: 'DILR', QA: 'Quant', ALL: '' }[weak.section]) : '';

  const active14 = Array.from({ length: 14 }, (_, i) => focusMinutes(state, addDays(today, i - 13))).filter(m => m > 0).length;
  const N = active14 < 4 ? 7 : 14;
  const days = Array.from({ length: N }, (_, i) => addDays(today, i - (N - 1)));
  const mins = days.map(k => focusMinutes(state, k));
  const maxM = Math.max(st.minDayMinutes * 1.4, ...mins, 60);
  const W = 340, H = 150, B = 22, bw = N === 7 ? 28 : 16, gap = (W - N * bw) / (N - 1);

  const reflections = [...state.reflections].filter(r => !r.deleted).sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 4);
  const gap100 = Math.round(pc.gap * 100);

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="eyebrow">{left} days to CAT</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Insights</h1>
        </div>
        <button className="round-btn" aria-label="Menu" onClick={ui.openMenu}><I.Menu /></button>
      </header>

      <section className="card">
        <div className="caps" style={{ textAlign: 'center' }}>Level</div>
        <DotArc ratio={lv.ratio} color="var(--primary)">
          <div className="num num-xl">{lv.level}</div>
          <div className="caps label" style={{ color: 'var(--primary)', fontSize: 15, letterSpacing: '0.2em' }}>{levelTitle(lv.level)}</div>
        </DotArc>
        <p className="small muted" style={{ textAlign: 'center', fontWeight: 700, marginTop: -4 }}>{lv.next - xp} XP to level {lv.level + 1}</p>
        <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '34px 0 22px', textAlign: 'center' }}>
          {[
            { icon: <I.Trophy size={26} />, c: 'var(--gold)', v: streak.best, k: 'Best streak' },
            { icon: <I.Calendar size={26} />, c: 'var(--primary)', v: streak.totalDays, k: 'Days studied' },
            { icon: <I.Flame size={28} />, c: 'var(--flame)', v: streak.current, k: 'Streak' }
          ].map(x => (
            <div key={x.k} className="stack" style={{ alignItems: 'center', gap: 8 }}>
              <span className="ico-bubble lg" style={{ ...colorVar(x.c), width: 58, height: 58, borderRadius: 29 }}>{x.icon}</span>
              <span className="num num-m" style={{ color: x.c }}>{x.v}</span>
              <span className="small muted" style={{ fontWeight: 700 }}>{x.k}</span>
            </div>
          ))}
        </div>
        <div className="divider" style={{ margin: '0 0 16px' }} />
        <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 0 }}>
          {[{ v: xp.toLocaleString('en-IN'), u: 'XP', k: 'Total earned' }, { v: Math.round(allMins / 6) / 10, u: 'h', k: 'Focused' }, { v: mocks.length, u: '', k: 'Mocks' }].map(x => (
            <div key={x.k}>
              <div className="num num-s">{x.v}<span className="unit" style={{ fontSize: 16, marginLeft: 3 }}>{x.u}</span></div>
              <div className="small muted" style={{ fontWeight: 700, marginTop: 6 }}>{x.k}</div>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 14, fontWeight: 600 }}>{streak.restLeftThisWeek ? 'One rest day available this week — a single missed day won’t break your streak.' : 'Rest day used this week. Another miss would break the streak.'}</p>
      </section>

      <div className="section-head"><h2 className="h2">Reality check</h2><span className="aside">honest numbers</span></div>

      <section className="card">
        <div className="card-title"><span className="ico-bubble"><I.Rocket size={20} /></span>Pace</div>
        <div className="stack" style={{ margin: '18px 0 6px', gap: 14 }}>
          <div>
            <div className="row between small" style={{ fontWeight: 700, marginBottom: 8 }}><span>Goals done</span><span>{Math.round(pc.doneRatio * 100)}%</span></div>
            <Slant ratio={pc.doneRatio} count={14} color="var(--primary)" thin />
          </div>
          <div>
            <div className="row between small" style={{ fontWeight: 700, marginBottom: 8 }}><span className="muted">Time elapsed</span><span className="muted">{Math.round(pc.timeRatio * 100)}%</span></div>
            <Slant ratio={pc.timeRatio} count={14} color="var(--gold)" thin />
          </div>
        </div>
        <p className="body" style={{ fontSize: 15.5 }}>
          {pc.timeRatio < 0.03 ? 'Day one. The line to watch is whether goals done keeps up with time elapsed.' : gap100 >= 3 ? `You’re ${gap100} points ahead of the clock.` : gap100 <= -3 ? `You’re ${Math.abs(gap100)} points behind the clock. That’s recoverable now and harder every week.` : 'You’re moving in step with the clock.'}
        </p>
      </section>

      <section className="card">
        <div className="card-title"><span className="ico-bubble" style={colorVar('var(--dilr)')}><I.Clock size={20} /></span>Where your time goes</div>
        <div className="stack" style={{ margin: '18px 0 8px', gap: 14 }}>
          {sections.map(s => (
            <div key={s} style={colorVar(sectionColor(s))}>
              <div className="row between small" style={{ fontWeight: 700, marginBottom: 7 }}>
                <span>{({ QA: 'Quant', DILR: 'DILR', VARC: 'VARC' } as Record<string, string>)[s]}</span>
                <span className="muted">{Math.round(by[s] / 6) / 10}h · {Math.round((by[s] / secTotal) * 100)}%</span>
              </div>
              <div className="progress"><i style={{ width: `${(by[s] / secTotal) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        {weak && allMins > 0 && (
          <p className="body" style={{ fontSize: 15.5 }}>
            {weakName} is your weakest section ({Math.round(weak.percentile)}th percentile) and has had {weakShare}% of your focused time. {weakShare! < 30 ? 'That’s worth rebalancing.' : 'The split matches the need.'}
          </p>
        )}
      </section>

      <section className="card">
        <div className="card-title"><span className="ico-bubble" style={colorVar('var(--qa)')}><I.Chart size={20} /></span>Last {N} days</div>
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 16 }} role="img" aria-label={`Focus minutes per day, last ${N} days`}>
          <line x1={0} x2={W} y1={H - B + 1} y2={H - B + 1} stroke="var(--line)" strokeWidth={2} />
          <line x1={0} x2={W} y1={H - B - ((H - B - 6) * st.minDayMinutes) / maxM} y2={H - B - ((H - B - 6) * st.minDayMinutes) / maxM} stroke="var(--primary)" strokeOpacity={0.45} strokeWidth={1.8} strokeDasharray="5 5" />
          {mins.map((m, i) => {
            const h = Math.max(6, ((H - B - 6) * m) / maxM);
            const ok = m >= st.minDayMinutes;
            return (
              <g key={i}>
                <rect x={i * (bw + gap)} y={H - B - h} width={bw} height={h} rx={6} fill={ok ? 'var(--qa)' : m > 0 ? 'color-mix(in srgb, var(--qa) 45%, var(--track))' : 'color-mix(in srgb, var(--ink) 10%, transparent)'} />
                {(N === 7 || i % 2 === 1 || i === N - 1) && <text className="axis" x={i * (bw + gap) + bw / 2} y={H - 4} textAnchor="middle">{fromKey(days[i]).getDate()}</text>}
              </g>
            );
          })}
        </svg>
        <p className="small muted" style={{ fontWeight: 700, marginTop: 6 }}>{mins.filter(m => m > 0).length < 3 ? 'Log a few sessions and your days fill in here. ' : ''}Dashed line: your {st.minDayMinutes}-minute minimum day.</p>
      </section>

      {reflections.length > 0 && (
        <section className="card">
          <h3 className="card-title" style={{ marginBottom: 14 }}>Recent reflections</h3>
          {reflections.map(r => (
            <div key={r.id} className="task" style={{ alignItems: 'flex-start' }}>
              <span className="ico-bubble" style={colorVar(r.mood >= 4 ? 'var(--good)' : r.mood <= 2 ? 'var(--bad)' : 'var(--gold)')}><I.Heart size={18} /></span>
              <div style={{ flex: 1 }}>
                <div className="t" style={{ fontSize: 16 }}>{fromKey(r.dateKey).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {MOODS[r.mood - 1]}</div>
                <div className="s" style={{ fontWeight: 600, lineHeight: 1.4 }}>{r.skipped ? `Skipped: ${r.skipped}${r.why ? ` — ${r.why}` : ''}` : r.did}</div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
