import type { Distraction, NoiseType, Probe } from './types';

/** The running focus session lives in its own key so it survives reloads and navigation. */
export const ACTIVE_KEY = 'focuslab:active';

export interface Active {
  id: string;
  startedAt: number;
  plannedMin: number;
  intention: string;
  ifThen: string;
  pausedTotal: number;
  pausedAt: number | null;
  pauses: number;
  distractions: Distraction[];
  trackAway: boolean;
  awayCount: number;
  awayMs: number;
  awayAt: number | null;
  noise: NoiseType;
  probes: Probe[];
  probeEvery: number; // minutes on average; 0 = off
  nextProbeAt: number; // elapsed ms
  probeOpenAt: number | null; // elapsed ms when the current probe was shown
}

export const loadActive = (): Active | null => {
  try {
    const s = localStorage.getItem(ACTIVE_KEY);
    if (!s) return null;
    const a = JSON.parse(s) as Partial<Active>;
    // Sessions saved by an older version lack the probe fields.
    const defaults: Pick<Active, 'probes' | 'probeEvery' | 'nextProbeAt' | 'probeOpenAt' | 'noise'> = { probes: [], probeEvery: 0, nextProbeAt: Infinity, probeOpenAt: null, noise: 'off' };
    return { ...defaults, ...a } as Active;
  } catch {
    return null;
  }
};

export const saveActive = (a: Active | null) => {
  try {
    if (a) localStorage.setItem(ACTIVE_KEY, JSON.stringify(a));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
};

export const elapsedOf = (a: Active, now = Date.now()) => now - a.startedAt - a.pausedTotal - (a.pausedAt ? now - a.pausedAt : 0);

/** Next probe time: jittered around the average so probes can't be anticipated; never in the first 3 minutes. */
export function nextProbe(fromMs: number, everyMin: number, rnd: () => number = Math.random): number {
  if (!everyMin) return Infinity;
  const gap = everyMin * 60000 * (0.6 + 0.8 * rnd());
  return Math.max(3 * 60000, fromMs + gap);
}

/** Probes stop 2 minutes before the end, and a probe left unanswered for 90 s counts as missed. */
export const PROBE_TIMEOUT_MS = 90000;
export const probeAllowed = (elapsed: number, totalMs: number) => totalMs - elapsed > 2 * 60000;
