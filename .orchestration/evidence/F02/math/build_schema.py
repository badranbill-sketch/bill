"""Builds .orchestration/contracts/workshop-inputs.schema.json (contract 1.0).

Run:  python build_schema.py            -> writes the schema
      python build_schema.py --check    -> exits 1 if the file on disk differs

Why a builder: JSON Schema 2020-12 cannot compare two instance values. The
three same-object rules XF-01, XF-02 and XF-03 (workshop-inputs.md section 6)
are therefore expressed as enumerated if/then clauses, one per possible age.
Generating them avoids hand-typing ~180 clauses. The schema file on disk is the
contract; this script is only its reproducible source.
"""
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[3] / "contracts" / "workshop-inputs.schema.json"

SAFE_INT = 9007199254740991
CURRENT_AGE = (18, 100)
RETIREMENT_AGE = (30, 100)
POINT_AGE = (18, 100)
POINT_INDEX = (1, 82)
HORIZON = (1, 60)
RATE_BP = (0, 1000)
MAX_LAST_AGE = 120  # R + H - 1 <= 120
LIMITS = {
    "spending": {"monthly": 10_000_000, "annual": 120_000_000},
    "income": {"monthly": 5_000_000, "annual": 60_000_000},
    "balance": 5_000_000_000,
}


def status_value_rules():
    return [
        {
            "if": {"required": ["status"], "properties": {"status": {"const": "unknown"}}},
            "then": {"not": {"required": ["value"]}},
        },
        {
            "if": {"required": ["status"], "properties": {"status": {"const": "zero"}}},
            "then": {"required": ["value"], "properties": {"value": {"const": 0}}},
        },
        {
            "if": {"required": ["status"],
                   "properties": {"status": {"enum": ["estimated", "confirmed"]}}},
            "then": {"required": ["value"], "properties": {"value": {"minimum": 1}}},
        },
    ]


def restrict(ref, statuses=None, minimum=None, maximum=None, desc=None):
    s = {"$ref": ref}
    props = {}
    if statuses is not None:
        props["status"] = {"enum": statuses}
    v = {}
    if minimum is not None:
        v["minimum"] = minimum
    if maximum is not None:
        v["maximum"] = maximum
    if v:
        props["value"] = v
    if props:
        s["properties"] = props
    if desc:
        s["description"] = desc
    return s


def period_limit(field, monthly, annual):
    return [
        {
            "if": {"required": ["period"], "properties": {"period": {"const": "monthly"}}},
            "then": {"properties": {field: {"properties": {"value": {"maximum": monthly}}}}},
        },
        {
            "if": {"required": ["period"], "properties": {"period": {"const": "annual"}}},
            "then": {"properties": {field: {"properties": {"value": {"maximum": annual}}}}},
        },
    ]


def not_before(lower_field, upper_field, lo, hi, upper_lo):
    """Enumerated clauses: upper.value >= lower.value (only where it binds)."""
    clauses = []
    for a in range(max(lo, upper_lo + 1), hi + 1):
        clauses.append({
            "__compact__": True,
            "if": {
                "required": [lower_field, upper_field],
                "properties": {
                    lower_field: {"required": ["value"], "properties": {"value": {"const": a}}},
                    upper_field: {"required": ["value"]},
                },
            },
            "then": {"properties": {upper_field: {"properties": {"value": {"minimum": a}}}}},
        })
    return clauses


def horizon_cap():
    """XF-03: retirement_age + H - 1 <= 120, enumerated where it binds (R >= 62)."""
    clauses = []
    for r in range(RETIREMENT_AGE[0], RETIREMENT_AGE[1] + 1):
        cap = MAX_LAST_AGE + 1 - r
        if cap >= HORIZON[1]:
            continue
        clauses.append({
            "__compact__": True,
            "if": {
                "required": ["retirement_age"],
                "properties": {"retirement_age": {"required": ["value"],
                                                  "properties": {"value": {"const": r}}}},
            },
            "then": {"properties": {"planning_horizon_years": {
                "properties": {"value": {"maximum": cap}}}}},
        })
    return clauses


def point_def(allow_already_receiving):
    refs = ["age", "year_index"]
    if allow_already_receiving:
        refs = ["already_receiving"] + refs
    rules = [
        {
            "if": {"required": ["reference"], "properties": {"reference": {"const": "age"}}},
            "then": {"required": ["point"], "properties": {"point": restrict(
                "#/$defs/quantity", ["unknown", "estimated", "confirmed"], POINT_AGE[0], POINT_AGE[1])}},
        },
        {
            "if": {"required": ["reference"], "properties": {"reference": {"const": "year_index"}}},
            "then": {"required": ["point"], "properties": {"point": restrict(
                "#/$defs/quantity", ["unknown", "estimated", "confirmed"], POINT_INDEX[0], POINT_INDEX[1])}},
        },
    ]
    if allow_already_receiving:
        rules.append({
            "if": {"required": ["reference"],
                   "properties": {"reference": {"const": "already_receiving"}}},
            "then": {"not": {"required": ["point"]}},
        })
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["reference"],
        "properties": {
            "reference": {"enum": refs},
            "point": {"$ref": "#/$defs/quantity"},
        },
        "allOf": rules,
    }


def build():
    q = "#/$defs/quantity"
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": "https://bill.contracts.local/workshop-inputs/1.0",
        "title": "Workshop Journey inputs (browser-local only)",
        "description": (
            "Contract 1.0 for the four-chapter Workshop Journey answers held in the visitor's "
            "browser. Status: proposed - subject to A6 math review and professional review (G3). "
            "This object never leaves the browser: not in URLs, cookies, storage sent to a server, "
            "analytics, error reports, logs, email, n8n, Brevo, Supabase or an LLM (D-014). "
            "It has no free-text field and no personal identifier. Semantics: workshop-inputs.md; "
            "math: workshop-math.md."
        ),
        "$comment": (
            "Generated by .orchestration/evidence/F02/math/build_schema.py. Layer-2 semantic rules "
            "(XF-04 start age not in the past, XF-05 end after start, XF-06 unique source ids) cannot "
            "be expressed here and are normative in workshop-inputs.md section 6."
        ),
        "type": "object",
        "additionalProperties": False,
        "required": ["contract", "contract_version", "currency", "base_year", "chapters"],
        "properties": {
            "contract": {"const": "workshop-inputs"},
            "contract_version": {"const": "1.0"},
            "currency": {"const": "CAD", "description": "All money values are integer CAD cents."},
            "base_year": {
                "type": "integer", "minimum": 2026, "maximum": 2100,
                "description": "Calendar year of the base date; year index t=0. Taken from the device clock and shown to the participant.",
            },
            "chapters": {
                "type": "object",
                "additionalProperties": False,
                "required": ["life", "income", "savings", "timing"],
                "properties": {
                    "life": {"$ref": "#/$defs/chapterLife"},
                    "income": {"$ref": "#/$defs/chapterIncome"},
                    "savings": {"$ref": "#/$defs/chapterSavings"},
                    "timing": {"$ref": "#/$defs/chapterTiming"},
                },
            },
        },
        "allOf": [
            {
                "$comment": "XF-07: a partner-owned income source requires the household section.",
                "if": {
                    "required": ["chapters"],
                    "properties": {"chapters": {"required": ["income"], "properties": {"income": {
                        "required": ["sources"], "properties": {"sources": {
                            "contains": {"required": ["owner"], "properties": {"owner": {"const": "partner"}}}
                        }}}}}},
                },
                "then": {"properties": {"chapters": {"properties": {"timing": {"required": ["household"]}}}}},
            }
        ],
        "$defs": {
            "status": {
                "enum": ["unknown", "zero", "estimated", "confirmed"],
                "description": "unknown: not known or skipped (value absent). zero: a stated zero (value 0; the only representation of zero). estimated: an approximate or assumed value. confirmed: taken from a statement or document.",
            },
            "quantity": {
                "type": "object",
                "additionalProperties": False,
                "required": ["status"],
                "properties": {
                    "status": {"$ref": "#/$defs/status"},
                    "value": {"type": "integer", "minimum": 0, "maximum": SAFE_INT},
                },
                "allOf": status_value_rules(),
                "description": "Numeric wrapper. value is an integer: CAD cents for money, whole years for ages/indices/horizon, basis points for rates. Absent when unknown; 0 only when zero; >= 1 when estimated/confirmed.",
            },
            "balance": restrict(q, None, 0, LIMITS["balance"],
                                "Approximate balance in CAD cents; up to $50,000,000.00."),
            "rateAssumption": restrict(q, ["zero", "estimated"], RATE_BP[0], RATE_BP[1],
                                       "Explicit annual rate assumption in basis points (100 bp = 1%); 0% to 10%. Cannot be unknown."),
            "chapterLife": {
                "type": "object",
                "additionalProperties": False,
                "required": ["spending"],
                "description": "Chapter 1 - What life do you want to fund?",
                "properties": {
                    "spending": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["amount", "period", "tax_basis", "price_basis", "unit"],
                        "properties": {
                            "amount": restrict(q, ["unknown", "estimated", "confirmed"], None, None,
                                               "Desired household spending, CAD cents. A household cannot spend zero: use unknown instead."),
                            "period": {"enum": ["monthly", "annual"]},
                            "tax_basis": {"const": "after_tax",
                                          "description": "Stated to the participant: spending is money available after income tax."},
                            "price_basis": {"const": "today_dollars",
                                            "description": "Stated to the participant: in today's prices (base-year dollars)."},
                            "unit": {"const": "household"},
                        },
                        "allOf": period_limit("amount", LIMITS["spending"]["monthly"], LIMITS["spending"]["annual"]),
                    },
                    "lifestyle_focus": {
                        "enum": ["home_and_community", "travel", "family", "work_or_projects",
                                 "learning_or_volunteering", "not_sure"],
                        "description": "Optional single lifestyle choice; stays local; no effect on the math. Labels: C02 (proposed keys).",
                    },
                },
            },
            "chapterIncome": {
                "type": "object",
                "additionalProperties": False,
                "required": ["coverage", "sources"],
                "description": "Chapter 2 - What income is already planned?",
                "properties": {
                    "coverage": {"enum": ["all_known_sources_listed", "some_sources_may_be_missing",
                                          "no_planned_income", "not_answered"]},
                    "sources": {"type": "array", "maxItems": 8, "items": {"$ref": "#/$defs/incomeSource"}},
                },
                "allOf": [
                    {
                        "$comment": "XF-08a: a complete list has at least one source.",
                        "if": {"required": ["coverage"],
                               "properties": {"coverage": {"const": "all_known_sources_listed"}}},
                        "then": {"properties": {"sources": {"minItems": 1}}},
                    },
                    {
                        "$comment": "XF-08b: no planned income / not answered means an empty list.",
                        "if": {"required": ["coverage"],
                               "properties": {"coverage": {"enum": ["no_planned_income", "not_answered"]}}},
                        "then": {"properties": {"sources": {"maxItems": 0}}},
                    },
                ],
            },
            "incomeSource": {
                "type": "object",
                "additionalProperties": False,
                "required": ["id", "kind", "owner", "amount", "period", "tax_basis", "price_basis",
                             "start", "escalation_bp", "dependability"],
                "properties": {
                    "id": {"type": "string", "pattern": "^src-[0-9]{1,2}$",
                           "description": "Opaque local key (src-1 ... src-99). Never a name or label."},
                    "kind": {"enum": ["qpp_cpp", "oas", "workplace_pension", "annuity", "employment",
                                      "rental", "business", "other"]},
                    "owner": {"enum": ["self", "partner", "joint"],
                              "description": "Whose age an age-based start/end refers to (joint = self)."},
                    "amount": restrict(q, None, None, None, "Income amount, CAD cents, on the stated period."),
                    "period": {"enum": ["monthly", "annual"]},
                    "tax_basis": {"enum": ["gross", "net", "unknown"],
                                  "description": "gross = before income tax; net = after income tax; unknown = participant not sure."},
                    "price_basis": {"enum": ["today_dollars", "start_year_dollars", "unknown"],
                                    "description": "Whether the amount is in today's prices or in the prices of the year it starts. Irrelevant (ignored) when already receiving."},
                    "start": point_def(True),
                    "end": point_def(False),
                    "escalation_bp": restrict(q, ["zero", "estimated", "confirmed"], RATE_BP[0], RATE_BP[1],
                                              "q_j: explicit annual increase after the start, basis points; 0% to 10%. Cannot be unknown."),
                    "dependability": {"enum": ["scheduled", "uncertain"],
                                      "description": "There is deliberately no 'guaranteed' value."},
                },
                "allOf": period_limit("amount", LIMITS["income"]["monthly"], LIMITS["income"]["annual"]),
            },
            "chapterSavings": {
                "type": "object",
                "additionalProperties": False,
                "description": "Chapter 3 - What have you built? Every field optional; absent means not entered (treated as unknown).",
                "properties": {
                    "accounts": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "rrsp_rrif": {"$ref": "#/$defs/balance"},
                            "tfsa": {"$ref": "#/$defs/balance"},
                            "non_registered": {"$ref": "#/$defs/balance"},
                            "other": {"$ref": "#/$defs/balance"},
                            "not_sure": {"$ref": "#/$defs/balance"},
                        },
                    },
                    "pension_value": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["amount", "also_entered_as_income"],
                        "properties": {
                            "amount": {"$ref": "#/$defs/balance"},
                            "also_entered_as_income": {"enum": ["yes", "no", "not_sure"],
                                                       "description": "Double-count guard: is this pension also listed as an income source in chapter 2?"},
                        },
                    },
                    "home_value": {"$ref": "#/$defs/illiquidAsset"},
                    "business_value": {"$ref": "#/$defs/illiquidAsset"},
                },
            },
            "illiquidAsset": {
                "type": "object",
                "additionalProperties": False,
                "required": ["amount"],
                "properties": {
                    "amount": {"$ref": "#/$defs/balance"},
                    "excluded_from_spendable": {
                        "const": True, "default": True,
                        "description": "Contract 1.0 models no disposal assumption, so only true is accepted. A sale/disposal assumption needs contract 1.1 plus A6 and G3 review.",
                    },
                },
            },
            "chapterTiming": {
                "type": "object",
                "additionalProperties": False,
                "required": ["current_age", "retirement_age", "planning_horizon_years", "inflation_bp"],
                "description": "Chapter 4 - When do the pieces change?",
                "properties": {
                    "current_age": restrict(q, ["unknown", "estimated", "confirmed"], CURRENT_AGE[0], CURRENT_AGE[1],
                                            "Whole years, 18 to 100; the age used for calendar year t=0."),
                    "retirement_age": restrict(q, ["unknown", "estimated", "confirmed"], RETIREMENT_AGE[0], RETIREMENT_AGE[1],
                                               "Whole years, 30 to 100, not earlier than current age (already retired: use current age)."),
                    "household": {"$ref": "#/$defs/household"},
                    "planning_horizon_years": restrict(q, ["estimated"], HORIZON[0], HORIZON[1],
                                                       "H: number of retirement years illustrated, 1 to 60, and last illustrated age <= 120. An illustration assumption, not a life-expectancy prediction."),
                    "inflation_bp": {"$ref": "#/$defs/rateAssumption", "description": "i: annual inflation scenario, basis points."},
                    "capital_illustration_return_bp": {"$ref": "#/$defs/rateAssumption",
                                                       "description": "r: optional nominal net annual return, used only by the capital illustration, which is OFF by default."},
                },
                "allOf": (
                    [{"$comment": "XF-01: retirement_age >= current_age (enumerated)."}]
                    + not_before("current_age", "retirement_age", CURRENT_AGE[0], CURRENT_AGE[1], RETIREMENT_AGE[0])
                    + [{"$comment": "XF-03: retirement_age + planning_horizon_years - 1 <= 120 (enumerated)."}]
                    + horizon_cap()
                ),
            },
            "household": {
                "type": "object",
                "additionalProperties": False,
                "required": ["partner_current_age", "partner_retirement_age"],
                "description": "Optional household timing (spouse or partner). Ages only; no identity.",
                "properties": {
                    "partner_current_age": restrict(q, ["unknown", "estimated", "confirmed"], CURRENT_AGE[0], CURRENT_AGE[1]),
                    "partner_retirement_age": restrict(q, ["unknown", "estimated", "confirmed"], RETIREMENT_AGE[0], RETIREMENT_AGE[1]),
                },
                "allOf": (
                    [{"$comment": "XF-02: partner_retirement_age >= partner_current_age (enumerated)."}]
                    + not_before("partner_current_age", "partner_retirement_age", CURRENT_AGE[0], CURRENT_AGE[1], RETIREMENT_AGE[0])
                ),
            },
        },
    }
    return schema


def emit(obj, level=0):
    """Pretty JSON; enumerated clauses (marked __compact__) go on one line each."""
    pad, inner = " " * level, " " * (level + 1)
    if isinstance(obj, dict):
        if obj.get("__compact__"):
            clean = {k: v for k, v in obj.items() if k != "__compact__"}
            return json.dumps(clean, ensure_ascii=False, separators=(", ", ": "))
        if not obj:
            return "{}"
        items = [f"{inner}{json.dumps(k)}: {emit(v, level + 1)}" for k, v in obj.items()]
        return "{\n" + ",\n".join(items) + "\n" + pad + "}"
    if isinstance(obj, list):
        if not obj:
            return "[]"
        if all(not isinstance(x, (dict, list)) for x in obj):
            return json.dumps(obj, ensure_ascii=False)
        items = [f"{inner}{emit(v, level + 1)}" for v in obj]
        return "[\n" + ",\n".join(items) + "\n" + pad + "]"
    return json.dumps(obj, ensure_ascii=False)


def main():
    text = emit(build()) + "\n"
    json.loads(text)  # self-check: still valid JSON
    if "--check" in sys.argv:
        ok = OUT.exists() and OUT.read_text() == text
        print(f"schema on disk matches builder: {ok}")
        sys.exit(0 if ok else 1)
    OUT.write_text(text)
    print(f"wrote {OUT} ({len(text)} bytes)")


if __name__ == "__main__":
    main()
