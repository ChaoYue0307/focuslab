import { useEffect, useRef } from 'react';
import { makeT } from '../lib/i18n';
import { scorePvt } from '../lib/scoring';
import { uniform } from '../lib/stats';
import type { TaskProps } from '../lib/types';
import { evTime, isSpace } from './common';

const TIMEOUT_MS = 30000;

export default function Pvt({ mode, lang, onComplete, onProgress }: TaskProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const t = makeT(lang);
  const cb = useRef({ onComplete, onProgress });
  cb.current = { onComplete, onProgress };

  useEffect(() => {
    const total = (mode === 'assessment' ? 180 : 120) * 1000;
    const box = boxRef.current!;
    const rts: number[] = [];
    let falseStarts = 0;
    let state: 'wait' | 'live' | 'feedback' | 'done' = 'wait';
    let onset = 0;
    let timer = 0;
    let raf = 0;
    const t0 = performance.now();
    const tooEarly = t('太早了', 'Too early');

    const progressId = window.setInterval(() => cb.current.onProgress(Math.min(1, (performance.now() - t0) / total)), 250);

    const finish = () => {
      state = 'done';
      const { metrics, perf } = scorePvt(rts, falseStarts);
      cb.current.onComplete({ metrics, perf, score: perf, level: 1, nextLevel: 1, durationMs: performance.now() - t0 });
    };

    const schedule = () => {
      if (performance.now() - t0 >= total) return finish();
      state = 'wait';
      box.textContent = '';
      box.classList.remove('live');
      timer = window.setTimeout(show, uniform(1000, 4000));
    };

    const tick = () => {
      if (state !== 'live') return;
      const el = performance.now() - onset;
      box.textContent = String(Math.floor(el)).padStart(3, '0');
      if (el > TIMEOUT_MS) return respond(performance.now());
      raf = requestAnimationFrame(tick);
    };

    const show = () => {
      raf = requestAnimationFrame(() => {
        state = 'live';
        box.classList.add('live');
        box.textContent = '000';
        onset = performance.now();
        raf = requestAnimationFrame(tick);
      });
    };

    const respond = (time: number) => {
      if (state === 'live') {
        const rt = Math.max(0, time - onset);
        state = 'feedback';
        cancelAnimationFrame(raf);
        rts.push(rt);
        box.textContent = String(Math.round(rt));
        timer = window.setTimeout(schedule, 1000);
      } else if (state === 'wait') {
        falseStarts++;
        clearTimeout(timer);
        state = 'feedback';
        box.classList.remove('live');
        box.textContent = tooEarly;
        box.style.fontSize = '32px';
        timer = window.setTimeout(() => {
          box.style.fontSize = '';
          schedule();
        }, 1000);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!isSpace(e) || e.repeat) return;
      e.preventDefault();
      respond(evTime(e));
    };
    const stage = box.closest('.stage-body') as HTMLElement;
    const onPointer = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      respond(evTime(e));
    };
    window.addEventListener('keydown', onKey);
    stage.addEventListener('pointerdown', onPointer);
    schedule();

    return () => {
      state = 'done';
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      clearInterval(progressId);
      window.removeEventListener('keydown', onKey);
      stage.removeEventListener('pointerdown', onPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div ref={boxRef} className="pvt-box" aria-live="off" />
      <div className="stage-hint">{t('计数器出现就按 空格 或点击屏幕', 'Press Space or tap as soon as the counter appears')}</div>
    </>
  );
}
