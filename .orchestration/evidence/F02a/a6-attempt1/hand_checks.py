"""Third path: decimal.Decimal closed forms (60 digits) for the F02a fixtures, plus contract-vs-fault tables."""
import json, os, sys
from decimal import Decimal as D, getcontext, ROUND_HALF_EVEN
import intmodel as M
getcontext().prec = 60
FIX = sys.argv[1]
def cents(x): return int(x.quantize(D(1), rounding=ROUND_HALF_EVEN))
def load(n):
    f = [x for x in os.listdir(FIX) if x.startswith(n)][0]
    return json.load(open(os.path.join(FIX, f)))
ok = True
def chk(label, got, exp):
    global ok
    r = "OK" if got == exp else "FAIL"
    if got != exp: ok = False
    print(f"  [{r}] {label}: hand={got} fixture={exp}")

print("WM37 (i=2%, A=55, R=65, H=5; spending 6,000,000 today$)")
d = load("WM37"); ys = {y["t"]: y for y in d["expected"]["years"]}
i = D("1.02")
for t in range(10, 15):
    Dt = D(6000000) * i**t
    p1 = D(2400000) * i**10                                   # q=0, s=10
    p2 = D(600000) * i**12 * D("1.03")**(t-12) if t >= 12 else D(0)   # q=3%, s=12
    p3 = D(1200000) * i**5 * D("1.01")**(t-5)                 # q=1%, s=5
    tot = p1 + p2 + p3; G = max(D(0), Dt - tot)
    y = ys[t]
    chk(f"t={t} D", cents(Dt), y["spending_cents"])
    chk(f"t={t} P1,P2,P3", (cents(p1), cents(p2), cents(p3)), tuple(y["income_by_source_cents"][k] for k in ("src-1","src-2","src-3")))
    chk(f"t={t} net group", cents(tot), y["income_net_cents"])
    chk(f"t={t} gap", cents(G), y["gap_cents"])
    chk(f"t={t} gap today$", cents(G / i**t), y["gap_today_dollars_cents"])
print("  P1 exact:", D(2400000) * i**10)

print("WM38 (joint, participant 60, partner 55, i=0)")
d = load("WM38"); ys = {y["t"]: y for y in d["expected"]["years"]}
s1, e2 = 65 - 60, 64 - 60
for t in range(2, 8):
    p1 = 1200000 if t >= s1 else 0
    p2 = 600000 if t < e2 else 0
    chk(f"t={t} gap", 4800000 - p1 - p2, ys[t]["gap_cents"])

print("WM39 (two sources 1,000,050 at 1%, t=1)")
d = load("WM39"); y = d["expected"]["years"][1]
p = D(1000050) * D("1.01")
chk("row", cents(p), y["income_by_source_cents"]["src-1"])
chk("group once-rounded", cents(2*p), y["income_net_cents"])
print(f"  faulty group from rows = {2*cents(p)} (fixture {y['income_net_cents']})")
chk("gap", cents(D(3000000)*D("1.01") - 2*p), y["gap_cents"])

print("WM40 (i=1.5%, t=2)")
d = load("WM40"); y = d["expected"]["years"][2]
G = D(2000001) * D("1.015")**2 - D(1000077)
chk("gap exact", str(G.normalize()), y["exact"]["gap"])
chk("today$ from exact gap", cents(G / D("1.015")**2), y["gap_today_dollars_cents"])
print(f"  faulty today$ from rounded gap = {cents(D(cents(G)) / D('1.015')**2)}  ({D(cents(G)) / D('1.015')**2})")

print()
print("Contract vs faulty runtime tables (intmodel):")
for fid, fault in (("WM37", "today_dollars_uses_q"), ("WM38", "joint_uses_partner")):
    d = load(fid)
    good = M.compute(d["input"]); bad = M.compute(d["input"], frozenset([fault]))
    print(f"  {fid} vs {fault}: flags contract={good['flags']} fault={bad['flags']}")
    for g, b in zip(good["years"], bad["years"]):
        print(f"    t={g['t']}: income_by_source contract={g['income_by_source_cents']} fault={b['income_by_source_cents']}; "
              f"gap contract={g['gap_cents']} fault={b['gap_cents']} (diff {b['gap_cents']-g['gap_cents']:+d})")
print("ALL HAND CHECKS OK" if ok else "HAND CHECK FAILURES")
sys.exit(0 if ok else 1)
