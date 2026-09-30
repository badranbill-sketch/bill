"""F02a mutation check: the faulty runtimes of reviews/F02-math-attempt3.md must fail at least one WM fixture.

Independent of the A6 JavaScript harness (which F02a also runs unmodified; see run_f02a.sh). Here each faulty
reading is injected into the math lane's exact reference model evidence/F02/math/workshop_reference.py by
monkeypatching it in memory (the file is imported read-only and never modified), then every WM fixture listed in
contracts/fixtures/workshop/index.json is recomputed and compared with its `expected` block (full-record equality,
the lane validator's criterion; key order ignored).

Faulty readings (R = required by F02a acceptance; I = informative variant):
  R today_dollars_uses_q          b_j = a_j(1+q_j)^{s_j} instead of a_j(1+i)^{s_j}            (P2-1, case U1)
  I today_dollars_as_nominal      b_j = a_j (no pre-start growth)
  I today_dollars_carried_to_t_R  b_j = a_j(1+i)^{t_R} (carried to retirement, not to the start)
  I today_dollars_one_year_short  b_j = a_j(1+i)^{s_j-1}
  I today_dollars_indexed_at_i    q_j replaced by i after the start for today-dollar sources
  R joint_uses_partner            a joint source's age start/end resolved against the partner's age (P2-2, case U2)
  I joint_uses_younger            ... against the younger of the two ages
  I joint_uses_older              ... against the older of the two ages
  R group_from_rounded_rows       income group = sum of the displayed (rounded) per-source rows       (P3-1 A)
  R deflate_rounded_gap           today-dollar gap/surplus deflated from the displayed (rounded) value (P3-1 B)
("R" for the two P3-1 readings means required for the optional WM39/WM40 pins.)

Exit 0 only if: the unfaulted model reproduces every fixture; each R fault is caught by at least one fixture,
including the fixture written for it; and each R fault is missed by WM01-WM36 alone (the gap F02a closes was real).
Usage: python mutation_check.py [--json out.json]
"""
from __future__ import annotations

import contextlib
import copy
import json
import sys
from fractions import Fraction as Fr
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "F02" / "math"))
import workshop_reference as ref  # noqa: E402

FIX = HERE.parents[1] / "contracts" / "fixtures" / "workshop"
CUR = {"t_R": None}


def load_fixtures():
    index = json.loads((FIX / "index.json").read_text())
    out = []
    for e in index["fixtures"]:
        if e["file"] == "clip-rules.json":
            continue
        out.append(json.loads((FIX / e["file"]).read_text()))
    return out


@contextlib.contextmanager
def patched(obj, name, value):
    orig = getattr(obj, name)
    setattr(obj, name, value)
    try:
        yield
    finally:
        setattr(obj, name, orig)


ORIG_BA = ref.Source.base_amount
ORIG_INIT = ref.Source.__init__
ORIG_OWNER = ref._owner_age
ORIG_GROUP = ref._group


def ba_variant(kind):
    def base_amount(self, s):
        if self.amount_known and s > 0 and self.price_basis == "today_dollars":
            if kind == "q":
                return self.annual_amount * ref.growth(self.q_bp, s)
            if kind == "nominal":
                return self.annual_amount
            if kind == "t_R":
                return self.annual_amount * ref.growth(self.i_bp, CUR["t_R"] if CUR["t_R"] is not None else s)
            if kind == "short":
                return self.annual_amount * ref.growth(self.i_bp, s - 1)
        return ORIG_BA(self, s)
    return base_amount


def init_indexed_at_i(self, src, timing, i_bp, faults=frozenset()):
    ORIG_INIT(self, src, timing, i_bp, faults)
    if self.price_basis == "today_dollars" and self.s_state == "known" and self.s > 0:
        self.q_bp = self.i_bp


def owner_variant(kind):
    def owner_age(owner, timing):
        if owner != "joint":
            return ORIG_OWNER(owner, timing)
        if kind == "partner":
            return ORIG_OWNER("partner", timing)
        a, p = ORIG_OWNER("self", timing), ORIG_OWNER("partner", timing)
        if a[0] and p[0]:
            return True, (min if kind == "younger" else max)(a[1], p[1])
        return a
    return owner_age


def group_from_rounded(vals):
    if not vals:
        return 0
    if any(v is None for v in vals):
        return None
    return sum(ref.round_half_even(v) for v in vals)


def deflate_rounded(out, d):
    """Post-process a conformant record the way a runtime that deflates the displayed gap would."""
    i_bp = int(ref.qty(d["chapters"]["timing"]["inflation_bp"])[1])
    for row in out["years"]:
        if row["status"] == "computed":
            defl = ref.growth(i_bp, row["t"])
            row["gap_today_dollars_cents"] = ref.round_half_even(Fr(row["gap_cents"]) / defl)
            row["surplus_today_dollars_cents"] = ref.round_half_even(Fr(row["surplus_cents"]) / defl)
    return out


FAULTS = [
    # (name, required, target fixture, context factory, output post-processor)
    ("today_dollars_uses_q", True, "WM37", lambda: patched(ref.Source, "base_amount", ba_variant("q")), None),
    ("today_dollars_as_nominal", False, "WM37", lambda: patched(ref.Source, "base_amount", ba_variant("nominal")), None),
    ("today_dollars_carried_to_t_R", False, "WM37", lambda: patched(ref.Source, "base_amount", ba_variant("t_R")), None),
    ("today_dollars_one_year_short", False, "WM37", lambda: patched(ref.Source, "base_amount", ba_variant("short")), None),
    ("today_dollars_indexed_at_i", False, "WM37", lambda: patched(ref.Source, "__init__", init_indexed_at_i), None),
    ("joint_uses_partner", True, "WM38", lambda: patched(ref, "_owner_age", owner_variant("partner")), None),
    ("joint_uses_younger", False, "WM38", lambda: patched(ref, "_owner_age", owner_variant("younger")), None),
    ("joint_uses_older", False, "WM38", lambda: patched(ref, "_owner_age", owner_variant("older")), None),
    ("group_from_rounded_rows", True, "WM39", lambda: patched(ref, "_group", group_from_rounded), None),
    ("deflate_rounded_gap", True, "WM40", lambda: contextlib.nullcontext(), deflate_rounded),
]


def evaluate(d, ctx_factory=None, post=None):
    tim = d["chapters"]["timing"]
    a, r = ref.qty(tim["current_age"]), ref.qty(tim["retirement_age"])
    CUR["t_R"] = int(r[1] - a[1]) if (a[0] and r[0]) else None
    with (ctx_factory() if ctx_factory else contextlib.nullcontext()):
        out = ref.compute(copy.deepcopy(d))
    out = json.loads(json.dumps(out))
    return post(out, d) if post else out


def first_diff(exp, act, p=""):
    if isinstance(exp, dict) and isinstance(act, dict):
        for k in sorted(set(exp) | set(act)):
            if k not in exp or k not in act:
                return f"{p}/{k}: key only in {'actual' if k in act else 'expected'}"
            r = first_diff(exp[k], act[k], f"{p}/{k}")
            if r:
                return r
        return None
    if isinstance(exp, list) and isinstance(act, list):
        if len(exp) != len(act):
            return f"{p}: length {len(exp)} vs {len(act)}"
        for k, (x, y) in enumerate(zip(exp, act)):
            r = first_diff(x, y, f"{p}/{k}")
            if r:
                return r
        return None
    return None if exp == act else f"{p}: expected {json.dumps(exp)} got {json.dumps(act)}"


def main():
    fx = load_fixtures()
    ids = [f["fixture_id"] for f in fx]
    old = {i for i in ids if int(i[2:]) <= 36}
    print(f"fixtures from index.json: {len(fx)} WM fixtures ({ids[0]}..{ids[-1]}); WM01-WM36 subset: {len(old)}")
    fails = []
    base = [f["fixture_id"] for f in fx if evaluate(f["input"]) != f["expected"]]
    print(f"baseline (no fault): {len(base)} mismatches {base}")
    if base:
        fails.append("baseline mismatches")
    results = []
    for name, required, target, ctx, post in FAULTS:
        hits, detail = [], {}
        for f in fx:
            got = evaluate(f["input"], ctx, post)
            if got != f["expected"]:
                hits.append(f["fixture_id"])
                detail[f["fixture_id"]] = first_diff(f["expected"], got)
        hits_old = [h for h in hits if h in old]
        verdict = "CAUGHT" if hits else "MISSED"
        tag = "R" if required else "I"
        print(f"{verdict} [{tag}] {name:30s} by {','.join(hits) or 'none'}; by WM01-WM36 alone: {','.join(hits_old) or 'none'}")
        if target in detail:
            print(f"        {target} first difference: {detail[target]}")
        if required and (not hits or target not in hits or hits_old):
            fails.append(f"{name}: hits={hits} target={target} hits_in_WM01-WM36={hits_old}")
        results.append({"fault": name, "required": required, "target": target, "caught_by": hits,
                        "caught_by_WM01_WM36": hits_old, "target_first_difference": detail.get(target)})
    if "--json" in sys.argv:
        Path(sys.argv[sys.argv.index("--json") + 1]).write_text(json.dumps(results, indent=1) + "\n")
    print(f"summary: {'PASS' if not fails else 'FAIL'}; required faults caught by their fixture and missed by WM01-WM36 alone"
          + ("" if not fails else f"; problems: {fails}"))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
