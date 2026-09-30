"""Negative controls: inject each fault into the independent model and confirm that the fixture(s)
named for it (workshop-math.md §10, plus A6-chosen extra faults) detect it by a full-record diff."""
import glob, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from model import model
from run_fixtures import diff
FIX = "/home/user/bill/.orchestration/contracts/fixtures/workshop"
fx = {json.load(open(f))["fixture_id"]: json.load(open(f)) for f in glob.glob(f"{FIX}/WM*.json")}
cr = json.load(open(f"{FIX}/clip-rules.json"))
CLAIMED = [  # (fault, fixtures that §10 says catch it)
    ("half_up", ["WM17"]), ("float_growth", ["WM24"]),
    ("not_answered_as_zero", ["WM07"]), ("partial_as_complete", ["WM30"]),
    ("unknown_spending_zero", ["WM25"]),
    ("start_unknown_as_not_paying", ["WM26", "WM33"]), ("start_unknown_as_already", ["WM26", "WM33"]),
    ("unresolvable_start_as_not_paying", ["WM29"]),
    ("end_unknown_as_open", ["WM27", "WM28"]),
    ("unknown_first", ["WM32", "WM33"]), ("one_code_per_source", ["WM34"]),
    ("R_unknown_blocks_age_starts", ["WM31"]),
    ("gross_as_net", ["WM09"]), ("today_as_nominal", ["WM04"]),
    ("home_spendable", ["WM10"]),
    ("F_before_M", ["WM08"]), ("H_after_F", ["WM21"]),
    ("net_surplus", ["WM12"]),
    ("cr_discount_to_base", ["WM35"]), ("ignore_no_positive_gap", ["WM36"]),
]
EXTRA = ["monthly_not_x12", "inclusive_end", "escalate_from_zero", "partner_uses_self_age", "deflate_from_tR",
         "cr_start_of_year", "pre_retirement_rows", "unknown_tax_as_net", "gap_from_rounded", "deflate_rounded",
         "cr_from_rounded_gaps", "round_then_sum", "R_code_only_if_A_known", "no_global_codes_without_window",
         "horizon_known_positive_only"]
missed = 0
print("== faults named in workshop-math.md §10")
for fault, fids in CLAIMED:
    for fid in fids:
        try:
            n = len(diff(model(fx[fid]["input"], frozenset([fault])), fx[fid]["expected"]))
        except Exception as ex:  # a crash also counts as detection
            n = f"exception {type(ex).__name__}"
        caught = n != 0
        missed += not caught
        print(f"  {'CAUGHT' if caught else 'MISSED'} {fault:36s} by {fid}: differences {n}")
print("== extra A6 faults: which fixtures (WM + clip-rule cases) catch each")
for fault in EXTRA:
    hits = []
    for fid, d in sorted(fx.items()):
        try:
            if diff(model(d["input"], frozenset([fault])), d["expected"]):
                hits.append(fid)
        except Exception:
            hits.append(fid + "!")
    for row in cr["truth_table"]:
        if row.get("input"):
            o = model(row["input"], frozenset([fault]))
            if (o["clip"]["selected"], o["completeness"]["state"], o["flags"]) != (row["expected"]["selected"], row["expected"]["completeness_state"], row["expected"]["flags"]):
                hits.append(f"TT{row['row']}")
    print(f"  {'CAUGHT' if hits else 'MISSED'} {fault:24s} by {hits[:10]}{' ...' if len(hits) > 10 else ''}")
    missed += not hits
print(f"== summary: missed {missed}")
sys.exit(1 if missed else 0)
