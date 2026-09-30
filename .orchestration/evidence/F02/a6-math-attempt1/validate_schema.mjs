// Independent schema validation with Ajv (draft 2020-12), a different implementation
// from the author's Python jsonschema 4.26.0.
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { semanticErrors } from './model.mjs';

const C = '/home/user/bill/.orchestration/contracts';
const schema = JSON.parse(fs.readFileSync(`${C}/workshop-inputs.schema.json`, 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

// strict-mode compile (informative): does the schema use anything Ajv considers ambiguous?
try { new Ajv2020({ strict: true, allErrors: true }).compile(schema); console.log('  info strict-mode compile: OK'); }
catch (e) { console.log('  info strict-mode compile raised: ' + e.message.split('\n')[0]); }
const ajv = new Ajv2020({ strict: false, allErrors: true });
const validate = ajv.compile(schema);
const meta = ajv.validateSchema(schema);
ok(meta === true, 'schema is valid against the draft 2020-12 metaschema (Ajv)');

const substantive = (errs) => (errs || []).filter((e) => e.keyword !== 'if');

console.log('== valid examples: schema + semantic layer accept');
const VD = `${C}/examples/valid/workshop-inputs`;
for (const f of fs.readdirSync(VD).filter((x) => x.endsWith('.json')).sort()) {
  const doc = JSON.parse(fs.readFileSync(path.join(VD, f), 'utf8'));
  const v = validate(doc); const sem = semanticErrors(doc);
  ok(v && sem.length === 0, `valid/${f} accepted${v ? '' : ' ERR ' + JSON.stringify(substantive(validate.errors).slice(0, 3))}${sem.length ? ' SEM ' + JSON.stringify(sem) : ''}`);
}

console.log('== fixture inputs: schema + semantic layer accept');
const FD = `${C}/fixtures/workshop`;
for (const f of fs.readdirSync(FD).filter((x) => /^WM\d\d/.test(x)).sort()) {
  const doc = JSON.parse(fs.readFileSync(path.join(FD, f), 'utf8')).input;
  const v = validate(doc); const sem = semanticErrors(doc);
  ok(v && sem.length === 0, `fixture ${f} input accepted${v ? '' : ' ERR ' + JSON.stringify(substantive(validate.errors).slice(0, 3))}`);
}
const cr = JSON.parse(fs.readFileSync(`${FD}/clip-rules.json`, 'utf8'));
let clipInputs = 0, clipOK = 0;
for (const r of [...cr.truth_table.filter((x) => x.input), ...cr.supplementary_cases]) {
  clipInputs++; if (validate(r.input) && semanticErrors(r.input).length === 0) clipOK++;
  else console.log('       clip input rejected', r.row || r.case, JSON.stringify(substantive(validate.errors)));
}
ok(clipOK === clipInputs, `clip-rules inputs accepted: ${clipOK}/${clipInputs}`);

console.log('== invalid examples: each rejected for the stated reason');
const ID = `${C}/examples/invalid/workshop-inputs`;
const report = [];
for (const f of fs.readdirSync(ID).filter((x) => x.endsWith('.json')).sort()) {
  const text = fs.readFileSync(path.join(ID, f), 'utf8');
  const why = Object.fromEntries(fs.readFileSync(path.join(ID, f.replace(/\.json$/, '.why.txt')), 'utf8')
    .split('\n').filter((l) => l.includes(':')).map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
  let strictParse = true, doc;
  try { doc = JSON.parse(text); } catch { strictParse = false; }
  const entry = { file: f, rule: why.rule, layer: why.layer, strict_json_parse: strictParse };
  if (!strictParse) doc = Function('"use strict"; return (' + text + ');')(); // lenient parse (local fixture only)
  const valid = validate(doc);
  const errs = substantive(validate.errors).map((e) => ({ path: e.instancePath, keyword: e.keyword, params: e.params }));
  const sem = semanticErrors(doc);
  entry.schema_valid = valid; entry.schema_errors = errs; entry.semantic_errors = sem;
  let verdict = false, detail = '';
  if (why.layer === 'semantic') {
    verdict = valid && sem.length === 1 && sem[0].rule === why.expect_rule && sem[0].path === why.expect_path;
    detail = `schema_valid=${valid} semantic=${JSON.stringify(sem)}`;
  } else if (why.layer === 'json-parse') {
    const schemaHit = errs.some((e) => e.keyword === why.also_schema_keyword && e.path === why.also_schema_path);
    verdict = !strictParse && !valid && schemaHit;
    detail = `strict_parse=${strictParse} lenient schema errors=${JSON.stringify(errs)}`;
  } else {
    const hit = errs.filter((e) => e.keyword === why.expect_keyword && e.path === (why.expect_path || ''));
    let valueOK = true;
    if (why.expect_validator_value !== undefined && hit.length) {
      const ev = JSON.parse(why.expect_validator_value);
      const pv = hit.map((h) => h.params.limit ?? h.params.missingProperty ?? h.params.allowedValue);
      valueOK = pv.some((x) => JSON.stringify(Array.isArray(ev) ? ev[0] : ev) === JSON.stringify(x));
    }
    let msgOK = true;
    if (why.expect_message_contains) {
      const needle = why.expect_message_contains.replace(/'/g, '');
      msgOK = hit.some((h) => JSON.stringify(h.params).includes(needle));
    }
    const others = errs.filter((e) => !(e.keyword === why.expect_keyword && e.path === (why.expect_path || '')));
    entry.other_errors = others;
    verdict = !valid && hit.length > 0 && valueOK && msgOK && sem.length === 0;
    detail = `hit=${JSON.stringify(hit)}${others.length ? ' OTHER=' + JSON.stringify(others) : ''}`;
  }
  entry.pass = verdict;
  report.push(entry);
  ok(verdict, `invalid/${f} [${why.rule}] ${detail}`);
}
fs.writeFileSync(new URL('./out/invalid_examples_report.json', import.meta.url), JSON.stringify(report, null, 1));

// exhaustive sweeps of the enumerated cross-field clauses
console.log('== exhaustive sweeps of XF-01 / XF-02 / XF-03 generated clauses');
const base = JSON.parse(fs.readFileSync(`${VD}/complete-single.json`, 'utf8'));
base.chapters.income.sources = [{ id: 'src-1', kind: 'workplace_pension', owner: 'self', amount: { status: 'estimated', value: 100000 }, period: 'annual', tax_basis: 'net', price_basis: 'start_year_dollars', start: { reference: 'already_receiving' }, escalation_bp: { status: 'zero', value: 0 }, dependability: 'scheduled' }];
const clone = (o) => JSON.parse(JSON.stringify(o));
let bad01 = [], bad03 = [], bad02 = [];
for (let A = 18; A <= 100; A++) for (let R = 30; R <= 100; R++) {
  const d = clone(base); d.chapters.timing.current_age = { status: 'estimated', value: A }; d.chapters.timing.retirement_age = { status: 'estimated', value: R };
  d.chapters.timing.planning_horizon_years = { status: 'estimated', value: 1 };
  if (validate(d) !== (R >= A)) bad01.push([A, R]);
}
ok(bad01.length === 0, `XF-01 sweep A=18..100 x R=30..100 (5,893 cases): accept iff R >= A; mismatches=${JSON.stringify(bad01.slice(0, 5))}`);
for (let R = 30; R <= 100; R++) for (let H = 1; H <= 60; H++) {
  const d = clone(base); d.chapters.timing.current_age = { status: 'estimated', value: 30 }; d.chapters.timing.retirement_age = { status: 'estimated', value: R };
  d.chapters.timing.planning_horizon_years = { status: 'estimated', value: H };
  if (validate(d) !== (R + H - 1 <= 120)) bad03.push([R, H]);
}
ok(bad03.length === 0, `XF-03 sweep R=30..100 x H=1..60 (4,260 cases): accept iff R+H-1 <= 120; mismatches=${JSON.stringify(bad03.slice(0, 5))}`);
for (let A = 18; A <= 100; A++) for (let R = 30; R <= 100; R++) {
  const d = clone(base); d.chapters.timing.household = { partner_current_age: { status: 'estimated', value: A }, partner_retirement_age: { status: 'estimated', value: R } };
  if (validate(d) !== (R >= A)) bad02.push([A, R]);
}
ok(bad02.length === 0, `XF-02 sweep partner A'=18..100 x R'=30..100 (5,893 cases): accept iff R' >= A'; mismatches=${JSON.stringify(bad02.slice(0, 5))}`);

console.log('== quantity status/value matrix on spending.amount and a source amount');
const qcases = [
  [{ status: 'unknown' }, true], [{ status: 'unknown', value: 1 }, false], [{ status: 'zero', value: 0 }, 'src-only'],
  [{ status: 'zero', value: 5 }, false], [{ status: 'estimated', value: 0 }, false], [{ status: 'estimated' }, false],
  [{ status: 'confirmed', value: 1 }, true], [{ status: 'estimated', value: -1 }, false], [{ status: 'estimated', value: '100' }, false],
];
for (const [q, exp] of qcases) {
  const d1 = clone(base); d1.chapters.life.spending.amount = q;
  const d2 = clone(base); d2.chapters.income.sources[0].amount = q;
  const e1 = exp === 'src-only' ? false : exp, e2 = exp === 'src-only' ? true : exp;
  ok(validate(d1) === e1 && validate(d2) === e2, `quantity ${JSON.stringify(q)}: spending ${e1 ? 'accept' : 'reject'}, source ${e2 ? 'accept' : 'reject'}`);
}
{ const d = clone(base); d.chapters.timing.inflation_bp = { status: 'estimated', value: 1001 }; ok(!validate(d), 'inflation 1001 bp rejected (0..1000)'); }
{ const d = clone(base); d.chapters.timing.planning_horizon_years = { status: 'estimated', value: 61 }; ok(!validate(d), 'H = 61 rejected'); }
{ const d = clone(base); d.chapters.life.spending.period = 'annual'; d.chapters.life.spending.amount = { status: 'estimated', value: 120000001 }; ok(!validate(d), 'annual spending 120,000,001 cents rejected'); }
{ const d = clone(base); d.chapters.income.sources[0].period = 'monthly'; d.chapters.income.sources[0].amount = { status: 'estimated', value: 5000001 }; ok(!validate(d), 'monthly income 5,000,001 cents rejected'); }
{ const d = clone(base); d.chapters.income.sources[0].start = { reference: 'year_index', point: { status: 'estimated', value: 83 } }; ok(!validate(d), 'year_index start 83 rejected (1..82)'); }
{ const d = clone(base); d.chapters.income.sources[0].start = { reference: 'year_index', point: { status: 'zero', value: 0 } }; ok(!validate(d), 'year_index start {zero,0} rejected'); }
{ const d = clone(base); d.chapters.income.sources[0].escalation_bp = { status: 'unknown' }; ok(!validate(d), 'escalation unknown rejected'); }
{ const d = clone(base); d.chapters.timing.capital_illustration_return_bp = { status: 'confirmed', value: 400 }; ok(!validate(d), 'return assumption status confirmed rejected'); }
{ const d = clone(base); d.chapters.income.sources.push({ ...clone(base.chapters.income.sources[0]), id: 'src-2', owner: 'partner' }); ok(!validate(d), 'XF-07 partner-owned source without household rejected'); }
{ const d = clone(base); d.chapters.income.sources[0].id = 'src-100'; ok(!validate(d), 'source id src-100 rejected (pattern src-1..src-99)'); }
{ const d = clone(base); d.chapters.income.coverage = 'not_answered'; ok(!validate(d), 'XF-08 not_answered with a listed source rejected'); }

console.log(`== summary: ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
