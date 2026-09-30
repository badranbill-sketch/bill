// Random valid-input generator + property checks + differential oracle.
// Usage: node fuzz.mjs <seed> <n>  -> writes out/fuzz_inputs_<seed>.json and prints property results.
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { evaluate, semanticErrors } from './model.mjs';

const schema = JSON.parse(fs.readFileSync('/home/user/bill/.orchestration/contracts/workshop-inputs.schema.json', 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

let seed = Number(process.argv[2] || 1) >>> 0;
const N = Number(process.argv[3] || 2000);
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const chance = (p) => rnd() < p;

function qty(lo, hi, statuses) {
  const st = pick(statuses);
  if (st === 'unknown') return { status: 'unknown' };
  if (st === 'zero') return { status: 'zero', value: 0 };
  return { status: st, value: ri(Math.max(lo, 1), hi) };
}
function rate(pZero = 0.3) {
  if (chance(pZero)) return { status: 'zero', value: 0 };
  return { status: 'estimated', value: pick([1, 50, 100, 150, 200, 250, 300, 500, 1000, ri(1, 1000)]) };
}
function bound(isStart, ownerAgeHint) {
  const refs = isStart ? ['already_receiving', 'age', 'year_index'] : ['age', 'year_index'];
  const ref = pick(refs);
  if (ref === 'already_receiving') return { reference: ref };
  const unk = chance(0.15);
  if (unk) return { reference: ref, point: { status: 'unknown' } };
  if (ref === 'age') return { reference: ref, point: { status: pick(['estimated', 'confirmed']), value: ri(Math.max(18, ownerAgeHint ?? 18), 100) } };
  return { reference: ref, point: { status: pick(['estimated', 'confirmed']), value: ri(1, 82) } };
}
function gen() {
  const A = chance(0.1) ? null : ri(18, 100);
  const Rv = A === null ? ri(30, 100) : ri(Math.max(30, A), Math.min(100, A + ri(0, 20)));
  const R = chance(0.08) ? null : Rv;
  const Hmax = R === null ? 60 : Math.min(60, 121 - R);
  const H = ri(1, Math.max(1, Math.min(Hmax, pick([1, 3, 6, 10, 25, 60]))));
  const household = chance(0.35);
  const pAv = ri(18, 100);
  const pA = chance(0.15) ? null : pAv;
  const pRv = ri(Math.max(30, pAv), Math.min(100, pAv + ri(0, 15)));
  const pR = chance(0.1) ? null : pRv;
  const coverage = pick(['all_known_sources_listed', 'some_sources_may_be_missing', 'no_planned_income', 'not_answered', 'all_known_sources_listed']);
  let nsrc = 0;
  if (coverage === 'all_known_sources_listed') nsrc = ri(1, 4);
  else if (coverage === 'some_sources_may_be_missing') nsrc = ri(0, 3);
  const sources = [];
  for (let k = 0; k < nsrc; k++) {
    const owner = household ? pick(['self', 'partner', 'joint']) : pick(['self', 'joint']);
    const ownerAge = owner === 'partner' ? pA : A;
    const period = pick(['monthly', 'annual']);
    const amount = qty(1, period === 'monthly' ? pick([5000000, 300000]) : pick([60000000, 3000000]), ['unknown', 'zero', 'estimated', 'confirmed', 'estimated', 'estimated']);
    const start = bound(true, ownerAge);
    const s = {
      id: `src-${k + 1}`, kind: pick(['qpp_cpp', 'oas', 'workplace_pension', 'annuity', 'employment', 'rental', 'business', 'other']),
      owner, amount, period, tax_basis: pick(['net', 'net', 'net', 'gross', 'unknown']),
      price_basis: pick(['today_dollars', 'start_year_dollars', 'unknown', 'today_dollars']),
      start, escalation_bp: rate(0.4), dependability: pick(['scheduled', 'uncertain']),
    };
    if (chance(0.3)) s.end = bound(false, ownerAge);
    sources.push(s);
  }
  const savings = {};
  if (chance(0.5)) {
    savings.accounts = {};
    for (const c of ['rrsp_rrif', 'tfsa', 'non_registered', 'other', 'not_sure']) if (chance(0.4)) savings.accounts[c] = qty(1, 5000000000, ['unknown', 'zero', 'estimated', 'confirmed']);
  }
  if (chance(0.3)) savings.pension_value = { amount: qty(1, 5000000000, ['unknown', 'zero', 'estimated']), also_entered_as_income: pick(['yes', 'no', 'not_sure']) };
  if (chance(0.3)) savings.home_value = { amount: qty(1, 5000000000, ['unknown', 'zero', 'estimated']), ...(chance(0.5) ? { excluded_from_spendable: true } : {}) };
  if (chance(0.15)) savings.business_value = { amount: qty(1, 5000000000, ['unknown', 'zero', 'estimated']) };
  const spPeriod = pick(['monthly', 'annual']);
  const timing = {
    current_age: A === null ? { status: 'unknown' } : { status: pick(['estimated', 'confirmed']), value: A },
    retirement_age: R === null ? { status: 'unknown' } : { status: 'estimated', value: R },
    planning_horizon_years: { status: 'estimated', value: H },
    inflation_bp: rate(0.3),
  };
  if (chance(0.5)) timing.capital_illustration_return_bp = rate(0.2);
  if (household) timing.household = {
    partner_current_age: pA === null ? { status: 'unknown' } : { status: 'estimated', value: pA },
    partner_retirement_age: pR === null ? { status: 'unknown' } : { status: 'estimated', value: pR },
  };
  return {
    contract: 'workshop-inputs', contract_version: '1.0', currency: 'CAD', base_year: ri(2026, 2030),
    chapters: {
      life: { spending: { amount: qty(1, spPeriod === 'monthly' ? pick([10000000, 800000]) : pick([120000000, 9000000]), ['unknown', 'estimated', 'estimated', 'confirmed']), period: spPeriod, tax_basis: 'after_tax', price_basis: 'today_dollars', unit: 'household' } },
      income: { coverage, sources },
      savings,
      timing,
    },
  };
}

const violations = {}; const bump = (k, ex) => { (violations[k] ||= { n: 0, ex }).n++; };
const inputs = []; let tried = 0, rejectedSchema = 0, rejectedSem = 0;
const clipCount = {}; const stateCount = {};
while (inputs.length < N && tried < N * 20) {
  tried++;
  const doc = gen();
  if (!validate(doc)) { rejectedSchema++; continue; }
  if (semanticErrors(doc).length) { rejectedSem++; continue; }
  inputs.push(doc);
  const out = evaluate(doc);
  const P = out.clip.predicates;
  clipCount[out.clip.selected + '/' + out.clip.selection_reason] = (clipCount[out.clip.selected + '/' + out.clip.selection_reason] || 0) + 1;
  stateCount[out.completeness.state] = (stateCount[out.completeness.state] || 0) + 1;
  // P1: C excludes F
  if (P.C && P.F) bump('C_and_F', doc);
  // P2: computed <=> no reasons
  for (const y of out.years) {
    if ((y.status === 'computed') !== (y.reasons.length === 0)) bump('computed_iff_no_reason', { doc, t: y.t });
    if (y.status === 'computed') {
      if (y.gap_cents > 0 && y.surplus_cents > 0) bump('gap_and_surplus_both_positive', doc);
      if (y.gap_cents < 0 || y.surplus_cents < 0) bump('negative', doc);
      // |display G/S - (display D - display I_net)| <= 1 cent
      const disp = y.spending_cents - y.income_net_cents;
      const gs = y.gap_cents - y.surplus_cents;
      if (Math.abs(disp - gs) > 1) bump('rounding_gap_over_1c', { t: y.t, disp, gs });
      if (y.income_gross_cents !== 0 && y.income_gross_cents !== null) bump('computed_with_gross_income', doc);
      if (y.income_unknown_basis_cents !== 0 && y.income_unknown_basis_cents !== null) bump('computed_with_unknown_basis_income', doc);
    } else {
      if (y.gap_cents !== null || y.surplus_cents !== null || y.gap_today_dollars_cents !== null) bump('noncomputed_has_number', doc);
    }
    // unknown never 0: a null P must correspond to a code for that source
    for (const [id, v] of Object.entries(y.income_by_source_cents)) {
      const hasNullCode = y.reasons.some((c) => /^(amount_unknown|start_unknown|start_unresolvable|end_unknown|end_unresolvable|price_basis_unknown):/.test(c) && c.endsWith(':' + id));
      if ((v === null) !== hasNullCode) bump('null_iff_first_six_codes', { id, t: y.t });
    }
    const cov = doc.chapters.income.coverage;
    if ((cov === 'not_answered' || cov === 'some_sources_may_be_missing') && (y.income_net_cents !== null || y.income_gross_cents !== null || y.income_unknown_basis_cents !== null)) bump('incomplete_coverage_group_not_null', doc);
  }
  // P3: completeness vs window
  if ((out.window === null) !== (out.completeness.state === 'incomplete_unknown_timing')) bump('window_null_iff_timing', doc);
  if (out.window === null && out.years.length) bump('years_without_window', doc);
  // P4: capital illustration never displayed
  const ci = out.capital_illustration;
  if (ci.displayed || ci.feature_flag !== 'off' || ci.state !== 'disabled_by_flag') bump('capital_displayed', doc);
  if (ci.reference_if_enabled.computable && ci.reference_if_enabled.C_R_cents === 0 && ci.reference_if_enabled.display_eligible_if_enabled) bump('CR_zero_eligible', doc);
  // P5: exactly one clip, first-true precedence
  const exp = P.C ? 'W10' : P.M ? 'W06' : P.X ? 'W08' : P.H ? 'W09' : P.F ? 'W07' : 'W10';
  if (exp !== out.clip.selected) bump('precedence', doc);
  // P6: state 'complete' <=> all rows computed and window known
  if ((out.completeness.state === 'complete') !== (out.window !== null && out.years.every((y) => y.status === 'computed'))) bump('complete_iff_all_computed', doc);
  // P7: sorted, unique code arrays
  const arrs = [out.completeness.reasons, out.flags, ...out.years.map((y) => y.reasons), ci.reference_if_enabled.not_computable_reasons, ci.reference_if_enabled.ineligible_reasons];
  for (const a of arrs) if (JSON.stringify(a) !== JSON.stringify([...new Set(a)].sort())) bump('unsorted_codes', a);
  // P8: final cents are safe integers
  const js = JSON.stringify(out);
  for (const m of js.matchAll(/"[a-z_]*_cents":(\d+)/g)) if (!Number.isSafeInteger(Number(m[1]))) bump('unsafe_integer', m[0]);
  // P9: M/X/F vs completeness state consistency when window known and spending known
  if (out.window && doc.chapters.life.spending.amount.status !== 'unknown') {
    const st = out.completeness.state;
    if (P.M !== (st === 'incomplete_unknown_income')) bump('M_vs_state', { st, P });
    if (!P.M && P.X !== (st === 'basis_mismatch' || st === 'basis_unknown')) bump('X_vs_state', { st, P });
  }
}
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync(`out/fuzz_inputs_${process.argv[2] || 1}.json`, JSON.stringify(inputs));
console.log(JSON.stringify({ seed: process.argv[2] || 1, generated: inputs.length, tried, rejectedSchema, rejectedSem, clipCount, stateCount,
  violations: Object.fromEntries(Object.entries(violations).map(([k, v]) => [k, { n: v.n, example: JSON.stringify(v.ex).slice(0, 400) }])) }, null, 1));
