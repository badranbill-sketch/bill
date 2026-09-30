// Non-vacuity: perturb each new fixture's expected record and confirm the comparison sees it.
import fs from 'node:fs';
import path from 'node:path';
import { compute } from './pyearmodel.mjs';
const dir = process.argv[2];
function canon(x) { if (Array.isArray(x)) return x.map(canon); if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x).sort()) o[k] = canon(x[k]); return o; } return x; }
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const muts = [
  ['gap_cents +1 in last row', (e) => { e.years.at(-1).gap_cents += 1; }],
  ['gap_today_dollars_cents -1 in last row', (e) => { e.years.at(-1).gap_today_dollars_cents -= 1; }],
  ['income_net_cents +1 in row 1', (e) => { e.years[1].income_net_cents += 1; }],
  ['first income_by_source value +1 in row 0', (e) => { const k = Object.keys(e.years[0].income_by_source_cents)[0]; e.years[0].income_by_source_cents[k] += 1; }],
  ['exact.gap last digit changed in last row', (e) => { const s = e.years.at(-1).exact.gap; e.years.at(-1).exact.gap = s.slice(0, -1) + (s.at(-1) === '9' ? '8' : String(Number(s.at(-1)) + 1)); }],
  ['extra flag', (e) => { e.flags = [...e.flags, 'horizon_shorter_than_timeline'].sort(); }],
  ['window last_t +1', (e) => { e.window.last_t += 1; }],
];
let bad = 0, n = 0;
for (const f of fs.readdirSync(dir).filter((x) => /^WM(3[7-9]|4\d)-.*\.json$/.test(x)).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const got = compute(d.input, {});
  if (!eq(got, d.expected)) { console.log(`BASELINE MISMATCH ${f}`); bad++; continue; }
  for (const [name, m] of muts) {
    const e = structuredClone(d.expected); m(e); n++;
    const seen = !eq(got, e);
    if (!seen) bad++;
    console.log(`${seen ? 'DETECTED' : 'NOT DETECTED'} ${d.fixture_id}: ${name}`);
  }
}
console.log(`PERTURBATION: ${n - bad}/${n} detected`);
process.exit(bad ? 1 : 0);
