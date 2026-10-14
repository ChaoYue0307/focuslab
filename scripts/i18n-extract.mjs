// Extracts every translatable string from the source with the TypeScript AST.
//
// Translatable strings are authored inline as Chinese/English pairs:
//   t('中文', 'English', vars)            — UI strings
//   { zh: '中文', en: 'English' }          — content objects (Bi)
// The English text is the key; other locales map hash(English) → translation.
//
// Usage: node scripts/i18n-extract.mjs [--write]   (writes src/locales/source.json)
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src');

/** Stable short id for an English source string (FNV-1a, base36). */
export function keyOf(en) {
  let h = 2166136261;
  for (let i = 0; i < en.length; i++) {
    h ^= en.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function walkFiles(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walkFiles(p, out);
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f)) out.push(p);
  }
  return out;
}

const literal = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);

export function extract() {
  const entries = new Map(); // en → { zh, files:Set }
  const dynamic = []; // template strings with ${} that can't be translated
  const add = (zh, en, file) => {
    if (!en.trim()) return; // empty strings need no translation
    const e = entries.get(en) || { zh, files: new Set() };
    e.files.add(path.relative(ROOT, file));
    entries.set(en, e);
  };
  for (const file of walkFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node) => {
      // t('zh', 'en', ...)
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && node.arguments.length >= 2) {
        const [a, b] = node.arguments;
        const zh = literal(a);
        const en = literal(b);
        if (zh !== null && en !== null) add(zh, en, file);
        else if (ts.isTemplateExpression(a) || ts.isTemplateExpression(b)) dynamic.push(`${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      }
      // tr(lang, 'zh', 'en', ...)
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'tr' && node.arguments.length >= 3) {
        const zh = literal(node.arguments[1]);
        const en = literal(node.arguments[2]);
        if (zh !== null && en !== null) add(zh, en, file);
        else if (ts.isTemplateExpression(node.arguments[1]) || ts.isTemplateExpression(node.arguments[2])) dynamic.push(`${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      }
      // { zh: '...', en: '...' }
      if (ts.isObjectLiteralExpression(node)) {
        const props = Object.fromEntries(
          node.properties.filter((p) => ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))).map((p) => [p.name.text, p.initializer]),
        );
        if (props.zh && props.en) {
          const zh = literal(props.zh);
          const en = literal(props.en);
          if (zh !== null && en !== null) add(zh, en, file);
          else if (ts.isTemplateExpression(props.zh) || ts.isTemplateExpression(props.en)) dynamic.push(`${path.relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return { entries, dynamic };
}

/** Placeholders like {n} must survive translation. */
export const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const { entries, dynamic } = extract();
  const source = {};
  for (const [en, { zh }] of [...entries].sort((a, b) => keyOf(a[0]).localeCompare(keyOf(b[0])))) source[keyOf(en)] = { en, zh };
  const chars = [...entries.keys()].reduce((a, s) => a + s.length, 0);
  console.log(`strings: ${entries.size}, english chars: ${chars}`);
  if (dynamic.length) console.log(`dynamic (needs placeholders): ${dynamic.length}\n  ` + dynamic.join('\n  '));
  const ids = Object.keys(source);
  if (new Set(ids).size !== ids.length) console.log('HASH COLLISION');
  if (process.argv.includes('--write')) {
    fs.mkdirSync(path.join(SRC, 'locales'), { recursive: true });
    fs.writeFileSync(path.join(SRC, 'locales', 'source.json'), JSON.stringify(source, null, 1) + '\n');
    console.log('wrote src/locales/source.json');
  }
}
