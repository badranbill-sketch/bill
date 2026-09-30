#!/usr/bin/env python3
"""A6 F02a attempt 3, part B: checks on the A0 post-acceptance blockers.md patch.
Usage: blockers_checks.py <pre-patch copy> <repo root>. Read-only."""
import json, re, sys, pathlib, difflib

pre = pathlib.Path(sys.argv[1]).read_text().splitlines()
root = pathlib.Path(sys.argv[2])
o = root / '.orchestration'
cur = (o / 'blockers.md').read_text().splitlines()
dec = (o / 'decisions.md').read_text()
costs = json.loads((o / 'costs.json').read_text())
diff = list(difflib.unified_diff(pre, cur, lineterm='', n=0))
added = [l[1:] for l in diff if l.startswith('+') and not l.startswith('+++')]
removed = [l[1:] for l in diff if l.startswith('-') and not l.startswith('---')]
print(f"diff: {len(added)} added, {len(removed)} removed lines")

# 1. HB numbering unchanged
hb = lambda lines: [re.match(r'\*\*(HB-\d+)\.', l).group(1) for l in lines if re.match(r'\*\*HB-\d+\.', l)]
print(f"HB ids unchanged: {hb(pre) == hb(cur)} ({len(hb(cur))} items)")

# 2. secret requests: any added line asking for a value
ask = re.compile(r'\b(send|paste|share|provide|give|reply with|tell us|enter)\b.*\b(password|passphrase|token|secret|key|credential)', re.I)
hits = [l for l in added if ask.search(l)]
print(f"added lines that ask for a secret value (regex): {len(hits)}")
for l in hits:
    print('   ', l[:200])
print(f"'## Secrets: never in chat' heading present: {'## Secrets: never in chat' in cur}")
hb07 = [l for l in cur if l.startswith('- Provide: reply with the tool') ]
print(f"HB-07 Provide line: {hb07[0] if hb07 else 'MISSING'}")

# 3. prices / caps
money = re.compile(r'(\$\s?\d|\d\s?\$|\bCAD\b|\bUSD\b|\bEUR\b|\d+\s?(/|per)\s?(day|month|mo|year|yr|seat)\b)', re.I)
for tag, lines in (('added', added), ('removed', removed)):
    m = [l for l in lines if money.search(l)]
    print(f"{tag} lines with an amount/currency: {len(m)}")
    for l in m:
        print('   ', l[:220])
print(f"costs.json authorized_caps: {json.dumps(costs['authorized_caps'])}; all zero: {all(costs['authorized_caps'][k] == 0 for k in ('purchased_api','ads','subscriptions'))}")
print(f"'nothing is bought under a 0 cap' in HB-08: {any('nothing is bought under a 0 cap' in l for l in cur)}; price source is Bill's own checkout: {any('price shown at Bill' in l for l in cur)}")

# 4. D-073 consistency: presentation outside the baseline
hb03 = next(l for l in cur if l.startswith('- PROPOSAL: A as the technical integration baseline'))
print(f"HB-03 proposal keeps presentation/ outside the baseline: {'presentation/ stays preserved on its own branch, outside the baseline' in hb03}")
print(f"'ignore-list union' still anywhere in blockers.md: {any('ignore-list union' in l for l in cur)}")
d073 = next(l for l in dec.splitlines() if l.startswith('| D-073'))
print(f"D-073 says presentation stays preserved, unmerged: {'presentation' in d073 and 'unmerged' in d073}")
hb12 = cur[cur.index(next(l for l in cur if l.startswith('**HB-12.'))):][:6]
print(f"HB-12 proposal: {[l for l in hb12 if l.startswith('- PROPOSAL')][0][:160]}")

# 5. D-070 vs the three new secret rows
d070 = next(l for l in dec.splitlines() if l.startswith('| D-070'))
print(f"D-070 mentions 'backup' credential/key: {bool(re.search(r'backup (write|destination|encryption)|encryption key or passphrase', d070, re.I))}; mentions media-master: {'media' in d070.lower()}")
note = next(l for l in cur if l.startswith('**Outside the 06 map.**'))
print(f"'Outside the 06 map' note says rows are 'proposed in D-070': {'proposed in D-070' in note}")
print(f"HB-07 PROPOSAL: {[l for l in cur if l.startswith('- PROPOSAL: one named operator')][0]}")
newrows = [l for l in added if l.startswith('| Off-host backup') or l.startswith('| Backup encryption') or l.startswith('| Media-master')]
print(f"new secret rows added: {len(newrows)}")
for l in newrows:
    print('   ', l)

# 6. gate mapping: HB title gates vs G rows (before and after)
def mapping(lines):
    titles = {}
    for l in lines:
        m = re.match(r'\*\*(HB-\d+)\..*\*\* \((.*)\)', l)
        if m:
            titles[m.group(1)] = set(re.findall(r'G\d', m.group(2)))
    rows = {}
    for l in lines:
        m = re.match(r'\| (G\d) \| [^|]*\| ([^|]*)\|', l)
        if m:
            rows[m.group(1)] = set(re.findall(r'HB-\d+', m.group(2)))
    mism = []
    for h, gs in titles.items():
        for g in gs:
            if g in rows and h not in rows[g]:
                mism.append(f"{h}->{g}")
    return mism
print(f"HB title gate vs gate-row mismatches: before={mapping(pre)} after={mapping(cur)}")
g2 = next(l for l in cur if l.startswith('| G2 |'))
print(f"G2 'not askable yet' cell: {g2.split('|')[4].strip()[:200]}")

# 7. residuals: headers and costs pointers
print(f"blockers.md line 3: {cur[2][:140]}")
print(f"decisions.md line 3: {dec.splitlines()[2][:140]}")
tasks = json.loads((o / 'tasks.json').read_text())['tasks']
f01 = next(t for t in tasks if t['id'] == 'F01')
print(f"tasks.json F01 state: {f01['state']}")
vps = next(i for i in costs['items'] if i['id'] == 'vps_increment')
print(f"costs.json vps_increment.note: {vps['note']}")
unk = [i['id'] for i in costs['items'] if i.get('status') == 'existing_cost_unknown']
print(f"existing_cost_unknown items: {len(unk)}; citing HB-08: {[i for i in unk if 'HB-08' in json.dumps(next(x for x in costs['items'] if x['id']==i))]}")
hb08 = cur[cur.index(next(l for l in cur if l.startswith('**HB-08.'))):][:9]
print(f"HB-08 Provide line: {[l for l in hb08 if l.startswith('- Provide')][0]}")
