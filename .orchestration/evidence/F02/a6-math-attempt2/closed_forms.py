"""Closed-form and hand-arithmetic cross-checks of fixture values, using only Python ints
(numerator/denominator by hand), independent of model.py's Decimal path."""
import json
import math
import os
import sys

FIX = "/home/user/bill/.orchestration/contracts/fixtures/workshop"
ok_count = 0
bad = 0


def load(fid):
    for f in os.listdir(FIX):
        if f.startswith(fid + "-"):
            return json.load(open(os.path.join(FIX, f)))
    raise KeyError(fid)


def red(p, q):
    g = math.gcd(p, q)
    return p // g, q // g


def rhe(p, q):
    n, r = divmod(p, q)
    return n + (1 if (2 * r > q or (2 * r == q and n % 2)) else 0)


def ratio_of(s):
    if "/" in s:
        a, b = s.split("/")
        return red(int(a), int(b))
    if "." in s:
        a, b = s.split(".")
        return red(int(a + b), 10 ** len(b))
    return int(s), 1


def check(name, cond, detail=""):
    global ok_count, bad
    if cond:
        ok_count += 1
        print(f"  ok   {name} {detail}")
    else:
        bad += 1
        print(f"  FAIL {name} {detail}")


def eq(r1, r2):
    return r1[0] * r2[1] == r2[0] * r1[1]


print("== WM01 hand: D=4,800,000 P=3,000,000 G=1,800,000 each year")
e = load("WM01")["expected"]
check("WM01", all(y["spending_cents"] == 4800000 and y["income_net_cents"] == 3000000 and y["gap_cents"] == 1800000 for y in e["years"]))

print("== WM02 closed form D_t = a*1.02^t; sum over window = a*1.02^5*(1.02^10-1)/0.02; deflated gap = a")
d = load("WM02"); e = d["expected"]; a = 5_000_000
for y in e["years"]:
    t = y["t"]
    Dt = (a * 10200 ** t, 10000 ** t)
    check(f"WM02 D_{t}", eq(ratio_of(y["exact"]["spending"]), Dt) and y["gap_today_dollars_cents"] == a)
S = (0, 1)
for y in e["years"]:
    p, q = ratio_of(y["exact"]["gap"]); S = red(S[0] * q + p * S[1], S[1] * q)
# closed form: a*(1.02)^5 * ((1.02)^10 - 1) / 0.02
num = a * 10200 ** 5 * (10200 ** 10 - 10000 ** 10) * 10000
den = 10000 ** 5 * 10000 ** 10 * 200
check("WM02 geometric series sum", eq(S, (num, den)), f"sum={S[0]//S[1]}")

print("== WM03 s_j = 65-60 = 5; P=12*90,000=1,080,000 from t=5")
e = load("WM03")["expected"]
check("WM03", all((y["income_by_source_cents"]["src-1"] == (1080000 if y["t"] >= 5 else 0)) for y in e["years"]))

print("== WM04 today-dollar source: P_t = a(1.025)^5 (1.025)^(t-5) = a*1.025^t; start-year source: P_t = a")
e = load("WM04")["expected"]
for y in e["years"]:
    t = y["t"]
    p1 = y["income_by_source_cents"]["src-1"]; p2 = y["income_by_source_cents"]["src-2"]
    exp1 = rhe(1200000 * 10250 ** t, 10000 ** t) if t >= 5 else 0
    exp2 = 1200000 if t >= 5 else 0
    check(f"WM04 t={t}", p1 == exp1 and p2 == exp2, f"{p1} {p2}")

print("== WM05 12*412,345 = 4,948,140; 12*123,456 = 1,481,472 (= src-2 annual)")
e = load("WM05")["expected"]
check("WM05", all(y["spending_cents"] == 4948140 and y["income_by_source_cents"] == {"src-1": 1481472, "src-2": 1481472}
                  and y["gap_cents"] == 4948140 - 2 * 1481472 for y in e["years"]))

print("== WM12 gaps and surpluses with 1.03^t; C_R at r=0 is sum of gaps only (no netting)")
e = load("WM12")["expected"]
Ssum = (0, 1)
for y in e["years"]:
    t = y["t"]
    Dt = (4_000_000 * 10300 ** t, 10000 ** t)
    G = (max(0, Dt[0] - 4_400_000 * Dt[1]), Dt[1]); Sp = (max(0, 4_400_000 * Dt[1] - Dt[0]), Dt[1])
    check(f"WM12 t={t}", eq(ratio_of(y["exact"]["gap"]), G) and eq(ratio_of(y["exact"]["surplus"]), Sp),
          f"gap={y['gap_cents']} surplus={y['surplus_cents']}")
    Ssum = red(Ssum[0] * G[1] + G[0] * Ssum[1], Ssum[1] * G[1])
ref = e["capital_illustration"]["reference_if_enabled"]
check("WM12 C_R(r=0) = sum of gaps", eq(ratio_of(ref["C_R_exact"]), Ssum), f"{ref['C_R_exact']} cents={ref['C_R_cents']}")
net = (0, 1)
for y in e["years"]:
    p, q = ratio_of(y["exact"]["gap"]); p2, q2 = ratio_of(y["exact"]["surplus"])
    net = (net[0] * q * q2 + (p * q2 - p2 * q) * net[1], net[1] * q * q2)
print(f"       (a netting runtime would show {net[0] / net[1]:.4f})")

print("== WM13 retirement boundary: rows t=4..7 only; src-1 starts t=3 (age 61) and grows at 1% from t=3")
e = load("WM13")["expected"]
check("WM13 rows", [y["t"] for y in e["years"]] == [4, 5, 6, 7])
for y in e["years"]:
    t = y["t"]
    check(f"WM13 t={t}", y["income_by_source_cents"]["src-1"] == rhe(2_000_000 * 10100 ** (t - 3), 10000 ** (t - 3))
          and y["income_by_source_cents"]["src-2"] == 1_000_000)

print("== WM14 C_R at r=0 = 5 x 1,800,000")
ref = load("WM14")["expected"]["capital_illustration"]["reference_if_enabled"]
check("WM14", ref["C_R_cents"] == 9_000_000 and ref["C_R_exact"] == "9000000")

print("== WM15 growing annuity: C_R = a[1-((1+i)/(1+r))^H]/(r-i), a=5,000,000, i=2%, r=4%, H=20")
ref = load("WM15")["expected"]["capital_illustration"]["reference_if_enabled"]
a, H = 5_000_000, 20
# a * (1 - (10200/10400)^H) / ((400-200)/10000)
num = a * (10400 ** H - 10200 ** H) * 10000
den = 10400 ** H * 200
check("WM15 closed form", eq(ratio_of(ref["C_R_exact"]), (num, den)) and ref["C_R_cents"] == rhe(num, den), f"cents={rhe(num, den)}")

print("== WM16 level annuity g[1-(1+r)^-H]/r, g=1,800,000, r=5%, H=25")
ref = load("WM16")["expected"]["capital_illustration"]["reference_if_enabled"]
g, H = 1_800_000, 25
num = g * (10500 ** H - 10000 ** H) * 10000
den = 10500 ** H * 500
check("WM16 closed form", eq(ratio_of(ref["C_R_exact"]), (num, den)) and ref["C_R_cents"] == rhe(num, den), f"cents={rhe(num, den)}")

print("== WM11 C_R = sum_{k=0..2} 1,800,000/1.03^(k+1); display-ineligible (pension_double_count_risk)")
ref = load("WM11")["expected"]["capital_illustration"]["reference_if_enabled"]
num = sum(1_800_000 * 10000 ** (k + 1) * 10300 ** (2 - k) for k in range(3)); den = 10300 ** 3
check("WM11", eq(ratio_of(ref["C_R_exact"]), (num, den)) and ref["ineligible_reasons"] == ["pension_double_count_risk"]
      and ref["display_eligible_if_enabled"] is False)

print("== WM35 deferred: C_R valued at start of t_R=4: a(1.02)^4 [1-(1.02/1.04)^4]/(0.02); NOT discounted to t=0")
ref = load("WM35")["expected"]["capital_illustration"]["reference_if_enabled"]
a, H = 5_000_000, 4
num = a * 10200 ** 4 * (10400 ** H - 10200 ** H) * 10000
den = 10000 ** 4 * 10400 ** H * 200
check("WM35 closed form (start of t_R)", eq(ratio_of(ref["C_R_exact"]), (num, den)) and ref["C_R_cents"] == rhe(num, den),
      f"cents={rhe(num, den)}")
wrong = rhe(num * 10000 ** 4, den * 10400 ** 4)
check("WM35 differs from t=0 valuation", ref["C_R_cents"] != wrong, f"(t=0 valuation would be {wrong})")
check("WM35 valued_at", ref["valued_at"] == {"t": 4, "calendar_year": 2030, "point": "start_of_year"})

print("== WM36 all surplus: C_R = 0 computable, never display-eligible (no_positive_gap)")
ref = load("WM36")["expected"]["capital_illustration"]["reference_if_enabled"]
check("WM36", ref["C_R_cents"] == 0 and ref["C_R_exact"] == "0" and ref["ineligible_reasons"] == ["no_positive_gap"]
      and ref["display_eligible_if_enabled"] is False and ref["computable"] is True)

print("== WM17 half-even ties")
e = load("WM17")["expected"]
for y in e["years"]:
    for k, ek in (("spending_cents", "spending"),):
        p, q = ratio_of(y["exact"][ek])
        check(f"WM17 t={y['t']} {k}", y[k] == rhe(p, q), f"exact={y['exact'][ek]} -> {y[k]}")
    if y["exact"].get("surplus"):
        p, q = ratio_of(y["exact"]["surplus"])
        check(f"WM17 t={y['t']} surplus", y["surplus_cents"] == rhe(p, q), f"exact={y['exact']['surplus']} -> {y['surplus_cents']}")
y1 = e["years"][1]
print(f"       t=1: displayed income {y1['income_net_cents']} - displayed spending {y1['spending_cents']} = "
      f"{y1['income_net_cents'] - y1['spending_cents']} vs displayed surplus {y1['surplus_cents']} (contract says at most 1 cent apart)")
check("WM17 one-cent display gap", abs((y1['income_net_cents'] - y1['spending_cents']) - y1['surplus_cents']) <= 1)

print("== WM24 1,000,800 x 1.025^2 = 1,051,465.5 exactly -> 1,051,466")
e = load("WM24")["expected"]
check("WM24", e["years"][2]["exact"]["spending"] == "1051465.5" and e["years"][2]["spending_cents"] == 1051466)
print(f"       python float iterated: {1000800 * 1.025 * 1.025!r} -> round() {round(1000800 * 1.025 * 1.025)}")

print("== WM18 end exclusive at age 63 (t=3); src-2 starts t=5 >= t_R+H=5 -> horizon flag")
e = load("WM18")["expected"]
check("WM18", [y["income_by_source_cents"]["src-1"] for y in e["years"]] == [1200000, 1200000, 1200000, 0, 0]
      and all(y["income_by_source_cents"]["src-2"] == 0 for y in e["years"]) and "horizon_shorter_than_timeline" in e["flags"])

print("== WM21 partner-owned start: 63 - 57 = 6; H: 63-57=6 != 62-60=2")
e = load("WM21")["expected"]
check("WM21", [y["income_by_source_cents"]["src-2"] for y in e["years"]] == [0, 0, 0, 0, 2400000]
      and [y["partner_age"] for y in e["years"]] == [59, 60, 61, 62, 63])

print("== WM22 price basis unknown: src-1 (s=2) null from t=2; src-2 (already receiving) exact")
e = load("WM22")["expected"]
check("WM22", [y["income_by_source_cents"]["src-1"] for y in e["years"]] == [0, 0, None, None]
      and [y["status"] for y in e["years"]] == ["computed", "computed", "not_computable", "not_computable"])

print("== WM25 spending unknown: income row still exact 3,000,000 x 1.02^t")
e = load("WM25")["expected"]
check("WM25", [y["income_by_source_cents"]["src-1"] for y in e["years"]] == [3000000, 3060000, 3121200]
      and all(y["spending_cents"] is None and y["exact"]["spending"] is None and y["gap_cents"] is None for y in e["years"]))

print("== WM32/WM33 known end decides 'no' without the start")
e32 = load("WM32")["expected"]; e33 = load("WM33")["expected"]
check("WM32", all(y["income_by_source_cents"]["src-2"] == 0 and y["status"] == "computed" for y in e32["years"]))
check("WM33", [y["income_by_source_cents"]["src-2"] for y in e33["years"]] == [None, None, None, 0, 0, 0])

print(f"== summary: {ok_count} ok, {bad} failed")
sys.exit(1 if bad else 0)
