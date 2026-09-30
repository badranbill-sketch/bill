"""A6 design attempt 3: independent re-validation of every contract example.
Read-only. Validates each examples/{valid,invalid}/<contract>/*.json against its schema with
jsonschema Draft 2020-12 in two modes: (1) plain jsonschema (Python re), (2) an ECMA-like
format checker where every 'pattern' is applied with re.fullmatch semantics on the pattern
body with a trailing '$' made strict (\\Z). Prints per-file outcome and the .why.txt first line
for invalid examples that are schema-valid (harness-only rules)."""
import json, pathlib, re, sys, copy
import jsonschema
from jsonschema import Draft202012Validator, validators

C = pathlib.Path('/home/user/bill/.orchestration/contracts')
SCHEMAS = {
    'event-envelope': 'event-envelope.schema.json',
    'delivery-job': 'delivery-job.schema.json',
    'feature-flags': 'feature-flags.json',
    'offer-matrix': 'offer-matrix.json',
    'asset-manifest': 'asset-manifest.schema.json',
    'worker-handoff': 'worker-handoff.schema.json',
    'workshop-inputs': 'workshop-inputs.schema.json',
}

def strict_pattern(validator, pattern, instance, schema):
    if not isinstance(instance, str):
        return
    p = pattern
    # ECMA: '$' only at end of input. Replace an unescaped trailing $ with \Z.
    if p.endswith('$') and not p.endswith('\\$'):
        p = p[:-1] + r'\Z'
    p = re.sub(r'(?<!\\)\$\)', r'\\Z)', p)  # '$)' inside alternations
    if not re.search(p, instance):
        yield jsonschema.ValidationError(f"{instance!r} does not match strict {pattern!r}")

Strict = validators.extend(Draft202012Validator, {'pattern': strict_pattern})

tot = {'valid_ok':0,'valid_bad':0,'invalid_rejected':0,'invalid_accepted':0,'strict_diff':0}
for contract, sf in SCHEMAS.items():
    schema = json.loads((C/sf).read_text())
    Draft202012Validator.check_schema(schema)
    plain = Draft202012Validator(schema)
    strict = Strict(schema)
    for kind in ('valid','invalid'):
        d = C/'examples'/kind/contract
        for f in sorted(d.glob('*.json')):
            inst = json.loads(f.read_text())
            pe = sorted(plain.iter_errors(inst), key=lambda e: list(e.absolute_path))
            se = sorted(strict.iter_errors(inst), key=lambda e: list(e.absolute_path))
            if bool(pe) != bool(se):
                tot['strict_diff'] += 1
                print(f"STRICT-DIFF {kind}/{contract}/{f.name}: plain_errors={len(pe)} strict_errors={len(se)}")
            if kind == 'valid':
                if pe or se:
                    tot['valid_bad'] += 1
                    print(f"FAIL valid/{contract}/{f.name}: {(pe or se)[0].message[:200]}")
                else:
                    tot['valid_ok'] += 1
            else:
                why = f.with_suffix('').with_suffix('.why.txt') if False else f.parent/(f.stem+'.why.txt')
                wl = why.read_text().strip().splitlines()[0][:160] if why.exists() else 'NO .why.txt'
                if pe or se:
                    tot['invalid_rejected'] += 1
                    e = (pe or se)[0]
                    print(f"ok   invalid/{contract}/{f.name}: rejected at /{'/'.join(map(str,e.absolute_path))}: {e.message[:120]}")
                else:
                    tot['invalid_accepted'] += 1
                    print(f"NOTE invalid/{contract}/{f.name}: SCHEMA-VALID (harness rule) why: {wl}")
print(json.dumps(tot))
