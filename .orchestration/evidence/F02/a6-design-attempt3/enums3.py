"""A6 attempt 3: independent cross-contract enum spot checks (read-only)."""
import json, re, pathlib
C = pathlib.Path('/home/user/bill/.orchestration/contracts')
J = lambda p: json.loads((C/p).read_text())
env, job, reg, ff = J('event-envelope.schema.json'), J('delivery-job.schema.json'), J('email-eligibility.json'), J('feature-flags.json')
md = {p.name: p.read_text() for p in C.glob('*.md')}
src = set(env['$defs']['source']['enum'])
used = set()
for name, t in md.items():
    used |= set(re.findall(r'`((?:site|provider|operator|editorial|system)\.[a-z_]+)`', t))
print('source codes used in md but not in envelope enum:', sorted(used - src))
print('envelope sources never mentioned in any md:', sorted(src - used))
js = set(job['properties']['suppression_reason']['enum']); rs = set(reg['suppression_codes'])
print('suppression codes job==registry:', js == rs, sorted(js ^ rs))
per_t = set(c for t in reg['templates'] for c in t['suppressions']) | set(c for t in reg['templates'] for c in t.get('alternate_class', {}).get('additional_suppressions', []))
print('registry codes never used by any template:', sorted(rs - per_t))
jd = set(job['properties']['defer_reason']['enum'])
print('defer reasons in job schema:', sorted(jd), '| in state machine text:', all(d in md['job-state-machine.md'] for d in jd))
errs = set(job['properties']['last_error']['properties']['code']['enum'])
print('error codes all in state machine §8:', all(e in md['job-state-machine.md'] for e in errs))
caps = ff.get('properties', {}).get('capabilities', {}).get('properties', {})
regcaps = {t['capability'] for t in reg['templates']}
print('registry capabilities all defined in feature-flags:', regcaps <= set(caps) if caps else 'n/a', sorted(regcaps - set(caps)) if caps else '')
ops = set(re.findall(r'`(op_[a-z_]+)', ' '.join(md.values())))
defined = set(re.findall(r'^\| `(op_[a-z_]+)\(', md['operational-data-model.md'], re.M)) | set(re.findall(r'`(op_[a-z_]+)\(\)`', md['operational-data-model.md']))
print('op_* named anywhere but not defined in data model s4:', sorted(ops - defined))
print('booking status values:', re.search(r"status\s+text not null,\s+-- ('confirmed'[^\n]*)", md['operational-data-model.md']).group(1))
for s in ('rescheduled', 'no_show_recorded'):
    writers = [n for n, t in md.items() if n != 'operational-data-model.md' and s in t]
    print(f"  '{s}' mentioned outside the data model in: {writers}")
