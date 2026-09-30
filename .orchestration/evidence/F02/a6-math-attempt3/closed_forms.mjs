// Third, formula-level path: closed forms with BigInt powers (no loop over years for the
// annuity fixtures), plus the §9 bound claims, plus float64 traps. Compared to the fixture strings.
import fs from 'node:fs';
import { Q, factor } from './rational.mjs';

const FIX = '/home/user/bill/.orchestration/contracts/fixtures/workshop/';
const load = (id) => JSON.parse(fs.readFileSync(FIX + fs.readdirSync(FIX).find((f) => f.startsWith(id + '-')), 'utf8'));
const pw = (bp, n) => new Q((10000n + BigInt(bp)) ** BigInt(n), 10000n ** BigInt(n)); // direct pow, not iterated
let bad = 0; const ok = (name, cond, detail = '') => { console.log(`${cond ? 'OK  ' : 'FAIL'} ${name} ${detail}`); if (!cond) bad++; };

// WM02: D_t closed form and geometric-series identity
{
  const fx = load('WM02'); const a = new Q(5000000n);
  for (const y of fx.expected.years) ok(`WM02 D_${y.t}`, a.mul(pw(200, y.t)).toExact() === y.exact.spending, y.exact.spending);
  let direct = new Q(0n); for (const y of fx.expected.years) direct = direct.add(a.mul(pw(200, y.t)));
  // sum_{t=5}^{14} a(1+i)^t = a(1+i)^5 ((1+i)^10 - 1)/i
  const geo = a.mul(pw(200, 5)).mul(pw(200, 10).sub(1)).div(new Q(200n, 10000n));
  ok('WM02 geometric series identity', geo.cmp(direct) === 0, geo.toExact());
  for (const y of fx.expected.years) ok(`WM02 deflated gap t=${y.t}`, y.gap_today_dollars_cents === 5000000);
}
// WM14: r = 0 -> plain sum
{ const fx = load('WM14'); const cr = fx.expected.capital_illustration.reference_if_enabled; ok('WM14 5 x 1,800,000', cr.C_R_exact === String(5n * 1800000n)); }
// WM15: growing annuity a(1+i)^tR [1 - ((1+i)/(1+r))^H]/(r - i), tR=0, H=20, i=200, r=400
{
  const fx = load('WM15'); const cr = fx.expected.capital_illustration.reference_if_enabled;
  const a = new Q(5000000n), H = 20, tR = 0;
  const x = pw(200, 1).div(pw(400, 1));
  const xH = new Q(x.n ** BigInt(H), x.d ** BigInt(H));
  const v = a.mul(pw(200, tR)).mul(new Q(1n).sub(xH)).div(new Q(200n, 10000n));
  ok('WM15 growing annuity', v.toExact() === cr.C_R_exact, `${v.roundHalfEven()} vs ${cr.C_R_cents}`);
  ok('WM15 cents', Number(v.roundHalfEven()) === cr.C_R_cents);
}
// WM16: level annuity g[1-(1+r)^-H]/r, g = 4,800,000 - 3,000,000, H=25, r=500
{
  const fx = load('WM16'); const cr = fx.expected.capital_illustration.reference_if_enabled;
  const g = new Q(1800000n), H = 25; const r = new Q(500n, 10000n);
  const v = g.mul(new Q(1n).sub(new Q(1n).div(pw(500, H)))).div(r);
  ok('WM16 level annuity', v.toExact() === cr.C_R_exact, `${v.roundHalfEven()} vs ${cr.C_R_cents}`);
}
// WM35: tR=4, H=4, i=200, r=400 : a(1+i)^4 [1 - x^4]/(r - i) valued at start of t_R; contrast: discounting to t=0
{
  const fx = load('WM35'); const cr = fx.expected.capital_illustration.reference_if_enabled;
  const a = new Q(5000000n), H = 4, tR = 4;
  const x = pw(200, 1).div(pw(400, 1)); const xH = new Q(x.n ** BigInt(H), x.d ** BigInt(H));
  const v = a.mul(pw(200, tR)).mul(new Q(1n).sub(xH)).div(new Q(200n, 10000n));
  ok('WM35 deferred growing annuity at start of t_R', v.toExact() === cr.C_R_exact, `${v.roundHalfEven()} vs ${cr.C_R_cents}`);
  const toBase = v.div(pw(400, tR));
  ok('WM35 valued_at.t = 4 (not 0)', cr.valued_at.t === 4 && cr.valued_at.calendar_year === 2030 && Number(toBase.roundHalfEven()) !== cr.C_R_cents, `t=0 value would be ${toBase.roundHalfEven()}`);
}
// WM12: r=0, sum of gap years only (surplus not netted)
{
  const fx = load('WM12'); const cr = fx.expected.capital_illustration.reference_if_enabled;
  let s = new Q(0n), net = new Q(0n);
  for (const y of fx.expected.years) { const [n, d] = y.exact.gap.includes('/') ? y.exact.gap.split('/') : [y.exact.gap, '1'];
    const g = y.exact.gap.includes('.') ? (() => { const [ip, fp] = y.exact.gap.split('.'); return new Q(BigInt(ip + fp), 10n ** BigInt(fp.length)); })() : new Q(BigInt(n), BigInt(d));
    s = s.add(g); }
  ok('WM12 C_R = sum of positive gaps only', s.toExact() === cr.C_R_exact, s.toExact());
  const surplusYears = fx.expected.years.filter((y) => y.surplus_cents > 0).length, gapYears = fx.expected.years.filter((y) => y.gap_cents > 0).length;
  ok('WM12 has both surplus and gap years', surplusYears > 0 && gapYears > 0, `surplus years ${surplusYears}, gap years ${gapYears}`);
}
// WM17 / WM24 float traps
{
  ok('float Math.round(1010050.5) = 1010051 (half-up)', Math.round(1010050.5) === 1010051);
  ok('half-even 1010050.5 -> 1010050', new Q(2020101n, 2n).roundHalfEven() === 1010050n);
  const f = 1000800 * 1.025 * 1.025;
  ok('float64 1,000,800*1.025*1.025 = 1051465.4999999998', f === 1051465.4999999998, String(f));
  const e = new Q(1000800n).mul(pw(250, 2));
  ok('exact = 1051465.5 -> 1051466', e.toExact() === '1051465.5' && e.roundHalfEven() === 1051466n);
  const fx = load('WM24'); const y = fx.expected.years.find((r) => r.exact.spending === '1051465.5');
  ok('WM24 row contains the tie and rounds up to even', !!y && y.spending_cents === 1051466);
  const fx17 = load('WM17'); console.log('     WM17 rows:', fx17.expected.years.map((r) => `${r.t}:${r.exact.spending}->${r.spending_cents} surplus ${r.exact.surplus}->${r.surplus_cents}`).join(' | '));
}
// §9 bound claims
{
  const D = new Q(120000000n).mul(pw(1000, 102));
  ok('bound D_t max 2,000,944,911,742', D.roundHalfEven() === 2000944911742n, String(D.roundHalfEven()));
  const P = new Q(60000000n).mul(pw(1000, 102));
  ok('bound P max 1,000,472,455,871', P.roundHalfEven() === 1000472455871n, String(P.roundHalfEven()));
  ok('bound group 8P 8,003,779,646,969', P.mul(8n).roundHalfEven() === 8003779646969n, String(P.mul(8n).roundHalfEven()));
  let s = new Q(0n); for (let t = 43; t <= 102; t++) s = s.add(new Q(120000000n).mul(pw(1000, t)));
  ok('bound C_R(r=0) 21,938,105,946,171', s.roundHalfEven() === 21938105946171n, String(s.roundHalfEven()));
  ok('all bounds < 2^53-1', s.roundHalfEven() < 9007199254740991n);
  // max t: R - A + H - 1 with A>=18, R+H-1<=120
  let tmax = 0; for (let A = 18; A <= 100; A++) for (let R = Math.max(30, A); R <= 100; R++) { const H = Math.min(60, 121 - R); tmax = Math.max(tmax, R - A + H - 1); }
  ok('max t over the input space = 102', tmax === 102, String(tmax));
  // per-source rounding discrepancy example from §9
  const x = new Q(11000044n, 10n); const rows = 8n * x.roundHalfEven(); const tot = x.mul(8n).roundHalfEven();
  ok('§9 example 8 x 1,100,004.4: rows 8,800,032 total 8,800,035', rows === 8800032n && tot === 8800035n, `${rows} ${tot}`);
}
console.log(bad ? `${bad} FAIL` : 'ALL OK');
process.exitCode = bad ? 1 : 0;
