"""A6 F02a attempt 1 -- independent workshop model, written from workshop-math.md 1.0 only.

Method (deliberately different from the builder's Fraction reference and from the
attempt-3 A6 BigInt-rational JS model):
  * every nominal flow of year t is held as ONE Python int N meaning N / 10000**t
    (a scaled fixed-point numerator; no fractions module, no rational class);
  * D_t numerator = a * (10000+i)**t ; P_j,t numerator = a_j * G_pre * (10000+q)**(t-s)
    where G_pre = 10000**s (start-year or s=0) or (10000+i)**s (today dollars);
  * today-dollar values are N // (10000+i)**t with an explicit half-even integer rule;
  * C_R is one integer fraction  10000 * sum_k Gnum_{tR+k} (10000+r)^(H-1-k)
                                  / (10000**tR * (10000+r)**H), reduced with math.gcd.
Faults are switches in FAULTS (a set of names); the empty set is the contract reading.
"""
import math

BP = 10000
INF = None  # marker for an absent end
YEAR_INDEX_ECHO = "t=0 is calendar year base_year; annual totals per calendar year"
ROUNDING_ECHO = "exact rational arithmetic; half-even to whole cents at display only"
INCOME_UNKNOWN_CODES = ("amount_unknown", "start_unknown", "start_unresolvable",
                        "end_unknown", "end_unresolvable", "price_basis_unknown")
BLOCKING_FLAGS = ("gross_net_mismatch", "tax_basis_unknown", "incomplete_income",
                  "pension_double_count_risk")
ACCOUNT_ORDER = ("rrsp_rrif", "tfsa", "non_registered", "other", "not_sure")


def rhe(num, den):
    """Round num/den (num >= 0, den > 0) half to even, integers only."""
    q, r = divmod(num, den)
    twice = 2 * r
    if twice > den or (twice == den and q % 2 == 1):
        q += 1
    return q


def dec_str_scaled(num, t):
    """num / 10**(4t) as the shortest plain decimal string."""
    places = 4 * t
    if places == 0:
        return str(num)
    s = str(num).rjust(places + 1, "0")
    ip, fp = s[:-places], s[-places:].rstrip("0")
    return ip if not fp else ip + "." + fp


def frac_str(p, q):
    """p/q in lowest terms: shortest decimal if finite, else 'p/q'."""
    g = math.gcd(p, q)
    p, q = p // g, q // g
    k2 = k5 = 0
    qq = q
    while qq % 2 == 0:
        qq //= 2; k2 += 1
    while qq % 5 == 0:
        qq //= 5; k5 += 1
    if qq != 1:
        return f"{p}/{q}"
    k = max(k2, k5)
    scaled = p * (10 ** k) // q
    if k == 0:
        return str(scaled)
    s = str(scaled).rjust(k + 1, "0")
    ip, fp = s[:-k], s[-k:].rstrip("0")
    return ip if not fp else ip + "." + fp


def qval(q):
    """quantity -> int or None (unknown)."""
    if q is None or q.get("status") == "unknown":
        return None
    return q["value"]


def positive_known(q):
    v = qval(q)
    return v is not None and v > 0


class Src:
    pass


def build_sources(inp, A, pA, faults):
    out = []
    for s in inp["chapters"]["income"]["sources"]:
        o = Src()
        o.id = s["id"]
        o.kind = s["kind"]
        o.owner = s["owner"]
        o.zero = s["amount"]["status"] == "zero"
        av = qval(s["amount"])
        o.amount_unknown = av is None
        o.a = None if av is None else (av * 12 if s["period"] == "monthly" else av)
        o.tax = s["tax_basis"]
        o.pb = s["price_basis"]
        o.q = s["escalation_bp"]["value"]
        o.dep = s["dependability"]
        # owner age
        if o.owner == "self":
            Ao = A
        elif o.owner == "partner":
            Ao = pA
        else:  # joint
            if "joint_uses_partner" in faults:
                Ao = pA
            elif "joint_uses_older" in faults:
                Ao = None if (A is None or pA is None) else max(A, pA)
            else:
                Ao = A
        o.start_state, o.s = resolve(s["start"], Ao)
        if "end" in s:
            o.end_present = True
            o.end_state, o.e = resolve(s["end"], Ao)
        else:
            o.end_present = False
            o.end_state, o.e = "ok", INF
        out.append(o)
    return out


def resolve(b, Ao):
    ref = b["reference"]
    if ref == "already_receiving":
        return "ok", 0
    pv = qval(b["point"])
    if pv is None:
        return "unknown", None
    if ref == "year_index":
        return "ok", pv
    if Ao is None:
        return "unresolvable", None
    return "ok", pv - Ao


def pays(o, t):
    if o.zero:
        return "no"
    if o.end_present and o.end_state == "ok" and t >= o.e:
        return "no"
    if o.start_state == "ok" and t < o.s:
        return "no"
    if o.start_state == "ok" and o.end_state == "ok":
        return "yes"
    return "unknown"


def codes(o, t):
    if pays(o, t) == "no":
        return []
    c = []
    if o.start_state == "unknown": c.append("start_unknown")
    if o.start_state == "unresolvable": c.append("start_unresolvable")
    if o.end_present and o.end_state == "unknown": c.append("end_unknown")
    if o.end_present and o.end_state == "unresolvable": c.append("end_unresolvable")
    if o.amount_unknown: c.append("amount_unknown")
    if o.pb == "unknown" and not (o.start_state == "ok" and o.s == 0): c.append("price_basis_unknown")
    if o.tax == "gross": c.append("gross")
    if o.tax == "unknown": c.append("tax_basis_unknown")
    return c


def pnum(o, t, i, tR, faults):
    """P_j,t as numerator over BP**t, or None."""
    p = pays(o, t)
    if p == "no":
        return 0
    if p == "unknown" or o.a is None:
        return None
    s = o.s
    if s == 0 or o.pb == "start_year_dollars":
        pre = BP ** s
    elif o.pb == "today_dollars":
        if "today_dollars_uses_q" in faults:
            pre = (BP + o.q) ** s
        elif "today_carry_to_tR" in faults:
            k = min(s, tR)
            pre = (BP + i) ** k * BP ** (s - k)
        elif "today_one_year_less" in faults:
            pre = (BP + i) ** (s - 1) * BP
        elif "today_as_nominal" in faults:
            pre = BP ** s
        else:
            pre = (BP + i) ** s
    else:
        return None  # price basis unknown, s > 0
    if "today_indexed_at_i_after_start" in faults and o.pb == "today_dollars":
        growth = (BP + i) ** (t - s)
    else:
        growth = (BP + o.q) ** (t - s)
    return o.a * pre * growth


def compute(inp, faults=frozenset()):
    ch = inp["chapters"]
    Y0 = inp["base_year"]
    tm = ch["timing"]
    A = qval(tm["current_age"])
    R = qval(tm["retirement_age"])
    H = tm["planning_horizon_years"]["value"]
    i = tm["inflation_bp"]["value"]
    r = tm["capital_illustration_return_bp"]["value"] if "capital_illustration_return_bp" in tm else None
    hh = tm.get("household")
    pA = qval(hh["partner_current_age"]) if hh else None
    pR = qval(hh["partner_retirement_age"]) if hh else None
    sp = ch["life"]["spending"]
    sv = qval(sp["amount"])
    a = None if sv is None else (sv * 12 if sp["period"] == "monthly" else sv)
    cov = ch["income"]["coverage"]
    cov_complete = cov in ("all_known_sources_listed", "no_planned_income")
    srcs = build_sources(inp, A, pA, faults)

    window_known = A is not None and R is not None
    tR = R - A if window_known else None
    W = list(range(tR, tR + H)) if window_known else []
    Tstar = W if window_known else list(range(0, 84))

    global_codes = []
    if A is None: global_codes.append("current_age_unknown")
    if R is None: global_codes.append("retirement_age_unknown")
    if a is None: global_codes.append("spending_unknown")
    if cov == "not_answered": global_codes.append("income_not_answered")
    if cov == "some_sources_may_be_missing": global_codes.append("income_list_partial")

    # T* scan
    scan_src_codes = set()
    for o in srcs:
        for t in Tstar:
            for c in codes(o, t):
                scan_src_codes.add((c, o.id))

    years = []
    Gnums = {}
    any_gap = False
    row_code_set = set()
    for t in W:
        den = BP ** t
        Dn = None if a is None else a * (BP + i) ** t
        P = {o.id: pnum(o, t, i, tR, faults) for o in srcs}
        row = {"t": t, "calendar_year": Y0 + t, "age": A + t}
        if hh is not None and pA is not None:
            row["partner_age"] = pA + t
        row["spending_cents"] = None if Dn is None else rhe(Dn, den)
        row["income_by_source_cents"] = {k: (None if v is None else rhe(v, den)) for k, v in P.items()}
        # groups
        if not cov_complete:
            gn = gg = gu = None
        else:
            sums = {}
            for basis in ("net", "gross", "unknown"):
                tot = 0
                for o in srcs:
                    if o.tax != basis:
                        continue
                    v = P[o.id]
                    if v is None:
                        tot = None; break
                    tot += v
                if tot is None:
                    sums[basis] = None
                elif "group_from_rounded_rows" in faults:
                    sums[basis] = sum(rhe(P[o.id], den) for o in srcs if o.tax == basis)
                else:
                    sums[basis] = rhe(tot, den)
            gn, gg, gu = sums["net"], sums["gross"], sums["unknown"]
        row["income_net_cents"] = gn
        row["income_gross_cents"] = gg
        row["income_unknown_basis_cents"] = gu
        rc = []
        if a is None: rc.append("spending_unknown")
        if cov == "not_answered": rc.append("income_not_answered")
        if cov == "some_sources_may_be_missing": rc.append("income_list_partial")
        for o in srcs:
            for c in codes(o, t):
                rc.append(f"{c}:{o.id}")
                row_code_set.add(c)
        rc = sorted(set(rc))
        computed = not rc
        row["status"] = "computed" if computed else "not_computable"
        row["reasons"] = rc
        if computed:
            tot = sum(P.values())
            G = max(0, Dn - tot)
            S = max(0, tot - Dn)
            Gnums[t] = G
            if G > 0: any_gap = True
            defl = (BP + i) ** t
            if "deflate_rounded_gap" in faults:
                gt = rhe(rhe(G, den) * den, defl)
                st = rhe(rhe(S, den) * den, defl)
            else:
                gt, st = rhe(G, defl), rhe(S, defl)
            row["gap_cents"] = rhe(G, den)
            row["surplus_cents"] = rhe(S, den)
            row["gap_today_dollars_cents"] = gt
            row["surplus_today_dollars_cents"] = st
            row["exact"] = {"spending": dec_str_scaled(Dn, t), "income_compared": dec_str_scaled(tot, t),
                            "gap": dec_str_scaled(G, t), "surplus": dec_str_scaled(S, t)}
        else:
            row["gap_cents"] = row["surplus_cents"] = None
            row["gap_today_dollars_cents"] = row["surplus_today_dollars_cents"] = None
            row["exact"] = {"spending": None if Dn is None else dec_str_scaled(Dn, t)}
        years.append(row)

    reasons = set(global_codes)
    for y in years:
        reasons.update(y["reasons"])
    for c, sid in scan_src_codes:
        reasons.add(f"{c}:{sid}")
    reasons = sorted(reasons)

    if not window_known:
        state = "incomplete_unknown_timing"
    elif a is None:
        state = "incomplete_unknown_spending"
    elif (not cov_complete) or any(c in row_code_set for c in INCOME_UNKNOWN_CODES):
        state = "incomplete_unknown_income"
    elif "gross" in row_code_set:
        state = "basis_mismatch"
    elif "tax_basis_unknown" in row_code_set:
        state = "basis_unknown"
    else:
        state = "complete"

    scan_codes = {c for c, _ in scan_src_codes}
    Cp = (not window_known) or a is None
    Mp = (not cov_complete) or any(c in scan_codes for c in INCOME_UNKNOWN_CODES)
    Xp = ("gross" in scan_codes) or ("tax_basis_unknown" in scan_codes)
    Hp = (hh is not None and None not in (A, R, pA, pR) and (pR - pA) != (R - A))
    Fp = window_known and any_gap

    sav = ch["savings"]
    accts = sav.get("accounts", {})
    acc_pos = [k for k in ACCOUNT_ORDER if k in accts and positive_known(accts[k])]
    home_pos = ("home_value" in sav and positive_known(sav["home_value"]["amount"])) or \
               ("business_value" in sav and positive_known(sav["business_value"]["amount"]))
    flags = set()
    if "gross" in scan_codes: flags.add("gross_net_mismatch")
    if "tax_basis_unknown" in scan_codes: flags.add("tax_basis_unknown")
    if Mp: flags.add("incomplete_income")
    if home_pos and not acc_pos: flags.add("housing_only_wealth")
    pv = sav.get("pension_value")
    if pv and positive_known(pv["amount"]) and pv["also_entered_as_income"] in ("yes", "not_sure"):
        flags.add("pension_double_count_risk")
    for o in srcs:
        if o.kind in ("rental", "business") and o.dep == "scheduled":
            flags.add("uncertain_kind_labelled_scheduled")
    if window_known:
        lim = tR + H
        hz = any((not o.zero) and o.start_state == "ok" and o.s >= lim for o in srcs)
        if hh is not None and pA is not None and pR is not None and (pR - pA) >= lim:
            hz = True
        if hz: flags.add("horizon_shorter_than_timeline")
    if Hp: flags.add("household_timing_differs")
    for o in srcs:
        if o.dep == "uncertain" and any(pays(o, t) in ("yes", "unknown") for t in Tstar):
            flags.add("includes_uncertain_income")
    flags = sorted(flags)

    if Cp: sel, why = "W10", "core_inputs_missing"
    elif Mp: sel, why = "W06", "missing_income"
    elif Xp: sel, why = "W08", "tax_basis"
    elif Hp: sel, why = "W09", "household_timing"
    elif Fp: sel, why = "W07", "funding_gap"
    else: sel, why = "W10", "neutral_fallback"

    ncr = []
    if r is None: ncr.append("return_assumption_absent")
    if state != "complete": ncr.append("state_not_complete")
    ref = {"r_bp": r, "computable": not ncr, "not_computable_reasons": sorted(ncr)}
    if ncr:
        ref.update({"display_eligible_if_enabled": False, "ineligible_reasons": sorted(ncr),
                    "C_R_cents": None, "C_R_exact": None, "valued_at": None})
    else:
        inel = [f for f in BLOCKING_FLAGS if f in flags]
        if not any_gap: inel.append("no_positive_gap")
        num = BP * sum(Gnums[tR + k] * (BP + r) ** (H - 1 - k) for k in range(H))
        den = BP ** tR * (BP + r) ** H
        g = math.gcd(num, den) or 1
        ref.update({"display_eligible_if_enabled": not inel, "ineligible_reasons": sorted(inel),
                    "C_R_cents": rhe(num, den), "C_R_exact": frac_str(num, den) if num else "0",
                    "valued_at": {"t": tR, "calendar_year": Y0 + tR, "point": "start_of_year"}})
    ref["flow_timing"] = "end_of_year"

    window = None
    if window_known:
        window = {"t_R": tR, "first_t": tR, "last_t": tR + H - 1, "first_calendar_year": Y0 + tR,
                  "last_calendar_year": Y0 + tR + H - 1, "first_age": R, "last_age": R + H - 1}
    return {
        "contract_version": "1.0",
        "assumptions_echo": {"base_year": Y0, "inflation_bp": i, "planning_horizon_years": H,
                             "capital_illustration_return_bp": r, "year_index": YEAR_INDEX_ECHO,
                             "rounding": ROUNDING_ECHO},
        "window": window,
        "completeness": {"state": state, "reasons": reasons},
        "years": years,
        "flags": flags,
        "savings_summary": {
            "accessible_categories_with_positive_value": acc_pos,
            "home_or_business_positive_value": bool(home_pos),
            "excluded_from_spendable": [k for k in ("home_value", "business_value") if k in sav],
            "pension_value_kept_separate": "pension_value" in sav,
            "totals_computed": False},
        "capital_illustration": {"feature_flag": "off", "displayed": False, "state": "disabled_by_flag",
                                 "reference_if_enabled": ref},
        "clip": {"predicates": {"C": Cp, "M": Mp, "X": Xp, "H": Hp, "F": bool(Fp)},
                 "selected": sel, "selection_reason": why},
    }


def media_render(case):
    """Independent render-state function from workshop-clip-rules.md s7."""
    sel, loc, build, av = case["selected"], case["locale"], case["build"], case["availability"]
    other = "en" if loc == "fr" else "fr"
    here = av[sel][loc]
    if here == "available":
        rs = "play"
    elif here == "test_media" and build == "local_test":
        rs = "play_test_media_labelled"
    elif av[sel][other] == "available":
        rs = "other_locale_only"
    else:
        rs = "unavailable"
    test_ref = any(v == "test_media" for c in av.values() for v in c.values())
    rc = "fail_test_media_referenced" if (build == "production" and test_ref) else "pass"
    return {"selected": sel, "render_state": rs, "disclosure_shown": True,
            "substitute_clip": None, "release_check": rc}
