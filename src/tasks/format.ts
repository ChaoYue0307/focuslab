import type { MetricDef } from './registry';

export function fmtMetric(def: MetricDef, v: number, lang: 'zh' | 'en'): string {
  if (!Number.isFinite(v)) return '—';
  switch (def.fmt) {
    case 'ms':
      return `${Math.round(v)} ms`;
    case 'pct':
      return `${Math.round(v * 100)}%`;
    case 'num1':
      return v.toFixed(1);
    case 'num2':
      return v.toFixed(2);
    case 's':
      return lang === 'zh' ? `${v.toFixed(1)} 秒` : `${v.toFixed(1)} s`;
    default:
      return String(Math.round(v));
  }
}
