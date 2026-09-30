"""Reference model for the Workshop Journey calculation contract v1.0.

Evidence for task F02 (lane: workshop inputs, units and math). This is NOT
production code and is not imported by the application. It exists so that the
fixtures under .orchestration/contracts/fixtures/workshop/ are produced by an
exact-arithmetic implementation of workshop-math.md, and so that the
validator can apply the semantic (cross-chapter) rules of workshop-inputs.md.

All money is an integer number of CAD cents on input. Every intermediate value
is an exact rational (fractions.Fraction). Rounding (half-even, to whole cents)
happens only when a value is emitted for display.

Status: proposed - subject to A6 math review and professional review (G3).
"""
from __future__ import annotations

from fractions import Fraction as Fr

CONTRACT_VERSION = "1.0"
BP = 10000  # basis points per unit

# Every start/end change point is <= 82 (year_index <= 82; age-derived index
# <= 100 - 18). pays_j(t) is therefore constant for t >= 83, so scanning
# t in [0, 83] is equivalent to "all t >= 0" when the window is unknown.
SCAN_RANGE = range(0, 84)

INCOME_UNKNOWN_CODES = {
    "amount_unknown",
    "start_unknown",
    "start_unresolvable",
    "end_unknown",
    "end_unresolvable",
    "price_basis_unknown",
}
BASIS_CODES = {"gross", "tax_basis_unknown"}
UNCERTAIN_KINDS = {"rental", "business"}
ACCESSIBLE_CATEGORIES = ("rrsp_rrif", "tfsa", "non_registered", "other", "not_sure")
CAPITAL_BLOCKING_FLAGS = {
    "gross_net_mismatch",
    "tax_basis_unknown",
    "incomplete_income",
    "pension_double_count_risk",
}
CLIP_PRECEDENCE = (
    ("C", "W10", "core_inputs_missing"),
    ("M", "W06", "missing_income"),
    ("X", "W08", "tax_basis"),
    ("H", "W09", "household_timing"),
    ("F", "W07", "funding_gap"),
)
CLIP_FALLBACK = ("W10", "neutral_fallback")


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def qty(q):
    """Return (known, value) for a {status, value} quantity (or None = absent).

    unknown/absent -> (False, None); zero -> (True, 0); estimated/confirmed ->
    (True, value). Never turns an unknown into zero.
    """
    if q is None:
        return False, None
    status = q["status"]
    if status == "unknown":
        return False, None
    if status == "zero":
        return True, Fr(0)
    return True, Fr(q["value"])


def positive_known(q) -> bool:
    known, v = qty(q)
    return known and v > 0


def growth(bp: int, n: int) -> Fr:
    """(1 + bp/10000) ** n, exact. n may be 0."""
    if n < 0:
        raise ValueError("negative exponent is not used by the contract")
    return Fr(BP + bp, BP) ** n


def round_half_even(x: Fr) -> int:
    """Round an exact rational to the nearest integer; ties go to the even integer."""
    floor = x.numerator // x.denominator
    rem = x - floor
    half = Fr(1, 2)
    if rem > half:
        return floor + 1
    if rem < half:
        return floor
    return floor if floor % 2 == 0 else floor + 1


def exact_str(x: Fr) -> str:
    """Exact value as a finite decimal string when possible, else 'p/q'."""
    d = x.denominator
    twos = fives = 0
    while d % 2 == 0:
        d //= 2
        twos += 1
    while d % 5 == 0:
        d //= 5
        fives += 1
    if d != 1:
        return f"{x.numerator}/{x.denominator}"
    k = max(twos, fives)
    scaled = x * (10 ** k)
    assert scaled.denominator == 1
    n = scaled.numerator
    sign = "-" if n < 0 else ""
    digits = str(abs(n)).rjust(k + 1, "0")
    if k == 0:
        return sign + digits
    s = digits[:-k] + "." + digits[-k:]
    s = s.rstrip("0").rstrip(".")
    return sign + s


def annual(value: Fr, period: str) -> Fr:
    return value * 12 if period == "monthly" else value


# --------------------------------------------------------------------------
# semantic (cross-chapter) validation - workshop-inputs.md section 6, layer 2
# --------------------------------------------------------------------------
def _owner_age(owner: str, timing: dict):
    if owner == "partner":
        hh = timing.get("household")
        if hh is None:
            return False, None
        return qty(hh["partner_current_age"])
    return qty(timing["current_age"])


def _resolve_point(point_obj, owner_known, owner_age):
    """Resolve a start/end point to a year index.

    Returns (state, value): state in {"known", "unknown", "unresolvable"}.
    """
    ref = point_obj["reference"]
    if ref == "already_receiving":
        return "known", 0
    known, v = qty(point_obj.get("point"))
    if not known:
        return "unknown", None
    if ref == "year_index":
        return "known", int(v)
    # ref == "age"
    if not owner_known:
        return "unresolvable", None
    return "known", int(v - owner_age)


def semantic_errors(doc: dict):
    """Layer-2 rules that JSON Schema cannot express. Returns [(rule, path, msg)]."""
    errs = []
    timing = doc["chapters"]["timing"]
    sources = doc["chapters"]["income"]["sources"]
    seen = {}
    for idx, src in enumerate(sources):
        path = f"/chapters/income/sources/{idx}"
        if src["id"] in seen:
            errs.append(("XF-06", path + "/id",
                         f"source id {src['id']} repeats index {seen[src['id']]}"))
        else:
            seen[src["id"]] = idx
        o_known, o_age = _owner_age(src["owner"], timing)
        st = src["start"]
        if st["reference"] == "age":
            k, a = qty(st.get("point"))
            if k and o_known and a < o_age:
                errs.append(("XF-04", path + "/start/point/value",
                             f"start age {a} is before the owner's current age {o_age}"))
        s_state, s = _resolve_point(st, o_known, o_age)
        if "end" in src:
            e_state, e = _resolve_point(src["end"], o_known, o_age)
            if s_state == "known" and e_state == "known" and e <= s:
                errs.append(("XF-05", path + "/end",
                             f"end index {e} is not after start index {s}"))
    return errs


# --------------------------------------------------------------------------
# the calculation - workshop-math.md
# --------------------------------------------------------------------------
# Injected implementation faults, used ONLY by the negative controls in validate.py
# to prove that the fixtures detect them. compute() never enables one by default.
FAULTS = frozenset({
    "unknown_spending_zero_rows",          # unknown spending read as 0 in the year rows only
    "start_unknown_as_not_paying",         # start point with status unknown read as "not paying"
    "start_unknown_as_already_receiving",  # start point with status unknown read as s_j = 0
    "start_unresolvable_as_not_paying",    # owner's age unknown: age-based start read as "not paying"
    "unresolved_end_as_open",              # unknown or unresolvable end read as "no end"
    "unknown_first",                       # s4 read with "unresolved start" before "t >= e_j"
    "first_code_only",                     # only the first unresolved input is reported per (j, t)
    "retirement_unknown_blocks_age_starts",  # R unknown makes self/joint age starts unresolvable
    "cr_discount_to_base",                 # C_R discounted to t = 0 instead of the start of t_R
    "ignore_no_positive_gap",              # C_R = 0 treated as display-eligible
    "incomplete_coverage_groups_as_listed",  # coverage not_answered/partial: groups filled from the list (0 if empty)
})


class Source:
    def __init__(self, src: dict, timing: dict, i_bp: int, faults=frozenset()):
        self.faults = faults
        self.id = src["id"]
        self.kind = src["kind"]
        self.tax_basis = src["tax_basis"]
        self.price_basis = src["price_basis"]
        self.dependability = src["dependability"]
        self.i_bp = i_bp
        self.q_bp = int(qty(src["escalation_bp"])[1])
        self.amount_zero = src["amount"]["status"] == "zero"
        a_known, a_val = qty(src["amount"])
        self.amount_known = a_known
        self.annual_amount = annual(a_val, src["period"]) if a_known else None
        o_known, o_age = _owner_age(src["owner"], timing)
        self.s_state, self.s = _resolve_point(src["start"], o_known, o_age)
        if "end" in src:
            self.e_state, self.e = _resolve_point(src["end"], o_known, o_age)
        else:
            self.e_state, self.e = "none", None

    def base_amount(self, s: int):
        """b_j, the nominal annual amount in year s_j = s (s4). None if it cannot be placed."""
        if not self.amount_known:
            return None
        if s == 0 or self.price_basis == "start_year_dollars":
            return self.annual_amount
        if self.price_basis == "today_dollars":
            return self.annual_amount * growth(self.i_bp, s)
        return None  # price_basis unknown and s > 0

    def at(self, t: int):
        """Return (known, value, codes, pays) for year index t (workshop-math.md s4).

        pays in {"yes", "no", "unknown"}; codes is a set of reason codes.
        Precedence (s4): zero-status -> "no"; then the two "no" tests, each of which
        needs only ONE resolved bound (t >= e_j with e_j resolved; t < s_j with s_j
        resolved); then "yes" if both bounds are resolved (or the end is absent);
        otherwise "unknown". When pays is not "no", EVERY applicable code attaches.
        """
        F = self.faults
        if self.amount_zero:
            return True, Fr(0), set(), "no"
        s_state, s, e_state, e = self.s_state, self.s, self.e_state, self.e
        # ---- injected faults (negative controls only) ----
        if s_state == "unknown" and "start_unknown_as_already_receiving" in F:
            s_state, s = "known", 0
        if e_state in ("unknown", "unresolvable") and "unresolved_end_as_open" in F:
            e_state, e = "none", None
        if s_state == "unknown" and "start_unknown_as_not_paying" in F:
            return True, Fr(0), set(), "no"
        if s_state == "unresolvable" and "start_unresolvable_as_not_paying" in F:
            return True, Fr(0), set(), "no"
        if s_state != "known" and "unknown_first" in F:
            code = "start_unknown" if s_state == "unknown" else "start_unresolvable"
            return False, None, {code} | self._basis_codes(), "unknown"
        # ---- rule 1: "no" needs only one resolved bound ----
        if e_state == "known" and t >= e:
            return True, Fr(0), set(), "no"
        if s_state == "known" and t < s:
            return True, Fr(0), set(), "no"
        # ---- rule 2: the source pays ("yes") or may pay ("unknown") ----
        pays = "yes" if (s_state == "known" and e_state in ("known", "none")) else "unknown"
        codes = set()
        if s_state == "unknown":
            codes.add("start_unknown")
        elif s_state == "unresolvable":
            codes.add("start_unresolvable")
        if e_state == "unknown":
            codes.add("end_unknown")
        elif e_state == "unresolvable":
            codes.add("end_unresolvable")
        if "first_code_only" in F and codes:
            codes = {sorted(codes, key=lambda c: not c.startswith("start"))[0]}
        else:
            if not self.amount_known:
                codes.add("amount_unknown")
            if self.price_basis == "unknown" and not (s_state == "known" and s == 0):
                codes.add("price_basis_unknown")
        unknown = bool(codes)
        codes |= self._basis_codes()
        if unknown:
            return False, None, codes, pays
        assert pays == "yes"
        value = self.base_amount(s) * growth(self.q_bp, t - s)
        return True, value, codes, "yes"

    def _basis_codes(self):
        if self.tax_basis == "gross":
            return {"gross"}
        if self.tax_basis == "unknown":
            return {"tax_basis_unknown"}
        return set()


def compute(doc: dict, faults=frozenset()) -> dict:
    unknown_faults = set(faults) - FAULTS
    if unknown_faults:
        raise ValueError(f"unknown fault names {sorted(unknown_faults)}")
    ch = doc["chapters"]
    timing = ch["timing"]
    base_year = doc["base_year"]
    i_bp = int(qty(timing["inflation_bp"])[1])
    H = int(timing["planning_horizon_years"]["value"])
    r_q = timing.get("capital_illustration_return_bp")
    r_bp = int(qty(r_q)[1]) if r_q is not None else None

    A_known, A = qty(timing["current_age"])
    R_known, R = qty(timing["retirement_age"])
    global_reasons = set()
    if not A_known:
        global_reasons.add("current_age_unknown")
    if not R_known:
        global_reasons.add("retirement_age_unknown")
    t_R = int(R - A) if (A_known and R_known) else None

    hh = timing.get("household")
    P_A_known = P_R_known = False
    t_R_partner = None
    if hh is not None:
        P_A_known, PA = qty(hh["partner_current_age"])
        P_R_known, PR = qty(hh["partner_retirement_age"])
        if P_A_known and P_R_known:
            t_R_partner = int(PR - PA)

    sp = ch["life"]["spending"]
    s_known, s_val = qty(sp["amount"])
    spending_annual = annual(s_val, sp["period"]) if s_known else None
    if not s_known:
        global_reasons.add("spending_unknown")

    inc = ch["income"]
    coverage = inc["coverage"]
    coverage_complete = coverage in ("all_known_sources_listed", "no_planned_income")
    if coverage == "not_answered":
        global_reasons.add("income_not_answered")
    elif coverage == "some_sources_may_be_missing":
        global_reasons.add("income_list_partial")

    sources = [Source(s, timing, i_bp, faults) for s in inc["sources"]]
    if "retirement_unknown_blocks_age_starts" in faults and not R_known:
        for raw, src in zip(inc["sources"], sources):
            if raw["owner"] != "partner" and raw["start"]["reference"] == "age" and src.s_state == "known":
                src.s_state, src.s = "unresolvable", None

    window = list(range(t_R, t_R + H)) if t_R is not None else None
    t_star = window if window is not None else list(SCAN_RANGE)

    # scan T* for predicates/flags
    star_codes = set()
    includes_uncertain = False
    for t in t_star:
        for src in sources:
            known, v, codes, pays = src.at(t)
            star_codes |= {f"{c}:{src.id}" for c in codes}
            if src.dependability == "uncertain" and pays in ("yes", "unknown"):
                includes_uncertain = True

    def has_code(codeset, names):
        return any(c.split(":", 1)[0] in names for c in codeset)

    M = (not coverage_complete) or has_code(star_codes, INCOME_UNKNOWN_CODES)
    X = has_code(star_codes, BASIS_CODES)

    # per-year rows
    years = []
    any_G_positive = False
    year_codes_union = set()
    if window is not None:
        for t in window:
            row_codes = set()
            row_s_known = s_known or "unknown_spending_zero_rows" in faults
            if not row_s_known:
                row_codes.add("spending_unknown")
            if coverage == "not_answered":
                row_codes.add("income_not_answered")
            elif coverage == "some_sources_may_be_missing":
                row_codes.add("income_list_partial")
            if s_known:
                D = spending_annual * growth(i_bp, t)
            else:
                D = Fr(0) if row_s_known else None
            per_source = {}
            groups = {"net": [], "gross": [], "unknown": []}
            all_known = True
            total = Fr(0)
            for src in sources:
                known, v, codes, pays = src.at(t)
                row_codes |= {f"{c}:{src.id}" for c in codes}
                per_source[src.id] = round_half_even(v) if known else None
                if known and v == 0:
                    continue  # contributes an exact, basis-free zero
                groups[src.tax_basis].append(v if known else None)
                if known:
                    total += v
                else:
                    all_known = False
            computed = not row_codes
            # s5 display groups: when coverage is incomplete the year's income is unknown,
            # so every basis group is null (never 0, never the subtotal of the listed sources).
            if coverage_complete or "incomplete_coverage_groups_as_listed" in faults:
                g_net, g_gross, g_unk = (_group(groups["net"]), _group(groups["gross"]),
                                         _group(groups["unknown"]))
            else:
                g_net = g_gross = g_unk = None
            row = {
                "t": t,
                "calendar_year": base_year + t,
                "age": int(A) + t,
                "spending_cents": round_half_even(D) if D is not None else None,
                "income_by_source_cents": per_source,
                "income_net_cents": g_net,
                "income_gross_cents": g_gross,
                "income_unknown_basis_cents": g_unk,
                "status": "computed" if computed else "not_computable",
                "reasons": sorted(row_codes),
                "gap_cents": None,
                "surplus_cents": None,
                "gap_today_dollars_cents": None,
                "surplus_today_dollars_cents": None,
                "exact": {"spending": exact_str(D) if D is not None else None},
            }
            if hh is not None and P_A_known:
                row["partner_age"] = int(PA) + t
            if computed:
                assert all_known
                G = max(Fr(0), D - total)
                S = max(Fr(0), total - D)
                defl = growth(i_bp, t)
                row["gap_cents"] = round_half_even(G)
                row["surplus_cents"] = round_half_even(S)
                row["gap_today_dollars_cents"] = round_half_even(G / defl)
                row["surplus_today_dollars_cents"] = round_half_even(S / defl)
                row["exact"].update({
                    "income_compared": exact_str(total),
                    "gap": exact_str(G),
                    "surplus": exact_str(S),
                })
                row["_G"] = G
                if G > 0:
                    any_G_positive = True
            year_codes_union |= row_codes
            years.append(row)

    C = (window is None) or (not s_known)
    F = window is not None and any_G_positive
    Hh = (hh is not None and A_known and R_known and t_R_partner is not None
          and t_R_partner != t_R)

    # completeness
    if window is None:
        state = "incomplete_unknown_timing"
    elif not s_known:
        state = "incomplete_unknown_spending"
    elif (not coverage_complete) or has_code(year_codes_union, INCOME_UNKNOWN_CODES):
        state = "incomplete_unknown_income"
    elif has_code(year_codes_union, {"gross"}):
        state = "basis_mismatch"
    elif has_code(year_codes_union, {"tax_basis_unknown"}):
        state = "basis_unknown"
    else:
        state = "complete"
    reasons = sorted(global_reasons | star_codes | year_codes_union)

    # flags
    sv = ch["savings"]
    accounts = sv.get("accounts", {})
    accessible_positive = [k for k in ACCESSIBLE_CATEGORIES if positive_known(accounts.get(k))]
    home_pos = positive_known(sv.get("home_value", {}).get("amount"))
    biz_pos = positive_known(sv.get("business_value", {}).get("amount"))
    pv = sv.get("pension_value")
    flags = set()
    if has_code(star_codes, {"gross"}):
        flags.add("gross_net_mismatch")
    if has_code(star_codes, {"tax_basis_unknown"}):
        flags.add("tax_basis_unknown")
    if M:
        flags.add("incomplete_income")
    if (home_pos or biz_pos) and not accessible_positive:
        flags.add("housing_only_wealth")
    if pv is not None and positive_known(pv["amount"]) and pv["also_entered_as_income"] in ("yes", "not_sure"):
        flags.add("pension_double_count_risk")
    if any(s["kind"] in UNCERTAIN_KINDS and s["dependability"] == "scheduled" for s in inc["sources"]):
        flags.add("uncertain_kind_labelled_scheduled")
    if window is not None:
        end = t_R + H
        late_source = any((not src.amount_zero) and src.s_state == "known" and src.s >= end
                          for src in sources)
        late_partner = t_R_partner is not None and t_R_partner >= end
        if late_source or late_partner:
            flags.add("horizon_shorter_than_timeline")
    if Hh:
        flags.add("household_timing_differs")
    if includes_uncertain:
        flags.add("includes_uncertain_income")
    flags = sorted(flags)

    # capital illustration (feature flag OFF by default; reference value only)
    ci_ref = {
        "r_bp": r_bp,
        "computable": False,
        "not_computable_reasons": [],
        "display_eligible_if_enabled": False,
        "ineligible_reasons": [],
        "C_R_cents": None,
        "C_R_exact": None,
        "valued_at": None,
        "flow_timing": "end_of_year",
    }
    if r_bp is None:
        ci_ref["not_computable_reasons"].append("return_assumption_absent")
    if state != "complete":
        ci_ref["not_computable_reasons"].append("state_not_complete")
    if not ci_ref["not_computable_reasons"]:
        C_R = Fr(0)
        for k in range(H):
            G = years[k]["_G"]
            C_R += G / growth(r_bp, k + 1)
        if "cr_discount_to_base" in faults:
            C_R /= growth(r_bp, t_R)
        ci_ref["computable"] = True
        ci_ref["C_R_cents"] = round_half_even(C_R)
        ci_ref["C_R_exact"] = exact_str(C_R)
        ci_ref["valued_at"] = {"t": t_R, "calendar_year": base_year + t_R,
                               "point": "start_of_year"}
        inel = set(flags) & CAPITAL_BLOCKING_FLAGS
        if not any_G_positive and "ignore_no_positive_gap" not in faults:
            inel.add("no_positive_gap")
        inel = sorted(inel)  # s12: every code array is sorted by code point
        ci_ref["ineligible_reasons"] = inel
        ci_ref["display_eligible_if_enabled"] = not inel
    else:
        ci_ref["ineligible_reasons"] = list(ci_ref["not_computable_reasons"])

    for row in years:
        row.pop("_G", None)

    preds = {"C": C, "M": M, "X": X, "H": Hh, "F": F}
    selected, why = CLIP_FALLBACK
    for name, clip, reason in CLIP_PRECEDENCE:
        if preds[name]:
            selected, why = clip, reason
            break

    return {
        "contract_version": CONTRACT_VERSION,
        "assumptions_echo": {
            "base_year": base_year,
            "inflation_bp": i_bp,
            "planning_horizon_years": H,
            "capital_illustration_return_bp": r_bp,
            "year_index": "t=0 is calendar year base_year; annual totals per calendar year",
            "rounding": "exact rational arithmetic; half-even to whole cents at display only",
        },
        "window": None if window is None else {
            "t_R": t_R,
            "first_t": window[0],
            "last_t": window[-1],
            "first_calendar_year": base_year + window[0],
            "last_calendar_year": base_year + window[-1],
            "first_age": int(A) + window[0],
            "last_age": int(A) + window[-1],
        },
        "completeness": {"state": state, "reasons": reasons},
        "years": years,
        "flags": flags,
        "savings_summary": {
            "accessible_categories_with_positive_value": accessible_positive,
            "home_or_business_positive_value": home_pos or biz_pos,
            "excluded_from_spendable": [k for k in ("home_value", "business_value") if k in sv],
            "pension_value_kept_separate": pv is not None,
            "totals_computed": False,
        },
        "capital_illustration": {
            "feature_flag": "off",
            "displayed": False,
            "state": "disabled_by_flag",
            "reference_if_enabled": ci_ref,
        },
        "clip": {"predicates": preds, "selected": selected, "selection_reason": why},
    }


def _group(vals):
    """Sum of a basis group when coverage is complete (s5): 0 if the group has no
    member (a known zero), None if any member is unknown. Callers never use it when
    coverage is not_answered or some_sources_may_be_missing: those groups are None."""
    if not vals:
        return 0
    if any(v is None for v in vals):
        return None
    return round_half_even(sum(vals, Fr(0)))


# --------------------------------------------------------------------------
# media availability - workshop-clip-rules.md section 7
# --------------------------------------------------------------------------
BRANCH_CLIPS = ("W06", "W07", "W08", "W09", "W10")


def media_render_state(selected: str, locale: str, availability: dict, build: str) -> dict:
    """Decide how the selected clip is presented. Selection itself never depends on availability.

    availability: {clip_id: {"fr": state, "en": state}}, state in
    {"available", "unavailable", "test_media"}. build in {"local_test", "production"}.
    """
    other = "en" if locale == "fr" else "fr"
    here = availability.get(selected, {}).get(locale, "unavailable")
    there = availability.get(selected, {}).get(other, "unavailable")
    release_check = "pass"
    if build == "production" and "test_media" in (here, there):
        release_check = "fail_test_media_referenced"
    if here == "available":
        state = "play"
    elif here == "test_media" and build == "local_test":
        state = "play_test_media_labelled"
    elif there == "available":
        state = "other_locale_only"
    elif there == "test_media" and build == "local_test":
        state = "other_locale_test_media_labelled"
    else:
        state = "unavailable"
    return {
        "selected": selected,
        "render_state": state,
        "disclosure_shown": selected in BRANCH_CLIPS,
        "substitute_clip": None,
        "release_check": release_check,
    }
