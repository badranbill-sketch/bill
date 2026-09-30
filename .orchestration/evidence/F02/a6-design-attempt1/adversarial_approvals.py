"""A6: agent/operator roles attempting to record approvals; code_ready recorded by a human; handoff self-accepting."""
import json, pathlib, copy
from jsonschema import Draft202012Validator
C = pathlib.Path('/home/user/bill/.orchestration/contracts')
V = lambda n: Draft202012Validator(json.loads((C/n).read_text()))
ff, am, om, wh = V('feature-flags.json'), V('asset-manifest.schema.json'), V('offer-matrix.json'), V('worker-handoff.schema.json')
def run(name, v, d):
    e = list(v.iter_errors(d)); print(f"{'REJECTED' if e else 'ACCEPTED'}  {name}" + (f"  <- {e[0].message[:90]}" if e else ''))
st = json.loads((C/'examples/valid/feature-flags/staging-guide-delivery-allowlist-test.json').read_text())
for who in ('operator', 'A6', 'A0', 'claude'):
    d = copy.deepcopy(st); d['capabilities']['guide_request_delivery']['approved']['recorded_by'] = who; run(f'FF approved.recorded_by={who}', ff, d)
d = copy.deepcopy(st); d['capabilities']['guide_request_delivery']['approved']['scope_hashes'] = []; run('FF approved true with no scope hash', ff, d)
d = copy.deepcopy(st); d['capabilities']['guide_request_delivery']['approved']['gate_refs'] = ['G7']; run('FF approved gate G7', ff, d)
fx = json.loads(next((C/'examples/valid/asset-manifest').glob('fixture*.json')).read_text())
idx = next(i for i,a in enumerate(fx['assets']) if a.get('approval'))
for roles in (['A0'], ['operator'], ['bill','A6']):
    d = copy.deepcopy(fx); d['assets'][idx]['approval']['approved_by_roles'] = roles; run(f'AM approved_by_roles={roles}', am, d)
f = json.loads((C/'examples/valid/offer-matrix/fixture-all-gates-recorded-fictional.json').read_text())
for who in ('A0','operator'):
    d = copy.deepcopy(f); d['gate_records'][0]['recorded_by_role'] = who; run(f'OM gate_records[0].recorded_by_role={who}', om, d)
h = json.loads(next((C/'examples/valid/worker-handoff').glob('*.json')).read_text())
d = copy.deepcopy(h); d['status'] = 'accepted'; run('handoff status=accepted', wh, d)
d = copy.deepcopy(h); d['tests'][0]['environment'] = 'live'; run('handoff test environment=live (not in vocabulary)', wh, d)
d = copy.deepcopy(h); d['blocked_checks'] = [{'check':'WK04','status':'pass','reason':'x'}]; run('handoff blocked_checks status=pass', wh, d)
