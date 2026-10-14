import { describe, expect, it } from 'vitest';
import { newlyUnlocked } from './achievements';
import { addDays } from './date';
import { nextProbe, probeAllowed } from './focusActive';
import { analyzeExperiment, compare, conditionOn, makeSchedule, newExperiment, onTaskRate, readiness, reviewDue, weekSummary } from './personal';
import { reminderIcs } from './reminder';
import { seeded } from './stats';
import { emptyData } from './store';
import type { AppData, FocusSession, TaskResult } from './types';

const TODAY = '2026-10-14';

const result = (task: TaskResult['task'], date: string, score: number, metrics: Record<string, number> = {}): TaskResult => ({
  id: `${task}-${date}-${score}-${Math.random()}`,
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
  metrics,
});

const session = (date: string, extra: Partial<FocusSession> = {}): FocusSession => ({
  id: `s-${date}-${Math.random()}`,
  startedAt: new Date(date + 'T10:00:00').getTime(),
  date,
  hour: 10,
  plannedMin: 50,
  focusMs: 50 * 60000,
  intention: '',
  distractions: [],
  awayCount: 0,
  awayMs: 0,
  pauses: 0,
  completed: true,
  ...extra,
});

describe('experiment schedule', () => {
  it('is balanced and has no runs longer than 3', () => {
    for (let k = 0; k < 40; k++) {
      const s = makeSchedule(14, seeded(k + 1));
      expect(s).toHaveLength(14);
      expect(s.filter(Boolean)).toHaveLength(7);
      for (let i = 3; i < s.length; i++) expect(s[i] === s[i - 1] && s[i] === s[i - 2] && s[i] === s[i - 3]).toBe(false);
    }
  });
  it('a logged day overrides the schedule', () => {
    const exp = { ...newExperiment('phone_away', TODAY), schedule: Array(14).fill(true) };
    exp.log = { [TODAY]: false };
    expect(conditionOn(exp, 0)).toBe(false);
    expect(conditionOn(exp, 1)).toBe(true);
  });
});

describe('two-group comparison', () => {
  it('needs at least 3 days per arm', () => {
    expect(compare([1, 2], [1, 2, 3], 'high', 'rating').verdict).toBe('insufficient');
  });
  it('flags a clear improvement and respects "lower is better"', () => {
    const better = compare([4.5, 4.6, 4.4, 4.7, 4.5], [3.1, 3.3, 3.0, 3.2, 3.4], 'high', 'rating');
    expect(better.verdict).toBe('clear');
    expect(better.helps).toBe(true);
    const fewerDistractions = compare([0.5, 0.8, 0.6, 0.7], [2.5, 2.9, 2.2, 2.6], 'low', 'distrPerHour');
    expect(fewerDistractions.helps).toBe(true);
  });
  it('reports no difference for identical groups', () => {
    expect(compare([3, 4, 3, 4], [3, 4, 4, 3], 'high', 'rating').verdict).toBe('none');
  });
});

describe('experiment analysis', () => {
  it('separates ON and OFF days and finds the planted effect', () => {
    const d: AppData = emptyData();
    const exp = { ...newExperiment('phone_away', addDays(TODAY, -13)), schedule: Array.from({ length: 14 }, (_, i) => i % 2 === 0) };
    d.experiments = [exp];
    for (let i = 0; i < 14; i++) {
      const date = addDays(exp.startDate, i);
      const on = i % 2 === 0;
      d.sessions.push(session(date, { rating: on ? 5 : 3, distractions: Array.from({ length: on ? 0 : 3 }, () => ({ t: 0, text: 'x' })) }));
    }
    const { effects } = analyzeExperiment(d, exp, TODAY);
    const rating = effects.find((e) => e.key === 'rating')!;
    expect(rating.on).toHaveLength(7);
    expect(rating.off).toHaveLength(7);
    expect(rating.helps).toBe(true);
    const distr = effects.find((e) => e.key === 'distrPerHour')!;
    expect(distr.helps).toBe(true);
  });
});

describe('readiness', () => {
  it('is null without any signal', () => {
    expect(readiness(emptyData(), TODAY)).toBeNull();
  });
  it('rates a well-rested, fast morning above a sleep-deprived, slow one', () => {
    const base = emptyData();
    for (let i = 1; i <= 5; i++) base.results.push(result('pvt', addDays(TODAY, -i), 60, { medianRT: 300, lapses: 1 }));
    const good: AppData = { ...base, results: [...base.results, result('pvt', TODAY, 70, { medianRT: 265, lapses: 0 })], checkins: [{ date: TODAY, createdAt: 0, sleep: 8, sleepQuality: 4, energy: 4, mood: 4, stress: 2, caffeine: 0, exercise: true }] };
    const bad: AppData = { ...base, results: [...base.results, result('pvt', TODAY, 30, { medianRT: 360, lapses: 5 })], checkins: [{ date: TODAY, createdAt: 0, sleep: 5, sleepQuality: 2, energy: 2, mood: 3, stress: 4, caffeine: 2, exercise: false }] };
    const g = readiness(good, TODAY)!;
    const b = readiness(bad, TODAY)!;
    expect(g.level).toBe('high');
    expect(b.level).toBe('low');
    expect(g.pvtDelta).toBe(35);
  });
});

describe('probes', () => {
  it('on-task rate ignores missed probes', () => {
    const s = session(TODAY, { probes: [{ t: 1, state: 'on' }, { t: 2, state: 'mw' }, { t: 3, state: 'missed' }, { t: 4, state: 'on' }] });
    expect(onTaskRate([s])).toEqual({ rate: 2 / 3, n: 3 });
    expect(onTaskRate([session(TODAY)])).toBeNull();
  });
  it('schedules probes after 3 minutes, jittered around the average, and never near the end', () => {
    expect(nextProbe(0, 0)).toBe(Infinity);
    for (let k = 0; k < 50; k++) {
      const at = nextProbe(10 * 60000, 10, seeded(k + 3));
      expect(at).toBeGreaterThanOrEqual(10 * 60000 + 6 * 60000);
      expect(at).toBeLessThanOrEqual(10 * 60000 + 14 * 60000);
    }
    expect(nextProbe(0, 5, () => 0)).toBe(3 * 60000);
    expect(probeAllowed(23 * 60000, 25 * 60000)).toBe(false);
    expect(probeAllowed(10 * 60000, 25 * 60000)).toBe(true);
  });
});

describe('weekly review', () => {
  it('summarizes the week against the prior week', () => {
    const d = emptyData();
    d.results.push(result('pvt', TODAY, 60), result('sart', addDays(TODAY, -1), 70), result('pvt', addDays(TODAY, -9), 50));
    d.sessions.push(session(TODAY, { rating: 4 }), session(addDays(TODAY, -8), { rating: 2 }));
    const w = weekSummary(d, TODAY);
    expect(w.cur.trainingDays).toBe(2);
    expect(w.prev.trainingDays).toBe(1);
    expect(w.cur.focusMin).toBe(50);
    expect(w.cur.avgRating).toBe(4);
  });
  it('is due after 5+ days of use and not again within 6 days', () => {
    const d = emptyData();
    d.results.push(result('pvt', addDays(TODAY, -6), 50), result('pvt', TODAY, 60), result('sart', addDays(TODAY, -2), 60));
    expect(reviewDue(d, TODAY)).toBe(true);
    d.reviews.push({ id: 'r', weekEnd: addDays(TODAY, -2), createdAt: 0, wins: '', obstacle: '', nextChange: '' });
    expect(reviewDue(d, TODAY)).toBe(false);
  });
});

describe('achievements', () => {
  it('unlocks once and only once', () => {
    const d = emptyData();
    expect(newlyUnlocked(d)).toEqual([]);
    d.results.push(result('pvt', TODAY, 50));
    expect(newlyUnlocked(d)).toContain('first');
    d.achievements.first = 1;
    expect(newlyUnlocked(d)).not.toContain('first');
  });
});

describe('calendar reminder', () => {
  it('produces a valid daily-repeating iCalendar event', () => {
    const ics = reminderIcs('07:45', 'https://example.org/focuslab/', 'en');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics).toMatch(/DTSTART:\d{8}T074500\r\n/);
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
  });
});
