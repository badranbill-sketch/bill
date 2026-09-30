"""F02a: check handoffs/F02a.json against worker-handoff 1.0 without stopping at the first schema error.

contracts/validate.py --handoff returns early when the schema rejects a document, so it cannot show whether the
hashes are real when the only schema error is the task_id pattern. This script reports:
  1. every schema error of the document as written (Draft 2020-12, jsonschema);
  2. the schema errors of an in-memory copy whose task_id is replaced by "F02" (never written), to show whether
     task_id is the only rejected field;
  3. the deep checks of validate.py handoff_problems(): base_commit == HEAD, task_id in tasks.json,
     contract_version 1.0, every artifact hash, every changed path, every evidence path.
Exit 0 only if (1), (2) and (3) all report nothing; otherwise 1 (so a task_id-only rejection still exits 1).
Usage: python check_handoff.py [path]   (default .orchestration/handoffs/F02a.json); needs jsonschema.
"""
from __future__ import annotations

import copy
import hashlib
import json
import subprocess
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ORCH = REPO / ".orchestration"
schema = json.loads((ORCH / "contracts" / "worker-handoff.schema.json").read_text())
V = Draft202012Validator(schema)


def errs(doc):
    return sorted((f"{e.validator}@/{'/'.join(map(str, e.absolute_path))}: {e.message[:140]}" for e in V.iter_errors(doc)))


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else ORCH / "handoffs" / "F02a.json"
    h = json.loads(path.read_text(), parse_constant=lambda t: (_ for _ in ()).throw(ValueError(t)))
    e1 = errs(h)
    print(f"1. schema errors as written: {len(e1)}")
    for e in e1:
        print(f"   - {e}")
    h2 = copy.deepcopy(h)
    h2["task_id"] = "F02"
    e2 = errs(h2)
    print(f"2. schema errors with task_id replaced by 'F02' in memory only: {len(e2)}")
    for e in e2:
        print(f"   - {e}")
    deep = []
    head = subprocess.run(["git", "-C", str(REPO), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    if h["base_commit"] != head:
        deep.append(f"base_commit {h['base_commit']} != HEAD {head}")
    tasks = json.loads((ORCH / "tasks.json").read_text())
    ids = {t["id"] for t in (tasks["tasks"] if isinstance(tasks, dict) else tasks)}
    if h["task_id"] not in ids:
        deep.append("task_id not in tasks.json")
    if h["contract_version"] != "1.0":
        deep.append("contract_version")
    for a in h["artifacts"]:
        p = REPO / a["path"]
        if not p.is_file():
            deep.append(f"artifact missing {a['path']}")
        elif hashlib.sha256(p.read_bytes()).hexdigest() != a["sha256"]:
            deep.append(f"artifact hash differs {a['path']}")
    for cp in h["changed_paths"]:
        if not (REPO / cp).exists():
            deep.append(f"changed path missing {cp}")
    for t in h["tests"]:
        if not (REPO / t["evidence"]).exists():
            deep.append(f"evidence missing {t['evidence']}")
    print(f"3. deep checks (HEAD {head}; task_id {h['task_id']} in tasks.json; {len(h['artifacts'])} artifact hashes; "
          f"{len(h['changed_paths'])} changed paths; {len(h['tests'])} evidence paths): {len(deep)} problems")
    for d in deep:
        print(f"   - {d}")
    sys.exit(1 if (deep or e2 or e1) else 0)


if __name__ == "__main__":
    main()
