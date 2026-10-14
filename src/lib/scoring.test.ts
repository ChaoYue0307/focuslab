import { describe, expect, it } from 'vitest';
import { nbackSequence } from '../tasks/NBack';
import { dailyPlan, domainScores, focusIndex, streak } from './analytics';
import { addDays, dayKey } from './date';
import { adaptLevel, levelFactor, nextN, scoreBreath, scoreConflict, scoreMot, scoreNback, scorePvt, scoreSart, scoreSchulte, NORMS } from './scoring';
import { dPrime, probit } from './stats';
import { emptyData } from './store';
import type { TaskResult } from './types';

describe('stats', () => {
  it('probit inverts the normal CDF', () => {
    expect(probit(0.5)).toBeCloseTo(0, 6);
    expect(probit(0.975)).toBeCloseTo(1.959964, 4);
    expect(probit(0.01)).toBeCloseTo(-2.326348, 4);
  });
  it('d-prime is positive for good discrimination and ~0 for chance', () => {
    expect(dPrime(18, 2, 2, 38)).toBeGreaterThan(2);
    expect(Math.abs(dPrime(10, 10, 20, 20))).toBeLessThan(0.1);
  });
});

describe('levels', () => {
  it('level factor spans 0.7–1', () => {
    expect(levelFactor(1, 10)).toBeCloseTo(0.7);
    expect(levelFactor(10, 10)).toBeCloseTo(1);
    expect(levelFactor(1, 1)).toBe(1);
  });
  it('staircase moves up, down and holds', () => {
    expect(adaptLevel(90, 3, 10)).toBe(4);
    expect(adaptLevel(40, 3, 10)).toBe(2);
    expect(adaptLevel(70, 3, 10)).toBe(3);
    expect(adaptLevel(40, 1, 10)).toBe(1);
    expect(adaptLevel(99, 10, 10)).toBe(10);
  });
});

describe('PVT', () => {
  it('counts lapses (≥500 ms) and rewards fast, steady responses', () => {
    const fast = scorePvt(Array(30).fill(250), 0);
    const slow = scorePvt([...Array(25).fill(320), 400, 500, 600, 700, 800], 2);
    expect(fast.metrics.lapses).toBe(0);
    expect(slow.metrics.lapses).toBe(4);
    expect(slow.metrics.falseStarts).toBe(2);
    expect(fast.perf).toBeGreaterThan(slow.perf);
    expect(fast.metrics.medianRT).toBe(250);
  });
  it('ignores anticipations under 100 ms', () => {
    expect(scorePvt([50, 300, 300], 0).metrics.trials).toBe(2);
  });
});

describe('SART', () => {
  const make = (pressOnThree: boolean) =>
    Array.from({ length: 90 }, (_, i) => {
      const digit = (i % 9) + 1;
      return { digit, rt: digit === 3 ? (pressOnThree ? 300 : null) : 350 + ((i * 37) % 60) };
    });
  it('commission errors are pressing on 3', () => {
    expect(scoreSart(make(true)).metrics.commissionRate).toBe(1);
    expect(scoreSart(make(false)).metrics.commissionRate).toBe(0);
  });
  it('withholding on 3 scores much higher', () => {
    expect(scoreSart(make(false)).perf - scoreSart(make(true)).perf).toBeGreaterThanOrEqual(45);
  });
});

describe('conflict tasks', () => {
  it('computes interference as incongruent minus congruent RT', () => {
    const trials = [
      ...Array.from({ length: 20 }, () => ({ cond: 'congruent', correct: true, rt: 450 })),
      ...Array.from({ length: 20 }, () => ({ cond: 'incongruent', correct: true, rt: 520 })),
    ];
    const r = scoreConflict(trials, NORMS.flanker);
    expect(r.metrics.interference).toBe(70);
    expect(r.metrics.accuracy).toBe(1);
  });
  it('reports switch cost for the switching task and skips the first trial', () => {
    const trials = [
      { cond: 'first', correct: false, rt: 3000 },
      ...Array.from({ length: 10 }, () => ({ cond: 'repeat', correct: true, rt: 700 })),
      ...Array.from({ length: 10 }, () => ({ cond: 'switch', correct: true, rt: 900 })),
    ];
    const r = scoreConflict(trials, NORMS.switch);
    expect(r.metrics.switchCost).toBe(200);
    expect(r.metrics.accuracy).toBe(1);
    expect(r.metrics.trials).toBe(20);
  });
  it('timeouts count as errors', () => {
    const trials = [
      { cond: 'congruent', correct: true, rt: 500 },
      { cond: 'incongruent', correct: false, rt: null },
    ];
    expect(scoreConflict(trials, NORMS.flanker).metrics.timeouts).toBe(1);
    expect(scoreConflict(trials, NORMS.flanker).metrics.accuracy).toBe(0.5);
  });
});

describe('N-back', () => {
  it('generates exactly the requested number of matches', () => {
    for (let k = 0; k < 50; k++) {
      const n = 1 + (k % 4);
      const seq = nbackSequence(20 + n, n, 6, 8);
      let matches = 0;
      for (let i = n; i < seq.length; i++) if (seq[i] === seq[i - n]) matches++;
      expect(matches).toBe(6);
    }
  });
  it('follows the Jaeggi adaptation rule', () => {
    const z = (e: number) => ({ hits: 6 - e, misses: e, fas: 0, crs: 14 });
    expect(nextN({ n: 2, dual: true, pos: z(1), aud: z(2) })).toBe(3);
    expect(nextN({ n: 2, dual: true, pos: z(1), aud: z(6) })).toBe(1);
    expect(nextN({ n: 2, dual: true, pos: z(3), aud: z(4) })).toBe(2);
  });
  it('dual mode scores higher than single at the same n and accuracy', () => {
    const m = { hits: 5, misses: 1, fas: 1, crs: 15 };
    const single = scoreNback([{ n: 2, dual: false, pos: m, aud: m }]);
    const dual = scoreNback([{ n: 2, dual: true, pos: m, aud: m }]);
    expect(dual.score).toBeGreaterThan(single.score);
  });
});

describe('MOT, Schulte, breath', () => {
  it('MOT capacity is guess-corrected', () => {
    const r = scoreMot([
      { level: 4, k: 3, correct: 3 },
      { level: 5, k: 3, correct: 2 },
    ]);
    expect(r.metrics.capacity).toBeCloseTo((3 + 1) / 2);
    expect(r.metrics.accuracy).toBeCloseTo(5 / 6);
  });
  it('Schulte gets faster → higher score and suggests a bigger grid', () => {
    const fast = scoreSchulte([{ timeMs: 18000, errors: 0 }, { timeMs: 19000, errors: 0 }, { timeMs: 20000, errors: 0 }], 5);
    const slow = scoreSchulte([{ timeMs: 55000, errors: 3 }, { timeMs: 50000, errors: 2 }, { timeMs: 52000, errors: 4 }], 5);
    expect(fast.perf).toBeGreaterThan(slow.perf);
    expect(fast.next).toBe(6);
    expect(slow.next).toBe(4);
  });
  it('breath accuracy = correct / (correct + miscounts)', () => {
    const r = scoreBreath(8, 2, 3, 90, 5);
    expect(r.metrics.accuracy).toBeCloseTo(0.8);
    expect(r.perf).toBe(80);
    expect(scoreBreath(0, 0, 0, 0, 5).perf).toBe(0);
  });
});

describe('analytics', () => {
  const res = (task: TaskResult['task'], date: string, score: number): TaskResult => ({
    id: Math.random().toString(36),
    task,
    mode: 'training',
    startedAt: new Date(date + 'T09:00:00').getTime(),
    date,
    hour: 9,
    durationMs: 120000,
    level: 1,
    nextLevel: 1,
    perf: score,
    score,
    metrics: {},
  });

  it('focus index needs two domains', () => {
    const today = dayKey();
    expect(focusIndex(domainScores([res('pvt', today, 60)]))).toBeNull();
    expect(focusIndex(domainScores([res('pvt', today, 60), res('sart', today, 80)]))).toBe(70);
  });

  it('streak counts consecutive days ending today or yesterday', () => {
    const d = emptyData();
    const today = dayKey();
    d.results = [res('pvt', today, 50), res('pvt', addDays(today, -1), 50), res('pvt', addDays(today, -2), 50), res('pvt', addDays(today, -5), 50)];
    expect(streak(d, today).current).toBe(3);
    expect(streak(d, addDays(today, 1)).current).toBe(3);
    expect(streak(d, addDays(today, 2)).current).toBe(0);
  });

  it('daily plan is stable and bookended by PVT and breath counting', () => {
    const d = emptyData();
    const p1 = dailyPlan(d, '2026-10-14');
    const p2 = dailyPlan(d, '2026-10-14');
    expect(p1).toEqual(p2);
    expect(p1[0].task).toBe('pvt');
    expect(p1[p1.length - 1].task).toBe('breath');
    expect(new Set(p1.map((x) => x.task)).size).toBe(p1.length);
  });

  it('plan prefers exercises that are weaker or not done recently', () => {
    const d = emptyData();
    const today = '2026-10-14';
    d.results = [res('flanker', '2026-10-13', 95), res('stroop', '2026-10-13', 95), res('switch', '2026-10-01', 30)];
    expect(dailyPlan(d, today).map((x) => x.task)).toContain('switch');
  });
});
