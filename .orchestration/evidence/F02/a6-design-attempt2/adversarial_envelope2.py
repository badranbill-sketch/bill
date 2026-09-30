#!/usr/bin/env python3
"""A6 attempt-2: new adversarial event-envelope instances (not those of attempt 1).
Read-only. Each case states what the contract claims and whether the schema agrees.
Also compares Python `re` pattern semantics against ECMA-262 for trailing newlines."""
import json, copy, re, pathlib
from jsonschema import Draft202012Validator

C = pathlib.Path('/home/user/bill/.orchestration/contracts')
S = json.load(open(C/'event-envelope.schema.json'))
V = Draft202012Validator(S)
ex = lambda n: json.load(open(C/'examples/valid/event-envelope'/n))
WC = ex('workshop-completed.json')
GR = ex('guide-requested.json')
CP = ex('content-published.json')
DF = ex('delivery-failed.json')
JC = ex('webinar-join_clicked.json')
MO = ex('marketing-opted_in.json')

def case(cid, desc, doc, expect):
    errs = list(V.iter_errors(doc))
    got = 'rejected' if errs else 'accepted'
    flag = 'as-expected' if got == expect else 'UNEXPECTED'
    msg = (errs[0].message[:110] if errs else '')
    print(f'{cid:8} {got:8} expect={expect:8} {flag:11} {desc}\n         value: {json.dumps({k: doc.get(k) for k in ("type","source","subject_id","resource_id","occurred_at","consent_reference")})}\n         {msg}')

def mod(base, **kw):
    d = copy.deepcopy(base)
    for k, v in kw.items():
        if v is None: d.pop(k, None)
        else: d[k] = v
    return d

print('== New adversarial instances (A6 attempt 2) ==')
# 1. Readable amount in the sub-second part of occurred_at on workshop.completed
case('ADV2-1a', 'workshop.completed: savings canary 386152 in occurred_at microseconds',
     mod(WC, occurred_at='2026-10-03T13:40:00.386152Z'), 'accepted')
case('ADV2-1b', 'workshop.completed: retirement age 62 + gap 57804 in seconds/fraction (HH:MM:SS = 00:00:62 invalid, so use fraction)',
     mod(WC, occurred_at='2026-10-03T13:40:00.062578Z'), 'accepted')
# 2. Trailing newline: Python re `$` matches before a final \n; ECMA-262 `$` does not
case('ADV2-2a', 'trailing \\n after a registered-looking workshop code (Python re vs ECMA)',
     mod(WC, resource_id=WC['resource_id'] + '\n'), 'rejected')
case('ADV2-2b', 'trailing \\n after occurred_at',
     mod(WC, occurred_at=WC['occurred_at'] + '\n'), 'rejected')
case('ADV2-2c', 'trailing \\n after idempotency_key (maxLength 68 is exact)',
     mod(WC, idempotency_key=WC['idempotency_key'] + '\n'), 'rejected')
case('ADV2-2d', 'trailing \\n after a webinar entity id resource (maxLength 120)',
     mod(JC, resource_id=JC['resource_id'] + '\n'), 'rejected')
# 3. Cross-type resource and subject confusion
case('ADV2-3a', 'workshop.completed carrying a consent-wording code instead of a workshop code',
     mod(WC, resource_id='consent.workshop-followup.h0123456789ab'), 'rejected')
case('ADV2-3b', 'workshop.completed carrying a content code clip.w07 (selected clip) as resource',
     mod(WC, resource_id='clip.w07.h0123456789ab'), 'rejected')
case('ADV2-3c', 'content.published about a visitor: con_ subject with a content code',
     mod(CP, subject_id=WC['subject_id']), 'rejected')
case('ADV2-3d', 'guide.requested with a content-kind guide code (guide.<words>.v65) that content events allow',
     mod(GR, resource_id='guide.retirement-guide.v65'), 'rejected')
case('ADV2-3e', 'delivery.failed with a con_ subject (visitor-subject failure record)',
     mod(DF, subject_id=WC['subject_id']), 'rejected')
case('ADV2-3f', 'webinar.join_clicked asserted by operator.reconciliation (click must stay a click)',
     mod(JC, source='operator.reconciliation'), 'rejected')
case('ADV2-3g', 'consent_reference null on guide.requested (forbidden means any value)',
     mod(GR, consent_reference=None) | {'consent_reference': None}, 'rejected')
case('ADV2-3h', 'marketing.opted_in with a workshop code as consent wording',
     mod(MO, resource_id='workshop.retirement-workshop.h0123456789ab'), 'rejected')
case('ADV2-3i', 'workshop.completed with uppercase hex version (case channel)',
     mod(WC, resource_id='workshop.retirement-workshop.hABCDEF012345'), 'rejected')
case('ADV2-3j', 'workshop.completed with fullwidth digits in version',
     mod(WC, resource_id='workshop.retirement-workshop.h０123456789ab'), 'rejected')
case('ADV2-3k', 'workshop.completed with an age-bearing subject id (Crockford allows digits and letters: con_age62cad850000...)',
     mod(WC, subject_id='con_age62cad850000' + 'x'*12), 'accepted')

print('\n== Pattern-engine check: Python re.search vs ECMA-262 end anchor ==')
pat = S['$defs']['resource_workshop_version']['pattern']
print('pattern:', pat)
print('python re.search on value+"\\n":', bool(re.search(pat, WC['resource_id'] + '\n')))
print('python re.fullmatch-equivalent (\\Z) on value+"\\n":', bool(re.search(pat[:-1] + r'\Z', WC['resource_id'] + '\n')))
print('ECMA-262: "$" without the m flag matches only at end of input, so value+"\\n" fails there (a Node/ajv check would reject).')
