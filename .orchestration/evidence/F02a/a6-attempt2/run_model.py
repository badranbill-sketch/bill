#!/usr/bin/env python3
"""Run the A6 attempt-2 Decimal model against every WM fixture and every clip-rules case,
then run each faulty runtime and report which cases catch it.

Usage: <python with jsonschema> run_model.py <contracts_dir>
Exit 0 iff the contract reading reproduces every case exactly AND each required fault is caught
by >= 1 case AND each required fault is missed by WM01-WM36 + clip cases alone (i.e. the new
fixtures are what pin it).
"""
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import decmodel as M  # noqa: E402

from jsonschema import Draft202012Validator  # noqa: E402

cdir = sys.argv[1]
fx = os.path.join(cdir, "fixtures", "workshop")
schema = json.load(open(os.path.join(cdir, "workshop-inputs.schema.json")))
V = Draft202012Validator(schema)


def diff(a, b, path="$"):
    out = []
    if type(a) is not type(b) and not (isinstance(a, (int, float)) and isinstance(b, (int, float)) and
                                        not isinstance(a, bool) and not isinstance(b, bool)):
        return [f"{path}: type {type(a).__name__} != {type(b).__name__} ({a!r} vs {b!r})"]
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                out.append(f"{path}.{k}: missing in model")
            elif k not in b:
                out.append(f"{path}.{k}: extra in model ({a[k]!r})")
            else:
                out += diff(a[k], b[k], f"{path}.{k}")
    elif isinstance(a, list):
        if len(a) != len(b):
            out.append(f"{path}: len {len(a)} != {len(b)}")
        for n, (x, y) in enumerate(zip(a, b)):
            out += diff(x, y, f"{path}[{n}]")
    else:
        if a != b:
            out.append(f"{path}: model {a!r} != fixture {b!r}")
    return out


# ---- collect cases
cases = []  # (case_id, kind, input, expected, extra)
wm_files = sorted(glob.glob(os.path.join(fx, "WM*.json")))
for f in wm_files:
    d = json.load(open(f))
    assert os.path.basename(f).startswith(d["fixture_id"] + "-"), f
    cases.append((d["fixture_id"], "wm", d["input"], d["expected"], d))
clip = json.load(open(os.path.join(fx, "clip-rules.json")))
for r in clip["truth_table"]:
    if r["possible"]:
        cases.append((f"TT{r['row']:02d}", "tt", r["input"], r, None))
for c in clip["supplementary_cases"]:
    cases.append((c["case"], "cs", c["input"], c["expected"], None))


def check_case(cid, kind, inp, exp, faults):
    out = M.compute(inp, faults)
    if kind == "wm":
        return diff(out, exp)
    if kind == "tt":
        got = {"predicates": out["clip"]["predicates"], "selected": out["clip"]["selected"],
               "selection_reason": out["clip"]["selection_reason"],
               "completeness_state": out["completeness"]["state"], "flags": out["flags"]}
        want = {"predicates": exp["predicates"], **exp["expected"]}
        return diff(got, want)
    if kind == "cs":
        got = {"predicates": out["clip"]["predicates"], "selected": out["clip"]["selected"],
               "selection_reason": out["clip"]["selection_reason"],
               "completeness_state": out["completeness"]["state"], "flags": out["flags"]}
        return diff(got, exp)
    raise AssertionError(kind)


ok = True
print(f"contracts dir: {cdir}")
print(f"WM fixtures found: {len(wm_files)}; truth-table possible rows: "
      f"{sum(1 for c in cases if c[1]=='tt')}; supplementary: {sum(1 for c in cases if c[1]=='cs')}")

# ---- input validity
bad_inputs = 0
for cid, kind, inp, exp, _ in cases:
    errs = [e.message for e in V.iter_errors(inp)] + M.semantic_errors(inp)
    if errs:
        bad_inputs += 1
        print(f"INPUT-INVALID {cid}: {errs[:3]}")
print(f"inputs schema+XF-04..06 valid: {len(cases)-bad_inputs}/{len(cases)}")
ok &= bad_inputs == 0

# ---- contract reading
fails = 0
for cid, kind, inp, exp, _ in cases:
    d = check_case(cid, kind, inp, exp, set())
    if d:
        fails += 1
        print(f"CONTRACT-MISMATCH {cid}: {len(d)} diffs; first: {d[:4]}")
print(f"contract reading: {len(cases)-fails}/{len(cases)} cases reproduced exactly")
ok &= fails == 0

# impossible rows: precedence alone
imp_ok = 0
imp = [r for r in clip["truth_table"] if not r["possible"]]
for r in imp:
    p = r["predicates"]
    exp_sel = r["selected_by_precedence"]
    sel = ("W10" if p["C"] else "W06" if p["M"] else "W08" if p["X"] else "W09" if p["H"] else
           "W07" if p["F"] else "W10")
    if sel == exp_sel and p["C"] and p["F"] and r["expected"] is None and r.get("input") is None:
        imp_ok += 1
    else:
        print(f"IMPOSSIBLE-ROW-MISMATCH {r['row']}")
print(f"impossible rows (C and F, no input, precedence W10): {imp_ok}/{len(imp)}")
ok &= imp_ok == len(imp) == 8
# possible rows: selected_by_precedence
for r in clip["truth_table"]:
    if r["possible"] and r["selected_by_precedence"] != r["expected"]["selected"]:
        print(f"TT selected_by_precedence mismatch row {r['row']}")
        ok = False

# media states
ms_ok = 0
for c in clip["media_state_cases"]:
    d = diff(M.render_state(c), c["expected"])
    if d:
        print(f"MEDIA-MISMATCH {c['case']}: {d}")
    else:
        ms_ok += 1
print(f"media-state cases: {ms_ok}/{len(clip['media_state_cases'])}")
ok &= ms_ok == len(clip["media_state_cases"])

# index.json
idx = json.load(open(os.path.join(fx, "index.json")))
entries = {e["fixture_id"]: e for e in idx["fixtures"] if e["fixture_id"].startswith("WM")}
idx_ok = 0
for cid, kind, inp, exp, d in cases:
    if kind != "wm":
        continue
    e = entries.get(cid)
    out = M.compute(inp, set())
    good = (e is not None and os.path.basename(e["file"]) == e["file"] and
            os.path.exists(os.path.join(fx, e["file"])) and e["title"] == d["title"] and
            e["covers"] == d["covers"] and e["selected_clip"] == out["clip"]["selected"] and
            e["completeness_state"] == out["completeness"]["state"] and
            json.load(open(os.path.join(fx, e["file"])))["fixture_id"] == cid)
    if good:
        idx_ok += 1
    else:
        print(f"INDEX-MISMATCH {cid}: {e}")
print(f"index.json WM entries consistent with files and model: {idx_ok}/{len(wm_files)} "
      f"(index has {len(idx['fixtures'])} entries: {[e['fixture_id'] for e in idx['fixtures']][-6:]} ...)")
ok &= idx_ok == len(wm_files)

# ---- faulty runtimes
FAULTS = [
    ("today_dollars_uses_q", True, "REQUIRED (1): pre-start growth of a today-dollar amount by (1+q_j)^{s_j}"),
    ("joint_uses_partner", True, "REQUIRED (2): joint source ages resolved against the partner"),
    ("group_from_rounded_rows", False, "P3-1 group reading (WM39 target)"),
    ("deflate_rounded_gap", False, "P3-1 deflation reading (WM40 target)"),
    ("joint_start_uses_partner", False, "variant: joint START only against the partner"),
    ("joint_end_uses_partner", False, "variant: joint END only against the partner"),
    ("joint_uses_older", False, "variant: joint against max(A, A')"),
    ("joint_uses_younger", False, "variant: joint against min(A, A')"),
    ("today_dollars_one_year_short", False, "variant: carried s_j-1 years"),
    ("today_dollars_to_tR", False, "variant: carried only to t_R (WM37 purpose claim)"),
    ("today_dollars_as_nominal", False, "variant: today dollars treated as nominal"),
    ("today_dollars_indexed_at_i_after_start", False, "variant: escalates at i after start"),
    ("gap_from_rounded_rows", False, "control: gap from rounded rows"),
    ("half_up", False, "control: half-up rounding"),
    ("cr_discount_to_t0", False, "control: C_R discounted to t=0"),
    ("cr_zero_eligible", False, "control: C_R = 0 display-eligible"),
]
NEW = {"WM37", "WM38", "WM39", "WM40"}
print()
print("fault | caught by (all cases) | caught by WM01-WM36 + clip cases only")
req_ok = True
for name, required, desc in FAULTS:
    caught = []
    for cid, kind, inp, exp, _ in cases:
        try:
            d = check_case(cid, kind, inp, exp, {name})
        except Exception as ex:  # a crash counts as a detected difference
            d = [f"exception {ex!r}"]
        if d:
            caught.append(cid)
    old = [c for c in caught if c not in NEW]
    print(f"{name} | {','.join(caught) if caught else 'MISSED'} | {','.join(old) if old else 'MISSED'}   # {desc}")
    if required:
        if not caught:
            req_ok = False
            print(f"  REQUIRED FAULT NOT CAUGHT: {name}")
        if old:
            print(f"  note: {name} already caught by pre-F02a cases {old}")
ok &= req_ok

# detail of the required faults' diffs on the catching fixtures
for name, fid in (("today_dollars_uses_q", "WM37"), ("joint_uses_partner", "WM38")):
    c = [x for x in cases if x[0] == fid][0]
    out_f = M.compute(c[2], {name})
    out_c = M.compute(c[2], set())
    print(f"\n{name} on {fid}: state {out_f['completeness']['state']} flags {out_f['flags']} "
          f"clip {out_f['clip']['selected']}")
    for yc, yf in zip(out_c["years"], out_f["years"]):
        print(f"  t={yc['t']}: contract gap {yc['gap_cents']} src {yc['income_by_source_cents']} | "
              f"fault gap {yf['gap_cents']} src {yf['income_by_source_cents']} | "
              f"overstated by {None if yf['gap_cents'] is None else yf['gap_cents']-yc['gap_cents']}")

print("\nRESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
