"""A6 adversarial offer-matrix instances, mutated from the authoritative instance and the fixture example."""
import json, pathlib, copy, glob
from jsonschema import Draft202012Validator
C = pathlib.Path('/home/user/bill/.orchestration/contracts')
v = Draft202012Validator(json.loads((C/'offer-matrix.json').read_text()))
auth = json.loads((C/'examples/valid/offer-matrix/authoritative-2026-09-30.json').read_text())
fx = [p for p in sorted((C/'examples/valid/offer-matrix').glob('*.json')) if 'authoritative' not in p.name]
print('fixture examples:', [p.name for p in fx])
def run(name, doc):
    errs = list(v.iter_errors(doc))
    print(f"{'REJECTED' if errs else 'ACCEPTED'}  {name}" + (f"  <- {errs[0].validator} at /{'/'.join(map(str,errs[0].absolute_path))}: {errs[0].message[:80]}" if errs else ''))
# O-1 book consultation duration 60 via a second included consultation entry / count 2
d = copy.deepcopy(auth); d['offers']['book-bundle']['included_consultation']['count'] = 2; run('O-1 two included consultations (count=2)', d)
# O-2 add a meeting type 'consultation-60'
d = copy.deepcopy(auth); d['meeting_types']['consultation-60'] = dict(d['meeting_types']['book-consultation-30'], meeting_type_id='consultation-60', duration_minutes=60); run('O-2 extra meeting type of 60 minutes', d)
# O-3 price written as a string on an otherwise pending price (status pending, value '49.95')
d = copy.deepcopy(auth); d['offers']['book-bundle']['price']['value'] = '49.95'; run('O-3 invented price string while pending', d)
# O-4 price hidden inside the disclosure value while pending
d = copy.deepcopy(auth); d['offers']['book-bundle']['prepayment_disclosures']['price'] = {'status':'recorded','value':{'wording_asset_id':'copy.price-forty-nine'},'approvals':[]}; run('O-4 disclosure recorded without approvals', d)
# O-5 continued-work priced
d = copy.deepcopy(auth); d['offers']['continued-work']['price'] = {'model':'paid','status':'recorded','value':{'amount_minor':15000,'currency':'CAD'},'approvals':[{'gate':'G0','record_id':'gr-01'}]}; run('O-5 continued-work given a price', d)
# O-6 intro-15 price paid
d = copy.deepcopy(auth); d['offers']['intro-15']['price'] = {'model':'paid'}; run('O-6 intro-15 made paid', d)
# O-7 recorded price with G0 approval but agent-written record, authoritative
d = copy.deepcopy(auth); d['gate_records']=[{'record_id':'gr-01','gate':'G0','covers':'price','record_ref':'.orchestration/decisions.md#D-099','recorded_by_role':'bill','recorded_on':'2026-09-30'}]
d['offers']['book-bundle']['price'].update(status='recorded', value={'amount_minor':4995,'currency':'CAD'}, approvals=[{'gate':'G0','record_id':'gr-01'}]); run('O-7 recorded price citing non-existent decision D-099 (schema only; CX-16 is harness)', d)
# O-8 duration 60 on intro via string
d = copy.deepcopy(auth); d['offers']['intro-15']['duration_minutes'] = '60'; run('O-8 intro duration "60" as string', d)
# O-9 extra property on book-bundle: one_hour_upgrade
d = copy.deepcopy(auth); d['offers']['book-bundle']['upgrade'] = {'duration_minutes':60}; run('O-9 extra upgrade property with 60 minutes', d)
# O-10 zoom with different case in online_service
d = copy.deepcopy(auth); d['gate_records']=[{'record_id':'gr-02','gate':'G0','covers':'online','record_ref':'.orchestration/decisions.md#D-062','recorded_by_role':'bill','recorded_on':'2026-09-30'}]
d['offers']['intro-15']['online_service'] = {'status':'recorded','value':'ZOOM-meetings','approvals':[{'gate':'G0','record_id':'gr-02'}]}; run('O-10 online_service "ZOOM-meetings" (uppercase)', d)
d['offers']['intro-15']['online_service']['value'] = 'z00m'; run('O-10b online_service "z00m" (lookalike)', d)
