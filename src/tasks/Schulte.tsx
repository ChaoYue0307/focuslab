import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { makeT } from '../lib/i18n';
import { scoreSchulte } from '../lib/scoring';
import { shuffle } from '../lib/stats';
import type { TaskProps } from '../lib/types';

const TABLES = 3;

export default function Schulte({ level, mode, lang, onComplete, onProgress }: TaskProps) {
  const t = makeT(lang);
  const size = Math.max(4, Math.min(7, level || 5));
  const n = size * size;
  const [table, setTable] = useState(0);
  const [nextNum, setNextNum] = useState(1);
  const [wrong, setWrong] = useState<number | null>(null);
  const [between, setBetween] = useState<number | null>(null);
  const [now, setNow] = useState(performance.now());
  const grid = useMemo(() => shuffle(Array.from({ length: n }, (_, i) => i + 1)), [n, table]);
  const start = useRef(performance.now());
  const errors = useRef(0);
  const results = useRef<{ timeMs: number; errors: number }[]>([]);
  const t0 = useRef(performance.now());

  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    onProgress((table + (nextNum - 1) / n) / TABLES);
  }, [table, nextNum, n, onProgress]);

  const click = (num: number) => {
    if (between !== null) return;
    if (num === nextNum) {
      if (num === n) {
        const time = performance.now() - start.current;
        results.current.push({ timeMs: time, errors: errors.current });
        sfx.good();
        if (results.current.length >= TABLES) {
          const r = scoreSchulte(results.current, size);
          onComplete({ metrics: r.metrics, perf: r.perf, score: r.score, level: size, nextLevel: mode === 'training' ? r.next : level, durationMs: performance.now() - t0.current });
          return;
        }
        setBetween(time);
        window.setTimeout(() => {
          setBetween(null);
          setTable((x) => x + 1);
          setNextNum(1);
          errors.current = 0;
          start.current = performance.now();
        }, 1600);
      }
      setNextNum(num + 1);
    } else if (num >= nextNum) {
      errors.current++;
      setWrong(num);
      window.setTimeout(() => setWrong((w) => (w === num ? null : w)), 300);
    }
  };

  const elapsed = between ?? now - start.current;

  return (
    <>
      <div className="row between" style={{ width: 'min(460px, calc(100vw - 32px))', marginBottom: 14 }}>
        <span className="chip">{t('第 {a} / {b} 张', 'Table {a} / {b}', { a: table + 1, b: TABLES })}</span>
        <span style={{ fontSize: 15, fontWeight: 650 }}>
          {between !== null ? '✓ ' : t('找到 ', 'Find ')}
          <span style={{ fontSize: 22, color: 'var(--accent-ink)' }}>{between !== null ? '' : nextNum}</span>
        </span>
        <span className="tabnum" style={{ fontWeight: 650, minWidth: 60, textAlign: 'right' }}>
          {(elapsed / 1000).toFixed(1)}s
        </span>
      </div>
      <div className="schulte" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {grid.map((num) => (
          <button key={`${table}-${num}`} type="button" className={`${num < nextNum ? 'found' : ''} ${wrong === num ? 'wrong' : ''}`} onPointerDown={(e) => (e.preventDefault(), click(num))}>
            {num}
          </button>
        ))}
        <div className="schulte-center" />
      </div>
      <div className="stage-hint" style={{ position: 'static', marginTop: 14 }}>
        {t('视线尽量停在中心红点，用余光寻找', 'Keep your gaze on the red center dot; search with peripheral vision')}
      </div>
    </>
  );
}
