// Metamorphic test of "an unknown is never zero": a row that is `computed` while some input is
// unknown must not depend on that input. For each unknown, substitute two distinct known values
// (keeping the doc schema+semantic valid) and require every originally computed row to be
// byte-identical in both substitutes. Also: monthly x12 == annual (units), and savings never move numbers.
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { evaluate, semanticErrors } from './model.mjs';
const schema = JSON.parse(fs.readFileSync('/home/user/bill/.orchestration/contracts/workshop-inputs.schema.json', 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
const docs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const clone = (x) => JSON.parse(JSON.stringify(x));
const valid = (d) => validate(d) && semanticErrors(d).length === 0;
const rowsKey = (out) => Object.fromEntries(out.years.map((y) => { const { partner_age, ...r } = y; return [y.t, JSON.stringify(r)]; }));

let checks = 0, skipped = 0; const viol = []; const byKind = {};
function substitutions(doc) {
  const subs = [];
  const ch = doc.chapters;
  if (ch.life.spending.amount.status === 'unknown') subs.push(['spending', [(d) => { d.chapters.life.spending.amount = { status: 'estimated', value: 111111 }; }, (d) => { d.chapters.life.spending.amount = { status: 'estimated', value: 777777 }; }]]);
  ch.income.sources.forEach((s, k) => {
    if (s.amount.status === 'unknown') subs.push([`amount:${k}`, [(d) => { d.chapters.income.sources[k].amount = { status: 'estimated', value: 12345 }; }, (d) => { d.chapters.income.sources[k].amount = { status: 'estimated', value: 54321 }; }]]);
    if (s.price_basis === 'unknown') subs.push([`price_basis:${k}`, [(d) => { d.chapters.income.sources[k].price_basis = 'today_dollars'; }, (d) => { d.chapters.income.sources[k].price_basis = 'start_year_dollars'; }]]);
    if (s.start.point && s.start.point.status === 'unknown') {
      const mk = (v) => (d) => { d.chapters.income.sources[k].start.point = { status: 'estimated', value: v }; };
      const vals = s.start.reference === 'age' ? [60, 99] : [1, 82];
      subs.push([`start:${k}`, vals.map(mk)]);
    }
    if (s.end && s.end.point.status === 'unknown') {
      const mk = (v) => (d) => { d.chapters.income.sources[k].end.point = { status: 'estimated', value: v }; };
      const vals = s.end.reference === 'age' ? [70, 100] : [2, 82];
      subs.push([`end:${k}`, vals.map(mk)]);
    }
  });
  const hh = ch.timing.household;
  if (hh && hh.partner_current_age.status === 'unknown') subs.push(['partner_age', [(d) => { d.chapters.timing.household.partner_current_age = { status: 'estimated', value: 30 }; }, (d) => { d.chapters.timing.household.partner_current_age = { status: 'estimated', value: Math.min(100, d.chapters.timing.household.partner_retirement_age.value ?? 100) }; }]]);
  return subs;
}
for (const doc of docs) {
  const base = evaluate(doc);
  const computedTs = base.years.filter((y) => y.status === 'computed').map((y) => y.t);
  // savings never move a number
  const ds = clone(doc); ds.chapters.savings = { accounts: { rrsp_rrif: { status: 'estimated', value: 999999 } }, home_value: { amount: { status: 'estimated', value: 5 } } };
  if (valid(ds)) { const o = evaluate(ds); checks++; if (JSON.stringify(o.years) !== JSON.stringify(base.years)) viol.push({ kind: 'savings_moved_numbers' }); }
  // monthly <-> annual units
  const sp = doc.chapters.life.spending;
  if (sp.period === 'monthly' && sp.amount.status !== 'unknown') {
    const da = clone(doc); da.chapters.life.spending.period = 'annual'; da.chapters.life.spending.amount.value = sp.amount.value * 12;
    if (valid(da)) { checks++; if (JSON.stringify(evaluate(da).years) !== JSON.stringify(base.years)) viol.push({ kind: 'monthly_vs_annual' }); }
  }
  if (!computedTs.length) continue;
  for (const [name, fns] of substitutions(doc)) {
    const outs = [];
    for (const f of fns) { const d = clone(doc); f(d); if (!valid(d)) { outs.push(null); continue; } outs.push(evaluate(d)); }
    if (outs.some((o) => o === null)) { skipped++; continue; }
    const bk = rowsKey(base);
    for (const t of computedTs) {
      checks++; byKind[name.split(':')[0]] = (byKind[name.split(':')[0]] || 0) + 1;
      const a = rowsKey(outs[0])[t], b = rowsKey(outs[1])[t];
      if (a !== bk[t] || b !== bk[t]) viol.push({ kind: 'computed_row_depends_on_unknown', name, t, base: bk[t].slice(0, 200), a: a && a.slice(0, 200) });
    }
  }
}
console.log(JSON.stringify({ docs: docs.length, checks, skipped_invalid_substitutions: skipped, computed_row_checks_by_unknown_kind: byKind, violations: viol.length, examples: viol.slice(0, 5) }, null, 1));
process.exitCode = viol.length ? 1 : 0;
