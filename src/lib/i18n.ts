import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useSettings } from './store';
import type { Lang } from './types';

/**
 * Internationalization.
 *
 * Strings are authored inline as Chinese/English pairs — t('中文', 'English', {n: 3}) or
 * { zh, en } content objects — so the two source languages never drift apart. Every other
 * language is a dictionary in src/locales/<code>.json mapping keyOf(English) → translation,
 * loaded on demand. `npm run i18n` extracts the source strings; a unit test fails if any
 * language is missing a string or mangles a {placeholder}.
 */

export { DEFAULT_LANG, LANGS, isLang, localeOf, type LangMeta } from './langs';
import { localeOf } from './langs';

/** Stable short id for an English source string (FNV-1a, base36). Must match scripts/i18n-extract.mjs. */
const idCache = new Map<string, string>();
export function keyOf(en: string): string {
  let id = idCache.get(en);
  if (id) return id;
  let h = 2166136261;
  for (let i = 0; i < en.length; i++) {
    h ^= en.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  id = (h >>> 0).toString(36);
  idCache.set(en, id);
  return id;
}

// ---------- dictionaries (loaded on demand) ----------
type Dict = Record<string, string>;
const loaders = import.meta.glob<{ default: Dict }>(['../locales/*.json', '!../locales/source.json']);
const dicts: Partial<Record<Lang, Dict>> = {};
const listeners = new Set<() => void>();
let version = 0;

const needsDict = (lang: Lang) => lang !== 'zh' && lang !== 'en';
export const isLangReady = (lang: Lang) => !needsDict(lang) || !!dicts[lang];

export async function loadLang(lang: Lang): Promise<void> {
  if (isLangReady(lang)) return;
  const load = loaders[`../locales/${lang}.json`];
  try {
    dicts[lang] = load ? (await load()).default : {};
  } catch {
    // Network hiccup or a stale deploy: show English rather than a blank screen.
    dicts[lang] = {};
  }
  version++;
  listeners.forEach((l) => l());
}

/** Test/SSR hook: register a dictionary synchronously. */
export function registerDict(lang: Lang, dict: Dict) {
  dicts[lang] = dict;
  version++;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** True once the dictionary for `lang` is available (always true for zh/en). */
export function useLangReady(lang: Lang): boolean {
  useSyncExternalStore(subscribe, () => version, () => version);
  useEffect(() => {
    void loadLang(lang);
  }, [lang]);
  return isLangReady(lang);
}

// ---------- translation ----------
export type Bi = { zh: string; en: string };
export type Vars = Record<string, string | number | Bi>;

function interpolate(s: string, lang: Lang, vars?: Vars) {
  if (!vars) return s;
  for (const k in vars) {
    const v = vars[k];
    const text = typeof v === 'object' ? translate(lang, v.zh, v.en) : String(v);
    s = s.split(`{${k}}`).join(text);
  }
  return s;
}

function translate(lang: Lang, zh: string, en: string): string {
  if (lang === 'zh') return zh;
  if (lang === 'en') return en;
  return dicts[lang]?.[keyOf(en)] ?? en;
}

/** Translate outside React: tr(lang, '中文', 'English', vars). */
export function tr(lang: Lang, zh: string, en: string, vars?: Vars): string {
  return interpolate(translate(lang, zh, en), lang, vars);
}

/** Translate a content object, optionally with {placeholders}. */
export const bi = (b: Bi, lang: Lang, vars?: Vars) => tr(lang, b.zh, b.en, vars);

export interface T {
  (zh: string, en: string, vars?: Vars): string;
  lang: Lang;
  locale: string;
}

export function makeT(lang: Lang): T {
  const t = ((zh: string, en: string, vars?: Vars) => tr(lang, zh, en, vars)) as T;
  t.lang = lang;
  t.locale = localeOf(lang);
  return t;
}

export function useT(): T {
  const { lang } = useSettings();
  const ready = useLangReady(lang);
  // `ready` is a dependency so components re-translate once the dictionary arrives.
  return useMemo(() => makeT(lang), [lang, ready]);
}

/** Capitalize the first letter (for words that start a label). */
export const capFirst = (s: string, locale: string) => (s ? s.charAt(0).toLocaleUpperCase(locale) + s.slice(1) : s);
