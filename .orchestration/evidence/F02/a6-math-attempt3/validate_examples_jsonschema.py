"""Validate workshop-inputs examples and all fixture inputs with Python jsonschema 4.26
(Draft202012Validator, format-agnostic), independent of evidence/F02/math/validate.py.
Semantic XF-04..06 re-implemented here in ~20 lines (not imported)."""
import json, os, sys, glob, re
from importlib.metadata import version
import jsonschema
from jsonschema import Draft202012Validator

ROOT = '/home/user/bill/.orchestration/contracts'
schema = json.load(open(f'{ROOT}/workshop-inputs.schema.json'))
Draft202012Validator.check_schema(schema)
print(f'jsonschema {version("jsonschema")}: metaschema check OK')
V = Draft202012Validator(schema)

def known(q): return q is not None and q['status'] in ('zero', 'estimated', 'confirmed')
def semantic(doc):
    errs = []; ch = doc['chapters']; tim = ch['timing']
    A = tim['current_age']['value'] if known(tim['current_age']) else None
    hh = tim.get('household'); pA = hh['partner_current_age']['value'] if hh and known(hh['partner_current_age']) else None
    seen = set()
    for k, s in enumerate(ch['income']['sources']):
        oa = pA if s['owner'] == 'partner' else A
        def res(b, is_start):
            if b is None: return ('absent', None)
            if is_start and b['reference'] == 'already_receiving': return ('res', 0)
            if b['point']['status'] == 'unknown': return ('unk', None)
            if b['reference'] == 'year_index': return ('res', b['point']['value'])
            return ('res', b['point']['value'] - oa) if oa is not None else ('unres', None)
        st = res(s['start'], True); en = res(s.get('end'), False)
        if s['start']['reference'] == 'age' and s['start']['point']['status'] != 'unknown' and oa is not None and s['start']['point']['value'] < oa:
            errs.append(('XF-04', f'/chapters/income/sources/{k}/start/point/value'))
        if st[0] == 'res' and en[0] == 'res' and not en[1] > st[1]:
            errs.append(('XF-05', f'/chapters/income/sources/{k}/end'))
        if s['id'] in seen: errs.append(('XF-06', f'/chapters/income/sources/{k}/id'))
        seen.add(s['id'])
    return errs

def ptr(e): return '/' + '/'.join(str(p) for p in e.absolute_path) if e.absolute_path else ''
def why(path):
    o = {}
    for line in open(path):
        m = re.match(r'^([a-z_]+):\s?(.*)$', line.rstrip('\n'))
        if m: o[m.group(1)] = m.group(2)
    return o

bad = 0
for f in sorted(glob.glob(f'{ROOT}/examples/valid/workshop-inputs/*.json')):
    d = json.load(open(f)); errs = list(V.iter_errors(d)); sem = semantic(d)
    print(f'VALID {os.path.basename(f)} schema_errors={len(errs)} semantic={sem}')
    bad += bool(errs or sem)
results = []
for f in sorted(glob.glob(f'{ROOT}/examples/invalid/workshop-inputs/*.json')):
    w = why(f[:-5] + '.why.txt'); txt = open(f).read()
    try:
        d = json.loads(txt, parse_constant=lambda c: (_ for _ in ()).throw(ValueError('strict: ' + c))); strict = True
    except ValueError as ex:
        strict = False; d = json.loads(txt)  # Python's lenient default admits NaN/Infinity
    errs = list(V.iter_errors(d))
    # flatten: leaf errors including those under allOf/if-then context
    leaves = []
    def walk(e):
        if e.context:
            for c in e.context: walk(c)
        leaves.append(e)
    for e in errs: walk(e)
    sem = semantic(d) if not errs else []
    if w['layer'] == 'semantic':
        ok = (not errs) and sem == [(w['expect_rule'], w['expect_path'])]
        detail = f'schema_errors={len(errs)} semantic={sem}'
    elif w['layer'] == 'json-parse':
        kws = sorted({e.validator for e in leaves if ptr(e) == w['also_schema_path']})
        ok = (not strict) and bool(errs) and w['also_schema_keyword'] in kws
        detail = f'strict_rejected={not strict}; keywords at path={kws}; counts={[e.validator for e in leaves if ptr(e)==w["also_schema_path"]]}'
    else:
        hits = [e for e in leaves if e.validator == w['expect_keyword'] and ptr(e) == (w.get('expect_path') or '')]
        vok = True
        if 'expect_validator_value' in w and hits:
            ev = json.loads(w['expect_validator_value'])
            vok = any(e.validator_value == ev for e in hits)
        mok = True
        if 'expect_message_contains' in w:
            needle = w['expect_message_contains'].strip("'")
            mok = any(needle in e.message for e in hits)
        others = sorted({f'{ptr(e)}:{e.validator}' for e in leaves if not (e.validator == w['expect_keyword'] and ptr(e) == (w.get('expect_path') or '')) and e.validator not in ('allOf', '$ref', 'properties', 'then', 'if')})
        ok = bool(errs) and bool(hits) and vok and mok
        detail = f'hits={len(hits)} value_ok={vok} msg_ok={mok} other_leaf_errors={others}'
    bad += not ok
    results.append({'file': os.path.basename(f), 'rule': w['rule'], 'ok': ok, 'detail': detail})
    print(f"INVALID {'OK' if ok else 'MISMATCH'} {os.path.basename(f)} [{w['rule']}] {detail}")

# every fixture input + clip-rules input must validate
FIX = f'{ROOT}/fixtures/workshop'
n = 0
for f in sorted(glob.glob(f'{FIX}/WM*.json')):
    d = json.load(open(f))['input']; errs = list(V.iter_errors(d)); sem = semantic(d); n += 1
    if errs or sem: bad += 1; print('FIXTURE INPUT INVALID', f, [e.message for e in errs][:3], sem)
cr = json.load(open(f'{FIX}/clip-rules.json'))
for r in cr['truth_table'] + cr['supplementary_cases']:
    if r.get('input') is None: continue
    errs = list(V.iter_errors(r['input'])); sem = semantic(r['input']); n += 1
    if errs or sem: bad += 1; print('CLIP INPUT INVALID', r.get('row', r.get('case')), [e.message for e in errs][:3], sem)
print(f'fixture+clip inputs validated: {n}')
os.makedirs('out', exist_ok=True)
json.dump(results, open('out/invalid_examples_jsonschema.json', 'w'), indent=1)
print('ALL EXAMPLES BEHAVE AS STATED (jsonschema)' if not bad else f'{bad} problems')
sys.exit(1 if bad else 0)
