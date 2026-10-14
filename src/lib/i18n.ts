import { useMemo } from 'react';
import { useSettings } from './store';
import type { Lang } from './types';

export interface T {
  (zh: string, en: string, vars?: Record<string, string | number>): string;
  lang: Lang;
}

/** Bilingual strings live next to the UI that uses them: t('中文', 'English', {n: 3}). */
export function makeT(lang: Lang): T {
  const t = ((zh: string, en: string, vars?: Record<string, string | number>) => {
    let s = lang === 'zh' ? zh : en;
    if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
    return s;
  }) as T;
  t.lang = lang;
  return t;
}

export function useT(): T {
  const { lang } = useSettings();
  return useMemo(() => makeT(lang), [lang]);
}

export type Bi = { zh: string; en: string };
export const bi = (b: Bi, lang: Lang) => b[lang];
