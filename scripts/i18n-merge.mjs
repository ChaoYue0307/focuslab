// Merges translation sheets (scripts/i18n-parts/<lang>.*.tsv, lines of "id<TAB>text") into src/locales/<lang>.json.
// Usage: node scripts/i18n-merge.mjs ja ko es ...
import fs from 'node:fs';
import path from 'node:path';
import { placeholders } from './i18n-extract.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PARTS = path.join(ROOT, 'scripts', 'i18n-parts');
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/source.json'), 'utf8'));
const CJK = new Set(['ja', 'ko', 'zh-Hant']);

for (const lang of process.argv.slice(2)) {
  const files = fs.readdirSync(PARTS).filter((f) => f.startsWith(lang + '.') && f.endsWith('.tsv')).sort();
  const dict = {};
  const problems = [];
  for (const f of files) {
    for (const line of fs.readFileSync(path.join(PARTS, f), 'utf8').split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue;
      const tab = line.indexOf('\t');
      if (tab < 0) {
        problems.push(`no tab: ${line.slice(0, 60)}`);
        continue;
      }
      const id = line.slice(0, tab).trim();
      let text = line.slice(tab + 1);
      if (!source[id]) {
        problems.push(`unknown id ${id}: ${text.slice(0, 50)}`);
        continue;
      }
      const en = source[id].en;
      // Keep the source's surrounding spaces in space-separated scripts (labels like "Find " glue to a value).
      if (!CJK.has(lang)) {
        text = text.trim();
        if (/^\s/.test(en)) text = ' ' + text;
        if (/\s$/.test(en)) text = text + ' ';
      } else text = text.replace(/^\s+|\s+$/g, (m) => (m.includes('\n') ? '' : m));
      if (placeholders(text).join() !== placeholders(en).join()) problems.push(`placeholders ${id}: "${en}" → "${text}"`);
      if (dict[id]) problems.push(`duplicate ${id}`);
      dict[id] = text;
    }
  }
  const missing = Object.keys(source).filter((id) => !dict[id]);
  const ordered = Object.fromEntries(Object.keys(source).filter((id) => dict[id]).map((id) => [id, dict[id]]));
  fs.writeFileSync(path.join(ROOT, 'src/locales', `${lang}.json`), JSON.stringify(ordered, null, 1) + '\n');
  console.log(`${lang}: ${Object.keys(ordered).length}/${Object.keys(source).length} strings from ${files.length} sheet(s)`);
  for (const p of problems) console.log('  ! ' + p);
  for (const id of missing.slice(0, 30)) console.log(`  missing ${id}: ${source[id].en.slice(0, 70)}`);
  if (missing.length > 30) console.log(`  … ${missing.length - 30} more missing`);
}
