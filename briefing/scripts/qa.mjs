// QA for the briefing: npm run qa
//  1. every on-screen line is held ≥ 0.3 s per word + 1.5 s (READING in brand.ts)
//  2. no amount anywhere but LEDGER, and every LEDGER amount cites a retrieved source
//  3. no banned or quarantined wording in content.ts (decisions.md D-053)
//  4. no spring() in src/
//  5. no photo, audio or likeness assets, and no reference to them in src/
//  6. every file in public/ is in ASSETS.md with a matching git blob sha
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const { PIPELINE_TEST, SCENES, ORDER, LEDGER, tr } = await import('../src/content.ts');
let failures = 0;
const fail = (msg) => {
  failures++;
  console.log('  ✗ ' + msg);
};
const ok = (msg) => console.log('  ✓ ' + msg);

const brand = fs.readFileSync('src/brand.ts', 'utf8');
const [, perWord, base] = brand.match(/READING = \{ perWord: ([\d.]+), base: ([\d.]+) \}/).map(Number);
const words = (t) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const need = (t) => words(t) * perWord + base;

// Collect every Line ({ en, fr }) with its scene duration.
const lines = [];
const walk = (node, where, dur) => {
  if (!node || typeof node !== 'object') return;
  if ('en' in node && 'fr' in node) return lines.push({ where, dur, line: node });
  for (const [k, v] of Object.entries(node)) walk(v, `${where}.${k}`, dur);
};
walk(PIPELINE_TEST, 'PIPELINE_TEST', PIPELINE_TEST.dur);
for (const k of ORDER) walk(SCENES[k], `SCENES.${k}`, SCENES[k].dur);

// 1. Reading time.
console.log(`\n1. Reading time (${perWord} s per word + ${base} s)`);
let checked = 0;
const empty = lines.filter((l) => !l.line.en.trim()).length;
for (const { where, dur, line } of lines) {
  const text = tr(line);
  if (!text.trim() || !line.at) continue;
  const [from, to] = line.at;
  const held = Math.min(to, dur) - from;
  checked++;
  if (held + 1e-6 < need(text)) fail(`${where}: held ${held.toFixed(2)} s, needs ${need(text).toFixed(2)} s — “${text}”`);
}
ok(`${checked} timed lines checked; ${empty} EN slots still empty (script lane)`);
const totalSec = ORDER.reduce((t, k) => t + SCENES[k].dur, 0);
console.log(`  outline runtime ${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')} (provisional)`);

// 2. Amounts only in the ledger, each with a source.
console.log('\n2. Amounts and sources');
const money = /[$€£¥]|\b(?:CAD|USD|EUR)\b|\d\s*(?:\$|k\b|%)|\bper (?:month|year|user)\b|\/(?:mo|month|yr|year)\b/i;
for (const { where, line } of lines) {
  for (const lang of ['en', 'fr']) if (money.test(line[lang])) fail(`${where}.${lang} looks like an amount outside LEDGER: “${line[lang]}”`);
}
const iso = /^\d{4}-\d{2}-\d{2}$/;
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
  }
  if (r.status === 'measured' && r.amount === null) fail(`${id}: measured but no amount`);
}
ok(`${LEDGER.length} ledger rows checked`);

// 3. Banned and quarantined wording (text values only).
console.log('\n3. Banned and quarantined wording');
const banned = [
  /\bguarantee/i, /\bsafe\b/i, /\bsecure\b/i, /\breturns\b/i, /\bbest\b/i, /#1\b/, /\bbook now\b/i,
  /gestionnaire de portefeuille agréé/i, /financial planner since/i, /\bNathalie\b/, /\bas seen in\b/i,
];
let hits = 0;
for (const { where, line } of lines) {
  for (const lang of ['en', 'fr']) for (const b of banned) if (b.test(line[lang])) { hits++; fail(`${where}.${lang} matches ${b}`); }
}
if (!hits) ok('zero hits');

// 4. Springs.
console.log('\n4. No spring()');
const files = [];
const walkDir = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walkDir(path.join(d, e.name)) : files.push(path.join(d, e.name))));
walkDir('src');
const springs = files.filter((f) => /\bspring\(/.test(fs.readFileSync(f, 'utf8')));
springs.forEach((f) => fail(`spring( in ${f}`));
if (!springs.length) ok('none');

// 5. No photos, audio or likeness.
console.log('\n5. No photo, audio or likeness');
const pub = [];
const walkPub = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walkPub(path.join(d, e.name)) : pub.push(path.join(d, e.name))));
walkPub('public');
const badFile = pub.filter((f) => /\.(mp3|wav|m4a|aac|ogg|flac|jpe?g|webp|heic|mov|mp4|webm)$/i.test(f) || /portrait|bill-|avatar|voice/i.test(path.basename(f)));
badFile.forEach((f) => fail(`forbidden asset ${f}`));
const badRef = files.filter((f) => /bill-portrait|en\.mp3|<Audio|<Video|<OffthreadVideo|@remotion\/media/.test(fs.readFileSync(f, 'utf8')));
badRef.forEach((f) => fail(`reference to photo/audio/video in ${f}`));
if (!badFile.length && !badRef.length) ok(`${pub.length} public files, none forbidden; no references in src/`);

// 6. Provenance.
console.log('\n6. Provenance (ASSETS.md)');
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
