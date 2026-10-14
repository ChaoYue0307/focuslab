// Heuristic quality audit of every translation against its English source.
// Flags likely mistakes for human review: changed/missing numbers, lost key names and symbols,
// untranslated text, wrong scripts, suspicious lengths (misplaced ids), shared translations and
// missing sentence punctuation. Usage: node scripts/i18n-audit.mjs [lang ...]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, 'src/locales');
const source = JSON.parse(fs.readFileSync(path.join(DIR, 'source.json'), 'utf8'));
const CJK = new Set(['ja', 'ko', 'zh-Hant']);
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['zh-Hant', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru'];

// Tokens that must survive translation verbatim (matched as whole words) when present in the English source.
const KEEP = ['PVT', 'SART', 'GRE', 'NASA', 'FocusLab', 'JSON', 'MIT', 'Apple', 'Google', 'Outlook', 'ON', 'OFF', 'd′', 'd=', '←', '↑', '↓', '①', '②', '③'];
// Latin words allowed inside CJK / Cyrillic translations (case-insensitive).
const LATIN_OK = new Set(['pvt', 'sart', 'gre', 'nasa', 'focuslab', 'json', 'mit', 'apple', 'google', 'outlook', 'on', 'off', 'enter', 'n-back', 'back', 'ms', 'sns', 'simons', 'et', 'al', 'stroop', 'flanker', 'pomodoro', 'flow', 'adhd']);

const hasToken = (s, tok) => (/^[A-Za-z]+$/.test(tok) ? new RegExp(`(^|[^A-Za-z])${tok}([^A-Za-z]|$)`).test(s) : s.includes(tok));
const numbers = (s) => (s.replace(/\{\w+\}/g, '').match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(',', '.'));
// Keyboard keys: letters in "press X", "X ·", "X /", "/ X", "Keys: D", or key lists like "D F J K".
const keys = (s) => {
  const out = [];
  for (const m of s.matchAll(/(?:press|Press|pressing|Keys:|·|\/)\s*([ADFJKLR])(?![\p{L}\d])|(?<![\p{L}\d])([DFJKLR])(?=\s*(?:·|\/|\s[FJK]\b|\s[a-z]+\s·))/gu)) out.push(m[1] || m[2]);
  return out.sort();
};
const endsSentence = (s) => /[.!?…。！？」）)»”"]\s*$/.test(s);

const report = {};
for (const lang of langs) {
  const dict = JSON.parse(fs.readFileSync(path.join(DIR, `${lang}.json`), 'utf8'));
  const issues = [];
  const add = (kind, id, msg) => issues.push(`[${kind}] ${id} :: ${source[id].en.slice(0, 70)}${msg ? ` → ${msg}` : ''}`);
  const byText = new Map();
  for (const [id, { en }] of Object.entries(source)) {
    const tr = dict[id];
    if (!tr) {
      add('MISSING', id);
      continue;
    }
    // numbers
    const ne = numbers(en), nt = numbers(tr);
    const missingNums = ne.filter((n) => !nt.includes(n));
    if (missingNums.length) add('NUM', id, `missing ${missingNums.join(',')} in "${tr.slice(0, 60)}"`);
    // protected tokens & key letters
    for (const k of KEEP) if (hasToken(en, k) && !hasToken(tr, k)) add('TOKEN', id, `lost "${k}" in "${tr.slice(0, 60)}"`);
    const lostKeys = keys(en).filter((k) => !new RegExp(`(^|[^A-Za-z])${k}([^A-Za-z]|$)`).test(tr));
    if (lostKeys.length) add('KEYS', id, `lost key ${lostKeys.join('')} in "${tr.slice(0, 60)}"`);
    // untranslated (identical to English and contains a real word)
    if (tr === en && /[a-z]{3,}/.test(en)) add('SAME', id, tr);
    // script checks
    if (CJK.has(lang) || lang === 'ru') {
      const words = (tr.replace(/\{\w+\}/g, '').match(/[A-Za-z][A-Za-z′'-]{2,}/g) || []).filter((w) => !LATIN_OK.has(w.toLowerCase()));
      if (words.length) add('LATIN', id, `${words.join(' ')} in "${tr.slice(0, 60)}"`);
    } else if (/[぀-ヿ㐀-鿿가-힯Ѐ-ӿ]/.test(tr)) add('SCRIPT', id, tr.slice(0, 60));
    if (lang !== 'zh-Hant' && /[一-鿿]/.test(tr) && lang !== 'ja') add('HANZI', id, tr.slice(0, 60));
    // length ratio (misplaced id detector)
    if (en.length > 24) {
      const r = tr.length / en.length;
      const [lo, hi] = CJK.has(lang) ? [0.12, 1.2] : [0.55, 2.0];
      if (r < lo || r > hi) add('LEN', id, `ratio ${r.toFixed(2)} "${tr.slice(0, 60)}"`);
    }
    // punctuation
    if (/[.!?]$/.test(en.trim()) && en.length > 30 && !endsSentence(tr)) add('PUNCT', id, `"${tr.slice(-40)}"`);
    // shared translations
    const k = tr.trim().toLowerCase();
    byText.set(k, [...(byText.get(k) || []), id]);
  }
  for (const [, ids] of byText) {
    const ens = new Set(ids.map((id) => source[id].en.trim().toLowerCase().replace(/[.!:]$/, '')));
    if (ens.size > 1) issues.push(`[SHARED] ${ids.map((id) => `"${source[id].en}"`).join(' / ')} → "${dict[ids[0]]}"`);
  }
  report[lang] = issues;
}
for (const [lang, issues] of Object.entries(report)) {
  console.log(`\n=== ${lang}: ${issues.length} flags`);
  for (const i of issues) console.log('  ' + i);
}
