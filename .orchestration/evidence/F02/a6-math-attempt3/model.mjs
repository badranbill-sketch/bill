// Independent implementation of workshop-math.md 1.0 (A6 attempt 3, fresh context).
// Written from the contract prose only (workshop-math.md, workshop-inputs.md,
// workshop-clip-rules.md). Does NOT import or port evidence/F02/math/*.py.
// Differences from the reference by design:
//   * JavaScript BigInt rationals (rational.mjs) instead of Python Fraction;
//   * growth factors built by an iterative year-by-year product, not pow();
//   * C_R by backward (Horner) recursion V_k = (G_k + V_{k+1})/(1+r), not a sum of
//     discounted terms;
//   * payment test as an explicit ordered rule list returning 'yes'|'no'|'unknown'.

import { Q, ZERO, ONE, factor } from './rational.mjs';

const SIX_M = ['amount_unknown', 'start_unknown', 'start_unresolvable', 'end_unknown', 'end_unresolvable', 'price_basis_unknown'];
const BLOCKING_FLAGS = ['gross_net_mismatch', 'tax_basis_unknown', 'incomplete_income', 'pension_double_count_risk'];
const ACCOUNT_ORDER = ['rrsp_rrif', 'tfsa', 'non_registered', 'other', 'not_sure'];
const T_SCAN_MAX = 83; // §8: 0..83 equivalent to every t >= 0

const known = (q) => q && (q.status === 'zero' || q.status === 'estimated' || q.status === 'confirmed');
const val = (q) => (q.status === 'zero' ? 0 : q.value);
const posKnown = (q) => !!(q && known(q) && val(q) > 0);
const sortU = (a) => [...new Set(a)].sort();

// Iterative power table: pw[k] = (1 + bp/10000)^k for k = 0..n
function powTable(bp, n) {
  const f = factor(bp); const out = [ONE];
  for (let k = 1; k <= n; k++) out.push(out[k - 1].mul(f));
  return out;
}

// Resolve a start/end bound. Returns {kind:'resolved', idx} | {kind:'unknown'} | {kind:'unresolvable'} | {kind:'absent'}
function resolveBound(b, ownerAge, isStart) {
  if (b === undefined) return { kind: 'absent' };
  if (isStart && b.reference === 'already_receiving') return { kind: 'resolved', idx: 0 };
  if (b.point.status === 'unknown') return { kind: 'unknown' };
  const p = b.point.value;
  if (b.reference === 'year_index') return { kind: 'resolved', idx: p };
  if (b.reference === 'age') {
    if (ownerAge === null) return { kind: 'unresolvable' };
    return { kind: 'resolved', idx: p - ownerAge };
  }
  throw new Error('bad reference');
}

export function evaluate(input) {
  const ch = input.chapters;
  const Y0 = input.base_year;
  const tim = ch.timing;
  const A = known(tim.current_age) ? tim.current_age.value : null;
  const R = known(tim.retirement_age) ? tim.retirement_age.value : null;
  const H = tim.planning_horizon_years.value;
  const iBp = val(tim.inflation_bp);
  const rBp = tim.capital_illustration_return_bp ? val(tim.capital_illustration_return_bp) : null;
  const hh = tim.household;
  const pA = hh && known(hh.partner_current_age) ? hh.partner_current_age.value : null;
  const pR = hh && known(hh.partner_retirement_age) ? hh.partner_retirement_age.value : null;

  const windowKnown = A !== null && R !== null;
  const tR = windowKnown ? R - A : null;
  const W = windowKnown ? Array.from({ length: H }, (_, k) => tR + k) : [];
  const Tstar = windowKnown ? W : Array.from({ length: T_SCAN_MAX + 1 }, (_, t) => t);
  const tMax = Math.max(T_SCAN_MAX, windowKnown ? tR + H - 1 : 0);

  const infl = powTable(iBp, tMax + 1);

  // Spending
  const sp = ch.life.spending;
  const spendingKnown = sp.amount.status !== 'unknown';
  const a = spendingKnown ? new Q(BigInt(sp.amount.value) * (sp.period === 'monthly' ? 12n : 1n)) : null;
  const D = (t) => (spendingKnown ? a.mul(infl[t]) : null);

  const cov = ch.income.coverage;
  const coverageComplete = cov === 'all_known_sources_listed' || cov === 'no_planned_income';

  // Sources
  const srcs = ch.income.sources.map((s) => {
    const ownerAge = s.owner === 'partner' ? pA : A;
    const st = resolveBound(s.start, ownerAge, true);
    const en = resolveBound(s.end, ownerAge, false);
    const amtKnown = s.amount.status !== 'unknown';
    const aj = amtKnown ? new Q(BigInt(val(s.amount)) * (s.period === 'monthly' ? 12n : 1n)) : null;
    const qBp = val(s.escalation_bp);
    const sRes = st.kind === 'resolved';
    const eRes = en.kind === 'resolved' || en.kind === 'absent';
    const s_ = sRes ? st.idx : null;
    const e_ = en.kind === 'resolved' ? en.idx : (en.kind === 'absent' ? Infinity : null);
    // b_j
    let b = null;
    if (sRes && amtKnown) {
      if (s_ === 0 || s.price_basis === 'start_year_dollars') b = aj;
      else if (s.price_basis === 'today_dollars') b = aj.mul(powTable(iBp, s_)[s_]);
      else b = null; // price_basis unknown and s_j > 0
    }
    // static code conditions (§4 table)
    const staticCodes = [];
    if (s.start.reference !== 'already_receiving' && s.start.point.status === 'unknown') staticCodes.push('start_unknown');
    if (st.kind === 'unresolvable') staticCodes.push('start_unresolvable');
    if (s.end !== undefined && s.end.point.status === 'unknown') staticCodes.push('end_unknown');
    if (en.kind === 'unresolvable') staticCodes.push('end_unresolvable');
    if (s.amount.status === 'unknown') staticCodes.push('amount_unknown');
    if (s.price_basis === 'unknown' && !(sRes && s_ === 0)) staticCodes.push('price_basis_unknown');
    if (s.tax_basis === 'gross') staticCodes.push('gross');
    if (s.tax_basis === 'unknown') staticCodes.push('tax_basis_unknown');

    const escTable = sRes ? powTable(qBp, Math.max(0, tMax - s_ + 1)) : null;

    const pays = (t) => {
      if (s.amount.status === 'zero') return 'no';                 // rule 1
      if (en.kind === 'resolved' && t >= e_) return 'no';          // rule 2
      if (sRes && t < s_) return 'no';                             // rule 3
      if (sRes && eRes) return 'yes';                              // rule 4
      return 'unknown';                                            // rule 5
    };
    const P = (t) => {
      const p = pays(t);
      if (p === 'no') return ZERO;
      if (p === 'unknown') return null;
      if (!amtKnown || b === null) return null;
      return b.mul(escTable[t - s_]);
    };
    const codes = (t) => (pays(t) === 'no' ? [] : staticCodes.map((c) => `${c}:${s.id}`));
    return { s, id: s.id, st, en, sRes, s_, e_, pays, P, codes, staticCodes };
  });

  // Global codes (§7)
  const globalCodes = [];
  if (A === null) globalCodes.push('current_age_unknown');
  if (R === null) globalCodes.push('retirement_age_unknown');
  if (!spendingKnown) globalCodes.push('spending_unknown');
  if (cov === 'not_answered') globalCodes.push('income_not_answered');
  if (cov === 'some_sources_may_be_missing') globalCodes.push('income_list_partial');
  const rowGlobal = globalCodes.filter((c) => ['spending_unknown', 'income_not_answered', 'income_list_partial'].includes(c));

  // Rows
  const years = [];
  for (const t of W) {
    const Dt = D(t);
    const perSrc = {}; const Pv = {};
    let codes = [...rowGlobal];
    for (const j of srcs) {
      const p = j.P(t); Pv[j.id] = p;
      perSrc[j.id] = p === null ? null : Number(p.roundHalfEven());
      codes.push(...j.codes(t));
    }
    codes = sortU(codes);
    // conditions of §5
    const allP = srcs.every((j) => Pv[j.id] !== null);
    const netOnly = srcs.every((j) => Pv[j.id] === null || Pv[j.id].isZero() || j.s.tax_basis === 'net');
    const computed = Dt !== null && coverageComplete && allP && netOnly;
    // Groups
    const group = (basis) => {
      if (!coverageComplete) return null;
      let sum = ZERO;
      for (const j of srcs) {
        if (j.s.tax_basis !== basis) continue;
        if (j.pays(t) === 'no') continue; // P is exact 0 -> not a member
        const p = Pv[j.id];
        if (p === null) return null;
        if (p.isZero()) continue;
        sum = sum.add(p);
      }
      return Number(sum.roundHalfEven());
    };
    const row = {
      t, calendar_year: Y0 + t, age: A + t,
    };
    if (hh && pA !== null) row.partner_age = pA + t;
    row.spending_cents = Dt === null ? null : Number(Dt.roundHalfEven());
    row.income_by_source_cents = perSrc;
    row.income_net_cents = group('net');
    row.income_gross_cents = group('gross');
    row.income_unknown_basis_cents = group('unknown');
    row.status = computed ? 'computed' : 'not_computable';
    row.reasons = codes;
    const exact = { spending: Dt === null ? null : Dt.toExact() };
    if (computed) {
      let inc = ZERO; for (const j of srcs) inc = inc.add(Pv[j.id]);
      const diff = Dt.sub(inc);
      const G = diff.cmp(0) > 0 ? diff : ZERO;
      const S = diff.cmp(0) < 0 ? inc.sub(Dt) : ZERO;
      row.gap_cents = Number(G.roundHalfEven());
      row.surplus_cents = Number(S.roundHalfEven());
      row.gap_today_dollars_cents = Number(G.div(infl[t]).roundHalfEven());
      row.surplus_today_dollars_cents = Number(S.div(infl[t]).roundHalfEven());
      exact.income_compared = inc.toExact(); exact.gap = G.toExact(); exact.surplus = S.toExact();
      row._G = G;
    } else {
      row.gap_cents = null; row.surplus_cents = null;
      row.gap_today_dollars_cents = null; row.surplus_today_dollars_cents = null;
    }
    row.exact = exact;
    years.push(row);
  }

  // T* scan for source-tied codes
  const scanCodes = [];
  for (const t of Tstar) for (const j of srcs) scanCodes.push(...j.codes(t));
  const scanSet = new Set(scanCodes);
  const hasCodeT = (code) => [...scanSet].some((c) => c.startsWith(code + ':'));

  const reasons = sortU([...globalCodes, ...years.flatMap((y) => y.reasons), ...scanCodes]);

  // Predicates
  const C = !windowKnown || !spendingKnown;
  const M = !coverageComplete || SIX_M.some(hasCodeT);
  const X = hasCodeT('gross') || hasCodeT('tax_basis_unknown');
  const Hp = !!hh && A !== null && R !== null && pA !== null && pR !== null && (pR - pA) !== (R - A);
  const F = windowKnown && years.some((y) => y.status === 'computed' && y._G.cmp(0) > 0);

  // Completeness
  const rowCodes = new Set(years.flatMap((y) => y.reasons));
  const rowHas = (code) => [...rowCodes].some((c) => c.startsWith(code + ':'));
  let state;
  if (!windowKnown) state = 'incomplete_unknown_timing';
  else if (!spendingKnown) state = 'incomplete_unknown_spending';
  else if (!coverageComplete || SIX_M.some(rowHas)) state = 'incomplete_unknown_income';
  else if (rowHas('gross')) state = 'basis_mismatch';
  else if (rowHas('tax_basis_unknown')) state = 'basis_unknown';
  else if (years.every((y) => y.status === 'computed')) state = 'complete';
  else throw new Error('unreachable completeness');

  // Flags
  const flags = [];
  if (hasCodeT('gross')) flags.push('gross_net_mismatch');
  if (hasCodeT('tax_basis_unknown')) flags.push('tax_basis_unknown');
  if (M) flags.push('incomplete_income');
  const sav = ch.savings || {};
  const acc = sav.accounts || {};
  const homeBizPos = posKnown(sav.home_value && sav.home_value.amount) || posKnown(sav.business_value && sav.business_value.amount);
  const anyAccPos = ACCOUNT_ORDER.some((k) => posKnown(acc[k]));
  if (homeBizPos && !anyAccPos) flags.push('housing_only_wealth');
  if (sav.pension_value && posKnown(sav.pension_value.amount) && ['yes', 'not_sure'].includes(sav.pension_value.also_entered_as_income)) flags.push('pension_double_count_risk');
  if (srcs.some((j) => ['rental', 'business'].includes(j.s.kind) && j.s.dependability === 'scheduled')) flags.push('uncertain_kind_labelled_scheduled');
  if (windowKnown) {
    const lim = tR + H;
    const srcBeyond = srcs.some((j) => j.s.amount.status !== 'zero' && j.sRes && j.s_ >= lim);
    const partnerBeyond = pA !== null && pR !== null && (pR - pA) >= lim;
    if (srcBeyond || partnerBeyond) flags.push('horizon_shorter_than_timeline');
  }
  if (Hp) flags.push('household_timing_differs');
  if (srcs.some((j) => j.s.dependability === 'uncertain' && Tstar.some((t) => j.pays(t) !== 'no'))) flags.push('includes_uncertain_income');
  const flagsSorted = sortU(flags);

  // Savings summary (§12.7)
  const savings_summary = {
    accessible_categories_with_positive_value: ACCOUNT_ORDER.filter((k) => posKnown(acc[k])),
    home_or_business_positive_value: homeBizPos,
    excluded_from_spendable: [...(sav.home_value ? ['home_value'] : []), ...(sav.business_value ? ['business_value'] : [])],
    pension_value_kept_separate: !!sav.pension_value,
    totals_computed: false,
  };

  // Capital illustration (§11, §12.8) via backward recursion
  const ncr = [];
  if (rBp === null) ncr.push('return_assumption_absent');
  if (state !== 'complete') ncr.push('state_not_complete');
  let ref;
  if (ncr.length) {
    const s = sortU(ncr);
    ref = { r_bp: rBp, computable: false, not_computable_reasons: s, display_eligible_if_enabled: false,
      ineligible_reasons: s, C_R_cents: null, C_R_exact: null, valued_at: null, flow_timing: 'end_of_year' };
  } else {
    const f = factor(rBp);
    let V = ZERO;
    for (let k = H - 1; k >= 0; k--) V = years[k]._G.add(V).div(f);
    const inel = BLOCKING_FLAGS.filter((x) => flagsSorted.includes(x));
    if (!years.some((y) => y._G.cmp(0) > 0)) inel.push('no_positive_gap');
    const s = sortU(inel);
    ref = { r_bp: rBp, computable: true, not_computable_reasons: [], display_eligible_if_enabled: s.length === 0,
      ineligible_reasons: s, C_R_cents: Number(V.roundHalfEven()), C_R_exact: V.toExact(),
      valued_at: { t: tR, calendar_year: Y0 + tR, point: 'start_of_year' }, flow_timing: 'end_of_year', _V: V };
  }

  // Clip
  let selected, reason;
  if (C) [selected, reason] = ['W10', 'core_inputs_missing'];
  else if (M) [selected, reason] = ['W06', 'missing_income'];
  else if (X) [selected, reason] = ['W08', 'tax_basis'];
  else if (Hp) [selected, reason] = ['W09', 'household_timing'];
  else if (F) [selected, reason] = ['W07', 'funding_gap'];
  else [selected, reason] = ['W10', 'neutral_fallback'];

  const out = {
    contract_version: '1.0',
    assumptions_echo: {
      base_year: Y0, inflation_bp: iBp, planning_horizon_years: H, capital_illustration_return_bp: rBp,
      year_index: 't=0 is calendar year base_year; annual totals per calendar year',
      rounding: 'exact rational arithmetic; half-even to whole cents at display only',
    },
    window: windowKnown ? { t_R: tR, first_t: tR, last_t: tR + H - 1, first_calendar_year: Y0 + tR,
      last_calendar_year: Y0 + tR + H - 1, first_age: R, last_age: R + H - 1 } : null,
    completeness: { state, reasons },
    years: years.map((y) => { const { _G, ...rest } = y; return rest; }),
    flags: flagsSorted,
    savings_summary,
    capital_illustration: { feature_flag: 'off', displayed: false, state: 'disabled_by_flag',
      reference_if_enabled: (() => { const { _V, ...r } = ref; return r; })() },
    clip: { predicates: { C, M, X, H: Hp, F }, selected, selection_reason: reason },
  };
  // internals for extra checks (non-normative)
  Object.defineProperty(out, '_internal', { value: { years, srcs, ref, W, Tstar, infl, D }, enumerable: false });
  return out;
}

// Layer-2 semantic rules XF-04..XF-06 (workshop-inputs.md §6), independent.
export function semanticErrors(input) {
  const errs = [];
  const ch = input.chapters; const tim = ch.timing;
  const A = known(tim.current_age) ? tim.current_age.value : null;
  const hh = tim.household;
  const pA = hh && known(hh.partner_current_age) ? hh.partner_current_age.value : null;
  const seen = new Set();
  ch.income.sources.forEach((s, k) => {
    const oa = s.owner === 'partner' ? pA : A;
    if (s.start.reference === 'age' && s.start.point.status !== 'unknown' && oa !== null && s.start.point.value < oa)
      errs.push({ rule: 'XF-04', path: `/chapters/income/sources/${k}/start/point/value` });
    const st = resolveBound(s.start, oa, true); const en = resolveBound(s.end, oa, false);
    if (st.kind === 'resolved' && en.kind === 'resolved' && !(en.idx > st.idx))
      errs.push({ rule: 'XF-05', path: `/chapters/income/sources/${k}/end` });
    if (seen.has(s.id)) errs.push({ rule: 'XF-06', path: `/chapters/income/sources/${k}/id` });
    seen.add(s.id);
  });
  return errs;
}
