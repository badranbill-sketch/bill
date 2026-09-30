"""A6 independent route check: parse routes.md §3.1 proposed rows and every branch's lib/routes.ts."""
import re, subprocess, pathlib
R = pathlib.Path('/home/user/bill/.orchestration/contracts/routes.md').read_text()
branches = ['origin/main','origin/codex/desktop-iphone-unified','origin/claude/bill-centered-homepage','origin/guide/pre-retirement-guide','origin/claude/bill-presentation-video','origin/add-ask-bill-section']
existing = {}
for b in branches:
    src = subprocess.run(['git','-C','/home/user/bill','show',f'{b}:lib/routes.ts'],capture_output=True,text=True).stdout
    for k, fr, en in re.findall(r'(\w+): \{ fr: "([^"]*)", en: "([^"]*)" \}', src):
        existing.setdefault(k, (fr, en))
print('existing keys (union of 6 branches):', len(existing), sorted(existing))
sec = R.split('### 3.1', 1)[1].split('### 3.2', 1)[0]
proposed = {}
for row in sec.splitlines():
    cells = [c.strip() for c in row.strip('|').split('|')]
    if len(cells) > 5 and cells[4].startswith('proposed'):
        key = cells[1].strip('`'); fr = cells[2].strip('`'); en = cells[3].strip('`')
        proposed[key] = (fr, en)
print('proposed keys:', len(proposed), sorted(proposed))
probs = []
for k, (fr, en) in proposed.items():
    if k in existing: probs.append(f'key {k} already exists')
    for lang, s, i in (('fr', fr, 0), ('en', en, 1)):
        if not re.fullmatch(r'[a-z0-9-]+(?:/[a-z0-9-]+)*', s): probs.append(f'{k}.{lang} not lowercase ASCII: {s}')
        for ek, ev in existing.items():
            if ev[i] == s: probs.append(f'{k}.{lang} slug {s} equals existing {ek}')
        res = existing['resources'][i]
        if s.startswith(res + '/') or s.split('/')[0] in ('revision','api','assets','_next','operations'): probs.append(f'{k}.{lang} shadows reserved prefix: {s}')
        for k2, v2 in proposed.items():
            if k2 != k and v2[i] == s: probs.append(f'{k}.{lang} duplicates {k2}')
    # a 2-segment slug whose first segment is not a key's full slug is fine only because keyFor runs first
print('problems:', probs or 'none')
