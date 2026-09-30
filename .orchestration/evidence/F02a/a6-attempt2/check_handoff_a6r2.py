#!/usr/bin/env python3
"""A6 attempt-2 check of handoffs/F02a.json: hashes, schema (as-is and with task_id swapped in memory),
paths, evidence exit markers, unlisted evidence files. Read-only."""
import copy
import glob
import hashlib
import json
import os
import re
import subprocess
import sys

from jsonschema import Draft202012Validator

REPO = "/home/user/bill"
hp = os.path.join(REPO, ".orchestration/handoffs/F02a.json")
h = json.load(open(hp))
schema = json.load(open(os.path.join(REPO, ".orchestration/contracts/worker-handoff.schema.json")))
V = Draft202012Validator(schema)
ok = True


def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


print(f"handoff sha256 {sha(hp)}")
head = subprocess.run(["git", "-C", REPO, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
print(f"base_commit {h['base_commit']} == HEAD {head}: {h['base_commit'] == head}")
ok &= h["base_commit"] == head
print(f"contract_version {h['contract_version']}; status {h['status']}; result_commit {h['result_commit']}")

errs = sorted(V.iter_errors(h), key=lambda e: list(e.path))
print(f"schema errors as submitted: {len(errs)}")
for e in errs:
    print(f"  - /{'/'.join(map(str, e.path))}: {e.message[:160]}")
h2 = copy.deepcopy(h)
h2["task_id"] = "F02"
errs2 = list(V.iter_errors(h2))
print(f"schema errors with task_id replaced in memory by 'F02': {len(errs2)}")
for e in errs2:
    print(f"  - /{'/'.join(map(str, e.path))}: {e.message[:160]}")
ok &= len(errs2) == 0

bad = 0
for a in h["artifacts"]:
    p = os.path.join(REPO, a["path"])
    got = sha(p) if os.path.isfile(p) else "MISSING"
    if got != a["sha256"]:
        bad += 1
        print(f"HASH MISMATCH {a['path']}: declared {a['sha256']} actual {got}")
print(f"artifact hashes matching: {len(h['artifacts']) - bad}/{len(h['artifacts'])}")
ok &= bad == 0

for p in h["changed_paths"]:
    ex = os.path.exists(os.path.join(REPO, p))
    print(f"changed path exists: {ex}  {p}")
    ok &= ex

listed = {a["path"] for a in h["artifacts"]}
ev = sorted(p for p in glob.glob(os.path.join(REPO, ".orchestration/evidence/F02a/*")) if os.path.isfile(p))
unlisted = [os.path.relpath(p, REPO) for p in ev if os.path.relpath(p, REPO) not in listed]
print(f"top-level evidence files not hashed in the handoff: {unlisted}")
for u in unlisted:
    print(f"  sha256 {sha(os.path.join(REPO, u))}  {u}")

print("\ntests: declared exit vs evidence markers")
for t in h["tests"]:
    p = os.path.join(REPO, t["evidence"])
    if not os.path.isfile(p):
        print(f"  {t['id']}: EVIDENCE MISSING {t['evidence']}")
        ok = False
        continue
    txt = open(p, errors="replace").read()
    marks = re.findall(r"\[exit (-?\d+)\]|exit_code=(-?\d+)", txt)
    marks = [a or b for a, b in marks]
    last = marks[-1] if marks else None
    summ = re.findall(r"pass: (\d+)\s+fail: (\d+)", txt)
    print(f"  {t['id']}: declared {t['exit_code']}; last exit marker in log {last}; "
          f"summary {summ[-1] if summ else '-'}; {t['evidence']}")
    if last is not None and int(last) != t["exit_code"]:
        print("    MISMATCH")
        ok = False

print("\nblocked_checks:")
for b in h["blocked_checks"]:
    print(f"  [{b['status']}] owner={b.get('owner')} :: {b['check'][:150]}")
print("human_approvals_required:", h["human_approvals_required"])
print("external_actions_taken:", h["external_actions_taken"])
print("metered_cost:", h["metered_cost"])
print("\nHANDOFF CHECK (all except the task_id pattern):", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
