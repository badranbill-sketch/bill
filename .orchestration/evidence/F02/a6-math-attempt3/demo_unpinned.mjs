// Demonstrates two normative numeric rules that no fixture pins: a conformant model and a faulty
// model both pass all 36 WM fixtures + 45 clip cases, yet disagree on these inputs.
import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { evaluate, semanticErrors } from './model.mjs';
import { evaluate as evalF } from './model_faults.mjs';
const schema = JSON.parse(fs.readFileSync('/home/user/bill/.orchestration/contracts/workshop-inputs.schema.json', 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
const doc = (timing, sources, spending) => ({ contract: 'workshop-inputs', contract_version: '1.0', currency: 'CAD', base_year: 2026,
  chapters: { life: { spending: { amount: { status: 'estimated', value: spending }, period: 'annual', tax_basis: 'after_tax', price_basis: 'today_dollars', unit: 'household' } },
    income: { coverage: 'all_known_sources_listed', sources }, savings: {}, timing } });
const src = (o) => ({ id: 'src-1', kind: 'workplace_pension', owner: 'self', amount: { status: 'estimated', value: 2400000 }, period: 'annual', tax_basis: 'net', price_basis: 'today_dollars',
  start: { reference: 'age', point: { status: 'estimated', value: 65 } }, escalation_bp: { status: 'zero', value: 0 }, dependability: 'scheduled', ...o });
const demos = {
  'U1 today-dollar pension, q=0, i=2%, starts in 10 years': [doc({ current_age: { status: 'estimated', value: 55 }, retirement_age: { status: 'estimated', value: 65 }, planning_horizon_years: { status: 'estimated', value: 3 }, inflation_bp: { status: 'estimated', value: 200 } }, [src({})], 6000000), 'today_dollars_uses_q'],
  'U2 joint rental from age 65, partner 5 years younger': [doc({ current_age: { status: 'estimated', value: 60 }, retirement_age: { status: 'estimated', value: 62 }, planning_horizon_years: { status: 'estimated', value: 6 }, inflation_bp: { status: 'zero', value: 0 },
    household: { partner_current_age: { status: 'estimated', value: 55 }, partner_retirement_age: { status: 'estimated', value: 60 } } }, [src({ kind: 'rental', owner: 'joint', amount: { status: 'estimated', value: 1200000 }, price_basis: 'start_year_dollars' })], 4800000), 'joint_uses_partner'],
};
const res = {};
for (const [name, [d, fault]] of Object.entries(demos)) {
  const ok = validate(d) && semanticErrors(d).length === 0;
  const a = evaluate(d), b = evalF(d, new Set([fault]));
  console.log(`\n${name}  (valid input: ${ok}; fault: ${fault})`);
  console.log('  t | contract P / gap_cents        | faulty P / gap_cents');
  a.years.forEach((y, k) => { const z = b.years[k]; console.log(`  ${y.t} | ${y.income_by_source_cents['src-1']} / ${y.gap_cents}`.padEnd(36) + `| ${z.income_by_source_cents['src-1']} / ${z.gap_cents}`); });
  console.log(`  clip contract ${a.clip.selected} vs faulty ${b.clip.selected}`);
  res[name] = { input: d, contract: a, faulty: b };
}
fs.writeFileSync('out/demo_unpinned_inputs.json', JSON.stringify(Object.values(res).map((r) => r.input)));
fs.writeFileSync('out/demo_unpinned.json', JSON.stringify(res, null, 1));
