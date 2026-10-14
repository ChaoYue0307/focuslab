import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { parseDay, shortDate } from '../lib/date';
import type { Lang, TrialPoint } from '../lib/types';

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(el);
    setW(Math.max(200, el.clientWidth));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export interface Series {
  id: string;
  label: string;
  color: string;
  points: { x: string; y: number }[]; // x = YYYY-MM-DD
}

const dayNum = (k: string) => Math.round(parseDay(k).getTime() / 86400000);

/** Time-series line chart: 2px lines, hairline grid, crosshair + tooltip listing every series. */
export function LineChart({
  series,
  lang,
  height = 220,
  yMin = 0,
  yMax = 100,
  yTicks = [0, 25, 50, 75, 100],
  fmt = (v: number) => String(Math.round(v)),
  area = true,
}: {
  series: Series[];
  lang: Lang;
  height?: number;
  yMin?: number;
  yMax?: number;
  yTicks?: number[];
  fmt?: (v: number) => string;
  area?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const pad = { l: 34, r: 40, t: 12, b: 26 };
  const xs = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort(), [series]);
  if (!xs.length) return null;
  const x0 = dayNum(xs[0]);
  const x1 = Math.max(x0 + 1, dayNum(xs[xs.length - 1]));
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const X = (k: string) => pad.l + ((dayNum(k) - x0) / (x1 - x0)) * iw;
  const Y = (v: number) => pad.t + ih - ((Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * ih;
  const nTicks = Math.min(xs.length, Math.max(2, Math.floor(iw / 90)));
  const tickKeys = xs.length <= nTicks ? xs : Array.from({ length: nTicks }, (_, i) => xs[Math.round((i * (xs.length - 1)) / (nTicks - 1))]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let best = xs[0];
    let bd = Infinity;
    for (const k of xs) {
      const d = Math.abs(X(k) - mx);
      if (d < bd) (bd = d), (best = k);
    }
    setHover(best);
  };

  const hx = hover ? X(hover) : 0;
  return (
    <div className="chart" ref={ref}>
      <svg height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img">
        {yTicks.map((v) => (
          <g key={v}>
            <line className={v === yMin ? 'baseline' : 'gridline'} x1={pad.l} x2={width - pad.r} y1={Y(v)} y2={Y(v)} />
            <text x={pad.l - 8} y={Y(v) + 4} textAnchor="end">
              {fmt(v)}
            </text>
          </g>
        ))}
        {tickKeys.map((k, i) => (
          <text key={k + i} x={X(k)} y={height - 6} textAnchor={i === 0 ? 'start' : i === tickKeys.length - 1 ? 'end' : 'middle'}>
            {shortDate(k, lang)}
          </text>
        ))}
        {series.map((s) => {
          const pts = [...s.points].sort((a, b) => (a.x < b.x ? -1 : 1));
          if (!pts.length) return null;
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
          const last = pts[pts.length - 1];
          return (
            <g key={s.id}>
              {area && series.length === 1 && pts.length > 1 && (
                <path d={`${d}L${X(last.x)},${Y(yMin)}L${X(pts[0].x)},${Y(yMin)}Z`} fill={s.color} opacity={0.1} />
              )}
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={X(last.x)} cy={Y(last.y)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              {series.length === 1 && (
                <text x={X(last.x) + 8} y={Y(last.y) + 4} style={{ fill: 'var(--text)', fontWeight: 650 }}>
                  {fmt(last.y)}
                </text>
              )}
            </g>
          );
        })}
        {hover && (
          <g>
            <line className="crosshair" x1={hx} x2={hx} y1={pad.t} y2={pad.t + ih} />
            {series.map((s) => {
              const p = s.points.find((q) => q.x === hover);
              return p ? <circle key={s.id} cx={hx} cy={Y(p.y)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} /> : null;
            })}
          </g>
        )}
      </svg>
      {hover && (
        <div className="tooltip" style={{ left: Math.min(Math.max(0, hx + 12), width - 150), top: 4 }}>
          <div className="tt-head">{shortDate(hover, lang)}</div>
          {series.map((s) => {
            const p = s.points.find((q) => q.x === hover);
            return (
              <div className="tt-row" key={s.id}>
                <i className="tt-key" style={{ background: s.color }} />
                <b>{p ? fmt(p.y) : '—'}</b>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Columns per day (≤24px, 4px rounded tops) with an optional goal reference line. */
export function ColumnChart({
  data,
  lang,
  height = 200,
  goal,
  fmt,
  color = 'var(--accent)',
  goalLabel,
}: {
  data: { x: string; y: number }[];
  lang: Lang;
  height?: number;
  goal?: number;
  fmt: (v: number) => string;
  color?: string;
  goalLabel?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 34, r: 8, t: 14, b: 26 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const maxV = Math.max(goal || 0, ...data.map((d) => d.y), 1);
  const step = niceStep(maxV);
  const top = Math.ceil(maxV / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const band = iw / data.length;
  const bw = Math.min(24, band * 0.62);
  const Y = (v: number) => pad.t + ih - (v / top) * ih;
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(iw / 56))));
  return (
    <div className="chart" ref={ref}>
      <svg height={height} onPointerLeave={() => setHover(null)} role="img">
        {ticks.map((v) => (
          <g key={v}>
            <line className={v === 0 ? 'baseline' : 'gridline'} x1={pad.l} x2={width - pad.r} y1={Y(v)} y2={Y(v)} />
            <text x={pad.l - 8} y={Y(v) + 4} textAnchor="end">
              {fmt(v)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + band * i + band / 2;
          const h = Math.max(0, Y(0) - Y(d.y));
          const r = Math.min(4, h);
          const x = cx - bw / 2;
          const y = Y(d.y);
          const path = h > 0 ? `M${x},${Y(0)}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${Y(0)}Z` : '';
          return (
            <g key={d.x} onPointerEnter={() => setHover(i)}>
              <rect x={pad.l + band * i} y={pad.t} width={band} height={ih} fill="transparent" />
              {path && <path d={path} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />}
              {i % every === 0 && (
                <text x={cx} y={height - 6} textAnchor="middle">
                  {shortDate(d.x, lang).replace(/^\d+月/, (m) => (data.length > 10 ? '' : m))}
                </text>
              )}
            </g>
          );
        })}
        {goal ? (
          <g>
            <line x1={pad.l} x2={width - pad.r} y1={Y(goal)} y2={Y(goal)} stroke="var(--text-2)" strokeWidth={1} opacity={0.6} />
            <text x={width - pad.r} y={Y(goal) - 5} textAnchor="end" style={{ fill: 'var(--text-2)' }}>
              {goalLabel}
            </text>
          </g>
        ) : null}
      </svg>
      {hover !== null && data[hover] && (
        <div className="tooltip" style={{ left: Math.min(width - 140, Math.max(0, pad.l + band * hover + band / 2 - 60)), top: Math.max(0, Y(data[hover].y) - 58) }}>
          <div className="tt-head">{shortDate(data[hover].x, lang)}</div>
          <div className="tt-row">
            <b>{fmt(data[hover].y)}</b>
          </div>
        </div>
      )}
    </div>
  );
}

function niceStep(max: number) {
  const raw = max / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/** Trial-by-trial reaction times for one session: dots per trial, errors in red, misses as ×, plus a rolling mean. */
export function TrialChart({ series, lang, height = 160 }: { series: TrialPoint[]; lang: Lang; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 40, r: 10, t: 14, b: 22 };
  const rts = series.filter((p) => p.rt !== null).map((p) => p.rt as number);
  if (rts.length < 4) return null;
  const sorted = [...rts].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
  const yMax = Math.ceil(Math.min(2000, Math.max(500, p95 * 1.15)) / 100) * 100;
  const yMin = Math.max(0, Math.floor((sorted[0] * 0.8) / 100) * 100);
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const X = (i: number) => pad.l + (series.length > 1 ? (i / (series.length - 1)) * iw : iw / 2);
  const Y = (v: number) => pad.t + ih - ((Math.min(yMax, Math.max(yMin, v)) - yMin) / (yMax - yMin)) * ih;
  // rolling mean over correct trials (window 7)
  const line: string[] = [];
  for (let i = 0; i < series.length; i++) {
    const win = series.slice(Math.max(0, i - 3), i + 4).filter((p) => p.ok && p.rt !== null);
    if (win.length < 3) continue;
    const m = win.reduce((a, p) => a + (p.rt as number), 0) / win.length;
    line.push(`${line.length ? 'L' : 'M'}${X(i).toFixed(1)},${Y(m).toFixed(1)}`);
  }
  const ticks = [yMin, Math.round((yMin + yMax) / 2 / 50) * 50, yMax];
  const h = hover !== null ? series[hover] : null;
  const kindLabel = (k?: TrialPoint['kind']) =>
    ({ lapse: lang === 'zh' ? '走神失误' : 'lapse', commission: lang === 'zh' ? '错按' : 'commission', omission: lang === 'zh' ? '漏按' : 'omission', timeout: lang === 'zh' ? '超时' : 'timeout', false: lang === 'zh' ? '抢跑' : 'false start' })[k as string] ?? '';
  return (
    <div className="chart" ref={ref}>
      <svg
        height={height}
        role="img"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left - pad.l) / iw) * (series.length - 1));
          setHover(i >= 0 && i < series.length ? i : null);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((v, i) => (
          <g key={i}>
            <line className={i === 0 ? 'baseline' : 'gridline'} x1={pad.l} x2={width - pad.r} y1={Y(v)} y2={Y(v)} />
            <text x={pad.l - 6} y={Y(v) + 4} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        <text x={pad.l} y={height - 5}>
          {lang === 'zh' ? '开始' : 'start'}
        </text>
        <text x={width - pad.r} y={height - 5} textAnchor="end">
          {lang === 'zh' ? '结束' : 'end'}
        </text>
        {series.map((p, i) =>
          p.rt === null ? (
            <path key={i} d={`M${X(i) - 3.5},${pad.t - 3.5}l7,7m0,-7l-7,7`} stroke="var(--bad)" strokeWidth={1.8} strokeLinecap="round" />
          ) : (
            <circle key={i} cx={X(i)} cy={Y(p.rt)} r={p.ok ? 2.6 : 3.6} fill={p.ok ? 'var(--tile, var(--accent))' : 'var(--bad)'} opacity={p.ok ? 0.55 : 0.95} />
          ),
        )}
        {line.length > 1 && <path d={line.join('')} fill="none" stroke="var(--text)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.75} />}
        {hover !== null && <line className="crosshair" x1={X(hover)} x2={X(hover)} y1={pad.t} y2={pad.t + ih} />}
      </svg>
      {h && hover !== null && (
        <div className="tooltip" style={{ left: Math.min(Math.max(0, X(hover) + 10), width - 140), top: 0 }}>
          <div className="tt-head">{lang === 'zh' ? `第 ${hover + 1} 次` : `Trial ${hover + 1}`}</div>
          <div className="tt-row">
            <b>{h.rt === null ? '—' : `${Math.round(h.rt)} ms`}</b>
            <span>{h.ok ? (lang === 'zh' ? '正确' : 'correct') : kindLabel(h.kind) || (lang === 'zh' ? '错误' : 'error')}</span>
          </div>
        </div>
      )}
      <div className="legend" style={{ marginTop: 6 }}>
        <span>
          <i className="box" style={{ background: 'var(--tile, var(--accent))', opacity: 0.6, borderRadius: '50%' }} />
          {lang === 'zh' ? '正确' : 'Correct'}
        </span>
        <span>
          <i className="box" style={{ background: 'var(--bad)', borderRadius: '50%' }} />
          {lang === 'zh' ? '错误' : 'Error'}
        </span>
        <span>
          <span style={{ color: 'var(--bad)', fontWeight: 700 }}>×</span>
          {lang === 'zh' ? '漏按 / 超时 / 抢跑' : 'Miss / timeout / false start'}
        </span>
        <span>
          <i style={{ background: 'var(--text)', opacity: 0.75 }} />
          {lang === 'zh' ? '滑动平均' : 'Rolling mean'}
        </span>
      </div>
    </div>
  );
}

/** First half vs second half of a session: vigilance decrement in ms and extra errors. */
export function sessionDrift(series: TrialPoint[]) {
  const half = Math.floor(series.length / 2);
  const a = series.slice(0, half);
  const b = series.slice(half);
  const rt = (xs: TrialPoint[]) => {
    const v = xs.filter((p) => p.ok && p.rt !== null).map((p) => p.rt as number);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN;
  };
  return { rtDelta: rt(b) - rt(a), errDelta: b.filter((p) => !p.ok).length - a.filter((p) => !p.ok).length };
}

/** Tiny trend line for cards. */
export function Sparkline({ values, width = 96, height = 28, color = 'var(--accent)' }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return <svg width={width} height={height} />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const X = (i: number) => 3 + (i / (values.length - 1)) * (width - 6);
  const Y = (v: number) => 3 + (height - 6) * (1 - (v - lo) / span);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  return (
    <svg width={width} height={height} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <circle cx={X(values.length - 1)} cy={Y(values[values.length - 1])} r={3} fill={color} />
    </svg>
  );
}

/** Calendar heatmap (weeks × weekdays), one-hue sequential scale. Shows as many weeks as fit. */
export function Heatmap({ end, value, lang, fmt }: { end: string; value: (d: string) => number; lang: Lang; fmt: (v: number) => string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<{ d: string; x: number; y: number } | null>(null);
  const CELL = 13;
  const GAP = 3;
  const weeks = Math.max(8, Math.min(53, Math.floor((width - 28 + GAP) / (CELL + GAP))));
  // Align columns to Monday-start weeks ending with the week containing `end`.
  const endDate = parseDay(end);
  const endDow = (endDate.getDay() + 6) % 7;
  const start = new Date(endDate);
  start.setDate(start.getDate() - endDow - (weeks - 1) * 7);
  const cells: string[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  const level = (v: number) => (v <= 0 ? 0 : v < 15 ? 1 : v < 30 ? 2 : v < 60 ? 3 : 4);
  const dayLabels = lang === 'zh' ? ['一', '', '三', '', '五', '', ''] : ['Mon', '', 'Wed', '', 'Fri', '', ''];
  return (
    <div className="chart" ref={ref}>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ display: 'grid', gridTemplateRows: `repeat(7, ${CELL}px)`, gap: GAP, width: 22 }}>
          {dayLabels.map((l, i) => (
            <span key={i} className="tiny muted" style={{ lineHeight: `${CELL}px`, fontSize: 10 }}>
              {l}
            </span>
          ))}
        </div>
        <div className="heat" style={{ gridTemplateRows: `repeat(7, ${CELL}px)`, gridAutoColumns: `${CELL}px`, gap: GAP }} onPointerLeave={() => setTip(null)}>
          {cells.map((d) =>
            d > end ? (
              <div key={d} style={{ background: 'transparent' }} />
            ) : (
              <div
                key={d}
                style={{ background: `var(--heat${level(value(d))})` }}
                onPointerEnter={(e) => {
                  const r = (e.target as HTMLElement).getBoundingClientRect();
                  const pr = ref.current!.getBoundingClientRect();
                  setTip({ d, x: r.left - pr.left, y: r.top - pr.top });
                }}
              />
            ),
          )}
        </div>
      </div>
      {tip && (
        <div className="tooltip" style={{ left: Math.max(0, Math.min(tip.x - 50, width - 140)), top: tip.y - 54 }}>
          <div className="tt-head">{shortDate(tip.d, lang)}</div>
          <div className="tt-row">
            <b>{fmt(value(tip.d))}</b>
          </div>
        </div>
      )}
      <div className="row small muted" style={{ justifyContent: 'flex-end', marginTop: 8, gap: 4 }}>
        {lang === 'zh' ? '少' : 'Less'}
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} style={{ width: 11, height: 11, borderRadius: 3, background: `var(--heat${l})`, display: 'inline-block' }} />
        ))}
        {lang === 'zh' ? '多' : 'More'}
      </div>
    </div>
  );
}

/** A card whose chart can be swapped for a plain table (accessibility + exact values). */
export function ChartCard({ title, sub, right, table, children }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; table?: ReactNode; children: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>{title}</h3>
          {sub && <div className="card-sub">{sub}</div>}
        </div>
        <div className="row">
          {right}
          {table && (
            <button className={`icon-btn`} aria-pressed={asTable} title="Table" onClick={() => setAsTable(!asTable)} type="button" style={asTable ? { background: 'var(--surface-2)', color: 'var(--text)' } : undefined}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {asTable && table ? <div className="table-scroll">{table}</div> : children}
    </div>
  );
}
