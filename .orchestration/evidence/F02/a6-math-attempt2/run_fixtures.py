"""Recompute every workshop fixture with the independent model and diff against `expected`."""
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from model import model  # noqa: E402

FIX = "/home/user/bill/.orchestration/contracts/fixtures/workshop"
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)


def diff(a, b, path=""):
    """Deep structural diff; dict key order ignored, list order significant, types strict
    (so 0 != False, None != 0, "0" != 0)."""
    out = []
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                out.append(f"{path}/{k}: missing in computed (expected {json.dumps(b[k])[:60]})")
            elif k not in b:
                out.append(f"{path}/{k}: extra in computed ({json.dumps(a[k])[:60]})")
            else:
                out += diff(a[k], b[k], f"{path}/{k}")
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            out.append(f"{path}: length computed {len(a)} expected {len(b)}")
        for i, (x, y) in enumerate(zip(a, b)):
            out += diff(x, y, f"{path}/{i}")
    else:
        if type(a) is not type(b) or a != b:
            out.append(f"{path}: computed {json.dumps(a)} expected {json.dumps(b)}")
    return out


def main():
    total_fail = 0
    computed_all = {}
    files = sorted(glob.glob(os.path.join(FIX, "WM*.json")))
    print(f"== math fixtures: {len(files)} files")
    n_fields = 0
    for f in files:
        d = json.load(open(f))
        got = model(d["input"])
        computed_all[d["fixture_id"]] = got
        dd = diff(got, d["expected"])
        # count leaf comparisons for the record
        def leaves(x):
            if isinstance(x, dict):
                return sum(leaves(v) for v in x.values())
            if isinstance(x, list):
                return sum(leaves(v) for v in x) if x else 1
            return 1
        n_fields += leaves(d["expected"])
        status = "OK  " if not dd else "FAIL"
        print(f"{status} {d['fixture_id']}  differences={len(dd)}  rows={len(got['years'])}  state={got['completeness']['state']}  clip={got['clip']['selected']}")
        for x in dd[:12]:
            print("      ", x)
        total_fail += bool(dd)
    print(f"   leaf values compared: {n_fields}")

    # ---- clip-rules.json
    cr = json.load(open(os.path.join(FIX, "clip-rules.json")))
    print("== clip-rules.json truth table")
    tt_fail = 0
    for row in cr["truth_table"]:
        if not row["possible"]:
            continue
        got = model(row["input"])
        exp = row["expected"]
        probs = []
        if got["clip"]["predicates"] != row["predicates"]:
            probs.append(f"predicates {got['clip']['predicates']} != {row['predicates']}")
        for k, gv in (("selected", got["clip"]["selected"]), ("selection_reason", got["clip"]["selection_reason"]),
                      ("completeness_state", got["completeness"]["state"]), ("flags", got["flags"])):
            if gv != exp[k]:
                probs.append(f"{k} {gv} != {exp[k]}")
        if row["selected_by_precedence"] != exp["selected"]:
            probs.append("selected_by_precedence disagrees with expected.selected")
        print(("OK  " if not probs else "FAIL") + f" row {row['row']:2d} {row['predicates']} -> {got['clip']['selected']}/{got['clip']['selection_reason']}")
        for p in probs:
            print("      ", p)
        tt_fail += bool(probs)
    print("== clip-rules.json supplementary cases")
    for c in cr["supplementary_cases"]:
        got = model(c["input"])
        exp = c["expected"]
        probs = []
        if got["clip"]["predicates"] != exp["predicates"]:
            probs.append(f"predicates {got['clip']['predicates']} != {exp['predicates']}")
        for k, gv in (("selected", got["clip"]["selected"]), ("selection_reason", got["clip"]["selection_reason"]),
                      ("completeness_state", got["completeness"]["state"]), ("flags", got["flags"])):
            if gv != exp[k]:
                probs.append(f"{k} {gv} != {exp[k]}")
        print(("OK  " if not probs else "FAIL") + f" {c['case']} -> {got['clip']['selected']}/{got['clip']['selection_reason']} state={got['completeness']['state']}")
        for p in probs:
            print("      ", p)
        tt_fail += bool(probs)

    json.dump(computed_all, open(os.path.join(OUT, "computed_fixture_outputs.json"), "w"), indent=1, sort_keys=True)
    print(f"== summary: WM fixtures failing {total_fail}/{len(files)}; clip-rule cases failing {tt_fail}")
    return 1 if (total_fail or tt_fail) else 0


if __name__ == "__main__":
    sys.exit(main())
