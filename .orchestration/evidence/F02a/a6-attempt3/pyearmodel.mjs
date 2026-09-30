// A6 F02a attempt-3 independent model of workshop-math.md v1.0 (written from the contract text only).
// Method: per-year common denominator. Every nominal amount of year t (D_t, P_j,t, G_t, S_t) is held
// as one BigInt numerator N over the implicit denominator 10000^t; sums and differences inside a
// year are plain BigInt additions. Deflation divides N by (10000+i)^t; C_R is summed over the single
// common denominator 10000^(t_R+H-1) * (10000+r)^H and reduced by gcd. No fractions library, no
// floats, no import of any builder or earlier-A6 script.
//
// Fault switches (all off = the contract reading):
//   today_dollars_uses_q     b_j = a_j (1+q_j)^{s_j} for a today-dollar source with s_j > 0
//   joint_uses_partner       joint age bounds resolved against the partner's age
//   joint_start_partner      only a joint START resolved against the partner
//   joint_end_partner        only a joint END resolved against the partner
//   joint_uses_older         joint age bounds resolved against max(A, A')
//   joint_uses_younger       joint age bounds resolved against min(A, A')
//   joint_needs_partner_age  joint resolved against A, but unresolvable when the partner's age is unknown/absent
//   group_from_rounded_rows  income group = sum of the rounded per-source rows
//   deflate_rounded_gap      today-dollar gap/surplus deflated from the rounded nominal value
//   gap_from_rounded_rows    gap/surplus from the rounded spending and rounded rows (control)
//   half_up                  round half up instead of half even (control)
//   today_dollars_nominal    today-dollar source with s_j > 0 treated as nominal: b_j = a_j (control)
//   today_dollars_i_after    today-dollar source indexed at i after its start instead of q_j (control)

const TENK = 10000n;
const powCache = new Map();
export function pw(b, e) {
  if (e < 0) throw new Error(`negative exponent ${e}`);
  const key = `${b}^${e}`;
  if (powCache.has(key)) return powCache.get(key);
  let r = 1n;
  for (let k = 0; k < e; k++) r *= b;
  powCache.set(key, r);
  return r;
}

export function roundDiv(n, d, faults = {}) {
  if (n < 0n || d <= 0n) throw new Error(`roundDiv domain ${n}/${d}`);
  const q = n / d, rem = n % d, twice = 2n * rem;
  if (twice > d) return q + 1n;
  if (twice < d) return q;
  if (faults.half_up) return q + 1n;
  return q % 2n === 0n ? q : q + 1n;
}

function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { [a, b] = [b, a % b]; } return a; }

export function exactStr(n, d) {
  if (n < 0n) throw new Error('negative exact value');
  if (n === 0n) return '0';
  const g = gcd(n, d); n /= g; d /= g;
  let dd = d, a2 = 0, a5 = 0;
  while (dd % 2n === 0n) { dd /= 2n; a2++; }
  while (dd % 5n === 0n) { dd /= 5n; a5++; }
  if (dd !== 1n) return `${n}/${d}`;
  const k = Math.max(a2, a5);
  if (k === 0) return n.toString();
  const scaled = n * (pw(10n, k) / d);
  let s = scaled.toString().padStart(k + 1, '0');
  const ip = s.slice(0, s.length - k);
  const fp = s.slice(s.length - k).replace(/0+$/, '');
  return fp ? `${ip}.${fp}` : ip;
}

const isKnown = (q) => q && (q.status === 'zero' || q.status === 'estimated' || q.status === 'confirmed');
const posKnown = (q) => !!(q && (q.status === 'estimated' || q.status === 'confirmed') && q.value > 0);
const val = (q) => (isKnown(q) ? q.value : null);

const ROW_SIX = ['start_unknown', 'start_unresolvable', 'end_unknown', 'end_unresolvable', 'amount_unknown', 'price_basis_unknown'];
const BLOCKING_FLAGS = ['gross_net_mismatch', 'tax_basis_unknown', 'incomplete_income', 'pension_double_count_risk'];
const ACCESSIBLE = ['rrsp_rrif', 'tfsa', 'non_registered', 'other', 'not_sure'];
const T_STAR_MAX = 83;

function ownerAge(src, which, ctx, faults) {
  if (src.owner === 'partner') return ctx.Ap;
  if (src.owner === 'joint') {
    if (faults.joint_uses_partner) return ctx.Ap;
    if (faults.joint_start_partner && which === 'start') return ctx.Ap;
    if (faults.joint_end_partner && which === 'end') return ctx.Ap;
    if (faults.joint_uses_older) return ctx.A === null || ctx.Ap === null ? null : Math.max(ctx.A, ctx.Ap);
    if (faults.joint_uses_younger) return ctx.A === null || ctx.Ap === null ? null : Math.min(ctx.A, ctx.Ap);
    if (faults.joint_needs_partner_age) return ctx.Ap === null ? null : ctx.A;
    return ctx.A;
  }
  return ctx.A;
}

// -> {k:'res', v:int|Infinity} | {k:'unknown'} | {k:'unres'}
function resolveBound(bound, src, which, ctx, faults) {
  if (bound === undefined || bound === null) return { k: 'res', v: Infinity }; // absent end
  if (bound.reference === 'already_receiving') return { k: 'res', v: 0 };
  if (!isKnown(bound.point)) return { k: 'unknown' };
  if (bound.reference === 'year_index') return { k: 'res', v: bound.point.value };
  if (bound.reference === 'age') {
    const ao = ownerAge(src, which, ctx, faults);
    if (ao === null) return { k: 'unres' };
    return { k: 'res', v: bound.point.value - ao };
  }
  throw new Error(`unknown reference ${bound.reference}`);
}

function prepSources(inp, ctx, faults) {
  const inc = inp.chapters.income;
  return (inc.sources || []).map((src) => {
    const s = resolveBound(src.start, src, 'start', ctx, faults);
    const e = resolveBound(src.end, src, 'end', ctx, faults);
    const amtKnown = src.amount.status === 'estimated' || src.amount.status === 'confirmed';
    const aAnnual = amtKnown ? BigInt(src.amount.value) * (src.period === 'monthly' ? 12n : 1n) : null;
    const q = BigInt(src.escalation_bp.value);
    // static codes (conditions that do not depend on t)
    const codes = [];
    if (src.start.reference !== 'already_receiving' && src.start.point.status === 'unknown') codes.push('start_unknown');
    if (src.start.reference === 'age' && isKnown(src.start.point) && ownerAge(src, 'start', ctx, faults) === null) codes.push('start_unresolvable');
    if (src.end && src.end.point.status === 'unknown') codes.push('end_unknown');
    if (src.end && src.end.reference === 'age' && isKnown(src.end.point) && ownerAge(src, 'end', ctx, faults) === null) codes.push('end_unresolvable');
    if (src.amount.status === 'unknown') codes.push('amount_unknown');
    if (src.price_basis === 'unknown' && !(s.k === 'res' && s.v === 0)) codes.push('price_basis_unknown');
    if (src.tax_basis === 'gross') codes.push('gross');
    if (src.tax_basis === 'unknown') codes.push('tax_basis_unknown');
    return { src, s, e, aAnnual, q, codes };
  });
}

// three-state payment test, rules evaluated in order (workshop-math.md s4)
function pays(p, t) {
  if (p.src.amount.status === 'zero') return 'no';
  if (p.e.k === 'res' && t >= p.e.v) return 'no';
  if (p.s.k === 'res' && t < p.s.v) return 'no';
  if (p.s.k === 'res' && p.e.k === 'res') return 'yes';
  return 'unknown';
}

// P_j,t numerator over 10000^t, or null (unknown). 0n when not paying.
function payNum(p, t, ctx, faults) {
  const st = pays(p, t);
  if (st === 'no') return 0n;
  if (st === 'unknown') return null;
  if (p.aAnnual === null) return null;
  const s = p.s.v;
  if (s < 0) throw new Error(`resolved start ${s} < 0 (only reachable in a faulty reading)`);
  const i = BigInt(ctx.i);
  const G = (x) => TENK + x;
  const pb = p.src.price_basis;
  if (s === 0 || pb === 'start_year_dollars') {
    return p.aAnnual * pw(G(p.q), t - s) * pw(TENK, s);
  }
  if (pb === 'today_dollars') {
    if (faults.today_dollars_nominal) return p.aAnnual * pw(G(p.q), t - s) * pw(TENK, s);
    if (faults.today_dollars_uses_q) return p.aAnnual * pw(G(p.q), s) * pw(G(p.q), t - s);
    if (faults.today_dollars_i_after) return p.aAnnual * pw(G(i), s) * pw(G(i), t - s);
    return p.aAnnual * pw(G(i), s) * pw(G(p.q), t - s);
  }
  return null; // price_basis unknown and s > 0
}

function sortedUnique(a) { return [...new Set(a)].sort(); }

export function compute(inp, faults = {}) {
  const ch = inp.chapters;
  const tm = ch.timing;
  const hh = tm.household;
  const ctx = {
    A: val(tm.current_age), R: val(tm.retirement_age),
    Ap: hh ? val(hh.partner_current_age) : null, Rp: hh ? val(hh.partner_retirement_age) : null,
    H: tm.planning_horizon_years.value, i: tm.inflation_bp.value,
    r: tm.capital_illustration_return_bp ? tm.capital_illustration_return_bp.value : null,
    Y0: inp.base_year,
  };
  const coverage = ch.income.coverage;
  const covComplete = coverage === 'all_known_sources_listed' || coverage === 'no_planned_income';
  const sp = ch.life.spending;
  const spendKnown = sp.amount.status === 'estimated' || sp.amount.status === 'confirmed';
  const aSpend = spendKnown ? BigInt(sp.amount.value) * (sp.period === 'monthly' ? 12n : 1n) : null;
  const srcs = prepSources(inp, ctx, faults);
  const windowKnown = ctx.A !== null && ctx.R !== null;
  const tR = windowKnown ? ctx.R - ctx.A : null;

  const globalRowCodes = [];
  if (!spendKnown) globalRowCodes.push('spending_unknown');
  if (coverage === 'not_answered') globalRowCodes.push('income_not_answered');
  if (coverage === 'some_sources_may_be_missing') globalRowCodes.push('income_list_partial');

  const codesAt = (p, t) => (pays(p, t) === 'no' ? [] : p.codes);

  // T* scan
  const Tstar = [];
  if (windowKnown) for (let t = tR; t < tR + ctx.H; t++) Tstar.push(t);
  else for (let t = 0; t <= T_STAR_MAX; t++) Tstar.push(t);
  const scanCodes = [];
  let anyGross = false, anyTbu = false, anySix = false, uncertainMayPay = false;
  for (const p of srcs) for (const t of Tstar) {
    const cs = codesAt(p, t);
    for (const c of cs) {
      scanCodes.push(`${c}:${p.src.id}`);
      if (c === 'gross') anyGross = true;
      if (c === 'tax_basis_unknown') anyTbu = true;
      if (ROW_SIX.includes(c)) anySix = true;
    }
    if (p.src.dependability === 'uncertain' && pays(p, t) !== 'no') uncertainMayPay = true;
  }

  // rows
  const years = [];
  const rowGaps = []; // {t, Gnum} for computed rows
  if (windowKnown) {
    for (let t = tR; t < tR + ctx.H; t++) {
      const den = pw(TENK, t);
      const Dn = spendKnown ? aSpend * pw(TENK + BigInt(ctx.i), t) : null;
      const Pn = srcs.map((p) => payNum(p, t, ctx, faults));
      const reasons = [...globalRowCodes];
      srcs.forEach((p) => { for (const c of codesAt(p, t)) reasons.push(`${c}:${p.src.id}`); });
      const rs = sortedUnique(reasons);
      const cond4 = srcs.every((p, j) => Pn[j] === null || Pn[j] === 0n || p.src.tax_basis === 'net');
      const computed = Dn !== null && covComplete && Pn.every((x) => x !== null) && cond4;
      if (computed !== (rs.length === 0)) throw new Error(`computed/no-reason equivalence broken at t=${t}`);
      const bySrc = {};
      srcs.forEach((p, j) => { bySrc[p.src.id] = Pn[j] === null ? null : Number(roundDiv(Pn[j], den, faults)); });
      const group = (basis) => {
        if (!covComplete) return null;
        let sum = 0n, sumRounded = 0n, members = 0;
        for (let j = 0; j < srcs.length; j++) {
          if (srcs[j].src.tax_basis !== basis || Pn[j] === 0n) continue;
          if (Pn[j] === null) return null;
          members++; sum += Pn[j]; sumRounded += roundDiv(Pn[j], den, faults);
        }
        if (members === 0) return 0;
        return faults.group_from_rounded_rows ? Number(sumRounded) : Number(roundDiv(sum, den, faults));
      };
      const row = {
        t, calendar_year: ctx.Y0 + t, age: ctx.A + t,
        spending_cents: Dn === null ? null : Number(roundDiv(Dn, den, faults)),
        income_by_source_cents: bySrc,
        income_net_cents: group('net'), income_gross_cents: group('gross'), income_unknown_basis_cents: group('unknown'),
        status: computed ? 'computed' : 'not_computable', reasons: rs,
        gap_cents: null, surplus_cents: null, gap_today_dollars_cents: null, surplus_today_dollars_cents: null,
        exact: { spending: Dn === null ? null : exactStr(Dn, den) },
      };
      if (hh && ctx.Ap !== null) row.partner_age = ctx.Ap + t;
      if (computed) {
        const In = Pn.reduce((a, b) => a + b, 0n);
        let Gn = Dn > In ? Dn - In : 0n;
        let Sn = In > Dn ? In - Dn : 0n;
        const defl = pw(TENK + BigInt(ctx.i), t);
        if (faults.gap_from_rounded_rows) {
          const dR = roundDiv(Dn, den, faults);
          const iR = Pn.reduce((a, b) => a + roundDiv(b, den, faults), 0n);
          row.gap_cents = Number(dR > iR ? dR - iR : 0n);
          row.surplus_cents = Number(iR > dR ? iR - dR : 0n);
        } else {
          row.gap_cents = Number(roundDiv(Gn, den, faults));
          row.surplus_cents = Number(roundDiv(Sn, den, faults));
        }
        if (faults.deflate_rounded_gap) {
          // deflate the displayed cents: cents * 10000^t / (10000+i)^t
          row.gap_today_dollars_cents = Number(roundDiv(BigInt(row.gap_cents) * den, defl, faults));
          row.surplus_today_dollars_cents = Number(roundDiv(BigInt(row.surplus_cents) * den, defl, faults));
        } else {
          row.gap_today_dollars_cents = Number(roundDiv(Gn, defl, faults));
          row.surplus_today_dollars_cents = Number(roundDiv(Sn, defl, faults));
        }
        row.exact.income_compared = exactStr(In, den);
        row.exact.gap = exactStr(Gn, den);
        row.exact.surplus = exactStr(Sn, den);
        rowGaps.push({ t, Gn });
      }
      years.push(row);
    }
  }

  // completeness
  const globalCodes = [];
  if (ctx.A === null) globalCodes.push('current_age_unknown');
  if (ctx.R === null) globalCodes.push('retirement_age_unknown');
  globalCodes.push(...globalRowCodes);
  const allRowReasons = years.flatMap((y) => y.reasons);
  const reasons = sortedUnique([...globalCodes, ...allRowReasons, ...scanCodes]);
  const rowHas = (pred) => years.some((y) => y.reasons.some((c) => pred(c.split(':')[0])));
  let state;
  if (!windowKnown) state = 'incomplete_unknown_timing';
  else if (!spendKnown) state = 'incomplete_unknown_spending';
  else if (!covComplete || rowHas((c) => ROW_SIX.includes(c))) state = 'incomplete_unknown_income';
  else if (rowHas((c) => c === 'gross')) state = 'basis_mismatch';
  else if (rowHas((c) => c === 'tax_basis_unknown')) state = 'basis_unknown';
  else if (years.every((y) => y.status === 'computed')) state = 'complete';
  else throw new Error('no completeness state applies');

  // predicates
  const C = !windowKnown || !spendKnown;
  const M = !covComplete || anySix;
  const X = anyGross || anyTbu;
  const Hp = !!hh && ctx.A !== null && ctx.R !== null && ctx.Ap !== null && ctx.Rp !== null && (ctx.Rp - ctx.Ap) !== (ctx.R - ctx.A);
  const F = windowKnown && rowGaps.some((g) => g.Gn > 0n);

  // savings
  const sv = ch.savings || {};
  const acc = sv.accounts || {};
  const accessible = ACCESSIBLE.filter((k) => posKnown(acc[k]));
  const homeBizPos = posKnown(sv.home_value && sv.home_value.amount) || posKnown(sv.business_value && sv.business_value.amount);
  const excluded = [];
  if (sv.home_value) excluded.push('home_value');
  if (sv.business_value) excluded.push('business_value');

  // flags
  const flags = [];
  if (anyGross) flags.push('gross_net_mismatch');
  if (anyTbu) flags.push('tax_basis_unknown');
  if (M) flags.push('incomplete_income');
  if (homeBizPos && accessible.length === 0) flags.push('housing_only_wealth');
  if (sv.pension_value && posKnown(sv.pension_value.amount) && ['yes', 'not_sure'].includes(sv.pension_value.also_entered_as_income)) flags.push('pension_double_count_risk');
  if (srcs.some((p) => ['rental', 'business'].includes(p.src.kind) && p.src.dependability === 'scheduled')) flags.push('uncertain_kind_labelled_scheduled');
  if (windowKnown) {
    const lim = tR + ctx.H;
    const srcBeyond = srcs.some((p) => p.src.amount.status !== 'zero' && p.s.k === 'res' && p.s.v >= lim);
    const partnerBeyond = ctx.Ap !== null && ctx.Rp !== null && (ctx.Rp - ctx.Ap) >= lim;
    if (srcBeyond || partnerBeyond) flags.push('horizon_shorter_than_timeline');
  }
  if (Hp) flags.push('household_timing_differs');
  if (uncertainMayPay) flags.push('includes_uncertain_income');
  const flagsSorted = sortedUnique(flags);

  // capital illustration reference (s11, s12 item 8)
  const nc = [];
  if (ctx.r === null) nc.push('return_assumption_absent');
  if (state !== 'complete') nc.push('state_not_complete');
  const ref = {
    r_bp: ctx.r, computable: nc.length === 0, not_computable_reasons: [...nc].sort(),
    display_eligible_if_enabled: false, ineligible_reasons: [...nc].sort(),
    C_R_cents: null, C_R_exact: null, valued_at: null, flow_timing: 'end_of_year',
  };
  if (nc.length === 0) {
    const H = ctx.H, r = BigInt(ctx.r);
    const den = pw(TENK, tR + H - 1) * pw(TENK + r, H);
    let num = 0n;
    rowGaps.forEach(({ t, Gn }) => { const k = t - tR; num += Gn * pw(TENK, H) * pw(TENK + r, H - 1 - k); });
    const inel = BLOCKING_FLAGS.filter((f) => flagsSorted.includes(f));
    if (!rowGaps.some((g) => g.Gn > 0n)) inel.push('no_positive_gap');
    ref.ineligible_reasons = sortedUnique(inel);
    ref.display_eligible_if_enabled = ref.ineligible_reasons.length === 0;
    ref.C_R_cents = Number(roundDiv(num, den, faults));
    ref.C_R_exact = exactStr(num, den);
    ref.valued_at = { t: tR, calendar_year: ctx.Y0 + tR, point: 'start_of_year' };
  }

  // clip precedence (workshop-clip-rules.md s3)
  const [selected, selection_reason] = selectClip({ C, M, X, H: Hp, F });

  return {
    contract_version: '1.0',
    assumptions_echo: {
      base_year: ctx.Y0, inflation_bp: ctx.i, planning_horizon_years: ctx.H, capital_illustration_return_bp: ctx.r,
      year_index: 't=0 is calendar year base_year; annual totals per calendar year',
      rounding: 'exact rational arithmetic; half-even to whole cents at display only',
    },
    window: windowKnown ? {
      t_R: tR, first_t: tR, last_t: tR + ctx.H - 1, first_calendar_year: ctx.Y0 + tR, last_calendar_year: ctx.Y0 + tR + ctx.H - 1,
      first_age: ctx.R, last_age: ctx.R + ctx.H - 1,
    } : null,
    completeness: { state, reasons },
    years,
    flags: flagsSorted,
    savings_summary: {
      accessible_categories_with_positive_value: accessible, home_or_business_positive_value: homeBizPos,
      excluded_from_spendable: excluded, pension_value_kept_separate: !!sv.pension_value, totals_computed: false,
    },
    capital_illustration: { feature_flag: 'off', displayed: false, state: 'disabled_by_flag', reference_if_enabled: ref },
    clip: { predicates: { C, M, X, H: Hp, F }, selected, selection_reason },
  };
}

export function selectClip(p) {
  if (p.C) return ['W10', 'core_inputs_missing'];
  if (p.M) return ['W06', 'missing_income'];
  if (p.X) return ['W08', 'tax_basis'];
  if (p.H) return ['W09', 'household_timing'];
  if (p.F) return ['W07', 'funding_gap'];
  return ['W10', 'neutral_fallback'];
}

// workshop-clip-rules.md s7 render states
export function mediaState(mc) {
  const other = mc.locale === 'fr' ? 'en' : 'fr';
  const av = mc.availability[mc.selected];
  let render;
  if (av[mc.locale] === 'available') render = 'play';
  else if (av[mc.locale] === 'test_media' && mc.build === 'local_test') render = 'play_test_media_labelled';
  else if (av[mc.locale] === 'unavailable' && av[other] === 'available') render = 'other_locale_only';
  else render = 'unavailable';
  const anyTest = Object.values(mc.availability).some((o) => Object.values(o).includes('test_media'));
  return {
    selected: mc.selected, render_state: render, disclosure_shown: true, substitute_clip: null,
    release_check: mc.build === 'production' && anyTest ? 'fail_test_media_referenced' : 'pass',
  };
}

// XF-04..XF-06 (semantic layer), own implementation
export function semanticErrors(inp) {
  const errs = [];
  const tm = inp.chapters.timing, hh = tm.household;
  const ctx = { A: val(tm.current_age), Ap: hh ? val(hh.partner_current_age) : null };
  const ids = new Set();
  for (const src of inp.chapters.income.sources || []) {
    if (ids.has(src.id)) errs.push(`XF-06 duplicate ${src.id}`);
    ids.add(src.id);
    const ao = src.owner === 'partner' ? ctx.Ap : ctx.A;
    if (src.start.reference === 'age' && isKnown(src.start.point) && ao !== null && src.start.point.value < ao) errs.push(`XF-04 ${src.id}`);
    const s = resolveBound(src.start, src, 'start', ctx, {});
    const e = resolveBound(src.end, src, 'end', ctx, {});
    if (src.end && s.k === 'res' && e.k === 'res' && !(e.v > s.v)) errs.push(`XF-05 ${src.id}`);
  }
  return errs;
}
