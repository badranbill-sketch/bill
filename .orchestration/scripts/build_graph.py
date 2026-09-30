#!/usr/bin/env python3
"""Regenerate source/02_TASK_GRAPH.json and source/acceptance_catalog.json from the transcribed spec.

Deterministic; stdlib only. Validates the plan's internal structure (deps exist,
graph acyclic, check IDs known, gates known). This validates the plan, not the
system: it proves nothing about the website, n8n, email or payments.

Usage: python3 .orchestration/scripts/build_graph.py [--check]
  --check  exit non-zero if regenerated files differ from those on disk.
"""
import json, re, sys, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "source"
GATES = {f"G{i}" for i in range(7)}
STATES = ["planned", "ready", "running", "submitted", "verifying", "accepted",
          "needs_changes", "blocked_human", "blocked_technical", "cancelled_by_owner"]

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def parse_catalog():
    text = (SRC / "04_CONTRACTS_AND_TESTS.md").read_text()
    sec = text.split("### 8. Acceptance catalog", 1)[1]
    out = []
    for m in re.finditer(r"^- ([A-Z]+\d{2}) — (.+?) \| (.+?) \| (.+)$", sec, re.M):
        out.append({"id": m[1], "title": m[2].strip(), "method": m[3].strip(),
                    "required_evidence": m[4].strip(), "status": "not_run", "evidence": []})
    return out

def split_list(v):
    v = v.strip()
    return [] if v in ("none", "") else [x.strip() for x in v.split(",")]

def parse_tasks():
    text = (SRC / "TASK_LEDGER.md").read_text()
    tasks = []
    for block in re.split(r"^### ", text, flags=re.M)[1:]:
        head, *lines = block.strip().splitlines()
        tid, title = head.split(" — ", 1)
        f = {}
        for ln in lines:
            ln = ln.strip()
            if not ln.startswith("- "): continue
            ln = ln[2:]
            if ln.startswith("owner:"):
                for part in ln.split(" | "):
                    k, v = part.split(":", 1); f[k.strip()] = v.strip()
            else:
                k, v = ln.split(":", 1); f[k.strip()] = v.strip()
        tasks.append({
            "id": tid.strip(), "title": title.strip(), "owner": f["owner"],
            "reviewer": f["reviewer"], "phase": f["phase"], "acceptance_stage": f["stage"],
            "dependencies": split_list(f["deps"]), "required_gates": split_list(f["gates"]),
            "deliverables": split_list(f["deliverables"]), "acceptance": f["acceptance"],
            "check_refs": split_list(f["checks"]), "max_attempts": 3,
            "state": "planned", "attempts": 0, "accepted_at_stage": None,
            "evidence": [], "history": []})
    return tasks

def validate(tasks, catalog):
    errs = []
    ids = {t["id"] for t in tasks}
    cat = {c["id"] for c in catalog}
    if len(ids) != len(tasks): errs.append("duplicate task id")
    for t in tasks:
        for d in t["dependencies"]:
            if d not in ids: errs.append(f"{t['id']}: unknown dep {d}")
        for g in t["required_gates"]:
            if g not in GATES: errs.append(f"{t['id']}: unknown gate {g}")
        for c in t["check_refs"]:
            if c != "artifact/design review" and c not in cat:
                errs.append(f"{t['id']}: unknown check {c}")
    # acyclic + topo order + longest path (critical path by task count)
    deps = {t["id"]: t["dependencies"] for t in tasks}
    order, state = [], {}
    def visit(n, stack):
        if state.get(n) == 1: errs.append("cycle: " + " -> ".join(stack + [n])); return
        if state.get(n) == 2: return
        state[n] = 1
        for d in deps[n]: visit(d, stack + [n])
        state[n] = 2; order.append(n)
    for n in deps: visit(n, [])
    depth, prev = {}, {}
    for n in order:
        best = max(deps[n], key=lambda d: depth[d], default=None)
        depth[n] = 1 + (depth[best] if best else 0); prev[n] = best
    end = max(depth, key=depth.get)
    path = []
    while end: path.append(end); end = prev[end]
    unused = sorted(cat - {c for t in tasks for c in t["check_refs"]})
    return errs, order, list(reversed(path)), unused

def main():
    catalog = parse_catalog()
    tasks = parse_tasks()
    errs, order, crit, unused = validate(tasks, catalog)
    meta = {"source": "operator handoff v1.0 (2026-09-29), transcribed 2026-09-30",
            "source_files": {p.name: sha(p) for p in sorted(SRC.glob("*.md"))},
            "generator": ".orchestration/scripts/build_graph.py",
            "states": STATES, "task_count": len(tasks), "check_count": len(catalog),
            "topological_order": order, "longest_dependency_chain": crit,
            "catalog_checks_not_referenced_by_any_task": unused}
    graph = {"meta": meta, "tasks": tasks}
    cat = {"meta": {"source": "04_CONTRACTS_AND_TESTS.md §8", "count": len(catalog),
                    "note": "Every check starts not_run. Statuses: pass, fail, blocked, not_run."},
           "checks": catalog}
    # Pristine generated files live in source/. The live, stateful copies
    # (.orchestration/tasks.json, .orchestration/acceptance_catalog.json) are
    # written by A0 and are not regenerated or compared here.
    out = {ROOT / "source" / "02_TASK_GRAPH.json": graph,
           ROOT / "source" / "acceptance_catalog.json": cat}
    if errs:
        print("PLAN VALIDATION FAILED:"); [print(" -", e) for e in errs]; sys.exit(1)
    check = "--check" in sys.argv
    differs = False
    for p, obj in out.items():
        s = json.dumps(obj, indent=2, ensure_ascii=False) + "\n"
        if check:
            if not p.exists() or p.read_text() != s: differs = True; print("differs:", p)
        else: p.write_text(s)
    print(f"tasks={len(tasks)} checks={len(catalog)} errors=0")
    print("longest chain:", " -> ".join(crit), f"({len(crit)} tasks)")
    print("catalog checks referenced by no task:", unused or "none")
    sys.exit(1 if differs else 0)

if __name__ == "__main__": main()
