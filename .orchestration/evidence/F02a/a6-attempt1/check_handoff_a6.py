import hashlib, json, os, re, sys, copy
from jsonschema import Draft202012Validator
ROOT = "/home/user/bill"
h = json.load(open(os.path.join(ROOT, ".orchestration/handoffs/F02a.json")))
sch = json.load(open(os.path.join(ROOT, ".orchestration/contracts/worker-handoff.schema.json")))
V = Draft202012Validator(sch)
errs = [f"{'/'.join(map(str,e.absolute_path))}: {e.validator}: {e.message[:90]}" for e in V.iter_errors(h)]
print("schema errors as submitted:", errs or "none")
h2 = copy.deepcopy(h); h2["task_id"] = "F02"
errs2 = [f"{'/'.join(map(str,e.absolute_path))}: {e.validator}: {e.message[:90]}" for e in V.iter_errors(h2)]
print("schema errors with task_id replaced in memory by a pattern-valid id:", errs2 or "none")
bad = 0
for a in h["artifacts"]:
    p = os.path.join(ROOT, a["path"])
    got = hashlib.sha256(open(p, "rb").read()).hexdigest() if os.path.isfile(p) else "MISSING"
    st = "OK " if got == a["sha256"] else "BAD"
    if st != "OK ": bad += 1
    print(f"  {st} {a['path']} {got[:16]}")
print(f"artifacts: {len(h['artifacts'])}, sha256 mismatches: {bad}")
for p in h["changed_paths"]:
    print("  changed_path exists:", os.path.exists(os.path.join(ROOT, p)), p)
for t in h["tests"]:
    ev = os.path.join(ROOT, t["evidence"])
    ex = os.path.isfile(ev)
    tail = ""
    if ex:
        txt = open(ev).read()
        m = re.findall(r"exit(?:_code)?[=: ]+(\d+)", txt)
        tail = f"last exit marker in log: {m[-1] if m else 'n/a'}"
    print(f"  test {t['id']}: declared exit {t['exit_code']}; evidence exists {ex}; {tail}")
art = {a["path"] for a in h["artifacts"]}
ev_dir = ".orchestration/evidence/F02a/"
files = sorted(ev_dir + f for f in os.listdir(os.path.join(ROOT, ev_dir)) if os.path.isfile(os.path.join(ROOT, ev_dir, f)))
print("evidence files not hashed in artifacts:", [f for f in files if f not in art])
print("base_commit:", h["base_commit"], "result_commit:", h["result_commit"])
