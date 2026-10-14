import { DISTRACTION_KINDS, EXPERIMENTS, TAGS, tagLabel, templateOf } from '../content/habits';
import { dayPerformance, domainScores, firstActivityDay, focusIndex, insights, placeholderInsight, type Insight } from './analytics';
import { addDays, dayKey, daysBetween } from './date';
import { mean, sd, shuffle } from './stats';
import type { AppData, CheckIn, Experiment, FocusSession } from './types';

// ---------------- Day-level outcome metrics ----------------
export interface DayMetrics {
  perf?: number; // mean within-task z-score of training that day
  rating?: number; // mean self-rated focus (1–5)
  distrPerHour?: number; // logged distractions per focused hour
  onTask?: number; // share of answered probes that were on-task
}

export function onTaskRate(sessions: FocusSession[]): { rate: number; n: number } | null {
  let on = 0, n = 0;
  for (const s of sessions)
    for (const p of s.probes || []) {
      if (p.state === 'missed') continue;
      n++;
      if (p.state === 'on') on++;
    }
  return n ? { rate: on / n, n } : null;
}

export function distractionRate(sessions: FocusSession[]): number | null {
  const ms = sessions.reduce((a, s) => a + s.focusMs, 0);
  if (ms < 10 * 60000) return null;
  return (sessions.reduce((a, s) => a + s.distractions.length, 0) / ms) * 3600000;
}

export function dayMetrics(data: AppData): Map<string, DayMetrics> {
  const out = new Map<string, DayMetrics>();
  const get = (d: string) => {
    let m = out.get(d);
    if (!m) out.set(d, (m = {}));
    return m;
  };
  dayPerformance(data.results).forEach((v, d) => (get(d).perf = v));
  const byDay = new Map<string, FocusSession[]>();
  data.sessions.forEach((s) => byDay.set(s.date, [...(byDay.get(s.date) || []), s]));
  byDay.forEach((ss, d) => {
    const rated = ss.filter((s) => s.rating);
    if (rated.length) get(d).rating = mean(rated.map((s) => s.rating!));
    const dr = distractionRate(ss);
    if (dr !== null) get(d).distrPerHour = dr;
    const ot = onTaskRate(ss);
    if (ot && ot.n >= 2) get(d).onTask = ot.rate;
  });
  return out;
}

// ---------------- Two-group comparison ----------------
export type Verdict = 'insufficient' | 'none' | 'suggestive' | 'clear';
export interface Effect {
  key: keyof DayMetrics;
  better: 'high' | 'low';
  on: number[];
  off: number[];
  diff: number; // mean(on) - mean(off)
  d: number; // Cohen's d
  t: number; // Welch t
  verdict: Verdict;
  helps: boolean | null; // does ON look better?
}

export function compare(on: number[], off: number[], better: 'high' | 'low', key: keyof DayMetrics): Effect {
  const base = { key, better, on, off };
  if (on.length < 3 || off.length < 3) return { ...base, diff: NaN, d: NaN, t: NaN, verdict: 'insufficient', helps: null };
  const m1 = mean(on), m2 = mean(off);
  const s1 = sd(on) || 0, s2 = sd(off) || 0;
  const pooled = Math.sqrt(((on.length - 1) * s1 * s1 + (off.length - 1) * s2 * s2) / (on.length + off.length - 2)) || 1e-9;
  const se = Math.sqrt((s1 * s1) / on.length + (s2 * s2) / off.length) || 1e-9;
  const diff = m1 - m2;
  const d = diff / pooled;
  const t = diff / se;
  const verdict: Verdict = Math.abs(t) >= 2 ? 'clear' : Math.abs(d) >= 0.5 ? 'suggestive' : 'none';
  const helps = verdict === 'none' ? null : better === 'high' ? diff > 0 : diff < 0;
  return { ...base, diff, d, t, verdict, helps };
}

const OUTCOMES: { key: keyof DayMetrics; better: 'high' | 'low' }[] = [
  { key: 'perf', better: 'high' },
  { key: 'rating', better: 'high' },
  { key: 'distrPerHour', better: 'low' },
  { key: 'onTask', better: 'high' },
];

// ---------------- Personal experiments ----------------
export const EXPERIMENT_DAYS = 14;

/** Balanced random ON/OFF schedule with no runs longer than 3 identical days. */
export function makeSchedule(days = EXPERIMENT_DAYS, rnd: () => number = Math.random): boolean[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const s = shuffle(
      Array.from({ length: days }, (_, i) => i % 2 === 0),
      rnd,
    );
    let ok = true;
    for (let i = 3; i < s.length && ok; i++) if (s[i] === s[i - 1] && s[i] === s[i - 2] && s[i] === s[i - 3]) ok = false;
    if (ok) return s;
  }
  return Array.from({ length: days }, (_, i) => i % 2 === 0);
}

export function experimentDay(exp: Experiment, today = dayKey()): number {
  return daysBetween(exp.startDate, today);
}

export function activeExperiment(data: AppData): Experiment | undefined {
  return data.experiments.find((e) => e.status === 'active');
}

/** Condition actually experienced on a day: the user's log wins over the schedule. */
export function conditionOn(exp: Experiment, i: number): boolean {
  const date = addDays(exp.startDate, i);
  return exp.log?.[date] ?? exp.schedule[i];
}

export function analyzeExperiment(data: AppData, exp: Experiment, today = dayKey()) {
  const dm = dayMetrics(data);
  const last = Math.min(exp.schedule.length - 1, experimentDay(exp, today));
  const effects = OUTCOMES.map(({ key, better }) => {
    const on: number[] = [];
    const off: number[] = [];
    for (let i = 0; i <= last; i++) {
      const v = dm.get(addDays(exp.startDate, i))?.[key];
      if (v === undefined || !Number.isFinite(v)) continue;
      (conditionOn(exp, i) ? on : off).push(v);
    }
    return compare(on, off, better, key);
  });
  const logged = Object.keys(exp.log || {}).length;
  return { effects, daysElapsed: last + 1, logged };
}

export function newExperiment(templateId: string, today = dayKey()): Experiment {
  const tpl = templateOf(templateId)!;
  return { id: `exp-${Date.now().toString(36)}`, template: tpl.id, tag: tpl.tag, startDate: today, schedule: makeSchedule(), status: 'active', log: {} };
}

// ---------------- Readiness ----------------
export interface Readiness {
  score: number; // 0–100
  level: 'high' | 'mid' | 'low';
  factors: { key: 'sleep' | 'energy' | 'stress' | 'pvt'; value: number }[]; // value in [-1, 1]
  pvtDelta?: number; // ms faster (+) or slower (−) than your usual median
}

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

export function readiness(data: AppData, today = dayKey()): Readiness | null {
  const c = data.checkins.find((x) => x.date === today);
  const pvts = data.results.filter((r) => r.task === 'pvt').sort((a, b) => a.startedAt - b.startedAt);
  const todays = pvts.filter((r) => r.date === today);
  const prior = pvts.filter((r) => r.date < today).slice(-14);
  const factors: Readiness['factors'] = [];
  const weights: Record<string, number> = { pvt: 0.4, sleep: 0.3, energy: 0.2, stress: 0.1 };
  let pvtDelta: number | undefined;
  if (c) {
    factors.push({ key: 'sleep', value: clamp1((c.sleep - 7) / 1.5 + (c.sleepQuality - 3) / 4) });
    factors.push({ key: 'energy', value: clamp1((c.energy - 3) / 2) });
    factors.push({ key: 'stress', value: clamp1(-(c.stress - 3) / 2) });
  }
  if (todays.length && prior.length >= 3) {
    const cur = todays[todays.length - 1];
    const usualRT = mean(prior.map((r) => r.metrics.medianRT));
    const usualLapses = mean(prior.map((r) => r.metrics.lapses));
    pvtDelta = Math.round(usualRT - cur.metrics.medianRT);
    factors.push({ key: 'pvt', value: clamp1(pvtDelta / 35 - (cur.metrics.lapses - usualLapses) * 0.25) });
  }
  if (!factors.length) return null;
  const wsum = factors.reduce((a, f) => a + weights[f.key], 0);
  const v = factors.reduce((a, f) => a + f.value * weights[f.key], 0) / wsum;
  const score = Math.round(50 + 50 * v);
  return { score, level: score >= 66 ? 'high' : score >= 42 ? 'mid' : 'low', factors, pvtDelta };
}

// ---------------- Weekly summary ----------------
export interface WeekStats {
  trainingDays: number;
  trainingMin: number;
  sessions: number;
  focusMin: number;
  avgRating: number | null;
  onTask: number | null;
  distrPerHour: number | null;
  checkins: number;
}

function statsFor(data: AppData, from: string, to: string): WeekStats {
  const rs = data.results.filter((r) => r.date >= from && r.date <= to);
  const ss = data.sessions.filter((s) => s.date >= from && s.date <= to);
  const rated = ss.filter((s) => s.rating);
  return {
    trainingDays: new Set(rs.map((r) => r.date)).size,
    trainingMin: Math.round(rs.reduce((a, r) => a + r.durationMs, 0) / 60000),
    sessions: ss.length,
    focusMin: Math.round(ss.reduce((a, s) => a + s.focusMs, 0) / 60000),
    avgRating: rated.length ? mean(rated.map((s) => s.rating!)) : null,
    onTask: onTaskRate(ss)?.rate ?? null,
    distrPerHour: distractionRate(ss),
    checkins: data.checkins.filter((c) => c.date >= from && c.date <= to).length,
  };
}

export function weekSummary(data: AppData, end = dayKey()) {
  const start = addDays(end, -6);
  const prevEnd = addDays(end, -7);
  const cur = statsFor(data, start, end);
  const prev = statsFor(data, addDays(end, -13), prevEnd);
  const fiStart = focusIndex(domainScores(data.results, prevEnd));
  const fiEnd = focusIndex(domainScores(data.results, end));
  const kinds = new Map<string, number>();
  data.sessions
    .filter((s) => s.date >= start && s.date <= end)
    .forEach((s) => s.distractions.forEach((d) => kinds.set(d.kind || 'other', (kinds.get(d.kind || 'other') || 0) + 1)));
  const topKind = [...kinds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const startTs = new Date(start + 'T00:00:00').getTime();
  const unlocked = Object.entries(data.achievements)
    .filter(([, ts]) => ts >= startTs)
    .map(([id]) => id);
  return { start, end, cur, prev, fiStart, fiEnd, topKind, unlocked };
}

/** A weekly review is due when the last one is ≥ 6 days old and there's been activity. */
export function reviewDue(data: AppData, today = dayKey()): boolean {
  const last = [...data.reviews].sort((a, b) => b.createdAt - a.createdAt)[0];
  if (last && daysBetween(last.weekEnd, today) < 6) return false;
  const first = firstActivityDay(data);
  if (!first || daysBetween(first, today) < 5) return false;
  const week = statsFor(data, addDays(today, -6), today);
  return week.trainingDays + week.sessions >= 2;
}

// ---------------- Extra insights (habit tags, focus sessions) ----------------
function tagEffects(data: AppData) {
  const dm = dayMetrics(data);
  const byDay = new Map<string, CheckIn>(data.checkins.map((c) => [c.date, c]));
  const ids = [...TAGS.map((t) => t.id), ...data.settings.customTags.map((t) => `c:${t}`)];
  const out: { tag: string; effect: Effect }[] = [];
  for (const tag of ids) {
    for (const { key, better } of OUTCOMES) {
      const on: number[] = [];
      const off: number[] = [];
      byDay.forEach((c, date) => {
        if (!c.tags) return; // only days where tags were reviewed
        const v = dm.get(date)?.[key];
        if (v === undefined) return;
        (c.tags.includes(tag) ? on : off).push(v);
      });
      const e = compare(on, off, better, key);
      if (e.verdict === 'clear' || e.verdict === 'suggestive') out.push({ tag, effect: e });
    }
  }
  return out.sort((a, b) => Math.abs(b.effect.d) - Math.abs(a.effect.d));
}

const OUTCOME_LABEL: Record<keyof DayMetrics, { zh: string; en: string }> = {
  perf: { zh: '训练表现', en: 'training performance' },
  rating: { zh: '专注自评', en: 'focus ratings' },
  distrPerHour: { zh: '分心频率', en: 'distraction rate' },
  onTask: { zh: '在任务上的比例', en: 'on-task rate' },
};
export const outcomeLabel = (k: keyof DayMetrics, lang: 'zh' | 'en') => OUTCOME_LABEL[k][lang];

export function extraInsights(data: AppData): Insight[] {
  const out: Insight[] = [];

  // Habit tags
  const seen = new Set<string>();
  for (const { tag, effect } of tagEffects(data)) {
    if (seen.has(tag) || seen.size >= 2) continue;
    seen.add(tag);
    const zh = tagLabel(tag, 'zh');
    const en = tagLabel(tag, 'en');
    const good = effect.helps;
    out.push({
      id: `tag-${tag}`,
      icon: 'sparkles',
      tone: good ? 'good' : 'warn',
      title: good ? { zh: `「${zh}」的日子更专注`, en: `Better focus on “${en}” days` } : { zh: `「${zh}」的日子专注更差`, en: `Worse focus on “${en}” days` },
      body: {
        zh: `对比 ${effect.on.length} 个有和 ${effect.off.length} 个没有「${zh}」的日子，你的${outcomeLabel(effect.key, 'zh')}${good ? '更好' : '更差'}（效应量 d=${Math.abs(effect.d).toFixed(1)}${effect.verdict === 'clear' ? '，差异明显' : '，初步迹象'}）。想确认因果关系，可以做一次个人实验。`,
        en: `Comparing ${effect.on.length} days with and ${effect.off.length} without “${en}”, your ${outcomeLabel(effect.key, 'en')} is ${good ? 'better' : 'worse'} (effect size d=${Math.abs(effect.d).toFixed(1)}${effect.verdict === 'clear' ? ', a clear difference' : ', an early signal'}). Run a personal experiment to test cause and effect.`,
      },
    });
  }

  // Probes: on-task trend
  const probed = data.sessions.filter((s) => (s.probes || []).some((p) => p.state !== 'missed')).sort((a, b) => a.startedAt - b.startedAt);
  if (probed.length >= 4) {
    const half = Math.floor(probed.length / 2);
    const a = onTaskRate(probed.slice(0, half))!;
    const b = onTaskRate(probed.slice(half))!;
    const pa = Math.round(a.rate * 100), pb = Math.round(b.rate * 100);
    out.push({
      id: 'ontask',
      icon: 'eye',
      tone: pb >= pa ? 'good' : 'info',
      title: { zh: `专注抽查：${pb}% 的时间在任务上`, en: `Attention probes: on task ${pb}% of the time` },
      body: {
        zh: pb > pa + 4 ? `比之前的 ${pa}% 提高了。研究估计人们清醒时近一半时间在走神——你正在把注意力拉回来。` : pb < pa - 4 ? `比之前的 ${pa}% 有所下降。留意最近的睡眠、压力和手机使用。` : `和之前（${pa}%）基本持平。每次"抓到"自己走神，都是在锻炼元觉察。`,
        en: pb > pa + 4 ? `Up from ${pa}%. Research suggests people mind-wander nearly half their waking hours — you are pulling attention back.` : pb < pa - 4 ? `Down from ${pa}%. Check recent sleep, stress and phone use.` : `Roughly the same as before (${pa}%). Every time you catch yourself drifting, you train meta-awareness.`,
      },
    });
  }

  // Best session length (by rating)
  const groups = new Map<number, number[]>();
  data.sessions.filter((s) => s.rating && s.completed).forEach((s) => groups.set(s.plannedMin, [...(groups.get(s.plannedMin) || []), s.rating!]));
  const enough = [...groups.entries()].filter(([, v]) => v.length >= 3);
  if (enough.length >= 2) {
    const best = enough.reduce((a, b) => (mean(b[1]) > mean(a[1]) ? b : a));
    out.push({
      id: 'duration',
      icon: 'timer',
      tone: 'info',
      title: { zh: `你最适合 ${best[0]} 分钟的专注时段`, en: `${best[0]}-minute blocks suit you best` },
      body: {
        zh: `在你常用的时长里，${best[0]} 分钟的专注自评最高（平均 ${mean(best[1]).toFixed(1)}/5）。把它作为默认时长。`,
        en: `Among the lengths you use, ${best[0]}-minute sessions get your highest focus ratings (avg ${mean(best[1]).toFixed(1)}/5). Make it your default.`,
      },
    });
  }

  // Distraction kinds
  const kinds = new Map<string, number>();
  data.sessions.slice(-30).forEach((s) => s.distractions.forEach((d) => d.kind && kinds.set(d.kind, (kinds.get(d.kind) || 0) + 1)));
  const total = [...kinds.values()].reduce((a, b) => a + b, 0);
  const top = [...kinds.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && total >= 6 && top[1] / total >= 0.4 && top[0] !== 'other') {
    const k = DISTRACTION_KINDS.find((x) => x.id === top[0])!;
    out.push({
      id: 'kinds',
      icon: k.icon,
      tone: 'info',
      title: { zh: `${Math.round((top[1] / total) * 100)}% 的分心是「${k.label.zh}」`, en: `${Math.round((top[1] / total) * 100)}% of distractions: “${k.label.en}”` },
      body: k.advice,
    });
  }
  return out;
}

export function allInsights(data: AppData): Insight[] {
  const out = [...insights(data, false), ...extraInsights(data)];
  return out.length ? out : [placeholderInsight(data)];
}

export { EXPERIMENTS };
