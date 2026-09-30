"""Random generator of workshop inputs (valid and near-boundary) for property / differential runs.
Every generated document is filtered through the JSON Schema (Python jsonschema) and the
independent semantic checker, so only contract-valid documents are used."""
import copy
import json
import random

import jsonschema

SCHEMA = json.load(open("/home/user/bill/.orchestration/contracts/workshop-inputs.schema.json"))
VALIDATOR = jsonschema.Draft202012Validator(SCHEMA)


def q_unknown():
    return {"status": "unknown"}


def q_val(v, st=None):
    if v == 0:
        return {"status": "zero", "value": 0}
    return {"status": st or random.choice(["estimated", "confirmed"]), "value": v}


def rate(maxbp=1000):
    v = random.choice([0, 0, 100, 150, 200, 250, 300, 333, 499, 500, 1000, random.randint(0, maxbp)])
    return {"status": "zero", "value": 0} if v == 0 else {"status": "estimated", "value": v}


def gen_doc(rng: random.Random, p_unknown=0.12):
    random.seed(rng.random())
    A = random.randint(18, 100)
    Aknown = random.random() > p_unknown
    R = random.randint(max(30, A), 100)
    Rknown = random.random() > p_unknown
    Hmax = min(60, 121 - R)
    H = random.randint(1, max(1, min(Hmax, random.choice([3, 5, 10, 25, 60]))))
    timing = {
        "current_age": q_val(A, random.choice(["estimated", "confirmed"])) if Aknown else q_unknown(),
        "retirement_age": q_val(R, random.choice(["estimated", "confirmed"])) if Rknown else q_unknown(),
        "planning_horizon_years": {"status": "estimated", "value": H},
        "inflation_bp": rate(),
    }
    if random.random() < 0.6:
        timing["capital_illustration_return_bp"] = rate()
    household = random.random() < 0.35
    pA = pR = None
    if household:
        pA = random.randint(18, 100)
        pR = random.randint(max(30, pA), 100)
        timing["household"] = {
            "partner_current_age": q_val(pA) if random.random() > p_unknown else q_unknown(),
            "partner_retirement_age": q_val(pR) if random.random() > p_unknown else q_unknown(),
        }
    period = random.choice(["monthly", "annual"])
    smax = 10_000_000 if period == "monthly" else 120_000_000
    sv = random.choice([random.randint(1, smax), random.randint(100_000, 1_000_000), random.randint(1, 50)])
    spending = {"amount": q_val(sv) if random.random() > p_unknown else q_unknown(),
                "period": period, "tax_basis": "after_tax", "price_basis": "today_dollars", "unit": "household"}
    life = {"spending": spending}
    if random.random() < 0.3:
        life["lifestyle_focus"] = random.choice(["home_and_community", "travel", "family", "work_or_projects",
                                                 "learning_or_volunteering", "not_sure"])
    coverage = random.choices(["all_known_sources_listed", "some_sources_may_be_missing",
                               "no_planned_income", "not_answered"], [70, 10, 10, 10])[0]
    sources = []
    if coverage in ("all_known_sources_listed", "some_sources_may_be_missing"):
        n = random.randint(1 if coverage == "all_known_sources_listed" else 0, 8 if random.random() < 0.1 else 4)
        for j in range(n):
            owner = random.choice(["self", "self", "joint", "partner"]) if household else random.choice(["self", "joint"])
            oa = pA if owner == "partner" else A
            per = random.choice(["monthly", "annual"])
            amax = 5_000_000 if per == "monthly" else 60_000_000
            r_ = random.random()
            if r_ < p_unknown:
                amount = q_unknown()
            elif r_ < p_unknown + 0.05:
                amount = {"status": "zero", "value": 0}
            else:
                amount = q_val(random.choice([random.randint(1, amax), random.randint(10_000, 300_000), 1]))
            ref = random.choice(["already_receiving", "age", "age", "year_index"])
            start = {"reference": ref}
            s_idx = None
            if ref == "age":
                if random.random() < p_unknown:
                    start["point"] = q_unknown()
                else:
                    v = random.randint(max(18, oa), 100)
                    start["point"] = q_val(v, random.choice(["estimated", "confirmed"]))
                    s_idx = v - oa
            elif ref == "year_index":
                if random.random() < p_unknown:
                    start["point"] = q_unknown()
                else:
                    v = random.randint(1, 82)
                    start["point"] = q_val(v, "estimated")
                    s_idx = v
            else:
                s_idx = 0
            src = {"id": f"src-{j + 1}", "kind": random.choice(["qpp_cpp", "oas", "workplace_pension", "annuity",
                                                               "employment", "rental", "business", "other"]),
                   "owner": owner, "amount": amount, "period": per,
                   "tax_basis": random.choices(["net", "gross", "unknown"], [80, 10, 10])[0],
                   "price_basis": random.choices(["today_dollars", "start_year_dollars", "unknown"], [45, 45, 10])[0],
                   "start": start,
                   "escalation_bp": {"status": "zero", "value": 0} if random.random() < 0.4 else
                   {"status": random.choice(["estimated", "confirmed"]), "value": random.randint(1, 1000)},
                   "dependability": random.choice(["scheduled", "scheduled", "uncertain"])}
            if random.random() < 0.3:
                eref = random.choice(["age", "year_index"])
                if random.random() < p_unknown:
                    src["end"] = {"reference": eref, "point": q_unknown()}
                elif eref == "age":
                    lo = max(18, (oa + (s_idx or 0) + 1)) if s_idx is not None else 18
                    if lo <= 100:
                        src["end"] = {"reference": "age", "point": q_val(random.randint(lo, 100), "estimated")}
                else:
                    lo = max(1, (s_idx or 0) + 1) if s_idx is not None else 1
                    if lo <= 82:
                        src["end"] = {"reference": "year_index", "point": q_val(random.randint(lo, 82), "estimated")}
            sources.append(src)
    savings = {}
    if random.random() < 0.5:
        acc = {}
        for k in ["rrsp_rrif", "tfsa", "non_registered", "other", "not_sure"]:
            if random.random() < 0.4:
                acc[k] = random.choice([q_unknown(), {"status": "zero", "value": 0}, q_val(random.randint(1, 5_000_000_000))])
        savings["accounts"] = acc
    if random.random() < 0.3:
        savings["pension_value"] = {"amount": random.choice([q_unknown(), {"status": "zero", "value": 0}, q_val(random.randint(1, 5_000_000_000))]),
                                    "also_entered_as_income": random.choice(["yes", "no", "not_sure"])}
    for k in ("home_value", "business_value"):
        if random.random() < 0.3:
            savings[k] = {"amount": random.choice([q_unknown(), {"status": "zero", "value": 0}, q_val(random.randint(1, 5_000_000_000))])}
            if random.random() < 0.5:
                savings[k]["excluded_from_spendable"] = True
    return {"contract": "workshop-inputs", "contract_version": "1.0", "currency": "CAD", "base_year": random.randint(2026, 2100),
            "chapters": {"life": life, "income": {"coverage": coverage, "sources": sources}, "savings": savings, "timing": timing}}


def valid_docs(n, seed, semantic, p_unknown=0.12):
    rng = random.Random(seed)
    out = []
    tries = 0
    while len(out) < n:
        tries += 1
        d = gen_doc(rng, p_unknown)
        if any(True for _ in VALIDATOR.iter_errors(d)):
            continue
        if semantic(d):
            continue
        out.append(d)
    return out, tries
