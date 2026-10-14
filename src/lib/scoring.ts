import { clamp, clamp100, cv, dPrime, mean, median } from './stats';

/** Higher difficulty levels scale a performance score up to a 0–100 training score. */
export const levelFactor = (level: number, maxLevel: number) =>
  maxLevel <= 1 ? 1 : 0.7 + (0.3 * (Math.min(level, maxLevel) - 1)) / (maxLevel - 1);

/** Simple staircase: step up when performance is high, down when it is low. */
export function adaptLevel(perf: number, level: number, maxLevel: number, up = 80, down = 55): number {
  if (perf >= up) return Math.min(maxLevel, level + 1);
  if (perf < down) return Math.max(1, level - 1);
  return level;
}

const nz = (v: number, fallback = 0) => (Number.isFinite(v) ? v : fallback);

// ---------------- PVT ----------------
// Classic PVT lapse = RT ≥ 500 ms (Dinges). PVT-B's 355 ms cut-off assumes dedicated hardware;
// browser + keyboard latency adds tens of ms, so the classic threshold is the robust choice here.
export const PVT_LAPSE_MS = 500;

export function scorePvt(rts: number[], falseStarts: number) {
  const valid = rts.filter((r) => r >= 100);
  const sorted = [...valid].sort((a, b) => a - b);
  const n10 = Math.max(1, Math.round(sorted.length * 0.1));
  const lapses = valid.filter((r) => r >= PVT_LAPSE_MS).length;
  const speed = mean(valid.map((r) => 1000 / r));
  const metrics = {
    medianRT: Math.round(nz(median(valid))),
    meanRT: Math.round(nz(mean(valid))),
    speed: nz(speed),
    lapses,
    falseStarts,
    fastest10: Math.round(nz(mean(sorted.slice(0, n10)))),
    slowest10: Math.round(nz(mean(sorted.slice(-n10)))),
    trials: valid.length,
  };
  const perf = valid.length ? clamp100(((nz(speed) - 2.0) / (4.2 - 2.0)) * 100 - lapses * 3 - falseStarts * 2) : 0;
  return { metrics, perf };
}

// ---------------- SART ----------------
export interface SartTrial {
  digit: number;
  rt: number | null;
}
export const SART_NOGO = 3;

export function scoreSart(trials: SartTrial[]) {
  const go = trials.filter((t) => t.digit !== SART_NOGO);
  const nogo = trials.filter((t) => t.digit === SART_NOGO);
  const commissions = nogo.filter((t) => t.rt !== null).length;
  const omissions = go.filter((t) => t.rt === null).length;
  const goRTs = go.filter((t) => t.rt !== null && t.rt >= 100).map((t) => t.rt as number);
  const commissionRate = nogo.length ? commissions / nogo.length : 0;
  const omissionRate = go.length ? omissions / go.length : 0;
  const rtCV = nz(cv(goRTs), 0.4);
  const metrics = {
    commissionRate,
    omissionRate,
    meanRT: Math.round(nz(mean(goRTs))),
    rtCV,
    commissions,
    omissions,
    trials: trials.length,
  };
  const perf = clamp100(100 * (0.5 * (1 - commissionRate) + 0.2 * (1 - omissionRate) + 0.3 * clamp((0.4 - rtCV) / (0.4 - 0.12))));
  return { metrics, perf };
}

// ---------------- Choice-RT tasks (flanker, stroop, switch) ----------------
export interface ChoiceTrialRec {
  cond: string; // e.g. 'congruent' | 'incongruent' | 'repeat' | 'switch' | 'first'
  correct: boolean;
  rt: number | null; // null = timeout
}

export interface ConflictNorms {
  a: string; // baseline condition
  b: string; // costly condition
  fast: number;
  slow: number;
  costMax: number;
}

export const NORMS: Record<'flanker' | 'stroop' | 'switch', ConflictNorms> = {
  flanker: { a: 'congruent', b: 'incongruent', fast: 380, slow: 900, costMax: 150 },
  stroop: { a: 'congruent', b: 'incongruent', fast: 550, slow: 1300, costMax: 300 },
  switch: { a: 'repeat', b: 'switch', fast: 500, slow: 1400, costMax: 450 },
};

export function scoreConflict(trials: ChoiceTrialRec[], norms: ConflictNorms) {
  const counted = trials.filter((t) => t.cond !== 'first');
  const okRT = (t: ChoiceTrialRec) => t.correct && t.rt !== null && t.rt >= 150;
  const rtOf = (cond?: string) => counted.filter((t) => (!cond || t.cond === cond) && okRT(t)).map((t) => t.rt as number);
  const accOf = (cond?: string) => {
    const xs = counted.filter((t) => !cond || t.cond === cond);
    return xs.length ? xs.filter((t) => t.correct).length / xs.length : NaN;
  };
  const rtA = nz(mean(rtOf(norms.a)));
  const rtB = nz(mean(rtOf(norms.b)));
  const accuracy = nz(accOf(), 0);
  const meanRT = nz(mean(rtOf()));
  const cost = rtA && rtB ? rtB - rtA : 0;
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  const metrics: Record<string, number> = {
    accuracy,
    meanRT: Math.round(meanRT),
    [`rt${cap(norms.a)}`]: Math.round(rtA),
    [`rt${cap(norms.b)}`]: Math.round(rtB),
    [`acc${cap(norms.a)}`]: nz(accOf(norms.a), 0),
    [`acc${cap(norms.b)}`]: nz(accOf(norms.b), 0),
    timeouts: counted.filter((t) => t.rt === null).length,
    trials: counted.length,
  };
  metrics[norms.a === 'repeat' ? 'switchCost' : 'interference'] = Math.round(cost);
  const speedScore = meanRT ? clamp((norms.slow - meanRT) / (norms.slow - norms.fast)) : 0;
  const perf = clamp100(100 * (0.45 * clamp((accuracy - 0.75) / 0.23) + 0.3 * speedScore + 0.25 * clamp((norms.costMax - cost) / norms.costMax)));
  return { metrics, perf };
}

/** Response window for choice tasks — shrinks as the level rises. */
export const choiceDeadline = (level: number) => Math.max(700, 2000 - (level - 1) * 140);

// ---------------- N-back ----------------
export interface NbackBlock {
  n: number;
  dual: boolean;
  pos: { hits: number; misses: number; fas: number; crs: number };
  aud: { hits: number; misses: number; fas: number; crs: number };
}

/** Jaeggi et al. (2008): fewer than 3 errors per modality → n+1; more than 5 in any → n−1. */
export function nextN(b: NbackBlock): number {
  const errs = [b.pos.misses + b.pos.fas];
  if (b.dual) errs.push(b.aud.misses + b.aud.fas);
  if (errs.every((e) => e < 3)) return Math.min(9, b.n + 1);
  if (errs.some((e) => e > 5)) return Math.max(1, b.n - 1);
  return b.n;
}

export function scoreNback(blocks: NbackBlock[]) {
  const sum = { hits: 0, misses: 0, fas: 0, crs: 0 };
  for (const b of blocks) {
    const mods = b.dual ? [b.pos, b.aud] : [b.pos];
    for (const m of mods) {
      sum.hits += m.hits;
      sum.misses += m.misses;
      sum.fas += m.fas;
      sum.crs += m.crs;
    }
  }
  const hr = sum.hits / Math.max(1, sum.hits + sum.misses);
  const crr = sum.crs / Math.max(1, sum.crs + sum.fas);
  const balanced = (hr + crr) / 2;
  const meanN = nz(mean(blocks.map((b) => b.n)), 1);
  const dual = blocks.some((b) => b.dual);
  const metrics = {
    meanN,
    maxN: Math.max(...blocks.map((b) => b.n), 0),
    accuracy: balanced,
    hitRate: hr,
    falseAlarmRate: 1 - crr,
    dPrime: dPrime(sum.hits, sum.misses, sum.fas, sum.crs),
    dual: dual ? 1 : 0,
    blocks: blocks.length,
  };
  const effN = meanN + (dual ? 1 : 0);
  const perf = clamp100(balanced * 100);
  const score = clamp100((effN - 1) * 16 + balanced * 30);
  return { metrics, perf, score };
}

// ---------------- MOT ----------------
export interface MotTrial {
  level: number;
  k: number;
  correct: number;
}
export const motTargets = (level: number) => 2 + Math.floor((level - 1) / 3);
export const motSpeedTier = (level: number) => ((level - 1) % 3) + 1;
export const motTotal = (k: number) => Math.max(8, k * 2 + 2);

export function scoreMot(trials: MotTrial[]) {
  const totalK = trials.reduce((s, t) => s + t.k, 0);
  const totalC = trials.reduce((s, t) => s + t.correct, 0);
  const accuracy = totalK ? totalC / totalK : 0;
  const capacity = nz(mean(trials.map((t) => Math.max(0, 2 * t.correct - t.k))));
  const avgLevel = nz(mean(trials.map((t) => t.level)), 1);
  const metrics = {
    capacity,
    accuracy,
    avgLevel,
    maxTargets: Math.max(0, ...trials.filter((t) => t.correct === t.k).map((t) => t.k)),
    perfectRounds: trials.filter((t) => t.correct === t.k).length,
    trials: trials.length,
  };
  const perf = clamp100(accuracy * 100);
  const score = clamp100(((avgLevel - 1) / 14) * 80 + accuracy * 20);
  return { metrics, perf, score };
}

// ---------------- Schulte ----------------
export function scoreSchulte(tables: { timeMs: number; errors: number }[], size: number) {
  const times = tables.map((t) => t.timeMs / 1000);
  const meanTime = nz(mean(times));
  const errors = tables.reduce((s, t) => s + t.errors, 0);
  const spi = meanTime / (size * size);
  const norm = spi / Math.pow(size / 5, 0.6);
  const metrics = {
    meanTime,
    bestTime: times.length ? Math.min(...times) : 0,
    spi,
    errors,
    size,
  };
  const perf = tables.length ? clamp100(((2.4 - norm) / (2.4 - 0.7)) * 100 - (errors / tables.length) * 2) : 0;
  const score = clamp100(perf * Math.min(1, 0.85 + 0.05 * (size - 4)));
  let next = size;
  if (perf >= 80 && size < 7) next = size + 1;
  else if (perf < 40 && size > 4) next = size - 1;
  return { metrics, perf, score, next };
}

// ---------------- Breath counting ----------------
export function scoreBreath(correct: number, miscounts: number, resets: number, presses: number, minutes: number) {
  const cycles = correct + miscounts;
  const accuracy = cycles ? correct / cycles : 0;
  const bpm = minutes > 0 ? presses / minutes : 0;
  // Resting breathing is ~6–20 per minute; pressing much faster means the presses aren't tracking breaths.
  const plausibility = bpm <= 30 ? 1 : Math.max(0, 1 - (bpm - 30) / 20);
  const metrics = {
    accuracy,
    correct,
    miscounts,
    resets,
    bpm,
    minutes,
  };
  const perf = clamp100(accuracy * 100 * plausibility);
  return { metrics, perf };
}
