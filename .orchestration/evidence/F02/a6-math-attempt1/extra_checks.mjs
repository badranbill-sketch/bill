// Supplementary checks: demos for missed faults, bounds, per-source rounding, forbidden outputs,
// randomized properties over schema-valid inputs.
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { computeModel, semanticErrors, Q } from './model.mjs';

const C = '/home/user/bill/.orchestration/contracts';
const ajv = new Ajv2020({ strict: false, allErrors: true });
const validate = ajv.compile(JSON.parse(fs.readFileSync(`${C}/workshop-inputs.schema.json`, 'utf8')));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };
const clone = (o) => JSON.parse(JSON.stringify(o));
const src = (id, o = {}) => ({ id, kind: 'workplace_pension', owner: 'self', amount: { status: 'estimated', value: 3000000 }, period: 'annual', tax_basis: 'net', price_basis: 'start_year_dollars', start: { reference: 'already_receiving' }, escalation_bp: { status: 'zero', value: 0 }, dependability: 'scheduled', ...o });
const doc = (o = {}) => ({ contract: 'workshop-inputs', contract_version: '1.0', currency: 'CAD', base_year: 2026, chapters: {
  life: { spending: { amount: { status: 'estimated', value: 400000 }, period: 'monthly', tax_basis: 'after_tax', price_basis: 'today_dollars', unit: 'household' } },
  income: { coverage: 'all_known_sources_listed', sources: [src('src-1')] }, savings: {},
  timing: { current_age: { status: 'estimated', value: 60 }, retirement_age: { status: 'estimated', value: 62 }, planning_horizon_years: { status: 'estimated', value: 6 }, inflation_bp: { status: 'zero', value: 0 } }, ...o } });
const row0 = (out) => { const y = out.years[0]; return y ? { t: y.t, status: y.status, spending_cents: y.spending_cents, gap_cents: y.gap_cents, surplus_cents: y.surplus_cents, reasons: y.reasons } : null; };
const brief = (out) => ({ state: out.completeness.state, clip: out.clip.selected, reason: out.clip.selection_reason, flags: out.flags });

console.log('== DEMO A: start point unknown (window known) - correct vs two faults that pass every fixture');
{
  const d = doc(); d.chapters.income.sources.push(src('src-2', { kind: 'qpp_cpp', amount: { status: 'estimated', value: 1000000 }, start: { reference: 'age', point: { status: 'unknown' } } }));
  ok(validate(d) && semanticErrors(d).length === 0, 'demo A input is schema-valid and semantically valid');
  const g = computeModel(d), f1 = computeModel(d, { startPointUnknownAsNotPaying: true }), f2 = computeModel(d, { startPointUnknownAsAlreadyReceiving: true });
  console.log('   correct :', JSON.stringify(brief(g)), JSON.stringify(row0(g)));
  console.log('   fault 1 :', JSON.stringify(brief(f1)), JSON.stringify(row0(f1)));
  console.log('   fault 2 :', JSON.stringify(brief(f2)), JSON.stringify(row0(f2)));
  ok(g.clip.selected === 'W06' && g.years.every((y) => y.gap_cents === null), 'correct model: W06, no gap in any year (unknown is not zero)');
  ok(f1.clip.selected === 'W07' && f1.years[0].gap_cents === 1800000, 'fault 1 shows a confident 18,000.00 gap and W07');
}
console.log('== DEMO B: end point unknown - correct vs fault that passes every fixture');
{
  const d = doc(); d.chapters.income.sources.push(src('src-2', { kind: 'other', amount: { status: 'estimated', value: 1200000 }, end: { reference: 'age', point: { status: 'unknown' } } }));
  ok(validate(d) && semanticErrors(d).length === 0, 'demo B input is schema-valid and semantically valid');
  const g = computeModel(d), f = computeModel(d, { unknownEndAsOpen: true });
  console.log('   correct :', JSON.stringify(brief(g)), JSON.stringify(row0(g)));
  console.log('   fault   :', JSON.stringify(brief(f)), JSON.stringify(row0(f)));
}
console.log('== DEMO C: spending unknown with a known window - correct vs fault that passes every fixture');
{
  const d = doc(); d.chapters.life.spending.amount = { status: 'unknown' };
  ok(validate(d), 'demo C input is schema-valid');
  const g = computeModel(d), f = computeModel(d, { unknownSpendingZeroRowsOnly: true });
  console.log('   correct :', JSON.stringify(brief(g)), JSON.stringify(row0(g)));
  console.log('   fault   :', JSON.stringify(brief(f)), JSON.stringify(row0(f)));
  ok(JSON.stringify(brief(g)) === JSON.stringify(brief(f)), 'state, clip and flags are identical, so the clip-rules expectations cannot tell them apart');
}
console.log('== DEMO D: capital illustration with t_R > 0 (no fixture has t_R > 0 and r present)');
{
  const d = doc(); d.chapters.income = { coverage: 'no_planned_income', sources: [] };
  d.chapters.timing = { current_age: { status: 'estimated', value: 58 }, retirement_age: { status: 'estimated', value: 62 }, planning_horizon_years: { status: 'estimated', value: 4 }, inflation_bp: { status: 'estimated', value: 200 }, capital_illustration_return_bp: { status: 'estimated', value: 400 } };
  ok(validate(d), 'demo D input is schema-valid');
  const g = computeModel(d).capital_illustration.reference_if_enabled, f = computeModel(d, { crDiscountToBase: true }).capital_illustration.reference_if_enabled;
  console.log(`   correct C_R valued at start of t_R=4: ${g.C_R_cents} cents; faulty (discounted to t=0): ${f.C_R_cents} cents; valued_at reported identically: ${JSON.stringify(g.valued_at) === JSON.stringify(f.valued_at)}`);
}
console.log('== DEMO E: all-surplus result with r present (C_R = 0 must never be display-eligible)');
{
  const d = doc(); d.chapters.income.sources[0].amount.value = 6000000; d.chapters.timing.capital_illustration_return_bp = { status: 'estimated', value: 300 };
  const g = computeModel(d).capital_illustration.reference_if_enabled, f = computeModel(d, { ignoreNoPositiveGap: true }).capital_illustration.reference_if_enabled;
  console.log(`   correct: C_R=${g.C_R_cents} eligible=${g.display_eligible_if_enabled} reasons=${JSON.stringify(g.ineligible_reasons)}; fault: eligible=${f.display_eligible_if_enabled}`);
}

console.log('== BOUNDS (workshop-math.md s9 claims largest rounded output ~2.0e12 cents, below 2^53-1)');
{
  const d = doc();
  d.chapters.life.spending = { amount: { status: 'estimated', value: 120000000 }, period: 'annual', tax_basis: 'after_tax', price_basis: 'today_dollars', unit: 'household' };
  d.chapters.timing = { current_age: { status: 'estimated', value: 18 }, retirement_age: { status: 'estimated', value: 61 }, planning_horizon_years: { status: 'estimated', value: 60 }, inflation_bp: { status: 'estimated', value: 1000 }, capital_illustration_return_bp: { status: 'zero', value: 0 } };
  d.chapters.income = { coverage: 'no_planned_income', sources: [] };
  ok(validate(d), 'max-spending input schema-valid (A=18, R=61, H=60, i=10%, 1.2M/yr)');
  const o1 = computeModel(d);
  const maxD = Math.max(...o1.years.map((y) => y.spending_cents));
  const cr = o1.capital_illustration.reference_if_enabled.C_R_cents;
  const d2 = clone(d); d2.chapters.income = { coverage: 'all_known_sources_listed', sources: Array.from({ length: 8 }, (_, k) => src(`src-${k + 1}`, { amount: { status: 'estimated', value: 60000000 }, escalation_bp: { status: 'estimated', value: 1000 } })) };
  ok(validate(d2), 'max-income input schema-valid (8 sources x 600,000/yr, q=10%)');
  const o2 = computeModel(d2);
  const maxI = Math.max(...o2.years.map((y) => y.income_net_cents)); const maxS = Math.max(...o2.years.map((y) => y.surplus_cents));
  console.log(`   max spending_cents ${maxD.toExponential(4)}; max income_net_cents ${maxI.toExponential(4)}; max surplus_cents ${maxS.toExponential(4)}; C_R_cents at r=0 ${cr.toExponential(4)}; 2^53-1 = ${(2 ** 53 - 1).toExponential(4)}`);
  ok([maxD, maxI, maxS, cr].every(Number.isSafeInteger), 'every extreme output is a safe integer (conclusion of s9 holds)');
  ok(maxI > 2.1e12 || cr > 2.1e12, `but the "largest rounded output ~2.0e12" statement is exceeded (income ${maxI.toExponential(2)}, C_R ${cr.toExponential(2)})`);
}

console.log('== PER-SOURCE ROUNDING vs the "at most 1 cent" statement (s9)');
{
  const d = doc();
  d.chapters.life.spending = { amount: { status: 'estimated', value: 10000000 }, period: 'annual', tax_basis: 'after_tax', price_basis: 'today_dollars', unit: 'household' };
  d.chapters.income.sources = Array.from({ length: 8 }, (_, k) => src(`src-${k + 1}`, { amount: { status: 'estimated', value: 1000004 }, escalation_bp: { status: 'estimated', value: 1000 } }));
  d.chapters.timing = { current_age: { status: 'estimated', value: 65 }, retirement_age: { status: 'estimated', value: 65 }, planning_horizon_years: { status: 'estimated', value: 2 }, inflation_bp: { status: 'zero', value: 0 } };
  ok(validate(d) && semanticErrors(d).length === 0, 'demo input schema-valid');
  const y = computeModel(d).years[1];
  const sumRows = Object.values(y.income_by_source_cents).reduce((a, b) => a + b, 0);
  console.log(`   t=1 each source exact 1100004.4 -> row 1100004; sum of rows ${sumRows}; income_net_cents ${y.income_net_cents}; spending ${y.spending_cents}; gap ${y.gap_cents}; spending - sum(rows) = ${y.spending_cents - sumRows}`);
  ok(Math.abs((y.spending_cents - y.income_net_cents) - y.gap_cents) <= 1, 'vs the displayed group total the gap is within 1 cent (claim holds)');
  ok(Math.abs((y.spending_cents - sumRows) - y.gap_cents) === 3, 'vs the sum of displayed per-source rows the gap differs by 3 cents (claim does not cover this)');
}

console.log('== FORBIDDEN OUTPUTS: scan every fixture expected record and every model output');
{
  const bad = /verdict|readiness|ready|on_track|on track|enough|sufficien|shortfall|deplet|run_out|run out|lasts until|success|probab|percentile|monte|safe_withdrawal|withdrawal_rate|4%|optimal|recommend|reviewed|you can retire|traffic|score|required_savings|what_you_need|life_expectancy/i;
  const hits = [];
  const walk = (o, p) => { if (o && typeof o === 'object') { for (const [k, v] of Object.entries(o)) { if (bad.test(k)) hits.push(`${p}/${k} (key)`); walk(v, `${p}/${k}`); } } else if (typeof o === 'string' && bad.test(o)) hits.push(`${p} = ${o}`); };
  const FD = `${C}/fixtures/workshop`;
  for (const f of fs.readdirSync(FD).filter((x) => /^WM/.test(x))) { const fx = JSON.parse(fs.readFileSync(`${FD}/${f}`, 'utf8')); walk(fx.expected, f); walk(computeModel(fx.input), f + '#computed'); }
  const cr = JSON.parse(fs.readFileSync(`${FD}/clip-rules.json`, 'utf8'));
  for (const r of cr.truth_table) walk(r.expected, `row${r.row}`);
  for (const c of [...cr.supplementary_cases, ...cr.media_state_cases]) walk(c.expected, c.case);
  ok(hits.length === 0, `no verdict/readiness/depletion/probability/safe-withdrawal/review key or value in any output record (${hits.length} hits)${hits.length ? ' ' + hits.slice(0, 5).join('; ') : ''}`);
  ok(cr.truth_table.concat(cr.supplementary_cases).every((r) => !r.expected || r.expected.selected !== undefined), 'every possible selection is a clip id, never a verdict');
}

console.log('== RANDOMIZED PROPERTIES over schema-valid inputs (seeded)');
{
  let seed = 20260930; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const pick = (a) => a[Math.floor(rnd() * a.length)]; const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const qty = (lo, hi, allowUnknown = true, allowZero = false) => { const r = rnd(); if (allowUnknown && r < 0.12) return { status: 'unknown' }; if (allowZero && r < 0.2) return { status: 'zero', value: 0 }; return { status: pick(['estimated', 'confirmed']), value: int(lo, hi) }; };
  let n = 0, valid = 0, cf = 0, oneOf = 0, compOK = 0, twinOK = 0, unkOK = 0, safe = 0, stateOK = 0, crOK = 0, crN = 0;
  for (let it = 0; it < 4000; it++) {
    const A = rnd() < 0.08 ? null : int(18, 90); const R = rnd() < 0.08 ? null : int(Math.max(30, A ?? 30), 95);
    const Hmax = R === null ? 60 : Math.min(60, 121 - R);
    const hh = rnd() < 0.3 ? (() => { const pa = int(18, 90); return { partner_current_age: rnd() < 0.15 ? { status: 'unknown' } : { status: 'estimated', value: pa }, partner_retirement_age: rnd() < 0.15 ? { status: 'unknown' } : { status: 'estimated', value: int(Math.max(30, pa), 95) } }; })() : null;
    const cov = pick(['all_known_sources_listed', 'all_known_sources_listed', 'some_sources_may_be_missing', 'no_planned_income', 'not_answered']);
    const sources = [];
    if (cov === 'all_known_sources_listed' || (cov === 'some_sources_may_be_missing' && rnd() < 0.7)) {
      const k = int(1, 4);
      for (let j = 1; j <= k; j++) {
        const owner = hh ? pick(['self', 'partner', 'joint']) : pick(['self', 'joint']);
        const Ao = owner === 'partner' ? (hh.partner_current_age.value ?? null) : A;
        const ref = pick(['already_receiving', 'age', 'year_index']);
        let start = { reference: 'already_receiving' };
        if (ref === 'age') start = { reference: 'age', point: rnd() < 0.1 ? { status: 'unknown' } : { status: 'estimated', value: int(Math.max(18, Ao ?? 18), 100) } };
        if (ref === 'year_index') start = { reference: 'year_index', point: rnd() < 0.1 ? { status: 'unknown' } : { status: 'estimated', value: int(1, 40) } };
        const s = { id: `src-${j}`, kind: pick(['qpp_cpp', 'oas', 'workplace_pension', 'annuity', 'employment', 'rental', 'business', 'other']), owner,
          amount: qty(1, 5000000, true, true), period: pick(['monthly', 'annual']), tax_basis: pick(['net', 'net', 'net', 'gross', 'unknown']),
          price_basis: pick(['today_dollars', 'start_year_dollars', 'unknown']), start, escalation_bp: rnd() < 0.4 ? { status: 'zero', value: 0 } : { status: 'estimated', value: int(1, 1000) },
          dependability: pick(['scheduled', 'uncertain']) };
        if (rnd() < 0.15) s.end = { reference: 'year_index', point: rnd() < 0.2 ? { status: 'unknown' } : { status: 'estimated', value: int(41, 82) } };
        sources.push(s);
      }
    }
    const d = doc(); d.chapters.life.spending = { amount: qty(1, 10000000), period: 'monthly', tax_basis: 'after_tax', price_basis: 'today_dollars', unit: 'household' };
    d.chapters.income = { coverage: cov, sources };
    d.chapters.timing = { current_age: A === null ? { status: 'unknown' } : { status: 'estimated', value: A }, retirement_age: R === null ? { status: 'unknown' } : { status: 'estimated', value: R },
      planning_horizon_years: { status: 'estimated', value: int(1, Hmax) }, inflation_bp: rnd() < 0.2 ? { status: 'zero', value: 0 } : { status: 'estimated', value: int(1, 1000) } };
    if (rnd() < 0.5) d.chapters.timing.capital_illustration_return_bp = rnd() < 0.2 ? { status: 'zero', value: 0 } : { status: 'estimated', value: int(1, 1000) };
    if (hh) d.chapters.timing.household = hh;
    n++;
    if (!validate(d) || semanticErrors(d).length) continue;
    valid++;
    const o = computeModel(d); const I = o._internal;
    if (!(o.clip.predicates.C && o.clip.predicates.F)) cf++;
    if (o.years.every((y) => y.status !== 'computed' || !(y.gap_cents > 0 && y.surplus_cents > 0)) && o.years.every((y) => (y.status === 'computed') === (y.gap_cents !== null && y.surplus_cents !== null))) oneOf++;
    const covOK = cov === 'all_known_sources_listed' || cov === 'no_planned_income';
    if (o.years.every((y) => y.status !== 'computed' || (y.spending_cents !== null && covOK && Object.values(y.income_by_source_cents).every((v) => v !== null) && y.income_gross_cents === 0 && y.income_unknown_basis_cents === 0))) compOK++;
    const vals = []; o.years.forEach((y) => ['spending_cents', 'gap_cents', 'surplus_cents', 'income_net_cents', 'income_gross_cents'].forEach((k) => y[k] !== null && vals.push(y[k])));
    if (vals.every(Number.isSafeInteger)) safe++;
    const st = o.completeness.state;
    if ((st === 'complete') === (o.window !== null && o.years.every((y) => y.status === 'computed'))) stateOK++;
    // twin: monthly m -> annual 12m gives identical output
    if (d.chapters.life.spending.amount.value !== undefined) {
      const t = clone(d); t.chapters.life.spending.period = 'annual'; t.chapters.life.spending.amount.value *= 12;
      if (validate(t) && JSON.stringify(computeModel(t)) === JSON.stringify(o)) twinOK++; else if (!validate(t)) twinOK++;
    } else twinOK++;
    // unknown propagation: making a known source amount unknown never creates a number where there was none
    const j = sources.findIndex((s) => s.amount.status === 'estimated' || s.amount.status === 'confirmed');
    if (j >= 0) {
      const u = clone(d); u.chapters.income.sources[j].amount = { status: 'unknown' };
      const ou = computeModel(u);
      const good = ou.years.every((y, k) => (o.years[k].gap_cents !== null || y.gap_cents === null) && (o.years[k].income_by_source_cents[sources[j].id] === 0 || y.status === 'not_computable'));
      if (good) unkOK++;
    } else unkOK++;
    // C_R by direct closed-form sum
    const ci = o.capital_illustration.reference_if_enabled;
    if (ci.computable) {
      crN++;
      const r = ci.r_bp; let s = Q.of(0);
      I.years.forEach((y, k) => { s = s.add(y._G.div(new Q((10000n + BigInt(r)) ** BigInt(k + 1), 10000n ** BigInt(k + 1)))); });
      if (s.toExact() === ci.C_R_exact) crOK++;
    }
  }
  console.log(`   generated ${n}, schema+semantic valid ${valid}`);
  ok(cf === valid, `C and F never both true (${cf}/${valid})`);
  ok(oneOf === valid, `at most one of G,S positive; both present iff computed (${oneOf}/${valid})`);
  ok(compOK === valid, `every computed year has known D, complete coverage, all P known, only net income (${compOK}/${valid})`);
  ok(stateOK === valid, `state complete iff window known and every window year computed (${stateOK}/${valid})`);
  ok(safe === valid, `all displayed cents are safe integers (${safe}/${valid})`);
  ok(twinOK === valid, `monthly/annual spending twins give identical output records (${twinOK}/${valid})`);
  ok(unkOK === valid, `known->unknown source amount never creates a number, and blocks every year it pays (${unkOK}/${valid})`);
  ok(crOK === crN, `C_R (Horner recursion) equals direct sum of G/(1+r)^(k+1) (${crOK}/${crN})`);
}
console.log(`== summary: ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
