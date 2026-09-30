"""Writes the workshop-inputs example instances (valid and invalid) for contract 1.0.

Each invalid example is the valid base instance with ONE mutation, plus a sibling
.why.txt whose header lines are machine-checked by validate.py:
  rule / layer / expect_keyword / expect_path / expect_validator_value /
  expect_rule / also_schema_keyword / also_schema_path
followed by a plain-language message (draft) and an explanation.
"""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3] / "contracts" / "examples"
VALID = ROOT / "valid" / "workshop-inputs"
INVALID = ROOT / "invalid" / "workshop-inputs"


def Q(s, v=None):
    return {"status": s} if v is None else {"status": s, "value": v}


BASE = {
    "contract": "workshop-inputs",
    "contract_version": "1.0",
    "currency": "CAD",
    "base_year": 2026,
    "chapters": {
        "life": {
            "spending": {"amount": Q("estimated", 450000), "period": "monthly",
                         "tax_basis": "after_tax", "price_basis": "today_dollars", "unit": "household"},
            "lifestyle_focus": "travel",
        },
        "income": {
            "coverage": "all_known_sources_listed",
            "sources": [
                {"id": "src-1", "kind": "workplace_pension", "owner": "self",
                 "amount": Q("confirmed", 2400000), "period": "annual", "tax_basis": "net",
                 "price_basis": "start_year_dollars", "start": {"reference": "age", "point": Q("estimated", 62)},
                 "escalation_bp": Q("confirmed", 150), "dependability": "scheduled"},
                {"id": "src-2", "kind": "qpp_cpp", "owner": "self",
                 "amount": Q("estimated", 95000), "period": "monthly", "tax_basis": "net",
                 "price_basis": "today_dollars", "start": {"reference": "age", "point": Q("estimated", 65)},
                 "escalation_bp": Q("estimated", 200), "dependability": "scheduled"},
            ],
        },
        "savings": {
            "accounts": {"rrsp_rrif": Q("estimated", 32000000), "tfsa": Q("estimated", 8500000),
                         "non_registered": Q("unknown")},
            "home_value": {"amount": Q("estimated", 65000000), "excluded_from_spendable": True},
        },
        "timing": {
            "current_age": Q("confirmed", 58),
            "retirement_age": Q("estimated", 62),
            "planning_horizon_years": Q("estimated", 30),
            "inflation_bp": Q("estimated", 200),
        },
    },
}


def valid_examples():
    out = {}
    out["complete-single.json"] = copy.deepcopy(BASE)

    hh = copy.deepcopy(BASE)
    c = hh["chapters"]
    c["life"]["lifestyle_focus"] = "family"
    c["income"]["sources"] = [
        {"id": "src-1", "kind": "workplace_pension", "owner": "self", "amount": Q("confirmed", 3100000),
         "period": "annual", "tax_basis": "net", "price_basis": "start_year_dollars",
         "start": {"reference": "age", "point": Q("estimated", 62)}, "escalation_bp": Q("zero", 0),
         "dependability": "scheduled"},
        {"id": "src-2", "kind": "qpp_cpp", "owner": "partner", "amount": Q("estimated", 1100000),
         "period": "annual", "tax_basis": "gross", "price_basis": "today_dollars",
         "start": {"reference": "age", "point": Q("estimated", 65)}, "escalation_bp": Q("estimated", 200),
         "dependability": "scheduled"},
        {"id": "src-3", "kind": "rental", "owner": "joint", "amount": Q("estimated", 120000),
         "period": "monthly", "tax_basis": "unknown", "price_basis": "today_dollars",
         "start": {"reference": "already_receiving"}, "escalation_bp": Q("estimated", 100),
         "dependability": "uncertain"},
        {"id": "src-4", "kind": "employment", "owner": "partner", "amount": Q("unknown"),
         "period": "monthly", "tax_basis": "net", "price_basis": "unknown",
         "start": {"reference": "year_index", "point": Q("unknown")},
         "end": {"reference": "age", "point": Q("estimated", 68)}, "escalation_bp": Q("zero", 0),
         "dependability": "uncertain"},
    ]
    c["income"]["coverage"] = "some_sources_may_be_missing"
    c["savings"] = {
        "accounts": {"rrsp_rrif": Q("estimated", 41000000), "tfsa": Q("confirmed", 9500000),
                     "non_registered": Q("zero", 0), "other": Q("unknown"), "not_sure": Q("estimated", 1500000)},
        "pension_value": {"amount": Q("estimated", 38000000), "also_entered_as_income": "not_sure"},
        "home_value": {"amount": Q("estimated", 82000000)},
        "business_value": {"amount": Q("unknown"), "excluded_from_spendable": True},
    }
    c["timing"]["household"] = {"partner_current_age": Q("confirmed", 55),
                                "partner_retirement_age": Q("estimated", 64)}
    c["timing"]["capital_illustration_return_bp"] = Q("estimated", 400)
    out["household-mixed.json"] = hh

    mini = copy.deepcopy(BASE)
    c = mini["chapters"]
    c["life"] = {"spending": {"amount": Q("unknown"), "period": "monthly", "tax_basis": "after_tax",
                              "price_basis": "today_dollars", "unit": "household"}}
    c["income"] = {"coverage": "not_answered", "sources": []}
    c["savings"] = {}
    c["timing"] = {"current_age": Q("unknown"), "retirement_age": Q("unknown"),
                   "planning_horizon_years": Q("estimated", 25), "inflation_bp": Q("estimated", 200)}
    out["minimal-all-unknown.json"] = mini

    zeros = copy.deepcopy(BASE)
    c = zeros["chapters"]
    c["life"]["spending"]["period"] = "annual"
    c["life"]["spending"]["amount"] = Q("estimated", 4800000)
    c["income"] = {"coverage": "all_known_sources_listed", "sources": [
        {"id": "src-1", "kind": "annuity", "owner": "self", "amount": Q("confirmed", 1800000),
         "period": "annual", "tax_basis": "net", "price_basis": "start_year_dollars",
         "start": {"reference": "already_receiving"}, "escalation_bp": Q("zero", 0), "dependability": "scheduled"},
        {"id": "src-2", "kind": "other", "owner": "self", "amount": Q("zero", 0),
         "period": "monthly", "tax_basis": "unknown", "price_basis": "unknown",
         "start": {"reference": "already_receiving"}, "escalation_bp": Q("zero", 0), "dependability": "scheduled"}]}
    c["savings"] = {"accounts": {"tfsa": Q("zero", 0), "rrsp_rrif": Q("zero", 0)}}
    c["timing"] = {"current_age": Q("confirmed", 71), "retirement_age": Q("confirmed", 71),
                   "planning_horizon_years": Q("estimated", 20), "inflation_bp": Q("zero", 0),
                   "capital_illustration_return_bp": Q("zero", 0)}
    out["already-retired-zeros.json"] = zeros

    lim = copy.deepcopy(BASE)
    c = lim["chapters"]
    c["life"]["spending"]["amount"] = Q("estimated", 10000000)  # monthly maximum
    c["income"]["sources"][0]["amount"] = Q("estimated", 60000000)  # annual maximum
    c["income"]["sources"][1]["start"] = {"reference": "year_index", "point": Q("estimated", 81)}
    c["income"]["sources"][1]["end"] = {"reference": "age", "point": Q("estimated", 100)}
    c["income"]["sources"][1]["escalation_bp"] = Q("estimated", 1000)
    c["savings"] = {"accounts": {"other": Q("estimated", 5000000000)}}
    c["timing"] = {"current_age": Q("confirmed", 18), "retirement_age": Q("estimated", 90),
                   "planning_horizon_years": Q("estimated", 31), "inflation_bp": Q("estimated", 1000)}
    out["range-limits.json"] = lim
    return out


def mut(path, value=None, delete=False):
    def f(d):
        d = copy.deepcopy(d)
        node = d
        for key in path[:-1]:
            node = node[key]
        if delete:
            del node[path[-1]]
        else:
            node[path[-1]] = value
        return d
    return f


S1 = ["chapters", "income", "sources", 0]
SPEND = ["chapters", "life", "spending", "amount"]
T = ["chapters", "timing"]

INVALID_CASES = [
    # name, mutation, header dict, plain message, explanation
    ("nan-literal", "RAW:NaN",
     {"rule": "NONFINITE - number must be a finite integer", "layer": "json-parse",
      "also_schema_keyword": "type", "also_schema_path": "/chapters/life/spending/amount/value"},
     "Enter an amount in dollars and cents.",
     "Strict JSON (RFC 8259) has no NaN token, so a strict parser rejects the document. If a lenient parser admits it, the schema still rejects it: NaN is not an integer."),
    ("infinity-literal", "RAW:Infinity",
     {"rule": "NONFINITE - number must be a finite integer", "layer": "json-parse",
      "also_schema_keyword": "type", "also_schema_path": "/chapters/life/spending/amount/value",
      "also_schema_keyword_is_validator_dependent": "type and maximum (Python jsonschema 4.26 reports type, then maximum twice) or maximum only (Ajv 8, which treats Infinity as an integer)"},
     "Enter an amount in dollars and cents.",
     "Strict JSON has no Infinity token, so a strict parser rejects the document. A lenient parse still fails the schema at the same path, but the keywords depend on the validator: Python jsonschema 4.26 reports type (Infinity is not an integer) and also maximum (twice, once for each maximum that applies), while Ajv 8 treats Infinity as an integer and reports only maximum. Either way the document is rejected. The runtime must still check Number.isFinite and Number.isSafeInteger explicitly (workshop-inputs.md s4)."),
    ("nan-as-string", mut(SPEND + ["value"], "NaN"),
     {"rule": "NONFINITE - number must be a finite integer", "layer": "schema",
      "expect_keyword": "type", "expect_path": "/chapters/life/spending/amount/value"},
     "Enter an amount in dollars and cents.",
     "A string such as \"NaN\" is not an integer; values are never strings."),
    ("negative-spending", mut(SPEND, {"status": "estimated", "value": -450000}),
     {"rule": "RANGE - money is never negative", "layer": "schema",
      "expect_keyword": "minimum", "expect_path": "/chapters/life/spending/amount/value", "expect_validator_value": 0},
     "Spending can't be negative.",
     "The quantity wrapper sets minimum 0 for every value; estimated values also need minimum 1."),
    ("unknown-with-value", mut(SPEND, {"status": "unknown", "value": 450000}),
     {"rule": "STATUS-1 - unknown carries no value", "layer": "schema",
      "expect_keyword": "not", "expect_path": "/chapters/life/spending/amount"},
     "(internal state error - the form never produces this)",
     "An unknown quantity must not carry a value, otherwise an unknown could silently be read as a number."),
    ("estimated-without-value", mut(SPEND, {"status": "estimated"}),
     {"rule": "STATUS-3 - estimated/confirmed need a value", "layer": "schema",
      "expect_keyword": "required", "expect_path": "/chapters/life/spending/amount", "expect_validator_value": ["value"]},
     "Enter an amount, or choose \"I'm not sure\".",
     "An estimated quantity must carry its value."),
    ("estimated-zero-value", mut(S1 + ["amount"], {"status": "estimated", "value": 0}),
     {"rule": "STATUS-2 - zero has exactly one representation", "layer": "schema",
      "expect_keyword": "minimum", "expect_path": "/chapters/income/sources/0/amount/value", "expect_validator_value": 1},
     "(internal state error - a stated zero is recorded as status zero)",
     "0 is recorded only as {status: zero, value: 0}; estimated/confirmed values are >= 1."),
    ("retirement-before-current-age", mut(T + ["retirement_age"], {"status": "estimated", "value": 55}),
     {"rule": "XF-01 - retirement age not earlier than current age", "layer": "schema",
      "expect_keyword": "minimum", "expect_path": "/chapters/timing/retirement_age/value", "expect_validator_value": 58},
     "Retirement age can't be earlier than your current age. If you've already retired, use your current age.",
     "Current age 58, retirement age 55. Enumerated XF-01 clause for current_age = 58 sets minimum 58."),
    ("horizon-zero", mut(T + ["planning_horizon_years"], {"status": "estimated", "value": 0}),
     {"rule": "RANGE - planning horizon is at least 1 year", "layer": "schema",
      "expect_keyword": "minimum", "expect_path": "/chapters/timing/planning_horizon_years/value", "expect_validator_value": 1},
     "Choose how many years of retirement to illustrate (1 to 60).",
     "H = 0 would illustrate no year at all."),
    ("income-basis-missing", mut(S1 + ["tax_basis"], delete=True),
     {"rule": "BASIS - every income source states gross, net or unknown", "layer": "schema",
      "expect_keyword": "required", "expect_path": "/chapters/income/sources/0", "expect_message_contains": "'tax_basis'"},
     "Is this amount before tax, after tax, or are you not sure?",
     "tax_basis is required; 'unknown' is an allowed answer, silence is not."),
    ("float-cents", mut(SPEND, {"status": "estimated", "value": 450000.5}),
     {"rule": "UNITS - money is an integer number of cents", "layer": "schema",
      "expect_keyword": "type", "expect_path": "/chapters/life/spending/amount/value"},
     "Enter an amount in dollars and cents.",
     "450000.5 cents is a fraction of a cent. (JSON Schema treats 450000.0 as an integer; the runtime must also require Number.isSafeInteger after parsing.)"),
    ("extra-pii-email", lambda d: dict(copy.deepcopy(d), email="participant@example.invalid"),
     {"rule": "PRIVACY - no personal identifier fields (closed shapes)", "layer": "schema",
      "expect_keyword": "additionalProperties", "expect_path": "", "expect_message_contains": "'email'"},
     "(never shown - the form has no such field)",
     "The root object is closed (additionalProperties false). An email address can never enter the workshop state."),
    ("pii-label-in-source", mut(S1 + ["label"], "Pension from ACME - Jane Tremblay"),
     {"rule": "PRIVACY - no free text anywhere", "layer": "schema",
      "expect_keyword": "additionalProperties", "expect_path": "/chapters/income/sources/0", "expect_message_contains": "'label'"},
     "(never shown - the form has no free-text field)",
     "Income sources are closed; a free-text label could carry names or employers."),
    ("spending-status-zero", mut(SPEND, {"status": "zero", "value": 0}),
     {"rule": "RANGE - household spending cannot be zero", "layer": "schema",
      "expect_keyword": "enum", "expect_path": "/chapters/life/spending/amount/status"},
     "Spending can't be zero. If you don't know yet, choose \"I'm not sure\".",
     "spending.amount.status excludes zero."),
    ("spending-pretax-basis", mut(["chapters", "life", "spending", "tax_basis"], "before_tax"),
     {"rule": "BASIS - spending is after tax (stated)", "layer": "schema",
      "expect_keyword": "const", "expect_path": "/chapters/life/spending/tax_basis"},
     "(never shown - the basis is stated, not chosen)",
     "Spending basis is fixed to after_tax in contract 1.0."),
    ("monthly-spending-over-limit", mut(SPEND, {"status": "estimated", "value": 10000001}),
     {"rule": "RANGE - monthly spending up to $100,000.00", "layer": "schema",
      "expect_keyword": "maximum", "expect_path": "/chapters/life/spending/amount/value", "expect_validator_value": 10000000},
     "This exercise accepts monthly spending up to $100,000.",
     "Period-dependent maximum (monthly 10,000,000 cents)."),
    ("income-guaranteed-label", mut(S1 + ["dependability"], "guaranteed"),
     {"rule": "LABEL - no 'guaranteed' dependability", "layer": "schema",
      "expect_keyword": "enum", "expect_path": "/chapters/income/sources/0/dependability"},
     "(never shown)",
     "Only scheduled or uncertain exist; nothing in the workshop is labelled guaranteed."),
    ("home-counted-spendable", mut(["chapters", "savings", "home_value", "excluded_from_spendable"], False),
     {"rule": "ASSET - home/business excluded from spendable", "layer": "schema",
      "expect_keyword": "const", "expect_path": "/chapters/savings/home_value/excluded_from_spendable"},
     "(never shown - contract 1.0 has no disposal assumption)",
     "A disposal/sale assumption is not modelled in 1.0; only true is accepted."),
    ("inflation-unknown", mut(T + ["inflation_bp"], {"status": "unknown"}),
     {"rule": "ASSUMPTION - inflation is an explicit assumption", "layer": "schema",
      "expect_keyword": "enum", "expect_path": "/chapters/timing/inflation_bp/status"},
     "Choose an inflation assumption (0% to 10%).",
     "Rate assumptions accept only zero or estimated."),
    ("partner-retirement-before-partner-age", mut(T + ["household"], {"partner_current_age": {"status": "confirmed", "value": 60},
                                                                       "partner_retirement_age": {"status": "estimated", "value": 57}}),
     {"rule": "XF-02 - partner retirement age not earlier than partner current age", "layer": "schema",
      "expect_keyword": "minimum", "expect_path": "/chapters/timing/household/partner_retirement_age/value", "expect_validator_value": 60},
     "Your partner's retirement age can't be earlier than their current age. If they've already retired, use their current age.",
     "Partner aged 60 with retirement age 57. Enumerated XF-02 clause for partner_current_age = 60 sets minimum 60."),
    ("horizon-beyond-age-120", mut(T + ["retirement_age"], {"status": "estimated", "value": 95}),
     {"rule": "XF-03 - last illustrated age at most 120", "layer": "schema",
      "expect_keyword": "maximum", "expect_path": "/chapters/timing/planning_horizon_years/value", "expect_validator_value": 26},
     "With retirement at 95, the horizon can be at most 26 years.",
     "R = 95 and H = 30 would illustrate ages 95 to 124."),
    ("partner-source-without-household", mut(S1 + ["owner"], "partner"),
     {"rule": "XF-07 - partner-owned source needs household timing", "layer": "schema",
      "expect_keyword": "required", "expect_path": "/chapters/timing", "expect_validator_value": ["household"]},
     "Add your partner's age to place this income in time.",
     "A partner-owned age-based start cannot be placed without the household section."),
    ("coverage-none-with-sources", mut(["chapters", "income", "coverage"], "no_planned_income"),
     {"rule": "XF-08 - coverage agrees with the source list", "layer": "schema",
      "expect_keyword": "maxItems", "expect_path": "/chapters/income/sources", "expect_validator_value": 0},
     "You said no income is planned, but income is listed. Which is right?",
     "no_planned_income means an empty list."),
    ("already-receiving-with-point", mut(S1 + ["start"], {"reference": "already_receiving", "point": {"status": "estimated", "value": 3}}),
     {"rule": "START - already receiving has no start point", "layer": "schema",
      "expect_keyword": "not", "expect_path": "/chapters/income/sources/0/start"},
     "(internal state error)",
     "already_receiving means s_j = 0; a point would be contradictory."),
    ("start-age-already-passed", mut(S1 + ["start"], {"reference": "age", "point": {"status": "estimated", "value": 55}}),
     {"rule": "XF-04 - an age-based start is not before the owner's current age", "layer": "semantic",
      "expect_rule": "XF-04", "expect_path": "/chapters/income/sources/0/start/point/value"},
     "That age has already passed. If this income has started, choose \"Already receiving\".",
     "Schema-valid (55 is within 18-100) but cross-chapter: owner's current age is 58."),
    ("end-before-start", mut(S1 + ["end"], {"reference": "age", "point": {"status": "estimated", "value": 61}}),
     {"rule": "XF-05 - end is after start", "layer": "semantic",
      "expect_rule": "XF-05", "expect_path": "/chapters/income/sources/0/end"},
     "The end age must be after the start age.",
     "Start age 62, end age 61."),
    ("duplicate-source-id", mut(["chapters", "income", "sources", 1, "id"], "src-1"),
     {"rule": "XF-06 - source ids are unique", "layer": "semantic",
      "expect_rule": "XF-06", "expect_path": "/chapters/income/sources/1/id"},
     "(internal state error)",
     "Two sources share src-1; per-source outputs would collide."),
]


def render():
    files = {}
    for name, d in valid_examples().items():
        files[VALID / name] = json.dumps(d, indent=1, ensure_ascii=False) + "\n"
    base_text = json.dumps(BASE, indent=1, ensure_ascii=False)
    for name, m, header, plain, why in INVALID_CASES:
        if isinstance(m, str) and m.startswith("RAW:"):
            token = m[4:]
            text = base_text.replace('"value": 450000', f'"value": {token}', 1)
            assert token in text
        else:
            text = json.dumps(m(BASE), indent=1, ensure_ascii=False)
        files[INVALID / f"{name}.json"] = text + "\n"
        lines = [f"{k}: {json.dumps(v) if k == 'expect_validator_value' else v}" for k, v in header.items()]
        lines += [f"plain_message_en_draft: {plain}", f"explanation: {why}"]
        files[INVALID / f"{name}.why.txt"] = "\n".join(lines) + "\n"
    return files


def main():
    import sys
    files = render()
    if "--check" in sys.argv:
        bad = [str(p.name) for p, t in files.items() if not p.exists() or p.read_text() != t]
        extra = sorted(p.name for d in (VALID, INVALID) for p in d.iterdir() if p not in files)
        print(f"examples on disk match generator: {not bad and not extra} "
              f"({len(files)} files; differing: {bad or 'none'}; unexpected: {extra or 'none'})")
        sys.exit(1 if bad or extra else 0)
    VALID.mkdir(parents=True, exist_ok=True)
    INVALID.mkdir(parents=True, exist_ok=True)
    for p, t in files.items():
        p.write_text(t)
    print(f"wrote {len(valid_examples())} valid and {len(INVALID_CASES)} invalid examples")


if __name__ == "__main__":
    main()
