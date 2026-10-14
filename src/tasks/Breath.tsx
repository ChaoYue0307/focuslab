import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { fmtDuration } from '../lib/date';
import { makeT } from '../lib/i18n';
import { scoreBreath } from '../lib/scoring';
import type { TaskProps } from '../lib/types';
import { useKeys } from './common';

export default function Breath({ settings, lang, onComplete, onProgress }: TaskProps) {
  const t = makeT(lang);
  const minutes = settings.breathMin || 5;
  const total = minutes * 60000;
  const st = useRef({ count: 0, correct: 0, miscounts: 0, resets: 0, presses: 0 });
  const t0 = useRef(Date.now());
  const [left, setLeft] = useState(total);
  const [pulse, setPulse] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    sfx.bell();
    const id = setInterval(() => {
      const el = Date.now() - t0.current;
      setLeft(Math.max(0, total - el));
      onProgress(Math.min(1, el / total));
      if (el >= total && !done.current) {
        done.current = true;
        clearInterval(id);
        sfx.bell();
        const s = st.current;
        const r = scoreBreath(s.correct, s.miscounts, s.resets, s.presses, minutes);
        onComplete({ metrics: r.metrics, perf: r.perf, score: r.perf, level: 1, nextLevel: 1, durationMs: el });
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = () => {
    const s = st.current;
    s.presses++;
    s.count++;
    if (s.count >= 9) {
      // Pressed "1–8" nine times without marking the 9th breath: the count was lost.
      s.miscounts++;
      s.count = 0;
    }
    setPulse((p) => p + 1);
  };
  const nine = () => {
    const s = st.current;
    s.presses++;
    if (s.count === 8) s.correct++;
    else s.miscounts++;
    s.count = 0;
    setPulse((p) => p + 1);
  };
  const reset = () => {
    st.current.resets++;
    st.current.count = 0;
    setPulse((p) => p + 1);
  };

  useKeys((e) => {
    if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      count();
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      nine();
    } else if (e.key === 'r' || e.key === 'R' || e.code === 'KeyR') {
      e.preventDefault();
      reset();
    }
  });

  return (
    <>
      <div className="breath-zones">
        <button type="button" onPointerDown={(e) => (e.preventDefault(), count())}>
          {t('第 1–8 次呼气 · 点这里', 'Breaths 1–8 · tap here')}
        </button>
        <button type="button" onPointerDown={(e) => (e.preventDefault(), nine())}>
          {t('第 9 次呼气 · 点这里', 'Breath 9 · tap here')}
        </button>
      </div>
      <div key={pulse} className="breath-orb breath-pulse" />
      <div className="tabnum muted" style={{ marginTop: 26, fontSize: 15, pointerEvents: 'none' }}>
        {fmtDuration(left)}
      </div>
      <button
        type="button"
        className="btn sm ghost"
        style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}
        onPointerDown={(e) => (e.preventDefault(), reset())}
      >
        {t('数丢了，重置', 'Lost count — reset')} <span className="kbd">R</span>
      </button>
      <div className="stage-hint">{t('空格 = 1–8 · 回车 = 9 · 可以闭上眼睛', 'Space = 1–8 · Enter = 9 · feel free to close your eyes')}</div>
    </>
  );
}
