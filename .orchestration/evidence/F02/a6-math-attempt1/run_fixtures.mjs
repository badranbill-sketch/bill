// Recompute every WM fixture with the independent model and diff against expected.
// Also runs closed-form cross-checks (BigInt pow) that are independent of the
// recurrence used inside model.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { computeModel, Q, factor, semanticErrors } from './model.mjs';
import { deepDiff } from './run_fixtures_lib.mjs';

const FIX = process.env.FIX_DIR || '/home/user/bill/.orchestration/contracts/fixtures/workshop';
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ok  ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };

const pow = (bp, n) => new Q((10000n + BigInt(bp)) ** BigInt(n), 10000n ** BigInt(n)); // closed form, not a recurrence
const Z = Q.of(0);

const files = fs.readdirSync(FIX).filter((f) => /^WM\d\d-.*\.json$/.test(f)).sort();
const results = {};
for (const f of files) {
  const fx = JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));
  console.log(`== ${fx.fixture_id} ${fx.title}`);
  const got = computeModel(fx.input);
  const diffs = deepDiff(JSON.parse(JSON.stringify(got)), fx.expected);
  ok(diffs.length === 0, `${fx.fixture_id} full output record equals expected (${diffs.length} differences)`);
  diffs.slice(0, 30).forEach((d) => console.log('       diff ' + d));
  ok(semanticErrors(fx.input).length === 0, `${fx.fixture_id} input passes XF-04..XF-06`);
  results[fx.fixture_id] = { diffs: diffs.length, output: JSON.parse(JSON.stringify(got)) };

  // generic closed-form cross-checks on every computed year
  const I = got._internal; const tim = fx.input.chapters.timing; const ibp = tim.inflation_bp.value;
  let genericOK = true, oneOfOK = true, identityOK = true, centOK = true;
  for (const y of I.years) {
    if (I.aSp !== null) {
      const Dcf = I.aSp.mul(pow(ibp, y.t));
      if (y._D && Dcf.cmp(y._D) !== 0) genericOK = false;
      if (y.exact.spending !== Dcf.toExact()) genericOK = false;
    }
    if (y.status === 'computed') {
      const gPos = y._G.cmp(Z) > 0, sPos = y._S.cmp(Z) > 0;
      if (gPos && sPos) oneOfOK = false;
      if (y._G.sub(y._S).cmp(y._D.sub(y._sum)) !== 0) identityOK = false;
      // one-cent display gap relative to displayed D and displayed income group total
      const dispInc = (y.income_net_cents ?? 0);
      const shown = y.gap_cents - y.surplus_cents; const naive = y.spending_cents - dispInc;
      if (Math.abs(shown - naive) > 1) centOK = false;
    }
  }
  ok(genericOK, `${fx.fixture_id} D_t (recurrence) equals a*(1+i)^t (closed-form BigInt power) in every window year`);
  if (I.years.some((y) => y.status === 'computed')) {
    ok(oneOfOK, `${fx.fixture_id} at most one of G_t, S_t is positive`);
    ok(identityOK, `${fx.fixture_id} G_t - S_t = D_t - sum P exactly`);
    ok(centOK, `${fx.fixture_id} |displayed (G-S) - (displayed D - displayed income total)| <= 1 cent`);
  }
  // per-source closed form: P = b(1+q)^(t-s), b = a or a(1+i)^s
  let srcOK = true;
  fx.input.chapters.income.sources.forEach((s, j) => {
    const S = I.srcs[j];
    if (!S.amtKnown || !S.s.ok || S.bUnknown) return;
    const a = Q.of(s.period === 'monthly' ? 12 * s.amount.value : s.amount.value);
    const b = (S.s.v === 0 || s.price_basis === 'start_year_dollars') ? a : a.mul(pow(ibp, S.s.v));
    for (const y of I.years) {
      const t = y.t; if (t < S.s.v || (S.e.v !== null && t >= S.e.v)) continue;
      const P = b.mul(pow(s.escalation_bp.value, t - S.s.v));
      if (Number(P.roundHalfEven()) !== y.income_by_source_cents[s.id]) srcOK = false;
    }
  });
  ok(srcOK, `${fx.fixture_id} every paying P_j,t equals b_j(1+q_j)^(t-s_j) by closed-form power`);
}

// fixture-specific independent checks
function load(id) { const f = files.find((x) => x.startsWith(id)); return JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8')); }
console.log('== fixture-specific closed forms');
{ // WM02 geometric series
  const fx = load('WM02'); const e = fx.expected; const a = Q.of(5000000);
  let sum = Z; for (let t = 5; t <= 14; t++) sum = sum.add(new Q(BigInt(e.years[t - 5].exact.spending.replace('.', '')), 10n ** BigInt((e.years[t - 5].exact.spending.split('.')[1] || '').length)));
  const cf = a.mul(pow(200, 5)).mul(pow(200, 10).sub(Q.of(1))).div(new Q(2n, 100n));
  ok(sum.cmp(cf) === 0, 'WM02 sum of expected exact D_5..D_14 = a(1.02)^5((1.02)^10-1)/0.02');
  ok(e.years.every((y) => y.gap_today_dollars_cents === 5000000), 'WM02 deflated gap = 5,000,000 in every year');
}
function parseExact(s) {
  if (s.includes('/')) { const [n, d] = s.split('/'); return new Q(BigInt(n), BigInt(d)); }
  const [ip, fp = ''] = s.split('.'); return new Q(BigInt(ip + fp), 10n ** BigInt(fp.length));
}
{ // WM14 r = 0: plain sum
  const e = load('WM14').expected; const ci = e.capital_illustration.reference_if_enabled;
  ok(ci.C_R_exact === '9000000' && ci.C_R_cents === 9000000, 'WM14 C_R = 5 x 1,800,000 = 9,000,000 (r = 0)');
}
{ // WM15 growing annuity closed form: a[1-((1+i)/(1+r))^H]/(r-i), t_R = 0, flows end-of-year
  const e = load('WM15').expected; const ci = e.capital_illustration.reference_if_enabled;
  const a = Q.of(5000000), i = new Q(200n, 10000n), r = new Q(400n, 10000n);
  const ratio = pow(200, 20).div(pow(400, 20));
  const cf = a.mul(Q.of(1).sub(ratio)).div(r.sub(i));
  ok(cf.cmp(parseExact(ci.C_R_exact)) === 0, `WM15 C_R_exact equals growing-annuity closed form (${cf.roundHalfEven()} cents)`);
  ok(Number(cf.roundHalfEven()) === ci.C_R_cents, 'WM15 C_R_cents = half-even(closed form)');
}
{ // WM16 level annuity: g[1-(1+r)^-H]/r
  const e = load('WM16').expected; const ci = e.capital_illustration.reference_if_enabled;
  const g = Q.of(1800000), r = new Q(500n, 10000n);
  const cf = g.mul(Q.of(1).sub(Q.of(1).div(pow(500, 25)))).div(r);
  ok(cf.cmp(parseExact(ci.C_R_exact)) === 0, `WM16 C_R_exact equals level-annuity closed form (${cf.roundHalfEven()} cents)`);
}
{ // WM11 direct discounted sum at 3%
  const e = load('WM11').expected; const ci = e.capital_illustration.reference_if_enabled;
  let s = Z; for (let k = 0; k < 3; k++) s = s.add(Q.of(1800000).div(pow(300, k + 1)));
  ok(s.cmp(parseExact(ci.C_R_exact)) === 0 && ci.display_eligible_if_enabled === false, 'WM11 C_R = sum 1,800,000/1.03^(k+1); display ineligible (pension guard)');
}
{ // WM12 r = 0: only gaps, surplus never netted
  const e = load('WM12').expected; const ci = e.capital_illustration.reference_if_enabled;
  const gaps = e.years.map((y) => parseExact(y.exact.gap)).reduce((x, y) => x.add(y), Z);
  const net = e.years.map((y) => parseExact(y.exact.gap).sub(parseExact(y.exact.surplus))).reduce((x, y) => x.add(y), Z);
  ok(gaps.cmp(parseExact(ci.C_R_exact)) === 0, `WM12 C_R (r=0) = sum of gaps only = ${gaps.toExact()}`);
  ok(net.cmp(parseExact(ci.C_R_exact)) !== 0, `WM12 netted total would be ${net.toExact()} (differs; surplus not netted)`);
}
{ // WM17 ties
  const e = load('WM17').expected;
  ok(Math.round(1010050.5) === 1010051 && e.years[1].spending_cents === 1010050, 'WM17 JS Math.round(1010050.5)=1010051 but half-even expected 1010050');
  ok(e.years[1].income_by_source_cents['src-1'] === 1010152, 'WM17 1010151.5 -> 1010152 (tie to even, upward)');
  ok(e.years[1].surplus_cents === 101 && (e.years[1].income_net_cents - e.years[1].spending_cents) === 102, 'WM17 displayed S=101 vs displayed P-D=102 (one-cent display gap)');
}
{ // WM24 float trap
  const x = 1000800 * 1.025 * 1.025; const e = load('WM24').expected;
  const exact = Q.of(1000800).mul(pow(250, 2));
  ok(x === 1051465.4999999998 && exact.toExact() === '1051465.5' && e.years[2].spending_cents === 1051466, `WM24 double ${x} vs exact ${exact.toExact()} -> half-even 1051466`);
}
console.log(`== summary: ${pass} passed, ${fail} failed`);
fs.writeFileSync(new URL('./out/computed_fixture_outputs.json', import.meta.url), JSON.stringify(results, null, 1));
process.exitCode = fail ? 1 : 0;
