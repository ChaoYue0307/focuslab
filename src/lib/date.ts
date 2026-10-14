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

export function fmtMinutes(ms: number, lang: 'zh' | 'en'): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return lang === 'zh' ? `${min} 分钟` : `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (lang === 'zh') return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function shortDate(key: string, lang: 'zh' | 'en'): string {
  const d = parseDay(key);
  if (lang === 'zh') return `${d.getMonth() + 1}月${d.getDate()}日`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
