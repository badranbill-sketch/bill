// Negative controls: inject each fault into model_faults.mjs; report which fixtures catch it.
import fs from 'node:fs';
import path from 'node:path';
import { evaluate } from './model_faults.mjs';
const FIX = '/home/user/bill/.orchestration/contracts/fixtures/workshop';
const fx = fs.readdirSync(FIX).filter((f) => /^WM\d\d-/.test(f)).sort().map((f) => JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8')));
const cr = JSON.parse(fs.readFileSync(path.join(FIX, 'clip-rules.json'), 'utf8'));
const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((kk) => [kk, v[kk]])) : v));
function caught(faults) {
  const hits = [];
  for (const f of fx) { try { const o = JSON.parse(JSON.stringify(evaluate(f.input, faults))); if (canon(o) !== canon(f.expected)) hits.push(f.fixture_id); } catch (e) { hits.push(f.fixture_id + '(throw)'); } }
  for (const r of [...cr.truth_table.filter((x) => x.possible), ...cr.supplementary_cases]) {
    try { const o = evaluate(r.input, faults); const got = { selected: o.clip.selected, selection_reason: o.clip.selection_reason, completeness_state: o.completeness.state, flags: o.flags, ...(r.expected.predicates ? { predicates: o.clip.predicates } : {}) };
      if (canon(got) !== canon(r.expected) || (r.predicates && canon(o.clip.predicates) !== canon(r.predicates))) hits.push(r.case || 'TT' + r.row); } catch (e) { hits.push((r.case || 'TT' + r.row) + '(throw)'); }
  }
  return hits;
}
const base = caught(new Set());
console.log(`baseline (no fault): ${base.length} mismatches ${base.join(',')}`);
const FAULTS = ['half_up', 'float64', 'window_off_by_one', 'spending_unknown_zero', 'coverage_incomplete_as_complete', 'joint_uses_partner', 'income_monthly_no_x12',
  'today_dollars_as_nominal', 'today_dollars_uses_q', 'price_basis_unknown_as_start_year', 'pbu_even_at_zero', 'gross_compared', 'tax_unknown_as_net', 'unknown_first',
  'unknown_start_not_paying', 'unknown_start_already_receiving', 'unresolvable_start_not_paying', 'unknown_end_no_end', 'end_inclusive', 'xf05_inference', 'unknown_amount_zero',
  'escalate_from_zero', 'one_code_per_source', 'groups_as_listed_when_incomplete', 'group_from_rounded_rows', 'surplus_netted', 'deflate_rounded_gap', 'partner_age_null_key',
  'H_by_age', 'home_spendable', 'horizon_flag_known_amount_only', 'horizon_flag_strict', 'uncertain_flag_any', 'employment_uncertain_kind', 'cr_start_of_year_flows',
  'cr_discount_to_base', 'ignore_no_positive_gap', 'ineligible_adds_flags', 'X_before_M', 'F_before_H', 'estimated_triggers_M', 'R_code_only_if_A_known', 'no_global_codes_without_window'];
const rows = [];
for (const f of FAULTS) { const h = caught(new Set([f])); rows.push({ fault: f, caught_by: h }); console.log(`${h.length ? 'CAUGHT ' : 'MISSED '} ${f.padEnd(36)} ${h.slice(0, 12).join(',')}${h.length > 12 ? ` (+${h.length - 12})` : ''}`); }
fs.writeFileSync('out/negative_controls.json', JSON.stringify(rows, null, 1));
