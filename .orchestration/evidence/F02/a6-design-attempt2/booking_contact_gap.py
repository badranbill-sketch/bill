#!/usr/bin/env python3
"""A6 attempt-2: how does a scheduler booking reach a contact? Read-only quote-and-check.
1. The envelope requires a con_ subject on meeting.* and consultation.redeemed.
2. The data model allows bookings.contact_id to be null ('until matched').
3. The privacy register keeps the only matching key (invitee email) out of app_server and Supabase.
4. already_booked suppression (E05, E11) and E15/E16 need the contact."""
import json, copy, pathlib
from jsonschema import Draft202012Validator
C = pathlib.Path('/home/user/bill/.orchestration/contracts')
S = json.load(open(C/'event-envelope.schema.json')); V = Draft202012Validator(S)
mc = json.load(open(C/'examples/valid/event-envelope/meeting-confirmed.json'))
d = copy.deepcopy(mc); d.pop('subject_id')
print('meeting.confirmed without subject_id ->', 'rejected' if list(V.iter_errors(d)) else 'accepted')
d = copy.deepcopy(mc); d['subject_id'] = 'job_' + mc['subject_id'][4:]
print('meeting.confirmed with a non-contact subject ->', 'rejected' if list(V.iter_errors(d)) else 'accepted')
q = lambda f, key: [l.strip() for l in (C/f).read_text().splitlines() if key in l]
print('\noperational-data-model.md:', q('operational-data-model.md', 'null until matched'))
print('privacy-boundary.md:', q('privacy-boundary.md', '| DC-BOOKING-INTAKE'))
print('privacy-boundary.md:', q('privacy-boundary.md', '| PB-CAL-2'))
r = json.load(open(C/'data-flow-register.json'))
print('data-flow-register DC-BOOKING-INTAKE allowed_sinks:', [c['allowed_sinks'] for c in r['data_classes'] if c['id']=='DC-BOOKING-INTAKE'])
print('data-flow-register FL-15 notes:', [f['notes'] for f in r['flows'] if f['id']=='FL-15'])
e = json.load(open(C/'email-eligibility.json'))
print('suppression already_booked:', e['suppression_codes']['already_booked'])
for t in e['templates']:
    if 'already_booked' in t['suppressions'] or t['id'] in ('E15','E16'):
        print(f"  {t['id']} {t['purpose']!r} suppressions={t['suppressions']} resource_ref={t['resource_ref']}")
src = pathlib.Path('/home/user/bill/.orchestration/source/04_CONTRACTS_AND_TESTS.md').read_text()
print('\n04 s6:', [s.strip() for s in src.split('. ') if 'confirmed booking suppresses' in s])
hits = [f.name for f in C.glob('*.md') if 'match' in f.read_text() and ('booking' in f.read_text())]
print('\ncontract text that says how a booking is matched to a contact:',
      [l.strip() for f in C.glob('*.md') for l in f.read_text().splitlines() if 'matched' in l.lower() and 'contact' in l.lower()])
