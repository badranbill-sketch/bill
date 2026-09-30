// Cue sheet for SCRIPT.md §7, generated from src/content.ts:
//   node --experimental-strip-types --no-warnings scripts/cues.mjs            prints it
//   node --experimental-strip-types --no-warnings scripts/cues.mjs --write    replaces §7 in SCRIPT.md
import fs from 'node:fs';

const { SCENES, ORDER, LEDGER, TAGS } = await import('../src/content.ts');
const FPS = 30;
const isLine = (n) => n && typeof n === 'object' && 'en' in n && 'fr' in n;
const clock = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const n1 = (x) => (Math.round(x * 10) / 10).toFixed(1);

const onScreen = (l) => {
  let t = '';
  if (l.label) t += `[${l.label.en}] `;
  if (l.heading) t += `**${l.heading.en}** `;
  t += l.en;
  if (l.owner) t += ` · owner: ${l.owner.en}`;
  if (l.tag) t += ` · tag: _${TAGS[l.tag].en}_`;
  if (l.claim) t += ` (${l.claim})`;
  return t;
};
const ledgerWords = (r) => [r.item.en, r.trigger?.en, r.shown?.en ?? r.amount ?? 'to confirm', r.source?.basis === 'snippet-only' ? 'unverified — confirm at checkout' : '', r.example ? 'example only' : ''].filter(Boolean).join(' ');

const artLine = (s) =>
  (s.art ?? [])
    .map((a) => {
      if (a.hold) return `\`${a.name}\` ${a.placement}, held complete (no redraw)`;
      let t = `\`${a.name}\` ${a.placement}, pen ${n1(a.start)}–${n1(a.start + a.dur)} s`;
      if (a.order === 'objects') t += ', order objects';
      if (a.fallback) t += `, fallback \`${a.fallback}\``;
      return t;
    })
    .join('; ');

let out = '## 7. Cue sheet (generated from `src/content.ts`)\n\n';
out += 'Each row: when it appears (it stays to the end of the scene), its path in the scene object, and the words on screen\n';
out += '(label in brackets, heading in bold, then owner and tag). LEDGER rows show every word the row puts on screen.\n';
out += 'Regenerate after any edit with `node --experimental-strip-types --no-warnings scripts/cues.mjs --write`.\n\n';
let t0 = 0;
for (const k of ORDER) {
  const s = SCENES[k];
  const secs = Math.round(s.dur * FPS) / FPS;
  out += `### ${s.id} · ${s.name} — ${n1(s.dur)} s (at ${clock(t0)}–${clock(t0 + secs)})\n`;
  out += `Layout \`${s.layout}\`. Art: ${artLine(s)}.\n\n| In (s) | Slot | On screen |\n|---:|---|---|\n`;
  const rows = [];
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach((x, i) => walk(x, `${path}.${i}`));
    if (isLine(node)) {
      if (node.at) rows.push([node.at[0], path, onScreen(node)]);
      return;
    }
    if (typeof node.id === 'string' && Array.isArray(node.at)) {
      const r = LEDGER.find((x) => x.id === node.id);
      if (r) rows.push([node.at[0], `${path} → LEDGER \`${r.id}\``, ledgerWords(r)]);
      return;
    }
    for (const [key, v] of Object.entries(node)) if (!['art', 'id', 'name', 'drawing', 'layout', 'dur'].includes(key)) walk(v, path ? `${path}.${key}` : key);
  };
  walk(s, '');
  for (const [at, path, text] of rows) out += `| ${n1(at)} | ${path} | ${text} |\n`;
  out += '\n';
  t0 += secs;
}
out += `Total: ${n1(t0)} s (${clock(t0)}).\n\n`;

if (process.argv.includes('--write')) {
  const md = fs.readFileSync('SCRIPT.md', 'utf8');
  const a = md.indexOf('## 7. Cue sheet');
  const b = md.indexOf('## 8.');
  if (a < 0 || b < 0) throw new Error('SCRIPT.md has no §7 / §8 markers');
  fs.writeFileSync('SCRIPT.md', md.slice(0, a) + out + md.slice(b));
  console.log(`SCRIPT.md §7 rewritten (${ORDER.length} scenes, ${n1(t0)} s)`);
} else process.stdout.write(out);
