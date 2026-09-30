// workshop-math.md s4 three-state test: "no when t < s_j, when t >= e_j, or zero-status";
// "unknown when s_j is unknown or unresolvable, or ...". Both clauses hold when s_j is unknown and t >= e_j.
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { computeModel, semanticErrors } from './model.mjs';
const ajv = new Ajv2020({ strict: false }); const validate = ajv.compile(JSON.parse(fs.readFileSync('/home/user/bill/.orchestration/contracts/workshop-inputs.schema.json', 'utf8')));
const src = (id, o = {}) => ({ id, kind: 'workplace_pension', owner: 'self', amount: { status: 'estimated', value: 3000000 }, period: 'annual', tax_basis: 'net', price_basis: 'start_year_dollars', start: { reference: 'already_receiving' }, escalation_bp: { status: 'zero', value: 0 }, dependability: 'scheduled', ...o });
const d = { contract: 'workshop-inputs', contract_version: '1.0', currency: 'CAD', base_year: 2026, chapters: {
  life: { spending: { amount: { status: 'estimated', value: 400000 }, period: 'monthly', tax_basis: 'after_tax', price_basis: 'today_dollars', unit: 'household' } },
  income: { coverage: 'all_known_sources_listed', sources: [src('src-1'), src('src-2', { kind: 'employment', amount: { status: 'estimated', value: 1200000 }, start: { reference: 'age', point: { status: 'unknown' } }, end: { reference: 'age', point: { status: 'estimated', value: 62 } } })] },
  savings: {}, timing: { current_age: { status: 'estimated', value: 60 }, retirement_age: { status: 'estimated', value: 62 }, planning_horizon_years: { status: 'estimated', value: 6 }, inflation_bp: { status: 'zero', value: 0 } } } };
console.log('input: src-2 start age unknown, end age 62 (e_j = 2 = t_R); schema valid =', validate(d), '; XF-04..06 errors =', JSON.stringify(semanticErrors(d)));
for (const [label, opt] of [['reading 1 ("no" first, t >= e_j decides)', {}], ['reading 2 ("unknown" first)', { unknownFirst: true }]]) {
  const o = computeModel(d, opt);
  console.log(label.padEnd(42), JSON.stringify({ state: o.completeness.state, clip: o.clip.selected, reason: o.clip.selection_reason, flags: o.flags, t2: { status: o.years[0].status, gap: o.years[0].gap_cents, src2: o.years[0].income_by_source_cents['src-2'] } }));
}
