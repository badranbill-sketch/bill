"""§9 bound claims: recompute the extremes by hand (ints) and by running the model on the extreme
valid inputs; confirm every rounded output is a JS-safe integer."""
import copy, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from model import model, semantic_errors
from gen import VALIDATOR
def rhe(p, q):
    n, r = divmod(p, q); return n + (1 if (2*r > q or (2*r == q and n % 2)) else 0)
SAFE = 2**53 - 1
claims = {"D_t max": 2_000_944_911_742, "one P_j,t max": 1_000_472_455_871,
          "group total max": 8_003_779_646_969, "C_R (r=0) max": 21_938_105_946_171}
hand = {"D_t max": rhe(120_000_000 * 11**102, 10**102),
        "one P_j,t max": rhe(60_000_000 * 11**102, 10**102),
        "group total max": rhe(8 * 60_000_000 * 11**102, 10**102),
        "C_R (r=0) max": rhe(sum(120_000_000 * 11**t * 10**(102 - t) for t in range(43, 103)), 10**102)}
bad = 0
for k in claims:
    ok = claims[k] == hand[k] and hand[k] <= SAFE
    bad += not ok
    print(f"  {'ok  ' if ok else 'FAIL'} {k}: contract {claims[k]:,}  hand {hand[k]:,}  safe={hand[k] <= SAFE}")
# extreme valid document through the model: A=18, R=61, H=60, i=10%, 8 today-dollar sources at 10%
d = json.load(open("/home/user/bill/.orchestration/contracts/fixtures/workshop/WM02-geometric-growth-closed-form.json"))["input"]
d = copy.deepcopy(d)
t = d["chapters"]["timing"]
t.update({"current_age": {"status": "estimated", "value": 18}, "retirement_age": {"status": "estimated", "value": 61},
          "planning_horizon_years": {"status": "estimated", "value": 60}, "inflation_bp": {"status": "estimated", "value": 1000},
          "capital_illustration_return_bp": {"status": "zero", "value": 0}})
d["chapters"]["life"]["spending"] = {"amount": {"status": "estimated", "value": 120_000_000}, "period": "annual",
                                     "tax_basis": "after_tax", "price_basis": "today_dollars", "unit": "household"}
# variant 1: no income -> max D and C_R
v1 = copy.deepcopy(d); v1["chapters"]["income"] = {"coverage": "no_planned_income", "sources": []}
# variant 2: 8 sources starting at age 100 (s=82), today dollars, q = 10%  -> max P and group
v2 = copy.deepcopy(d)
v2["chapters"]["income"] = {"coverage": "all_known_sources_listed", "sources": [
    {"id": f"src-{j}", "kind": "other", "owner": "self", "amount": {"status": "estimated", "value": 60_000_000}, "period": "annual",
     "tax_basis": "net", "price_basis": "today_dollars", "start": {"reference": "age", "point": {"status": "estimated", "value": 100}},
     "escalation_bp": {"status": "estimated", "value": 1000}, "dependability": "scheduled"} for j in range(1, 9)]}
for name, doc in (("no income", v1), ("8 max sources", v2)):
    errs = [e.message for e in VALIDATOR.iter_errors(doc)] + semantic_errors(doc)
    o = model(doc)
    vals = []
    for y in o["years"]:
        for k in ("spending_cents", "income_net_cents", "gap_cents", "surplus_cents", "gap_today_dollars_cents", "surplus_today_dollars_cents"):
            if y[k] is not None: vals.append((y[k], k, y["t"]))
        vals += [(v, "src", y["t"]) for v in y["income_by_source_cents"].values() if v is not None]
    cr = o["capital_illustration"]["reference_if_enabled"]["C_R_cents"]
    if cr is not None: vals.append((cr, "C_R", None))
    mx = max(vals)
    print(f"  {'ok  ' if not errs and mx[0] <= SAFE else 'FAIL'} model on extreme input '{name}' (valid={not errs}): max output {mx[0]:,} ({mx[1]}, t={mx[2]}); C_R={cr}")
    bad += bool(errs) or mx[0] > SAFE
sys.exit(1 if bad else 0)
