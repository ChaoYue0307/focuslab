import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM build script without type declarations
import { extract, keyOf as scriptKeyOf, placeholders } from '../../scripts/i18n-extract.mjs';
import { DEFAULT_LANG, keyOf, LANGS, makeT, registerDict, tr } from './i18n';
import { defaultSettings, normalize } from './store';

const dir = path.resolve(__dirname, '../locales');
const source: Record<string, { en: string; zh: string }> = JSON.parse(fs.readFileSync(path.join(dir, 'source.json'), 'utf8'));
const dictLangs = LANGS.map((l) => l.code).filter((c) => c !== 'zh' && c !== 'en');

describe('i18n catalog', () => {
  it('runtime and extractor hash strings identically', () => {
    for (const s of ['Today', 'Level {l}', '专注', 'Don’t just take advice — test it']) expect(keyOf(s)).toBe(scriptKeyOf(s));
  });

  it('source.json is up to date with the code (run `npm run i18n`)', () => {
    const { entries, dynamic } = extract();
    expect(dynamic).toEqual([]);
    const ids = [...(entries as Map<string, unknown>).keys()].map((en) => keyOf(en)).sort();
    expect(ids).toEqual(Object.keys(source).sort());
  });

  it.each(dictLangs)('%s has every string with matching placeholders', (lang) => {
    const file = path.join(dir, `${lang}.json`);
    expect(fs.existsSync(file)).toBe(true);
    const dict: Record<string, string> = JSON.parse(fs.readFileSync(file, 'utf8'));
    const missing = Object.keys(source).filter((id) => !dict[id] || !dict[id].trim());
    expect(missing.map((id) => source[id].en)).toEqual([]);
    const broken = Object.keys(source).filter((id) => placeholders(dict[id]).join(',') !== placeholders(source[id].en).join(','));
    expect(broken.map((id) => `${source[id].en} → ${dict[id]}`)).toEqual([]);
  });
});

describe('i18n runtime', () => {
  it('falls back to English and interpolates placeholders, including translated ones', () => {
    registerDict('ja', { [keyOf('Level {l}')]: 'Niveau {l}', [keyOf('morning')]: 'matin' });
    expect(tr('ja', '等级 {l}', 'Level {l}', { l: 3 })).toBe('Niveau 3');
    expect(tr('ja', '未翻译', 'Untranslated')).toBe('Untranslated');
    expect(makeT('ja')('时段：{b}', 'Window: {b}', { b: { zh: '上午', en: 'morning' } })).toBe('Window: matin');
    expect(makeT('zh')('时段：{b}', 'Window: {b}', { b: { zh: '上午', en: 'morning' } })).toBe('时段：上午');
  });

  it('defaults to Simplified Chinese and repairs unknown languages', () => {
    expect(DEFAULT_LANG).toBe('zh');
    expect(defaultSettings().lang).toBe('zh');
    expect(normalize({ settings: { lang: 'xx' }, results: [] }).settings.lang).toBe('zh');
    expect(normalize({ settings: { lang: 'ja' }, results: [] }).settings.lang).toBe('ja');
  });
});
