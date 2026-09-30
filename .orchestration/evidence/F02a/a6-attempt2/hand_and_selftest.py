#!/usr/bin/env python3
"""(1) Non-vacuity: perturb each new fixture's expected record in memory and confirm the model diff sees it.
(2) Hand checks of WM37-WM40 key values with plain Python integers (closed forms written out by hand,
    independent of decmodel.py): value = num / 10^k, rounded half-even with divmod."""
import copy
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import decmodel as M  # noqa: E402
def diff(a, b, path="$"):
    out = []
    if type(a) is not type(b) and not (isinstance(a, (int, float)) and isinstance(b, (int, float)) and
                                        not isinstance(a, bool) and not isinstance(b, bool)):
        return [f"{path}: type {type(a).__name__} != {type(b).__name__} ({a!r} vs {b!r})"]
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                out.append(f"{path}.{k}: missing in model")
            elif k not in b:
                out.append(f"{path}.{k}: extra in model ({a[k]!r})")
            else:
                out += diff(a[k], b[k], f"{path}.{k}")
    elif isinstance(a, list):
        if len(a) != len(b):
            out.append(f"{path}: len {len(a)} != {len(b)}")
        for n, (x, y) in enumerate(zip(a, b)):
            out += diff(x, y, f"{path}[{n}]")
    else:
        if a != b:
            out.append(f"{path}: model {a!r} != fixture {b!r}")
    return out



fx = os.path.join(sys.argv[1], "fixtures", "workshop")


def load(fid):
    return json.load(open(glob.glob(os.path.join(fx, fid + "-*.json"))[0]))


ok = True
print("\n=== non-vacuity (perturb expected by 1 cent / flip a flag) ===")
for fid in ("WM37", "WM38", "WM39", "WM40"):
    d = load(fid)
    out = M.compute(d["input"], set())
    for label, mut in (
        ("gap+1", lambda e: e["years"][-1].__setitem__("gap_cents", e["years"][-1]["gap_cents"] + 1)),
        ("src+1", lambda e: e["years"][-1]["income_by_source_cents"].__setitem__(
            "src-1", e["years"][-1]["income_by_source_cents"]["src-1"] + 1)),
        ("todaygap+1", lambda e: e["years"][-1].__setitem__(
            "gap_today_dollars_cents", e["years"][-1]["gap_today_dollars_cents"] + 1)),
        ("flag", lambda e: e["flags"].append("horizon_shorter_than_timeline")),
    ):
        e = copy.deepcopy(d["expected"])
        mut(e)
        seen = bool(diff(out, e))
        ok &= seen
        print(f"{fid} {label}: {'detected' if seen else 'NOT DETECTED'}")


def rhe(num, den):
    q, r = divmod(num, den)
    if 2 * r > den or (2 * r == den and q % 2 == 1):
        q += 1
    return q


def chk(label, got, want):
    global ok
    good = got == want
    ok &= good
    print(f"{'OK ' if good else 'BAD'} {label}: {got} (fixture {want})")


print("\n=== WM37 hand closed forms (A=55, R=65 -> t_R=10, i=2%) ===")
w = load("WM37")["expected"]["years"]
by_t = {y["t"]: y for y in w}
# P1 = 2,400,000 * 1.02^10 (q=0 after start at t=10)
P1_num, P1_den = 2400000 * 102 ** 10, 100 ** 10
for t in range(10, 15):
    chk(f"P1,t={t}", rhe(P1_num, P1_den), by_t[t]["income_by_source_cents"]["src-1"])
# P3 = 1,200,000 * 1.02^5 * 1.01^(t-5)
for t in range(10, 15):
    chk(f"P3,t={t}", rhe(1200000 * 102 ** 5 * 101 ** (t - 5), 100 ** 5 * 100 ** (t - 5)),
        by_t[t]["income_by_source_cents"]["src-3"])
# P2 = 600,000 * 1.02^12 * 1.03^(t-12) for t >= 12
for t in range(12, 15):
    chk(f"P2,t={t}", rhe(600000 * 102 ** 12 * 103 ** (t - 12), 100 ** 12 * 100 ** (t - 12)),
        by_t[t]["income_by_source_cents"]["src-2"])
# gap: D - sum P, common denominator 100^t
for t in range(10, 15):
    den = 100 ** t
    D = 6000000 * 102 ** t
    P1 = 2400000 * 102 ** 10 * 100 ** (t - 10)
    P3 = 1200000 * 102 ** 5 * 101 ** (t - 5)
    P2 = 600000 * 102 ** 12 * 103 ** (t - 12) if t >= 12 else 0
    G = D - P1 - P2 - P3
    chk(f"G,t={t}", rhe(G, den), by_t[t]["gap_cents"])
    chk(f"G_today,t={t}", rhe(G, 102 ** t), by_t[t]["gap_today_dollars_cents"])
    chk(f"net group,t={t}", rhe(P1 + P2 + P3, den), by_t[t]["income_net_cents"])
# faulty (1+q)^s reading: P1 = 2,400,000 flat, P3 = 1,200,000*1.01^(t), P2 = 600,000*1.03^(t)
print("faulty (1+q_j)^{s_j} reading, gap overstatement per year (cents):")
for t in range(10, 15):
    den = 100 ** t
    D = 6000000 * 102 ** t
    P1f = 2400000 * den
    P3f = 1200000 * 101 ** t
    P2f = 600000 * 103 ** t if t >= 12 else 0
    Gf = rhe(D - P1f - P2f - P3f, den)
    print(f"  t={t}: fault gap {Gf}, contract {by_t[t]['gap_cents']}, +{Gf - by_t[t]['gap_cents']}")

print("\n=== WM38 hand (A=60, partner 55, joint uses self) ===")
w = {y["t"]: y for y in load("WM38")["expected"]["years"]}
s, e = 65 - 60, 64 - 60
for t in range(2, 8):
    P1 = 1200000 if t >= s else 0
    P2 = 600000 if t < e else 0
    chk(f"G,t={t}", 4800000 - P1 - P2, w[t]["gap_cents"])
    chk(f"partner_age,t={t}", 55 + t, w[t]["partner_age"])
sp, ep = 65 - 55, 64 - 55
print(f"partner reading: s={sp}, e={ep}; window 2..7 => gaps "
      f"{[4800000 - (1200000 if t >= sp else 0) - (600000 if t < ep else 0) for t in range(2, 8)]}; "
      f"s={sp} >= t_R+H={2+6} -> horizon_shorter_than_timeline raised")

print("\n=== WM39 hand (1,000,050 x 1.01 at t=1) ===")
w = {y["t"]: y for y in load("WM39")["expected"]["years"]}
chk("row t=1", rhe(1000050 * 101, 100), w[1]["income_by_source_cents"]["src-1"])
chk("group t=1", rhe(2 * 1000050 * 101, 100), w[1]["income_net_cents"])
chk("gap t=1", rhe(3000000 * 101 - 2 * 1000050 * 101, 100), w[1]["gap_cents"])
chk("row t=2", rhe(1000050 * 101 ** 2, 100 ** 2), w[2]["income_by_source_cents"]["src-1"])
chk("group t=2", rhe(2 * 1000050 * 101 ** 2, 100 ** 2), w[2]["income_net_cents"])
print(f"  rounded-rows reading t=1: group {2*rhe(1000050*101,100)} (fixture {w[1]['income_net_cents']})")

print("\n=== WM40 hand (2,000,001 x 1.015^t - 1,000,077; i=1.5%) ===")
w = {y["t"]: y for y in load("WM40")["expected"]["years"]}
for t in range(0, 3):
    G = 2000001 * 1015 ** t - 1000077 * 1000 ** t   # / 1000^t
    chk(f"G,t={t}", rhe(G, 1000 ** t), w[t]["gap_cents"])
    chk(f"G_today,t={t}", rhe(G, 1015 ** t), w[t]["gap_today_dollars_cents"])
G2 = 2000001 * 1015 ** 2 - 1000077 * 1000 ** 2
print(f"  deflating the rounded gap at t=2: {rhe(rhe(G2, 1000**2) * 1000**2, 1015**2)} "
      f"(fixture {w[2]['gap_today_dollars_cents']})")

print("\nHAND/SELFTEST:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
