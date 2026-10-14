import { localeOf } from './langs';
import type { Lang } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(d: Date | number = new Date()): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
}

/** Inclusive list of day keys from `from` to `to`. */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

// Locale-aware formatting via Intl, so every language gets native units and date order.
const nf = new Map<string, Intl.NumberFormat>();
function unitFormat(locale: string, unit: 'minute' | 'hour' | 'second', digits = 0) {
  const k = `${locale}|${unit}|${digits}`;
  let f = nf.get(k);
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short', minimumFractionDigits: digits, maximumFractionDigits: digits });
    nf.set(k, f);
  }
  return f;
}

export function fmtMinutes(ms: number, lang: Lang): string {
  const locale = localeOf(lang);
  const min = Math.round(ms / 60000);
  if (min < 60) return unitFormat(locale, 'minute').format(min);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${unitFormat(locale, 'hour').format(h)} ${unitFormat(locale, 'minute').format(m)}` : unitFormat(locale, 'hour').format(h);
}

export const fmtSeconds = (s: number, lang: Lang, digits = 1) => unitFormat(localeOf(lang), 'second', digits).format(s);

export function shortDate(key: string, lang: Lang): string {
  return parseDay(key).toLocaleDateString(localeOf(lang), { month: 'short', day: 'numeric' });
}

/** Short weekday name for a Monday-first index (0 = Monday). */
export function weekdayShort(i: number, lang: Lang): string {
  const d = new Date(2024, 0, 1 + i); // 2024-01-01 was a Monday
  return d.toLocaleDateString(localeOf(lang), { weekday: 'short' });
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
