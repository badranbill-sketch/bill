import json, jsonschema, sys
from jsonschema import Draft202012Validator, FormatChecker
s=json.load(open('/home/user/bill/.orchestration/contracts/worker-handoff.schema.json'))
h=json.load(open('/home/user/bill/.orchestration/handoffs/F03.json'))
print('schema $id:', s.get('$id'), '| $schema:', s.get('$schema'), '| version:', s.get('version', s.get('x-contract-version')))
Draft202012Validator.check_schema(s)
v=Draft202012Validator(s, format_checker=FormatChecker())
errs=list(v.iter_errors(h))
for e in errs: print('ERROR', list(e.absolute_path), e.message[:200])
print('errors:', len(errs))
print('task_id pattern:', s['properties']['task_id'].get('pattern'))
sys.exit(1 if errs else 0)
