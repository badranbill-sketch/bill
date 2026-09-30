#!/usr/bin/env python3
"""A6 attempt-2: new adversarial offer-matrix instances (different from attempt 1's O-1..O-9).
Read-only. Base documents are the valid authoritative instance and the fictional all-gates fixture."""
import json, copy, pathlib
from jsonschema import Draft202012Validator
C = pathlib.Path('/home/user/bill/.orchestration/contracts')
V = Draft202012Validator(json.load(open(C/'offer-matrix.json')))
A = json.load(open(C/'examples/valid/offer-matrix/authoritative-2026-09-30.json'))
F = json.load(open(C/'examples/valid/offer-matrix/fixture-all-gates-recorded-fictional.json'))
assert not list(V.iter_errors(A)) and not list(V.iter_errors(F))
def case(cid, desc, doc, expect):
    errs = list(V.iter_errors(doc)); got = 'rejected' if errs else 'accepted'
    print(f"{cid:6} {got:8} expect={expect:8} {'as-expected' if got==expect else 'UNEXPECTED'}  {desc}\n       {errs[0].message[:150] if errs else ''}")
def m(base, fn):
    d = copy.deepcopy(base); fn(d); return d
bb = lambda d: d['offers']['book-bundle']
print('fixture price as recorded:', json.dumps(bb(F)['price']))
case('O2-1', 'second 30-minute consultation via count 2 (book includes ONE consultation)',
     m(A, lambda d: bb(d)['included_consultation'].__setitem__('count', 2)), 'rejected')
case('O2-2', 'duration 30 kept but a sibling extra_minutes 30 added (60 total by stealth)',
     m(A, lambda d: bb(d)['included_consultation'].__setitem__('extra_minutes', 30)), 'rejected')
case('O2-3', 'third meeting type book-consultation-60 added to meeting_types',
     m(A, lambda d: d['meeting_types'].__setitem__('book-consultation-60', dict(d['meeting_types']['book-consultation-30'], duration_minutes=60))), 'rejected')
case('O2-4', 'duration_minutes written as 30.0 (numeric equality, not an invented value)',
     m(A, lambda d: bb(d)['included_consultation'].__setitem__('duration_minutes', 30.0)), 'accepted')
case('O2-5', 'recorded price amount_minor 0 (a free book presented as recorded)',
     m(F, lambda d: bb(d)['price'].__setitem__('value', {'amount_minor': 0, 'currency': bb(F)['price']['value']['currency']})), 'rejected')
case('O2-6', 'recorded price as float 49.95 in major units',
     m(F, lambda d: bb(d)['price'].__setitem__('value', {'amount_minor': 49.95, 'currency': bb(F)['price']['value']['currency']})), 'rejected')
case('O2-7', 'fixture document citing a real decisions.md row (fixture values passing as real)',
     m(F, lambda d: d['gate_records'][0].__setitem__('record_ref', '.orchestration/decisions.md#D-032')), 'rejected')
case('O2-8', 'authoritative document with price pending but a price hint in an added note field',
     m(A, lambda d: bb(d)['price'].__setitem__('note', 'about 49.95 CAD')), 'rejected')
case('O2-9', 'consultation validity expressed in minutes (60) instead of days or months',
     m(F, lambda d: bb(d)['included_consultation']['validity'].__setitem__('value', {'unit': 'minutes', 'count': 60})), 'rejected')
case('O2-10', 'intro-15 question_limit raised to 3',
     m(A, lambda d: d['offers']['intro-15'].__setitem__('question_limit', 3)), 'rejected')
case('O2-11', 'continued-work given a price model paid with a value',
     m(A, lambda d: d['offers']['continued-work'].__setitem__('price', {'model': 'paid', 'status': 'pending', 'value': None, 'approvals': []})), 'rejected')
case('O2-12', 'online_service recorded as "Zoom Workplace" in the fixture',
     m(F, lambda d: d['offers']['intro-15']['online_service'].__setitem__('value', 'Zoom Workplace')), 'rejected')
