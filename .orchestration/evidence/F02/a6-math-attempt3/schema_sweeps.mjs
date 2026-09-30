// Exhaustive boundary sweeps of the enumerated cross-field clauses and targeted mutations.
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
const schema = JSON.parse(fs.readFileSync('/home/user/bill/.orchestration/contracts/workshop-inputs.schema.json', 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
const base = JSON.parse(fs.readFileSync('/home/user/bill/.orchestration/contracts/examples/valid/workshop-inputs/complete-single.json', 'utf8'));
const clone = (x) => JSON.parse(JSON.stringify(x));
let bad = 0; const log = (m) => console.log(m);

// XF-01: accept iff R >= A (A 18..100, R 30..100), H = 1
let n = 0, wrong = [];
for (let A = 18; A <= 100; A++) for (let R = 30; R <= 100; R++) {
  const d = clone(base); d.chapters.income = { coverage: 'no_planned_income', sources: [] };
  d.chapters.timing.current_age = { status: 'confirmed', value: A };
  d.chapters.timing.retirement_age = { status: 'estimated', value: R };
  d.chapters.timing.planning_horizon_years = { status: 'estimated', value: 1 };
  delete d.chapters.timing.household; n++;
  if (validate(d) !== (R >= A)) wrong.push([A, R]);
}
log(`XF-01 sweep: ${n} cases, ${wrong.length} wrong ${JSON.stringify(wrong.slice(0, 5))}`); bad += wrong.length;
// XF-02
n = 0; wrong = [];
for (let A = 18; A <= 100; A++) for (let R = 30; R <= 100; R++) {
  const d = clone(base); d.chapters.income = { coverage: 'no_planned_income', sources: [] };
  d.chapters.timing.current_age = { status: 'confirmed', value: 50 };
  d.chapters.timing.retirement_age = { status: 'estimated', value: 60 };
  d.chapters.timing.planning_horizon_years = { status: 'estimated', value: 1 };
  d.chapters.timing.household = { partner_current_age: { status: 'estimated', value: A }, partner_retirement_age: { status: 'confirmed', value: R } }; n++;
  if (validate(d) !== (R >= A)) wrong.push([A, R]);
}
log(`XF-02 sweep: ${n} cases, ${wrong.length} wrong ${JSON.stringify(wrong.slice(0, 5))}`); bad += wrong.length;
// XF-03: accept iff R + H - 1 <= 120, R 30..100, H 1..60 (A = 18), also with A unknown
for (const Aunk of [false, true]) {
  n = 0; wrong = [];
  for (let R = 30; R <= 100; R++) for (let H = 1; H <= 60; H++) {
    const d = clone(base); d.chapters.income = { coverage: 'no_planned_income', sources: [] };
    d.chapters.timing.current_age = Aunk ? { status: 'unknown' } : { status: 'confirmed', value: 18 };
    d.chapters.timing.retirement_age = { status: 'estimated', value: R };
    d.chapters.timing.planning_horizon_years = { status: 'estimated', value: H };
    delete d.chapters.timing.household; n++;
    if (validate(d) !== (R + H - 1 <= 120)) wrong.push([R, H]);
  }
  log(`XF-03 sweep (A ${Aunk ? 'unknown' : '18'}): ${n} cases, ${wrong.length} wrong ${JSON.stringify(wrong.slice(0, 5))}`); bad += wrong.length;
}
// Targeted mutations that must be rejected (or accepted), each with the reason
const src = () => clone(base.chapters.income.sources[0]);
const withSrc = (f) => { const d = clone(base); d.chapters.income = { coverage: 'all_known_sources_listed', sources: [f(src())] }; return d; };
const cases = [
  ['base_year 2025', (d) => { d.base_year = 2025; }, false],
  ['base_year 2101', (d) => { d.base_year = 2101; }, false],
  ['annual spending 120,000,001', (d) => { d.chapters.life.spending.period = 'annual'; d.chapters.life.spending.amount = { status: 'estimated', value: 120000001 }; }, false],
  ['annual spending 120,000,000', (d) => { d.chapters.life.spending.period = 'annual'; d.chapters.life.spending.amount = { status: 'estimated', value: 120000000 }; }, true],
  ['spending value 450000.0 (integral float, documented as accepted)', (d) => { d.chapters.life.spending.amount = { status: 'estimated', value: 450000.0 }; }, true],
  ['balance 5,000,000,001', (d) => { d.chapters.savings = { accounts: { tfsa: { status: 'estimated', value: 5000000001 } } }; }, false],
  ['home excluded_from_spendable false', (d) => { d.chapters.savings = { home_value: { amount: { status: 'estimated', value: 1 }, excluded_from_spendable: false } }; }, false],
  ['planning horizon confirmed', (d) => { d.chapters.timing.planning_horizon_years = { status: 'confirmed', value: 10 }; }, false],
  ['planning horizon unknown', (d) => { d.chapters.timing.planning_horizon_years = { status: 'unknown' }; }, false],
  ['inflation 1001', (d) => { d.chapters.timing.inflation_bp = { status: 'estimated', value: 1001 }; }, false],
  ['inflation confirmed', (d) => { d.chapters.timing.inflation_bp = { status: 'confirmed', value: 200 }; }, false],
  ['return confirmed', (d) => { d.chapters.timing.capital_illustration_return_bp = { status: 'confirmed', value: 400 }; }, false],
  ['return unknown', (d) => { d.chapters.timing.capital_illustration_return_bp = { status: 'unknown' }; }, false],
  ['current_age 17', (d) => { d.chapters.timing.current_age = { status: 'estimated', value: 17 }; }, false],
  ['current_age zero status', (d) => { d.chapters.timing.current_age = { status: 'zero', value: 0 }; }, false],
  ['retirement_age 29', (d) => { d.chapters.timing.retirement_age = { status: 'estimated', value: 29 }; }, false],
  ['9 sources', (d) => { d.chapters.income.sources = Array.from({ length: 9 }, (_, k) => ({ ...src(), id: `src-${k + 1}` })); }, false],
  ['all_known with 0 sources', (d) => { d.chapters.income = { coverage: 'all_known_sources_listed', sources: [] }; }, false],
  ['not_answered with a source', (d) => { d.chapters.income.coverage = 'not_answered'; }, false],
  ['some_missing with 0 sources (allowed)', (d) => { d.chapters.income = { coverage: 'some_sources_may_be_missing', sources: [] }; }, true],
];
const srcCases = [
  ['income monthly 5,000,001', (s) => { s.period = 'monthly'; s.amount = { status: 'estimated', value: 5000001 }; }, false],
  ['income annual 60,000,001', (s) => { s.period = 'annual'; s.amount = { status: 'estimated', value: 60000001 }; }, false],
  ['escalation unknown', (s) => { s.escalation_bp = { status: 'unknown' }; }, false],
  ['escalation 1001', (s) => { s.escalation_bp = { status: 'estimated', value: 1001 }; }, false],
  ['start year_index 0', (s) => { s.start = { reference: 'year_index', point: { status: 'estimated', value: 0 } }; }, false],
  ['start year_index zero status', (s) => { s.start = { reference: 'year_index', point: { status: 'zero', value: 0 } }; }, false],
  ['start year_index 83', (s) => { s.start = { reference: 'year_index', point: { status: 'estimated', value: 83 } }; }, false],
  ['start age 101', (s) => { s.start = { reference: 'age', point: { status: 'estimated', value: 101 } }; }, false],
  ['start age without point', (s) => { s.start = { reference: 'age' }; }, false],
  ['end already_receiving', (s) => { s.end = { reference: 'already_receiving' }; }, false],
  ['end age zero status', (s) => { s.end = { reference: 'age', point: { status: 'zero', value: 0 } }; }, false],
  ['id src-100', (s) => { s.id = 'src-100'; }, false],
  ['id src-0 (pattern admits; doc says src-1..src-99)', (s) => { s.id = 'src-0'; }, null],
  ['id src-01 (pattern admits; distinct from src-1)', (s) => { s.id = 'src-01'; }, null],
  ['tax_basis after_tax', (s) => { s.tax_basis = 'after_tax'; }, false],
  ['kind pension (not in enum)', (s) => { s.kind = 'pension'; }, false],
];
for (const [name, mut, expect] of cases) { const d = clone(base); mut(d); const got = validate(d); const ok = expect === null || got === expect; if (!ok) bad++; log(`${ok ? 'OK  ' : 'FAIL'} ${name}: accepted=${got} expected=${expect}`); }
for (const [name, mut, expect] of srcCases) { const d = withSrc((s) => { mut(s); return s; }); const got = validate(d); const ok = expect === null || got === expect; if (!ok) bad++; log(`${ok ? (expect === null ? 'NOTE' : 'OK  ') : 'FAIL'} ${name}: accepted=${got} expected=${expect}`); }
log(bad ? `${bad} FAIL` : 'ALL SWEEPS OK');
process.exitCode = bad ? 1 : 0;
