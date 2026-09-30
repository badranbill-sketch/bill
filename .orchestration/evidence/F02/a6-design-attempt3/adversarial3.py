"""A6 design attempt 3: new adversarial instances (none reused from attempts 1-2).
Read-only: mutates in-memory copies of valid examples and validates them against the
contract schemas with jsonschema Draft 2020-12 (plain Python re semantics AND a strict
ECMA-like '$' semantics). Prints expected vs actual for every instance."""
import json, pathlib, re, copy, binascii, hashlib
import jsonschema
from jsonschema import Draft202012Validator, validators

C = pathlib.Path('/home/user/bill/.orchestration/contracts')

def strict_pattern(validator, pattern, instance, schema):
    if not isinstance(instance, str):
        return
    p = pattern
    if p.endswith('$') and not p.endswith('\\$'):
        p = p[:-1] + r'\Z'
    if not re.search(p, instance):
        yield jsonschema.ValidationError(f"{instance!r} does not match {pattern!r}")
Strict = validators.extend(Draft202012Validator, {'pattern': strict_pattern})

def load(p): return json.loads((C/p).read_text())
ENV = load('event-envelope.schema.json'); JOB = load('delivery-job.schema.json'); OFF = load('offer-matrix.json')
V = {k: (Draft202012Validator(s), Strict(s)) for k, s in [('env', ENV), ('job', JOB), ('off', OFF)]}

results = []
def check(id_, kind, inst, expect, note):
    pv, sv = V[kind]
    pe = list(pv.iter_errors(inst)); se = list(sv.iter_errors(inst))
    actual = 'reject' if (pe or se) else 'accept'
    where = ''
    if pe or se:
        e = (pe or se)[0]
        where = f" at /{'/'.join(map(str, e.absolute_path))}: {e.message[:110]}"
    ok = 'AS-EXPECTED' if actual == expect else 'UNEXPECTED'
    print(f"{ok:11} {id_:8} [{kind}] expect={expect} actual={actual}{where}\n            {note}")
    results.append((id_, expect, actual))

base_wc = load('examples/valid/event-envelope/workshop-completed.json')
base_mc = load('examples/valid/event-envelope/meeting-confirmed.json')
base_cp = load('examples/valid/event-envelope/content-published.json')
base_df = load('examples/valid/event-envelope/delivery-failed.json')

# ---- Envelope: PII in idempotency key -------------------------------------------------
e = copy.deepcopy(base_wc)
hexmail = binascii.hexlify(b'jean.tremblay@example.com').decode()
e['idempotency_key'] = 'ik1_' + (hexmail + '0' * 64)[:64]
check('ADV3-01', 'env', e, 'accept',
      f"hex-encoded email {hexmail[:16]}... in idempotency_key: schema cannot tell HMAC from hex; closed only by server-side HMAC construction (event-envelope.md s1 'Browsers never emit envelopes', s4.3)")

e = copy.deepcopy(base_wc)
e['idempotency_key'] = 'ik1_' + hashlib.sha256(b'jean.tremblay@example.com').hexdigest()
check('ADV3-02', 'env', e, 'accept',
      "unkeyed sha256(email) in idempotency_key: schema-valid; the contract requires a keyed HMAC over (type, subject_id, resource_id, origin_ref), never the address")

e = copy.deepcopy(base_wc)
e['idempotency_key'] = 'ik1_' + 'jean.tremblay@example.com'
check('ADV3-03', 'env', e, 'reject', "readable email after the ik1_ prefix")

e = copy.deepcopy(base_wc)
e['idempotency_key'] = 'ik1_' + 'a' * 63 + '​'
check('ADV3-04', 'env', e, 'reject', "63 hex + zero-width space (length 68, passes maxLength)")

e = copy.deepcopy(base_wc)
e['idempotency_key'] = int('1' * 30)
check('ADV3-05', 'env', e, 'reject', "idempotency_key as a JSON number")

# ---- Envelope: amount/field smuggling -------------------------------------------------
e = copy.deepcopy(base_wc)
e['resource_id'] = {'kind': 'workshop', 'savings': 386152}
check('ADV3-06', 'env', e, 'reject', "resource_id as an object carrying an amount")

e = copy.deepcopy(base_wc)
e['idempotency_kеy'] = 'jean.tremblay@example.com'  # Cyrillic e homoglyph property
check('ADV3-07', 'env', e, 'reject', "homoglyph extra property name 'idempotency_k<cyrillic e>y' holding an email")

e = copy.deepcopy(base_wc)
e[''] = 386152
check('ADV3-08', 'env', e, 'reject', "empty-string property name holding an amount")

e = copy.deepcopy(base_wc)
e['resource_id'] = 'page.retirement-workshop.v386'
check('ADV3-09', 'env', e, 'reject', "workshop.completed with a content-form code whose v-number carries 386 (content alternation must not apply to a contact subject)")

e = copy.deepcopy(base_wc)
e['resource_id'] = 'guide.retirement-guide.h' + '0' * 12
check('ADV3-10', 'env', e, 'reject', "workshop.completed with a guide code (kind mismatch)")

e = copy.deepcopy(base_cp)
e['subject_id'] = base_wc['subject_id']; e['source'] = 'site.workshop_completion'
e['resource_id'] = 'article.three-hundred-eighty-six-thousand.v1'
check('ADV3-11', 'env', e, 'reject', "content.published about a contact (con_), from a site source, key spells an amount in words")

e = copy.deepcopy(base_cp)
e['resource_id'] = 'article.savings-gap-shortfall-retire-early.v1'
check('ADV3-12', 'env', e, 'accept', "content.published (cnt_ subject, editorial source) with an editorial slug made of finance words: allowed, it describes an article, not a visitor")

e = copy.deepcopy(base_df)
e['consent_reference'] = base_wc['consent_reference']
check('ADV3-13', 'env', e, 'reject', "consent_reference on delivery.failed")

e = copy.deepcopy(base_mc)
e['subject_id'] = 'cnt_' + base_mc['subject_id'][4:]
check('ADV3-14', 'env', e, 'reject', "meeting.confirmed for an unmatched booking using a cnt_ placeholder subject")

e = copy.deepcopy(base_mc)
e['subject_id'] = 'con_' + '0' * 26
check('ADV3-15', 'env', e, 'accept', "meeting.confirmed with an all-zero placeholder con_ subject: schema-valid; forbidden by runtime rule EV-BOOK-1 ('never uses a placeholder contact')")

e = copy.deepcopy(base_mc)
e['source'] = 'site.join_redirect'
check('ADV3-16', 'env', e, 'reject', "meeting.confirmed from a click source")

e = copy.deepcopy(base_wc)
e['type'] = ['workshop.completed']
check('ADV3-17', 'env', e, 'reject', "type as an array (per-type if/then evasion)")

e = copy.deepcopy(base_wc); del e['type']
check('ADV3-18', 'env', e, 'reject', "type omitted (no per-type then applies)")

e = copy.deepcopy(base_wc)
e['subject_id'] = e['subject_id'].upper().replace('CON_', 'con_')
check('ADV3-19', 'env', e, 'reject', "uppercase Crockford in subject_id")

e = copy.deepcopy(base_wc)
e['occurred_at'] = '2026-10-03T13:40:00+00:00'
check('ADV3-20', 'env', e, 'reject', "+00:00 offset instead of Z")

# ---- Delivery job ---------------------------------------------------------------------
jobs = {p.stem: json.loads(p.read_text()) for p in (C/'examples/valid/delivery-job').glob('*.json')}
sent = next(v for k, v in jobs.items() if v['status'] == 'sent')
j = copy.deepcopy(sent); j['provider_message_id'] = 'jean.tremblay@example.com'
check('JOB3-01', 'job', j, 'reject', "bare recipient address as provider_message_id")
j = copy.deepcopy(sent); j['provider_message_id'] = '<jean.tremblay@example.com>'
check('JOB3-02', 'job', j, 'accept', "angle-bracketed address as provider_message_id: schema-valid by design (RFC 5322 Message-ID form); PB-SCAN-3 names the runtime test that it never equals the recipient")
j = copy.deepcopy(sent); j['recipient_email'] = 'jean.tremblay@example.com'
check('JOB3-03', 'job', j, 'reject', "added recipient_email field")
j = copy.deepcopy(sent); j['last_error'] = {'code': 'input_rejected', 'at': j['sent_at'], 'body': 'invalid email jean@example.com'}
check('JOB3-04', 'job', j, 'reject', "provider error body inside last_error")
sup = next(v for k, v in jobs.items() if v['status'] == 'suppressed')
j = copy.deepcopy(sup); j['sent_at'] = '2026-10-03T13:40:00Z'
check('JOB3-05', 'job', j, 'reject', "suppressed job carrying sent_at (JS-SUPP-1)")
j = copy.deepcopy(sup); j['send_started_at'] = '2026-10-03T13:40:00Z'
check('JOB3-06', 'job', j, 'reject', "suppressed job carrying send_started_at (A6D2-01 repair)")
rd = next(v for k, v in jobs.items() if v['status'] == 'retry_due')
j = copy.deepcopy(rd); j['send_started_at'] = '2026-10-03T13:40:00Z'
check('JOB3-07', 'job', j, 'reject', "retry_due job carrying send_started_at (T10/T15 clear it)")

# ---- Offer matrix ---------------------------------------------------------------------
auth = load('examples/valid/offer-matrix/authoritative-2026-09-30.json')
fx = load('examples/valid/offer-matrix/fixture-all-gates-recorded-fictional.json')
o = copy.deepcopy(auth); o['offers']['intro-15']['question_limit'] = 2
check('OFF3-01', 'off', o, 'reject', "introduction with two questions")
o = copy.deepcopy(auth); o['offers']['book-bundle']['included_consultation']['duration_minutes'] = '30'
check('OFF3-02', 'off', o, 'reject', "consultation duration as the string '30'")
o = copy.deepcopy(auth); o['offers']['book-bundle']['price'] = {'model': 'free'}
check('OFF3-03', 'off', o, 'reject', "book bundle made free")
o = copy.deepcopy(auth); o['offers']['book-bundle']['included_consultation']['capacity_proposal']['buffer_minutes'] = 60
check('OFF3-04', 'off', o, 'reject', "60-minute buffer smuggled into the capacity proposal const")
o = copy.deepcopy(auth); o['offers']['book-bundle']['cap']['value'] = 8
check('OFF3-05', 'off', o, 'reject', "cap value 8 written while pending (proposal promoted to value)")
o = copy.deepcopy(auth); o['offers']['book-bundle']['price'].update({'value': {'amount_minor': 4995, 'currency': 'CAD'}})
check('OFF3-06', 'off', o, 'reject', "invented price 49.95 CAD while pending (authoritative)")
o = copy.deepcopy(fx); o['offers']['continued-work']['hourly_rate'] = {'amount_minor': 25000, 'currency': 'CAD'}
check('OFF3-07', 'off', o, 'reject', "hourly rate added to continued-work")
o = copy.deepcopy(fx); o['offers']['intro-15']['online_service']['value'] = 'zoom_workplace'
check('OFF3-08', 'off', o, 'reject', "online service key zoom_workplace")
o = copy.deepcopy(fx); o['offers']['book-bundle']['included_consultation']['count'] = 1; o['offers']['book-bundle']['included_consultation']['duration_minutes'] = 60
check('OFF3-09', 'off', o, 'reject', "fixture with the included consultation at 60 minutes")
o = copy.deepcopy(fx); o['meeting_types']['book-consultation-30']['duration_minutes'] = 30.5
check('OFF3-10', 'off', o, 'reject', "meeting type 30.5 minutes")
o = copy.deepcopy(fx); o['offers']['book-bundle']['price']['value']['amount_minor'] = 49.95
check('OFF3-11', 'off', o, 'reject', "price as a decimal 49.95 instead of integer minor units")

print()
print('summary:', sum(1 for r in results if r[1] == r[2]), 'as expected of', len(results))
