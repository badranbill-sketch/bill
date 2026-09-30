// A6 F02a attempt-3: run the independent model against every WM fixture and clip-rules case,
// then run each faulty runtime and list which cases catch it.
// Usage: node run_suite.mjs <fixtures_dir>
import fs from 'node:fs';
import path from 'node:path';
import { compute, mediaState, selectClip, semanticErrors } from './pyearmodel.mjs';

const dir = process.argv[2];
if (!dir) { console.error('usage: node run_suite.mjs <fixtures_dir>'); process.exit(2); }

function canon(x) {
  if (Array.isArray(x)) return x.map(canon);
  if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x).sort()) o[k] = canon(x[k]); return o; }
  return x;
}
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

function firstDiff(a, b, p = '') {
  if (eq(a, b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of [...keys].sort((x, y) => (/^\d+$/.test(x) && /^\d+$/.test(y) ? x - y : x < y ? -1 : 1))) {
      if (!(k in a)) return `${p}/${k}: missing in model`;
      if (!(k in b)) return `${p}/${k}: extra in model`;
      const d = firstDiff(a[k], b[k], `${p}/${k}`);
      if (d) return d;
    }
  }
  return `${p}: model=${JSON.stringify(a)} expected=${JSON.stringify(b)}`;
}

const wmFiles = fs.readdirSync(dir).filter((f) => /^WM\d+.*\.json$/.test(f)).sort();
const fixtures = wmFiles.map((f) => ({ f, d: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
const clip = JSON.parse(fs.readFileSync(path.join(dir, 'clip-rules.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));

// cases: {id, group: 'WM'|'WM-new'|'TT'|'CS', check(faults) -> null | diff}
const cases = [];
for (const { f, d } of fixtures) {
  const n = Number(d.fixture_id.slice(2));
  cases.push({ id: d.fixture_id, group: n <= 36 ? 'WM01-36' : 'WM37+', check: (fl) => firstDiff(compute(d.input, fl), d.expected) });
}
for (const r of clip.truth_table) {
  if (!r.possible) continue;
  cases.push({
    id: `TT${String(r.row).padStart(2, '0')}`, group: 'clip', check: (fl) => {
      const o = compute(r.input, fl);
      const got = { predicates: o.clip.predicates, selected: o.clip.selected, selection_reason: o.clip.selection_reason, completeness_state: o.completeness.state, flags: o.flags };
      return firstDiff(got, { predicates: r.predicates, ...r.expected });
    },
  });
}
for (const c of clip.supplementary_cases) {
  cases.push({
    id: c.case, group: 'clip', check: (fl) => {
      const o = compute(c.input, fl);
      const got = { predicates: o.clip.predicates, selected: o.clip.selected, selection_reason: o.clip.selection_reason, completeness_state: o.completeness.state, flags: o.flags };
      return firstDiff(got, c.expected);
    },
  });
}

const out = [];
const log = (s) => { out.push(s); console.log(s); };

// ---- 1. contract reading
log(`# contract reading (no fault) over ${fixtures.length} WM fixtures, ${cases.filter((c) => c.group === 'clip').length} clip cases with input`);
let fails = 0;
for (const c of cases) {
  let d;
  try { d = c.check({}); } catch (e) { d = `EXCEPTION ${e.message}`; }
  if (d) { fails++; log(`FAIL ${c.id}: ${d}`); } else log(`PASS ${c.id}`);
}
// impossible rows
let imp = 0;
for (const r of clip.truth_table) {
  if (r.possible) continue;
  const p = r.predicates;
  const ok = p.C && p.F && r.input === null && r.expected === null && selectClip(p)[0] === r.selected_by_precedence && r.selected_by_precedence === 'W10';
  if (!ok) { fails++; log(`FAIL TT${r.row} impossible-row check`); } else imp++;
}
log(`PASS impossible rows: ${imp} rows, all C and F, input null, precedence W10`);
// selected_by_precedence for possible rows equals own precedence of the row predicates
for (const r of clip.truth_table) if (r.possible && selectClip(r.predicates)[0] !== r.selected_by_precedence) { fails++; log(`FAIL TT${r.row} selected_by_precedence`); }
// media
for (const m of clip.media_state_cases) {
  const d = firstDiff(mediaState(m), m.expected);
  if (d) { fails++; log(`FAIL ${m.case}: ${d}`); } else log(`PASS ${m.case}`);
}
// semantic XF-04..06 on every input
const allInputs = [...fixtures.map(({ d }) => [d.fixture_id, d.input]), ...clip.truth_table.filter((r) => r.input).map((r) => [`TT${r.row}`, r.input]), ...clip.supplementary_cases.map((c) => [c.case, c.input])];
let semBad = 0;
for (const [id, inp] of allInputs) { const e = semanticErrors(inp); if (e.length) { semBad++; fails++; log(`FAIL semantic ${id}: ${e.join(', ')}`); } }
log(`semantic XF-04..06: ${allInputs.length - semBad}/${allInputs.length} inputs clean`);
// index.json agreement
let idxBad = 0;
const idxWM = index.fixtures.filter((e) => /^WM\d+$/.test(e.fixture_id));
for (const e of idxWM) {
  const fx = fixtures.find((x) => x.d.fixture_id === e.fixture_id);
  if (!fx) { idxBad++; log(`FAIL index ${e.fixture_id}: no file`); continue; }
  const o = compute(fx.d.input, {});
  const probs = [];
  if (e.file !== fx.f) probs.push('file');
  if (e.title !== fx.d.title) probs.push('title');
  if (!eq(e.covers, fx.d.covers)) probs.push('covers');
  if (e.selected_clip !== o.clip.selected) probs.push('selected_clip');
  if (e.completeness_state !== o.completeness.state) probs.push('completeness_state');
  if (probs.length) { idxBad++; log(`FAIL index ${e.fixture_id}: ${probs.join(',')}`); }
}
if (idxWM.length !== fixtures.length) { idxBad++; log(`FAIL index has ${idxWM.length} WM entries, ${fixtures.length} files`); }
fails += idxBad;
log(`index.json: ${idxWM.length} WM entries, ${idxBad} problems; non-WM entries: ${index.fixtures.filter((e) => !/^WM\d+$/.test(e.fixture_id)).map((e) => e.fixture_id).join(',')}`);
log(`CONTRACT READING: ${fails === 0 ? 'ALL PASS' : `${fails} FAILURES`}`);

// ---- 2. faulty runtimes
const FAULTS = ['today_dollars_uses_q', 'joint_uses_partner', 'joint_start_partner', 'joint_end_partner', 'joint_uses_younger', 'joint_uses_older', 'joint_needs_partner_age',
  'group_from_rounded_rows', 'deflate_rounded_gap', 'gap_from_rounded_rows', 'half_up', 'today_dollars_nominal', 'today_dollars_i_after'];
log('');
log('# faulty runtimes: caught_by (all cases) | caught_by restricted to WM01-WM36 + clip cases');
const faultResults = {};
for (const fname of FAULTS) {
  const fl = { [fname]: true };
  const caught = [], details = {};
  for (const c of cases) {
    let d;
    try { d = c.check(fl); } catch (e) { d = `EXCEPTION ${e.message}`; }
    if (d) { caught.push(c.id); details[c.id] = d; }
  }
  const old = caught.filter((id) => cases.find((c) => c.id === id).group !== 'WM37+');
  faultResults[fname] = { caught, old };
  log(`${fname}: caught_by=[${caught.join(',') || 'NONE'}] | old_suite=${old.length ? `[${old.join(',')}]` : 'MISSED'}`);
  for (const id of caught.filter((x) => /^WM3[7-9]|^WM4/.test(x))) log(`    ${id}: first diff ${details[id]}`);
}
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'fault_results.json'), JSON.stringify(faultResults, null, 1));
process.exit(fails === 0 ? 0 : 1);
