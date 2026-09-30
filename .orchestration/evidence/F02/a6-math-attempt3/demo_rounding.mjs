import { evaluate } from './model.mjs';
import { evaluate as evalF } from './model_faults.mjs';
const base = (spending, sources, i) => ({ contract: 'workshop-inputs', contract_version: '1.0', currency: 'CAD', base_year: 2026,
  chapters: { life: { spending: { amount: { status: 'estimated', value: spending }, period: 'annual', tax_basis: 'after_tax', price_basis: 'today_dollars', unit: 'household' } },
    income: { coverage: 'all_known_sources_listed', sources }, savings: {},
    timing: { current_age: { status: 'estimated', value: 70 }, retirement_age: { status: 'estimated', value: 70 }, planning_horizon_years: { status: 'estimated', value: 3 }, inflation_bp: { status: 'estimated', value: i } } } });
const s = (id, v, q) => ({ id, kind: 'annuity', owner: 'self', amount: { status: 'estimated', value: v }, period: 'annual', tax_basis: 'net', price_basis: 'start_year_dollars', start: { reference: 'already_receiving' }, escalation_bp: { status: 'estimated', value: q }, dependability: 'scheduled' });
const A = base(1000050, [s('src-1', 1000050, 100), s('src-2', 1000050, 100)], 100);
const B = base(2000001, [s('src-1', 1000077, 0)], 150);
const a = evaluate(A).years[1], af = evalF(A, new Set(['group_from_rounded_rows'])).years[1];
console.log(`Demo A t=1: per-source ${JSON.stringify(a.income_by_source_cents)}; income_net_cents conformant ${a.income_net_cents} vs rounded-rows fault ${af.income_net_cents}`);
const b = evaluate(B).years[2], bf = evalF(B, new Set(['deflate_rounded_gap'])).years[2];
console.log(`Demo B t=2: exact gap ${b.exact.gap}; gap_today_dollars_cents conformant ${b.gap_today_dollars_cents} vs deflate-rounded fault ${bf.gap_today_dollars_cents}`);
