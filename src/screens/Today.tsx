import { useState } from 'react';
import { useStore } from '../store';
import { useUi } from '../ui-context';
import {
  addDays, dailySuggestions, dayCounted, dayRatio, dayStatus, dayTasks, daysLeft, fmtMin, fmtNum, focusMinutes, fromKey, goalDone, goalsOf, sessionsOf,
  streakOf, taskDone, taskProgress, taskRatio, weekDays, weekProgress, weekTasks, xpOnDay
} from '../logic';
import { DotArc, Ring, Slant, StackBars, colorVar, sectionColor, SectionTag, SectionIcon } from '../components/ui';
import { I } from '../components/icons';
import { TaskRow } from '../components/TaskRow';

const greet = (h: number) => (h < 5 ? 'Late night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night');
const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function Today() {
  const { state, today, logProgress, addTask } = useStore();
  const ui = useUi();
  const now = new Date();
  const hour = now.getHours();
  const d = fromKey(today);
  const st = state.settings;
  const streak = streakOf(state, today);
  const tasks = dayTasks(state, today);
  const ratio = dayRatio(state, today);
  const mins = focusMinutes(state, today);
  const counted = dayCounted(state, today);
  const doneN = tasks.filter(t => taskDone(state, t)).length;
  const next = tasks.find(t => !taskDone(state, t));
  const nextGoal = next ? goalsOf(state).find(g => g.id === next.goalId) : undefined;
  const wk = weekTasks(state, today);
  const wkRatio = wk.length ? wk.reduce((a, t) => a + taskRatio(state, t), 0) / wk.length : 0;
  const wkDone = wk.filter(t => taskDone(state, t)).length;
  const days = weekDays(today);
  const lastWeek = weekDays(addDays(today, -7));
  const hrs = (keys: string[]) => Math.round((keys.reduce((a, k) => a + focusMinutes(state, k), 0) / 60) * 10) / 10;
  const hThis = hrs(days);
  const hLast = hrs(lastWeek);
  const hMax = Math.max(hThis, hLast, 1);
  const wp = weekProgress(addDays(today, 0), st.examDate, today);
  const left = daysLeft(st.examDate, today);

  const yesterday = addDays(today, -1);
  const hasHistory = sessionsOf(state).length > 0 || state.entries.length > 0;
  const yMissed = hasHistory && !dayCounted(state, yesterday) && state.sessions.some(s => s.dateKey < yesterday);
  const lowDay = mins === 0 && !tasks.some(t => taskProgress(state, t) > 0) && (hour >= 16 || yMissed) && !!st.futureNote;
  const reflected = state.reflections.some(r => !r.deleted && r.dateKey === today);
  const showReflect = hour >= 19 && !reflected && (mins > 0 || tasks.length > 0);
  const xpToday = xpOnDay(state, today);

  const ys = dayTasks(state, yesterday);

  /* today's share of the weekly goals, offered once while the day is still empty */
  const [sugOpen, setSugOpen] = useState(() => dayTasks(state, today).length === 0);
  const sugs = sugOpen ? dailySuggestions(state, today) : [];
  const addSug = (x: (typeof sugs)[number]) => addTask({ scope: 'day', key: today, title: x.title, goalId: x.goalId, section: x.section, target: x.amount, unit: x.unit });

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="eyebrow">{d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
          <h1 className="h1" style={{ marginTop: 6 }}>{greet(hour)}{st.name ? `, ${st.name}` : ''}</h1>
        </div>
        <div className="actions">
          <button className="chip-btn" aria-label={`${streak.current} day streak`} onClick={() => ui.setTab('insights')}>
            <I.Flame size={26} /> {streak.current}
          </button>
          <button className="round-btn" aria-label="Menu" onClick={ui.openMenu}><I.Menu /></button>
        </div>
      </header>

      <DotArc ratio={ratio} curved="Day complete">
        <div className="num num-xl">{Math.round(ratio * 100)}</div>
        <div className="caps label" style={{ color: 'var(--ink)', fontSize: 17, letterSpacing: '0.22em' }}>Percent</div>
      </DotArc>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -2 }}>
        <span className="pill">
          <b>{tasks.length ? doneN : fmtMin(mins)}</b> {tasks.length ? `of ${tasks.length} goals` : `of ${st.minDayMinutes}m min`}
        </span>
      </div>

      <div className="section-head">
        <h2 className="h2">{next ? 'Up next' : tasks.length ? 'All done' : 'Plan today'}</h2>
        <span className="muted" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Week {wp.current} · {left} days to CAT</span>
      </div>

      {sugs.length > 0 && (
        <section className="card tint-gold">
          <div className="row between">
            <div className="card-title"><span className="ico-bubble" style={colorVar('var(--gold)')}><I.Sparkle size={20} /></span>Suggested for today</div>
            <button className="btn-link" onClick={() => setSugOpen(false)}>Hide</button>
          </div>
          <p className="hint" style={{ margin: '8px 0 14px' }}>Your share of this week’s goals. Add any you like, then tap a goal to change it.</p>
          {sugs.map(x => (
            <div key={x.weekTaskId} className="task" style={colorVar(sectionColor(x.section))}>
              <span className="ico-bubble"><SectionIcon s={x.section} size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="t">{fmtNum(x.amount)} {x.unit} · {x.title}</div>
                <div className="s">{x.overCap ? `Behind: ${fmtNum(x.left)} left in ${x.days} ${x.days === 1 ? 'day' : 'days'}. Consider lowering this week’s target.` : `${fmtNum(x.left)} left this week · ${x.days} ${x.days === 1 ? 'day' : 'days'} to go`}</div>
              </div>
              <button className="mini-btn" aria-label={`Add ${x.title}`} onClick={() => addSug(x)}><I.Plus size={20} /></button>
            </div>
          ))}
          {sugs.length > 1 && <button className="btn" style={{ marginTop: 16 }} onClick={() => sugs.forEach(addSug)}><I.Plus size={22} /> Add all {sugs.length}</button>}
        </section>
      )}

      {next ? (
        <section className="card wash" style={colorVar(sectionColor(next.section))}>
          <div className="row between">
            <SectionTag s={next.section} />
            <span className="caps">{tasks.length - doneN} left today</span>
          </div>
          <div className="row" style={{ alignItems: 'flex-end', gap: 10, margin: '22px 0 10px' }}>
            <span className="num num-xl" style={{ fontSize: 110 }}>{fmtNum(Math.max(0, next.target - taskProgress(state, next)))}</span>
            <span className="unit" style={{ fontSize: 34, paddingBottom: 6 }}>{next.unit}</span>
          </div>
          <p className="body">
            {next.title}.{' '}
            {nextGoal ? `Counts toward ${nextGoal.label.split(' · ')[0]}: ${fmtNum(goalDone(state, nextGoal.id))} of ${fmtNum(nextGoal.total)} done.` : 'Tap done when it’s finished.'}
          </p>
          <div className="divider" />
          <div className="two">
            <button className="btn" onClick={() => ui.openFocus({ section: next.section, taskId: next.id })}><I.Play size={22} /> Focus</button>
            {nextGoal?.fromMocks ? (
              <button className="btn ghost" onClick={() => ui.setTab('mocks')}><I.Paper size={22} /> Log mock</button>
            ) : (<button className="btn ghost" onClick={() => logProgress(next, nextGoal?.step ?? 1)}><I.Check size={22} /> {next.target > 1 ? `+${fmtNum(nextGoal?.step ?? 1)} done` : 'Done'}</button>)}
          </div>
        </section>
      ) : (
        <section className="card wash">
          {tasks.length ? (
            <div className="empty">
              <span className="ico-bubble lg" style={colorVar('var(--good)')}><I.Check size={28} /></span>
              <h3 className="h3">Everything planned is done</h3>
              <p className="hint">Add one more small thing, or close the day with a reflection.</p>
              <button className="btn sm" onClick={() => ui.openTask({ scope: 'day', key: today })}><I.Plus size={20} /> Add a goal</button>
            </div>
          ) : (
            <div className="empty">
              <span className="ico-bubble lg"><I.Target size={28} /></span>
              <h3 className="h3">Nothing planned for today</h3>
              <p className="hint">Pick two or three small goals. A smaller list is easier to start.</p>
              <button className="btn" onClick={() => ui.openTask({ scope: 'day', key: today })}><I.Plus size={22} /> Add today’s goals</button>
              {ys.length > 0 && (
                <button className="btn-link" onClick={() => ys.forEach(t => addTask({ scope: 'day', key: today, title: t.title, goalId: t.goalId, section: t.section, target: t.target, unit: t.unit }))}>
                  Copy yesterday’s {ys.length} goals
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {tasks.length > 0 && (
        <section className="card">
          <div className="row between" style={{ marginBottom: 16 }}>
            <h3 className="card-title">Today’s goals</h3>
            <button className="mini-btn" aria-label="Add goal" onClick={() => ui.openTask({ scope: 'day', key: today })}><I.Plus size={20} /></button>
          </div>
          {tasks.map(t => <TaskRow key={t.id} task={t} onEdit={task => ui.openTask({ scope: 'day', key: today, task })} />)}
        </section>
      )}

      <section className="card week-strip" aria-label="This week">
        {days.map((k, i) => {
          const s = dayStatus(state, k, today);
          const m = focusMinutes(state, k);
          const rest = streak.restUsed.includes(k);
          return (
            <div key={k} className={`day ${k === today ? 'today' : ''}`}>
              <span className="slot">
                {s === 'counted' ? <span className="bubble counted"><I.Check size={24} /></span>
                  : rest ? <span className="bubble rest"><I.Moon size={20} /></span>
                  : s === 'partial' ? <span className="bubble partial" />
                  : <span className="dot" />}
              </span>
              <span className="letter">{WD[i]}</span>
              <span className="mins">{m ? Math.round(m / 6) / 10 + 'h' : '–'}</span>
            </div>
          );
        })}
      </section>

      <div className="grid-2">
        <section className="card" style={{ ...colorVar('var(--qa)'), display: 'flex', flexDirection: 'column' }}>
          <div className="card-title"><span className="ico-bubble"><I.Target size={20} /></span>Weekly</div>
          <div style={{ margin: 'auto 0', paddingTop: 12 }}>
            {wk.length ? (
              <Ring ratio={wkRatio} size={128} stroke={16} color="var(--qa)">
                <div className="num" style={{ fontSize: 34 }}>{Math.round(wkRatio * 100)}<span style={{ fontSize: 18 }}>%</span></div>
                <div className="caps" style={{ fontSize: 11, marginTop: 6, letterSpacing: '0.1em' }}>{wkDone}/{wk.length} goals</div>
              </Ring>
            ) : (
              <div className="empty" style={{ padding: '12px 0' }}>
                <p className="hint">No weekly goals yet.</p>
                <button className="btn-link" onClick={() => ui.setTab('plan')}>Set them</button>
              </div>
            )}
          </div>
        </section>
        <section className="card" style={colorVar('var(--dilr)')}>
          <div className="card-title"><span className="ico-bubble" style={colorVar('var(--dilr)')}><I.Clock size={20} /></span>Hours</div>
          <div className="row between" style={{ marginTop: 16, alignItems: 'flex-end', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div className="num num-s" style={{ color: hLast > 0 ? 'var(--dilr)' : 'var(--muted)' }}>{hLast}<span className="unit" style={{ fontSize: 14, marginLeft: 2 }}>h</span></div>
              <div style={{ margin: '10px 0 8px' }}>{hLast > 0 ? <StackBars value={hLast} max={hMax} color="var(--dilr)" /> : <div className="progress" style={{ height: 9 }} />}</div>
              <div className="small muted" style={{ fontWeight: 700 }}>Last</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="num num-s" style={{ color: 'var(--varc)' }}>{hThis}<span className="unit" style={{ fontSize: 14, marginLeft: 2 }}>h</span></div>
              <div style={{ margin: '10px 0 8px' }}><StackBars value={hThis} max={hMax} color="var(--varc)" /></div>
              <div className="small muted" style={{ fontWeight: 700 }}>This</div>
            </div>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="row between">
          <div className="card-title"><span className="ico-bubble" style={colorVar('var(--dilr)')}><I.Clock size={20} /></span>Focus today</div>
          <span className="small muted" style={{ fontWeight: 700 }}>+{xpToday} XP</span>
        </div>
        <div className="row" style={{ gap: 22, margin: '14px 0 14px', alignItems: 'flex-end' }}>
          <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
            <span className="num num-l">{mins}</span><span className="unit" style={{ fontSize: 24 }}>min</span>
          </div>
          <div style={{ flex: 1, paddingBottom: 8 }}><Slant ratio={mins / Math.max(1, st.minDayMinutes)} count={7} color="var(--dilr)" /></div>
        </div>
        <div className="row between small" style={{ fontWeight: 700 }}>
          <span className="muted">Minimum day · {st.minDayMinutes} min</span>
          <span style={{ color: counted ? 'var(--good)' : 'var(--muted)' }}>{counted ? 'Streak secured' : `${Math.max(0, st.minDayMinutes - mins)} min to secure`}</span>
        </div>
      </section>

      {lowDay && (
        <section className="card note-card">
          <div className="caps">A note from past you</div>
          <p className="quote" style={{ marginTop: 12 }}>{st.futureNote}</p>
          <button className="btn ghost" style={{ marginTop: 18, background: 'rgba(255,255,255,.16)', color: '#fff', boxShadow: 'none', minHeight: 56 }} onClick={() => ui.openFocus()}>
            Do just {st.minDayMinutes} minutes
          </button>
        </section>
      )}

      {showReflect && (
        <section className="card tint-gold">
          <div className="row" style={{ gap: 14 }}>
            <span className="ico-bubble lg" style={colorVar('var(--gold)')}><I.Note size={26} /></span>
            <div style={{ flex: 1 }}>
              <h3 className="h3">Close the day</h3>
              <p className="hint" style={{ marginTop: 2 }}>One minute. +15 XP.</p>
            </div>
            <button className="btn sm" onClick={ui.openReflection}>Reflect</button>
          </div>
        </section>
      )}

      <button className="btn" onClick={() => ui.openFocus()}><I.Play size={24} /> Start focus session</button>
    </div>
  );
}
