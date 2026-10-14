import { useEffect, useRef } from 'react';
import { makeT } from '../lib/i18n';
import { adaptLevel, levelFactor, scoreSart, SART_NOGO, type SartTrial } from '../lib/scoring';
import { clamp100, shuffle } from '../lib/stats';
import type { TaskProps } from '../lib/types';
import { evTime, isSpace } from './common';

const SIZES = [56, 76, 96, 116, 136];
const MAX_LEVEL = 8;

export const sartTiming = (level: number) => ({
  stimMs: Math.max(150, 250 - (level - 1) * 15),
  soaMs: Math.max(800, 1150 - (level - 1) * 50),
});

const MASK = `<svg class="sart-mask" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" opacity=".55"><circle cx="50" cy="50" r="44"/><path d="M19 19 81 81M81 19 19 81"/></svg>`;

export default function Sart({ level, mode, lang, onComplete, onProgress }: TaskProps) {
  const digitRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const t = makeT(lang);
  const cb = useRef({ onComplete, onProgress });
  cb.current = { onComplete, onProgress };

  useEffect(() => {
    const lvl = mode === 'assessment' ? 1 : level;
    const { stimMs, soaMs } = sartTiming(lvl);
    const cycles = mode === 'assessment' ? 25 : 15;
    const digits: number[] = [];
    for (let c = 0; c < cycles; c++) digits.push(...shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    const trials: SartTrial[] = digits.map((d) => ({ digit: d, rt: null }));
    const el = digitRef.current!;
    const flash = flashRef.current!;
    let i = -1;
    let onset = 0;
    let t0 = 0;
    let timers: number[] = [];
    let raf = 0;
    let done = false;

    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, Math.max(0, ms - performance.now())));

    // The trial index only advances on the frame the new digit is drawn, so a late
    // response still counts toward the previous trial (its window runs until the next onset).
    const next = () => {
      if (i + 1 >= trials.length) {
        i = trials.length;
        cb.current.onProgress(1);
        return finish();
      }
      raf = requestAnimationFrame(() => {
        i++;
        cb.current.onProgress(i / trials.length);
        el.style.fontSize = SIZES[Math.floor(Math.random() * SIZES.length)] + 'px';
        el.textContent = String(trials[i].digit);
        onset = performance.now();
        if (i === 0) t0 = onset;
        const base = t0 + i * soaMs;
        at(base + stimMs, () => {
          el.style.fontSize = '';
          el.innerHTML = MASK;
        });
        at(base + soaMs, next);
      });
    };

    const finish = () => {
      done = true;
      el.innerHTML = '';
      const { metrics, perf } = scoreSart(trials);
      const nextLevel = mode === 'training' ? adaptLevel(perf, lvl, MAX_LEVEL, 85, 60) : level;
      cb.current.onComplete({ metrics, perf, score: clamp100(perf * levelFactor(lvl, MAX_LEVEL)), level: lvl, nextLevel, durationMs: performance.now() - t0 });
    };

    const respond = (time: number) => {
      if (done || i < 0 || i >= trials.length) return;
      const tr = trials[i];
      if (tr.rt !== null) return;
      tr.rt = Math.max(0, time - onset);
      if (mode === 'training' && tr.digit === SART_NOGO) {
        flash.classList.add('on');
        timers.push(window.setTimeout(() => flash.classList.remove('on'), 60));
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!isSpace(e) || e.repeat) return;
      e.preventDefault();
      respond(evTime(e));
    };
    const stage = el.closest('.stage-body') as HTMLElement;
    const onPointer = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      respond(evTime(e));
    };
    window.addEventListener('keydown', onKey);
    stage.addEventListener('pointerdown', onPointer);
    el.innerHTML = MASK;
    timers.push(window.setTimeout(next, 800));

    return () => {
      done = true;
      timers.forEach(clearTimeout);
      timers = [];
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      stage.removeEventListener('pointerdown', onPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div ref={flashRef} className="sart-flash" />
      <div ref={digitRef} className="sart-digit" />
      <div className="stage-hint">{t('除了 3 都按 空格 / 点击 · 看到 3 不要按', 'Space / tap for every digit · do nothing on 3')}</div>
    </>
  );
}
