#!/usr/bin/env python3
"""Assemble results.json from <target>/steps.jsonl (evidence tooling)."""
import json, os, re
EV = "/home/user/bill/.orchestration/evidence/F00/checks"
BRANCH = {"main": "main", "codex": "codex/desktop-iphone-unified", "homepage": "claude/bill-centered-homepage",
          "guide": "guide/pre-retirement-guide", "video": "claude/bill-presentation-video",
          "diag-main-filmdeps": "main (DIAGNOSTIC, not CI-equivalent: root npm ci + npm ci --prefix film)"}
PATTERNS = [r"✘|\[FAILED\]|failed\b|Error:|error TS|error\s{2}|Launch blocked|ENOENT|Failed to|Could not|Timed out|Executable doesn't exist|✖"]
def excerpt(path, code):
    if code == 0:
        return None
    lines = [l.rstrip() for l in open(path, encoding="utf-8", errors="replace") if not l.startswith("# ")]
    hits = []
    for l in lines:
        m = re.match(r"^/\S+/scratchpad/wt/base01-[^/]+/(\S+\.(?:tsx?|mjs|js))$", l.strip())
        if m:
            hits.append("lint file: " + m.group(1))
        elif re.search(PATTERNS[0], l):
            hits.append(l.strip())
    seen, out = set(), []
    for h in hits:
        k = h[:160]
        if k not in seen:
            seen.add(k); out.append(k)
        if len(out) >= 6:
            break
    return " | ".join(out) if out else " | ".join(l.strip() for l in lines[-5:] if l.strip())
rows = []
for t in ["main", "codex", "homepage", "guide", "video", "diag-main-filmdeps"]:
    p = os.path.join(EV, t, "steps.jsonl")
    if not os.path.exists(p):
        continue
    for line in open(p):
        d = json.loads(line)
        rows.append({"target": t, "branch": BRANCH[t], "sha": d["sha"], "step": d["step"], "command": d["command"],
                     "exit_code": d["exit_code"], "seconds": d["seconds"], "log_path": d["log_path"],
                     "status_after_path": d["log_path"].replace(".log", ".status_after.txt"),
                     "key_failure_excerpt": excerpt(d["log_path"], d["exit_code"])})
json.dump(rows, open(os.path.join(EV, "results.json"), "w"), indent=2, ensure_ascii=False)
print(len(rows), "rows")
