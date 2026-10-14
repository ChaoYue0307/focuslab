import type { Lang } from './types';

export interface LangMeta {
  code: Lang;
  name: string; // native name
  locale: string; // BCP-47 tag for Intl and <html lang>
}

export const LANGS: LangMeta[] = [
  { code: 'zh', name: '简体中文', locale: 'zh-CN' },
  { code: 'zh-Hant', name: '繁體中文', locale: 'zh-TW' },
  { code: 'en', name: 'English', locale: 'en-US' },
  { code: 'ja', name: '日本語', locale: 'ja-JP' },
  { code: 'ko', name: '한국어', locale: 'ko-KR' },
  { code: 'es', name: 'Español', locale: 'es-ES' },
  { code: 'fr', name: 'Français', locale: 'fr-FR' },
  { code: 'de', name: 'Deutsch', locale: 'de-DE' },
  { code: 'pt', name: 'Português', locale: 'pt-BR' },
  { code: 'ru', name: 'Русский', locale: 'ru-RU' },
];

export const isLang = (x: unknown): x is Lang => LANGS.some((l) => l.code === x);
export const localeOf = (lang: Lang) => LANGS.find((l) => l.code === lang)?.locale ?? 'en-US';

/** Everyone starts in Simplified Chinese; other languages are one tap away (or via ?lang= links). */
export const DEFAULT_LANG: Lang = 'zh';
