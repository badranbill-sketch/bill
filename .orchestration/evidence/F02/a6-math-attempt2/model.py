"""
A6 F02 math verifier, attempt 2 -- independent implementation of workshop-math.md 1.0.

Written from the contract text only (workshop-math.md, workshop-inputs.md,
workshop-clip-rules.md). It does NOT import or read compute_fixtures.py,
workshop_reference.py or the attempt-1 model.mjs.

How it differs from the other implementations:
  * author (workshop_reference.py): Python fractions.Fraction, rational pairs.
  * A6 attempt 1 (model.mjs):       JavaScript BigInt rationals, year-by-year recurrence, Horner C_R.
  * this file:                      Python decimal.Decimal in an exact context (Inexact/Rounded
                                    TRAPPED, so any non-exact operation raises) with CLOSED-FORM
                                    powers (1+x)^n for every flow; the capital illustration and the
                                    deflated values use plain Python ints as (numerator, denominator)
                                    pairs over ONE common denominator (1+r)^H * 10^(4*t_max), reduced
                                    with math.gcd at the end.  Rounding half-even is done with integer
                                    divmod, not Decimal.quantize.

Faults can be injected through the `faults` set for negative-control runs.
"""
from __future__ import annotations

import decimal
import math
from typing import Any

# ---------------------------------------------------------------- exact decimal context
EXACT = decimal.Context(prec=5000, rounding=decimal.ROUND_HALF_EVEN,
                        traps=[decimal.Inexact, decimal.Rounded, decimal.InvalidOperation,
                               decimal.DivisionByZero, decimal.Overflow])
D = lambda x: EXACT.create_decimal(x)  # noqa: E731
TEN4 = 10000

M_CODES = ("amount_unknown", "start_unknown", "start_unresolvable",
           "end_unknown", "end_unresolvable", "price_basis_unknown")
X_CODES = ("gross", "tax_basis_unknown")
BLOCKING_FLAGS = ("gross_net_mismatch", "tax_basis_unknown", "incomplete_income",
                  "pension_double_count_risk")


def growth(bp: int, n: int) -> decimal.Decimal:
    """(1 + bp/10000)^n as an exact Decimal, closed form (single power, no loop)."""
    assert n >= 0
    return EXACT.divide(EXACT.power(D(TEN4 + bp), n), EXACT.power(D(TEN4), n))


def float_iter(x0, bp: int, n: int) -> float:
    """IEEE-double year-by-year growth, the way a naive JS runtime would do it (fault only)."""
    x = float(x0)
    f = 1 + bp / 10000
    for _ in range(n):
        x = x * f
    return x


def dec_to_ratio(x: decimal.Decimal) -> tuple[int, int]:
    """Exact (p, q) of a finite Decimal, via its digit tuple (not Fraction)."""
    sign, digits, exp = x.as_tuple()
    n = int("".join(map(str, digits))) if digits else 0
    if sign:
        n = -n
    if exp >= 0:
        return n * 10 ** exp, 1
    return n, 10 ** (-exp)


def round_half_even_ratio(p: int, q: int) -> int:
    assert q > 0 and p >= 0, (p, q)
    n, rem = divmod(p, q)
    twice = 2 * rem
    if twice > q or (twice == q and n % 2 == 1):
        n += 1
    return n


def round_half_up_ratio(p: int, q: int) -> int:  # used only by a negative control
    n, rem = divmod(p, q)
    return n + (1 if 2 * rem >= q else 0)


def exact_str_dec(x: decimal.Decimal) -> str:
    """Shortest plain decimal string (no exponent, no trailing zeros)."""
    p, q = dec_to_ratio(x)
    return exact_str_ratio(p, q)


def exact_str_ratio(p: int, q: int) -> str:
    g = math.gcd(p, q)
    p, q = p // g, q // g
    # finite decimal iff q = 2^a 5^b
    qq, a, b = q, 0, 0
    while qq % 2 == 0:
        qq //= 2
        a += 1
    while qq % 5 == 0:
        qq //= 5
        b += 1
    if qq != 1:
        return f"{p}/{q}"
    k = max(a, b)
    scaled = p * (10 ** k) // q  # exact
    s = str(scaled)
    if k == 0:
        return s
    s = s.rjust(k + 1, "0")
    ip, fp = s[:-k], s[-k:].rstrip("0")
    return ip if not fp else f"{ip}.{fp}"


# ---------------------------------------------------------------- helpers on inputs
def qval(q: dict | None):
    """Return int value, or None when unknown/absent. zero -> 0."""
    if q is None:
        return None
    st = q["status"]
    if st == "unknown":
        return None
    if st == "zero":
        return 0
    return int(q["value"])


class Src:
    pass


def resolve_bound(bound: dict | None, owner_age, is_start: bool):
    """Returns ('resolved', idx) | ('unknown', None) | ('unresolvable', None) | ('absent', None)."""
    if bound is None:
        return ("absent", None)
    ref = bound["reference"]
    if ref == "already_receiving":
        return ("resolved", 0)
    pt = bound["point"]
    if pt["status"] == "unknown":
        return ("unknown", None)
    v = int(pt["value"])
    if ref == "year_index":
        return ("resolved", v)
    # age
    if owner_age is None:
        return ("unresolvable", None)
    return ("resolved", v - owner_age)


def model(inp: dict, faults: frozenset = frozenset()) -> dict:
    ch = inp["chapters"]
    Y0 = inp["base_year"]
    life, income, savings, timing = ch["life"], ch["income"], ch["savings"], ch["timing"]

    # ---- assumptions
    i_bp = qval(timing["inflation_bp"])
    H = qval(timing["planning_horizon_years"])
    r_q = timing.get("capital_illustration_return_bp")
    r_bp = qval(r_q) if r_q is not None else None
    A = qval(timing["current_age"])
    R = qval(timing["retirement_age"])
    hh = timing.get("household")
    pA = qval(hh["partner_current_age"]) if hh else None
    pR = qval(hh["partner_retirement_age"]) if hh else None

    window_known = A is not None and R is not None
    tR = (R - A) if window_known else None

    # ---- spending a (cents/year, today's dollars)
    sp = life["spending"]
    sv = qval(sp["amount"])
    if sv is None:
        a = None
    else:
        a = 12 * sv if sp["period"] == "monthly" else sv
    if "unknown_spending_zero" in faults and a is None:
        a = 0

    def spend(t):
        if a is None:
            return None
        if "float_growth" in faults:
            return D(repr(float_iter(a, i_bp, t)))
        return EXACT.multiply(D(a), growth(i_bp, t))

    coverage = income["coverage"]
    if "partial_as_complete" in faults and coverage == "some_sources_may_be_missing":
        coverage = "all_known_sources_listed"
    if "not_answered_as_zero" in faults and coverage == "not_answered":
        coverage = "no_planned_income"

    # ---- sources
    srcs = []
    for s in income["sources"]:
        o = Src()
        o.id = s["id"]
        o.kind = s["kind"]
        o.dep = s["dependability"]
        o.tax = s["tax_basis"]
        if "unknown_tax_as_net" in faults and o.tax == "unknown":
            o.tax = "net"
        if "gross_as_net" in faults and o.tax == "gross":
            o.tax = "net"
        o.pb = s["price_basis"]
        o.amount_status = s["amount"]["status"]
        av = qval(s["amount"])
        if av is not None:
            mult = 12 if s["period"] == "monthly" else 1
            if "monthly_not_x12" in faults:
                mult = 1
            o.aj = mult * av
        else:
            o.aj = None
        o.q = qval(s["escalation_bp"])
        owner_age = pA if s["owner"] == "partner" else A
        if "partner_uses_self_age" in faults and s["owner"] == "partner":
            owner_age = A
        if "R_unknown_blocks_age_starts" in faults and R is None and s["owner"] != "partner":
            owner_age = None
        o.start_kind, o.s = resolve_bound(s["start"], owner_age, True)
        o.end_kind, o.e = resolve_bound(s.get("end"), owner_age, False)
        # code conditions straight from the §4 table (evaluated on the raw input)
        o.start_pt_unknown = o.start_kind == "unknown"
        o.start_unres = o.start_kind == "unresolvable"
        o.has_end = s.get("end") is not None
        o.end_pt_unknown = o.end_kind == "unknown"
        o.end_unres = o.end_kind == "unresolvable"
        # --- injected faults on unknown bounds (negative controls only)
        if "start_unknown_as_already" in faults and o.start_kind == "unknown":
            o.start_kind, o.s, o.start_pt_unknown = "resolved", 0, False
        if "start_unknown_as_not_paying" in faults and o.start_kind == "unknown":
            o.start_kind, o.s, o.start_pt_unknown = "resolved", 10 ** 6, False
        if "unresolvable_start_as_not_paying" in faults and o.start_kind == "unresolvable" and window_known:
            o.start_kind, o.s, o.start_unres = "resolved", 10 ** 6, False
        if "end_unknown_as_open" in faults and o.end_kind in ("unknown", "unresolvable"):
            o.end_kind, o.e, o.end_pt_unknown, o.end_unres, o.has_end = "absent", None, False, False, False
        o.s_resolved = o.start_kind == "resolved"
        o.e_resolved = o.end_kind == "resolved"
        o.e_ok = o.end_kind in ("resolved", "absent")
        # b_j
        o.b = None
        if o.s_resolved and o.aj is not None:
            if o.s == 0 or o.pb == "start_year_dollars":
                o.b = D(o.aj)
            elif o.pb == "today_dollars":
                if "today_as_nominal" in faults:
                    o.b = D(o.aj)
                else:
                    o.b = EXACT.multiply(D(o.aj), growth(i_bp, o.s))
            else:
                o.b = None  # price basis unknown and s > 0
        srcs.append(o)

    def pays(o, t):
        if o.amount_status == "zero":
            return "no"
        if "unknown_first" in faults and (not o.s_resolved or not o.e_ok):
            return "unknown"
        if o.e_resolved and t >= o.e and "inclusive_end" not in faults:
            return "no"
        if o.e_resolved and t > o.e and "inclusive_end" in faults:
            return "no"
        if o.s_resolved and t < o.s:
            return "no"
        if o.s_resolved and o.e_ok:
            return "yes"
        return "unknown"

    def codes(o, t):
        p = pays(o, t)
        if p == "no":
            return p, []
        c = []
        if o.start_pt_unknown:
            c.append("start_unknown")
        if o.start_unres:
            c.append("start_unresolvable")
        if o.has_end and o.end_pt_unknown:
            c.append("end_unknown")
        if o.end_unres:
            c.append("end_unresolvable")
        if o.amount_status == "unknown":
            c.append("amount_unknown")
        if o.pb == "unknown" and not (o.s_resolved and o.s == 0):
            c.append("price_basis_unknown")
        if o.tax == "gross":
            c.append("gross")
        if o.tax == "unknown":
            c.append("tax_basis_unknown")
        if "one_code_per_source" in faults and c:
            c = c[:1]
        return p, c

    def payment(o, t):
        """Exact Decimal, or None."""
        p, c = codes(o, t)
        if p == "no":
            return D(0)
        if any(x in M_CODES for x in c):
            return None
        if p == "unknown" or o.b is None:
            return None
        n = t - o.s
        if "escalate_from_zero" in faults:
            n = t
        if "float_growth" in faults:
            return D(repr(float_iter(float(o.b), o.q, n)))
        return EXACT.multiply(o.b, growth(o.q, n))

    # ---- global codes
    glob = []
    if A is None:
        glob.append("current_age_unknown")
    if R is None and not ("R_code_only_if_A_known" in faults and A is None):
        glob.append("retirement_age_unknown")
    if a is None and not ("no_global_codes_without_window" in faults and not window_known):
        glob.append("spending_unknown")
    if coverage == "not_answered" and not ("no_global_codes_without_window" in faults and not window_known):
        glob.append("income_not_answered")
    if coverage == "some_sources_may_be_missing":
        glob.append("income_list_partial")
    cov_ok = coverage in ("all_known_sources_listed", "no_planned_income")

    # ---- scan set T*
    if window_known:
        W = list(range(tR, tR + H))
        if "pre_retirement_rows" in faults:
            W = list(range(0, tR + H))
        Tstar = W
    else:
        W = []
        Tstar = list(range(0, 84))

    scan_codes = set()      # "<code>:<id>"
    scan_code_names = set()
    uncertain_may_pay = False
    for t in Tstar:
        for o in srcs:
            p, c = codes(o, t)
            for x in c:
                scan_codes.add(f"{x}:{o.id}")
                scan_code_names.add(x)
            if o.dep == "uncertain" and p in ("yes", "unknown"):
                uncertain_may_pay = True

    rnd = round_half_up_ratio if "half_up" in faults else round_half_even_ratio

    def rdec(x):
        if x is None:
            return None
        p, q = dec_to_ratio(x)
        return rnd(p, q)

    # ---- rows
    years = []
    row_codes_all = set()
    for t in W:
        Dt = spend(t)
        row_reasons = [g for g in glob if g in ("spending_unknown", "income_not_answered", "income_list_partial")]
        ibs = {}
        exact_P = {}
        groups = {"net": [], "gross": [], "unknown": []}
        for o in srcs:
            p, c = codes(o, t)
            for x in c:
                row_reasons.append(f"{x}:{o.id}")
            Pv = payment(o, t)
            exact_P[o.id] = Pv
            ibs[o.id] = rdec(Pv)
            if p != "no":
                groups[o.tax].append(Pv)

        def gsum(lst):
            if any(v is None for v in lst):
                return None
            tot = D(0)
            for v in lst:
                tot = EXACT.add(tot, v)
            return tot

        if "round_then_sum" in faults:
            def grp(lst):
                if any(v is None for v in lst):
                    return None
                return sum(rdec(v) for v in lst)
        else:
            def grp(lst):
                return rdec(gsum(lst))

        computed = (Dt is not None and cov_ok and all(v is not None for v in exact_P.values())
                    and all(o.tax == "net" for o in srcs if exact_P[o.id] is not None and exact_P[o.id] != 0))
        # equivalence check (contract §5 last paragraph)
        assert computed == (len(row_reasons) == 0) or faults, (t, row_reasons, computed)
        row_codes_all.update(r for r in row_reasons)
        row = {
            "t": t,
            "calendar_year": Y0 + t,
            "age": A + t,
        }
        if hh is not None and pA is not None:
            row["partner_age"] = pA + t
        row["spending_cents"] = rdec(Dt)
        row["income_by_source_cents"] = ibs
        row["income_net_cents"] = grp(groups["net"])
        row["income_gross_cents"] = grp(groups["gross"])
        row["income_unknown_basis_cents"] = grp(groups["unknown"])
        row["status"] = "computed" if computed else "not_computable"
        row["reasons"] = sorted(set(row_reasons))
        exact = {"spending": exact_str_dec(Dt) if Dt is not None else None}
        if computed:
            tot = gsum(list(exact_P.values()))
            G = EXACT.subtract(Dt, tot) if Dt > tot else D(0)
            S = EXACT.subtract(tot, Dt) if tot > Dt else D(0)
            if "net_surplus" in faults:
                G = EXACT.subtract(Dt, tot)
            if "gap_from_rounded" in faults:
                rt = D(sum(rdec(v) for v in exact_P.values()))
                rD = D(rdec(Dt))
                G = EXACT.subtract(rD, rt) if rD > rt else D(0)
                S = EXACT.subtract(rt, rD) if rt > rD else D(0)
            row["gap_cents"] = rdec(G) if G >= 0 else -rdec(-G)
            row["surplus_cents"] = rdec(S)
            # deflate: G * 10000^t / (10000+i)^t
            def defl(x):
                if x < 0:
                    return -defl(-x)
                p, q = dec_to_ratio(x)
                if "deflate_rounded" in faults:
                    p, q = rdec(x), 1
                tt = t - tR if "deflate_from_tR" in faults else t
                return rnd(p * TEN4 ** tt, q * (TEN4 + i_bp) ** tt)
            row["gap_today_dollars_cents"] = defl(G)
            row["surplus_today_dollars_cents"] = defl(S)
            exact["income_compared"] = exact_str_dec(tot)
            exact["gap"] = exact_str_dec(G) if G >= 0 else "-" + exact_str_dec(-G)
            exact["surplus"] = exact_str_dec(S)
            row["_G"] = G
        else:
            row["gap_cents"] = None
            row["surplus_cents"] = None
            row["gap_today_dollars_cents"] = None
            row["surplus_today_dollars_cents"] = None
            row["_G"] = None
        row["exact"] = exact
        years.append(row)

    # ---- completeness
    reasons = set(glob) | row_codes_all | scan_codes
    any_code = lambda names: any(r.split(":")[0] in names for r in (row_codes_all | scan_codes))  # noqa: E731
    row_code_names = {r.split(":")[0] for r in row_codes_all}
    if not window_known:
        state = "incomplete_unknown_timing"
    elif a is None:
        state = "incomplete_unknown_spending"
    elif (not cov_ok) or any(n in row_code_names for n in M_CODES):
        state = "incomplete_unknown_income"
    elif "gross" in row_code_names:
        state = "basis_mismatch"
    elif "tax_basis_unknown" in row_code_names:
        state = "basis_unknown"
    else:
        assert all(y["status"] == "computed" for y in years) or faults
        state = "complete"

    # ---- predicates
    C = (not window_known) or (a is None)
    Mp = (not cov_ok) or any(n in scan_code_names for n in M_CODES)
    X = any(n in scan_code_names for n in X_CODES)
    Hp = (hh is not None and None not in (A, R, pA, pR) and (pR - pA) != (R - A))
    F = window_known and any(y["status"] == "computed" and y["_G"] > 0 for y in years)

    # ---- flags
    flags = set()
    if "gross" in scan_code_names:
        flags.add("gross_net_mismatch")
    if "tax_basis_unknown" in scan_code_names:
        flags.add("tax_basis_unknown")
    if Mp:
        flags.add("incomplete_income")
    acc = savings.get("accounts", {}) or {}
    acc_order = ["rrsp_rrif", "tfsa", "non_registered", "other", "not_sure"]
    acc_pos = [k for k in acc_order if k in acc and (qval(acc[k]) or 0) > 0]
    home = savings.get("home_value")
    bus = savings.get("business_value")
    hb_pos = any(x is not None and (qval(x["amount"]) or 0) > 0 for x in (home, bus))
    if hb_pos and not acc_pos and "home_spendable" not in faults:
        flags.add("housing_only_wealth")
    pv = savings.get("pension_value")
    if pv is not None and (qval(pv["amount"]) or 0) > 0 and pv["also_entered_as_income"] in ("yes", "not_sure"):
        flags.add("pension_double_count_risk")
    if any(o.kind in ("rental", "business") and o.dep == "scheduled" for o in srcs):
        flags.add("uncertain_kind_labelled_scheduled")
    if window_known:
        late = any(o.amount_status != "zero" and o.s_resolved and o.s >= tR + H for o in srcs
                   if not ("horizon_known_positive_only" in faults and o.amount_status == "unknown"))
        p_late = (pA is not None and pR is not None and (pR - pA) >= tR + H)
        if late or p_late:
            flags.add("horizon_shorter_than_timeline")
    if Hp:
        flags.add("household_timing_differs")
    if uncertain_may_pay:
        flags.add("includes_uncertain_income")

    # ---- clip
    prec = [("C", C, "W10", "core_inputs_missing"), ("M", Mp, "W06", "missing_income"),
            ("X", X, "W08", "tax_basis"), ("H", Hp, "W09", "household_timing"),
            ("F", F, "W07", "funding_gap")]
    if "F_before_M" in faults:
        prec = [prec[0], prec[4], prec[1], prec[2], prec[3]]
    if "H_after_F" in faults:
        prec = [prec[0], prec[1], prec[2], prec[4], prec[3]]
    sel, why = "W10", "neutral_fallback"
    for _, v, clip, rs in prec:
        if v:
            sel, why = clip, rs
            break

    # ---- savings summary
    excl = [k for k, v in (("home_value", home), ("business_value", bus)) if v is not None]
    ssum = {
        "accessible_categories_with_positive_value": acc_pos,
        "home_or_business_positive_value": hb_pos,
        "excluded_from_spendable": excl,
        "pension_value_kept_separate": pv is not None,
        "totals_computed": False,
    }

    # ---- capital illustration (reference only; flag OFF)
    ncr = []
    if r_bp is None:
        ncr.append("return_assumption_absent")
    if state != "complete":
        ncr.append("state_not_complete")
    ref = {"r_bp": r_bp, "computable": not ncr, "not_computable_reasons": sorted(ncr)}
    if ncr:
        ref.update({"display_eligible_if_enabled": False, "ineligible_reasons": sorted(ncr),
                    "C_R_cents": None, "C_R_exact": None, "valued_at": None})
    else:
        # common-denominator direct sum: C = sum_k G_k / (1+r)^(k+1)
        #   = [ sum_k G_k * 10000^(k+1) * (10000+r)^(H-1-k) ] / (10000+r)^H
        # with every G_k = p_k/q_k brought to the common q = 10^(4*t_max)
        ratios = [dec_to_ratio(y["_G"]) if "cr_from_rounded_gaps" not in faults else (rdec(y["_G"]), 1) for y in years]
        Q = 1
        for _, q in ratios:
            Q = Q * q // math.gcd(Q, q)
        num = 0
        disc_t0 = "cr_discount_to_base" in faults
        for k, (p, q) in enumerate(ratios):
            e = k + 1 + (tR if disc_t0 else 0)
            num += (p * (Q // q)) * TEN4 ** e * (TEN4 + r_bp) ** (H + (tR if disc_t0 else 0) - e)
        den = Q * (TEN4 + r_bp) ** (H + (tR if disc_t0 else 0))
        if "cr_start_of_year" in faults:
            num *= (TEN4 + r_bp)
            den *= TEN4
        g = math.gcd(abs(num), den)
        num, den = num // g, den // g
        inel = sorted(set(f for f in BLOCKING_FLAGS if f in flags) |
                      ({"no_positive_gap"} if not any(y["_G"] > 0 for y in years) and "ignore_no_positive_gap" not in faults else set()))
        ref.update({
            "display_eligible_if_enabled": not inel,
            "ineligible_reasons": inel,
            "C_R_cents": rnd(num, den) if num >= 0 else -rnd(-num, den),
            "C_R_exact": exact_str_ratio(num, den) if num >= 0 else "-" + exact_str_ratio(-num, den),
            "valued_at": {"t": tR, "calendar_year": Y0 + tR, "point": "start_of_year"},
        })
    ref["flow_timing"] = "end_of_year"

    for y in years:
        del y["_G"]

    window = None
    if window_known:
        window = {"t_R": tR, "first_t": tR, "last_t": tR + H - 1,
                  "first_calendar_year": Y0 + tR, "last_calendar_year": Y0 + tR + H - 1,
                  "first_age": R, "last_age": R + H - 1}
        if "pre_retirement_rows" in faults:
            window["first_t"] = 0

    return {
        "contract_version": "1.0",
        "assumptions_echo": {
            "base_year": Y0, "inflation_bp": i_bp, "planning_horizon_years": H,
            "capital_illustration_return_bp": r_bp,
            "year_index": "t=0 is calendar year base_year; annual totals per calendar year",
            "rounding": "exact rational arithmetic; half-even to whole cents at display only",
        },
        "window": window,
        "completeness": {"state": state, "reasons": sorted(reasons)},
        "years": years,
        "flags": sorted(flags),
        "savings_summary": ssum,
        "capital_illustration": {"feature_flag": "off", "displayed": False,
                                 "state": "disabled_by_flag", "reference_if_enabled": ref},
        "clip": {"predicates": {"C": C, "M": Mp, "X": X, "H": Hp, "F": F},
                 "selected": sel, "selection_reason": why},
    }


# ---------------------------------------------------------------- semantic layer (XF-04..06)
def semantic_errors(inp: dict) -> list[tuple[str, str]]:
    ch = inp["chapters"]
    tm = ch["timing"]
    A = qval(tm["current_age"])
    hh = tm.get("household")
    pA = qval(hh["partner_current_age"]) if hh else None
    errs = []
    seen = {}
    for j, s in enumerate(ch["income"]["sources"]):
        oa = pA if s["owner"] == "partner" else A
        st = s["start"]
        if st["reference"] == "age" and st["point"]["status"] != "unknown" and oa is not None:
            if st["point"]["value"] < oa:
                errs.append(("XF-04", f"/chapters/income/sources/{j}/start/point/value"))
        sk, sidx = resolve_bound(st, oa, True)
        ek, eidx = resolve_bound(s.get("end"), oa, False)
        if sk == "resolved" and ek == "resolved" and not (eidx > sidx):
            errs.append(("XF-05", f"/chapters/income/sources/{j}/end"))
        if s["id"] in seen:
            errs.append(("XF-06", f"/chapters/income/sources/{j}/id"))
        seen[s["id"]] = j
    return errs
