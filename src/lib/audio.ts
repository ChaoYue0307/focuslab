import { getData } from './store';
import type { NoiseType } from './types';

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call from a user gesture so later sounds are allowed to play (iOS/Safari). */
export function unlockAudio() {
  ac();
  if ('speechSynthesis' in window) {
    // A silent utterance primes speech on iOS.
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }
}

function enabled() {
  const s = getData().settings;
  return s.sound ? s.volume : 0;
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; delay?: number; attack?: number } = {}) {
  const vol = enabled();
  const c = ac();
  if (!vol || !c) return;
  const t0 = c.currentTime + (opts.delay || 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type || 'sine';
  osc.frequency.value = freq;
  const peak = (opts.gain ?? 0.2) * vol;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  tick: () => tone(880, 0.06, { gain: 0.08 }),
  good: () => {
    tone(660, 0.12, { gain: 0.12 });
    tone(990, 0.16, { gain: 0.1, delay: 0.07 });
  },
  bad: () => tone(196, 0.18, { type: 'triangle', gain: 0.14 }),
  start: () => {
    tone(523, 0.15, { gain: 0.12 });
    tone(784, 0.25, { gain: 0.12, delay: 0.12 });
  },
  /** A soft singing-bowl style bell. */
  bell: () => {
    const base = 432;
    [1, 2.0, 2.76, 5.4].forEach((m, i) => tone(base * m, 3.5 - i * 0.6, { gain: 0.16 / (i + 1), attack: 0.02 }));
  },
  /** Gentle two-note chime for attention probes — noticeable without being jarring. */
  probe: () => {
    tone(784, 0.5, { gain: 0.09, attack: 0.03 });
    tone(1175, 0.7, { gain: 0.07, delay: 0.18, attack: 0.03 });
  },
  done: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { gain: 0.1, delay: i * 0.09 }));
  },
};

// ---------- Letters for dual n-back ----------
export function speakLetter(letter: string) {
  if (!('speechSynthesis' in window) || !enabled()) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(letter);
    u.lang = 'en-US';
    u.rate = 1.1;
    u.volume = Math.min(1, enabled() + 0.3);
    const v = speechSynthesis.getVoices().find((x) => /^en(-|_)US/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export const speechAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

// ---------- Background noise for focus sessions ----------
let noiseNodes: { src: AudioBufferSourceNode; gain: GainNode; extra?: AudioNode[] } | null = null;

function makeNoiseBuffer(c: AudioContext, kind: Exclude<NoiseType, 'off'>): AudioBuffer {
  const len = c.sampleRate * 6;
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w * 0.25;
      else if (kind === 'pink') {
        // Paul Kellet's refined pink filter
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.08;
        b6 = w * 0.115926;
      } else {
        // brown (and the base of rain)
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 2.8;
      }
    }
    // Crossfade the loop seam.
    const fade = Math.floor(c.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) {
      const a = i / fade;
      d[i] = d[i] * a + d[len - fade + i] * (1 - a);
    }
  }
  return buf;
}

export function startNoise(kind: NoiseType, volume: number) {
  stopNoise();
  const c = ac();
  if (!c || kind === 'off') return;
  const src = c.createBufferSource();
  src.buffer = makeNoiseBuffer(c, kind === 'rain' ? 'pink' : kind);
  src.loop = true;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), c.currentTime + 1.5);
  const extra: AudioNode[] = [];
  if (kind === 'rain') {
    // Band-passed pink noise with a slow amplitude wobble reads as steady rain.
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.5;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 400;
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.13;
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(bp.frequency);
    lfo.start();
    src.connect(hp).connect(bp).connect(gain).connect(c.destination);
    extra.push(bp, hp, lfo, lfoGain);
  } else {
    src.connect(gain).connect(c.destination);
  }
  src.start();
  noiseNodes = { src, gain, extra };
}

export function setNoiseVolume(v: number) {
  const c = ctx;
  if (!c || !noiseNodes) return;
  noiseNodes.gain.gain.setTargetAtTime(Math.max(0.0002, v), c.currentTime, 0.2);
}

export function stopNoise() {
  const c = ctx;
  if (!c || !noiseNodes) return;
  const n = noiseNodes;
  noiseNodes = null;
  n.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.3);
  setTimeout(() => {
    try {
      n.src.stop();
      n.extra?.forEach((x) => (x as OscillatorNode).stop?.());
    } catch {
      /* already stopped */
    }
  }, 1500);
}
