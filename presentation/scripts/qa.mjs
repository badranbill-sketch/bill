// QA for the presentation: node scripts/qa.mjs
//  1. every text block is held ≥ words / 3.5 + 1 seconds
//  2. total runtime ≤ 4:45
//  3. no banned words in src/content.ts
//  4. no spring() anywhere in src/
//  5. lists every brass use per scene file, for a human check (one accent per scene)
import fs from 'node:fs';
import path from 'node:path';

const { SCENES, ORDER, TOTAL_SECONDS, tr } = await import('../src/content.ts');
let failures = 0;
const fail = (msg) => {
  failures++;
  console.log('  ✗ ' + msg);
};

// 1. Reading time.
console.log('\n1. Reading time (words / 3.5 + 1 s)');
const words = (t) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
let checked = 0;
let tightest = { slack: Infinity };
for (const k of ORDER) {
  const scene = SCENES[k];
  const out = (k === 's12' ? 36 : 20) / 30;
  const walk = (node, where) => {
    if (!node || typeof node !== 'object') return;
    if ('en' in node && 'fr' in node) {
      if (!node.at) return;
      const [from, to] = node.at;
      const end = Math.min(to, scene.dur - out);
      const held = end - from;
      const text = tr(node);
      const need = words(text) / 3.5 + 1;
      checked++;
      const slack = held - need;
      if (slack < tightest.slack) tightest = { slack, where: `${scene.id} ${where}`, text, held, need };
      if (held + 1e-6 < need) fail(`${scene.id} ${where}: held ${held.toFixed(2)} s, needs ${need.toFixed(2)} s — “${text}”`);
      return;
    }
    for (const [key, v] of Object.entries(node)) walk(v, where ? `${where}.${key}` : key);
  };
  walk(scene, '');
}
console.log(`  ${checked} text blocks checked. Tightest: ${tightest.where} held ${tightest.held?.toFixed(2)} s for ${tightest.need?.toFixed(2)} s needed.`);

// 2. Runtime.
console.log('\n2. Runtime');
const mm = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
if (TOTAL_SECONDS > 285) fail(`runtime ${mm(TOTAL_SECONDS)} is over 4:45`);
else console.log(`  ✓ ${mm(TOTAL_SECONDS)} (${TOTAL_SECONDS} s, ${TOTAL_SECONDS * 30} frames)`);

// 3. Banned words.
console.log('\n3. Banned words in content.ts');
const content = fs.readFileSync('src/content.ts', 'utf8');
const banned = [/\bguarantee/i, /\bsafe\b/i, /\bsecure\b/i, /\breturns\b/i, /\bbest\b/i, /#1\b/, /\bbook now\b/i];
let hits = 0;
content.split('\n').forEach((line, i) => {
  for (const b of banned) if (b.test(line)) { hits++; fail(`content.ts:${i + 1} matches ${b}: ${line.trim()}`); }
});
if (!hits) console.log('  ✓ zero hits');

// 4. Springs.
console.log('\n4. No spring()');
const files = [];
const walkDir = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walkDir(path.join(d, e.name)) : files.push(path.join(d, e.name))));
walkDir('src');
const springs = files.filter((f) => /spring\(/.test(fs.readFileSync(f, 'utf8')));
if (springs.length) springs.forEach((f) => fail(`spring( in ${f}`));
else console.log('  ✓ none');

// 5. Brass report.
console.log('\n5. Brass uses (check: one accent per scene; decision cards and the Needs Bill tag are allowed; Flywheel = brass closing arc, Timeline = brass Day 90 ring)');
for (const f of files.filter((f) => f.includes(`${path.sep}scenes${path.sep}`))) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (/brass|DecisionCard|needsBill|Flywheel|Timeline/.test(line) && !/^\s*(import|\/\/|\*)/.test(line)) console.log(`  ${path.basename(f)}:${i + 1}  ${line.trim().slice(0, 110)}`);
  });
}

console.log(failures ? `\n${failures} problem(s).` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
