"""Clip-rule totality / truth-table / media-state checks (independent of validate.py)."""
import itertools
import json
import sys

FIX = "/home/user/bill/.orchestration/contracts/fixtures/workshop/clip-rules.json"
cr = json.load(open(FIX))
ok = bad = 0


def rec(c, m):
    global ok, bad
    if c:
        ok += 1
        print("  ok  ", m)
    else:
        bad += 1
        print("  FAIL", m)


# §3 of workshop-clip-rules.md, transcribed by hand
SPEC = [("C", "W10", "core_inputs_missing"), ("M", "W06", "missing_income"), ("X", "W08", "tax_basis"),
        ("H", "W09", "household_timing"), ("F", "W07", "funding_gap"), ("none", "W10", "neutral_fallback")]
rec([(p["predicate"], p["clip"], p["selection_reason"]) for p in cr["precedence"]] == SPEC,
    "clip-rules.json precedence == workshop-clip-rules.md §3")


def select(v):
    hits = [(c, r) for (p, c, r) in SPEC[:-1] if v[p]]
    return hits[0] if hits else ("W10", "neutral_fallback")


# totality: every one of the 32 vectors maps to exactly one (clip, reason); the map is a function
table = {row["row"]: row for row in cr["truth_table"]}
rec(sorted(table) == list(range(1, 33)), "truth table has rows 1..32")
seen = set()
for bits in itertools.product([False, True], repeat=5):
    v = dict(zip("CMXHF", bits))
    key = tuple(bits)
    seen.add(key)
    rows = [r for r in cr["truth_table"] if tuple(r["predicates"][k] for k in "CMXHF") == key]
    if len(rows) != 1:
        rec(False, f"vector {key} appears {len(rows)} times")
        continue
    r = rows[0]
    clip, reason = select(v)
    possible_expected = not (v["C"] and v["F"])
    good = (r["possible"] == possible_expected and r["selected_by_precedence"] == clip)
    if r["possible"]:
        good = good and r["expected"]["selected"] == clip and r["expected"]["selection_reason"] == reason
    if not good:
        rec(False, f"row {r['row']} {v}: table says {r.get('expected')} / possible={r['possible']}; spec gives {clip}/{reason}")
rec(len(seen) == 32, "all 32 predicate vectors enumerated, each maps to exactly one (clip, reason)")
imp = sorted(r["row"] for r in cr["truth_table"] if not r["possible"])
rec(imp == [18, 20, 22, 24, 26, 28, 30, 32], f"impossible rows are exactly the C and F rows: {imp}")
print("       proof sketch C => not F: C = (window unknown) or (spending unknown). No window -> no rows -> F false.")
print("       Spending unknown -> D_t null -> no row satisfies condition 1 of §5 -> no computed row -> F false.")

# a total map needs no tie-break: the first true predicate wins, and 'none' is the final else.
rec(len({c for _, c, _ in SPEC}) == 5 and SPEC[0][1] == SPEC[-1][1] == "W10",
    "W10 is used by both the first rule and the fallback; selection_reason distinguishes them")

# §7 media render state, transcribed by hand
def render(selected, locale, avail, build):
    other = "en" if locale == "fr" else "fr"
    st = avail[selected][locale]
    if st == "available":
        rs = "play"
    elif st == "test_media" and build == "local_test":
        rs = "play_test_media_labelled"
    elif avail[selected][other] == "available":
        rs = "other_locale_only"
    else:
        rs = "unavailable"
    release = "fail_test_media_referenced" if build == "production" and any(
        s == "test_media" for c in avail.values() for s in c.values()) else "pass"
    return {"selected": selected, "render_state": rs, "disclosure_shown": True, "substitute_clip": None,
            "release_check": release}


for m in cr["media_state_cases"]:
    got = render(m["selected"], m["locale"], m["availability"], m["build"])
    rec(got == m["expected"], f"{m['case']} {m['title']}: {got['render_state']} / {got['release_check']}")

d = cr["disclosure"]
rec("selected automatically" in d["en"] and "has not reviewed" in d["en"], "disclosure EN states automatic selection and no review by Bill")
print(f"== summary: {ok} ok, {bad} failed")
sys.exit(1 if bad else 0)
