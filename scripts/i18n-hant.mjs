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
  // conversion errors
  ['專註', '專注'],
  ['番茄鍾', '番茄鐘'],
  ['別隻', '別只'],
  ['色詞幹擾', '色詞干擾'],
  ['一齣現', '一出現'], // 出现 must not become 齣 (a measure word for plays)
  ['反應視窗', '反應時限'], // response time window, not a computer window
  ['迴圈', '循環'], // breath cycles, not a programming loop
  // Taiwan vocabulary
  ['在後臺', '在背景'],
  ['賬號', '帳號'],
  ['睡眠質量', '睡眠品質'],
  ['反饋', '回饋'],
  ['刷手機', '滑手機'],
  ['刷社交媒體', '滑社群媒體'],
  ['社交媒體', '社群媒體'],
  ['標籤頁', '分頁'],
  ['復盤者', '回顧者'],
  ['分鐘復盤', '分鐘回顧'],
  ['復盤', '回顧'],
  // keyboard key names as used in Taiwan
  ['空格鍵', '空白鍵'],
  ['按空格', '按空白鍵'],
  ['按 空格', '按空白鍵'],
  ['空格 ', '空白鍵 '],
  ['按回車', '按 Enter'],
  ['回車儲存', '按 Enter 儲存'],
  ['回車 ', 'Enter '],
  ['空白鍵 或', '空白鍵或'],
  ['倒計時', '倒數計時'],
  ['其他應用工作', '其他 App 工作'],
  ['其他應用', '其他 App'],
];

const out = {};
for (const [id, { zh }] of Object.entries(source)) {
  let s = convert(zh);
  for (const [a, b] of FIXES) s = s.split(a).join(b);
  out[id] = s;
}
fs.writeFileSync(path.join(ROOT, 'src/locales/zh-Hant.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`zh-Hant: ${Object.keys(out).length} strings`);
