"""Extra fault variants via monkeypatching intmodel (no change to the contract-reading code path)."""
import sys, copy
import intmodel as M
import run_checks as RC  # noqa: parses argv for fixture dir and schema

orig_resolve = M.resolve
orig_build = M.build_sources
orig_compute = M.compute

def build_partial(which):
    def b(inp, A, pA, faults):
        out = orig_build(inp, A, pA, frozenset())
        for o, s in zip(out, inp["chapters"]["income"]["sources"]):
            if o.owner != "joint":
                continue
            if which in ("start", "both"):
                o.start_state, o.s = orig_resolve(s["start"], pA)
            if which in ("end", "both") and "end" in s:
                o.end_state, o.e = orig_resolve(s["end"], pA)
        return out
    return b

def gap_from_rows(inp, faults=frozenset()):
    out = orig_compute(inp, faults)
    for y in out["years"]:
        if y["status"] == "computed":
            tot = sum(y["income_by_source_cents"].values())
            d = y["spending_cents"]
            y["gap_cents"] = max(0, d - tot); y["surplus_cents"] = max(0, tot - d)
    return out

wm, clip = RC.load_cases()
wm_old = [(f, d) for f, d in wm if int(f[2:]) <= 36]
for name, patch in (("joint_start_only_partner", ("build", build_partial("start"))),
                    ("joint_end_only_partner", ("build", build_partial("end"))),
                    ("gap_from_rounded_rows", ("compute", gap_from_rows))):
    kind, fn = patch
    if kind == "build": M.build_sources = fn
    else: M.compute = fn
    res = RC.run(frozenset(), wm, clip); res_old = RC.run(frozenset(), wm_old, clip)
    M.build_sources = orig_build; M.compute = orig_compute
    print(f"FAULT {name}: {'CAUGHT by '+str(sorted({x[0] for x in res})) if res else 'MISSED'}; "
          f"WM01-WM36 only: {'CAUGHT by '+str(sorted({x[0] for x in res_old})) if res_old else 'MISSED'}")
base = RC.run(frozenset(), wm, clip)
print("contract reading after restore:", "all pass" if not base else base)
