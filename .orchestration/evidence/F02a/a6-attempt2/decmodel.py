#!/usr/bin/env python3
"""A6 F02a attempt-2 independent model of workshop-math.md 1.0 + workshop-clip-rules.md 1.0.

Method (deliberately different from the builder's fractions.Fraction reference, from the attempt-3 A6
BigInt-rational JS model and from the attempt-1 A6 scaled-integer model):

  * Every product/sum is a decimal.Decimal computed in a context with precision 4000 and the Inexact
    and Rounded signals TRAPPED. Growth factors (1 + bp/10000)^n are finite decimals, so D_t, P_j,t,
    G_t, S_t are computed exactly or the run aborts (it never silently rounds).
  * Divisions (today-dollar deflation, C_R) are done in a separate context (precision 4000, no trap).
    If the quotient is inexact, the true value cannot be a half-cent tie (a tie is a short finite
    decimal and would have divided exactly), and the error bound 10^-(4000-17) is far below the
    minimum distance 1/(2*den) to a tie (den < 10^1700 within the input limits; asserted at runtime).
  * Exact strings: finite decimals are printed in shortest plain form; C_R as p/q is reduced with
    math.gcd on the integer scalings of the Decimal numerator/denominator.
  * Written from the contract text only. It does not import or read any builder script.

Faults are switches (set of names) passed to compute(); the empty set is the contract reading.
"""
from __future__ import annotations

import decimal
import math
from decimal import Decimal, localcontext, ROUND_HALF_EVEN, ROUND_HALF_UP

PREC = 4000
EXACT_CTX = decimal.Context(prec=PREC, rounding=ROUND_HALF_EVEN,
                            traps=[decimal.Inexact, decimal.Rounded, decimal.InvalidOperation,
                                   decimal.DivisionByZero, decimal.Overflow])
DIV_CTX = decimal.Context(prec=PREC, rounding=ROUND_HALF_EVEN,
                          traps=[decimal.InvalidOperation, decimal.DivisionByZero, decimal.Overflow])

SIX = ("amount_unknown", "start_unknown", "start_unresolvable", "end_unknown", "end_unresolvable",
       "price_basis_unknown")
ALL_CODES_ORDER = ("start_unknown", "start_unresolvable", "end_unknown", "end_unresolvable",
                   "amount_unknown", "price_basis_unknown", "gross", "tax_basis_unknown")
BLOCKING_FLAGS = ("gross_net_mismatch", "tax_basis_unknown", "incomplete_income", "pension_double_count_risk")
ACCESSIBLE = ("rrsp_rrif", "tfsa", "non_registered", "other", "not_sure")
YEAR_INDEX_TXT = "t=0 is calendar year base_year; annual totals per calendar year"
ROUNDING_TXT = "exact rational arithmetic; half-even to whole cents at display only"
INF = None  # marker for an absent end (e = infinity)


def factor(bp: int, n: int) -> Decimal:
    """(1 + bp/10000)^n as an exact Decimal (n >= 0)."""
    assert n >= 0
    with localcontext(EXACT_CTX):
        base = Decimal(10000 + bp).scaleb(-4)
        out = Decimal(1)
        for _ in range(n):
            out = out * base
        return out


def mul(*xs: Decimal) -> Decimal:
    with localcontext(EXACT_CTX):
        out = Decimal(1)
        for x in xs:
            out = out * x
        return out


def add(*xs: Decimal) -> Decimal:
    with localcontext(EXACT_CTX):
        out = Decimal(0)
        for x in xs:
            out = out + x
        return out


def sub(a: Decimal, b: Decimal) -> Decimal:
    with localcontext(EXACT_CTX):
        return a - b


def div(a: Decimal, b: Decimal) -> tuple[Decimal, bool]:
    """Return (quotient, exact?)."""
    with localcontext(DIV_CTX) as ctx:
        ctx.clear_flags()
        q = a / b
        return q, not ctx.flags[decimal.Inexact]


def cents(x: Decimal, rounding=ROUND_HALF_EVEN) -> int:
    """Round an exact value to whole cents (input already in cents)."""
    with localcontext(decimal.Context(prec=PREC, rounding=rounding)):
        return int(x.quantize(Decimal(1), rounding=rounding))


def cents_of_quotient(a: Decimal, b: Decimal, rounding=ROUND_HALF_EVEN) -> int:
    q, exact = div(a, b)
    if not exact:
        # a tie would be a short finite decimal => exact; so only the error bound matters
        den_digits = len(str(abs(b.as_integer_ratio()[1]))) + len(str(abs(b.as_integer_ratio()[0])))
        assert den_digits < 1700, "division guard: denominator too large for the error bound"
    return cents(q, rounding)


def dstr(x: Decimal) -> str:
    """Shortest plain decimal string of an exact finite Decimal."""
    if x == 0:
        return "0"
    s = format(x, "f")
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s


def ratio_str(num: Decimal, den: Decimal) -> str:
    """Exact string of num/den (both exact finite Decimals): decimal if finite, else p/q reduced."""
    n1, d1 = num.as_integer_ratio()
    n2, d2 = den.as_integer_ratio()
    p, q = n1 * d2, d1 * n2
    g = math.gcd(p, q)
    p, q = p // g, q // g
    qq = q
    while qq % 2 == 0:
        qq //= 2
    while qq % 5 == 0:
        qq //= 5
    if qq == 1:
        with localcontext(EXACT_CTX):
            return dstr(Decimal(p) / Decimal(q))
    return f"{p}/{q}"


def qv(q):
    """(known?, value) of a quantity wrapper."""
    if q is None or q.get("status") == "unknown":
        return None
    return int(q["value"])


# ----------------------------------------------------------------------------------------------------------
class Src:
    def __init__(self, s: dict, A, Ap, has_household: bool, faults: set):
        self.raw = s
        self.id = s["id"]
        self.kind = s["kind"]
        self.owner = s["owner"]
        self.tax = s["tax_basis"]
        self.price = s["price_basis"]
        self.dep = s["dependability"]
        self.amount_status = s["amount"]["status"]
        v = qv(s["amount"])
        self.a = None if v is None else v * (12 if s["period"] == "monthly" else 1)
        self.q_bp = int(s["escalation_bp"]["value"])
        # owner's age A_o
        if self.owner == "partner":
            self.Ao = Ap
        elif self.owner == "joint":
            if "joint_uses_partner" in faults:
                self.Ao = Ap
            elif "joint_uses_older" in faults:
                self.Ao = None if (A is None or Ap is None) else max(A, Ap)
            elif "joint_uses_younger" in faults:
                self.Ao = None if (A is None or Ap is None) else min(A, Ap)
            elif "joint_start_uses_partner" in faults or "joint_end_uses_partner" in faults:
                self.Ao = A  # handled per bound below
            else:
                self.Ao = A
        else:
            self.Ao = A
        # start
        st = s["start"]
        self.start_ref = st["reference"]
        self.start_point_unknown = False
        self.start_unres = False
        Ao_start = Ap if (self.owner == "joint" and "joint_start_uses_partner" in faults) else self.Ao
        Ao_end = Ap if (self.owner == "joint" and "joint_end_uses_partner" in faults) else self.Ao
        if self.start_ref == "already_receiving":
            self.s = 0
        else:
            pv = qv(st["point"])
            if pv is None:
                self.s = "unknown"
                self.start_point_unknown = True
            elif self.start_ref == "year_index":
                self.s = pv
            else:  # age
                if Ao_start is None:
                    self.s = "unresolvable"
                    self.start_unres = True
                else:
                    self.s = pv - Ao_start
        # end
        self.end_present = "end" in s
        self.end_point_unknown = False
        self.end_unres = False
        if not self.end_present:
            self.e = INF
        else:
            en = s["end"]
            pv = qv(en["point"])
            if pv is None:
                self.e = "unknown"
                self.end_point_unknown = True
            elif en["reference"] == "year_index":
                self.e = pv
            else:
                if Ao_end is None:
                    self.e = "unresolvable"
                    self.end_unres = True
                else:
                    self.e = pv - Ao_end
        self.s_res = isinstance(self.s, int)
        self.e_res = (self.e is INF) or isinstance(self.e, int)

    def base(self, i_bp: int, faults: set):
        """b_j, or None when unknown / undefined."""
        if not self.s_res or self.a is None:
            return None
        s = self.s
        a = Decimal(self.a)
        if s == 0 or self.price == "start_year_dollars":
            if "today_dollars_as_nominal" in faults:
                pass
            return a
        if self.price == "today_dollars":
            if "today_dollars_as_nominal" in faults:
                return a
            if "today_dollars_uses_q" in faults:
                return mul(a, factor(self.q_bp, s))
            if "today_dollars_to_tR" in faults and getattr(self, "tR", None) is not None:
                return mul(a, factor(i_bp, self.tR))
            if "today_dollars_one_year_short" in faults:
                return mul(a, factor(i_bp, s - 1))
            return mul(a, factor(i_bp, s))
        return None  # price_basis unknown and s > 0

    def pays(self, t: int) -> str:
        if self.amount_status == "zero":
            return "no"
        if self.e_res and self.e is not INF and t >= self.e:
            return "no"
        if self.s_res and t < self.s:
            return "no"
        if self.s_res and self.e_res:
            return "yes"
        return "unknown"

    def codes(self, t: int) -> list[str]:
        if self.pays(t) == "no":
            return []
        out = []
        if self.start_point_unknown:
            out.append("start_unknown")
        if self.start_unres:
            out.append("start_unresolvable")
        if self.end_present and self.end_point_unknown:
            out.append("end_unknown")
        if self.end_unres:
            out.append("end_unresolvable")
        if self.amount_status == "unknown":
            out.append("amount_unknown")
        if self.price == "unknown" and not (self.s_res and self.s == 0):
            out.append("price_basis_unknown")
        if self.tax == "gross":
            out.append("gross")
        if self.tax == "unknown":
            out.append("tax_basis_unknown")
        return out

    def P(self, t: int, i_bp: int, faults: set):
        """Exact nominal payment or None (unknown)."""
        p = self.pays(t)
        if p == "no":
            return Decimal(0)
        if p == "unknown":
            return None
        b = self.base(i_bp, faults)
        if b is None:
            return None
        q_bp = self.q_bp
        if "today_dollars_indexed_at_i_after_start" in faults and self.price == "today_dollars" and self.s > 0:
            q_bp = i_bp
        return mul(b, factor(q_bp, t - self.s))


# ----------------------------------------------------------------------------------------------------------
def compute(doc: dict, faults: set | None = None) -> dict:
    faults = set(faults or ())
    ch = doc["chapters"]
    Y0 = int(doc["base_year"])
    tm = ch["timing"]
    A = qv(tm["current_age"])
    R = qv(tm["retirement_age"])
    H = int(tm["planning_horizon_years"]["value"])
    i_bp = int(tm["inflation_bp"]["value"])
    r_q = tm.get("capital_illustration_return_bp")
    r_bp = None if r_q is None else int(r_q["value"])
    hh = tm.get("household")
    Ap = qv(hh["partner_current_age"]) if hh else None
    Rp = qv(hh["partner_retirement_age"]) if hh else None

    life = ch["life"]["spending"]
    sv = qv(life["amount"])
    a = None if sv is None else sv * (12 if life["period"] == "monthly" else 1)

    inc = ch["income"]
    coverage = inc["coverage"]
    cov_complete = coverage in ("all_known_sources_listed", "no_planned_income")
    srcs = [Src(s, A, Ap, hh is not None, faults) for s in inc.get("sources", [])]

    window_known = A is not None and R is not None
    if window_known:
        tR = R - A
        W = list(range(tR, tR + H))
    else:
        tR = None
        W = []
    Tstar = W if window_known else list(range(0, 84))
    for _s in srcs:
        _s.tR = tR

    glob = []
    if A is None:
        glob.append("current_age_unknown")
    if R is None:
        glob.append("retirement_age_unknown")
    if a is None:
        glob.append("spending_unknown")
    if coverage == "not_answered":
        glob.append("income_not_answered")
    if coverage == "some_sources_may_be_missing":
        glob.append("income_list_partial")
    row_glob = [c for c in glob if c in ("spending_unknown", "income_not_answered", "income_list_partial")]

    # T* scan
    scan_codes = set()
    for t in Tstar:
        for s in srcs:
            for c in s.codes(t):
                scan_codes.add(f"{c}:{s.id}")

    years = []
    any_six_in_window = False
    any_gross_in_window = False
    any_tbu_in_window = False
    gaps_exact = {}
    for t in W:
        D = None if a is None else mul(Decimal(a), factor(i_bp, t))
        Ps = {s.id: s.P(t, i_bp, faults) for s in srcs}
        codes = set(row_glob)
        for s in srcs:
            for c in s.codes(t):
                codes.add(f"{c}:{s.id}")
                if c in SIX:
                    any_six_in_window = True
                if c == "gross":
                    any_gross_in_window = True
                if c == "tax_basis_unknown":
                    any_tbu_in_window = True
        reasons = sorted(codes)
        computed = not reasons
        row = {
            "t": t,
            "calendar_year": Y0 + t,
            "age": A + t,
            "spending_cents": None if D is None else cents(D),
            "income_by_source_cents": {k: (None if v is None else cents(v)) for k, v in Ps.items()},
        }
        # display groups
        if not cov_complete:
            groups = {"net": None, "gross": None, "unknown": None}
        else:
            groups = {}
            for basis in ("net", "gross", "unknown"):
                members = [Ps[s.id] for s in srcs if s.tax == basis and (Ps[s.id] is None or Ps[s.id] != 0)]
                if any(m is None for m in members):
                    groups[basis] = None
                elif not members:
                    groups[basis] = 0
                elif "group_from_rounded_rows" in faults:
                    groups[basis] = sum(cents(m) for m in members)
                else:
                    groups[basis] = cents(add(*members))
        row["income_net_cents"] = groups["net"]
        row["income_gross_cents"] = groups["gross"]
        row["income_unknown_basis_cents"] = groups["unknown"]
        row["status"] = "computed" if computed else "not_computable"
        row["reasons"] = reasons
        if computed:
            I = add(*Ps.values()) if Ps else Decimal(0)
            if "gap_from_rounded_rows" in faults:
                Ir = Decimal(sum(cents(v) for v in Ps.values()))
                Dr = Decimal(cents(D))
                G = max(Decimal(0), sub(Dr, Ir))
                S = max(Decimal(0), sub(Ir, Dr))
            else:
                G = max(Decimal(0), sub(D, I))
                S = max(Decimal(0), sub(I, D))
            defl = factor(i_bp, t)
            if "deflate_rounded_gap" in faults:
                gt = cents_of_quotient(Decimal(cents(G)), defl)
                st = cents_of_quotient(Decimal(cents(S)), defl)
            else:
                gt = cents_of_quotient(G, defl)
                st = cents_of_quotient(S, defl)
            rnd = ROUND_HALF_UP if "half_up" in faults else ROUND_HALF_EVEN
            row["gap_cents"] = cents(G, rnd)
            row["surplus_cents"] = cents(S, rnd)
            row["gap_today_dollars_cents"] = gt
            row["surplus_today_dollars_cents"] = st
            row["exact"] = {"spending": dstr(D), "income_compared": dstr(I), "gap": dstr(G), "surplus": dstr(S)}
            gaps_exact[t] = G
        else:
            row["gap_cents"] = None
            row["surplus_cents"] = None
            row["gap_today_dollars_cents"] = None
            row["surplus_today_dollars_cents"] = None
            row["exact"] = {"spending": None if D is None else dstr(D)}
        if hh is not None and Ap is not None:
            row["partner_age"] = Ap + t
        years.append(row)

    # completeness
    row_src_codes = set()
    for y in years:
        for c in y["reasons"]:
            if ":" in c:
                row_src_codes.add(c)
    reasons = sorted(set(glob) | row_src_codes | scan_codes)
    if not window_known:
        state = "incomplete_unknown_timing"
    elif a is None:
        state = "incomplete_unknown_spending"
    elif (not cov_complete) or any_six_in_window:
        state = "incomplete_unknown_income"
    elif any_gross_in_window:
        state = "basis_mismatch"
    elif any_tbu_in_window:
        state = "basis_unknown"
    else:
        state = "complete"
        assert all(y["status"] == "computed" for y in years)

    # predicates
    scan_bare = {c.split(":")[0] for c in scan_codes}
    M = (not cov_complete) or bool(scan_bare & set(SIX))
    X = bool(scan_bare & {"gross", "tax_basis_unknown"})
    Hh = (hh is not None and None not in (A, R, Ap, Rp) and (Rp - Ap) != (R - A))
    C = (not window_known) or (a is None)
    F = window_known and any(y["status"] == "computed" and y["gap_cents"] is not None and gaps_exact[y["t"]] > 0
                             for y in years)

    # flags
    sav = ch.get("savings", {}) or {}
    accts = sav.get("accounts", {}) or {}
    acc_pos = [k for k in ACCESSIBLE if k in accts and (qv(accts[k]) or 0) > 0]
    home_pos = any((qv(sav[k]["amount"]) or 0) > 0 for k in ("home_value", "business_value") if k in sav)
    flags = set()
    if "gross" in scan_bare:
        flags.add("gross_net_mismatch")
    if "tax_basis_unknown" in scan_bare:
        flags.add("tax_basis_unknown")
    if M:
        flags.add("incomplete_income")
    if home_pos and not acc_pos:
        flags.add("housing_only_wealth")
    pv = sav.get("pension_value")
    if pv is not None and (qv(pv["amount"]) or 0) > 0 and pv["also_entered_as_income"] in ("yes", "not_sure"):
        flags.add("pension_double_count_risk")
    if any(s.kind in ("rental", "business") and s.dep == "scheduled" for s in srcs):
        flags.add("uncertain_kind_labelled_scheduled")
    if window_known:
        lim = tR + H
        cond = any(s.amount_status != "zero" and s.s_res and s.s >= lim for s in srcs)
        if Ap is not None and Rp is not None and (Rp - Ap) >= lim:
            cond = True
        if cond:
            flags.add("horizon_shorter_than_timeline")
    if Hh:
        flags.add("household_timing_differs")
    if any(s.dep == "uncertain" and any(s.pays(t) in ("yes", "unknown") for t in Tstar) for s in srcs):
        flags.add("includes_uncertain_income")
    flags = sorted(flags)

    savings_summary = {
        "accessible_categories_with_positive_value": acc_pos,
        "home_or_business_positive_value": home_pos,
        "excluded_from_spendable": [k for k in ("home_value", "business_value") if k in sav],
        "pension_value_kept_separate": pv is not None,
        "totals_computed": False,
    }

    # capital illustration reference
    ref = {"r_bp": r_bp, "flow_timing": "end_of_year"}
    ncr = []
    if r_bp is None:
        ncr.append("return_assumption_absent")
    if state != "complete":
        ncr.append("state_not_complete")
    if ncr:
        ref.update({"computable": False, "not_computable_reasons": sorted(ncr),
                    "display_eligible_if_enabled": False, "ineligible_reasons": sorted(ncr),
                    "C_R_cents": None, "C_R_exact": None, "valued_at": None})
    else:
        # C_R = [sum_k G_{tR+k} (1+r)^{H-1-k}] / (1+r)^H   (discount to the START of year t_R)
        disc_to = 0 if "cr_discount_to_t0" in faults else tR
        terms = []
        for k in range(H):
            terms.append(mul(gaps_exact[tR + k], factor(r_bp, H - 1 - k)))
        num = add(*terms)
        den = factor(r_bp, H)
        if disc_to == 0 and tR > 0:
            den = mul(den, factor(r_bp, tR))
        inel = sorted(set(f for f in BLOCKING_FLAGS if f in flags) |
                      ({"no_positive_gap"} if not any(g > 0 for g in gaps_exact.values()) else set()))
        if "cr_zero_eligible" in faults:
            inel = [x for x in inel if x != "no_positive_gap"]
        ref.update({"computable": True, "not_computable_reasons": [],
                    "display_eligible_if_enabled": not inel, "ineligible_reasons": inel,
                    "C_R_cents": cents_of_quotient(num, den), "C_R_exact": ratio_str(num, den),
                    "valued_at": {"t": tR, "calendar_year": Y0 + tR, "point": "start_of_year"}})

    # clip
    if C:
        sel, why = "W10", "core_inputs_missing"
    elif M:
        sel, why = "W06", "missing_income"
    elif X:
        sel, why = "W08", "tax_basis"
    elif Hh:
        sel, why = "W09", "household_timing"
    elif F:
        sel, why = "W07", "funding_gap"
    else:
        sel, why = "W10", "neutral_fallback"

    return {
        "contract_version": "1.0",
        "assumptions_echo": {"base_year": Y0, "inflation_bp": i_bp, "planning_horizon_years": H,
                             "capital_illustration_return_bp": r_bp, "year_index": YEAR_INDEX_TXT,
                             "rounding": ROUNDING_TXT},
        "window": None if not window_known else {
            "t_R": tR, "first_t": tR, "last_t": tR + H - 1, "first_calendar_year": Y0 + tR,
            "last_calendar_year": Y0 + tR + H - 1, "first_age": R, "last_age": R + H - 1},
        "completeness": {"state": state, "reasons": reasons},
        "years": years,
        "flags": flags,
        "savings_summary": savings_summary,
        "capital_illustration": {"feature_flag": "off", "displayed": False, "state": "disabled_by_flag",
                                 "reference_if_enabled": ref},
        "clip": {"predicates": {"C": C, "M": M, "X": X, "H": Hh, "F": F}, "selected": sel,
                 "selection_reason": why},
    }


def render_state(case: dict) -> dict:
    """workshop-clip-rules.md s7, written from the text."""
    sel, loc, av, build = case["selected"], case["locale"], case["availability"], case["build"]
    other = "en" if loc == "fr" else "fr"
    mine = av[sel][loc]
    if mine == "available":
        st = "play"
    elif mine == "test_media" and build == "local_test":
        st = "play_test_media_labelled"
    elif av[sel][other] == "available":
        st = "other_locale_only"
    else:
        st = "unavailable"
    any_test = any(v == "test_media" for c in av.values() for v in c.values())
    rc = "fail_test_media_referenced" if (build == "production" and any_test) else "pass"
    return {"selected": sel, "render_state": st, "disclosure_shown": True, "substitute_clip": None,
            "release_check": rc}


def semantic_errors(doc: dict) -> list[str]:
    """XF-04..XF-06 from workshop-inputs.md s6, written from the text."""
    errs = []
    tm = doc["chapters"]["timing"]
    A = qv(tm["current_age"])
    hh = tm.get("household")
    Ap = qv(hh["partner_current_age"]) if hh else None
    ids = []
    for s in doc["chapters"]["income"].get("sources", []):
        ids.append(s["id"])
        Ao = Ap if s["owner"] == "partner" else A

        def res(b):
            if b is None:
                return ("abs", None)
            if b["reference"] == "already_receiving":
                return ("ok", 0)
            v = qv(b["point"])
            if v is None:
                return ("unk", None)
            if b["reference"] == "year_index":
                return ("ok", v)
            if Ao is None:
                return ("unres", None)
            return ("ok", v - Ao)
        st = s["start"]
        if st["reference"] == "age" and qv(st["point"]) is not None and Ao is not None and qv(st["point"]) < Ao:
            errs.append(f"XF-04 {s['id']}")
        ks, vs = res(st)
        ke, ve = res(s.get("end"))
        if ks == "ok" and ke == "ok" and not ve > vs:
            errs.append(f"XF-05 {s['id']}")
    if len(ids) != len(set(ids)):
        errs.append("XF-06")
    return errs
