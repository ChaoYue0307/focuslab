import { useEffect, useRef, useState } from 'react';
import { sfx, speakLetter, speechAvailable } from '../lib/audio';
import { makeT } from '../lib/i18n';
import { nextN, scoreNback, type NbackBlock } from '../lib/scoring';
import { shuffle } from '../lib/stats';
import type { TaskProps } from '../lib/types';
import { useKeys } from './common';
import { ASSESS_LEVEL } from './registry';

const LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];
const POSITIONS = [0, 1, 2, 3, 5, 6, 7, 8]; // 3×3 grid without the center
const BLOCKS = 3;
const TRIAL_MS = 3000;
const STIM_MS = 500;
const TARGETS = 6;

/** A sequence of `len` symbols (0..alphabet-1) with exactly `targets` n-back matches. */
export function nbackSequence(len: number, n: number, targets: number, alphabet: number): number[] {
  const idx = new Set(shuffle(Array.from({ length: len - n }, (_, k) => k + n)).slice(0, targets));
  const seq: number[] = [];
  for (let i = 0; i < len; i++) {
    if (idx.has(i)) seq.push(seq[i - n]);
    else {
      let v = Math.floor(Math.random() * alphabet);
      while (i >= n && v === seq[i - n]) v = Math.floor(Math.random() * alphabet);
      seq.push(v);
    }
  }
  return seq;
}

type Mark = 'hit' | 'miss' | null;

export default function NBack({ level, mode, settings, lang, onComplete, onProgress }: TaskProps) {
  const t = makeT(lang);
  const dual = settings.nbackDual;
  const audio = dual && settings.nbackAudio && speechAvailable() && settings.sound;
  const [n, setN] = useState(mode === 'assessment' ? ASSESS_LEVEL.nback ?? 2 : Math.max(1, level));
  const [block, setBlock] = useState(0);
  const [phase, setPhase] = useState<'run' | 'between'>('run');
  const [cell, setCell] = useState<number | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const [marks, setMarks] = useState<{ pos: Mark; aud: Mark }>({ pos: null, aud: null });
  const [lastBlock, setLastBlock] = useState<NbackBlock | null>(null);
  const blocks = useRef<NbackBlock[]>([]);
  const t0 = useRef(performance.now());
  const cur = useRef({ i: -1, posSeq: [] as number[], audSeq: [] as number[], pressedPos: false, pressedAud: false, len: 0 });
  const stats = useRef<NbackBlock | null>(null);

  // Run one block
  useEffect(() => {
    if (phase !== 'run') return;
    const len = 20 + n;
    const c = cur.current;
    c.posSeq = nbackSequence(len, n, TARGETS, POSITIONS.length);
    c.audSeq = nbackSequence(len, n, TARGETS, LETTERS.length);
    c.i = -1;
    c.len = len;
    const z = () => ({ hits: 0, misses: 0, fas: 0, crs: 0 });
    stats.current = { n, dual, pos: z(), aud: z() };
    const timers: number[] = [];
    let stopped = false;

    // Returns the "missed target" marks for the trial that just ended (training feedback).
    const closeTrial = (): { pos: Mark; aud: Mark } => {
      const none = { pos: null, aud: null };
      const i = c.i;
      if (i < n) return none;
      const s = stats.current!;
      const score = (isTarget: boolean, pressed: boolean, m: NbackBlock['pos']) => {
        if (isTarget && pressed) m.hits++;
        else if (isTarget) m.misses++;
        else if (pressed) m.fas++;
        else m.crs++;
      };
      const posT = c.posSeq[i] === c.posSeq[i - n];
      const audT = c.audSeq[i] === c.audSeq[i - n];
      score(posT, c.pressedPos, s.pos);
      if (dual) score(audT, c.pressedAud, s.aud);
      if (mode !== 'training') return none;
      return { pos: posT && !c.pressedPos ? 'miss' : null, aud: dual && audT && !c.pressedAud ? 'miss' : null };
    };

    const step = () => {
      if (stopped) return;
      const missed = closeTrial();
      c.i++;
      onProgress((block + c.i / len) / BLOCKS);
      if (c.i >= len) {
        const s = stats.current!;
        blocks.current.push(s);
        setLastBlock(s);
        setCell(null);
        if (blocks.current.length >= BLOCKS) {
          const r = scoreNback(blocks.current);
          const nn = nextN(s);
          onComplete({ ...r, level: blocks.current[0].n, nextLevel: mode === 'training' ? nn : level, durationMs: performance.now() - t0.current });
        } else setPhase('between');
        return;
      }
      c.pressedPos = false;
      c.pressedAud = false;
      setMarks(missed);
      if (missed.pos || missed.aud) timers.push(window.setTimeout(() => setMarks((m) => ({ pos: m.pos === 'miss' && missed.pos ? null : m.pos, aud: m.aud === 'miss' && missed.aud ? null : m.aud })), 450));
      setCell(POSITIONS[c.posSeq[c.i]]);
      const L = LETTERS[c.audSeq[c.i]];
      if (dual) {
        if (audio) {
          speakLetter(L);
          setLetter(null);
        } else setLetter(L);
      }
      timers.push(window.setTimeout(() => setCell(null), STIM_MS));
      timers.push(window.setTimeout(step, TRIAL_MS));
    };
    timers.push(window.setTimeout(step, 900));
    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, block]);

  const press = (which: 'pos' | 'aud') => {
    const c = cur.current;
    if (phase !== 'run' || c.i < 0 || c.i >= c.len) return;
    if (which === 'aud' && !dual) return;
    if (which === 'pos' ? c.pressedPos : c.pressedAud) return;
    if (which === 'pos') c.pressedPos = true;
    else c.pressedAud = true;
    if (mode === 'training') {
      const seq = which === 'pos' ? c.posSeq : c.audSeq;
      const ok = c.i >= n && seq[c.i] === seq[c.i - n];
      setMarks((m) => ({ ...m, [which]: ok ? 'hit' : 'miss' }));
      if (!ok) sfx.bad();
    }
  };

  const continueBlock = () => {
    const nn = nextN(lastBlock!);
    setN(nn);
    setBlock((b) => b + 1);
    setPhase('run');
  };

  useKeys((e) => {
    if (phase === 'between') {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        continueBlock();
      }
      return;
    }
    if (e.key === 'a' || e.key === 'A' || e.code === 'KeyA' || e.key === 'ArrowLeft') {
      e.preventDefault();
      press('pos');
    } else if (e.key === 'l' || e.key === 'L' || e.code === 'KeyL' || e.key === 'ArrowRight') {
      e.preventDefault();
      press('aud');
    }
  });

  if (phase === 'between' && lastBlock) {
    const nn = nextN(lastBlock);
    const pe = lastBlock.pos.misses + lastBlock.pos.fas;
    const ae = lastBlock.aud.misses + lastBlock.aud.fas;
    return (
      <div className="stack center fade-in" style={{ alignItems: 'center', maxWidth: 420 }}>
        <div className="muted small">{t('第 {b} / {t} 轮完成', 'Block {b} of {t} done', { b: block + 1, t: BLOCKS })}</div>
        <h2 style={{ fontSize: 26 }}>
          {nn > lastBlock.n ? t('升级！', 'Level up!') : nn < lastBlock.n ? t('降一级，稳住', 'Stepping down — steady') : t('保持', 'Holding steady')}
        </h2>
        <div className="row" style={{ gap: 24, justifyContent: 'center' }}>
          <div>
            <div className="stat-label">{t('位置错误', 'Position errors')}</div>
            <div className="stat-value">{pe}</div>
          </div>
          {dual && (
            <div>
              <div className="stat-label">{audio ? t('声音错误', 'Sound errors') : t('字母错误', 'Letter errors')}</div>
              <div className="stat-value">{ae}</div>
            </div>
          )}
        </div>
        <p className="text-2">{t('下一轮：{n}-back', 'Next block: {n}-back', { n: nn })}</p>
        <button className="btn primary lg" onClick={continueBlock} type="button">
          {t('继续', 'Continue')} <span className="kbd" style={{ marginLeft: 4 }}>Space</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="row" style={{ gap: 8, marginBottom: 18 }}>
        <span className="chip accent">{n}-back</span>
        <span className="chip">{dual ? t('双任务', 'Dual') : t('位置', 'Position')}</span>
        <span className="chip">
          {t('第 {b} 轮', 'Block {b}', { b: block + 1 })} / {BLOCKS}
        </span>
      </div>
      <div className="nback-grid">
        {Array.from({ length: 9 }, (_, k) =>
          k === 4 ? (
            <div key={k} className="nback-cell center">
              +
            </div>
          ) : (
            <div key={k} className={`nback-cell ${cell === k ? 'on' : ''}`}>
              {cell === k && letter ? letter : ''}
            </div>
          ),
        )}
      </div>
      <div className="resp-row" style={{ maxWidth: 420 }}>
        <button className={`resp-btn ${marks.pos || ''}`} onPointerDown={(e) => (e.preventDefault(), press('pos'))} type="button">
          {t('位置相同', 'Position')}
          <span className="kbd">A</span>
        </button>
        {dual && (
          <button className={`resp-btn ${marks.aud || ''}`} onPointerDown={(e) => (e.preventDefault(), press('aud'))} type="button">
            {audio ? t('声音相同', 'Sound') : t('字母相同', 'Letter')}
            <span className="kbd">L</span>
          </button>
        )}
      </div>
      <div className="stage-hint">{t('与 {n} 步之前相同才按 · 不确定就不按', 'Press only when it matches {n} steps back · unsure? don’t press', { n })}</div>
    </>
  );
}
