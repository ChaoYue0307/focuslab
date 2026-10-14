// Generates src/locales/zh-Hant.json from the Simplified Chinese source strings using OpenCC
// (s2twp: Simplified → Traditional with Taiwan phrasing), then applies manual overrides.
import fs from 'node:fs';
import path from 'node:path';
import * as OpenCC from 'opencc-js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/source.json'), 'utf8'));
const convert = OpenCC.Converter({ from: 'cn', to: 'twp' });

// Terms OpenCC gets wrong for this app's domain (applied after conversion).
const FIXES = [
  ['專註', '專注'],
  ['番茄鍾', '番茄鐘'],
  ['別隻', '別只'],
  ['色詞幹擾', '色詞干擾'],
  ['在後臺', '在背景'],
];

const out = {};
for (const [id, { zh }] of Object.entries(source)) {
  let s = convert(zh);
  for (const [a, b] of FIXES) s = s.split(a).join(b);
  out[id] = s;
}
fs.writeFileSync(path.join(ROOT, 'src/locales/zh-Hant.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`zh-Hant: ${Object.keys(out).length} strings`);
