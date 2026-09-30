"""Demo for the rounding-order coverage gap: two display faults that pass all 36 WM fixtures and
all clip-rule cases (see negative_controls.py) but change displayed cents on valid inputs."""
import copy, json, os, sys, itertools
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from model import model, semantic_errors
from gen import VALIDATOR
base = json.load(open("/home/user/bill/.orchestration/contracts/fixtures/workshop/WM17-rounding-half-even.json"))["input"]
# Demo A: two sources that each tie at .5 in year 1 (1,000,050 x 1.01 = 1,010,050.5)
a = copy.deepcopy(base)
s = a["chapters"]["income"]["sources"][0]
s1 = dict(copy.deepcopy(s), id="src-1", amount={"status": "estimated", "value": 1000050})
s2 = dict(copy.deepcopy(s), id="src-2", amount={"status": "estimated", "value": 1000050})
a["chapters"]["income"]["sources"] = [s1, s2]
a["chapters"]["life"]["spending"]["amount"] = {"status": "estimated", "value": 3000000}
assert not list(VALIDATOR.iter_errors(a)) and not semantic_errors(a)
good, bad = model(a), model(a, frozenset(["round_then_sum"]))
y, yb = good["years"][1], bad["years"][1]
print("Demo A (valid input: WM17 with two 1,000,050 sources, spending 3,000,000/yr), t=1:")
print(f"  per-source rows {y['income_by_source_cents']}; exact total {y['exact']['income_compared']}")
print(f"  conformant income_net_cents = {y['income_net_cents']}   round-then-sum fault = {yb['income_net_cents']}")
# Demo B: deflated gap from the rounded gap vs from the exact gap -- search a small space
found = None
for sv, pv, ibp in itertools.product(range(2000001, 2000200), (1000033, 1000077), (100, 150, 250, 333)):
    b = copy.deepcopy(base)
    src = copy.deepcopy(base["chapters"]["income"]["sources"][0])
    src["amount"] = {"status": "estimated", "value": pv}
    src["escalation_bp"] = {"status": "zero", "value": 0}
    b["chapters"]["income"] = {"coverage": "all_known_sources_listed", "sources": [src]}
    b["chapters"]["life"]["spending"]["amount"] = {"status": "estimated", "value": sv}
    b["chapters"]["timing"]["inflation_bp"] = {"status": "estimated", "value": ibp}
    g, f = model(b), model(b, frozenset(["deflate_rounded"]))
    for y1, y2 in zip(g["years"], f["years"]):
        if y1["gap_today_dollars_cents"] != y2["gap_today_dollars_cents"]:
            found = (sv, pv, ibp, y1["t"], y1["exact"]["gap"], y1["gap_cents"], y1["gap_today_dollars_cents"], y2["gap_today_dollars_cents"]); break
    if found: break
if found:
    sv, pv, ibp, t, ex, gc, good_d, bad_d = found
    print(f"Demo B (valid input: WM17 timing, one net already-received source {pv}/yr with q=0, annual spending {sv}, inflation {ibp} bp), t={t}:")
    print(f"  exact gap {ex} -> gap_cents {gc}; conformant gap_today_dollars_cents = {good_d}; deflate-the-rounded-gap fault = {bad_d}")
