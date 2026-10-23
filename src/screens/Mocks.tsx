import { useRef, useState } from 'react';
import type { Mock, SectionScore } from '../types';
import { useStore } from '../store';
import { useUi } from '../ui-context';
import { fromKey, mocksOf, weakestSection } from '../logic';
import { XP_MOCK, XP_MOCK_ANALYSED } from '../reconcile';
import { parseMockImage } from '../parseMock';
import { Sheet, colorVar, sectionColor } from '../components/ui';
import { I } from '../components/icons';

const SERIES = [
  { k: 'overall', label: 'Overall', color: 'var(--primary)' },
  { k: 'varc', label: 'VARC', color: 'var(--varc)' },
  { k: 'dilr', label: 'DILR', color: 'var(--dilr)' },
  { k: 'qa', label: 'Quant', color: 'var(--qa)' }
] as const;
type SK = (typeof SERIES)[number]['k'];

const pct = (v: number | null) => (v == null ? '–' : String(Math.round(v * 10) / 10));
const fmtDate = (k: string) => fromKey(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function SectionBars({ m, target }: { m: Mock; target: number }) {
  return (
    <div className="stack" style={{ gap: 16 }}>
      {SERIES.map(s => {
        const v = m[s.k].percentile;
        return (
          <div key={s.k} style={colorVar(s.k === 'overall' ? 'var(--primary)' : s.color)}>
            <div className="row between small" style={{ fontWeight: 700, marginBottom: 8 }}><span>{s.label}</span><span>{pct(v)}</span></div>
            <div className="progress" style={{ position: 'relative', overflow: 'visible' }}>
              <i style={{ width: `${v ?? 0}%` }} />
              <span style={{ position: 'absolute', left: `${target}%`, top: -4, bottom: -4, width: 3, borderRadius: 2, background: 'var(--ink)', opacity: 0.55 }} />
            </div>
          </div>
        );
      })}
      <p className="small muted" style={{ fontWeight: 700 }}>The dark tick is your {target}th percentile target. The trend line appears after your second mock.</p>
    </div>
  );
}

function TrendChart({ mocks, target }: { mocks: Mock[]; target: number }) {
  const [on, setOn] = useState<Record<SK, boolean>>({ overall: true, varc: true, dilr: true, qa: true });
  const W = 340, H = 190, L = 30, R = 12, T = 12, B = 26;
  const x = (i: number) => (mocks.length === 1 ? (L + W - R) / 2 : L + ((W - L - R) * i) / (mocks.length - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / 100);
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Percentile trend across mocks">
        {[0, 25, 50, 75, 100].map(g => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeWidth={1.5} />
            <text className="axis" x={L - 8} y={y(g) + 4} textAnchor="end">{g}</text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={y(target)} y2={y(target)} stroke="var(--primary)" strokeWidth={2} strokeDasharray="5 5" />
        <text className="axis" x={W - R} y={y(target) - 6} textAnchor="end" style={{ fill: 'var(--primary)' }}>Target {target}</text>
        {SERIES.filter(s => on[s.k]).map(s => {
          const pts = mocks.map((m, i) => ({ i, v: m[s.k].percentile })).filter((p): p is { i: number; v: number } => p.v != null);
          return (
            <g key={s.k}>
              {pts.length > 1 && <polyline points={pts.map(p => `${x(p.i)},${y(p.v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={s.k === 'overall' ? 3.5 : 2.5} strokeLinecap="round" strokeLinejoin="round" />}
              {pts.map(p => <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={s.k === 'overall' ? 5.5 : 4.2} fill={s.color} stroke="var(--card)" strokeWidth={2} />)}
            </g>
          );
        })}
        {mocks.map((m, i) => <text key={m.id} className="axis" x={x(i)} y={H - 6} textAnchor="middle">#{i + 1}</text>)}
      </svg>
      <div className="chips" style={{ marginTop: 12 }}>
        {SERIES.map(s => (
          <button key={s.k} className={`chip ${on[s.k] ? 'on' : ''}`} style={{ ...colorVar(s.color), height: 38, fontSize: 14 }} onClick={() => setOn(o => ({ ...o, [s.k]: !o[s.k] }))} aria-pressed={on[s.k]}>{s.label}</button>
        ))}
      </div>
    </>
  );
}

interface Form { id?: string; name: string; dateKey: string; overall: [string, string]; varc: [string, string]; dilr: [string, string]; qa: [string, string]; notes: string; analysed: boolean }
const blank = (today: string): Form => ({ name: '', dateKey: today, overall: ['', ''], varc: ['', ''], dilr: ['', ''], qa: ['', ''], notes: '', analysed: false });
const toF = (s: SectionScore): [string, string] => [s.score == null ? '' : String(s.score), s.percentile == null ? '' : String(s.percentile)];
const fromF = (f: [string, string]): SectionScore => ({ score: f[0].trim() === '' || isNaN(Number(f[0])) ? null : Number(f[0]), percentile: f[1].trim() === '' || isNaN(Number(f[1])) ? null : Math.max(0, Math.min(100, Number(f[1]))) });

function MockSheet({ initial, onClose }: { initial: Form | 'new'; onClose: () => void }) {
  const { today, saveMock, state } = useStore();
  const [form, setForm] = useState<Form | null>(initial === 'new' ? null : initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fromImage, setFromImage] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const f = form;

  const onFile = async (fl: File | undefined) => {
    if (!fl) return;
    setBusy(true); setErr('');
    try {
      const p = await parseMockImage(fl);
      setForm({ ...blank(today), name: p.name ?? `Mock ${mocksOf(state).length + 1}`, overall: toF(p.overall), varc: toF(p.varc), dilr: toF(p.dilr), qa: toF(p.qa) });
      setFromImage(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not read the screenshot.');
    } finally { setBusy(false); }
  };

  const save = () => {
    if (!f) return;
    saveMock({ id: f.id, name: f.name.trim() || `Mock ${mocksOf(state).length + 1}`, dateKey: f.dateKey, overall: fromF(f.overall), varc: fromF(f.varc), dilr: fromF(f.dilr), qa: fromF(f.qa), notes: f.notes, analysed: f.analysed });
    onClose();
  };

  const set = (k: 'overall' | 'varc' | 'dilr' | 'qa', i: 0 | 1, v: string) => setForm(p => p && ({ ...p, [k]: i === 0 ? [v, p[k][1]] : [p[k][0], v] }));

  return (
    <Sheet open onClose={onClose} title={f?.id ? 'Edit mock' : 'Log a mock'}>
      {!f ? (
        <div className="stack" style={{ gap: 14 }}>
          <input ref={file} type="file" accept="image/*" hidden onChange={e => onFile(e.target.files?.[0])} />
          <button className="btn" disabled={busy} onClick={() => file.current?.click()}>
            <I.Camera size={24} /> {busy ? 'Reading screenshot…' : 'Upload result screenshot'}
          </button>
          <button className="btn ghost" disabled={busy} onClick={() => setForm(blank(today))}><I.Pencil size={20} /> Enter manually</button>
          {err && <p className="err" role="alert">{err}</p>}
          <p className="hint">A clear screenshot of the scorecard works best. You’ll check the numbers before anything is saved.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          {fromImage && <p className="hint" style={{ background: 'var(--gold-soft)', padding: '12px 14px', borderRadius: 16, color: 'var(--ink-2)' }}>Read from your screenshot. Compare against the original before saving, since photos of screens can misread digits.</p>}
          <div className="two">
            <div className="field"><label htmlFor="mn">Name</label><input id="mn" className="input" value={f.name} onChange={e => setForm({ ...f, name: e.target.value })} placeholder="Mock name" /></div>
            <div className="field"><label htmlFor="md">Date</label><input id="md" type="date" className="input" value={f.dateKey} onChange={e => setForm({ ...f, dateKey: e.target.value })} /></div>
          </div>
          {([['overall', 'Overall', 'var(--ink)'], ['varc', 'VARC', 'var(--varc)'], ['dilr', 'DILR', 'var(--dilr)'], ['qa', 'Quant', 'var(--qa)']] as const).map(([k, label, c]) => (
            <div key={k} className="field" style={colorVar(c)}>
              <label style={{ color: c }}>{label}</label>
              <div className="two">
                <input className="input" inputMode="decimal" aria-label={`${label} score`} placeholder="Score" value={f[k][0]} onChange={e => set(k, 0, e.target.value)} />
                <input className="input" inputMode="decimal" aria-label={`${label} percentile`} placeholder="Percentile" value={f[k][1]} onChange={e => set(k, 1, e.target.value)} />
              </div>
            </div>
          ))}
          <div className="field"><label htmlFor="mo">Notes</label><textarea id="mo" className="textarea" value={f.notes} onChange={e => setForm({ ...f, notes: e.target.value })} placeholder="What went wrong, what to fix" /></div>
          <button className="btn" onClick={save}>Save mock · +{XP_MOCK} XP</button>
        </div>
      )}
    </Sheet>
  );
}

export function Mocks() {
  const { state, saveMock, deleteMock } = useStore();
  const ui = useUi();
  const mocks = mocksOf(state);
  const latest = mocks[mocks.length - 1];
  const prev = mocks[mocks.length - 2];
  const weak = weakestSection(mocks);
  const [sheet, setSheet] = useState<Form | 'new' | null>(null);
  const delta = latest && prev && latest.overall.percentile != null && prev.overall.percentile != null ? latest.overall.percentile - prev.overall.percentile : null;
  const label = { VARC: 'VARC', DILR: 'DILR', QA: 'Quant', ALL: '' } as const;

  return (
    <div className="screen">
      <header className="header">
        <div>
          <div className="eyebrow">{mocks.length} {mocks.length === 1 ? 'mock' : 'mocks'} logged</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Mocks</h1>
        </div>
        <button className="round-btn" aria-label="Menu" onClick={ui.openMenu}><I.Menu /></button>
      </header>

      {latest ? (
        <section className="card wash">
          <div className="caps">Latest mock</div>
          <div className="h3" style={{ marginTop: 4, fontSize: 17 }}>{latest.name}</div>
          <div className="row" style={{ alignItems: 'flex-end', gap: 12, margin: '14px 0 6px' }}>
            <span className="num num-xl" style={{ fontSize: 96 }}>{pct(latest.overall.percentile)}</span>
            <span className="unit" style={{ fontSize: 28, paddingBottom: 8 }}>%ile</span>
            {delta != null && <span className={`pill ${delta >= 0 ? 'good' : 'bad'}`} style={{ marginLeft: 'auto', marginBottom: 8 }}>{delta >= 0 ? '+' : ''}{Math.round(delta * 10) / 10}</span>}
          </div>
          <p className="body">
            {weak ? `${label[weak.section]} is your lowest section at the ${pct(weak.percentile)}th percentile. ` : ''}
            {state.settings.targetPercentile - (latest.overall.percentile ?? 0) > 0 ? `${Math.round((state.settings.targetPercentile - (latest.overall.percentile ?? 0)) * 10) / 10} points to your ${state.settings.targetPercentile} target.` : 'You’re at your target.'}
          </p>
          <div className="divider" />
          {mocks.length > 1 ? <TrendChart mocks={mocks} target={state.settings.targetPercentile} /> : <SectionBars m={latest} target={state.settings.targetPercentile} />}
        </section>
      ) : (
        <section className="card wash">
          <div className="empty">
            <span className="ico-bubble lg"><I.Paper size={28} /></span>
            <h3 className="h3">Log your first mock</h3>
            <p className="hint">Upload a screenshot of your scorecard and the numbers fill in for you. The trend chart appears after your second mock.</p>
          </div>
        </section>
      )}

      <button className="btn" onClick={() => setSheet('new')}><I.Plus size={24} /> Log a mock</button>

      {[...mocks].reverse().map((m, ri) => {
        const n = mocks.length - ri;
        return (
          <section key={m.id} className="card">
            <div className="row between">
              <div style={{ minWidth: 0 }}>
                <div className="caps">Mock {n} · {fmtDate(m.dateKey)}</div>
                <h3 className="h3" style={{ marginTop: 6 }}>{m.name}</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num num-m">{pct(m.overall.percentile)}</div>
                <div className="small muted" style={{ fontWeight: 700, marginTop: 4 }}>{m.overall.score ?? '–'} marks</div>
              </div>
            </div>
            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '18px 0' }}>
              {([['varc', 'VARC', 'VARC'], ['dilr', 'DILR', 'DILR'], ['qa', 'Quant', 'QA']] as const).map(([k, l, s]) => (
                <div key={k} className="score-chip" style={colorVar(sectionColor(s))}>
                  <span className="k">{l}</span>
                  <span className="v">{pct(m[k].percentile)}</span>
                  <span className="p">{m[k].score ?? '–'} marks</span>
                </div>
              ))}
            </div>
            <button className="row between" style={{ width: '100%', padding: '14px 16px', borderRadius: 20, background: m.analysed ? 'color-mix(in srgb, var(--good) 12%, var(--card))' : 'var(--card)', boxShadow: m.analysed ? 'inset 0 0 0 1.5px color-mix(in srgb, var(--good) 35%, transparent)' : 'inset 0 0 0 1.5px var(--line), 0 6px 14px -10px rgba(30,30,90,.3)' }} onClick={() => saveMock({ ...m, analysed: !m.analysed })} aria-pressed={m.analysed}>
              <span className="row" style={{ gap: 12 }}>
                <span className={`check ${m.analysed ? 'done' : 'ring'}`}><I.Check size={20} /></span>
                <span style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Analysis done</div>
                  <div className="small" style={{ fontWeight: 700, color: 'var(--ink-2)' }}>Every question reviewed · +{XP_MOCK_ANALYSED} XP</div>
                </span>
              </span>
            </button>
            {m.notes && <p className="body" style={{ marginTop: 14, fontSize: 15 }}>{m.notes}</p>}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn-link" onClick={() => setSheet({ id: m.id, name: m.name, dateKey: m.dateKey, overall: toF(m.overall), varc: toF(m.varc), dilr: toF(m.dilr), qa: toF(m.qa), notes: m.notes, analysed: m.analysed })}>Edit</button>
              <span className="spacer" />
              <button className="btn-link" style={{ color: 'var(--bad)' }} onClick={() => { if (confirm('Delete this mock? Its XP is removed too.')) deleteMock(m.id); }}>Delete</button>
            </div>
          </section>
        );
      })}

      {sheet && <MockSheet key={sheet === 'new' ? 'new' : sheet.id} initial={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
