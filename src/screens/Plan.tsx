import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useUi } from '../ui-context';
import {
  addDays, daysLeft, goalDeadline, weeklyPlan, dayTasks, fmtNum, fromKey, goalDone, goalsOf, neededPerDay, pace, taskRatio, weekDays, weekProgress, weekStart, weekTasks
} from '../logic';
import { Slant, colorVar, sectionColor, SectionTag } from '../components/ui';
import { I } from '../components/icons';
import { TaskRow } from '../components/TaskRow';
import { GoalSheet, type GoalDraft } from './GoalSheet';

type Seg = 'totals' | 'week' | 'day';
const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const fmtDay = (k: string, o: Intl.DateTimeFormatOptions) => fromKey(k).toLocaleDateString('en-IN', o);

export function Plan() {
  const { state, today, setWeeklyReward, claimReward, addTask } = useStore();
  const ui = useUi();
  const st = state.settings;
  const [seg, setSeg] = useState<Seg>('totals');
  const [goalDraft, setGoalDraft] = useState<GoalDraft | null>(null);
  const [weekKey, setWeekKey] = useState(weekStart(today));
  const [selDay, setSelDay] = useState(today);
  const start = st.startDate || today;
  const left = daysLeft(st.examDate, today);
  const wp = weekProgress(start, st.examDate, today);
  const pc = pace(state, start, today);
  const goals = goalsOf(state);

  useEffect(() => { setSelDay(d => (weekStart(d) === weekKey ? d : weekKey === weekStart(today) ? today : weekKey)); }, [weekKey, today]);

  const firstWeek = weekStart(start);
  const lastWeek = weekStart(st.examDate);
  const gap = Math.round(pc.gap * 100);
  const paceText = pc.timeRatio < 0.03 ? 'Just started' : gap >= 3 ? `${gap}% ahead` : gap <= -3 ? `${Math.abs(gap)}% behind` : 'On pace';
  const paceKind = gap >= 3 ? 'good' : gap <= -3 ? 'bad' : 'soft';

  /* week tab */
  const wTasks = weekTasks(state, weekKey);
  /* one weekly goal per total goal that is still unfinished and has none this week, sized to finish by its deadline */
  const suggestions = goals.flatMap(g => {
    if (wTasks.some(t => t.goalId === g.id)) return [];
    const p = weeklyPlan(state, g, weekKey, today);
    if (!p || p.amount <= 0) return [];
    return [{ scope: 'week' as const, key: weekKey, title: g.label, goalId: g.id, section: g.section, target: p.amount, unit: g.unit }];
  });
  const wRatio = wTasks.length ? wTasks.reduce((a, t) => a + taskRatio(state, t), 0) / wTasks.length : 0;
  const reward = state.rewards.find(r => !r.deleted && r.weekKey === weekKey);
  const [rewardText, setRewardText] = useState('');
  useEffect(() => setRewardText(reward?.title ?? ''), [reward?.title, weekKey]);
  const canClaim = wTasks.length > 0 && !!reward?.title && !reward.claimedAt && wRatio * 100 >= st.rewardThreshold;

  /* day tab */
  const dKey = selDay;
  const dTasks = dayTasks(state, dKey);
  const prev = dayTasks(state, addDays(dKey, -1));

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="eyebrow">{left} days to CAT</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Plan</h1>
        </div>
        <button className="round-btn" aria-label="Menu" onClick={ui.openMenu}><I.Menu /></button>
      </header>

      <section className="card wash">
        <div className="row between">
          <div className="caps">CAT · {fmtDay(st.examDate, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <span className={`pill ${paceKind}`} style={{ fontSize: 12, height: 32, padding: '0 14px' }}>{paceText}</span>
        </div>
        <div className="row" style={{ alignItems: 'flex-end', gap: 10, margin: '14px 0 4px' }}>
          <span className="num num-xl" style={{ fontSize: 104 }}>{left}</span>
          <span className="unit" style={{ fontSize: 34, paddingBottom: 6 }}>days</span>
        </div>
        <div className="divider" style={{ margin: '14px 0' }} />
        <div className="row" style={{ alignItems: 'baseline', gap: 12 }}>
          <span className="caps">Target</span>
          <span className="num num-m" style={{ fontSize: 44 }}>{st.targetPercentile}</span>
          <span className="unit" style={{ fontSize: 22 }}>%ile</span>
        </div>
        <div style={{ margin: '18px 0 10px' }}><Slant ratio={wp.current / wp.total} count={wp.total} /></div>
        <div className="row between caps" style={{ fontSize: 13 }}><span>Week {wp.current}</span><span>of {wp.total}</span></div>
      </section>

      <div className="seg" role="tablist">
        {(['totals', 'week', 'day'] as Seg[]).map(s => (
          <button key={s} role="tab" aria-selected={seg === s} className={seg === s ? 'on' : ''} onClick={() => setSeg(s)}>{s === 'totals' ? 'Totals' : s === 'week' ? 'Weekly' : 'Daily'}</button>
        ))}
      </div>

      {seg === 'totals' && (
        <>
          {goals.length === 0 && (
            <section className="card"><div className="empty"><h3 className="h3">No total goals yet</h3><p className="hint">Add the big numbers you want to reach by exam day.</p></div></section>
          )}
          {goals.map(g => {
            const done = goalDone(state, g.id);
            const ratio = Math.min(1, done / g.total);
            const need = neededPerDay(g, done, today, st.examDate);
            return (
              <section key={g.id} className="card" style={colorVar(sectionColor(g.section))}>
                <div className="row between">
                  {g.fromMocks ? <span className="tag" style={colorVar('var(--primary)')}><I.Paper size={16} />Mocks</span> : <SectionTag s={g.section} />}
                  <button className="mini-btn plain" aria-label={`Edit ${g.label}`} onClick={() => setGoalDraft({ goal: g })}><I.Pencil size={18} /></button>
                </div>
                <h3 className="h3" style={{ margin: '16px 0 8px' }}>{g.label}</h3>
                <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
                  <span className="num num-l" style={{ color: g.fromMocks ? 'var(--primary)' : sectionColor(g.section) }}>{fmtNum(done)}</span>
                  <span className="unit" style={{ fontSize: 22 }}>/ {fmtNum(g.total)} {g.unit}</span>
                </div>
                <div style={{ margin: '20px 0 14px' }}><Slant ratio={ratio} count={10} color={g.fromMocks ? 'var(--primary)' : sectionColor(g.section)} /></div>
                <div className="row between small" style={{ fontWeight: 700 }}>
                  <span className="muted">{Math.round(ratio * 100)}% done</span>
                  <span style={{ color: ratio >= 1 ? 'var(--good)' : 'var(--ink-2)' }}>{ratio >= 1 ? 'Complete' : `Needs ${fmtNum(Math.ceil(need * 10) / 10)} / day`}</span>
                </div>
                <div className="small muted" style={{ marginTop: 8, fontWeight: 700 }}>{(g.finishBefore ?? 0) > 0 ? `Finish by ${fmtDay(goalDeadline(g, st.examDate), { day: 'numeric', month: 'short' })} · ${g.finishBefore} days before exam` : 'Finish by exam day'}</div>
              </section>
            );
          })}
          <button className="btn ghost" onClick={() => setGoalDraft({})}><I.Plus size={22} /> Add total goal</button>
        </>
      )}

      {seg === 'week' && (
        <>
          <div className="row between">
            <button className="round-btn" style={{ width: 48, height: 48 }} aria-label="Previous week" disabled={weekKey <= firstWeek} onClick={() => setWeekKey(addDays(weekKey, -7))}><I.ChevronR style={{ transform: 'rotate(180deg)' }} /></button>
            <div style={{ textAlign: 'center' }}>
              <div className="h3">{fmtDay(weekKey, { day: 'numeric', month: 'short' })} – {fmtDay(addDays(weekKey, 6), { day: 'numeric', month: 'short' })}</div>
              <div className="caps" style={{ fontSize: 12, marginTop: 4 }}>Week {Math.round((fromKey(weekKey).getTime() - fromKey(firstWeek).getTime()) / 6048e5) + 1}{weekKey === weekStart(today) ? ' · this week' : ''}</div>
            </div>
            <button className="round-btn" style={{ width: 48, height: 48 }} aria-label="Next week" disabled={weekKey >= lastWeek} onClick={() => setWeekKey(addDays(weekKey, 7))}><I.ChevronR /></button>
          </div>

          <section className="card">
            <div className="row between" style={{ marginBottom: 14 }}>
              <h3 className="card-title">Weekly goals</h3>
              <button className="mini-btn" aria-label="Add weekly goal" onClick={() => ui.openTask({ scope: 'week', key: weekKey })}><I.Plus size={20} /></button>
            </div>
            {wTasks.length === 0 ? (
              <div className="empty" style={{ padding: '6px 0 4px' }}>
                <p className="hint">Set 2–4 targets for the week. Daily work on a linked total feeds them automatically.</p>
                <button className="btn sm" onClick={() => ui.openTask({ scope: 'week', key: weekKey })}><I.Plus size={20} /> Add weekly goal</button>
              </div>
            ) : wTasks.map(t => <TaskRow key={t.id} task={t} onEdit={task => ui.openTask({ scope: 'week', key: weekKey, task })} />)}
            {suggestions.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <button className="btn ghost" onClick={() => { suggestions.forEach(x => addTask(x)); }}>
                  <I.Bolt size={20} /> Suggest this week’s goals ({suggestions.length})
                </button>
                <p className="hint" style={{ marginTop: 8 }}>{suggestions.map(x => `${fmtNum(x.target)} ${x.unit}`).join(' · ')} — paced so each total finishes by its own deadline. Edit any after adding.</p>
              </div>
            )}
          </section>

          <section className="card tint-gold">
            <div className="card-title"><span className="ico-bubble" style={colorVar('var(--gold)')}><I.Gift size={22} /></span>Weekly reward</div>
            <div className="field" style={{ marginTop: 16 }}>
              <input className="input" aria-label="Weekly reward" placeholder="e.g. Saturday night out, one episode, biryani" value={rewardText} onChange={e => setRewardText(e.target.value)} onBlur={() => rewardText.trim() !== (reward?.title ?? '') && setWeeklyReward(weekKey, rewardText.trim())} disabled={!!reward?.claimedAt} />
            </div>
            <div style={{ margin: '16px 0 10px' }}><Slant ratio={wRatio} count={10} color="var(--gold)" thin /></div>
            <div className="row between small" style={{ fontWeight: 700, marginBottom: 14 }}>
              <span className="muted">{Math.round(wRatio * 100)}% of goals</span>
              <span className="muted">Unlocks at {st.rewardThreshold}%</span>
            </div>
            {reward?.claimedAt ? (
              <div className="pill good" style={{ width: '100%', justifyContent: 'center', height: 52 }}><I.Check size={18} /> Claimed — enjoy it</div>
            ) : (
              <button className="btn" disabled={!canClaim} onClick={() => claimReward(weekKey)}><I.Gift size={22} /> {canClaim ? 'Claim reward' : reward?.title ? 'Keep going' : 'Set a reward first'}</button>
            )}
          </section>
        </>
      )}

      {seg === 'day' && (
        <>
          <section className="card week-strip" style={{ padding: '14px 8px' }}>
            {weekDays(dKey).map((k, i) => (
              <button key={k} className={`day ${k === dKey ? 'sel' : ''}`} onClick={() => setSelDay(k)} disabled={k > st.examDate} style={{ opacity: k > st.examDate ? 0.35 : 1 }}>
                <span className="letter" style={{ color: k === today ? 'var(--primary)' : undefined }}>{WD[i]}</span>
                <span className="num num-s" style={{ fontSize: 22 }}>{fromKey(k).getDate()}</span>
                <span className="dot" style={{ margin: 0, width: 9, height: 9, background: dayTasks(state, k).length ? 'var(--primary)' : 'color-mix(in srgb, var(--ink) 18%, transparent)', boxShadow: k === today ? '0 0 0 3px var(--primary-soft)' : undefined }} />
              </button>
            ))}
          </section>
          <section className="card">
            <div className="row between" style={{ marginBottom: 14 }}>
              <h3 className="card-title">{dKey === today ? 'Today' : fmtDay(dKey, { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
              <button className="mini-btn" aria-label="Add goal" onClick={() => ui.openTask({ scope: 'day', key: dKey })}><I.Plus size={20} /></button>
            </div>
            {dTasks.length === 0 ? (
              <div className="empty" style={{ padding: '6px 0 4px' }}>
                <p className="hint">Nothing planned for this day.</p>
                <button className="btn sm" onClick={() => ui.openTask({ scope: 'day', key: dKey })}><I.Plus size={20} /> Add goal</button>
                {prev.length > 0 && <button className="btn-link" onClick={() => prev.forEach(t => addTask({ scope: 'day', key: dKey, title: t.title, goalId: t.goalId, section: t.section, target: t.target, unit: t.unit }))}>Copy the previous day’s {prev.length} goals</button>}
              </div>
            ) : dTasks.map(t => <TaskRow key={t.id} task={t} onEdit={task => ui.openTask({ scope: 'day', key: dKey, task })} />)}
          </section>
        </>
      )}

      <GoalSheet draft={goalDraft} onClose={() => setGoalDraft(null)} />
    </div>
  );
}
