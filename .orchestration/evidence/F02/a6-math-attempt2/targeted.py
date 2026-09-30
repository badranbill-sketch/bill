"""Targeted edge cases not pinned by any fixture: compare the independent model with the author's
reference (black box) and record which contract sentence decides each case."""
import copy, importlib.util, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from model import model, semantic_errors
from run_fixtures import diff
from gen import VALIDATOR
spec = importlib.util.spec_from_file_location("wref", "/home/user/bill/.orchestration/evidence/F02/math/workshop_reference.py")
wref = importlib.util.module_from_spec(spec); spec.loader.exec_module(wref)
FIX = "/home/user/bill/.orchestration/contracts/fixtures/workshop"
base = json.load(open(f"{FIX}/WM26-start-point-unknown.json"))["input"]   # A=60 R=62 H=4 i=0, spend 48,000/yr
def src(id_, **kw):
    s = {"id": id_, "kind": "workplace_pension", "owner": "self", "amount": {"status": "estimated", "value": 1200000},
         "period": "annual", "tax_basis": "net", "price_basis": "start_year_dollars", "start": {"reference": "already_receiving"},
         "escalation_bp": {"status": "zero", "value": 0}, "dependability": "scheduled"}
    s.update(kw); return s
def doc(timing=None, sources=None, coverage="all_known_sources_listed", spending=None, household=None):
    d = copy.deepcopy(base)
    if timing: d["chapters"]["timing"].update(timing)
    if household is not None: d["chapters"]["timing"]["household"] = household
    if sources is not None: d["chapters"]["income"]["sources"] = sources
    d["chapters"]["income"]["coverage"] = coverage
    if spending: d["chapters"]["life"]["spending"]["amount"] = spending
    return d
U = {"status": "unknown"}
E = lambda v: {"status": "estimated", "value": v}
cases = {
 "A and R both unknown": doc(timing={"current_age": U, "retirement_age": U}, sources=[src("src-1")]),
 "A unknown + spending unknown + not answered": doc(timing={"current_age": U}, sources=[], coverage="not_answered", spending=U),
 "unknown-amount source starting after window (s=8 >= t_R+H=6)": doc(sources=[src("src-1"), src("src-2", amount=U, start={"reference": "age", "point": E(68)})]),
 "zero-amount source starting after window": doc(sources=[src("src-1"), src("src-2", amount={"status": "zero", "value": 0}, start={"reference": "age", "point": E(68)})]),
 "zero-amount gross source": doc(sources=[src("src-1"), src("src-2", amount={"status": "zero", "value": 0}, tax_basis="gross")]),
 "zero-amount rental labelled scheduled": doc(sources=[src("src-1"), src("src-2", kind="rental", amount={"status": "zero", "value": 0})]),
 "zero-amount uncertain source": doc(sources=[src("src-1"), src("src-2", dependability="uncertain", amount={"status": "zero", "value": 0})]),
 "null member of net group": doc(sources=[src("src-1"), src("src-2", amount=U)]),
 "partner A known, partner R unknown": doc(sources=[src("src-1")], household={"partner_current_age": E(55), "partner_retirement_age": U}),
 "end <= 0 with unknown start": doc(sources=[src("src-1"), src("src-2", start={"reference": "age", "point": U}, end={"reference": "year_index", "point": E(1)})]),
 "year-index end unknown, start resolved": doc(sources=[src("src-1"), src("src-2", start={"reference": "year_index", "point": E(3)}, end={"reference": "year_index", "point": U})]),
 "partner retirement index beyond window": doc(sources=[src("src-1")], household={"partner_current_age": E(50), "partner_retirement_age": E(60)}),
}
for name, d in cases.items():
    se = semantic_errors(d); ve = [e.message for e in VALIDATOR.iter_errors(d)]
    if se or ve:
        print(f"!! {name}: invalid input {se} {ve[:1]}"); continue
    a = model(d); b = wref.compute(copy.deepcopy(d)); dd = diff(a, b)
    print(f"== {name}: {'AGREE' if not dd else 'DISAGREE ' + str(dd[:3])}")
    print(f"   state={a['completeness']['state']} reasons={a['completeness']['reasons']} flags={a['flags']} clip={a['clip']['selected']}/{a['clip']['selection_reason']}")
    if a["years"]:
        y = a["years"][0]
        print(f"   row t={y['t']}: net={y['income_net_cents']} by_source={y['income_by_source_cents']} partner_age={y.get('partner_age', 'absent')} status={y['status']} reasons={y['reasons']}")
