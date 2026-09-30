"""A6 independent check: validate every example against its schema, print first error for invalid ones."""
import json, sys, pathlib
from jsonschema import Draft202012Validator
C = pathlib.Path('/home/user/bill/.orchestration/contracts')
SCHEMAS = {
 'event-envelope': 'event-envelope.schema.json',
 'delivery-job': 'delivery-job.schema.json',
 'feature-flags': 'feature-flags.json',
 'offer-matrix': 'offer-matrix.json',
 'asset-manifest': 'asset-manifest.schema.json',
 'worker-handoff': 'worker-handoff.schema.json',
 'workshop-inputs': 'workshop-inputs.schema.json',
}
bad = 0
for name, sf in SCHEMAS.items():
    schema = json.loads((C/sf).read_text())
    Draft202012Validator.check_schema(schema)
    v = Draft202012Validator(schema)
    for kind in ('valid','invalid'):
        d = C/'examples'/kind/name
        for f in sorted(d.glob('*.json')):
            doc = json.loads(f.read_text())
            errs = sorted(v.iter_errors(doc), key=lambda e: list(e.absolute_path))
            if kind == 'valid':
                st = 'OK ' if not errs else 'BAD'
                if errs: bad += 1
                print(f'{st} valid   {name}/{f.name}' + ('' if not errs else f'  -> {errs[0].message[:120]}'))
            else:
                st = 'OK ' if errs else 'BAD'
                if not errs: bad += 1
                e = errs[0] if errs else None
                loc = '/'.join(str(p) for p in e.absolute_path) if e else ''
                print(f'{st} invalid {name}/{f.name}  n_err={len(errs)}' + (f'  first=[{loc}] {e.validator}: {e.message[:110]}' if e else '  (ACCEPTED!)'))
print('unexpected:', bad)
sys.exit(1 if bad else 0)
