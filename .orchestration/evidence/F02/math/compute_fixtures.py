"""Generates the workshop math and clip-rule fixtures with exact arithmetic.

Run:  python compute_fixtures.py          -> writes fixtures, prints the check log
      python compute_fixtures.py --check  -> regenerates in memory, exits 1 if
                                             any fixture on disk differs

Two independent paths guard every expected value:
  1. workshop_reference.compute() - the exact-rational reference model;
  2. assertions below written from hand arithmetic or closed forms (geometric
     series, ordinary annuity, growing annuity) that do not call the model's
     internals. A fixture is written only if both agree.

Tolerance policy (normative, workshop-math.md section 10): exact integer cents
after half-even rounding; exact strings must match character for character.
"""
from __future__ import annotations

import copy
import json
import sys
from fractions import Fraction as Fr
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import workshop_reference as ref  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
FIX = ROOT / "contracts" / "fixtures" / "workshop"
TOL = "exact integer cents after half-even rounding; exact strings must match exactly; no numeric tolerance"
LOG = []


def log(msg):
    LOG.append(msg)
    print(msg)


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    log(f"  ok  {msg}")


# ---------------------------------------------------------------- builders
def Q(status, value=None):
    return {"status": status} if value is None else {"status": status, "value": value}


def EST(v):
    return Q("estimated", v)


def CONF(v):
    return Q("confirmed", v)


UNK = Q("unknown")
ZERO = Q("zero", 0)


def RATE(bp):
    return ZERO if bp == 0 else EST(bp)


RECV = {"reference": "already_receiving"}


def AGE(n, status="estimated"):
    return {"reference": "age", "point": Q(status, n) if status != "unknown" else UNK}


def IDX(n):
    return {"reference": "year_index", "point": EST(n)}


AGE_UNK = {"reference": "age", "point": UNK}   # start/end age with status unknown
IDX_UNK = {"reference": "year_index", "point": UNK}  # start/end year index with status unknown


def src(sid, kind, amount, period, tax, price, start, q_bp=0, dep="scheduled",
        owner="self", end=None):
    s = {
        "id": sid, "kind": kind, "owner": owner, "amount": amount, "period": period,
        "tax_basis": tax, "price_basis": price, "start": start,
        "escalation_bp": RATE(q_bp), "dependability": dep,
    }
    if end is not None:
        s["end"] = end
    return s


def doc(spending, period="monthly", coverage="all_known_sources_listed", sources=(),
        savings=None, A=EST(60), R=EST(60), H=10, i=0, r=None, household=None,
        lifestyle=None):
    life = {"spending": {"amount": spending, "period": period, "tax_basis": "after_tax",
                         "price_basis": "today_dollars", "unit": "household"}}
    if lifestyle:
        life["lifestyle_focus"] = lifestyle
    timing = {"current_age": A, "retirement_age": R,
              "planning_horizon_years": EST(H), "inflation_bp": RATE(i)}
    if household is not None:
        timing["household"] = household
    if r is not None:
        timing["capital_illustration_return_bp"] = RATE(r)
    return {
        "contract": "workshop-inputs", "contract_version": "1.0", "currency": "CAD",
        "base_year": 2026,
        "chapters": {"life": life,
                     "income": {"coverage": coverage, "sources": list(sources)},
                     "savings": savings if savings is not None else {},
                     "timing": timing},
    }


def g(bp, n):  # independent growth factor, written from the definition
    return (Fr(10000 + bp) / 10000) ** n


def rhe(x: Fr) -> int:  # independent half-even rounding (different code path)
    n, d = x.numerator, x.denominator
    q, rem = divmod(n, d)
    twice = 2 * rem
    if twice > d or (twice == d and q % 2 == 1):
        q += 1
    return q


def col(out, key):
    return [row[key] for row in out["years"]]


# ---------------------------------------------------------------- fixtures
FIXTURES = []


def fixture(fid, slug, title, covers, purpose):
    def deco(fn):
        FIXTURES.append((fid, slug, title, covers, purpose, fn))
        return fn
    return deco


@fixture("WM01", "zero-inflation-zero-escalation", "Zero inflation and zero escalation",
         ["WK02"], "i = 0 and q = 0 make every year identical; the gap is D - P exactly.")
def wm01():
    d = doc(EST(400000), A=EST(65), R=EST(65), H=5, i=0, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "net", "start_year_dollars", RECV)])
    out = ref.compute(d)
    check(col(out, "spending_cents") == [4800000] * 5, "WM01 D_t = 12 x 400,000 = 4,800,000 every year")
    check(col(out, "gap_cents") == [1800000] * 5, "WM01 G_t = 4,800,000 - 3,000,000 = 1,800,000 every year")
    check(col(out, "surplus_cents") == [0] * 5, "WM01 S_t = 0")
    check(out["completeness"]["state"] == "complete", "WM01 state complete")
    return d, out, ["hand: D=4,800,000; P=3,000,000; G=1,800,000 for t=0..4"]


@fixture("WM02", "geometric-growth-closed-form", "Geometric spending growth (closed form)",
         ["WK02"], "D_t = a(1+i)^t checked against the closed form and the geometric-series sum; deflated gap is constant.")
def wm02():
    d = doc(EST(5000000), period="annual", coverage="no_planned_income", A=EST(55), R=EST(60), H=10, i=200)
    out = ref.compute(d)
    a = Fr(5000000)
    exp_D = [rhe(a * Fr(102, 100) ** t) for t in range(5, 15)]
    check(col(out, "spending_cents") == exp_D, "WM02 D_t = 5,000,000 x 1.02^t for t=5..14 (closed form)")
    check(out["years"][0]["spending_cents"] == 5520404, "WM02 hand: D_5 = 5,000,000 x 1.1040808032 = 5,520,404.016 -> 5,520,404")
    series = sum((a * Fr(102, 100) ** t for t in range(5, 15)), Fr(0))
    closed = a * Fr(102, 100) ** 5 * (Fr(102, 100) ** 10 - 1) / Fr(2, 100)
    check(series == closed, "WM02 sum_{t=5}^{14} D_t equals a(1.02)^5((1.02)^10-1)/0.02 exactly")
    check(col(out, "gap_today_dollars_cents") == [5000000] * 10, "WM02 deflated gap G_t/(1+i)^t = 5,000,000 (real value constant)")
    return d, out, ["closed form D_t = a(1+i)^t", "geometric series identity", "deflated gap constant = a"]


@fixture("WM03", "later-income-start", "Income that starts after retirement",
         ["WK02"], "P_j,t = 0 for t < s_j; boundary exactly at t = s_j.")
def wm03():
    d = doc(EST(300000), A=EST(60), R=EST(60), H=10, i=0, sources=[
        src("src-1", "qpp_cpp", EST(90000), "monthly", "net", "start_year_dollars", AGE(65))])
    out = ref.compute(d)
    check([r["income_by_source_cents"]["src-1"] for r in out["years"]] == [0] * 5 + [1080000] * 5,
          "WM03 P = 0 for t=0..4, 12 x 90,000 = 1,080,000 from t=5 (age 65)")
    check(col(out, "gap_cents") == [3600000] * 5 + [2520000] * 5, "WM03 G = 3,600,000 then 2,520,000")
    return d, out, ["hand: s_j = 65 - 60 = 5"]


@fixture("WM04", "price-basis-today-vs-start-year", "Today's dollars vs start-year dollars",
         ["WK02"], "A today-dollar amount is carried to its start year at i; a start-year amount is not. Guards real/nominal confusion.")
def wm04():
    d = doc(EST(4000000), period="annual", A=EST(60), R=EST(60), H=8, i=250, sources=[
        src("src-1", "qpp_cpp", EST(1200000), "annual", "net", "today_dollars", AGE(65), q_bp=250),
        src("src-2", "workplace_pension", EST(1200000), "annual", "net", "start_year_dollars", AGE(65), q_bp=0)])
    out = ref.compute(d)
    p1 = [r["income_by_source_cents"]["src-1"] for r in out["years"]]
    p2 = [r["income_by_source_cents"]["src-2"] for r in out["years"]]
    check(p1 == [0] * 5 + [rhe(Fr(1200000) * g(250, t)) for t in range(5, 8)],
          "WM04 today-dollar source: b = 1,200,000(1.025)^5, then x(1.025)^(t-5) = 1,200,000(1.025)^t")
    check(p1[5] == rhe(Fr(1200000) * Fr(1025, 1000) ** 5), "WM04 hand: P_1,5 = 1,200,000 x 1.025^5")
    check(p2 == [0] * 5 + [1200000] * 3, "WM04 start-year-dollar source: 1,200,000 flat (q=0)")
    return d, out, ["P_today(t) = a(1+i)^t when q = i", "P_start(t) = a when q = 0"]


@fixture("WM05", "month-to-year-conversion", "Monthly to annual conversion",
         ["WK01"], "Monthly amounts are multiplied by 12 exactly; a monthly and an equivalent annual input give identical results.")
def wm05():
    d = doc(EST(412345), A=EST(66), R=EST(66), H=3, i=0, sources=[
        src("src-1", "oas", EST(123456), "monthly", "net", "today_dollars", RECV),
        src("src-2", "annuity", EST(1481472), "annual", "net", "start_year_dollars", RECV)])
    out = ref.compute(d)
    check(col(out, "spending_cents") == [4948140] * 3, "WM05 12 x 412,345 = 4,948,140")
    check([r["income_by_source_cents"]["src-1"] for r in out["years"]] == [1481472] * 3, "WM05 12 x 123,456 = 1,481,472")
    check(col(out, "gap_cents") == [4948140 - 2 * 1481472] * 3, "WM05 G = 4,948,140 - 2,962,944 = 1,985,196")
    twin = copy.deepcopy(d)
    twin["chapters"]["life"]["spending"] = dict(twin["chapters"]["life"]["spending"],
                                                amount=EST(4948140), period="annual")
    check(ref.compute(twin)["years"] == out["years"], "WM05 annual 4,948,140 gives the same rows as monthly 412,345")
    return d, out, ["hand multiplication", "monthly/annual twin equality"]


@fixture("WM06", "zero-income-declared", "Declared zero planned income",
         ["WK01"], "'No planned income' is a known zero: the gap equals spending and the result is complete.")
def wm06():
    d = doc(EST(250000), coverage="no_planned_income", A=EST(70), R=EST(70), H=3, i=0)
    out = ref.compute(d)
    check(col(out, "gap_cents") == [3000000] * 3, "WM06 G = D = 3,000,000")
    check(out["completeness"]["state"] == "complete", "WM06 complete")
    check(all((r["income_net_cents"], r["income_gross_cents"], r["income_unknown_basis_cents"]) == (0, 0, 0)
              and r["income_by_source_cents"] == {} for r in out["years"]),
          "WM06 income groups are a known 0 in every row (coverage no_planned_income: the groups have no member)")
    return d, out, ["hand: 12 x 250,000", "income groups 0/0/0: declared no planned income is a known zero (s5)"]


@fixture("WM07", "unknown-income-not-answered", "Income not answered (unknown, not zero)",
         ["WK01", "WK03"], "Same spending as WM06 but income not answered: no gap is computed and the income groups are null, never the 0 of WM06; nothing is treated as zero.")
def wm07():
    d = doc(EST(250000), coverage="not_answered", A=EST(70), R=EST(70), H=3, i=0)
    out = ref.compute(d)
    check(col(out, "gap_cents") == [None] * 3, "WM07 G is null in every year (never 0)")
    check(out["completeness"]["state"] == "incomplete_unknown_income", "WM07 state incomplete_unknown_income")
    check("incomplete_income" in out["flags"], "WM07 flag incomplete_income")
    check(out["clip"]["selected"] == "W06", "WM07 clip W06")
    check(all((r["income_net_cents"], r["income_gross_cents"], r["income_unknown_basis_cents"]) == (None, None, None)
              for r in out["years"]),
          "WM07 income groups are null in every row (income not answered is unknown, never the 0 of WM06)")
    check(reasons(out) == [["income_not_answered"]] * 3 and col(out, "spending_cents") == [3000000] * 3,
          "WM07 every row carries income_not_answered; spending 3,000,000 still shown")
    return d, out, ["contrast with WM06: identical input except coverage; WM06 shows income groups 0/0/0, "
                    "WM07 shows null/null/null (s5), gap null, reason income_not_answered"]


@fixture("WM08", "unknown-amount-later-start", "Unknown amount on a later source",
         ["WK01", "WK06"], "Years before the unknown source starts are exactly computable; later years are not. Missing income outranks the visible gap.")
def wm08():
    d = doc(EST(300000), A=EST(62), R=EST(62), H=6, i=0, sources=[
        src("src-1", "workplace_pension", EST(2400000), "annual", "net", "start_year_dollars", RECV),
        src("src-2", "qpp_cpp", UNK, "monthly", "net", "start_year_dollars", AGE(65))])
    out = ref.compute(d)
    check(col(out, "gap_cents") == [1200000] * 3 + [None] * 3, "WM08 G = 1,200,000 for t=0..2, null for t=3..5")
    check(out["clip"]["predicates"]["F"] and out["clip"]["predicates"]["M"], "WM08 F and M both true")
    check(out["clip"]["selected"] == "W06", "WM08 missing income (W06) outranks funding gap (W07)")
    return d, out, ["hand: 3,600,000 - 2,400,000"]


@fixture("WM09", "gross-net-mismatch", "Gross income against after-tax spending",
         ["WK03"], "A gross source is never subtracted from after-tax spending: no gap, warning, W08.")
def wm09():
    d = doc(EST(400000), A=EST(65), R=EST(65), H=4, i=0, sources=[
        src("src-1", "workplace_pension", EST(3600000), "annual", "gross", "start_year_dollars", RECV),
        src("src-2", "oas", EST(80000), "monthly", "net", "today_dollars", RECV)])
    out = ref.compute(d)
    check(col(out, "gap_cents") == [None] * 4, "WM09 no gap computed")
    check(col(out, "income_gross_cents") == [3600000] * 4 and col(out, "income_net_cents") == [960000] * 4,
          "WM09 gross and net totals shown separately (3,600,000 / 960,000)")
    check(out["completeness"]["state"] == "basis_mismatch", "WM09 state basis_mismatch")
    check("gross_net_mismatch" in out["flags"] and out["clip"]["selected"] == "W08", "WM09 flag + W08")
    return d, out, ["no subtraction across bases"]


@fixture("WM10", "housing-only-wealth", "Home is the only wealth entered",
         ["WK03"], "The home value never enters any calculation; a housing-only warning is raised.")
def wm10():
    savings = {"accounts": {"rrsp_rrif": ZERO, "tfsa": ZERO, "non_registered": ZERO},
               "home_value": {"amount": EST(90000000), "excluded_from_spendable": True}}
    d = doc(EST(350000), A=EST(67), R=EST(67), H=3, i=0, savings=savings, sources=[
        src("src-1", "qpp_cpp", EST(1500000), "annual", "net", "today_dollars", RECV),
        src("src-2", "oas", EST(900000), "annual", "net", "today_dollars", RECV)])
    out = ref.compute(d)
    check(col(out, "gap_cents") == [1800000] * 3, "WM10 G = 4,200,000 - 2,400,000 (home value absent from math)")
    check("housing_only_wealth" in out["flags"], "WM10 flag housing_only_wealth")
    return d, out, ["home value $900,000 has no effect on any year"]


@fixture("WM11", "pension-double-count", "Pension counted as asset and income",
         ["WK03"], "A pension listed as income and as an asset raises the guard; the asset never offsets the gap; capital illustration display ineligible.")
def wm11():
    savings = {"accounts": {"tfsa": EST(5000000)},
               "pension_value": {"amount": EST(60000000), "also_entered_as_income": "yes"}}
    d = doc(EST(500000), A=EST(64), R=EST(64), H=3, i=0, r=300, savings=savings, sources=[
        src("src-1", "workplace_pension", EST(4200000), "annual", "net", "start_year_dollars", RECV)])
    out = ref.compute(d)
    check(col(out, "gap_cents") == [1800000] * 3, "WM11 G = 6,000,000 - 4,200,000 (pension asset not used)")
    check("pension_double_count_risk" in out["flags"], "WM11 flag pension_double_count_risk")
    ci = out["capital_illustration"]["reference_if_enabled"]
    check(ci["computable"] and not ci["display_eligible_if_enabled"]
          and "pension_double_count_risk" in ci["ineligible_reasons"], "WM11 C_R computable but display-ineligible")
    return d, out, ["guard blocks capital illustration display"]


@fixture("WM12", "surplus-years", "Surplus years then gap years",
         ["WK02", "WK03"], "Surplus is shown separately and never nets against later gaps.")
def wm12():
    d = doc(EST(4000000), period="annual", A=EST(66), R=EST(66), H=6, i=300, r=0, sources=[
        src("src-1", "workplace_pension", EST(4400000), "annual", "net", "start_year_dollars", RECV)])
    out = ref.compute(d)
    check(col(out, "surplus_cents") == [400000, 280000, 156400, 29092, 0, 0],
          "WM12 hand: S = 400,000; 280,000; 156,400; 29,092; 0; 0")
    check(col(out, "gap_cents") == [0, 0, 0, 0, 102035, 237096],
          "WM12 hand: G_4 = 4,502,035.24 - 4,400,000 -> 102,035; G_5 = 4,637,096.2972 - 4,400,000 -> 237,096")
    ci = out["capital_illustration"]["reference_if_enabled"]
    check(ci["C_R_exact"] == "339131.5372" and ci["C_R_cents"] == 339132,
          "WM12 r=0: C_R = 102,035.24 + 237,096.2972 = 339,131.5372 (surpluses NOT subtracted)")
    return d, out, ["hand powers of 1.03", "surplus not netted"]


@fixture("WM13", "retirement-year-boundary", "Window starts at t = R - A",
         ["WK02"], "No row before the retirement year; a pre-retirement start grows from its own start year.")
def wm13():
    d = doc(EST(5000000), period="annual", A=EST(58), R=EST(62), H=4, i=200, sources=[
        src("src-1", "workplace_pension", EST(2000000), "annual", "net", "start_year_dollars", AGE(61), q_bp=100),
        src("src-2", "qpp_cpp", EST(1000000), "annual", "net", "start_year_dollars", AGE(62), q_bp=0)])
    out = ref.compute(d)
    first = out["years"][0]
    check(out["window"]["t_R"] == 4 and first["t"] == 4 and first["calendar_year"] == 2030 and first["age"] == 62,
          "WM13 first row t=4, 2030, age 62")
    check(first["spending_cents"] == 5412161, "WM13 hand: D_4 = 5,000,000 x 1.02^4 = 5,412,160.8 -> 5,412,161")
    check(first["income_by_source_cents"] == {"src-1": 2020000, "src-2": 1000000},
          "WM13 P_1,4 = 2,000,000 x 1.01^(4-3); P_2,4 = 1,000,000")
    check(first["gap_cents"] == 2392161, "WM13 G_4 = 2,392,160.8 -> 2,392,161")
    return d, out, ["hand boundary arithmetic"]


@fixture("WM14", "capital-illustration-r-zero", "Capital illustration with r = 0 (feature OFF)",
         ["WK02"], "With r = 0, C_R is the plain sum of the H gaps. Reference value only: the feature flag is off and nothing is displayed.")
def wm14():
    d = doc(EST(400000), A=EST(65), R=EST(65), H=5, i=0, r=0, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "net", "start_year_dollars", RECV)])
    out = ref.compute(d)
    ci = out["capital_illustration"]
    check(ci["displayed"] is False and ci["state"] == "disabled_by_flag", "WM14 feature OFF: not displayed")
    check(ci["reference_if_enabled"]["C_R_cents"] == 9000000, "WM14 C_R = 5 x 1,800,000 = 9,000,000")
    return d, out, ["hand: 5 x 1,800,000"]


@fixture("WM15", "capital-illustration-growing-annuity", "Capital illustration, r > 0, growing gap (feature OFF)",
         ["WK02"], "Growing annuity closed form: C_R = a(1+i)^t_R [1 - ((1+i)/(1+r))^H] / (r - i).")
def wm15():
    d = doc(EST(5000000), period="annual", coverage="no_planned_income", A=EST(60), R=EST(60), H=20, i=200, r=400)
    out = ref.compute(d)
    a, i, r, H = Fr(5000000), Fr(2, 100), Fr(4, 100), 20
    closed = a * (1 - ((1 + i) / (1 + r)) ** H) / (r - i)
    ci = out["capital_illustration"]["reference_if_enabled"]
    check(ci["C_R_exact"] == f"{closed.numerator}/{closed.denominator}", "WM15 C_R equals the growing-annuity closed form exactly")
    check(ci["C_R_cents"] == rhe(closed), f"WM15 C_R rounds to {rhe(closed)} cents")
    check(out["capital_illustration"]["displayed"] is False, "WM15 feature OFF")
    return d, out, ["growing annuity closed form"]


@fixture("WM16", "capital-illustration-level-annuity", "Capital illustration, r > 0, level gap (feature OFF)",
         ["WK02"], "Level annuity closed form: C_R = g [1 - (1+r)^-H] / r.")
def wm16():
    d = doc(EST(400000), A=EST(65), R=EST(65), H=25, i=0, r=500, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "net", "start_year_dollars", RECV)])
    out = ref.compute(d)
    gap, r, H = Fr(1800000), Fr(5, 100), 25
    closed = gap * (1 - (1 + r) ** -H) / r
    ci = out["capital_illustration"]["reference_if_enabled"]
    check(ci["C_R_exact"] == f"{closed.numerator}/{closed.denominator}", "WM16 C_R equals the level-annuity closed form exactly")
    check(ci["C_R_cents"] == rhe(closed), f"WM16 C_R rounds to {rhe(closed)} cents")
    return d, out, ["ordinary annuity closed form"]


@fixture("WM17", "rounding-half-even", "Half-even rounding at exactly half a cent",
         ["WK01", "WK02"], "Ties round to the even cent, both down and up; totals are rounded once from exact values.")
def wm17():
    d = doc(EST(1000050), period="annual", A=EST(70), R=EST(70), H=3, i=100, sources=[
        src("src-1", "annuity", EST(1000150), "annual", "net", "start_year_dollars", RECV, q_bp=100)])
    out = ref.compute(d)
    y1 = out["years"][1]
    check(y1["exact"]["spending"] == "1010050.5" and y1["spending_cents"] == 1010050,
          "WM17 D_1 = 1,010,050.5 -> 1,010,050 (tie, rounds down to even)")
    check(y1["income_by_source_cents"]["src-1"] == 1010152,
          "WM17 P_1 = 1,010,151.5 -> 1,010,152 (tie, rounds up to even)")
    check(y1["surplus_cents"] == 101 and y1["exact"]["surplus"] == "101",
          "WM17 S_1 = 101 exactly although displayed P - D = 102 (round once, from exact)")
    check(out["years"][2]["spending_cents"] == 1020151 and out["years"][2]["surplus_cents"] == 102,
          "WM17 t=2: D = 1,020,151.005 -> 1,020,151; S = 102.01 -> 102")
    naive = round(1000050 * 1.01)
    log(f"  info WM17 float64 contrast: round(1000050*1.01) in IEEE double = {naive}; "
        f"1000050*1.01 = {1000050 * 1.01!r} (exact value 1010050.5)")
    return d, out, ["hand tie cases", "float64 contrast recorded in log"]


@fixture("WM18", "horizon-and-source-end", "Source that ends; source beyond the horizon",
         ["WK02", "WK03"], "A bridge amount stops at its end index; a source starting at or after t_R + H raises the horizon flag.")
def wm18():
    d = doc(EST(360000), A=EST(60), R=EST(60), H=5, i=0, sources=[
        src("src-1", "workplace_pension", EST(1200000), "annual", "net", "start_year_dollars", RECV, end=AGE(63)),
        src("src-2", "qpp_cpp", EST(1000000), "annual", "net", "start_year_dollars", AGE(65)),
        src("src-3", "workplace_pension", EST(2000000), "annual", "net", "start_year_dollars", RECV)])
    out = ref.compute(d)
    check(col(out, "gap_cents") == [1120000] * 3 + [2320000] * 2, "WM18 G = 1,120,000 (t=0..2) then 2,320,000 (t=3..4)")
    check("horizon_shorter_than_timeline" in out["flags"], "WM18 flag horizon_shorter_than_timeline (src-2 starts at t=5 = t_R+H)")
    return d, out, ["hand: end exclusive at t=3"]


@fixture("WM19", "uncertain-income-labelled-scheduled", "Rental income labelled scheduled",
         ["WK03"], "Rent labelled scheduled is warned; uncertain business income is included but labelled uncertain.")
def wm19():
    d = doc(EST(400000), A=EST(63), R=EST(63), H=3, i=0, sources=[
        src("src-1", "rental", EST(150000), "monthly", "net", "today_dollars", RECV, dep="scheduled"),
        src("src-2", "workplace_pension", EST(2400000), "annual", "net", "start_year_dollars", RECV),
        src("src-3", "business", EST(100000), "annual", "net", "today_dollars", RECV, dep="uncertain")])
    out = ref.compute(d)
    check(col(out, "gap_cents") == [500000] * 3, "WM19 G = 4,800,000 - 1,800,000 - 2,400,000 - 100,000 = 500,000")
    check({"uncertain_kind_labelled_scheduled", "includes_uncertain_income"} <= set(out["flags"]),
          "WM19 flags uncertain_kind_labelled_scheduled + includes_uncertain_income")
    return d, out, ["hand subtraction"]


@fixture("WM20", "timing-unknown", "Current age unknown",
         ["WK01", "WK06"], "Without current age there is no window; nothing is projected; core-missing selects W10.")
def wm20():
    d = doc(EST(400000), A=UNK, R=EST(65), H=25, i=200, sources=[
        src("src-1", "qpp_cpp", EST(1000000), "annual", "gross", "today_dollars", AGE(65))])
    out = ref.compute(d)
    check(out["window"] is None and out["years"] == [], "WM20 no window, no rows")
    check(out["completeness"]["state"] == "incomplete_unknown_timing", "WM20 state incomplete_unknown_timing")
    check("start_unresolvable:src-1" in out["completeness"]["reasons"], "WM20 age-based start unresolvable")
    check(out["clip"]["selected"] == "W10" and out["clip"]["selection_reason"] == "core_inputs_missing", "WM20 W10 core_inputs_missing")
    return d, out, ["propagation of unknown age"]


@fixture("WM21", "household-timing", "Partner retires later",
         ["WK02", "WK06"], "A partner-owned start resolves against the partner's age; different retirement years select W09 over W07.")
def wm21():
    hh = {"partner_current_age": EST(57), "partner_retirement_age": EST(63)}
    d = doc(EST(600000), A=EST(60), R=EST(62), H=5, i=0, household=hh, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "net", "start_year_dollars", AGE(62)),
        src("src-2", "workplace_pension", EST(2400000), "annual", "net", "start_year_dollars", AGE(63), owner="partner")])
    out = ref.compute(d)
    check(col(out, "gap_cents") == [4200000] * 4 + [1800000], "WM21 G = 4,200,000 (t=2..5), 1,800,000 (t=6; partner start 63-57=6)")
    check(out["years"][0]["partner_age"] == 59, "WM21 partner age at t=2 is 59")
    check(out["clip"]["selected"] == "W09", "WM21 W09 (household) outranks W07")
    return d, out, ["partner age arithmetic"]


@fixture("WM22", "price-basis-unknown", "Price basis unknown on a future source",
         ["WK01", "WK02"], "A future amount whose price basis is unknown cannot be placed in nominal terms; an already-received one can.")
def wm22():
    d = doc(EST(300000), A=EST(60), R=EST(60), H=4, i=200, sources=[
        src("src-1", "qpp_cpp", EST(800000), "annual", "net", "unknown", AGE(62)),
        src("src-2", "workplace_pension", EST(1000000), "annual", "net", "unknown", RECV)])
    out = ref.compute(d)
    check(col(out, "status") == ["computed", "computed", "not_computable", "not_computable"],
          "WM22 t=0,1 computed; t=2,3 blocked by price_basis_unknown:src-1")
    check("price_basis_unknown:src-2" not in out["completeness"]["reasons"], "WM22 already-received source needs no price basis")
    check(out["years"][1]["gap_cents"] == rhe(Fr(3600000) * g(200, 1) - 1000000), "WM22 hand: G_1 = 3,672,000 - 1,000,000")
    return d, out, ["hand"]


@fixture("WM23", "tax-basis-unknown", "Tax basis unknown",
         ["WK03", "WK06"], "An amount whose gross/net basis is unknown is not compared; state basis_unknown; W08.")
def wm23():
    d = doc(EST(400000), A=EST(65), R=EST(65), H=3, i=0, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "unknown", "start_year_dollars", RECV)])
    out = ref.compute(d)
    check(col(out, "gap_cents") == [None] * 3 and col(out, "income_unknown_basis_cents") == [3000000] * 3,
          "WM23 no gap; 3,000,000 shown as unknown basis")
    check(out["completeness"]["state"] == "basis_unknown" and out["clip"]["selected"] == "W08", "WM23 basis_unknown + W08")
    return d, out, ["no subtraction"]


@fixture("WM24", "rounding-float-trap", "Exact tie that IEEE doubles miss",
         ["WK01", "WK02"], "1,000,800 x 1.025^2 = 1,051,465.5 exactly -> 1,051,466 (half-even); iterated float64 gives 1,051,465.4999999998.")
def wm24():
    d = doc(EST(1000800), period="annual", coverage="no_planned_income", A=EST(70), R=EST(70), H=3, i=250)
    out = ref.compute(d)
    y2 = out["years"][2]
    check(y2["exact"]["spending"] == "1051465.5" and y2["spending_cents"] == 1051466,
          "WM24 D_2 = 1,051,465.5 exactly -> 1,051,466 (tie, odd -> up to even)")
    x = 1000800.0
    for _ in range(2):
        x *= 1.025
    log(f"  info WM24 float64 contrast: 1000800*1.025*1.025 = {x!r}; any float rounding gives {round(x)} (wrong)")
    check(round(x) != y2["spending_cents"], "WM24 float64 iterated product is NOT conformant (proves exact arithmetic is required)")
    return d, out, ["exact tie found by search over a in [1,000,000, 1,003,000), bp in {100..300}, t in {2,3}"]


def reasons(out):
    return [r["reasons"] for r in out["years"]]


def srccol(out, sid):
    return [r["income_by_source_cents"][sid] for r in out["years"]]


PARTNER_AGE_UNKNOWN = {"partner_current_age": UNK, "partner_retirement_age": EST(63)}


@fixture("WM25", "spending-unknown-window-known", "Spending unknown, window known",
         ["WK01", "WK03"], "Unknown spending is never 0: every row has spending null, gap and surplus null, reason spending_unknown; income rows are still shown exactly.")
def wm25():
    d = doc(UNK, A=EST(65), R=EST(65), H=3, i=200, r=300, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "net", "start_year_dollars", RECV, q_bp=200)])
    out = ref.compute(d)
    check(col(out, "spending_cents") == [None] * 3 and col(out, "gap_cents") == [None] * 3
          and col(out, "surplus_cents") == [None] * 3, "WM25 spending, gap and surplus null in every row (never 0)")
    check(col(out, "status") == ["not_computable"] * 3 and reasons(out) == [["spending_unknown"]] * 3,
          "WM25 every row not_computable with reasons [spending_unknown]")
    check([r["exact"] for r in out["years"]] == [{"spending": None}] * 3, "WM25 exact.spending null; no compared/gap/surplus keys")
    check(srccol(out, "src-1") == [3000000, 3060000, 3121200] and col(out, "income_net_cents") == [3000000, 3060000, 3121200],
          "WM25 hand: income rows still shown: 3,000,000 x 1.02^t = 3,000,000; 3,060,000; 3,121,200")
    check(out["completeness"] == {"state": "incomplete_unknown_spending", "reasons": ["spending_unknown"]},
          "WM25 state incomplete_unknown_spending, reasons [spending_unknown]")
    check(out["clip"]["selected"] == "W10" and out["clip"]["selection_reason"] == "core_inputs_missing" and out["flags"] == [],
          "WM25 W10 core_inputs_missing, no flag")
    ci = out["capital_illustration"]["reference_if_enabled"]
    check(ci["computable"] is False and ci["not_computable_reasons"] == ["state_not_complete"],
          "WM25 capital illustration not computable (state_not_complete) although r is present")
    return d, out, ["hand: 3,000,000 x 1.02 = 3,060,000; x 1.02 = 3,121,200",
                    "a runtime that reads unknown spending as 0 would show surplus 3,000,000 in year 0"]


@fixture("WM26", "start-point-unknown", "Start point unknown, window known",
         ["WK01", "WK06"], "A source whose start point has status unknown may pay in any year: its amount and every gap are null, never 'not paying' and never 'already receiving'.")
def wm26():
    d = doc(EST(400000), A=EST(60), R=EST(62), H=4, i=0, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "net", "start_year_dollars", RECV),
        src("src-2", "qpp_cpp", EST(1000000), "annual", "net", "start_year_dollars", AGE_UNK)])
    out = ref.compute(d)
    check(srccol(out, "src-2") == [None] * 4 and col(out, "income_net_cents") == [None] * 4,
          "WM26 src-2 null in every window year t=2..5 (start unknown)")
    check(col(out, "gap_cents") == [None] * 4 and reasons(out) == [["start_unknown:src-2"]] * 4,
          "WM26 no gap; every row carries start_unknown:src-2")
    check(out["completeness"] == {"state": "incomplete_unknown_income", "reasons": ["start_unknown:src-2"]},
          "WM26 state incomplete_unknown_income")
    check(out["clip"]["selected"] == "W06" and out["flags"] == ["incomplete_income"], "WM26 W06 + incomplete_income")
    return d, out, ["read as 'not paying' a runtime would show gap 4,800,000 - 3,000,000 = 1,800,000 (wrong)",
                    "read as 'already receiving' it would show 4,800,000 - 4,000,000 = 800,000 (wrong)"]


@fixture("WM27", "end-point-unknown", "End point unknown",
         ["WK01", "WK02"], "Before a known start the source is a known 0; from its start onward an unknown end makes it unknown (never 'no end').")
def wm27():
    d = doc(EST(4800000), period="annual", A=EST(60), R=EST(62), H=5, i=0, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "net", "start_year_dollars", RECV),
        src("src-2", "workplace_pension", EST(1200000), "annual", "net", "start_year_dollars", AGE(63), end=AGE_UNK)])
    out = ref.compute(d)
    check(srccol(out, "src-2") == [0, None, None, None, None], "WM27 src-2 = 0 at t=2 (< s=3), null for t=3..6")
    check(col(out, "gap_cents") == [1800000, None, None, None, None],
          "WM27 hand: G_2 = 4,800,000 - 3,000,000 = 1,800,000; t=3..6 null")
    check(reasons(out) == [[]] + [["end_unknown:src-2"]] * 4, "WM27 reasons [] then [end_unknown:src-2]")
    check(out["completeness"]["state"] == "incomplete_unknown_income" and out["clip"]["selected"] == "W06"
          and out["clip"]["predicates"]["F"], "WM27 incomplete_unknown_income; F true but M selects W06")
    return d, out, ["read as 'no end' a runtime would show G = 600,000 for t=3..6 and select W07 (wrong)"]


@fixture("WM28", "end-unresolvable", "Partner-owned end age with the partner's age unknown",
         ["WK01", "WK02"], "An age-based end is unresolvable without the owner's age: known 0 before the start, unknown from the start onward.")
def wm28():
    d = doc(EST(4800000), period="annual", A=EST(60), R=EST(62), H=5, i=0, household=PARTNER_AGE_UNKNOWN, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "net", "start_year_dollars", RECV),
        src("src-2", "workplace_pension", EST(1200000), "annual", "net", "start_year_dollars", IDX(4),
            owner="partner", end=AGE(65))])
    out = ref.compute(d)
    check(srccol(out, "src-2") == [0, 0, None, None, None], "WM28 src-2 = 0 at t=2,3 (< s=4), null for t=4..6")
    check(col(out, "gap_cents") == [1800000, 1800000, None, None, None], "WM28 G = 1,800,000 at t=2,3; null after")
    check(reasons(out) == [[], []] + [["end_unresolvable:src-2"]] * 3, "WM28 reasons end_unresolvable:src-2 from t=4")
    check(all("partner_age" not in r for r in out["years"]), "WM28 partner_age absent (partner age unknown)")
    check(out["clip"]["predicates"]["H"] is False and out["clip"]["selected"] == "W06", "WM28 H false; W06")
    return d, out, ["hand: 4,800,000 - 3,000,000"]


@fixture("WM29", "start-unresolvable-window-known", "Partner-owned start age with the partner's age unknown",
         ["WK01", "WK06"], "The window is known but a partner-owned age start cannot be placed: that source is unknown in every year, never 'not paying'.")
def wm29():
    d = doc(EST(4800000), period="annual", A=EST(60), R=EST(62), H=5, i=0, household=PARTNER_AGE_UNKNOWN, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "net", "start_year_dollars", RECV),
        src("src-2", "qpp_cpp", EST(900000), "annual", "net", "start_year_dollars", AGE(65), owner="partner")])
    out = ref.compute(d)
    check(out["window"]["t_R"] == 2 and srccol(out, "src-2") == [None] * 5, "WM29 window t=2..6 known; src-2 null in every row")
    check(col(out, "gap_cents") == [None] * 5 and reasons(out) == [["start_unresolvable:src-2"]] * 5,
          "WM29 no gap; start_unresolvable:src-2 in every row")
    check(out["completeness"]["state"] == "incomplete_unknown_income" and out["clip"]["selected"] == "W06",
          "WM29 incomplete_unknown_income; W06")
    return d, out, ["read as 'not paying' a runtime would show G = 1,800,000 and select W07 (wrong)"]


@fixture("WM30", "income-list-partial", "Some income sources may be missing",
         ["WK01", "WK03"], "A partial source list makes other income unknown: listed amounts are shown per source, the basis groups are null (not the listed subtotal), no gap is computed, reason income_list_partial.")
def wm30():
    d = doc(EST(400000), coverage="some_sources_may_be_missing", A=EST(66), R=EST(66), H=3, i=0, sources=[
        src("src-1", "oas", EST(900000), "annual", "net", "today_dollars", RECV),
        src("src-2", "workplace_pension", EST(2400000), "annual", "net", "start_year_dollars", RECV)])
    out = ref.compute(d)
    check(srccol(out, "src-1") == [900000] * 3 and srccol(out, "src-2") == [2400000] * 3
          and col(out, "spending_cents") == [4800000] * 3,
          "WM30 listed amounts 900,000 and 2,400,000 shown per source; spending 4,800,000 shown")
    check(all((r["income_net_cents"], r["income_gross_cents"], r["income_unknown_basis_cents"]) == (None, None, None)
              for r in out["years"]),
          "WM30 income groups null in every row: the listed subtotal 3,300,000 is not the year's income (s5)")
    check(col(out, "gap_cents") == [None] * 3 and reasons(out) == [["income_list_partial"]] * 3,
          "WM30 no gap; every row carries income_list_partial")
    check(out["completeness"] == {"state": "incomplete_unknown_income", "reasons": ["income_list_partial"]},
          "WM30 state incomplete_unknown_income, reasons [income_list_partial]")
    check(out["clip"]["selected"] == "W06" and out["flags"] == ["incomplete_income"], "WM30 W06 + incomplete_income")
    return d, out, ["read as complete a runtime would show G = 1,500,000 (wrong)",
                    "groups filled from the listed sources would show income_net_cents 3,300,000 as the year's "
                    "after-tax income (wrong); the per-source rows carry the listed amounts"]


@fixture("WM31", "retirement-age-unknown", "Retirement age unknown, current age known",
         ["WK01", "WK06"], "No window without R, but self age-based starts still resolve against A: only genuinely missing inputs are reported.")
def wm31():
    d = doc(EST(400000), A=EST(58), R=UNK, H=25, i=200, sources=[
        src("src-1", "qpp_cpp", EST(1000000), "annual", "net", "today_dollars", AGE(65)),
        src("src-2", "workplace_pension", UNK, "annual", "net", "start_year_dollars", AGE(62))])
    out = ref.compute(d)
    check(out["window"] is None and out["years"] == [], "WM31 no window, no rows")
    check(out["completeness"] == {"state": "incomplete_unknown_timing",
                                  "reasons": ["amount_unknown:src-2", "retirement_age_unknown"]},
          "WM31 reasons = [amount_unknown:src-2, retirement_age_unknown]; no start_unresolvable (A is known)")
    check(out["clip"]["selected"] == "W10" and out["clip"]["selection_reason"] == "core_inputs_missing"
          and out["flags"] == ["incomplete_income"], "WM31 W10 core_inputs_missing; flag incomplete_income")
    return d, out, ["s_1 = 65 - 58 = 7 and s_2 = 62 - 58 = 4 resolve without R"]


@fixture("WM32", "unresolved-start-end-at-retirement", "Unknown start, known end at the retirement year",
         ["WK02", "WK06"], "A known end decides 'not paying' without the start: for t >= e_j the source is a known 0, so the window is complete (s4 precedence).")
def wm32():
    d = doc(EST(400000), A=EST(60), R=EST(62), H=6, i=0, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "net", "start_year_dollars", RECV),
        src("src-2", "employment", EST(1200000), "annual", "net", "start_year_dollars", AGE_UNK, end=AGE(62))])
    out = ref.compute(d)
    check(srccol(out, "src-2") == [0] * 6, "WM32 e_2 = 62 - 60 = 2 = t_R: src-2 is a known 0 for t=2..7")
    check(col(out, "gap_cents") == [1800000] * 6 and col(out, "status") == ["computed"] * 6,
          "WM32 hand: G = 4,800,000 - 3,000,000 = 1,800,000 in every year")
    check(out["completeness"] == {"state": "complete", "reasons": []} and out["flags"] == [],
          "WM32 state complete, no reason, no flag (the unknown start cannot change any illustrated year)")
    check(out["clip"]["selected"] == "W07", "WM32 W07 funding_gap")
    return d, out, ["A6 ambiguity_demo input (F02-MATH-P2-2): reading 1 ('no' first) is normative",
                    "the 'unknown first' reading would give incomplete_unknown_income / W06 (non-conformant)"]


@fixture("WM33", "unresolved-start-end-inside-window", "Unknown start, known end inside the window",
         ["WK01", "WK02"], "Unknown before the known end (it may be paying), a known 0 from the end onward.")
def wm33():
    d = doc(EST(4800000), period="annual", A=EST(60), R=EST(62), H=6, i=0, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "net", "start_year_dollars", RECV),
        src("src-2", "workplace_pension", EST(600000), "annual", "net", "start_year_dollars", AGE_UNK, end=AGE(65))])
    out = ref.compute(d)
    check(srccol(out, "src-2") == [None] * 3 + [0] * 3, "WM33 e_2 = 5: src-2 null for t=2..4, known 0 for t=5..7")
    check(col(out, "gap_cents") == [None] * 3 + [1800000] * 3, "WM33 G null for t=2..4; 1,800,000 for t=5..7")
    check(reasons(out) == [["start_unknown:src-2"]] * 3 + [[]] * 3, "WM33 start_unknown:src-2 only before the end")
    check(out["completeness"]["state"] == "incomplete_unknown_income" and out["clip"]["selected"] == "W06",
          "WM33 incomplete_unknown_income; W06")
    return d, out, ["hand: 4,800,000 - 3,000,000 after the end"]


@fixture("WM34", "combined-unknowns-code-sets", "Several unknowns on one source: every applicable code",
         ["WK01", "WK03"], "Pins the reason-code sets of s4: when a source is not known to be 'not paying', every missing input that affects it is listed.")
def wm34():
    hh = {"partner_current_age": UNK, "partner_retirement_age": EST(64)}
    d = doc(EST(4800000), period="annual", A=EST(60), R=EST(62), H=5, i=0, household=hh, sources=[
        src("src-1", "workplace_pension", EST(3000000), "annual", "net", "start_year_dollars", RECV),
        src("src-2", "other", UNK, "annual", "net", "unknown", IDX_UNK),
        src("src-3", "workplace_pension", EST(1000000), "annual", "gross", "start_year_dollars", AGE(65),
            owner="partner", end=AGE(70)),
        src("src-4", "qpp_cpp", UNK, "annual", "net", "unknown", AGE(65)),
        src("src-5", "annuity", UNK, "annual", "net", "unknown", RECV, end=AGE_UNK)])
    out = ref.compute(d)
    early = ["amount_unknown:src-2", "amount_unknown:src-5", "end_unknown:src-5", "end_unresolvable:src-3",
             "gross:src-3", "price_basis_unknown:src-2", "start_unknown:src-2", "start_unresolvable:src-3"]
    late = sorted(early + ["amount_unknown:src-4", "price_basis_unknown:src-4"])
    check(reasons(out) == [early] * 3 + [late] * 2,
          "WM34 t=2..4: src-2 {start_unknown, amount_unknown, price_basis_unknown}; src-3 {start_unresolvable, "
          "end_unresolvable, gross}; src-5 {end_unknown, amount_unknown} (no price code: s=0); src-4 none (t < s=5)")
    check(srccol(out, "src-4") == [0, 0, 0, None, None], "WM34 src-4 known 0 before its start, null from t=5")
    check(col(out, "income_net_cents") == [None] * 5 and col(out, "income_gross_cents") == [None] * 5
          and col(out, "income_unknown_basis_cents") == [0] * 5, "WM34 net and gross groups null; unknown-basis group 0")
    check(out["completeness"]["state"] == "incomplete_unknown_income"
          and out["flags"] == ["gross_net_mismatch", "incomplete_income"] and out["clip"]["selected"] == "W06",
          "WM34 incomplete_unknown_income; flags gross_net_mismatch + incomplete_income; M outranks X: W06")
    return d, out, ["code sets written out by hand from s4 rule 2"]


@fixture("WM35", "capital-illustration-deferred-retirement", "Capital illustration with t_R > 0 (feature OFF)",
         ["WK02"], "C_R is valued at the start of year t_R, not at t = 0: growing-annuity closed form with the (1+i)^t_R factor.")
def wm35():
    d = doc(EST(5000000), period="annual", coverage="no_planned_income", A=EST(58), R=EST(62), H=4, i=200, r=400)
    out = ref.compute(d)
    a, i, r, H, tR = Fr(5000000), Fr(2, 100), Fr(4, 100), 4, 4
    closed = a * (1 + i) ** tR * (1 - ((1 + i) / (1 + r)) ** H) / (r - i)
    direct = sum((a * (1 + i) ** (tR + k) / (1 + r) ** (k + 1) for k in range(H)), Fr(0))
    check(closed == direct, "WM35 growing-annuity closed form equals the direct discounted sum")
    ci = out["capital_illustration"]["reference_if_enabled"]
    check(ci["C_R_exact"] == ref.exact_str(closed) and ci["C_R_cents"] == rhe(closed),
          f"WM35 C_R = a(1.02)^4 [1 - (1.02/1.04)^4] / 0.02 -> {rhe(closed)} cents")
    check(ci["valued_at"] == {"t": 4, "calendar_year": 2030, "point": "start_of_year"}, "WM35 valued at the start of 2030 (t_R = 4)")
    check(rhe(closed / (1 + r) ** tR) != ci["C_R_cents"], f"WM35 discounting to t = 0 would give {rhe(closed / (1 + r) ** tR)} (wrong)")
    check(ci["display_eligible_if_enabled"] is True and out["capital_illustration"]["displayed"] is False,
          "WM35 display-eligible if enabled, but the feature is OFF: not displayed")
    return d, out, ["growing annuity closed form with deferral factor (1+i)^t_R", "direct sum"]


@fixture("WM36", "capital-illustration-all-surplus", "Capital illustration when every year is a surplus (feature OFF)",
         ["WK02", "WK03"], "C_R = 0 is computable but never display-eligible (reason no_positive_gap): a zero would read as 'you have enough'.")
def wm36():
    d = doc(EST(3000000), period="annual", A=EST(65), R=EST(65), H=3, i=0, r=300, sources=[
        src("src-1", "workplace_pension", EST(3600000), "annual", "net", "start_year_dollars", RECV)])
    out = ref.compute(d)
    check(col(out, "surplus_cents") == [600000] * 3 and col(out, "gap_cents") == [0] * 3,
          "WM36 hand: S = 3,600,000 - 3,000,000 = 600,000; G = 0")
    ci = out["capital_illustration"]["reference_if_enabled"]
    check(ci["computable"] and ci["C_R_cents"] == 0 and ci["C_R_exact"] == "0", "WM36 C_R = 0 (computable)")
    check(ci["display_eligible_if_enabled"] is False and ci["ineligible_reasons"] == ["no_positive_gap"],
          "WM36 not display-eligible; ineligible_reasons = [no_positive_gap]")
    check(out["clip"]["selected"] == "W10" and out["clip"]["selection_reason"] == "neutral_fallback",
          "WM36 all-surplus complete result: W10 neutral_fallback")
    return d, out, ["hand subtraction"]


# ---------------------------------------------------------------- clip rules
def clip_input(C, M, X, H, F):
    """Template: A=60, R=62 (t_R=2), H=6, i=0; window t=2..7; late sources start at 65 (t=5)."""
    sources = [src("src-1", "workplace_pension", EST(3000000 if F else 5000000), "annual", "net",
                   "start_year_dollars", RECV)]
    if M:
        sources.append(src("src-2", "workplace_pension", UNK, "annual", "net", "start_year_dollars", AGE(65)))
    if X:
        sources.append(src("src-3", "qpp_cpp", EST(1000000), "annual", "gross", "start_year_dollars", AGE(65)))
    hh = {"partner_current_age": EST(58), "partner_retirement_age": EST(63)} if H else None
    return doc(UNK if C else EST(400000), A=EST(60), R=EST(62), H=6, i=0, sources=sources, household=hh)


def build_clip_rules():
    rows = []
    for n in range(32):
        C, M, X, H, F = [(n >> (4 - k)) & 1 == 1 for k in range(5)]
        preds = {"C": C, "M": M, "X": X, "H": H, "F": F}
        row = {"row": n + 1, "predicates": preds}
        if C and F:
            row.update({"possible": False,
                        "why_impossible": "F needs a computed year with G_t > 0; C means no window or no spending, so no year is computed.",
                        "input": None, "expected": None})
        else:
            d = clip_input(C, M, X, H, F)
            errs = ref.semantic_errors(d)
            out = ref.compute(d)
            check(not errs, f"clip row {n + 1} input passes semantic rules")
            check(out["clip"]["predicates"] == preds, f"clip row {n + 1} computed predicates == intended {preds}")
            row.update({"possible": True, "input": d,
                        "expected": {"selected": out["clip"]["selected"],
                                     "selection_reason": out["clip"]["selection_reason"],
                                     "completeness_state": out["completeness"]["state"],
                                     "flags": out["flags"]}})
        # selection by the written precedence, independent of the model
        sel = next((c for p, c, _ in ref.CLIP_PRECEDENCE if preds[p]), ref.CLIP_FALLBACK[0])
        row["selected_by_precedence"] = sel
        if row["possible"]:
            check(row["expected"]["selected"] == sel, f"clip row {n + 1} model selection == precedence table ({sel})")
        rows.append(row)

    supplementary = []

    def supp(cid, title, d, want_sel, want_reason):
        out = ref.compute(d)
        check(not ref.semantic_errors(d), f"{cid} input passes semantic rules")
        check((out["clip"]["selected"], out["clip"]["selection_reason"]) == (want_sel, want_reason),
              f"{cid} {title}: {want_sel}/{want_reason}")
        supplementary.append({"case": cid, "title": title, "input": d,
                              "expected": {"predicates": out["clip"]["predicates"],
                                           "selected": out["clip"]["selected"],
                                           "selection_reason": out["clip"]["selection_reason"],
                                           "completeness_state": out["completeness"]["state"],
                                           "flags": out["flags"]}})

    t = clip_input(False, True, True, False, False)
    t["chapters"]["timing"]["current_age"] = UNK
    supp("CS01", "C via unknown current age with M and X also true", t, "W10", "core_inputs_missing")
    t = clip_input(False, False, False, False, True)
    t["chapters"]["timing"]["retirement_age"] = UNK
    supp("CS02", "C via unknown retirement age only", t, "W10", "core_inputs_missing")
    t = clip_input(False, False, False, False, True)
    t["chapters"]["income"]["coverage"] = "some_sources_may_be_missing"
    supp("CS03", "M via partial source list: no year computed, so F is false", t, "W06", "missing_income")
    t = clip_input(False, False, False, False, False)
    t["chapters"]["income"]["sources"][0]["tax_basis"] = "unknown"
    supp("CS04", "X via unknown tax basis (not gross)", t, "W08", "tax_basis")
    t = clip_input(False, False, False, False, False)
    t["chapters"]["timing"]["household"] = {"partner_current_age": UNK, "partner_retirement_age": EST(63)}
    supp("CS05", "Household present but partner age unknown: H false, neutral", t, "W10", "neutral_fallback")
    t = clip_input(False, False, False, False, False)
    t["chapters"]["timing"]["household"] = {"partner_current_age": EST(59), "partner_retirement_age": EST(61)}
    supp("CS06", "Same retirement year for both (t_R' = 2 = t_R): H false", t, "W10", "neutral_fallback")
    t = clip_input(False, False, False, False, True)
    t["chapters"]["income"]["sources"][0]["dependability"] = "uncertain"
    supp("CS07", "Uncertain income does not change selection by itself", t, "W07", "funding_gap")

    avail_all = {c: {"fr": "unavailable", "en": "unavailable"} for c in ref.BRANCH_CLIPS}
    media_cases = []

    def media(cid, title, selected, locale, overrides, build, want):
        av = copy.deepcopy(avail_all)
        for clip, loc, state in overrides:
            av[clip][loc] = state
        got = ref.media_render_state(selected, locale, av, build)
        check(got["render_state"] == want[0] and got["release_check"] == want[1] and got["substitute_clip"] is None,
              f"{cid} {title}: {want[0]} / release {want[1]}")
        media_cases.append({"case": cid, "title": title, "selected": selected, "locale": locale,
                            "availability": av, "build": build, "expected": got})

    media("MS01", "Nothing recorded yet (today's real state)", "W07", "fr", [], "production", ("unavailable", "pass"))
    media("MS02", "Recorded and approved in active locale", "W07", "en", [("W07", "en", "available")], "production", ("play", "pass"))
    media("MS03", "Recorded only in the other language", "W07", "fr", [("W07", "en", "available")], "production", ("other_locale_only", "pass"))
    media("MS04", "Labelled test media in a local test build", "W08", "en", [("W08", "en", "test_media")], "local_test", ("play_test_media_labelled", "pass"))
    media("MS05", "Test media referenced by a production build", "W08", "en", [("W08", "en", "test_media")], "production", ("unavailable", "fail_test_media_referenced"))
    media("MS06", "Another branch clip exists but the selected one does not: no substitution", "W06", "en", [("W10", "en", "available")], "production", ("unavailable", "pass"))
    return rows, supplementary, media_cases


# ---------------------------------------------------------------- output
def render_all():
    files = {}
    index = []
    log("== math fixtures")
    for fid, slug, title, covers, purpose, fn in FIXTURES:
        d, out, independent = fn()
        errs = ref.semantic_errors(d)
        check(not errs, f"{fid} input passes semantic rules")
        name = f"{fid}-{slug}.json"
        files[name] = {
            "fixture_id": fid, "title": title, "contract_version": "1.0", "covers": covers,
            "purpose": purpose, "input": d, "expected": out,
            "independent_checks": independent, "tolerance": TOL,
        }
        index.append({"fixture_id": fid, "file": name, "title": title, "covers": covers,
                      "selected_clip": out["clip"]["selected"],
                      "completeness_state": out["completeness"]["state"]})
    log("== clip-rule fixtures")
    rows, supplementary, media_cases = build_clip_rules()
    files["clip-rules.json"] = {
        "contract_version": "1.0",
        "precedence": [{"predicate": p, "clip": c, "selection_reason": r} for p, c, r in ref.CLIP_PRECEDENCE]
        + [{"predicate": "none", "clip": ref.CLIP_FALLBACK[0], "selection_reason": ref.CLIP_FALLBACK[1]}],
        "template": "clip_input(): A=60, R=62 (t_R=2), H=6, i=0, base_year 2026; M adds src-2 (unknown amount, starts at 65); X adds src-3 (gross, starts at 65); H adds partner 58->63; C sets spending unknown; F=1 uses src-1 3,000,000 vs spending 4,800,000, F=0 uses 5,000,000.",
        "truth_table": rows,
        "supplementary_cases": supplementary,
        "media_state_cases": media_cases,
        "disclosure": {
            "requirement": "Shown next to every branch clip (W06-W10) and its written summary, in every media state.",
            "en": "This explanation was selected automatically from your answers. Bill has not reviewed your submission.",
            "fr_draft": "Cette explication a été choisie automatiquement à partir de vos réponses. Bill n’a pas examiné vos réponses.",
            "status": "draft - wording owned by A5 (C02), approval G1/G3 (HB-26)",
        },
    }
    index.append({"fixture_id": "CLIP", "file": "clip-rules.json", "title": "Clip rule truth table, supplementary and media cases", "covers": ["WK06"]})
    files["index.json"] = {
        "contract_version": "1.0",
        "status": "proposed - subject to A6 math review and professional review (G3)",
        "generator": ".orchestration/evidence/F02/math/compute_fixtures.py (exact fractions.Fraction; reference model workshop_reference.py)",
        "tolerance_policy": TOL,
        "base_year": 2026,
        "fixtures": index,
    }
    return {k: json.dumps(v, indent=1, ensure_ascii=False) + "\n" for k, v in files.items()}


def main():
    texts = render_all()
    # bound check: largest possible rounded outputs stay below 2^53 - 1
    # t <= R - A + H - 1 <= 120 - 18 = 102 (XF-03); rates <= 10%; 8 sources <= 60,000,000 / year each.
    lim = 2**53 - 1
    worst_D = ref.round_half_even(Fr(120_000_000) * ref.growth(1000, 102))
    # a today-dollar source with q = i = 10%: b_j (1+q)^(t-s_j) = a (1.1)^t
    worst_P = ref.round_half_even(Fr(60_000_000) * ref.growth(1000, 102))
    worst_I = ref.round_half_even(8 * Fr(60_000_000) * ref.growth(1000, 102))
    # C_R at r = 0 is the plain sum of H gaps; the largest window is t = 43..102 (A = 18, R = 61, H = 60)
    worst_C = ref.round_half_even(sum((Fr(120_000_000) * ref.growth(1000, t) for t in range(43, 103)), Fr(0)))
    for name, v in (("D_t (spending)", worst_D), ("P_j,t (one source)", worst_P),
                    ("income group total (8 sources)", worst_I), ("C_R at r = 0", worst_C)):
        log(f"== bound: max {name} = {v:,} cents (< 2^53-1 = {lim:,}: {v < lim})")
        assert v < lim
    if "--check" in sys.argv:
        bad = [k for k, v in texts.items() if not (FIX / k).exists() or (FIX / k).read_text() != v]
        extra = sorted(p.name for p in FIX.glob("*.json") if p.name not in texts)
        log(f"== check: {len(texts)} fixture files regenerated; differing: {bad or 'none'}; unexpected files: {extra or 'none'}")
        sys.exit(1 if bad or extra else 0)
    FIX.mkdir(parents=True, exist_ok=True)
    for k, v in texts.items():
        (FIX / k).write_text(v)
    log(f"== wrote {len(texts)} files to {FIX}")


if __name__ == "__main__":
    main()
