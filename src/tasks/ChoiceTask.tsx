import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { sfx } from '../lib/audio';
import { capFirst, localeOf, makeT, tr } from '../lib/i18n';
import { adaptLevel, choiceDeadline, levelFactor, NORMS, scoreConflict, type ChoiceTrialRec } from '../lib/scoring';
import { clamp100, randInt, shuffle } from '../lib/stats';
import type { Lang, TaskProps } from '../lib/types';
import { evTime, isTouch, useKeys, useTimers } from './common';
import { ASSESS_LEVEL } from './registry';

interface Trial {
  cond: string;
  correct: number;
  [k: string]: unknown;
}

interface ChoiceConfig {
  kind: 'flanker' | 'stroop' | 'switch';
  trials: (mode: 'training' | 'assessment') => Trial[];
  buttons: (lang: Lang) => { label: ReactNode; kbd: string; keys: string[] }[];
  render: (tr: Trial, lang: Lang) => ReactNode;
  cue?: { ms: (level: number) => number; render: (tr: Trial, lang: Lang) => ReactNode };
  hint: (lang: Lang, touch: boolean) => string;
}

const MAX_LEVEL = 10;

function ChoiceTask({ config, level, mode, lang, onComplete, onProgress, practice }: TaskProps & { config: ChoiceConfig }) {
  const lvl = practice ? 1 : mode === 'assessment' ? ASSESS_LEVEL[config.kind] ?? 3 : level;
  const deadline = choiceDeadline(lvl);
  const trials = useMemo(() => (practice ? config.trials('training').slice(0, 12) : config.trials(mode)), [config, mode, practice]);
  const buttons = useMemo(() => config.buttons(lang), [config, lang]);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'fix' | 'cue' | 'stim' | 'fb' | 'done'>('fix');
  const [fb, setFb] = useState<{ ok: boolean; slow?: boolean; pressed?: number } | null>(null);
  const recs = useRef<ChoiceTrialRec[]>([]);
  const onset = useRef(0);
  const t0 = useRef(performance.now());
  const deadlineId = useRef<number>(undefined);
  const answered = useRef(true);
  const timers = useTimers();
  const t = makeT(lang);

  const finish = () => {
    setPhase('done');
    const { metrics, perf } = scoreConflict(recs.current, NORMS[config.kind]);
    const nextLevel = mode === 'training' ? adaptLevel(perf, lvl, MAX_LEVEL, 75, 50) : level;
    const series = recs.current.filter((r) => r.cond !== 'first').map((r) => ({ rt: r.rt, ok: r.correct, kind: r.rt === null ? ('timeout' as const) : undefined }));
    onComplete({ metrics, perf, score: clamp100(perf * levelFactor(lvl, MAX_LEVEL)), level: lvl, nextLevel, durationMs: performance.now() - t0.current, series });
  };

  // Phase machine
  useEffect(() => {
    let id: number | undefined;
    if (phase === 'fix') {
      id = timers.set(() => setPhase(config.cue ? 'cue' : 'stim'), randInt(400, 650));
    } else if (phase === 'cue') {
      id = timers.set(() => setPhase('stim'), config.cue!.ms(lvl));
    } else if (phase === 'fb') {
      id = timers.set(() => {
        setFb(null);
        if (i + 1 >= trials.length) finish();
        else {
          setI(i + 1);
          setPhase('fix');
        }
      }, mode === 'training' ? 450 : 300);
    }
    return () => timers.clear(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i]);

  useLayoutEffect(() => {
    if (phase !== 'stim') return;
    answered.current = false;
    onset.current = performance.now();
    // Refine onset to the frame the stimulus is painted on — unless that frame came
    // suspiciously late (throttled tab), in which case the commit time is the better estimate.
    const committed = onset.current;
    const raf = timers.raf(() => {
      const now = performance.now();
      if (now - committed < 50) onset.current = now;
    });
    deadlineId.current = timers.set(() => record(null, -1), deadline);
    return () => {
      timers.cancelRaf(raf);
      timers.clear(deadlineId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i]);

  useEffect(() => onProgress(i / trials.length), [i, trials.length, onProgress]);

  const record = (time: number | null, choice: number) => {
    if (answered.current) return;
    answered.current = true;
    timers.clear(deadlineId.current);
    const tr = trials[i];
    const ok = time !== null && choice === tr.correct;
    recs.current.push({ cond: tr.cond, correct: ok, rt: time === null ? null : Math.max(0, time - onset.current) });
    if (mode === 'training') {
      if (!ok) sfx.bad();
    }
    setFb({ ok, slow: time === null, pressed: choice });
    setPhase('fb');
  };

  const respond = (choice: number, time: number) => {
    if (phase !== 'stim') return;
    record(time, choice);
  };

  useKeys((e) => {
    const idx = buttons.findIndex((b) => b.keys.includes(e.key) || b.keys.includes(e.code));
    if (idx >= 0) {
      e.preventDefault();
      respond(idx, evTime(e));
    }
  });

  const tr = trials[Math.min(i, trials.length - 1)];
  const showFb = mode === 'training' && phase === 'fb' && fb;

  return (
    <>
      {config.cue && (phase === 'cue' || phase === 'stim' ? config.cue.render(tr, lang) : <div className="switch-cue" />)}
      <div className="stim">
        {phase === 'fix' && <div className="fixation">+</div>}
        {phase === 'cue' && config.kind === 'switch' && config.render({ ...tr, hidden: true }, lang)}
        {phase === 'stim' && config.render(tr, lang)}
        {phase === 'fb' &&
          (showFb ? (
            <div className={fb!.ok ? 'feedback-ok' : 'feedback-bad'} style={{ fontSize: 22, fontWeight: 700 }}>
              {fb!.slow ? t('太慢了', 'Too slow') : fb!.ok ? '✓' : '✗'}
            </div>
          ) : (
            <div className="fixation" style={{ opacity: 0 }}>
              +
            </div>
          ))}
      </div>
      <div className="resp-row">
        {buttons.map((b, idx) => (
          <button
            key={idx}
            className={`resp-btn ${showFb && fb!.pressed === idx ? (fb!.ok ? 'hit' : 'miss') : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              respond(idx, evTime(e.nativeEvent));
            }}
            type="button"
          >
            {b.label}
            <span className="kbd">{b.kbd}</span>
          </button>
        ))}
      </div>
      <div className="stage-hint">{config.hint(lang, isTouch())}</div>
    </>
  );
}

// ---------------- Flanker ----------------
function Arrow({ dir, size = 1 }: { dir: 'L' | 'R'; size?: number }) {
  return (
    <svg width={56 * size} height={48 * size} viewBox="0 0 56 48" style={{ transform: dir === 'L' ? 'scaleX(-1)' : undefined, margin: '0 2px' }}>
      <path d="M4 18h28V6l20 18-20 18V30H4z" fill="currentColor" />
    </svg>
  );
}

const balanced = (n: number, conds: string[]) => shuffle(Array.from({ length: n }, (_, k) => conds[k % conds.length]));

export const flankerConfig: ChoiceConfig = {
  kind: 'flanker',
  trials: (mode) =>
    balanced(mode === 'assessment' ? 80 : 60, ['congruent', 'incongruent']).map((cond) => {
      const dir = Math.random() < 0.5 ? 'L' : 'R';
      const flank = cond === 'congruent' ? dir : dir === 'L' ? 'R' : 'L';
      return { cond, correct: dir === 'L' ? 0 : 1, dir, flank };
    }),
  buttons: () => [
    { label: <Arrow dir="L" size={0.5} />, kbd: '← / F', keys: ['ArrowLeft', 'f', 'F', 'KeyF'] },
    { label: <Arrow dir="R" size={0.5} />, kbd: '→ / J', keys: ['ArrowRight', 'j', 'J', 'KeyJ'] },
  ],
  render: (trial) => {
    const f = trial.flank as 'L' | 'R';
    const d = trial.dir as 'L' | 'R';
    return (
      <div className="flanker" style={{ display: 'flex', alignItems: 'center' }}>
        <Arrow dir={f} />
        <Arrow dir={f} />
        <Arrow dir={d} />
        <Arrow dir={f} />
        <Arrow dir={f} />
      </div>
    );
  },
  hint: (lang, touch) => (touch ? tr(lang, '只看中间的箭头 · 点击左右按钮', 'Center arrow only · tap left or right') : tr(lang, '只看中间的箭头 · ← / → 或 F / J', 'Center arrow only · ← / → or F / J')),
};

// ---------------- Stroop ----------------
export const STROOP_COLORS = [
  { zh: '红', en: 'RED', css: '#e03e3e' },
  { zh: '绿', en: 'GREEN', css: '#1f9d55' },
  { zh: '蓝', en: 'BLUE', css: '#2f6fde' },
  { zh: '黄', en: 'YELLOW', css: '#e0a100' },
];
/** Blue / yellow / grey stay distinct for red–green colour vision deficiency (hue and lightness differ). */
export const STROOP_COLORS_CVD = [
  { zh: '蓝', en: 'BLUE', css: '#2f6fde' },
  { zh: '黄', en: 'YELLOW', css: '#e8b100' },
  { zh: '灰', en: 'GREY', css: '#8c8c8c' },
];
const STROOP_KEYS = [
  ['d', 'D', 'KeyD', '1'],
  ['f', 'F', 'KeyF', '2'],
  ['j', 'J', 'KeyJ', '3'],
  ['k', 'K', 'KeyK', '4'],
];

/** Colour words are shown in the user's language — Stroop interference depends on reading being automatic. */
const stroopWord = (c: { zh: string; en: string }, lang: Lang) => tr(lang, c.zh, c.en);
const stroopLabel = (c: { zh: string; en: string }, lang: Lang) => {
  const w = stroopWord(c, lang);
  return capFirst(w.toLocaleLowerCase(localeOf(lang)), localeOf(lang));
};

export function makeStroopConfig(cvd: boolean): ChoiceConfig {
  const colors = cvd ? STROOP_COLORS_CVD : STROOP_COLORS;
  const n = colors.length;
  const keyNames = 'DFJK'.slice(0, n).split('');
  return {
    kind: 'stroop',
    trials: (mode) =>
      balanced(mode === 'assessment' ? 64 : 48, ['congruent', 'incongruent']).map((cond) => {
        const ink = randInt(0, n - 1);
        let word = ink;
        if (cond === 'incongruent') while (word === ink) word = randInt(0, n - 1);
        return { cond, correct: ink, ink, word };
      }),
    buttons: (lang) =>
      colors.map((c, k) => ({
        label: (
          <span className="row" style={{ gap: 7 }}>
            <span className="dot" style={{ background: c.css, width: 12, height: 12 }} />
            {stroopLabel(c, lang)}
          </span>
        ),
        kbd: `${keyNames[k]} · ${k + 1}`,
        keys: STROOP_KEYS[k],
      })),
    render: (trial, lang) => (
      <div className="stroop-word" style={{ color: colors[trial.ink as number].css }} lang={localeOf(lang)}>
        {stroopWord(colors[trial.word as number], lang)}
      </div>
    ),
    hint: (lang, touch) => {
      if (touch) return tr(lang, '按墨水的颜色点击按钮，忽略字义', 'Tap the ink colour, ignore the word');
      const map = colors.map((c, k) => `${keyNames[k]} ${stroopLabel(c, lang)}`).join(' ');
      return tr(lang, '按墨水颜色作答 · {map}', 'Answer the ink colour · {map}', { map });
    },
  };
}

export const stroopConfig = makeStroopConfig(false);

// ---------------- Task switching ----------------
const SWITCH_DIGITS = [1, 2, 3, 4, 6, 7, 8, 9];
const CUES = {
  parity: { zh: '奇 · 偶', en: 'ODD · EVEN', color: 'var(--d1)' },
  magnitude: { zh: '小 · 大', en: 'LOW · HIGH', color: 'var(--d2)' },
};

export const switchConfig: ChoiceConfig = {
  kind: 'switch',
  trials: (mode) => {
    const n = mode === 'assessment' ? 72 : 56;
    const out: Trial[] = [];
    let task: 'parity' | 'magnitude' = Math.random() < 0.5 ? 'parity' : 'magnitude';
    for (let k = 0; k < n; k++) {
      const sw = k > 0 && Math.random() < 0.5;
      if (sw) task = task === 'parity' ? 'magnitude' : 'parity';
      const digit = SWITCH_DIGITS[randInt(0, SWITCH_DIGITS.length - 1)];
      const correct = task === 'parity' ? (digit % 2 === 1 ? 0 : 1) : digit < 5 ? 0 : 1;
      out.push({ cond: k === 0 ? 'first' : sw ? 'switch' : 'repeat', correct, task, digit });
    }
    return out;
  },
  cue: {
    ms: (level) => Math.max(150, 700 - (level - 1) * 60),
    render: (trial, lang) => {
      const c = CUES[trial.task as 'parity' | 'magnitude'];
      return (
        <div className="switch-cue" style={{ ['--cue' as string]: c.color }}>
          {tr(lang, c.zh, c.en)}
        </div>
      );
    },
  },
  buttons: (lang) => [
    { label: <span>{tr(lang, '奇数 · 小于 5', 'Odd · Low')}</span>, kbd: '← / F', keys: ['ArrowLeft', 'f', 'F', 'KeyF'] },
    { label: <span>{tr(lang, '偶数 · 大于 5', 'Even · High')}</span>, kbd: '→ / J', keys: ['ArrowRight', 'j', 'J', 'KeyJ'] },
  ],
  render: (trial) => {
    const c = CUES[trial.task as 'parity' | 'magnitude'];
    return (
      <div className="switch-card" style={{ ['--cue' as string]: c.color }}>
        {trial.hidden ? '' : (trial.digit as number)}
      </div>
    );
  },
  hint: (lang, touch) =>
    touch
      ? tr(lang, '蓝框判奇偶，橙框判大小 · 点击左右按钮', 'Blue frame: odd/even · Orange frame: low/high · tap left or right')
      : tr(lang, '蓝框判奇偶，橙框判大小 · ← / → 或 F / J', 'Blue frame: odd/even · Orange frame: low/high · ← / → or F / J'),
};

export const Flanker = (p: TaskProps) => <ChoiceTask {...p} config={flankerConfig} />;
export const Stroop = (p: TaskProps) => {
  const config = useMemo(() => makeStroopConfig(p.settings.stroopCvd), [p.settings.stroopCvd]);
  return <ChoiceTask {...p} config={config} />;
};
export const Switch = (p: TaskProps) => <ChoiceTask {...p} config={switchConfig} />;
