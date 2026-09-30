"""F02a (split from F02, decision D-072): additive workshop conformance fixtures WM37-WM40.

Why: reviews/F02-math-attempt3.md found two normative rules of workshop-math.md that no fixture pinned
(F02-MATH3-P2-1: the today-dollar pre-start factor (1+i)^{s_j}; F02-MATH3-P2-2: a `joint` source's
age-based start/end resolves against the participant's age), plus two display-rounding readings (P3-1).
The contract text is unchanged; these fixtures only pin what it already says.

Run (stdlib only; the math-lane venv works too):
  python compute_f02a_fixtures.py          -> writes WM37..WM40 and appends their 4 entries to index.json
  python compute_f02a_fixtures.py --check  -> regenerates in memory; exits 1 if any fixture file on disk differs

Two independent paths guard every expected value, as in the lane generator:
  1. workshop_reference.compute(), the math lane's exact-rational reference model (imported read-only);
  2. hand arithmetic written below from workshop-math.md s2-s5 and s9, using the lane's independent helpers
     compute_fixtures.g() (growth factor from the definition) and compute_fixtures.rhe() (half-even rounding,
     a different code path from ref.round_half_even), plus literal hand values. A fixture is written only if
     both paths agree.
The input builders come from evidence/F02/math/compute_fixtures.py (imported, not modified), so the fixture
format is byte-compatible with WM01-WM36. This script never writes WM01-WM36 or clip-rules.json. index.json
is rewritten only as "the 37 entries compute_fixtures.py generates, byte for byte, followed by the 4 new
entries"; --check verifies both the unchanged prefix and the appended entries.
"""
from __future__ import annotations

import contextlib
import io
import json
import sys
from fractions import Fraction as Fr
from pathlib import Path

HERE = Path(__file__).resolve().parent
MATH = HERE.parent / "F02" / "math"
sys.path.insert(0, str(MATH))
import workshop_reference as ref  # noqa: E402
import compute_fixtures as cf  # noqa: E402  (builders and independent helpers; its main() is not run)
from compute_fixtures import AGE, EST, RECV, check, col, doc, g, rhe, src, srccol  # noqa: E402

FIX = cf.FIX
TOL = cf.TOL
F02A = []


def fixture(fid, slug, title, covers, purpose):
    def deco(fn):
        F02A.append((fid, slug, title, covers, purpose, fn))
        return fn
    return deco


def pay(a, s, q_bp, i_bp, t, price_basis="today_dollars", e=None):
    """Hand P_j,t from workshop-math.md s4, independent of workshop_reference: b_j = a_j(1+i)^{s_j} for a
    today-dollar amount with s_j > 0 (a_j otherwise), then b_j(1+q_j)^{t-s_j} for s_j <= t < e_j."""
    if t < s or (e is not None and t >= e):
        return Fr(0)
    b = Fr(a) * (g(i_bp, s) if (price_basis == "today_dollars" and s > 0) else 1)
    return b * g(q_bp, t - s)


# ---------------------------------------------------------------- WM37 (F02-MATH3-P2-1)
@fixture("WM37", "today-dollar-pre-start-factor",
         "Today-dollar amounts carried to their start at i, not at their own escalation",
         ["WK02"],
         "A today-dollar amount that starts at s_j > 0 is carried to its start year at the inflation scenario i "
         "(b_j = a_j(1+i)^{s_j}, workshop-math.md s4) and escalates at its own q_j only from s_j on. Three net "
         "today-dollar sources with q_j != i: q = 0 starting at t_R, q > i starting inside the window, 0 < q < i "
         "starting before t_R. A runtime that grows the amount before its start at q_j instead of i, carries it only "
         "to t_R, by one year less, or not at all, or indexes it at i after the start, fails. Pins F02-MATH3-P2-1.")
def wm37():
    i = 200
    d = doc(EST(6000000), period="annual", A=EST(55), R=EST(65), H=5, i=i, sources=[
        src("src-1", "workplace_pension", EST(2400000), "annual", "net", "today_dollars", AGE(65), q_bp=0),
        src("src-2", "other", EST(600000), "annual", "net", "today_dollars", AGE(67), q_bp=300),
        src("src-3", "workplace_pension", EST(1200000), "annual", "net", "today_dollars", AGE(60), q_bp=100)])
    out = ref.compute(d)
    T = list(range(10, 15))
    check(out["window"]["t_R"] == 10 and col(out, "t") == T, "WM37 t_R = 65 - 55 = 10; window t = 10..14")
    # s_j = start age - A (self): 65 - 55 = 10 (= t_R), 67 - 55 = 12 (inside W), 60 - 55 = 5 (before t_R)
    srcs = {"src-1": (2400000, 10, 0), "src-2": (600000, 12, 300), "src-3": (1200000, 5, 100)}
    P = {sid: [pay(a, s, q, i, t) for t in T] for sid, (a, s, q) in srcs.items()}
    for sid, (a, s, q) in srcs.items():
        check(srccol(out, sid) == [rhe(x) for x in P[sid]],
              f"WM37 {sid}: P_t = {a:,} x 1.02^{s} x (1 + {q}bp)^(t-{s}) for t >= {s} (s4, b_j carried at i)")
    # literal hand values (exact decimal expansions of the powers)
    check(g(200, 10) == Fr("1.21899441999475713024"), "WM37 hand: 1.02^10 = 1.21899441999475713024")
    check(ref.exact_str(P["src-1"][0]) == "2925586.607987417112576" and srccol(out, "src-1") == [2925587] * 5,
          "WM37 hand: P_1 = 2,400,000 x 1.21899441999475713024 = 2,925,586.607987417112576 -> 2,925,587 in every "
          "window year (q = 0); growing at q before the start would give 2,400,000")
    check(ref.exact_str(P["src-2"][2]) == "760945.0767375271909810176" and srccol(out, "src-2")[:3] == [0, 0, 760945],
          "WM37 hand: P_2 = 0 at t = 10, 11 (t < s = 12); P_2,12 = 600,000 x 1.02^12 = 760,945.0767... -> 760,945 "
          "(growing at q = 3% before the start would give 600,000 x 1.03^12 = 855,456.53... -> 855,457)")
    check(ref.exact_str(P["src-3"][0]) == "1392480.024342816288384" and srccol(out, "src-3")[0] == 1392480,
          "WM37 hand: P_3,10 = 1,200,000 x 1.02^5 x 1.01^5 = 1,392,480.0243... -> 1,392,480 "
          "(growing at q = 1% from t = 0 would give 1,200,000 x 1.01^10 = 1,325,546.55... -> 1,325,547)")
    D = [Fr(6000000) * g(i, t) for t in T]
    tot = [sum((P[sid][k] for sid in srcs), Fr(0)) for k in range(len(T))]
    check(col(out, "spending_cents") == [rhe(x) for x in D], "WM37 D_t = 6,000,000 x 1.02^t (s3)")
    check(col(out, "income_net_cents") == [rhe(x) for x in tot], "WM37 I^net_t = rounded exact sum of the three P_j,t")
    check(col(out, "gap_cents") == [rhe(D[k] - tot[k]) for k in range(len(T))] and all(x > 0 for x in col(out, "gap_cents")),
          "WM37 G_t = D_t - sum P_j,t > 0 in every window year (s5)")
    check([y["exact"]["gap"] for y in out["years"]] == [ref.exact_str(D[k] - tot[k]) for k in range(len(T))],
          "WM37 exact gap strings equal the hand closed form character for character")
    check(col(out, "gap_today_dollars_cents") == [rhe((D[k] - tot[k]) / g(i, T[k])) for k in range(len(T))],
          "WM37 today-dollar gap = exact G_t / 1.02^t")
    check(out["completeness"]["state"] == "complete" and out["flags"] == [] and out["clip"]["selected"] == "W07",
          "WM37 complete; no flag; W07 funding_gap")
    return d, out, [
        "hand: s_j = start age - A for self-owned sources: 10, 12, 5",
        "b_j = a_j(1+i)^{s_j} (s4): 2,400,000 x 1.02^10; 600,000 x 1.02^12; 1,200,000 x 1.02^5",
        "P_j,t = b_j(1+q_j)^{t-s_j} for t >= s_j: q = 0, 3%, 1%",
        "hand: P_1 = 2,925,586.607987417112576 -> 2,925,587 (growth at q before the start: 2,400,000; gap overstated by 525,587 cents a year)",
        "hand: P_2,12 = 760,945.0767... -> 760,945 (growth at q: 855,457); P_3,10 = 1,392,480.0243... -> 1,392,480 (growth at q: 1,325,547)",
    ]


# ---------------------------------------------------------------- WM38 (F02-MATH3-P2-2)
@fixture("WM38", "joint-owner-participant-age",
         "Joint-owned age start and end resolve against the participant's age",
         ["WK02"],
         "A `joint` source's age-based start and end fall at N - A, the participant's age, never the partner's "
         "(workshop-math.md s2; workshop-inputs.md s5 `joint` uses self). The partner is 5 years younger, so the "
         "partner-age reading moves the joint start from t = 5 to t = 10 (outside the window) and the joint end from "
         "t = 4 to t = 9. Retirement years coincide (H false), so only the timing reading changes the record. "
         "Pins F02-MATH3-P2-2.")
def wm38():
    hh = {"partner_current_age": EST(55), "partner_retirement_age": EST(57)}
    d = doc(EST(4800000), period="annual", A=EST(60), R=EST(62), H=6, i=0, household=hh, sources=[
        src("src-1", "annuity", EST(1200000), "annual", "net", "start_year_dollars", AGE(65), owner="joint"),
        src("src-2", "other", EST(600000), "annual", "net", "start_year_dollars", RECV, owner="joint", end=AGE(64))])
    out = ref.compute(d)
    T = list(range(2, 8))
    check(out["window"]["t_R"] == 2 and col(out, "t") == T, "WM38 t_R = 62 - 60 = 2; window t = 2..7")
    # joint uses the participant's age A = 60: start 65 - 60 = 5; end 64 - 60 = 4 (exclusive)
    p1 = [pay(1200000, 5, 0, 0, t, "start_year_dollars") for t in T]
    p2 = [pay(600000, 0, 0, 0, t, "start_year_dollars", e=4) for t in T]
    check(srccol(out, "src-1") == [0, 0, 0, 1200000, 1200000, 1200000] == [rhe(x) for x in p1],
          "WM38 joint start at age 65 -> s = 65 - 60 = 5: 0 at t = 2..4, 1,200,000 at t = 5..7 "
          "(partner reading s = 65 - 55 = 10: 0 in every window year)")
    check(srccol(out, "src-2") == [600000, 600000, 0, 0, 0, 0] == [rhe(x) for x in p2],
          "WM38 joint end at age 64 -> e = 64 - 60 = 4 (exclusive): 600,000 at t = 2, 3, then 0 "
          "(partner reading e = 64 - 55 = 9: 600,000 in every window year)")
    check(col(out, "gap_cents") == [4200000, 4200000, 4800000, 3600000, 3600000, 3600000],
          "WM38 G = 4,800,000 - 600,000 = 4,200,000 (t = 2, 3); 4,800,000 (t = 4); 4,800,000 - 1,200,000 = 3,600,000 "
          "(t = 5..7) (partner reading: 4,200,000 in every year)")
    check([y["partner_age"] for y in out["years"]] == [57, 58, 59, 60, 61, 62] and col(out, "age") == [62, 63, 64, 65, 66, 67],
          "WM38 rows carry partner_age 55 + t (household present, partner age known)")
    check(out["clip"]["predicates"]["H"] is False and out["clip"]["selected"] == "W07" and out["flags"] == [],
          "WM38 partner retirement index 57 - 55 = 2 = t_R: H false, no flag (the partner reading would add "
          "horizon_shorter_than_timeline, s = 10 >= t_R + H = 8); W07")
    check(out["completeness"]["state"] == "complete", "WM38 complete")
    return d, out, [
        "hand: joint uses the participant's age (s2): s = 65 - 60 = 5, e = 64 - 60 = 4",
        "hand: G = 4,200,000 (t=2,3), 4,800,000 (t=4), 3,600,000 (t=5..7)",
        "partner-age reading (s = 10, e = 9) would give G = 4,200,000 in every year and raise horizon_shorter_than_timeline",
    ]


# ---------------------------------------------------------------- WM39 (F02-MATH3-P3-1, demo A reading)
@fixture("WM39", "group-total-from-exact-values",
         "Income group total rounded once from exact values, not summed from rounded rows",
         ["WK01", "WK02"],
         "Two sources of exactly 1,010,050.5 cents in t = 1 each display 1,010,050 (half-even), yet the net group "
         "is the exact sum 2,020,101, rounded once (workshop-math.md s5, s9): a group summed from the displayed "
         "per-source rows (2,020,100), or a gap taken from them (1,009,900), fails. Pins F02-MATH3-P3-1 (group reading).")
def wm39():
    d = doc(EST(3000000), period="annual", A=EST(70), R=EST(70), H=3, i=100, sources=[
        src("src-1", "annuity", EST(1000050), "annual", "net", "start_year_dollars", RECV, q_bp=100),
        src("src-2", "annuity", EST(1000050), "annual", "net", "start_year_dollars", RECV, q_bp=100)])
    out = ref.compute(d)
    y1 = out["years"][1]
    p = Fr(1000050) * g(100, 1)
    check(p == Fr("1010050.5") and rhe(p) == 1010050, "WM39 hand: P_j,1 = 1,000,050 x 1.01 = 1,010,050.5 -> 1,010,050 (tie to even)")
    check(y1["income_by_source_cents"] == {"src-1": 1010050, "src-2": 1010050}, "WM39 t=1 per-source rows 1,010,050 each")
    check(y1["income_net_cents"] == 2020101 == rhe(2 * p) and 2 * rhe(p) == 2020100,
          "WM39 t=1 I^net = round(2,020,101 exact) = 2,020,101; the sum of the displayed rows would be 2,020,100")
    check(y1["exact"]["gap"] == "1009899" and y1["gap_cents"] == 1009899,
          "WM39 t=1 G = 3,030,000 - 2,020,101 = 1,009,899 (from the rounded rows it would be 1,009,900)")
    check(col(out, "income_net_cents") == [2000100, 2020101, 2040302], "WM39 I^net = 2,000,100; 2,020,101; round(2,040,302.01)")
    check(out["completeness"]["state"] == "complete" and out["clip"]["selected"] == "W07", "WM39 complete; W07")
    return d, out, [
        "hand: 1,000,050 x 1.01 = 1,010,050.5 -> 1,010,050 per row (half-even)",
        "group = round(2 x 1,010,050.5) = 2,020,101, not 1,010,050 + 1,010,050 = 2,020,100",
        "gap = 3,030,000 - 2,020,101 = 1,009,899 exactly",
    ]


# ---------------------------------------------------------------- WM40 (F02-MATH3-P3-1, demo B reading)
@fixture("WM40", "today-dollar-display-from-exact-gap",
         "Today-dollar gap deflated from the exact gap, not from the rounded gap",
         ["WK01", "WK02"],
         "In t = 2 the exact gap is 1,060,374.030225; deflated by 1.015^2 it is 1,029,264.5104... -> 1,029,265. "
         "Deflating the displayed (rounded) gap 1,060,374 gives 1,029,264.4810... -> 1,029,264, which is double "
         "rounding (workshop-math.md s5 today-dollar display, s9). Pins F02-MATH3-P3-1 (deflation reading).")
def wm40():
    i = 150
    d = doc(EST(2000001), period="annual", A=EST(70), R=EST(70), H=3, i=i, sources=[
        src("src-1", "annuity", EST(1000077), "annual", "net", "start_year_dollars", RECV, q_bp=0)])
    out = ref.compute(d)
    y2 = out["years"][2]
    G = Fr(2000001) * g(i, 2) - 1000077
    check(g(i, 2) == Fr("1.030225") and G == Fr("1060374.030225"), "WM40 hand: 1.015^2 = 1.030225; G_2 = 2,060,451.030225 - 1,000,077 = 1,060,374.030225")
    check(y2["exact"]["gap"] == "1060374.030225" and y2["gap_cents"] == 1060374, "WM40 t=2 exact gap string and displayed gap 1,060,374")
    check(rhe(G / g(i, 2)) == 1029265 and y2["gap_today_dollars_cents"] == 1029265,
          "WM40 t=2 today-dollar gap = round(1,060,374.030225 / 1.030225) = round(1,029,264.5104...) = 1,029,265")
    check(rhe(Fr(1060374) / g(i, 2)) == 1029264,
          "WM40 double-rounding contrast: round(1,060,374 / 1.030225) = round(1,029,264.4810...) = 1,029,264 (not conformant)")
    check(col(out, "gap_today_dollars_cents") == [rhe((Fr(2000001) * g(i, t) - 1000077) / g(i, t)) for t in range(3)],
          "WM40 every today-dollar gap is the exact G_t / 1.015^t, rounded once")
    check(out["completeness"]["state"] == "complete" and out["clip"]["selected"] == "W07", "WM40 complete; W07")
    return d, out, [
        "hand: G_2 = 2,000,001 x 1.030225 - 1,000,077 = 1,060,374.030225",
        "today-dollar G_2 = 1,060,374.030225 / 1.030225 = 1,029,264.5104... -> 1,029,265",
        "from the rounded gap: 1,060,374 / 1.030225 = 1,029,264.4810... -> 1,029,264 (double rounding, forbidden by s9)",
    ]


# ---------------------------------------------------------------- output
def render():
    """Return (files, base_texts): the 4 new fixture texts plus the appended index.json text, and the texts that
    compute_fixtures.render_all() generates for WM01-WM36, clip-rules.json and index.json (unchanged)."""
    with contextlib.redirect_stdout(io.StringIO()):
        base_texts = cf.render_all()  # lane generator, in memory only; its own checks run and must pass
    base_index = json.loads(base_texts["index.json"])
    have = {e["fixture_id"] for e in base_index["fixtures"]}
    files, entries = {}, []
    cf.log("== F02a math fixtures (additive)")
    for fid, slug, title, covers, purpose, fn in F02A:
        assert fid not in have, f"{fid} already generated by compute_fixtures.py"
        d, out, independent = fn()
        check(not ref.semantic_errors(d), f"{fid} input passes semantic rules")
        name = f"{fid}-{slug}.json"
        files[name] = {
            "fixture_id": fid, "title": title, "contract_version": "1.0", "covers": covers,
            "purpose": purpose, "input": d, "expected": out,
            "independent_checks": independent, "tolerance": TOL,
        }
        entries.append({"fixture_id": fid, "file": name, "title": title, "covers": covers,
                        "selected_clip": out["clip"]["selected"],
                        "completeness_state": out["completeness"]["state"]})
    index = dict(base_index)
    index["fixtures"] = base_index["fixtures"] + entries  # append only: the 37 generated entries stay first
    files["index.json"] = index
    texts = {k: json.dumps(v, indent=1, ensure_ascii=False) + "\n" for k, v in files.items()}
    return texts, base_texts


def main():
    texts, base_texts = render()
    new_names = sorted(k for k in texts if k != "index.json")
    if "--check" in sys.argv:
        bad = [k for k, v in texts.items() if not (FIX / k).exists() or (FIX / k).read_text() != v]
        unchanged = [k for k in base_texts if k != "index.json"]
        bad_base = [k for k in unchanged if not (FIX / k).exists() or (FIX / k).read_text() != base_texts[k]]
        expected_names = set(unchanged) | set(texts)
        extra = sorted(p.name for p in FIX.glob("*.json") if p.name not in expected_names)
        cf.log(f"== check F02a: {len(texts)} files regenerated (4 fixtures + appended index.json); differing: {bad or 'none'}")
        cf.log(f"== check lane: {len(unchanged)} WM01-WM36 + clip-rules.json files regenerate byte for byte from "
               f"compute_fixtures.render_all(); differing: {bad_base or 'none'}; unexpected files: {extra or 'none'}")
        sys.exit(1 if bad or bad_base or extra else 0)
    # Append-only guard: index.json on disk must be exactly what compute_fixtures.py generates (first run) or
    # exactly this script's output (re-run). Anything else means someone else changed it: stop, do not clobber.
    on_disk = (FIX / "index.json").read_text()
    if on_disk not in (base_texts["index.json"], texts["index.json"]):
        cf.log("== refusing to write: index.json on disk is neither the lane-generated index nor the F02a-appended index")
        sys.exit(1)
    for k in new_names + ["index.json"]:
        (FIX / k).write_text(texts[k])
    cf.log(f"== wrote {len(new_names)} fixtures {new_names} and appended {len(new_names)} entries to index.json in {FIX}")


if __name__ == "__main__":
    main()
