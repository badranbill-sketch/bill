"""Property / metamorphic checks on random contract-valid inputs, plus a black-box differential
run against the author's reference model (workshop_reference.compute is imported and called only;
its source was not used to write model.py)."""
import copy
import importlib.util
import json
import os
import random
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from model import model, semantic_errors, dec_to_ratio, round_half_even_ratio  # noqa: E402
from gen import valid_docs, VALIDATOR  # noqa: E402
from run_fixtures import diff  # noqa: E402

N = int(os.environ.get("N", "3000"))
SEED = int(os.environ.get("SEED", "20260930"))

spec = importlib.util.spec_from_file_location("wref", "/home/user/bill/.orchestration/evidence/F02/math/workshop_reference.py")
wref = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wref)

PU = float(os.environ.get("PU", "0.12"))
docs, tries = valid_docs(N, SEED, semantic_errors, PU)
print(f"generated {len(docs)} contract-valid docs from {tries} candidates (seed {SEED}, p_unknown {PU})")
cnt = Counter()
fails = Counter()
examples = {}


def fail(name, detail):
    fails[name] += 1
    examples.setdefault(name, detail)


def exact_to_ratio(s):
    if "/" in s:
        p, q = s.split("/")
        return int(p), int(q)
    if "." in s:
        ip, fp = s.split(".")
        return int(ip + fp), 10 ** len(fp)
    return int(s), 1


for n, d in enumerate(docs):
    out = model(d)
    cnt["state:" + out["completeness"]["state"]] += 1
    cnt["clip:" + out["clip"]["selected"] + "/" + out["clip"]["selection_reason"]] += 1

    # P1 semantic checker agreement with the reference (black box)
    if [e[0] for e in semantic_errors(d)] != []:
        fail("semantic_disagree_self", n)

    # P2 differential vs reference model
    ref = wref.compute(copy.deepcopy(d))
    dd = diff(out, ref)
    if dd:
        fail("differential_vs_reference", {"doc": n, "diffs": dd[:6]})

    # P3 clip = precedence of predicates; C and F never both
    p = out["clip"]["predicates"]
    exp = ("W10", "core_inputs_missing") if p["C"] else ("W06", "missing_income") if p["M"] else \
        ("W08", "tax_basis") if p["X"] else ("W09", "household_timing") if p["H"] else \
        ("W07", "funding_gap") if p["F"] else ("W10", "neutral_fallback")
    if (out["clip"]["selected"], out["clip"]["selection_reason"]) != exp:
        fail("clip_not_precedence", n)
    if p["C"] and p["F"]:
        fail("C_and_F", n)
    cnt["vector:" + "".join("1" if p[k] else "0" for k in "CMXHF")] += 1

    # P4 per-row invariants
    for y in out["years"]:
        if y["status"] == "computed":
            if y["reasons"]:
                fail("computed_with_reasons", n)
            if y["income_gross_cents"] != 0 or y["income_unknown_basis_cents"] != 0:
                fail("computed_row_with_non_net_income", (n, y["t"]))
            G, S = exact_to_ratio(y["exact"]["gap"]), exact_to_ratio(y["exact"]["surplus"])
            Dd, I = exact_to_ratio(y["exact"]["spending"]), exact_to_ratio(y["exact"]["income_compared"])
            if G[0] and S[0]:
                fail("gap_and_surplus_both_positive", (n, y["t"]))
            # G - S == D - I exactly
            lhs = G[0] * S[1] - S[0] * G[1], G[1] * S[1]
            rhs = Dd[0] * I[1] - I[0] * Dd[1], Dd[1] * I[1]
            if lhs[0] * rhs[1] != rhs[0] * lhs[1]:
                fail("G_minus_S_ne_D_minus_I", (n, y["t"]))
            # rounding applied once, half-even, from exact
            for key, ek in (("gap_cents", "gap"), ("surplus_cents", "surplus"), ("spending_cents", "spending")):
                pp, qq = exact_to_ratio(y["exact"][ek])
                if round_half_even_ratio(pp, qq) != y[key]:
                    fail("rounding_not_half_even_of_exact", (n, y["t"], key))
            ip, iq = exact_to_ratio(y["exact"]["income_compared"])
            if round_half_even_ratio(ip, iq) != y["income_net_cents"]:
                fail("net_group_not_rounded_once", (n, y["t"]))
            # §9 display-difference bounds
            disp = (y["income_net_cents"] - y["spending_cents"]) - (y["surplus_cents"] - y["gap_cents"])
            if abs(disp) > 1:
                fail("group_display_difference_over_1_cent", (n, y["t"], disp))
            nz = [v for v in y["income_by_source_cents"].values() if v]
            disp2 = (sum(nz) - y["spending_cents"]) - (y["surplus_cents"] - y["gap_cents"])
            if abs(disp2) > (len(nz) + 2) // 2:
                fail("per_source_display_difference_over_bound", (n, y["t"], disp2, len(nz)))
            cnt["max_group_display_diff_" + str(abs(disp))] += 1
            cnt["max_row_display_diff_" + str(abs(disp2))] += 1
            for k in ("gap_cents", "surplus_cents", "gap_today_dollars_cents", "surplus_today_dollars_cents",
                      "spending_cents", "income_net_cents"):
                if not (isinstance(y[k], int) and 0 <= y[k] <= 2 ** 53 - 1):
                    fail("unsafe_or_negative_integer", (n, y["t"], k, y[k]))
        else:
            if not y["reasons"]:
                fail("not_computable_without_reason", n)
            for k in ("gap_cents", "surplus_cents", "gap_today_dollars_cents", "surplus_today_dollars_cents"):
                if y[k] is not None:
                    fail("not_computable_with_number", (n, y["t"], k))
            if set(y["exact"]) != {"spending"}:
                fail("not_computable_exact_keys", (n, y["t"]))
    if out["completeness"]["state"] == "complete" and not all(y["status"] == "computed" for y in out["years"]):
        fail("complete_with_uncomputed_row", n)
    if out["completeness"]["state"] != "complete" and out["years"] and all(y["status"] == "computed" for y in out["years"]):
        fail("incomplete_but_all_computed", n)
    ci = out["capital_illustration"]
    if ci["feature_flag"] != "off" or ci["displayed"] is not False or ci["state"] != "disabled_by_flag":
        fail("capital_illustration_not_off", n)

    # P5 monthly/annual twin: replace every monthly amount m with annual 12m
    tw = copy.deepcopy(d)
    ok_twin = True
    sp = tw["chapters"]["life"]["spending"]
    if sp["period"] == "monthly":
        if "value" in sp["amount"] and sp["amount"]["value"] * 12 <= 120_000_000:
            sp["amount"]["value"] *= 12
            sp["period"] = "annual"
        elif "value" not in sp["amount"]:
            sp["period"] = "annual"
    for s in tw["chapters"]["income"]["sources"]:
        if s["period"] == "monthly":
            if "value" in s["amount"] and s["amount"]["value"] > 0:
                s["amount"]["value"] *= 12  # max 5,000,000*12 = 60,000,000 = annual max
            s["period"] = "annual"
    if not any(True for _ in VALIDATOR.iter_errors(tw)):
        if diff(model(tw), out):
            fail("monthly_annual_twin_differs", n)
        cnt["twin_checked"] += 1

    # P6 source-order invariance
    if len(d["chapters"]["income"]["sources"]) > 1:
        pm = copy.deepcopy(d)
        random.Random(n).shuffle(pm["chapters"]["income"]["sources"])
        if diff(model(pm), out):
            fail("source_order_changes_output", n)
        cnt["permutation_checked"] += 1

    # P7 unknown != zero (metamorphic): make one known source amount unknown
    srcs = d["chapters"]["income"]["sources"]
    known = [j for j, s in enumerate(srcs) if s["amount"]["status"] in ("estimated", "confirmed")]
    if known and out["window"] is not None:
        j = random.Random(n + 1).choice(known)
        u = copy.deepcopy(d)
        u["chapters"]["income"]["sources"][j]["amount"] = {"status": "unknown"}
        ou = model(u)
        sid = srcs[j]["id"]
        for y0, y1 in zip(out["years"], ou["years"]):
            paid = y0["income_by_source_cents"][sid]
            if paid is not None and paid > 0:
                # the source pays in this year -> must now be null and the year blocked
                if y1["income_by_source_cents"][sid] is not None or y1["status"] == "computed":
                    fail("unknown_amount_became_number", (n, y0["t"]))
            elif paid == 0:
                if y1["income_by_source_cents"][sid] != 0:
                    fail("not_paying_year_changed_by_unknown_amount", (n, y0["t"]))
                if y0["status"] == "computed" and diff(y0, y1):
                    fail("unrelated_computed_year_changed", (n, y0["t"]))
            if y1["status"] == "computed" and y0["status"] != "computed":
                fail("unknown_made_year_computable", (n, y0["t"]))
        cnt["unknown_amount_checked"] += 1

    # P8 unknown spending: every row null, never 0
    if d["chapters"]["life"]["spending"]["amount"]["status"] != "unknown" and out["window"] is not None:
        u = copy.deepcopy(d)
        u["chapters"]["life"]["spending"]["amount"] = {"status": "unknown"}
        ou = model(u)
        if ou["completeness"]["state"] != "incomplete_unknown_spending":
            fail("unknown_spending_state", n)
        for y in ou["years"]:
            if y["spending_cents"] is not None or y["gap_cents"] is not None or y["surplus_cents"] is not None \
                    or y["exact"]["spending"] is not None or "spending_unknown" not in y["reasons"]:
                fail("unknown_spending_became_number", n)
        cnt["unknown_spending_checked"] += 1

    # P9 gross never subtracted: flip one net paying source to gross
    nets = [j for j, s in enumerate(srcs) if s["tax_basis"] == "net"]
    if nets and out["window"] is not None:
        j = nets[0]
        g = copy.deepcopy(d)
        g["chapters"]["income"]["sources"][j]["tax_basis"] = "gross"
        og = model(g)
        sid = srcs[j]["id"]
        for y0, y1 in zip(out["years"], og["years"]):
            if y0["income_by_source_cents"][sid] not in (0,) and y1["status"] == "computed":
                fail("gross_paying_year_computed", (n, y0["t"]))
        cnt["gross_flip_checked"] += 1

    # P10 savings never change a number
    s2 = copy.deepcopy(d)
    s2["chapters"]["savings"] = {}
    o2 = model(s2)
    if diff([{k: v for k, v in y.items()} for y in o2["years"]], out["years"]) or o2["completeness"] != out["completeness"]:
        fail("savings_changed_numbers", n)

print("coverage counters:")
for k, v in sorted(cnt.items()):
    print(f"  {k}: {v}")
print("property failures:")
if not fails:
    print("  none")
for k, v in sorted(fails.items()):
    print(f"  {k}: {v}   e.g. {json.dumps(examples[k], default=str)[:900]}")
json.dump({"n": len(docs), "seed": SEED, "fails": fails, "examples": examples, "counters": cnt},
          open(os.path.join(HERE, "out", f"properties_seed{SEED}_pu{PU}.json"), "w"), indent=1, default=str)
sys.exit(1 if fails else 0)
