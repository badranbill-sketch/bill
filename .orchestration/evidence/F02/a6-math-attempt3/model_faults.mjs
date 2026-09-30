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

export function evaluate(input, faults = new Set()) {
  const F_ = (n) => faults.has(n);
  const rnd = (q) => { if (F_('half_up')) { const t = q.n * 2n + q.d; return t / (2n * q.d); } return q.roundHalfEven(); };
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
  const tR = windowKnown ? R - A + (F_('window_off_by_one') ? 1 : 0) : null;
  const W = windowKnown ? Array.from({ length: H }, (_, k) => tR + k) : [];
  const Tstar = windowKnown ? W : Array.from({ length: T_SCAN_MAX + 1 }, (_, t) => t);
  const tMax = Math.max(T_SCAN_MAX, windowKnown ? tR + H - 1 : 0);

  const infl = powTable(iBp, tMax + 1);

  // Spending
  const sp = ch.life.spending;
  const spendingKnown = sp.amount.status !== 'unknown';
  const a = spendingKnown ? new Q(BigInt(sp.amount.value) * (sp.period === 'monthly' ? 12n : 1n)) : null;
  const D = (t) => (spendingKnown ? a.mul(infl[t]) : (F_('spending_unknown_zero') ? ZERO : null));

  const cov = ch.income.coverage;
  const coverageComplete = cov === 'all_known_sources_listed' || cov === 'no_planned_income' || (F_('coverage_incomplete_as_complete') && cov !== 'x');

  // Sources
  const srcs = ch.income.sources.map((s) => {
    const ownerAge = s.owner === 'partner' || (F_('joint_uses_partner') && s.owner === 'joint') ? pA : A;
    const st = resolveBound(s.start, ownerAge, true);
    const en = resolveBound(s.end, ownerAge, false);
    const amtKnown = s.amount.status !== 'unknown';
    const aj = amtKnown ? new Q(BigInt(val(s.amount)) * (s.period === 'monthly' && !F_('income_monthly_no_x12') ? 12n : 1n)) : null;
    const qBp = val(s.escalation_bp);
    const sRes = st.kind === 'resolved';
    const eRes = en.kind === 'resolved' || en.kind === 'absent';
    const s_ = sRes ? st.idx : null;
    const e_ = en.kind === 'resolved' ? en.idx : (en.kind === 'absent' ? Infinity : null);
    // b_j
    let b = null;
    if (sRes && amtKnown) {
      if (s_ === 0 || s.price_basis === 'start_year_dollars') b = aj;
      else if (s.price_basis === 'today_dollars') b = F_('today_dollars_as_nominal') ? aj : aj.mul(powTable(F_('today_dollars_uses_q') ? qBp : iBp, s_)[s_]);
      else if (F_('price_basis_unknown_as_start_year')) b = aj;
      else b = null; // price_basis unknown and s_j > 0
    }
    // static code conditions (§4 table)
    const staticCodes = [];
    if (s.start.reference !== 'already_receiving' && s.start.point.status === 'unknown') staticCodes.push('start_unknown');
    if (st.kind === 'unresolvable') staticCodes.push('start_unresolvable');
    if (s.end !== undefined && s.end.point.status === 'unknown') staticCodes.push('end_unknown');
    if (en.kind === 'unresolvable') staticCodes.push('end_unresolvable');
    if (s.amount.status === 'unknown') staticCodes.push('amount_unknown');
    if (s.price_basis === 'unknown' && (F_('pbu_even_at_zero') || !(sRes && s_ === 0)) && !F_('price_basis_unknown_as_start_year')) staticCodes.push('price_basis_unknown');
    if (s.tax_basis === 'gross' && !F_('gross_compared')) staticCodes.push('gross');
    if (s.tax_basis === 'unknown' && !F_('tax_unknown_as_net')) staticCodes.push('tax_basis_unknown');
    const effBasis = (F_('gross_compared') && s.tax_basis === 'gross') || (F_('tax_unknown_as_net') && s.tax_basis === 'unknown') ? 'net' : s.tax_basis;

    const escTable = sRes ? powTable(qBp, Math.max(0, tMax - s_ + 1)) : null;

    const pays = (t) => {
      if (s.amount.status === 'zero') return 'no';                 // rule 1
      if (F_('unknown_first') && !(sRes && eRes)) { if (sRes && t < s_) return 'no'; return 'unknown'; }
      if (F_('unknown_start_not_paying') && !sRes && st.kind === 'unknown') return 'no';
      if (F_('unknown_start_already_receiving') && !sRes && st.kind === 'unknown') { if (en.kind === 'resolved' && t >= e_) return 'no'; return eRes ? 'yes' : 'unknown'; }
      if (F_('unresolvable_start_not_paying') && st.kind === 'unresolvable') return 'no';
      if (F_('unknown_end_no_end') && !eRes && sRes) return t < s_ ? 'no' : 'yes';
      if (en.kind === 'resolved' && (F_('end_inclusive') ? t > e_ : t >= e_)) return 'no';          // rule 2
      if (sRes && t < s_) return 'no';                             // rule 3
      if (sRes && eRes) return 'yes';                              // rule 4
      if (F_('xf05_inference') && sRes && t === s_) return 'yes';
      return 'unknown';                                            // rule 5
    };
    const P = (t) => {
      const p = pays(t);
      if (p === 'no') return ZERO;
      if (p === 'unknown') return null;
      if (F_('unknown_start_already_receiving') && st.kind === 'unknown') return amtKnown ? aj : null;
      if (!amtKnown || b === null) { if (F_('unknown_amount_zero') && !amtKnown) return ZERO; return null; }
      return b.mul(F_('escalate_from_zero') ? powTable(qBp, t)[t] : escTable[t - s_]);
    };
    const codes = (t) => (pays(t) === 'no' ? [] : (F_('one_code_per_source') ? staticCodes.slice(0, 1) : staticCodes).filter((c) => !(F_('unknown_start_already_receiving') && (c === 'start_unknown' || c === 'price_basis_unknown'))).map((c) => `${c}:${s.id}`));
    return { s, id: s.id, st, en, sRes, s_, e_, pays, P, codes, staticCodes, effBasis };
  });

  // Global codes (§7)
  const globalCodes = [];
  if (A === null) globalCodes.push('current_age_unknown');
  if (R === null && !(F_('R_code_only_if_A_known') && A === null)) globalCodes.push('retirement_age_unknown');
  if (!spendingKnown && !F_('spending_unknown_zero')) globalCodes.push('spending_unknown');
  if (cov === 'not_answered' && !F_('coverage_incomplete_as_complete')) globalCodes.push('income_not_answered');
  if (cov === 'some_sources_may_be_missing' && !F_('coverage_incomplete_as_complete')) globalCodes.push('income_list_partial');
  const rowGlobal = globalCodes.filter((c) => ['spending_unknown', 'income_not_answered', 'income_list_partial'].includes(c));

  // Rows
  const years = []; let carry = ZERO;
  for (const t of W) {
    const Dt = D(t);
    const perSrc = {}; const Pv = {};
    let codes = [...rowGlobal];
    for (const j of srcs) {
      const p = j.P(t); Pv[j.id] = p;
      perSrc[j.id] = p === null ? null : Number(rnd(p));
      codes.push(...j.codes(t));
    }
    codes = sortU(codes);
    // conditions of §5
    const allP = srcs.every((j) => Pv[j.id] !== null);
    const netOnly = srcs.every((j) => Pv[j.id] === null || Pv[j.id].isZero() || j.effBasis === 'net');
    const computed = Dt !== null && coverageComplete && allP && netOnly;
    // Groups
    const group = (basis) => {
      if (!coverageComplete && !F_('groups_as_listed_when_incomplete')) return null;
      let sum = ZERO;
      for (const j of srcs) {
        if (j.s.tax_basis !== basis) continue;
        if (j.pays(t) === 'no') continue; // P is exact 0 -> not a member
        const p = Pv[j.id];
        if (p === null) return null;
        if (p.isZero()) continue;
        sum = F_('group_from_rounded_rows') ? sum.add(new Q(rnd(p))) : sum.add(p);
      }
      return Number(rnd(sum));
    };
    const row = {
      t, calendar_year: Y0 + t, age: A + t,
    };
    if (hh && pA !== null) row.partner_age = pA + t; else if (F_('partner_age_null_key') && hh) row.partner_age = null;
    row.spending_cents = Dt === null ? null : (F_('float64') ? Math.round(Number(a.n) * (1 + iBp / 10000) ** t) : Number(rnd(Dt)));
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
      let G = diff.cmp(0) > 0 ? diff : ZERO;
      if (F_('surplus_netted')) { if (diff.cmp(0) < 0) carry = carry.add(inc.sub(Dt)); else { const use = carry.cmp(G) > 0 ? G : carry; G = G.sub(use); carry = carry.sub(use); } }
      const S = diff.cmp(0) < 0 ? inc.sub(Dt) : ZERO;
      row.gap_cents = Number(rnd(G));
      row.surplus_cents = Number(rnd(S));
      row.gap_today_dollars_cents = F_('deflate_rounded_gap') ? Number(rnd(new Q(rnd(G)).div(infl[t]))) : Number(rnd(G.div(infl[t])));
      row.surplus_today_dollars_cents = F_('deflate_rounded_gap') ? Number(rnd(new Q(rnd(S)).div(infl[t]))) : Number(rnd(S.div(infl[t])));
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

  const reasons = sortU([...(F_('no_global_codes_without_window') && !windowKnown ? globalCodes.filter((c) => c === 'current_age_unknown' || c === 'retirement_age_unknown') : globalCodes), ...years.flatMap((y) => y.reasons), ...scanCodes]);

  // Predicates
  const C = !windowKnown || !spendingKnown;
  const M = !coverageComplete || SIX_M.some(hasCodeT) || (F_('estimated_triggers_M') && [...ch.income.sources].some((s) => s.amount.status === 'estimated'));
  const X = hasCodeT('gross') || hasCodeT('tax_basis_unknown');
  const Hp = !!hh && A !== null && R !== null && pA !== null && pR !== null && (F_('H_by_age') ? pR !== R : (pR - pA) !== (R - A));
  const F = windowKnown && years.some((y) => y.status === 'computed' && y._G.cmp(0) > 0);
  if (F_('M_before_C_scan_W_only') ) {}

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
  if (homeBizPos && !anyAccPos && !F_('home_spendable')) flags.push('housing_only_wealth');
  if (sav.pension_value && posKnown(sav.pension_value.amount) && ['yes', 'not_sure'].includes(sav.pension_value.also_entered_as_income)) flags.push('pension_double_count_risk');
  if (srcs.some((j) => (F_('employment_uncertain_kind') ? ['rental', 'business', 'employment'] : ['rental', 'business']).includes(j.s.kind) && j.s.dependability === 'scheduled')) flags.push('uncertain_kind_labelled_scheduled');
  if (windowKnown) {
    const lim = tR + H;
    const srcBeyond = srcs.some((j) => (F_('horizon_flag_known_amount_only') ? known(j.s.amount) && j.s.amount.status !== 'zero' : j.s.amount.status !== 'zero') && j.sRes && (F_('horizon_flag_strict') ? j.s_ > lim : j.s_ >= lim));
    const partnerBeyond = pA !== null && pR !== null && (pR - pA) >= lim;
    if (srcBeyond || partnerBeyond) flags.push('horizon_shorter_than_timeline');
  }
  if (Hp) flags.push('household_timing_differs');
  if (srcs.some((j) => j.s.dependability === 'uncertain' && (F_('uncertain_flag_any') || Tstar.some((t) => j.pays(t) !== 'no')))) flags.push('includes_uncertain_income');
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
      ineligible_reasons: F_('ineligible_adds_flags') ? sortU([...s, ...BLOCKING_FLAGS.filter((x) => flagsSorted.includes(x))]) : s, C_R_cents: null, C_R_exact: null, valued_at: null, flow_timing: 'end_of_year' };
  } else {
    const f = factor(rBp);
    let V = ZERO;
    for (let k = H - 1; k >= 0; k--) V = years[k]._G.add(V).div(f);
    if (F_('cr_start_of_year_flows')) V = V.mul(f);
    if (F_('cr_discount_to_base')) V = V.div(powTable(rBp, tR)[tR]);
    const inel = BLOCKING_FLAGS.filter((x) => flagsSorted.includes(x));
    if (!years.some((y) => y._G.cmp(0) > 0) && !F_('ignore_no_positive_gap')) inel.push('no_positive_gap');
    const s = sortU(inel);
    ref = { r_bp: rBp, computable: true, not_computable_reasons: [], display_eligible_if_enabled: s.length === 0,
      ineligible_reasons: s, C_R_cents: Number(rnd(V)), C_R_exact: V.toExact(),
      valued_at: { t: tR, calendar_year: Y0 + tR, point: 'start_of_year' }, flow_timing: 'end_of_year', _V: V };
  }

  // Clip
  let selected, reason;
  if (C) [selected, reason] = ['W10', 'core_inputs_missing'];
  else if (F_('X_before_M') && X) [selected, reason] = ['W08', 'tax_basis'];
  else if (M) [selected, reason] = ['W06', 'missing_income'];
  else if (X) [selected, reason] = ['W08', 'tax_basis'];
  else if (F_('F_before_H') && F) [selected, reason] = ['W07', 'funding_gap'];
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
