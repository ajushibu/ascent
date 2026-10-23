import { useEffect, useId, type CSSProperties, type ReactNode } from 'react';
import type { Section } from '../types';
import { SECTION_LABEL } from '../types';
import { I, SECTION_ICON } from './icons';
import { useStore } from '../store';

export const sectionColor = (s: Section): string => ({ VARC: 'var(--varc)', DILR: 'var(--dilr)', QA: 'var(--qa)', ALL: 'var(--all)' }[s]);
export const colorVar = (c: string): CSSProperties => ({ ['--c' as string]: c });

export function SectionIcon({ s, size = 20 }: { s: Section; size?: number }) {
  const Ic = SECTION_ICON[s];
  return <Ic size={size} />;
}

/** Horseshoe of dots — the signature gauge. Fills left → right. */
export function DotArc({
  ratio, color = 'var(--primary)', curved, children, rings = [{ r: 168, n: 34, d: 12.5 }, { r: 140, n: 29, d: 11.5 }, { r: 112, n: 24, d: 10.5 }]
}: { ratio: number; color?: string; curved?: string; children?: ReactNode; rings?: { r: number; n: number; d: number }[] }) {
  const id = useId();
  const cx = 180, cy = 205, start = 200, span = 220;
  const clamp = Math.max(0, Math.min(1, ratio));
  return (
    <div className="arc-wrap" style={colorVar(color)}>
      <svg viewBox="0 0 360 280" role="img" aria-label={`${Math.round(clamp * 100)} percent`}>
        {rings.map((ring, ri) => {
          const filled = clamp <= 0 ? 0 : Math.max(1, Math.round(clamp * ring.n));
          return Array.from({ length: ring.n }, (_, k) => {
            const a = ((start - (span * k) / (ring.n - 1)) * Math.PI) / 180;
            return <circle key={`${ri}-${k}`} cx={cx + ring.r * Math.cos(a)} cy={cy - ring.r * Math.sin(a)} r={ring.d / 2} className={k < filled ? 'dot-on' : 'dot-off'} />;
          });
        })}
        {curved && (
          <>
            <path id={id} d="M 100 205 A 80 80 0 0 1 260 205" fill="none" />
            <text className="arc-curve"><textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{curved}</textPath></text>
          </>
        )}
      </svg>
      <div className="arc-center">{children}</div>
    </div>
  );
}

/** Donut gauge with rounded ends. */
export function Ring({ ratio, size = 170, stroke = 20, color = 'var(--primary)', children }: { ratio: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, ratio));
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        {v > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} style={{ transition: 'stroke-dasharray .6s cubic-bezier(.2,.8,.2,1)' }} />}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  );
}

export function Slant({ ratio, count = 8, color = 'var(--primary)', thin }: { ratio: number; count?: number; color?: string; thin?: boolean }) {
  const on = Math.round(Math.max(0, Math.min(1, ratio)) * count);
  return (
    <div className={`slant ${thin ? 'thin' : ''}`} style={colorVar(color)}>
      {Array.from({ length: count }, (_, i) => <i key={i} className={i < on ? 'on' : ''} />)}
    </div>
  );
}

export function StackBars({ value, max, slots = 10, color }: { value: number; max: number; slots?: number; color: string }) {
  const on = max <= 0 ? 0 : Math.min(slots, Math.round((value / max) * slots));
  return (
    <div className="stack-bars" style={colorVar(color)}>
      {Array.from({ length: slots }, (_, i) => <i key={i} className={i < on ? 'on' : ''} />)}
    </div>
  );
}

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        {title && <h2 className="h2" style={{ marginBottom: 16 }}>{title}</h2>}
        {children}
      </div>
    </>
  );
}

export function Toasts() {
  const { toast, dismissToast } = useStore();
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(dismissToast, 2800);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);
  if (!toast) return null;
  return (
    <div className="toast" key={toast.id} role="status">
      <span className="bolt"><I.Bolt size={18} /></span>
      <span>{toast.title}</span>
      {toast.xp ? <span className="xp">+{toast.xp} XP</span> : null}
    </div>
  );
}

export function SectionTag({ s }: { s: Section }) {
  return <span className="tag" style={colorVar(sectionColor(s))}><SectionIcon s={s} size={16} />{SECTION_LABEL[s]}</span>;
}

export function Stepper({ value, onChange, min = 0, max = 9999, step = 1 }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  const set = (n: number) => onChange(Math.max(min, Math.min(max, Math.round(n * 100) / 100)));
  return (
    <div className="stepper">
      <button type="button" aria-label="decrease" onClick={() => set(value - step)}><I.Minus /></button>
      <b>{value}</b>
      <button type="button" aria-label="increase" onClick={() => set(value + step)}><I.Plus /></button>
    </div>
  );
}
