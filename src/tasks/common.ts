import { useEffect, useRef } from 'react';

/** Event time on the performance.now() clock (falls back for old epoch-based timeStamps). */
export function evTime(e: Event): number {
  const now = performance.now();
  const t = e.timeStamp;
  return t > 0 && t <= now + 5 && t > now - 1000 ? t : now;
}

/** Window keydown listener that always sees the latest handler. Ignores auto-repeat. */
export function useKeys(handler: (e: KeyboardEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      ref.current(e);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
}

export const isSpace = (e: KeyboardEvent) => e.code === 'Space' || e.key === ' ';

/** Touch-first device (phone/tablet): hints talk about tapping instead of keys. */
export const isTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: none) and (pointer: coarse)').matches;

/** Keep the screen awake while a task or focus session runs. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
      } catch {
        /* not allowed — fine */
      }
    };
    void acquire();
    const onVis = () => document.visibilityState === 'visible' && !cancelled && void acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}

/** Timers that are all cleared on unmount. */
export function useTimers() {
  const ids = useRef(new Set<number>());
  const rafs = useRef(new Set<number>());
  useEffect(() => {
    const t = ids.current;
    const r = rafs.current;
    return () => {
      t.forEach((id) => clearTimeout(id));
      r.forEach((id) => cancelAnimationFrame(id));
    };
  }, []);
  return useRef({
    set(fn: () => void, ms: number) {
      const id = window.setTimeout(() => {
        ids.current.delete(id);
        fn();
      }, ms);
      ids.current.add(id);
      return id;
    },
    clear(id: number | undefined) {
      if (id === undefined) return;
      clearTimeout(id);
      ids.current.delete(id);
    },
    raf(fn: (t: number) => void) {
      const id = requestAnimationFrame((t) => {
        rafs.current.delete(id);
        fn(t);
      });
      rafs.current.add(id);
      return id;
    },
    cancelRaf(id: number | undefined) {
      if (id === undefined) return;
      cancelAnimationFrame(id);
      rafs.current.delete(id);
    },
  }).current;
}
