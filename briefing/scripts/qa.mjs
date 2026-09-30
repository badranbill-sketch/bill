// QA for the briefing: npm run qa
//  1. every on-screen line is held ≥ 0.3 s per word + 1.5 s (READING in brand.ts), items with all their words,
//     LEDGER rows with every word they show, and rows that leave with their page (pages.ts) until they go
//  2. runtime: 5 to 7 minutes, frames as the Briefing composition counts them
//  3. no amount anywhere but LEDGER; every LEDGER amount cites a retrieved source; every amount a row shows is
//     in its record; no $ / CAD / USD / EUR amount in any component source
//  4. banned or quarantined wording in any on-screen text (decisions.md D-053), plus: '60-minute', 'one-hour',
//     'guarantee', 'you can retire', Zoom named as our tool; the frozen offer wording is present
//  5. no spring() in src/
//  6. no photo, audio or likeness assets, and no reference to them in src/
//  7. every file in public/ is in ASSETS.md with a matching git blob sha
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const C = await import('../src/content.ts');
const { PIPELINE_TEST, SCENES, ORDER, LEDGER, TAGS, UNVERIFIED, EXAMPLE, INTERNAL_SOURCE, tr, itemText, ledgerText } = C;
const { paginate, PER_PAGE } = await import('../src/briefing/pages.ts');
let failures = 0;
const fail = (msg) => {
  failures++;
  console.log('  ✗ ' + msg);
};
const ok = (msg) => console.log('  ✓ ' + msg);

const brand = fs.readFileSync('src/brand.ts', 'utf8');
const [, perWord, base] = brand.match(/READING = \{ perWord: ([\d.]+), base: ([\d.]+) \}/).map(Number);
const FPS = Number(brand.match(/export const FPS = (\d+)/)[1]);
const words = (t) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const need = (t) => words(t) * perWord + base;
const isLine = (n) => n && typeof n === 'object' && 'en' in n && 'fr' in n;
const ledgerRow = (id) => LEDGER.find((r) => r.id === id);

// Timed units: every Line with `at` (an item counts all its words), and every LEDGER cue { id, at }.
const units = [];
const walk = (node, where, dur, sceneId) => {
  if (!node || typeof node !== 'object') return;
  if (isLine(node)) {
    if (node.at) units.push({ where, dur, sceneId, at: node.at, text: itemText({ ...node, en: tr(node) }) });
    return;
  }
  if (typeof node.id === 'string' && Array.isArray(node.at) && ledgerRow(node.id)) {
    units.push({ where, dur, sceneId, at: node.at, text: ledgerText(ledgerRow(node.id)), cue: node });
    return;
  }
  for (const [k, v] of Object.entries(node)) walk(v, `${where}.${k}`, dur, sceneId);
};
walk(PIPELINE_TEST, 'PIPELINE_TEST', PIPELINE_TEST.dur, 'PIPELINE_TEST');
for (const k of ORDER) walk(SCENES[k], `SCENES.${k}`, SCENES[k].dur, SCENES[k].id);

// Rows that leave with their page stay only until the next page's first row appears.
const until = new Map();
for (const k of ORDER) {
  const s = SCENES[k];
  if (s.ledger && PER_PAGE[s.id]) {
    const rows = s.ledger.rows.map((cue) => ({ ...cue, kind: ledgerRow(cue.id)?.kind }));
    for (const page of paginate(rows, PER_PAGE[s.id], (r) => r.kind)) {
      if (page.until !== null) for (const { index } of page.rows) until.set(s.ledger.rows[index], page.until);
    }
  }
}

// 1. Reading time.
console.log(`\n1. Reading time (${perWord} s per word + ${base} s)`);
let checked = 0;
for (const u of units) {
  if (!u.text.trim()) continue;
  const to = u.cue && until.has(u.cue) ? until.get(u.cue) : Math.min(u.at[1], u.dur);
  const held = to - u.at[0];
  checked++;
  if (held + 1e-6 < need(u.text)) fail(`${u.where}: held ${held.toFixed(2)} s, needs ${need(u.text).toFixed(2)} s — “${u.text}”`);
}
ok(`${checked} timed lines checked (${until.size} ledger rows leave with their page)`);

// 2. Runtime.
console.log('\n2. Runtime');
const frames = ORDER.reduce((t, k) => t + Math.round(SCENES[k].dur * FPS), 0);
const secs = frames / FPS;
const mmss = `${Math.floor(secs / 60)}:${(secs % 60).toFixed(1).padStart(4, '0')}`;
if (secs > 420) fail(`runtime ${mmss} is over 7:00`);
else if (secs < 300) fail(`runtime ${mmss} is under 5:00`);
else ok(`${ORDER.length} scenes, ${frames} frames at ${FPS} fps = ${mmss} (cap 7:00, ${(420 - secs).toFixed(1)} s to spare)`);

// Every on-screen text: scene lines (with nested headings, labels, owners), tags, markers, LEDGER words.
const texts = [];
const collect = (node, where) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((x, i) => collect(x, `${where}.${i}`));
  if (isLine(node)) texts.push({ where, en: node.en, fr: node.fr, ledger: where.startsWith('LEDGER') });
  for (const [k, v] of Object.entries(node)) if (v && typeof v === 'object') collect(v, `${where}.${k}`);
};
collect(PIPELINE_TEST, 'PIPELINE_TEST');
for (const k of ORDER) collect(SCENES[k], `SCENES.${k}`);
collect(TAGS, 'TAGS');
collect({ UNVERIFIED, EXAMPLE, INTERNAL_SOURCE }, 'MARKERS');
LEDGER.forEach((r) => collect({ item: r.item, trigger: r.trigger, shown: r.shown, note: r.note }, `LEDGER ${r.id}`));
for (const k of ORDER) texts.push({ where: `SCENES.${k}.name`, en: SCENES[k].name, fr: '' });

// 3. Amounts only in the ledger, each with a source.
console.log('\n3. Amounts and sources');
const money = /[$€£¥]|\b(?:CAD|USD|EUR)\b|\d\s*(?:\$|k\b|%)|\bper (?:month|year|user)\b|\/(?:mo|month|yr|year)\b/i;
for (const t of texts.filter((x) => !x.ledger)) {
  for (const lang of ['en', 'fr']) if (money.test(t[lang])) fail(`${t.where}.${lang} looks like an amount outside LEDGER: “${t[lang]}”`);
}
const iso = /^\d{4}-\d{2}-\d{2}$/;
const amountRe = /(?:CA\$|US\$|[$€£]|\b(?:CAD|USD|EUR)\s?)\s?(\d[\d,]*(?:\.\d+)?)|(\d+(?:\.\d+)?)\s?%/g;
const nums = (s) => [...(s ?? '').matchAll(amountRe)].map((m) => m[1] ?? m[2]);
const tokens = (s) => (s ?? '').match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
const allRecorded = new Set(LEDGER.flatMap((r) => tokens(r.amount)));
for (const r of LEDGER) {
  const id = `LEDGER ${r.id}`;
  if (r.amount !== null) {
    if (!r.source) fail(`${id}: amount without a source`);
    else {
      if (!/^https?:\/\//.test(r.source.url)) fail(`${id}: source url is not a URL`);
      if (!iso.test(r.source.retrieved)) fail(`${id}: retrieved must be an ISO date`);
      if (r.source.basis === 'blocked') fail(`${id}: a blocked page cannot supply an amount`);
    }
    if (!r.currency) fail(`${id}: amount without the currency as displayed`);
    if (!r.cadence) fail(`${id}: amount without a cadence (monthly, annual, per-user, per-transaction…)`);
    if (!r.shown) fail(`${id}: an amount must be shown through \`shown\``);
  }
  if (r.status === 'measured' && r.amount === null) fail(`${id}: measured but no amount`);
  // Every number the row shows next to a currency or a % must be in its own record.
  for (const n of nums(r.shown?.en)) if (!tokens(r.amount).includes(n)) fail(`${id}: shows ${n}, which is not in its recorded amount “${r.amount}”`);
  if (r.amount === null && nums(r.shown?.en).length) fail(`${id}: shows an amount but has none recorded`);
  for (const k of ['item', 'trigger', 'note']) if (nums(r[k]?.en).length) fail(`${id}.${k} carries an amount outside \`shown\``);
}
// No amount written into a component, script or style: only content.ts's LEDGER may carry one.
const srcFiles = [];
const walkDir = (d, out) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walkDir(path.join(d, e.name), out) : out.push(path.join(d, e.name))));
walkDir('src', srcFiles);
const codeFiles = srcFiles.filter((f) => /\.(tsx?|css)$/.test(f) && !f.endsWith(path.join('src', 'content.ts')) && !f.includes(path.join('src', 'data')));
let codeHits = 0;
for (const f of codeFiles) {
  const code = fs.readFileSync(f, 'utf8');
  for (const m of code.matchAll(/(?:CA\$|US\$|(?<![`{\w])\$(?!\{)|€|£|\b(?:CAD|USD|EUR) ?)(\d[\d,]*(?:\.\d+)?)/g)) {
    if (!allRecorded.has(m[1])) {
      codeHits++;
      fail(`${f}: amount “${m[0]}” is not in LEDGER`);
    } else {
      codeHits++;
      fail(`${f}: amount “${m[0]}” belongs in LEDGER (content.ts), not in a component`);
    }
  }
}
if (UNVERIFIED.en !== 'unverified — confirm at checkout') fail(`UNVERIFIED reads “${UNVERIFIED.en}”, not “unverified — confirm at checkout”`);
const ledgerTsx = fs.readFileSync('src/primitives/Ledger.tsx', 'utf8');
if (!/snippet-only'\s*\?\s*tr\(UNVERIFIED\)/.test(ledgerTsx)) fail('Ledger.tsx does not show UNVERIFIED for every snippet-only row');
if (/\btotal|reduce\(/i.test(ledgerTsx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))) fail('Ledger.tsx looks like it adds amounts up');
ok(`${LEDGER.length} ledger rows checked; ${codeFiles.length} component files carry ${codeHits} amounts`);

// 4. Banned and quarantined wording (every on-screen text).
console.log('\n4. Banned and quarantined wording');
const banned = [
  /\bguarantee/i, /\bsafe\b/i, /\bsecure\b/i, /\breturns\b/i, /\bbest\b/i, /#1\b/, /\bbook now\b/i,
  /gestionnaire de portefeuille agréé/i, /financial planner since/i, /\bNathalie\b/, /\bas seen in\b/i,
  /\b(?:60|sixty)[- ]?min(?:ute)?\b/i, /\b(?:one|1)[- ]hour\b/i, /\byou can retire\b/i,
];
let hits = 0;
for (const t of texts) {
  for (const lang of ['en', 'fr']) {
    const v = t[lang] ?? '';
    for (const b of banned) if (b.test(v)) { hits++; fail(`${t.where}.${lang} matches ${b}: “${v}”`); }
    if (/\bZoom\b/i.test(v) && !/\bnot used\b|\bpas utilisé/i.test(v)) { hits++; fail(`${t.where}.${lang} names Zoom as a tool we use: “${v}”`); }
    if (/consult/i.test(v) && /\b60\b|sixty|\bhour\b/i.test(v)) { hits++; fail(`${t.where}.${lang}: the book's consultation is 30 minutes, never 60: “${v}”`); }
  }
}
const all = texts.map((t) => t.en).join('\n');
for (const must of ['one 30-minute consultation', 'Free 15-minute introduction', 'Free PDF guide', 'only if the fit is mutual']) {
  if (!all.includes(must)) { hits++; fail(`the frozen offer wording “${must}” is missing`); }
}
if (!hits) ok(`zero hits in ${texts.length} on-screen texts; the four frozen offers are present`);

// 5. Springs.
console.log('\n5. No spring()');
const springs = srcFiles.filter((f) => /\bspring\(/.test(fs.readFileSync(f, 'utf8')));
springs.forEach((f) => fail(`spring( in ${f}`));
if (!springs.length) ok('none');

// 6. No photos, audio or likeness.
console.log('\n6. No photo, audio or likeness');
const pub = [];
walkDir('public', pub);
const badFile = pub.filter((f) => /\.(mp3|wav|m4a|aac|ogg|flac|jpe?g|webp|heic|mov|mp4|webm)$/i.test(f) || /portrait|bill-|avatar|voice/i.test(path.basename(f)));
badFile.forEach((f) => fail(`forbidden asset ${f}`));
const badRef = srcFiles.filter((f) => /bill-portrait|en\.mp3|<Audio|<Video|<OffthreadVideo|<Html5Audio|@remotion\/media/.test(fs.readFileSync(f, 'utf8')));
badRef.forEach((f) => fail(`reference to photo/audio/video in ${f}`));
if (!badFile.length && !badRef.length) ok(`${pub.length} public files, none forbidden; no audio, video or photo references in src/`);

// 7. Provenance.
console.log('\n7. Provenance (ASSETS.md)');
const assets = fs.readFileSync('ASSETS.md', 'utf8');
for (const f of pub) {
  const rel = path.relative('.', f);
  const row = assets.split('\n').find((l) => l.includes(`\`${rel}\``));
  if (!row) { fail(`${rel} is not listed in ASSETS.md`); continue; }
  const sha = execFileSync('git', ['hash-object', f]).toString().trim();
  if (!row.includes(sha)) fail(`${rel}: blob ${sha} does not match ASSETS.md`);
}
ok(`${pub.length} files checked against ASSETS.md`);

console.log(failures ? `\n${failures} problem(s).` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
