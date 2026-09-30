// A6 independent implementation of workshop-math.md 1.0 (F02, attempt 1).
// Written from the contract text only. It does NOT import or read
// evidence/F02/math/compute_fixtures.py or workshop_reference.py.
//
// Method (deliberately different from the author's Python Fraction model):
//  * JavaScript BigInt rationals (class Q below), always reduced.
//  * Every growth path is built by a year-by-year recurrence
//      X_{t+1} = X_t * (10000 + bp) / 10000
//    instead of a power function; closed forms are only used as cross-checks
//    in run_fixtures.mjs.
//  * C_R is evaluated by backward (Horner) recursion V_k = (G_k + V_{k+1})/(1+r),
//    not by summing discounted terms.

export class Q {
  constructor(n, d = 1n) {
    if (typeof n !== 'bigint' || typeof d !== 'bigint') throw new TypeError('BigInt only');
    if (d === 0n) throw new RangeError('zero denominator');
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n < 0n ? -n : n, d);
    this.n = n / g; this.d = d / g;
  }
  static of(x) { return new Q(BigInt(x), 1n); }
  add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Q(this.n * o.n, this.d * o.d); }
  div(o) { return new Q(this.n * o.d, this.d * o.n); }
  cmp(o) { const l = this.n * o.d, r = o.n * this.d; return l < r ? -1 : l > r ? 1 : 0; }
  isZero() { return this.n === 0n; }
  // Round half to even, to an integer (whole cents). Exact; applied once.
  roundHalfEven() {
    const n = this.n, d = this.d;
    let q = n / d; let r = n % d;           // BigInt division truncates toward zero
    if (r < 0n) { q -= 1n; r += d; }         // make it floor division
    const twice = 2n * r;
    if (twice > d || (twice === d && (q % 2n !== 0n))) q += 1n;
    return q;
  }
  // Decimal string if the reduced denominator is 2^a 5^b, else "p/q".
  toExact() {
    let d = this.d, k2 = 0, k5 = 0;
    while (d % 2n === 0n) { d /= 2n; k2++; }
    while (d % 5n === 0n) { d /= 5n; k5++; }
    if (d !== 1n) return `${this.n}/${this.d}`;
    const k = Math.max(k2, k5);
    const scaled = this.n * (10n ** BigInt(k)) / this.d; // exact
    const neg = scaled < 0n; let s = (neg ? -scaled : scaled).toString();
    if (k === 0) return (neg ? '-' : '') + s;
    s = s.padStart(k + 1, '0');
    let ip = s.slice(0, s.length - k), fp = s.slice(s.length - k).replace(/0+$/, '');
    return (neg ? '-' : '') + ip + (fp ? '.' + fp : '');
  }
}
function gcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a === 0n ? 1n : a; }

const TEN4 = 10000n;
export const factor = (bp) => new Q(TEN4 + BigInt(bp), TEN4);

// Price/growth path by recurrence: path[t] = (1+x)^t for t = 0..n
export function growthPath(bp, n) {
  const f = factor(bp); const out = [Q.of(1)];
  for (let t = 1; t <= n; t++) out.push(out[t - 1].mul(f));
  return out;
}

const KNOWN = new Set(['zero', 'estimated', 'confirmed']);
const isKnown = (q) => !!q && KNOWN.has(q.status);
const ACCOUNT_KEYS = ['rrsp_rrif', 'tfsa', 'non_registered', 'other', 'not_sure'];
const M_CODES = new Set(['amount_unknown', 'start_unknown', 'start_unresolvable', 'end_unknown', 'end_unresolvable', 'price_basis_unknown']);
const X_CODES = new Set(['gross', 'tax_basis_unknown']);
const T_STAR_UNKNOWN_WINDOW_MAX = 83; // workshop-math.md s8

export const ECHO_YEAR_INDEX = 't=0 is calendar year base_year; annual totals per calendar year';
export const ECHO_ROUNDING = 'exact rational arithmetic; half-even to whole cents at display only';

export const PRECEDENCE = [
  ['C', 'W10', 'core_inputs_missing'],
  ['M', 'W06', 'missing_income'],
  ['X', 'W08', 'tax_basis'],
  ['H', 'W09', 'household_timing'],
  ['F', 'W07', 'funding_gap'],
];
export function selectClip(p) {
  for (const [k, clip, why] of PRECEDENCE) if (p[k]) return { selected: clip, selection_reason: why };
  return { selected: 'W10', selection_reason: 'neutral_fallback' };
}

// options lets negative controls inject known faults into this model.
export function computeModel(input, options = {}) {
  const ch = input.chapters, tim = ch.timing, Y0 = input.base_year;
  const A = isKnown(tim.current_age) ? tim.current_age.value : null;
  const R = isKnown(tim.retirement_age) ? tim.retirement_age.value : null;
  const H = tim.planning_horizon_years.value;
  const ibp = tim.inflation_bp.value;
  const rbp = tim.capital_illustration_return_bp ? tim.capital_illustration_return_bp.value : null;
  const hh = tim.household || null;
  const Ap = hh && isKnown(hh.partner_current_age) ? hh.partner_current_age.value : null;
  const Rp = hh && isKnown(hh.partner_retirement_age) ? hh.partner_retirement_age.value : null;

  const rnd = (q) => Number(roundX(q, options));
  const win = (A !== null && R !== null) ? (options.windowFromZero ? { tR: R - A, first: 0, last: R - A + H - 1 } : { tR: R - A, first: R - A, last: R - A + H - 1 }) : null;
  const scan = win ? range(win.first, win.last) : range(0, T_STAR_UNKNOWN_WINDOW_MAX);
  const tMax = Math.max(scan[scan.length - 1], 0);
  const infl = growthPath(ibp, tMax + 1);

  // spending
  const sp = ch.life.spending;
  let aSp = null;
  if (isKnown(sp.amount)) aSp = Q.of(sp.period === 'monthly' ? 12 * sp.amount.value : sp.amount.value);
  else if (options.unknownSpendingAsZero) aSp = Q.of(0);
  const coverage = ch.income.coverage;
  const coverageOK = coverage === 'all_known_sources_listed' || coverage === 'no_planned_income';
  const globalYearCodes = [];
  if (aSp === null) globalYearCodes.push('spending_unknown');
  if (coverage === 'not_answered') globalYearCodes.push('income_not_answered');
  if (coverage === 'some_sources_may_be_missing') globalYearCodes.push('income_list_partial');

  // sources
  const srcs = ch.income.sources.map((s) => prepareSource(s, A, Ap, ibp, tMax, infl, options));

  // per-(j,t) evaluation
  function evalSource(S, t) {
    const codes = [];
    let pays;
    if (S.zero) pays = 'no';
    else if (options.unknownFirst && !S.s.ok) { pays = 'unknown'; codes.push(S.s.code); } // alternative reading of s4 (unknown before "t >= e_j")
    else if (S.s.ok && t < S.s.v) pays = 'no';
    else if (S.e.ok && S.e.v !== null && (options.endInclusive ? t > S.e.v : t >= S.e.v)) pays = 'no';
    else if (!S.s.ok && options.unknownStartAsNotPaying) pays = 'no'; // injected fault
    else if (!S.s.ok && S.s.code === 'start_unknown' && options.startPointUnknownAsNotPaying) pays = 'no'; // injected fault
    else if (!S.s.ok && S.s.code === 'start_unresolvable' && win && options.unresolvableStartAsNotPayingWindowKnown) pays = 'no'; // injected fault
    else if (!S.s.ok && S.s.code === 'start_unknown' && options.startPointUnknownAsAlreadyReceiving) pays = 'yes_from_zero'; // injected fault
    else if (!S.s.ok) { pays = 'unknown'; codes.push(S.s.code); }
    else if (!S.e.ok && options.unknownEndAsOpen) pays = 'yes'; // injected fault
    else if (!S.e.ok) { pays = 'unknown'; codes.push(S.e.code); }
    else pays = 'yes';
    let P = null;
    if (pays === 'yes_from_zero') { pays = 'yes'; if (S.amtKnown) { let v = S.aj; for (let k = 0; k < t; k++) v = v.mul(factor(S.q)); P = v; } else codes.push('amount_unknown'); if (S.tax === 'gross') codes.push('gross'); if (S.tax === 'unknown') codes.push('tax_basis_unknown'); return { pays, P, codes: codes.map((c) => `${c}:${S.id}`), rawCodes: codes }; }
    if (pays === 'no') P = Q.of(0);
    else if (pays === 'yes') {
      if (!S.amtKnown) codes.push('amount_unknown');
      if (S.bUnknown) codes.push('price_basis_unknown');
      if (S.amtKnown && !S.bUnknown) P = S.path(t);
    }
    if (pays !== 'no') {
      if (S.tax === 'gross') codes.push('gross');
      if (S.tax === 'unknown') codes.push('tax_basis_unknown');
    }
    return { pays, P, codes: codes.map((c) => `${c}:${S.id}`), rawCodes: codes };
  }

  const scanCodes = new Set();
  let uncertainMayPay = false;
  for (const t of scan) for (const S of srcs) {
    const ev = evalSource(S, t);
    ev.codes.forEach((c) => scanCodes.add(c));
    if (S.dependability === 'uncertain' && ev.pays !== 'no') uncertainMayPay = true;
  }
  const codeSetHas = (set) => [...scanCodes].some((c) => set.has(c.split(':')[0]));

  // years
  const years = [];
  if (win) {
    for (let t = win.first; t <= win.last; t++) {
      let D = aSp === null ? null : (options.float64 ? qFromDouble(floatPow(aSp, ibp, t)) : aSp.mul(infl[t]));
      if (D === null && options.unknownSpendingZeroRowsOnly) D = Q.of(0); // injected fault: unknown spending read as 0 in rows only
      const bySrc = {}; const codes = new Set(globalYearCodes);
      let allKnown = true, basisOK = true, sum = Q.of(0);
      const groups = { net: { v: Q.of(0), nul: false }, gross: { v: Q.of(0), nul: false }, unknown: { v: Q.of(0), nul: false } };
      for (const S of srcs) {
        const ev = evalSource(S, t);
        ev.codes.forEach((c) => codes.add(c));
        bySrc[S.id] = ev.P === null ? null : rnd(ev.P);
        if (ev.P === null) allKnown = false; else sum = sum.add(ev.P);
        const nonZero = ev.P === null || !ev.P.isZero();
        if (nonZero) {
          const g = groups[S.tax];
          if (ev.P === null) g.nul = true; else g.v = g.v.add(ev.P);
          if (S.tax !== 'net' && !options.allowGrossInGap) basisOK = false;
        }
      }
      const computed = D !== null && (coverageOK || options.coverageIgnored) && allKnown && basisOK;
      const row = {
        t, calendar_year: Y0 + t, age: A + t,
        spending_cents: D === null ? null : rnd(D),
        income_by_source_cents: bySrc,
        income_net_cents: groups.net.nul ? null : rnd(groups.net.v),
        income_gross_cents: groups.gross.nul ? null : rnd(groups.gross.v),
        income_unknown_basis_cents: groups.unknown.nul ? null : rnd(groups.unknown.v),
        status: computed ? 'computed' : 'not_computable',
        reasons: computed ? [] : [...codes].sort(),
        gap_cents: null, surplus_cents: null, gap_today_dollars_cents: null, surplus_today_dollars_cents: null,
        exact: {},
      };
      if (Ap !== null) row.partner_age = Ap + t;
      if (D !== null) row.exact.spending = D.toExact();
      if (computed) {
        const diff = D.sub(sum);
        const zero = Q.of(0);
        const G = diff.cmp(zero) > 0 ? diff : zero;
        const Sx = diff.cmp(zero) < 0 ? zero.sub(diff) : zero;
        row.gap_cents = rnd(G);
        row.surplus_cents = rnd(Sx);
        const defl = options.deflateFromRetirement ? infl[t - win.tR] : infl[t];
        row.gap_today_dollars_cents = rnd(G.div(defl));
        row.surplus_today_dollars_cents = rnd(Sx.div(defl));
        row.exact.income_compared = sum.toExact();
        row.exact.gap = G.toExact();
        row.exact.surplus = Sx.toExact();
        row._G = G; row._S = Sx; row._D = D; row._sum = sum;
      }
      years.push(row);
    }
  }

  // completeness
  const globalReasons = [];
  if (A === null) globalReasons.push('current_age_unknown');
  if (R === null) globalReasons.push('retirement_age_unknown');
  const reasons = [...new Set([...globalReasons, ...globalYearCodes, ...scanCodes])].sort();
  const Mpred = !coverageOK || codeSetHas(M_CODES);
  const hasGrossCode = [...scanCodes].some((c) => c.startsWith('gross:'));
  const hasTbuCode = [...scanCodes].some((c) => c.startsWith('tax_basis_unknown:'));
  let state;
  if (!win) state = 'incomplete_unknown_timing';
  else if (aSp === null) state = 'incomplete_unknown_spending';
  else if (Mpred) state = 'incomplete_unknown_income';
  else if (hasGrossCode) state = 'basis_mismatch';
  else if (hasTbuCode) state = 'basis_unknown';
  else if (years.every((y) => y.status === 'computed')) state = 'complete';
  else throw new Error('unreachable completeness state');

  // savings summary and flags
  const sav = ch.savings || {};
  const acc = sav.accounts || {};
  const posKnown = (q) => !!q && (q.status === 'estimated' || q.status === 'confirmed');
  const accessible = ACCOUNT_KEYS.filter((k) => posKnown(acc[k]));
  const homePos = posKnown(sav.home_value && sav.home_value.amount);
  const bizPos = posKnown(sav.business_value && sav.business_value.amount);
  const excluded = ['home_value', 'business_value'].filter((k) => sav[k] !== undefined);
  const pensionPos = posKnown(sav.pension_value && sav.pension_value.amount);

  const flags = new Set();
  if (hasGrossCode) flags.add('gross_net_mismatch');
  if (hasTbuCode) flags.add('tax_basis_unknown');
  if (Mpred) flags.add('incomplete_income');
  if ((homePos || bizPos) && accessible.length === 0) flags.add('housing_only_wealth');
  if (pensionPos && ['yes', 'not_sure'].includes(sav.pension_value.also_entered_as_income)) flags.add('pension_double_count_risk');
  if (ch.income.sources.some((s) => ['rental', 'business'].includes(s.kind) && s.dependability === 'scheduled')) flags.add('uncertain_kind_labelled_scheduled');
  if (win) {
    const lim = win.tR + H;
    const late = srcs.some((S) => !S.zero && S.s.ok && S.s.v >= lim);
    const partnerLate = Ap !== null && Rp !== null && (Rp - Ap) >= lim;
    if (late || partnerLate) flags.add('horizon_shorter_than_timeline');
  }
  const Hpred = !!hh && A !== null && R !== null && Ap !== null && Rp !== null && (Rp - Ap) !== (R - A);
  if (Hpred) flags.add('household_timing_differs');
  if (uncertainMayPay) flags.add('includes_uncertain_income');

  const Cpred = !win || aSp === null || (!!options.unknownSpendingAsZero && !isKnown(sp.amount));
  const Fpred = !!win && years.some((y) => y.status === 'computed' && y._G.cmp(Q.of(0)) > 0);
  const Xpred = hasGrossCode || hasTbuCode;
  const predicates = { C: Cpred, M: Mpred, X: Xpred, H: Hpred, F: Fpred };
  let clipSel = selectClip(predicates);
  if (options.precedenceOrder) {
    clipSel = { selected: 'W10', selection_reason: 'neutral_fallback' };
    for (const [k, clip, why] of options.precedenceOrder) if (predicates[k]) { clipSel = { selected: clip, selection_reason: why }; break; }
  }

  // capital illustration (reference only; flag is OFF)
  const notComp = [];
  if (rbp === null) notComp.push('return_assumption_absent');
  if (state !== 'complete') notComp.push('state_not_complete');
  const computable = notComp.length === 0;
  let CR = null;
  if (computable) {
    const f = factor(rbp);
    if (options.nettedSurplus) {
      let V = Q.of(0);
      for (let k = H - 1; k >= 0; k--) { const y = years[k]; V = y._G.sub(y._S).add(V).div(f); }
      CR = V;
    } else {
      let V = Q.of(0);
      for (let k = H - 1; k >= 0; k--) V = years[k]._G.add(V).div(f);
      CR = options.crStartOfYear ? V.mul(f) : V; // injected fault: flows at start of year (exponent k)
      if (options.crDiscountToBase) for (let k = 0; k < win.tR; k++) CR = CR.div(f); // injected fault: valued at t = 0 instead of t_R
    }
  }
  // Convention observed in fixtures (not stated in workshop-math.md s11): when not computable,
  // ineligible_reasons repeats not_computable_reasons only; otherwise it lists the blocking flags.
  const inelig = [...notComp];
  if (computable) {
    for (const fl of ['gross_net_mismatch', 'tax_basis_unknown', 'incomplete_income', 'pension_double_count_risk']) if (flags.has(fl)) inelig.push(fl);
    if (!options.ignoreNoPositiveGap && !years.some((y) => y._G.cmp(Q.of(0)) > 0)) inelig.push('no_positive_gap'); // code name not pinned by any fixture
  }

  const out = {
    contract_version: '1.0',
    assumptions_echo: {
      base_year: Y0, inflation_bp: ibp, planning_horizon_years: H,
      capital_illustration_return_bp: rbp, year_index: ECHO_YEAR_INDEX, rounding: ECHO_ROUNDING,
    },
    window: win ? {
      t_R: win.tR, first_t: win.first, last_t: win.last,
      first_calendar_year: Y0 + win.first, last_calendar_year: Y0 + win.last,
      first_age: A + win.first, last_age: A + win.last,
    } : null,
    completeness: { state, reasons },
    years: years.map(stripPrivate),
    flags: [...flags].sort(),
    savings_summary: {
      accessible_categories_with_positive_value: accessible,
      home_or_business_positive_value: homePos || bizPos,
      excluded_from_spendable: excluded,
      pension_value_kept_separate: pensionPos,
      totals_computed: false,
    },
    capital_illustration: {
      feature_flag: 'off', displayed: false, state: 'disabled_by_flag',
      reference_if_enabled: {
        r_bp: rbp, computable, not_computable_reasons: notComp,
        display_eligible_if_enabled: inelig.length === 0, ineligible_reasons: inelig,
        C_R_cents: CR === null ? null : rnd(CR),
        C_R_exact: CR === null ? null : CR.toExact(),
        valued_at: computable ? { t: win.tR, calendar_year: Y0 + win.tR, point: 'start_of_year' } : null,
        flow_timing: 'end_of_year',
      },
    },
    clip: { predicates, selected: clipSel.selected, selection_reason: clipSel.selection_reason },
  };
  Object.defineProperty(out, '_internal', { value: { years, CR, srcs, infl, win, aSp }, enumerable: false });
  return out;
}

function roundX(q, options) {
  if (options.halfUp) { // injected fault: JS Math.round-style half-up (non-negative values)
    const n = q.n, d = q.d; return (2n * n + d) / (2n * d);
  }
  return q.roundHalfEven();
}
// injected fault helpers: iterated IEEE-754 double growth, then exact conversion of the double
function floatPow(aQ, bp, t) { let x = Number(aQ.n) / Number(aQ.d); const f = 1 + bp / 10000; for (let k = 0; k < t; k++) x = x * f; return x; }
export function qFromDouble(x) { let k = 0; while (!Number.isInteger(x * 2 ** k)) k++; return new Q(BigInt(x * 2 ** k), 2n ** BigInt(k)); }

function stripPrivate(y) { const { _G, _S, _D, _sum, ...rest } = y; return rest; }
function range(a, b) { const r = []; for (let t = a; t <= b; t++) r.push(t); return r; }

function prepareSource(s, A, Ap, ibp, tMax, infl, options) {
  const zero = s.amount.status === 'zero';
  const amtKnown = s.amount.status === 'estimated' || s.amount.status === 'confirmed';
  const aj = amtKnown ? Q.of(s.period === 'monthly' && !options.monthlyIncomeNotTimes12 ? 12 * s.amount.value : s.amount.value) : null;
  const Ao = s.owner === 'partner' && !options.partnerStartSelfAge ? Ap : A;
  const resolve = (ref, which) => {
    if (ref.reference === 'already_receiving') return { ok: true, v: 0 };
    if (!isKnown(ref.point)) return { ok: false, code: `${which}_unknown` };
    if (ref.reference === 'year_index') return { ok: true, v: ref.point.value };
    if (Ao === null) return { ok: false, code: `${which}_unresolvable` };
    return { ok: true, v: ref.point.value - Ao };
  };
  const st = resolve(s.start, 'start');
  const en = s.end ? resolve(s.end, 'end') : { ok: true, v: null };
  let b = null, bUnknown = false;
  if (st.ok && aj) {
    if (st.v === 0 || s.price_basis === 'start_year_dollars' || (options.ignorePriceBasis && s.price_basis === 'today_dollars')) b = aj;
    else if (s.price_basis === 'today_dollars') b = aj.mul(infl[st.v] || growthPath(ibp, st.v)[st.v]);
    else bUnknown = true;
  } else if (st.ok && st.v > 0 && s.price_basis === 'unknown') bUnknown = true;
  // payment path by recurrence from s_j
  const cache = new Map();
  const q = s.escalation_bp.value;
  const f = factor(q);
  const path = (t) => {
    if (cache.has(t)) return cache.get(t);
    let v = b, k = st.v;
    if (options.float64) {
      v = qFromDouble(floatPow(b, q, t - st.v));
    } else {
      if (options.escalateFromZero) { v = b.mul(new Q((10000n + BigInt(q)) ** BigInt(t), 10000n ** BigInt(t))); cache.set(t, v); return v; }
      // walk forward from the nearest cached point
      for (let u = t - 1; u >= st.v; u--) if (cache.has(u)) { v = cache.get(u); k = u; break; }
      while (k < t) { v = v.mul(f); k++; cache.set(k, v); }
    }
    cache.set(t, v);
    return v;
  };
  return {
    id: s.id, zero, amtKnown, tax: (options.taxUnknownAsNet && s.tax_basis === 'unknown') ? 'net' : s.tax_basis, dependability: s.dependability, kind: s.kind,
    s: st, e: en, bUnknown, path, aj, q,
  };
}

// Layer-2 semantic rules XF-04..XF-06 (workshop-inputs.md s6), independent implementation.
export function semanticErrors(input) {
  const errs = [];
  const ch = input.chapters, tim = ch.timing;
  const A = isKnown(tim.current_age) ? tim.current_age.value : null;
  const hh = tim.household;
  const Ap = hh && isKnown(hh.partner_current_age) ? hh.partner_current_age.value : null;
  const seen = new Map();
  ch.income.sources.forEach((s, j) => {
    const Ao = s.owner === 'partner' ? Ap : A;
    const idx = (ref) => {
      if (!ref) return null;
      if (ref.reference === 'already_receiving') return 0;
      if (!isKnown(ref.point)) return null;
      if (ref.reference === 'year_index') return ref.point.value;
      return Ao === null ? null : ref.point.value - Ao;
    };
    if (s.start.reference === 'age' && isKnown(s.start.point) && Ao !== null && s.start.point.value < Ao)
      errs.push({ rule: 'XF-04', path: `/chapters/income/sources/${j}/start/point/value` });
    const si = idx(s.start), ei = s.end ? idx(s.end) : null;
    if (s.end && si !== null && ei !== null && !(ei > si))
      errs.push({ rule: 'XF-05', path: `/chapters/income/sources/${j}/end` });
    if (seen.has(s.id)) errs.push({ rule: 'XF-06', path: `/chapters/income/sources/${j}/id` });
    else seen.set(s.id, j);
  });
  return errs;
}
