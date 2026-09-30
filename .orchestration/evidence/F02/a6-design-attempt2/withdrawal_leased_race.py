#!/usr/bin/env python3
"""A6 attempt-2: op_record_withdrawal (operational-data-model.md s4: 'suppresses pending and leased
promotional jobs') versus job-state-machine.md s3 (T3 covers pending/retry_due only; T5 leased->suppressed
only by op_prepare_send before send_started_at; T11 sends a started call to reconcile_required).
Shows that the job schema accepts the record the data-model reading produces: a promotional job
'suppressed' by consent_withdrawn although send_started_at is set and attempt_count is 1, i.e. a provider
call may already have been made. Read-only."""
import json, copy, pathlib, re
from jsonschema import Draft202012Validator
C = pathlib.Path('/home/user/bill/.orchestration/contracts')
V = Draft202012Validator(json.load(open(C/'delivery-job.schema.json')))
cands = sorted((C/'examples/valid/delivery-job').glob('*.json'), key=lambda f: (not f.name.startswith('retry-due-e04'), f.name))
leased = None
for f in cands:
    d = json.load(open(f))
    if d['status'] == 'leased' and d['message_class'] == 'promotional':
        leased = (f.name, d); break
if leased is None:
    for f in cands:
        d = json.load(open(f))
        if d['message_class'] == 'promotional': leased = (f.name, d); break
name, d = leased
print('base example:', name, 'status', d['status'], 'class', d['message_class'])
j = copy.deepcopy(d)
j['status'] = 'suppressed'; j['suppression_reason'] = 'consent_withdrawn'
for k in ('lease','provider_message_id','sent_at','completed_at','delivery_status','next_attempt_at','defer_reason','last_error'):
    j.pop(k, None)
j['send_started_at'] = j.get('updated_at'); j['attempt_count'] = max(1, j.get('attempt_count', 0))
if j['message_class'] != 'promotional':
    print('NOTE: base job is operational; the shape question is the same')
errs = list(V.iter_errors(j))
print('suppressed job with send_started_at set and attempt_count', j['attempt_count'], '->', 'rejected: ' + errs[0].message if errs else 'ACCEPTED by delivery-job 1.0')
jsm = (C/'job-state-machine.md').read_text(); odm = (C/'operational-data-model.md').read_text(); am = (C/'authority-matrix.md').read_text()
print('\njob-state-machine.md T3:', [l for l in jsm.splitlines() if l.startswith('| T3 ')][0])
print('job-state-machine.md T5:', [l for l in jsm.splitlines() if l.startswith('| T5 ')][0])
print('job-state-machine.md rule:', [l for l in jsm.splitlines() if 'Any transition not in this table is forbidden' in l][0][:200])
print('operational-data-model.md:', [l for l in odm.splitlines() if l.startswith('| `op_record_withdrawal')][0])
print('authority-matrix.md:', [l for l in am.splitlines() if 'AM-CONSENT-2' in l][0][:200])
