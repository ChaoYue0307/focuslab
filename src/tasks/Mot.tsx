import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { makeT } from '../lib/i18n';
import { motSpeedTier, motTargets, motTotal, scoreMot, type MotTrial } from '../lib/scoring';
import { shuffle } from '../lib/stats';
import type { TaskProps } from '../lib/types';

const W = 1000; // logical arena size
const R = 26; // ball radius
const CUE_MS = 2200;
const MOVE_MS = 5500;
const MAX_LEVEL = 15;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  target: boolean;
  picked: boolean;
}

export default function Mot({ level, lang, onComplete, onProgress, practice }: TaskProps) {
  const ROUNDS = practice ? 2 : 10;
  const t = makeT(lang);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'cue' | 'move' | 'select' | 'reveal'>('cue');
  const [lvl, setLvl] = useState(practice ? 1 : Math.max(1, Math.min(MAX_LEVEL, level)));
  const [picked, setPicked] = useState(0);
  const balls = useRef<Ball[]>([]);
  const trials = useRef<MotTrial[]>([]);
  const t0 = useRef(performance.now());
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const k = motTargets(lvl);

  // Set up a round
  useEffect(() => {
    const kk = motTargets(lvl);
    const total = motTotal(kk);
    const speed = 150 * [1, 1.35, 1.7][motSpeedTier(lvl) - 1];
    const bs: Ball[] = [];
    const flags = shuffle(Array.from({ length: total }, (_, i) => i < kk));
    for (let i = 0; i < total; i++) {
      let x = 0, y = 0, tries = 0;
      do {
        x = R * 2 + Math.random() * (W - R * 4);
        y = R * 2 + Math.random() * (W - R * 4);
        tries++;
      } while (tries < 200 && bs.some((b) => Math.hypot(b.x - x, b.y - y) < R * 3.2));
      const a = Math.random() * Math.PI * 2;
      bs.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, target: flags[i], picked: false });
    }
    balls.current = bs;
    // Dev-only hook so automated play-tests can read ball state.
    if (import.meta.env.DEV) (window as unknown as { __mot: Ball[] }).__mot = bs;
    setPicked(0);
    setPhase('cue');
    onProgress(round / ROUNDS);
    const id1 = window.setTimeout(() => setPhase('move'), CUE_MS);
    const id2 = window.setTimeout(() => setPhase('select'), CUE_MS + MOVE_MS);
    return () => {
      clearTimeout(id1);
      clearTimeout(id2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Animation + drawing loop
  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext('2d')!;
    const css = getComputedStyle(document.documentElement);
    const col = {
      ball: css.getPropertyValue('--text-2').trim() || '#555',
      target: css.getPropertyValue('--accent').trim() || '#2a78d6',
      good: css.getPropertyValue('--good').trim() || '#0ca30c',
      bad: css.getPropertyValue('--bad').trim() || '#d03b3b',
      surface: css.getPropertyValue('--surface').trim() || '#fff',
      grid: css.getPropertyValue('--grid').trim() || '#ddd',
    };
    let raf = 0;
    let last = performance.now();
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = cv.getBoundingClientRect();
      cv.width = rect.width * dpr;
      cv.height = rect.height * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const physics = (dt: number) => {
      const bs = balls.current;
      for (const b of bs) {
        // gentle random steering keeps paths unpredictable
        const ang = Math.atan2(b.vy, b.vx) + (Math.random() - 0.5) * 2.2 * dt;
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(ang) * sp;
        b.vy = Math.sin(ang) * sp;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const M = R + 10; // keep room for the reveal ring
        if (b.x < M) (b.x = M), (b.vx = Math.abs(b.vx));
        if (b.x > W - M) (b.x = W - M), (b.vx = -Math.abs(b.vx));
        if (b.y < M) (b.y = M), (b.vy = Math.abs(b.vy));
        if (b.y > W - M) (b.y = W - M), (b.vy = -Math.abs(b.vy));
      }
      for (let i = 0; i < bs.length; i++)
        for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i], b = bs[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < R * 2.15) {
            const nx = dx / d, ny = dy / d;
            const overlap = R * 2.15 - d;
            a.x -= (nx * overlap) / 2;
            a.y -= (ny * overlap) / 2;
            b.x += (nx * overlap) / 2;
            b.y += (ny * overlap) / 2;
            const va = a.vx * nx + a.vy * ny;
            const vb = b.vx * nx + b.vy * ny;
            if (va - vb > 0) {
              a.vx += (vb - va) * nx;
              a.vy += (vb - va) * ny;
              b.vx += (va - vb) * nx;
              b.vy += (va - vb) * ny;
            }
          }
        }
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ph = phaseRef.current;
      if (ph === 'move') physics(dt);
      const s = cv.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, W, W);
      // center fixation
      ctx.fillStyle = col.grid;
      ctx.beginPath();
      ctx.arc(W / 2, W / 2, 6, 0, Math.PI * 2);
      ctx.fill();
      const blink = ph === 'cue' && Math.floor(now / 300) % 2 === 0;
      for (const b of balls.current) {
        let fill = col.ball;
        let ring: string | null = null;
        if (ph === 'cue' && b.target) fill = blink ? col.target : col.ball;
        if (ph === 'cue' && b.target && !blink) ring = col.target;
        if (ph === 'select' && b.picked) fill = col.target;
        if (ph === 'reveal') {
          if (b.target && b.picked) fill = col.good;
          else if (b.picked) fill = col.bad;
          else if (b.target) ring = col.good;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, R, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = col.surface;
        ctx.stroke();
        if (ring) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, R + 7, 0, Math.PI * 2);
          ctx.lineWidth = 5;
          ctx.strokeStyle = ring;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const finishRound = () => {
    const bs = balls.current;
    const correct = bs.filter((b) => b.target && b.picked).length;
    trials.current.push({ level: lvl, k, correct });
    if (correct === k) sfx.good();
    else sfx.bad();
    setPhase('reveal');
    window.setTimeout(() => {
      let next = lvl;
      if (correct === k) next = Math.min(MAX_LEVEL, lvl + 1);
      else if (correct <= k - 2) next = Math.max(1, lvl - 1);
      if (trials.current.length >= ROUNDS) {
        onProgress(1);
        const r = scoreMot(trials.current);
        onComplete({ ...r, level: trials.current[0].level, nextLevel: Math.max(1, next - 1), durationMs: performance.now() - t0.current });
        return;
      }
      setLvl(next);
      setRound((x) => x + 1);
    }, 1400);
  };

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'select') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * W;
    let best: Ball | null = null;
    let bd = Infinity;
    for (const b of balls.current) {
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < bd) (bd = d), (best = b);
    }
    if (!best || bd > R * 2) return;
    best.picked = !best.picked;
    const n = balls.current.filter((b) => b.picked).length;
    setPicked(n);
    if (n >= k) finishRound();
  };

  return (
    <>
      <div className="row" style={{ gap: 8, marginBottom: 14 }}>
        <span className="chip accent">{t('{k} 个目标', '{k} targets', { k })}</span>
        <span className="chip">{t('第 {r} / {t} 轮', 'Round {r} / {t}', { r: round + 1, t: ROUNDS })}</span>
      </div>
      <div className="mot-wrap">
        <canvas ref={canvasRef} onPointerDown={onPointer} style={{ cursor: phase === 'select' ? 'pointer' : 'default' }} />
      </div>
      <div className="stage-hint" style={{ position: 'static', marginTop: 14 }}>
        {phase === 'cue' && t('记住闪烁的 {k} 个目标', 'Memorize the {k} flashing targets', { k })}
        {phase === 'move' && t('追踪它们……', 'Track them…')}
        {phase === 'select' && t('点出目标（{p} / {k}）', 'Click the targets ({p} / {k})', { p: picked, k })}
        {phase === 'reveal' && t('绿色 = 目标', 'Green = targets')}
      </div>
    </>
  );
}
