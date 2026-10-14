import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Modal({ onClose, children, width }: { onClose?: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!onClose) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" style={width ? { width: `min(${width}px, 100%)` } : undefined}>
        {children}
      </div>
    </div>
  );
}

export function Segmented<V extends string | number>({ value, options, onChange, label }: { value: V; options: { value: V; label: ReactNode }[]; onChange: (v: V) => void; label?: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)} type="button">
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />;
}

export function ScoreRing({ value, size = 150, stroke = 12, color = 'var(--accent)', children }: { value: number | null; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="index-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-soft)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div className="val">{children}</div>
    </div>
  );
}

let toastSetter: ((s: string | null) => void) | null = null;
export function toast(msg: string) {
  toastSetter?.(msg);
}
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    toastSetter = setMsg;
    return () => {
      toastSetter = null;
    };
  }, []);
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(id);
  }, [msg]);
  return msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null;
}

export function Delta({ value, better, fmt, suffix = '' }: { value: number; better: 'low' | 'high' | 'none'; fmt?: (v: number) => string; suffix?: string }) {
  if (!Number.isFinite(value) || Math.abs(value) < 1e-9) return <span className="delta flat">±0{suffix}</span>;
  const good = better === 'none' ? null : better === 'high' ? value > 0 : value < 0;
  const cls = good === null ? 'flat' : good ? 'up' : 'down';
  const txt = fmt ? fmt(Math.abs(value)) : String(Math.abs(Math.round(value)));
  return (
    <span className={`delta ${cls}`}>
      {value > 0 ? '▲' : '▼'} {txt}
      {suffix}
    </span>
  );
}

export function Callout({ icon = 'info', tone, children }: { icon?: string; tone?: 'warn' | 'good'; children: ReactNode }) {
  return (
    <div className={`callout ${tone || ''}`}>
      <Icon name={icon} size={18} />
      <div>{children}</div>
    </div>
  );
}
