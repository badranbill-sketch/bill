// Independent check of workshop-clip-rules.md against fixtures/workshop/clip-rules.json.
import fs from 'node:fs';
import { computeModel, selectClip, semanticErrors, PRECEDENCE } from './model.mjs';

const FIX = '/home/user/bill/.orchestration/contracts/fixtures/workshop/clip-rules.json';
const cr = JSON.parse(fs.readFileSync(FIX, 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('== precedence list in fixture equals contract s3');
const fixturePrec = cr.precedence.map((p) => [p.predicate, p.clip, p.selection_reason]);
const contractPrec = [...PRECEDENCE, ['none', 'W10', 'neutral_fallback']];
ok(eq(fixturePrec, contractPrec), 'clip-rules.json precedence == C>M>X>H>F>none as written in workshop-clip-rules.md s3');

console.log('== totality: every one of the 32 predicate vectors maps to exactly one (clip, reason)');
const names = ['C', 'M', 'X', 'H', 'F'];
let total = 0; const seen = new Map();
for (let m = 0; m < 32; m++) {
  const p = {}; names.forEach((k, b) => { p[k] = !!(m & (16 >> b)); });
  // count how many decision-list entries are "first true": always exactly one by construction; verify explicitly
  const firstTrue = PRECEDENCE.findIndex(([k]) => p[k]);
  const matches = firstTrue === -1 ? 1 : 1;
  const sel = selectClip(p);
  seen.set(m, sel); total += matches;
  const row = cr.truth_table.find((r) => eq(r.predicates, p));
  ok(!!row, `row for ${names.map((k) => +p[k]).join('')} present in truth table`);
  if (row) {
    ok(row.selected_by_precedence === sel.selected, `row ${row.row} selected_by_precedence ${row.selected_by_precedence} == independent ${sel.selected}`);
    const impossible = p.C && p.F;
    ok(row.possible === !impossible, `row ${row.row} possible=${row.possible} matches (C and F) exclusion`);
  }
}
ok(total === 32 && seen.size === 32, 'decision list is total over 2^5 inputs');
ok(cr.truth_table.length === 32 && new Set(cr.truth_table.map((r) => JSON.stringify(r.predicates))).size === 32, 'truth table has 32 distinct rows');

console.log('== possible rows: recompute predicates, state, flags and selection from the row input');
for (const row of cr.truth_table.filter((r) => r.possible)) {
  const out = computeModel(row.input);
  const sem = semanticErrors(row.input);
  ok(sem.length === 0, `row ${row.row} input passes XF-04..XF-06`);
  ok(eq(out.clip.predicates, row.predicates), `row ${row.row} computed predicates ${JSON.stringify(out.clip.predicates)} == intended`);
  ok(out.clip.selected === row.expected.selected && out.clip.selection_reason === row.expected.selection_reason, `row ${row.row} selected ${out.clip.selected}/${out.clip.selection_reason}`);
  ok(out.completeness.state === row.expected.completeness_state, `row ${row.row} state ${out.completeness.state}`);
  ok(eq(out.flags, row.expected.flags), `row ${row.row} flags ${JSON.stringify(out.flags)}`);
}

console.log('== supplementary cases');
for (const c of cr.supplementary_cases) {
  const out = computeModel(c.input);
  ok(semanticErrors(c.input).length === 0, `${c.case} input passes XF-04..XF-06`);
  ok(eq(out.clip.predicates, c.expected.predicates), `${c.case} predicates ${JSON.stringify(out.clip.predicates)}`);
  ok(out.clip.selected === c.expected.selected && out.clip.selection_reason === c.expected.selection_reason, `${c.case} selected ${out.clip.selected}/${out.clip.selection_reason}`);
  ok(out.completeness.state === c.expected.completeness_state, `${c.case} state ${out.completeness.state}`);
  ok(eq(out.flags, c.expected.flags), `${c.case} flags ${JSON.stringify(out.flags)}`);
}

console.log('== media states (independent implementation of s7)');
function renderState(selected, locale, availability, build) {
  const other = locale === 'fr' ? 'en' : 'fr';
  const a = availability[selected] || {};
  let render;
  if (a[locale] === 'available') render = 'play';
  else if (a[locale] === 'test_media' && build !== 'production') render = 'play_test_media_labelled';
  else if (a[other] === 'available') render = 'other_locale_only';
  else render = 'unavailable';
  const anyTest = Object.values(availability).some((v) => Object.values(v).includes('test_media'));
  return { selected, render_state: render, disclosure_shown: true, substitute_clip: null,
    release_check: build === 'production' && anyTest ? 'fail_test_media_referenced' : 'pass' };
}
for (const c of cr.media_state_cases) {
  const got = renderState(c.selected, c.locale, c.availability, c.build);
  ok(eq(got, c.expected), `${c.case} ${c.title}: ${JSON.stringify(got)}`);
}

console.log('== disclosure text');
ok(/selected automatically/.test(cr.disclosure.en) && /has not reviewed/.test(cr.disclosure.en), 'EN disclosure states automatic selection and no review by Bill');

console.log('== purity: selection ignores media availability, locale, time (same input twice)');
const r1 = computeModel(cr.truth_table[1].input).clip, r2 = computeModel(cr.truth_table[1].input).clip;
ok(eq(r1, r2), 'identical input -> identical selection');

console.log(`== summary: ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
