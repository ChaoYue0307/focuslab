import { DOMAINS, TASKS, taskMeta } from '../tasks/registry';
import { addDays, dayKey, daysBetween } from './date';
import { hashString, mean, sd, seeded } from './stats';
import type { Bi, Vars } from './i18n';
import type { AppData, Domain, FocusSession, TaskId, TaskResult } from './types';

const WINDOW_DAYS = 45;
const PER_TASK = 3;

/** Domain scores from the most recent results (last 3 per domain within 45 days, up to `asOf`). */
export function domainScores(results: TaskResult[], asOf: string = dayKey()): Partial<Record<Domain, number>> {
  const from = addDays(asOf, -WINDOW_DAYS);
  const out: Partial<Record<Domain, number>> = {};
  for (const d of DOMAINS) {
    const xs = results
      .filter((r) => taskMeta(r.task).domain === d.id && r.date <= asOf && r.date >= from)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, PER_TASK);
    if (xs.length) out[d.id] = Math.round(mean(xs.map((r) => r.score)));
  }
  return out;
}

export function focusIndex(scores: Partial<Record<Domain, number>>): number | null {
  const vals = Object.values(scores).filter((v): v is number => typeof v === 'number');
  return vals.length >= 2 ? Math.round(mean(vals)) : null;
}

/** Focus Index for every day that had training, using data available up to that day. */
export function indexHistory(results: TaskResult[]): { date: string; value: number }[] {
  const days = [...new Set(results.map((r) => r.date))].sort();
  const out: { date: string; value: number }[] = [];
  for (const d of days) {
    const v = focusIndex(domainScores(results, d));
    if (v !== null) out.push({ date: d, value: v });
  }
  return out;
}

/** Baseline = first 7 days of data; used to show how far each domain has moved. */
export function baselineScores(results: TaskResult[]): Partial<Record<Domain, number>> {
  if (!results.length) return {};
  const first = results.reduce((m, r) => (r.date < m ? r.date : m), results[0].date);
  const end = addDays(first, 6);
  const out: Partial<Record<Domain, number>> = {};
  for (const d of DOMAINS) {
    const xs = results.filter((r) => taskMeta(r.task).domain === d.id && r.date <= end);
    if (xs.length) out[d.id] = Math.round(mean(xs.slice(0, PER_TASK).map((r) => r.score)));
  }
  return out;
}

/** Earliest day with any training or focus session (order-independent). */
export function firstActivityDay(data: AppData): string | undefined {
  let first: string | undefined;
  for (const r of data.results) if (!first || r.date < first) first = r.date;
  for (const s of data.sessions) if (!first || s.date < first) first = s.date;
  return first;
}

export function trainedDays(data: AppData): Set<string> {
  const s = new Set<string>();
  data.results.forEach((r) => s.add(r.date));
  data.sessions.filter((x) => x.focusMs >= 10 * 60000).forEach((x) => s.add(x.date));
  return s;
}

export function streak(data: AppData, today = dayKey()): { current: number; best: number } {
  const days = trainedDays(data);
  let current = 0;
  let k = days.has(today) ? today : addDays(today, -1);
  while (days.has(k)) {
    current++;
    k = addDays(k, -1);
  }
  const sorted = [...days].sort();
  let best = 0, run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best: Math.max(best, current) };
}

export function focusMsOn(sessions: FocusSession[], date: string) {
  return sessions.filter((s) => s.date === date).reduce((a, s) => a + s.focusMs, 0);
}

export function trainingMsOn(results: TaskResult[], date: string) {
  return results.filter((r) => r.date === date).reduce((a, r) => a + r.durationMs, 0);
}

// ---------------- Daily plan ----------------
export interface PlanItem {
  task: TaskId;
  role: 'warmup' | 'core' | 'cooldown';
}

function lastOf(results: TaskResult[], task: TaskId) {
  let best: TaskResult | undefined;
  for (const r of results) if (r.task === task && (!best || r.startedAt > best.startedAt)) best = r;
  return best;
}

/** Pick the candidate that most needs work: weaker recent score and longer since last practice. */
function pick(results: TaskResult[], candidates: TaskId[], today: string, rnd: () => number, bonus: Partial<Record<TaskId, number>> = {}): TaskId {
  let bestId = candidates[0];
  let bestP = -Infinity;
  for (const id of candidates) {
    const last = lastOf(results, id);
    const since = last ? Math.min(14, daysBetween(last.date, today)) : 14;
    const weak = last ? 100 - last.score : 60;
    const p = weak * 0.5 + since * 8 + rnd() * 6 + (bonus[id] || 0);
    if (p > bestP) {
      bestP = p;
      bestId = id;
    }
  }
  return bestId;
}

export function dailyPlan(data: AppData, today = dayKey()): PlanItem[] {
  // Exclude today's own results so the plan doesn't reshuffle as you complete it.
  const past = data.results.filter((r) => r.date < today);
  const rnd = seeded(hashString(today));
  // SART is the core sustained-attention drill, so it gets a bonus over MOT.
  const sustained = pick(past, ['sart', 'mot'], today, rnd, { sart: 14 });
  const executive = pick(past, ['flanker', 'stroop', 'switch'], today, rnd);
  const memory = pick(past, sustained === 'mot' ? ['nback', 'schulte'] : ['nback', 'mot', 'schulte'], today, rnd, { nback: 10 });
  return [
    { task: 'pvt', role: 'warmup' },
    { task: sustained, role: 'core' },
    { task: executive, role: 'core' },
    { task: memory, role: 'core' },
    { task: 'breath', role: 'cooldown' },
  ];
}

export const planMinutes = (plan: PlanItem[], breathMin: number) =>
  plan.reduce((s, p) => s + (p.task === 'breath' ? breathMin : taskMeta(p.task).minutes), 0);

// ---------------- Personal insights ----------------
export interface Insight {
  id: string;
  icon: string;
  tone: 'good' | 'warn' | 'info';
  title: Bi;
  body: Bi;
  vars?: Vars; // values for {placeholders} in title/body
}

/** Each result as a z-score within its own task, so different tasks can be pooled. */
export function zScores(results: TaskResult[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of TASKS) {
    const xs = results.filter((r) => r.task === t.id);
    if (xs.length < 4) continue;
    const m = mean(xs.map((r) => r.score));
    const s = sd(xs.map((r) => r.score)) || 1;
    xs.forEach((r) => out.set(r.id, (r.score - m) / s));
  }
  return out;
}

export const BUCKETS = [
  { id: 'morning', from: 5, to: 11, zh: '上午', en: 'morning' },
  { id: 'afternoon', from: 12, to: 16, zh: '下午', en: 'afternoon' },
  { id: 'evening', from: 17, to: 21, zh: '傍晚', en: 'evening' },
  { id: 'night', from: 22, to: 28, zh: '深夜', en: 'late night' },
] as const;

export const bucketOf = (hour: number) => BUCKETS.find((b) => (hour < 5 ? hour + 24 : hour) >= b.from && (hour < 5 ? hour + 24 : hour) <= b.to)!;

export function timeOfDayProfile(results: TaskResult[]) {
  const z = zScores(results);
  return BUCKETS.map((b) => {
    const xs = results.filter((r) => z.has(r.id) && bucketOf(r.hour).id === b.id).map((r) => z.get(r.id)!);
    return { bucket: b, n: xs.length, z: xs.length ? mean(xs) : NaN };
  });
}

export function dayPerformance(results: TaskResult[]): Map<string, number> {
  const z = zScores(results);
  const byDay = new Map<string, number[]>();
  for (const r of results) {
    if (!z.has(r.id)) continue;
    const a = byDay.get(r.date) || [];
    a.push(z.get(r.id)!);
    byDay.set(r.date, a);
  }
  const out = new Map<string, number>();
  byDay.forEach((v, k) => out.set(k, mean(v)));
  return out;
}

/** Compare days split by a check-in factor. Returns null when there isn't enough data. */
function splitEffect(data: AppData, test: (c: AppData['checkins'][number]) => boolean | null) {
  const perf = dayPerformance(data.results);
  const yes: number[] = [];
  const no: number[] = [];
  for (const c of data.checkins) {
    const p = perf.get(c.date);
    if (p === undefined) continue;
    const r = test(c);
    if (r === null) continue;
    (r ? yes : no).push(p);
  }
  if (yes.length < 3 || no.length < 3) return null;
  return { diff: mean(yes) - mean(no), nYes: yes.length, nNo: no.length };
}

/** Approximate a z-difference as score points using the typical within-task spread. */
function zToPoints(data: AppData, dz: number) {
  const sds = TASKS.map((t) => sd(data.results.filter((r) => r.task === t.id).map((r) => r.score))).filter(Number.isFinite);
  return Math.round(Math.abs(dz) * (sds.length ? mean(sds) : 10));
}

export function insights(data: AppData, withPlaceholder = true): Insight[] {
  const out: Insight[] = [];
  const bucketBi = (b: (typeof BUCKETS)[number]): Bi => ({ zh: b.zh, en: b.en });

  // Sleep
  const sleep = splitEffect(data, (c) => (c.sleep >= 7 ? true : c.sleep < 6.5 ? false : null));
  if (sleep && Math.abs(sleep.diff) > 0.15) {
    out.push(
      sleep.diff > 0
        ? {
            id: 'sleep',
            icon: 'moon',
            tone: 'good',
            title: { zh: '睡够 7 小时，你明显更专注', en: 'You focus better after 7+ hours of sleep' },
            body: {
              zh: '睡眠 ≥7 小时的日子（{yes} 天），你的训练表现比睡眠 <6.5 小时的日子（{no} 天）平均高约 {pts} 分。保护睡眠是提升专注最便宜的方法。',
              en: 'On days after 7+ hours of sleep ({yes} days) you scored about {pts} points higher than after <6.5 hours ({no} days). Protecting sleep is the cheapest focus upgrade there is.',
            },
            vars: { yes: sleep.nYes, no: sleep.nNo, pts: zToPoints(data, sleep.diff) },
          }
        : {
            id: 'sleep',
            icon: 'moon',
            tone: 'info',
            title: { zh: '睡眠与表现的关系还不明显', en: 'Sleep isn’t showing its usual effect yet' },
            body: {
              zh: '目前睡得更多的日子表现并没有更好。继续记录——样本还小，也可能其他因素（时段、压力）在起作用。',
              en: 'So far, longer-sleep days haven’t scored higher. Keep logging — the sample is small and other factors (time of day, stress) may be at play.',
            },
          },
    );
  }

  // Time of day
  const tod = timeOfDayProfile(data.results).filter((b) => b.n >= 3);
  if (tod.length >= 2) {
    const best = tod.reduce((a, b) => (b.z > a.z ? b : a));
    const worst = tod.reduce((a, b) => (b.z < a.z ? b : a));
    if (best.z - worst.z > 0.25) {
      out.push({
        id: 'tod',
        icon: 'sun',
        tone: 'info',
        title: { zh: '你的黄金专注时段：{best}', en: 'Your peak focus window: {best}' },
        body: {
          zh: '你在这个时段的表现，比最弱的时段（{worst}）平均高约 {pts} 分。把最需要深度思考的工作安排在这里。',
          en: 'You score about {pts} points higher in this window than in your weakest one ({worst}). Schedule your deepest work here.',
        },
        vars: { best: bucketBi(best.bucket), worst: bucketBi(worst.bucket), pts: zToPoints(data, best.z - worst.z) },
      });
    }
  }

  // Exercise
  const ex = splitEffect(data, (c) => c.exercise);
  if (ex && ex.diff > 0.2) {
    out.push({
      id: 'exercise',
      icon: 'run',
      tone: 'good',
      title: { zh: '运动过的日子表现更好', en: 'Exercise days are better focus days' },
      body: {
        zh: '过去 24 小时内运动过的日子，你的表现平均高约 {pts} 分。哪怕 10–20 分钟的快走也有帮助。',
        en: 'When you exercised in the previous 24 h you scored about {pts} points higher. Even a 10–20 minute brisk walk helps.',
      },
      vars: { pts: zToPoints(data, ex.diff) },
    });
  }

  // Stress
  const st = splitEffect(data, (c) => (c.stress >= 4 ? true : c.stress <= 2 ? false : null));
  if (st && st.diff < -0.2) {
    out.push({
      id: 'stress',
      icon: 'wave',
      tone: 'warn',
      title: { zh: '高压力正在拖累你的专注', en: 'High stress is costing you focus' },
      body: {
        zh: '高压力日子的表现平均低约 {pts} 分。在开始深度工作前做 3 分钟数息或慢呼吸，可以帮助调节唤醒水平。',
        en: 'High-stress days score about {pts} points lower. Try 3 minutes of breath counting or slow breathing before deep work to regulate arousal.',
      },
      vars: { pts: zToPoints(data, st.diff) },
    });
  }

  // Caffeine
  const caf = splitEffect(data, (c) => c.caffeine >= 1);
  if (caf && Math.abs(caf.diff) > 0.25) {
    out.push({
      id: 'caffeine',
      icon: 'coffee',
      tone: 'info',
      title: caf.diff > 0 ? { zh: '咖啡因对你有提升作用', en: 'Caffeine gives you a lift' } : { zh: '咖啡因没帮上忙', en: 'Caffeine isn’t helping' },
      body:
        caf.diff > 0
          ? {
              zh: '摄入咖啡因的日子表现高约 {pts} 分。注意睡前 6 小时内避免，以免影响睡眠——睡眠的影响更大。',
              en: 'Caffeine days score about {pts} points higher. Avoid it within 6 hours of bedtime — sleep matters more.',
            }
          : {
              zh: '喝了咖啡的日子表现反而略低——可能是用咖啡弥补了睡眠不足。试着先解决睡眠。',
              en: 'Caffeine days actually score slightly lower — possibly because coffee is compensating for poor sleep. Fix sleep first.',
            },
      vars: { pts: zToPoints(data, caf.diff) },
    });
  }

  // PVT trend
  const pvt = data.results.filter((r) => r.task === 'pvt').sort((a, b) => a.startedAt - b.startedAt);
  if (pvt.length >= 6) {
    const recent = pvt.slice(-3);
    const prior = pvt.slice(0, -3).slice(-6);
    const d = mean(recent.map((r) => r.metrics.lapses)) - mean(prior.map((r) => r.metrics.lapses));
    if (d >= 1) {
      out.push({
        id: 'pvt-fatigue',
        icon: 'battery',
        tone: 'warn',
        title: { zh: '最近警觉度在下滑', en: 'Your alertness has been dipping' },
        body: {
          zh: '最近 3 次 PVT 的走神失误明显增多。这通常是睡眠债积累的信号——今晚早点睡比多训练更有效。',
          en: 'Lapses in your last 3 PVT runs are clearly up. This usually signals accumulating sleep debt — an early night will help more than extra training.',
        },
      });
    }
  }

  // Deep work distraction trend
  const ss = data.sessions.filter((s) => s.focusMs >= 5 * 60000).sort((a, b) => a.startedAt - b.startedAt);
  if (ss.length >= 6) {
    const rate = (xs: FocusSession[]) => (xs.reduce((a, s) => a + s.distractions.length + s.awayCount, 0) / xs.reduce((a, s) => a + s.focusMs, 0)) * 3600000;
    const half = Math.floor(ss.length / 2);
    const a = rate(ss.slice(0, half));
    const b = rate(ss.slice(half));
    const vars = { a: a.toFixed(1), b: b.toFixed(1) };
    if (a > 0 && b < a * 0.8) {
      out.push({
        id: 'distractions',
        icon: 'shield',
        tone: 'good',
        title: { zh: '你被打断的次数在减少', en: 'You’re getting interrupted less' },
        body: {
          zh: '专注时段中的分心从每小时 {a} 次降到 {b} 次。这就是真实世界的专注力提升。',
          en: 'Distractions during focus sessions fell from {a} to {b} per hour. That is real-world focus improving.',
        },
        vars,
      });
    } else if (b > a * 1.3 && b > 2) {
      out.push({
        id: 'distractions',
        icon: 'shield',
        tone: 'warn',
        title: { zh: '最近分心变多了', en: 'Distractions have crept up' },
        body: {
          zh: '专注时段中的分心从每小时 {a} 次升到 {b} 次。试试把手机放到另一个房间，并在开始前关闭通知。',
          en: 'Distractions rose from {a} to {b} per hour. Try leaving your phone in another room and silencing notifications before you start.',
        },
        vars,
      });
    }
  }

  if (out.length === 0 && withPlaceholder) out.push(placeholderInsight(data));
  return out;
}

export function placeholderInsight(data: AppData): Insight {
  return {
    id: 'unlock',
    icon: 'sparkles',
    tone: 'info',
    title: { zh: '个人洞察正在积累中', en: 'Personal insights are on their way' },
    body: {
      zh: '再完成一些训练和每日状态打卡（目前 {n} 次训练、{c} 次打卡），FocusLab 就能告诉你睡眠、运动、时段和压力如何影响你自己的专注。',
      en: 'Keep training and checking in (so far {n} sessions and {c} check-ins). FocusLab will then show how sleep, exercise, time of day and stress affect your own focus.',
    },
    vars: { n: data.results.length, c: data.checkins.length },
  };
}
