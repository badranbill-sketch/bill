// Recompute every WM fixture and every clip-rules case with the independent model; deep-diff.
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { evaluate, semanticErrors } from './model.mjs';

const ROOT = '/home/user/bill/.orchestration/contracts';
const FIX = path.join(ROOT, 'fixtures/workshop');
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'workshop-inputs.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

function diff(exp, act, p = '', out = []) {
  if (exp === null || act === null || typeof exp !== 'object' || typeof act !== 'object') {
    if (JSON.stringify(exp) !== JSON.stringify(act)) out.push(`${p || '/'}: expected ${JSON.stringify(exp)} got ${JSON.stringify(act)}`);
    return out;
  }
  if (Array.isArray(exp) !== Array.isArray(act)) { out.push(`${p}: array/object mismatch`); return out; }
  if (Array.isArray(exp)) {
    if (exp.length !== act.length) out.push(`${p}: length expected ${exp.length} got ${act.length}`);
    for (let k = 0; k < Math.min(exp.length, act.length); k++) diff(exp[k], act[k], `${p}/${k}`, out);
    return out;
  }
  const keys = new Set([...Object.keys(exp), ...Object.keys(act)]);
  for (const k of keys) {
    if (!(k in exp)) { out.push(`${p}/${k}: unexpected key (value ${JSON.stringify(act[k])})`); continue; }
    if (!(k in act)) { out.push(`${p}/${k}: missing key (expected ${JSON.stringify(exp[k])})`); continue; }
    diff(exp[k], act[k], `${p}/${k}`, out);
  }
  return out;
}

const files = fs.readdirSync(FIX).filter((f) => /^WM\d\d-.*\.json$/.test(f)).sort();
let pass = 0, fail = 0; const computed = {};
for (const f of files) {
  const fx = JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));
  const okSchema = validate(fx.input);
  const sem = semanticErrors(fx.input);
  const out = evaluate(fx.input);
  computed[fx.fixture_id] = out;
  const d = diff(fx.expected, JSON.parse(JSON.stringify(out)));
  const ok = okSchema && sem.length === 0 && d.length === 0;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${fx.fixture_id} schema=${okSchema} semantic=${sem.length ? JSON.stringify(sem) : 'ok'} diffs=${d.length} state=${out.completeness.state} clip=${out.clip.selected}`);
  if (!okSchema) console.log('   schema errors:', JSON.stringify(validate.errors).slice(0, 500));
  for (const line of d.slice(0, 25)) console.log('   ' + line);
  if (d.length > 25) console.log(`   ... ${d.length - 25} more`);
}
console.log(`WM fixtures: ${pass} pass, ${fail} fail, of ${files.length}`);

// index.json consistency
const idx = JSON.parse(fs.readFileSync(path.join(FIX, 'index.json'), 'utf8'));
let idxBad = 0;
for (const e of idx.fixtures) {
  const out = computed[e.fixture_id];
  if (e.fixture_id === 'CLIP') { if (!fs.existsSync(path.join(FIX, e.file))) idxBad++; continue; }
  if (!out) { console.log(`INDEX ${e.fixture_id}: no fixture file computed`); idxBad++; continue; }
  if (!fs.existsSync(path.join(FIX, e.file))) { console.log(`INDEX ${e.fixture_id}: file missing ${e.file}`); idxBad++; }
  if (e.selected_clip !== out.clip.selected || e.completeness_state !== out.completeness.state) {
    console.log(`INDEX MISMATCH ${e.fixture_id}: index ${e.selected_clip}/${e.completeness_state} vs model ${out.clip.selected}/${out.completeness.state}`); idxBad++;
  }
}
console.log(`index.json: ${idx.fixtures.length} entries, ${idxBad} mismatches; fixture files ${files.length}`);

// clip-rules.json
const cr = JSON.parse(fs.readFileSync(path.join(FIX, 'clip-rules.json'), 'utf8'));
let cpass = 0, cfail = 0;
const PRE = [['C', 'W10', 'core_inputs_missing'], ['M', 'W06', 'missing_income'], ['X', 'W08', 'tax_basis'], ['H', 'W09', 'household_timing'], ['F', 'W07', 'funding_gap']];
const byPrecedence = (p) => { for (const [k, c, r] of PRE) if (p[k]) return [c, r]; return ['W10', 'neutral_fallback']; };
for (const row of cr.truth_table) {
  const [pc] = byPrecedence(row.predicates);
  if (pc !== row.selected_by_precedence) { console.log(`TT row ${row.row}: selected_by_precedence ${row.selected_by_precedence} != ${pc}`); cfail++; continue; }
  if (!row.possible) {
    // impossible rows: C and F both 1. If an input is present, check that it does NOT realise the row.
    let note = 'no input';
    if (row.input) {
      const out = evaluate(row.input);
      const same = JSON.stringify(out.clip.predicates) === JSON.stringify(row.predicates);
      note = `input present; realised predicates ${JSON.stringify(out.clip.predicates)}; realises impossible row? ${same}`;
      if (same) { cfail++; console.log(`TT row ${row.row} FAIL impossible row realised`); continue; }
    }
    console.log(`TT row ${row.row} impossible (C&F): ${note}`); cpass++; continue;
  }
  const okS = validate(row.input); const sem = semanticErrors(row.input);
  const out = evaluate(row.input);
  const d = diff({ predicates: row.predicates, ...row.expected },
    { predicates: out.clip.predicates, selected: out.clip.selected, selection_reason: out.clip.selection_reason, completeness_state: out.completeness.state, flags: out.flags });
  const ok = okS && sem.length === 0 && d.length === 0 && out.clip.selected === pc;
  ok ? cpass++ : cfail++;
  console.log(`TT row ${row.row} ${ok ? 'PASS' : 'FAIL'} ${JSON.stringify(row.predicates)} -> ${out.clip.selected}/${out.clip.selection_reason} ${d.join('; ')}`);
}
for (const cs of cr.supplementary_cases) {
  const okS = validate(cs.input); const sem = semanticErrors(cs.input);
  const out = evaluate(cs.input);
  const d = diff(cs.expected, { predicates: out.clip.predicates, selected: out.clip.selected, selection_reason: out.clip.selection_reason, completeness_state: out.completeness.state, flags: out.flags });
  const ok = okS && sem.length === 0 && d.length === 0;
  ok ? cpass++ : cfail++;
  console.log(`${cs.case} ${ok ? 'PASS' : 'FAIL'} ${out.clip.selected}/${out.clip.selection_reason} ${d.join('; ')}`);
}
// Media state cases: independent render-state function from clip-rules.md §7
function renderState(sel, locale, avail, build) {
  const other = locale === 'fr' ? 'en' : 'fr';
  const a = avail[sel];
  const anyTestRef = Object.values(avail).some((v) => v.fr === 'test_media' || v.en === 'test_media');
  const release_check = build === 'production' && anyTestRef ? 'fail_test_media_referenced' : 'pass';
  let rs;
  if (a[locale] === 'available') rs = 'play';
  else if (a[locale] === 'test_media' && build === 'local_test') rs = 'play_test_media_labelled';
  else if (a[other] === 'available') rs = 'other_locale_only';
  else rs = 'unavailable';
  return { selected: sel, render_state: rs, disclosure_shown: true, substitute_clip: null, release_check };
}
for (const ms of cr.media_state_cases) {
  const got = renderState(ms.selected, ms.locale, ms.availability, ms.build);
  const d = diff(ms.expected, got);
  d.length ? cfail++ : cpass++;
  console.log(`${ms.case} ${d.length ? 'FAIL' : 'PASS'} ${got.render_state} ${d.join('; ')}`);
}
console.log(`clip-rules: ${cpass} pass, ${cfail} fail`);

fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/computed_fixture_outputs.json', JSON.stringify(computed, null, 1));
process.exitCode = fail || cfail || idxBad ? 1 : 0;
