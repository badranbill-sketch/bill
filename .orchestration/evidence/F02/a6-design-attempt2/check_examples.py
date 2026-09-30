#!/usr/bin/env python3
"""A6 attempt-2 independent example check. Read-only. Written by A6, not the F02 lanes.
Validates every valid example (must pass) and every invalid example (must fail, or its
.why.txt must name a non-schema harness rule). Uses jsonschema Draft 2020-12 only."""
import json, sys, pathlib
from jsonschema import Draft202012Validator, FormatChecker

C = pathlib.Path('/home/user/bill/.orchestration/contracts')
MAP = {
  'asset-manifest': 'asset-manifest.schema.json',
  'delivery-job': 'delivery-job.schema.json',
  'event-envelope': 'event-envelope.schema.json',
  'feature-flags': 'feature-flags.json',
  'offer-matrix': 'offer-matrix.json',
  'worker-handoff': 'worker-handoff.schema.json',
  'workshop-inputs': 'workshop-inputs.schema.json',
}
tot = {'valid_ok':0,'valid_bad':0,'invalid_rej':0,'invalid_acc':0}
acc_list = []
for name, sch in MAP.items():
    schema = json.load(open(C/sch))
    Draft202012Validator.check_schema(schema)
    v = Draft202012Validator(schema, format_checker=FormatChecker())
    for f in sorted((C/'examples/valid'/name).glob('*.json')):
        errs = list(v.iter_errors(json.load(open(f))))
        if errs:
            tot['valid_bad'] += 1
            print(f'VALID-FAILS  {name}/{f.name}: {errs[0].message[:160]}')
        else:
            tot['valid_ok'] += 1
    for f in sorted((C/'examples/invalid'/name).glob('*.json')):
        why = f.with_suffix('.why.txt')
        whyt = why.read_text() if why.exists() else '(no .why.txt)'
        errs = list(v.iter_errors(json.load(open(f))))
        if errs:
            tot['invalid_rej'] += 1
            print(f'rejected     {name}/{f.name}: {errs[0].message[:120]}')
        else:
            tot['invalid_acc'] += 1
            acc_list.append(f'{name}/{f.name}')
            print(f'SCHEMA-ACCEPTS {name}/{f.name}\n    why: ' + ' | '.join(whyt.strip().splitlines())[:400])
print('\nTOTALS', tot)
print('schema-accepted invalid examples (must each name a harness rule):', acc_list)
