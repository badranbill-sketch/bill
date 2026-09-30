#!/usr/bin/env python3
"""A6 F02a attempt 3: validate every fixture/clip input against workshop-inputs.schema.json
(Draft 2020-12, jsonschema), check the new fixtures' top-level shape and serialization against
WM01-WM36, and validate the handoff against worker-handoff.schema.json (as submitted, and with
only task_id replaced in memory). Own script; imports nothing from the builder or the lane."""
import hashlib, json, pathlib, sys, glob
import jsonschema
from jsonschema import Draft202012Validator

root = pathlib.Path(sys.argv[1])  # repo root
c = root / '.orchestration/contracts'
fx = c / 'fixtures/workshop'
schema = json.loads((c / 'workshop-inputs.schema.json').read_text())
Draft202012Validator.check_schema(schema)
v = Draft202012Validator(schema)
rc = 0
inputs = []
for f in sorted(fx.glob('WM*.json')):
    d = json.loads(f.read_text())
    inputs.append((d['fixture_id'], d['input']))
clip = json.loads((fx / 'clip-rules.json').read_text())
for r in clip['truth_table']:
    if r['input'] is not None:
        inputs.append((f"TT{r['row']:02d}", r['input']))
for cs in clip['supplementary_cases']:
    inputs.append((cs['case'], cs['input']))
bad = 0
for fid, inp in inputs:
    errs = sorted(v.iter_errors(inp), key=lambda e: list(e.path))
    if errs:
        bad += 1
        print(f"SCHEMA FAIL {fid}: {errs[0].message[:200]}")
print(f"workshop-inputs schema: {len(inputs) - bad}/{len(inputs)} inputs valid (jsonschema {__import__('importlib.metadata').metadata.version('jsonschema')})")
rc |= bad > 0

# shape/serialization of new fixtures vs old
old = [json.loads(p.read_text()) for p in sorted(fx.glob('WM*.json')) if int(json.loads(p.read_text())['fixture_id'][2:]) <= 36]
top = {tuple(sorted(d.keys())) for d in old}
exp = {tuple(sorted(d['expected'].keys())) for d in old}
tol = {d['tolerance'] for d in old}
for p in sorted(fx.glob('WM*.json')):
    raw = p.read_text()
    d = json.loads(raw)
    n = int(d['fixture_id'][2:])
    if n < 37:
        continue
    same_ser = raw == json.dumps(d, indent=1, ensure_ascii=False) + '\n'
    print(f"{d['fixture_id']}: top-level keys as WM01-36={tuple(sorted(d.keys())) in top} expected keys as WM01-36={tuple(sorted(d['expected'].keys())) in exp} "
          f"tolerance as WM01-36={d['tolerance'] in tol} serialization(indent=1,+newline)={same_ser} file-name-prefix={p.name.startswith(d['fixture_id'] + '-')}")
    rc |= not (tuple(sorted(d.keys())) in top and d['tolerance'] in tol and same_ser)
# old fixture serialization reference
p0 = sorted(fx.glob('WM01*.json'))[0]
print(f"reference WM01 serialization(indent=1,+newline)={p0.read_text() == json.dumps(json.loads(p0.read_text()), indent=1, ensure_ascii=False) + chr(10)}")

# handoff
h_path = root / '.orchestration/handoffs/F02a.json'
h = json.loads(h_path.read_text())
hs = json.loads((c / 'worker-handoff.schema.json').read_text())
hv = Draft202012Validator(hs)
errs = list(hv.iter_errors(h))
print(f"handoff as submitted: {len(errs)} schema error(s)")
for e in errs:
    print(f"   {'/'.join(map(str, e.path))}: {e.validator} {e.message[:160]}")
h2 = dict(h); h2['task_id'] = 'F02'
errs2 = list(hv.iter_errors(h2))
print(f"handoff with task_id replaced in memory by 'F02': {len(errs2)} schema error(s)")
for e in errs2:
    print(f"   {'/'.join(map(str, e.path))}: {e.validator} {e.message[:160]}")
# artifacts
ok = 0
for a in h['artifacts']:
    fp = root / a['path']
    got = hashlib.sha256(fp.read_bytes()).hexdigest() if fp.is_file() else None
    if got == a['sha256']:
        ok += 1
    else:
        print(f"   ARTIFACT MISMATCH {a['path']}: handoff {a['sha256'][:12]} actual {got}")
print(f"handoff artifacts: {ok}/{len(h['artifacts'])} sha256 match")
rc |= ok != len(h['artifacts'])
missing = [p for p in h['changed_paths'] if not (root / p).exists()]
print(f"changed_paths: {len(h['changed_paths'])} listed, missing={missing}")
ev_missing = [t['evidence'] for t in h['tests'] if not (root / t['evidence']).exists()]
print(f"tests: {len(h['tests'])} listed, evidence missing={ev_missing}")
sys.exit(1 if rc else 0)
