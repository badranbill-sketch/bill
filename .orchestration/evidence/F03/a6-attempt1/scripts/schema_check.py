import json, sys
from jsonschema import Draft202012Validator, FormatChecker
s=json.load(open('/home/user/bill/.orchestration/contracts/worker-handoff.schema.json'))
Draft202012Validator.check_schema(s)
h=json.load(open('/home/user/bill/.orchestration/handoffs/F03.json'))
v=Draft202012Validator(s, format_checker=FormatChecker())
errs=sorted(v.iter_errors(h), key=lambda e: list(e.path))
print('schema $id:', s.get('$id'), 'task_id pattern:', s['properties']['task_id'].get('pattern'))
print('errors:', len(errs))
for e in errs: print(' -', list(e.path), e.message[:300])
sys.exit(1 if errs else 0)
