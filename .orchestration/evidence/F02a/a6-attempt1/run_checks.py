"""A6 F02a attempt 1 runner. Usage: python run_checks.py <fixtures_dir> <schema_path>"""
import glob, json, os, sys
from jsonschema import Draft202012Validator
import intmodel as M

FIX = sys.argv[1]
SCHEMA = json.load(open(sys.argv[2]))
V = Draft202012Validator(SCHEMA)


def semantic_errors(inp):
    """XF-04..XF-06, written from workshop-inputs.md s6."""
    errs = []
    tm = inp["chapters"]["timing"]
    A = M.qval(tm["current_age"])
    hh = tm.get("household")
    pA = M.qval(hh["partner_current_age"]) if hh else None
    ids = [s["id"] for s in inp["chapters"]["income"]["sources"]]
    if len(ids) != len(set(ids)):
        errs.append("XF-06")
    for s in inp["chapters"]["income"]["sources"]:
        Ao = pA if s["owner"] == "partner" else A
        st = s["start"]
        if st["reference"] == "age" and M.qval(st["point"]) is not None and Ao is not None and st["point"]["value"] < Ao:
            errs.append(f"XF-04:{s['id']}")
        o = M.build_sources({"chapters": {"income": {"sources": [s]}}}, A, pA, frozenset())[0]
        if o.start_state == "ok" and o.end_present and o.end_state == "ok" and not (o.e > o.s):
            errs.append(f"XF-05:{s['id']}")
    return errs


def diff_paths(a, b, p="$"):
    if type(a) != type(b):
        return [p]
    if isinstance(a, dict):
        out = []
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                out.append(f"{p}.{k}(missing)")
            else:
                out += diff_paths(a[k], b[k], f"{p}.{k}")
        return out
    if isinstance(a, list):
        if len(a) != len(b):
            return [f"{p}(len {len(a)}!={len(b)})"]
        out = []
        for n, (x, y) in enumerate(zip(a, b)):
            out += diff_paths(x, y, f"{p}[{n}]")
        return out
    return [] if a == b else [p]


def load_cases():
    wm = []
    for f in sorted(glob.glob(os.path.join(FIX, "WM*.json"))):
        d = json.load(open(f))
        wm.append((d["fixture_id"], d))
    clip = json.load(open(os.path.join(FIX, "clip-rules.json")))
    return wm, clip


def run(faults, wm, clip, verbose=False):
    fails = []
    for fid, d in wm:
        got = M.compute(d["input"], faults)
        dp = diff_paths(got, d["expected"])
        if dp:
            fails.append((fid, dp[:6], len(dp)))
    for row in clip["truth_table"]:
        tag = f"TT{row['row']:02d}"
        if not row["possible"]:
            continue
        got = M.compute(row["input"], faults)
        g = {"predicates": got["clip"]["predicates"], "selected": got["clip"]["selected"],
             "selection_reason": got["clip"]["selection_reason"],
             "completeness_state": got["completeness"]["state"], "flags": got["flags"]}
        e = dict(row["expected"]); e["predicates"] = row["predicates"]
        dp = diff_paths(g, e)
        if dp:
            fails.append((tag, dp, len(dp)))
    for cs in clip["supplementary_cases"]:
        got = M.compute(cs["input"], faults)
        g = {"predicates": got["clip"]["predicates"], "selected": got["clip"]["selected"],
             "selection_reason": got["clip"]["selection_reason"],
             "completeness_state": got["completeness"]["state"], "flags": got["flags"]}
        dp = diff_paths(g, cs["expected"])
        if dp:
            fails.append((cs["case"], dp, len(dp)))
    for ms in clip["media_state_cases"]:
        dp = diff_paths(M.media_render(ms), ms["expected"])
        if dp:
            fails.append((ms["case"], dp, len(dp)))
    return fails


def main():
    wm, clip = load_cases()
    print(f"fixtures dir: {FIX}")
    print(f"WM fixtures found: {len(wm)} ({wm[0][0]}..{wm[-1][0]})")
    # 1. input validity
    bad = 0
    inputs = [(fid, d["input"]) for fid, d in wm]
    inputs += [(f"TT{r['row']:02d}", r["input"]) for r in clip["truth_table"] if r["possible"]]
    inputs += [(c["case"], c["input"]) for c in clip["supplementary_cases"]]
    for tag, inp in inputs:
        se = [e.message[:80] for e in V.iter_errors(inp)]
        xe = semantic_errors(inp)
        if se or xe:
            bad += 1
            print(f"INPUT-INVALID {tag}: schema={se} semantic={xe}")
    print(f"inputs checked: {len(inputs)}; schema+XF-04..06 invalid: {bad}")
    # 2. impossible rows
    imp = [r for r in clip["truth_table"] if not r["possible"]]
    ok_imp = all(r["input"] is None and r["predicates"]["C"] and r["predicates"]["F"]
                 and r["selected_by_precedence"] == "W10" for r in imp)
    print(f"truth table rows: {len(clip['truth_table'])}; possible {len(clip['truth_table'])-len(imp)}; "
          f"impossible {len(imp)} all C&F, no input, W10 by precedence: {ok_imp}")
    # 3. index agreement
    idx = json.load(open(os.path.join(FIX, "index.json")))
    ents = idx["fixtures"]
    bad_idx = []
    wmd = dict(wm)
    for e in ents:
        if e["fixture_id"] == "CLIP":
            if not os.path.exists(os.path.join(FIX, e["file"])): bad_idx.append("CLIP file")
            continue
        d = wmd.get(e["fixture_id"])
        if d is None or not os.path.exists(os.path.join(FIX, e["file"])):
            bad_idx.append(e["fixture_id"] + " missing"); continue
        got = M.compute(d["input"])
        if (got["clip"]["selected"], got["completeness"]["state"]) != (e["selected_clip"], e["completeness_state"]):
            bad_idx.append(e["fixture_id"] + " clip/state")
        if (e["title"], e["covers"]) != (d["title"], d["covers"]):
            bad_idx.append(e["fixture_id"] + " title/covers")
    listed = {e["fixture_id"] for e in ents if e["fixture_id"] != "CLIP"}
    print(f"index entries: {len(ents)}; WM listed {len(listed)}; WM files {len(wm)}; "
          f"files not indexed: {sorted(set(wmd)-listed)}; index problems: {bad_idx}")
    # 4. contract reading
    base = run(frozenset(), wm, clip)
    ncases = len(wm) + sum(1 for r in clip["truth_table"] if r["possible"]) + len(clip["supplementary_cases"]) + len(clip["media_state_cases"])
    print(f"CONTRACT READING: {ncases - len(base)}/{ncases} cases pass "
          f"({len(wm)} WM + {sum(1 for r in clip['truth_table'] if r['possible'])} TT + "
          f"{len(clip['supplementary_cases'])} CS + {len(clip['media_state_cases'])} MS)")
    for f in base:
        print("  BASE-MISMATCH", f)
    # 5. faults
    faults = sys.argv[3].split(",") if len(sys.argv) > 3 and sys.argv[3] else []
    wm_old = [(fid, d) for fid, d in wm if int(fid[2:]) <= 36]
    for fl in faults:
        res = run(frozenset([fl]), wm, clip)
        res_old = run(frozenset([fl]), wm_old, clip)
        caught = sorted({x[0] for x in res})
        caught_old = sorted({x[0] for x in res_old})
        print(f"FAULT {fl}: {'CAUGHT' if caught else 'MISSED'} by {caught or '-'}; "
              f"with WM01-WM36 only: {'CAUGHT by '+str(caught_old) if caught_old else 'MISSED'}")
        for x in res:
            print(f"    {x[0]}: {x[2]} differing paths, first: {x[1][:4]}")
    return 1 if (base or bad or not ok_imp or bad_idx) else 0


if __name__ == "__main__":
    sys.exit(main())
