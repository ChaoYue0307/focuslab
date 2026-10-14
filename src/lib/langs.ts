import type { Lang } from './types';

export interface LangMeta {
  code: Lang;
  name: string; // native name
  locale: string; // BCP-47 tag for Intl and <html lang>
}

// es / fr / de / pt / ru are planned: add the entry back once src/locales/<code>.json is complete.
export const LANGS: LangMeta[] = [
  { code: 'zh', name: '简体中文', locale: 'zh-CN' },
  { code: 'zh-Hant', name: '繁體中文', locale: 'zh-TW' },
  { code: 'en', name: 'English', locale: 'en-US' },
  { code: 'ja', name: '日本語', locale: 'ja-JP' },
  { code: 'ko', name: '한국어', locale: 'ko-KR' },
];

export const isLang = (x: unknown): x is Lang => LANGS.some((l) => l.code === x);
export const localeOf = (lang: Lang) => LANGS.find((l) => l.code === lang)?.locale ?? 'en-US';

/** Best match for the browser's preferred languages. */
export function detectLang(prefs: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []): Lang {
  for (const raw of prefs) {
    const p = (raw || '').toLowerCase();
    if (/^zh-(tw|hk|mo|hant)/.test(p) || p.includes('hant')) return 'zh-Hant';
    if (p.startsWith('zh')) return 'zh';
    const base = p.split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}
