#!/usr/bin/env python3
"""A6 attempt-2 checks of the A0 blockers.md patch (read-only)."""
import difflib
import json
import re
import sys

PRE = sys.argv[1]
CUR = "/home/user/bill/.orchestration/blockers.md"
DEC = "/home/user/bill/.orchestration/decisions.md"
COSTS = "/home/user/bill/.orchestration/costs.json"
INV = "/home/user/bill/.orchestration/inventory.md"
pre = open(PRE).read().splitlines()
cur = open(CUR).read().splitlines()
added = [l[1:] for l in difflib.unified_diff(pre, cur, lineterm="", n=0) if l.startswith("+") and not l.startswith("+++")]
removed = [l[1:] for l in difflib.unified_diff(pre, cur, lineterm="", n=0) if l.startswith("-") and not l.startswith("---")]
print(f"added lines: {len(added)}; removed lines: {len(removed)}")


def gate_check(lines, label):
    titles = {}
    for l in lines:
        m = re.match(r"\*\*(HB-\d\d)\. (.*?)\*\* \((.*)\)", l)
        if m:
            titles[m.group(1)] = set(re.findall(r"\bG[0-6]\b", m.group(3)))
    table = {}
    for l in lines:
        m = re.match(r"\| (G[0-6]) \| [^|]* \| ([^|]*) \|", l)
        if m:
            table[m.group(1)] = set(re.findall(r"HB-\d\d", m.group(2)))
    mism = []
    for hb, gates in sorted(titles.items()):
        for g in gates:
            if hb not in table.get(g, set()):
                mism.append(f"{hb} title names {g} but the {g} row does not list it")
    for g, hbs in sorted(table.items()):
        for hb in hbs:
            if hb in titles and g not in titles[hb]:
                pass  # rows may list an HB for a secondary gate; informative only
    print(f"[{label}] HB titles parsed: {len(titles)}; gate rows: {sorted(table)}; title->row mismatches: {len(mism)}")
    for m in mism:
        print("   ", m)
    return mism


gate_check(pre, "pre-patch")
gate_check(cur, "current")

# secrets: does any added line ask for a value?
ask_value = re.compile(r"(send|paste|share|provide|give|reply with|tell us)\b[^.]*\b(password|token|key|secret|passphrase|credential)", re.I)
print("\nadded lines that ask for a secret value:", [l for l in added if ask_value.search(l)] or "none")
print("'Secrets: never in chat' heading present:", any(l.strip() == "## Secrets: never in chat" for l in cur))
hb07 = [l for l in cur if l.startswith("**HB-07")]
i7 = cur.index(hb07[0]) if hb07 else None
print("HB-07 block:", *(cur[i7:i7 + 7] if i7 is not None else ["MISSING"]), sep="\n   ")

# prices/caps: numbers and currencies in added lines
money = re.compile(r"(\$\s?\d|\d[\d,.]*\s?(CAD|USD|\$)|CAD\s?\d|USD\s?\d|\bcap(s)?\b[^.]*\b[1-9]\d*)", re.I)
print("\nadded lines with a money amount or a non-zero cap:")
for l in added:
    for m in money.finditer(l):
        print(f"   '{m.group(0)}' in: {l[:160]}")
print("removed lines with a money amount:", [m.group(0) for l in removed for m in money.finditer(l)])
costs = json.load(open(COSTS))
print("costs.json authorized_caps:", json.dumps(costs.get("authorized_caps")))

# decisions consistency
dec = open(DEC).read()
d073 = re.search(r"^\| D-073 \|.*$", dec, re.M).group(0)
d064 = re.search(r"^\| D-064 \|.*$", dec, re.M).group(0)
d022 = re.search(r"^\| D-022 \|.*$", dec, re.M).group(0)
d070 = re.search(r"^\| D-070 \|.*$", dec, re.M).group(0)
print("\nD-073 says presentation stays preserved, unmerged:", "presentation" in d073 and "unmerged" in d073)
hb03 = [l for l in cur if l.startswith("- PROPOSAL: A as the technical integration baseline")][0]
print("HB-03 proposal now:", hb03[:260])
print("HB-03 still mentions 'presentation ignore-list union':", "ignore-list union" in hb03)
hb12 = [l for l in cur if l.startswith("**HB-12")]
j = cur.index(hb12[0])
print("HB-12 block:", *cur[j:j + 4], sep="\n   ")
print("D-064 (caps):", d064[:300])
print("D-022 (Workspace):", d022[:300])
for item in ("backup", "encryption", "media-master", "media master"):
    print(f"D-070 mentions '{item}':", item in d070.lower())
print("D-070 'Status' column:", d070.split("|")[3].strip())
hb07_prop = [l for l in cur[i7:i7 + 7] if "PROPOSAL" in l]
print("HB-07 PROPOSAL:", hb07_prop)
outside = [l for l in cur if "Outside the 06 map" in l or "proposed in D-070" in l]
print("Outside-the-06-map note:", outside)

# costs.json pointers
print("\ncosts.json notes citing HB items for existing costs:")


def walk(o, path=""):
    if isinstance(o, dict):
        for k, v in o.items():
            yield from walk(v, f"{path}.{k}")
    elif isinstance(o, list):
        for n, v in enumerate(o):
            yield from walk(v, f"{path}[{n}]")
    else:
        yield path, o


hits = [(p, v) for p, v in walk(costs) if isinstance(v, str) and re.search(r"HB-0?[2-8]\b|HB-1[45]\b", v)
        and re.search(r"price|plan|cost|renewal|unknown", v, re.I)]
for p, v in hits:
    print(f"   {p}: {v[:200]}")
unk = [p for p, v in walk(costs) if v == "existing_cost_unknown"]
print(f"items with status existing_cost_unknown: {len(unk)}")
cites_08b = [p for p, v in walk(costs) if isinstance(v, str) and "HB-08" in v]
print(f"costs.json strings citing HB-08: {len(cites_08b)} {cites_08b[:5]}")
hb08 = [l for l in cur if l.startswith("**HB-08")]
k = cur.index(hb08[0])
print("HB-08 block:", *cur[k:k + 9], sep="\n   ")

# header status vs acceptance
print("\nblockers.md line 3:", cur[2][:200])
print("decisions.md line 3:", open(DEC).read().splitlines()[2][:200])

# HB-22 vs inventory
inv = open(INV).read().splitlines()
print("\ninventory lines mentioning retirement-guide-cover or AI-assisted editorial artwork:")
for n, l in enumerate(inv, 1):
    if "retirement-guide-cover" in l or "AI-assisted editorial" in l:
        print(f"   inventory.md:{n}: {l[:260]}")
