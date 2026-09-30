"""Schema checks run by A6 (attempt 2) with Python jsonschema 4.26 (Draft 2020-12).
  * metaschema validity
  * 5 valid examples + every fixture input accepted (schema + independent XF-04..06)
  * 27 invalid examples rejected for the rule named in their .why.txt (keyword, path, value, message),
    and with NO unrelated error
  * exhaustive sweeps of the enumerated XF-01 / XF-02 / XF-03 clauses against the direct comparison
  * extra adversarial documents
"""
import copy
import glob
import json
import os
import sys

import jsonschema

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from model import semantic_errors  # noqa: E402

C = "/home/user/bill/.orchestration/contracts"
SCHEMA = json.load(open(f"{C}/workshop-inputs.schema.json"))
V = jsonschema.Draft202012Validator(SCHEMA)
fails = 0
oks = 0


def rec(ok, msg):
    global fails, oks
    if ok:
        oks += 1
        print("  ok  ", msg)
    else:
        fails += 1
        print("  FAIL", msg)


def ptr(err):
    return "".join("/" + str(p) for p in err.absolute_path)


def errs(doc):
    return sorted(((e.validator, ptr(e), json.dumps(e.validator_value), e.message) for e in V.iter_errors(doc)),
                  key=lambda x: (x[1], x[0]))


def strict_load(path):
    def bad(c):
        raise ValueError(f"non-JSON constant {c}")
    return json.loads(open(path).read(), parse_constant=bad)


print("== metaschema")
try:
    jsonschema.Draft202012Validator.check_schema(SCHEMA)
    rec(True, "schema valid against the 2020-12 metaschema")
except jsonschema.SchemaError as ex:
    rec(False, f"metaschema: {ex.message}")

print("== valid examples")
for f in sorted(glob.glob(f"{C}/examples/valid/workshop-inputs/*.json")):
    d = strict_load(f)
    e = errs(d)
    s = semantic_errors(d)
    rec(not e and not s, f"{os.path.basename(f)} schema_errors={len(e)} semantic={s}")

print("== fixture inputs")
n_fx = 0
for f in sorted(glob.glob(f"{C}/fixtures/workshop/WM*.json")):
    d = strict_load(f)["input"]
    e, s = errs(d), semantic_errors(d)
    n_fx += 1
    if e or s:
        rec(False, f"{os.path.basename(f)} {e[:2]} {s}")
cr = strict_load(f"{C}/fixtures/workshop/clip-rules.json")
cr_inputs = [r["input"] for r in cr["truth_table"] if r.get("input")] + [c["input"] for c in cr["supplementary_cases"]]
bad_cr = [(i, errs(x), semantic_errors(x)) for i, x in enumerate(cr_inputs) if errs(x) or semantic_errors(x)]
rec(not bad_cr, f"{n_fx} WM inputs + {len(cr_inputs)} clip-rule inputs valid (schema + XF-04..06); invalid: {bad_cr[:2]}")

print("== invalid examples")
report = []
for f in sorted(glob.glob(f"{C}/examples/invalid/workshop-inputs/*.json")):
    name = os.path.basename(f)[:-5]
    why = {}
    for line in open(f[:-5] + ".why.txt"):
        if ":" in line:
            k, v = line.split(":", 1)
            why[k.strip()] = v.strip()
    raw = open(f).read()
    strict_ok = True
    try:
        strict_load(f)
    except ValueError as ex:
        strict_ok = False
    doc = json.loads(raw)  # lenient (Python admits NaN / Infinity)
    e = errs(doc)
    s = semantic_errors(doc)
    layer = why.get("layer")
    item = {"example": name, "layer": layer, "strict_parse_ok": strict_ok, "schema_errors": e, "semantic_errors": s}
    if layer == "schema":
        kw, path = why["expect_keyword"], why["expect_path"]
        match = [x for x in e if x[0] == kw and x[1] == path]
        ok = bool(match) and strict_ok
        if "expect_validator_value" in why:
            ok = ok and any(json.loads(x[2]) == json.loads(why["expect_validator_value"]) for x in match)
        if "expect_message_contains" in why:
            needle = why["expect_message_contains"].strip("'")
            ok = ok and any(needle in x[3] for x in match)
        unrelated = [x for x in e if not (x[0] == kw and x[1] == path)]
        item["unrelated"] = unrelated
        rec(ok and not unrelated, f"{name}: {why['rule'].split(' - ')[0]} expect {kw}@{path or '/'} -> got {[(x[0], x[1]) for x in e]}")
    elif layer == "semantic":
        rule, path = why["expect_rule"], why["expect_path"]
        ok = (not e) and (rule, path) in s and len(s) == 1 and strict_ok
        rec(ok, f"{name}: {rule}@{path} schema_errors={len(e)} semantic={s}")
    elif layer == "json-parse":
        kw, path = why["also_schema_keyword"], why["also_schema_path"]
        match = [x for x in e if x[0] == kw and x[1] == path]
        # the .why.txt may declare the keyword validator-dependent (e.g. "type ... or maximum ...")
        dep = why.get("also_schema_keyword_is_validator_dependent", "")
        allowed = {kw} | {w for w in ("type", "maximum", "minimum") if w in dep}
        unrelated = [x for x in e if not (x[0] in allowed and x[1] == path)]
        extra_kw = sorted({x[0] for x in e if x[0] != kw and x[0] in allowed})
        rec((not strict_ok) and bool(match) and not unrelated,
            f"{name}: strict parse rejected={not strict_ok}; lenient schema -> {[(x[0], x[1]) for x in e]}"
            + (f"  NOTE: Python jsonschema reports {kw} AND {extra_kw}" if extra_kw else ""))
    else:
        rec(False, f"{name}: unknown layer {layer}")
    report.append(item)
json.dump(report, open(os.path.join(HERE, "out", "invalid_examples_jsonschema.json"), "w"), indent=1)

print("== exhaustive sweeps of the enumerated cross-field clauses")
base = strict_load(f"{C}/examples/valid/workshop-inputs/complete-single.json")


def with_timing(A, R, H=None):
    d = copy.deepcopy(base)
    t = d["chapters"]["timing"]
    t["current_age"] = {"status": "estimated", "value": A}
    t["retirement_age"] = {"status": "estimated", "value": R}
    if H is not None:
        t["planning_horizon_years"] = {"status": "estimated", "value": H}
    else:
        t["planning_horizon_years"] = {"status": "estimated", "value": 1}
    d["chapters"]["income"] = {"coverage": "no_planned_income", "sources": []}
    return d


mm = 0; n = 0
for A in range(18, 101):
    for R in range(30, 101):
        n += 1
        ok = not any(e[1].startswith("/chapters/timing") for e in errs(with_timing(A, R)))
        if ok != (R >= A):
            mm += 1
rec(mm == 0, f"XF-01 retirement_age >= current_age: {n} cases, mismatches {mm}")

mm = 0; n = 0
for pA in range(18, 101):
    for pR in range(30, 101):
        n += 1
        d = with_timing(60, 65)
        d["chapters"]["timing"]["household"] = {"partner_current_age": {"status": "estimated", "value": pA},
                                               "partner_retirement_age": {"status": "estimated", "value": pR}}
        ok = not errs(d)
        if ok != (pR >= pA):
            mm += 1
rec(mm == 0, f"XF-02 partner_retirement_age >= partner_current_age: {n} cases, mismatches {mm}")

mm = 0; n = 0
for R in range(30, 101):
    for H in range(1, 61):
        n += 1
        ok = not errs(with_timing(min(R, 60), R, H))
        if ok != (R + H - 1 <= 120):
            mm += 1
rec(mm == 0, f"XF-03 R + H - 1 <= 120: {n} cases, mismatches {mm}")

print("== adversarial documents (each must be rejected by the schema unless noted)")


def mut(fn):
    d = copy.deepcopy(base)
    fn(d)
    return d


def spend(d, q):
    d["chapters"]["life"]["spending"]["amount"] = q


src0 = lambda d: d["chapters"]["income"]["sources"][0]  # noqa: E731
cases = [
    ("value 2^53 (unsafe) on spending", mut(lambda d: spend(d, {"status": "estimated", "value": 2 ** 53})), False),
    ("annual spending 120,000,001", mut(lambda d: (spend(d, {"status": "estimated", "value": 120000001}),
                                                   d["chapters"]["life"]["spending"].__setitem__("period", "annual"))), False),
    ("annual income 60,000,001", mut(lambda d: (src0(d).__setitem__("period", "annual"),
                                                src0(d).__setitem__("amount", {"status": "estimated", "value": 60000001}))), False),
    ("monthly income 5,000,001", mut(lambda d: (src0(d).__setitem__("period", "monthly"),
                                                src0(d).__setitem__("amount", {"status": "estimated", "value": 5000001}))), False),
    ("escalation 1001 bp", mut(lambda d: src0(d).__setitem__("escalation_bp", {"status": "estimated", "value": 1001})), False),
    ("escalation unknown", mut(lambda d: src0(d).__setitem__("escalation_bp", {"status": "unknown"})), False),
    ("inflation confirmed", mut(lambda d: d["chapters"]["timing"].__setitem__("inflation_bp", {"status": "confirmed", "value": 200})), False),
    ("horizon confirmed", mut(lambda d: d["chapters"]["timing"].__setitem__("planning_horizon_years", {"status": "confirmed", "value": 20})), False),
    ("horizon 61", mut(lambda d: d["chapters"]["timing"].__setitem__("planning_horizon_years", {"status": "estimated", "value": 61})), False),
    ("return 1001 bp", mut(lambda d: d["chapters"]["timing"].__setitem__("capital_illustration_return_bp", {"status": "estimated", "value": 1001})), False),
    ("return unknown", mut(lambda d: d["chapters"]["timing"].__setitem__("capital_illustration_return_bp", {"status": "unknown"})), False),
    ("current age 17", mut(lambda d: d["chapters"]["timing"].__setitem__("current_age", {"status": "estimated", "value": 17})), False),
    ("current age zero-status", mut(lambda d: d["chapters"]["timing"].__setitem__("current_age", {"status": "zero", "value": 0})), False),
    ("year_index start 0", mut(lambda d: src0(d).__setitem__("start", {"reference": "year_index", "point": {"status": "estimated", "value": 0}})), False),
    ("year_index start 83", mut(lambda d: src0(d).__setitem__("start", {"reference": "year_index", "point": {"status": "estimated", "value": 83}})), False),
    ("age start 101", mut(lambda d: src0(d).__setitem__("start", {"reference": "age", "point": {"status": "estimated", "value": 101}})), False),
    ("end reference already_receiving", mut(lambda d: src0(d).__setitem__("end", {"reference": "already_receiving"})), False),
    ("start age without point", mut(lambda d: src0(d).__setitem__("start", {"reference": "age"})), False),
    ("start point status zero", mut(lambda d: src0(d).__setitem__("start", {"reference": "age", "point": {"status": "zero", "value": 0}})), False),
    ("9 sources", mut(lambda d: d["chapters"]["income"].__setitem__("sources", [dict(src0(d), id=f"src-{k}") for k in range(1, 10)])), False),
    ("all_known with 0 sources", mut(lambda d: d["chapters"]["income"].__setitem__("sources", [])), False),
    ("not_answered with a source", mut(lambda d: d["chapters"]["income"].__setitem__("coverage", "not_answered")), False),
    ("source id 'src-100'", mut(lambda d: src0(d).__setitem__("id", "src-100")), False),
    ("tax_basis 'after_tax' on income", mut(lambda d: src0(d).__setitem__("tax_basis", "after_tax")), False),
    ("currency USD", mut(lambda d: d.__setitem__("currency", "USD")), False),
    ("base_year 2025", mut(lambda d: d.__setitem__("base_year", 2025)), False),
    ("savings total field", mut(lambda d: d["chapters"]["savings"].__setitem__("total", {"status": "estimated", "value": 1})), False),
    ("business excluded_from_spendable false", mut(lambda d: d["chapters"]["savings"].__setitem__(
        "business_value", {"amount": {"status": "estimated", "value": 1}, "excluded_from_spendable": False})), False),
    ("string value '100'", mut(lambda d: spend(d, {"status": "estimated", "value": "100"})), False),
    ("boolean value true", mut(lambda d: spend(d, {"status": "estimated", "value": True})), False),
    ("450000.0 (integer-valued float; schema ACCEPTS, runtime must isSafeInteger)", mut(lambda d: spend(d, {"status": "estimated", "value": 450000.0})), True),
]
for name, doc, expect_valid in cases:
    e = errs(doc)
    rec((not e) == expect_valid, f"{name}: {'accepted' if not e else 'rejected ' + str([(x[0], x[1]) for x in e][:3])}")

print(f"== summary: {oks} ok, {fails} failed")
sys.exit(1 if fails else 0)
