// Inject known faults into the independent model and record which fixture(s) catch each.
// A fault "caught by none" means the conformance suite would pass a runtime that has it.
import fs from 'node:fs';
import path from 'node:path';
import { computeModel } from './model.mjs';
import { deepDiff } from './run_fixtures_lib.mjs';

const FD = '/home/user/bill/.orchestration/contracts/fixtures/workshop';
const wm = fs.readdirSync(FD).filter((f) => /^WM\d\d/.test(f)).sort().map((f) => JSON.parse(fs.readFileSync(path.join(FD, f), 'utf8')));
const cr = JSON.parse(fs.readFileSync(`${FD}/clip-rules.json`, 'utf8'));
const clipCases = [
  ...cr.truth_table.filter((r) => r.possible).map((r) => ({ id: `row${r.row}`, input: r.input, exp: { ...r.expected, predicates: r.predicates } })),
  ...cr.supplementary_cases.map((c) => ({ id: c.case, input: c.input, exp: c.expected })),
];

const faults = [
  ['halfUp', 'half-up rounding instead of half-even'],
  ['float64', 'IEEE-754 double growth factors'],
  ['allowGrossInGap', 'gross income subtracted from after-tax spending'],
  ['coverageIgnored', 'incomplete coverage ignored (unanswered income read as zero)'],
  ['ignorePriceBasis', 'today-dollar income treated as nominal start-year amount'],
  ['nettedSurplus', 'surpluses netted against gaps in C_R'],
  ['taxUnknownAsNet', 'tax basis "unknown" treated as net'],
  ['monthlyIncomeNotTimes12', 'monthly income not multiplied by 12'],
  ['deflateFromRetirement', 'today-dollar display deflated from t_R instead of t = 0'],
  ['crStartOfYear', 'C_R with start-of-year flows (exponent k instead of k+1)'],
  ['partnerStartSelfAge', "partner-owned age resolved with the participant's age"],
  ['endInclusive', 'end index treated as inclusive'],
  ['escalateFromZero', 'escalation compounded from t = 0 instead of from s_j'],
  ['windowFromZero', 'pre-retirement years shown in the window'],
  ['precedenceFbeforeM', 'funding gap ranked before missing income'],
  ['precedenceHafterF', 'household timing ranked after funding gap'],
  // unknown-is-never-zero faults that the task asks us to probe specifically
  ['unknownSpendingZeroRowsOnly', 'unknown spending read as 0 in year rows (state and clip unchanged)'],
  ['unknownStartAsNotPaying', 'unknown or unresolvable start point read as "not paying" (P = 0, no code)'],
  ['unknownEndAsOpen', 'unknown or unresolvable end point read as "no end"'],
  ['crDiscountToBase', 'C_R discounted to t = 0 instead of valued at the start of year t_R'],
  ['ignoreNoPositiveGap', 'C_R marked display-eligible when no year has G_t > 0 (C_R = 0 displayed)'],
  ['unresolvableStartAsNotPayingWindowKnown', 'start_unresolvable (partner age unknown, window known) read as "not paying"'],
  ['startPointUnknownAsNotPaying', 'start point with status unknown read as "not paying" (window known)'],
  ['startPointUnknownAsAlreadyReceiving', 'start point with status unknown read as already receiving (s_j = 0)'],
];
const PREC = {
  precedenceFbeforeM: [['C', 'W10', 'core_inputs_missing'], ['F', 'W07', 'funding_gap'], ['M', 'W06', 'missing_income'], ['X', 'W08', 'tax_basis'], ['H', 'W09', 'household_timing']],
  precedenceHafterF: [['C', 'W10', 'core_inputs_missing'], ['M', 'W06', 'missing_income'], ['X', 'W08', 'tax_basis'], ['F', 'W07', 'funding_gap'], ['H', 'W09', 'household_timing']],
};

const summary = [];
for (const [key, label] of faults) {
  const opts = PREC[key] ? { precedenceOrder: PREC[key] } : { [key]: true };
  const caughtBy = [];
  for (const fx of wm) {
    let d;
    try { d = deepDiff(JSON.parse(JSON.stringify(computeModel(fx.input, opts))), fx.expected); } catch (e) { d = ['threw ' + e.message]; }
    if (d.length) caughtBy.push(fx.fixture_id);
  }
  for (const c of clipCases) {
    let out; try { out = computeModel(c.input, opts); } catch (e) { caughtBy.push(c.id); continue; }
    const got = { selected: out.clip.selected, selection_reason: out.clip.selection_reason, completeness_state: out.completeness.state, flags: out.flags, predicates: out.clip.predicates };
    const exp = { selected: c.exp.selected, selection_reason: c.exp.selection_reason, completeness_state: c.exp.completeness_state, flags: c.exp.flags, predicates: c.exp.predicates };
    if (JSON.stringify(got) !== JSON.stringify(exp)) caughtBy.push(c.id);
  }
  summary.push({ fault: key, label, caught_by: caughtBy });
  console.log(`${caughtBy.length ? 'CAUGHT ' : 'MISSED '} ${key.padEnd(28)} ${label}  -> ${caughtBy.length ? caughtBy.join(',') : 'no fixture detects it'}`);
}

// Demonstrate the missed spending fault on a concrete clip-rules input (row 17: spending unknown)
const row17 = cr.truth_table.find((r) => r.row === 17);
const good = computeModel(row17.input), bad = computeModel(row17.input, { unknownSpendingZeroRowsOnly: true });
console.log('\nrow 17 (spending unknown) correct first year :', JSON.stringify({ status: good.years[0].status, spending_cents: good.years[0].spending_cents, gap_cents: good.years[0].gap_cents, surplus_cents: good.years[0].surplus_cents }));
console.log('row 17 faulty  first year                   :', JSON.stringify({ status: bad.years[0].status, spending_cents: bad.years[0].spending_cents, gap_cents: bad.years[0].gap_cents, surplus_cents: bad.years[0].surplus_cents }));
console.log('row 17 faulty state/clip/flags              :', bad.completeness.state, bad.clip.selected, bad.clip.selection_reason, JSON.stringify(bad.flags));
fs.writeFileSync(new URL('./out/negative_controls.json', import.meta.url), JSON.stringify(summary, null, 1));
