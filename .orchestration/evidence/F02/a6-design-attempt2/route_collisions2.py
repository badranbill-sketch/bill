#!/usr/bin/env python3
"""A6 attempt-2: independent route-collision check. Parses routes.md §3.1 proposed rows and
lib/routes.ts on main, codex and homepage (git show), then checks RT-SLUG-1/2 and CX-12 key sets."""
import re, subprocess, json, pathlib
R = '/home/user/bill'
def show(ref, path):
    return subprocess.run(['git','-C',R,'show',f'{ref}:{path}'],capture_output=True,text=True,check=True).stdout
def parse_routes(ts):
    return {m.group(1): (m.group(2), m.group(3)) for m in re.finditer(r'^\s*(\w+):\s*\{\s*fr:\s*"([^"]*)",\s*en:\s*"([^"]*)"\s*\}', ts, re.M)}
existing = {}
for ref in ['origin/main','origin/codex/desktop-iphone-unified','origin/claude/bill-centered-homepage','origin/guide/pre-retirement-guide','origin/claude/bill-presentation-video','origin/add-ask-bill-section']:
    r = parse_routes(show(ref,'lib/routes.ts'))
    print(ref, len(r), sorted(r))
    existing.update(r)
md = pathlib.Path(R,'.orchestration/contracts/routes.md').read_text()
sec = md.split('### 3.1')[1].split('### 3.2')[0]
proposed = {}
for line in sec.splitlines():
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    if len(cells) >= 5 and cells[4].startswith('proposed'):
        key = cells[1].strip('`'); fr = cells[2].strip('`'); en = cells[3].strip('`')
        proposed[key] = (fr, en)
print('\nproposed keys', len(proposed), json.dumps(proposed, ensure_ascii=False))
problems = []
for k,(fr,en) in proposed.items():
    if k in existing: problems.append(f'key collision {k}')
    for lang, s in (('fr',fr),('en',en)):
        if not re.fullmatch(r'[a-z0-9-]+(?:/[a-z0-9-]+)*', s): problems.append(f'{k} {lang} slug not ASCII kebab: {s}')
        for ek,(efr,een) in existing.items():
            es = efr if lang=='fr' else een
            if s == es: problems.append(f'{k} {lang} slug {s} equals existing {ek}')
        res = existing['resources'][0 if lang=='fr' else 1]
        if s.startswith(res + '/'): problems.append(f'{k} shadows article path under {res}/')
        if s.split('/')[0] in ('revision','api','assets','_next','operations'): problems.append(f'{k} reserved first segment')
    for k2,(fr2,en2) in proposed.items():
        if k2 < k and (fr2 == fr or en2 == en): problems.append(f'proposed duplicate {k} {k2}')
# asset manifest intended_route_key enum
am = json.load(open(pathlib.Path(R,'.orchestration/contracts/asset-manifest.schema.json')))
def find_enum(o):
    if isinstance(o, dict):
        for kk, vv in o.items():
            if kk == 'intended_route_key': return vv
            r = find_enum(vv)
            if r is not None: return r
    elif isinstance(o, list):
        for vv in o:
            r = find_enum(vv)
            if r is not None: return r
irk = find_enum(am)
print('\nasset-manifest intended_route_key:', json.dumps(irk)[:600])
enum = set()
def collect(o):
    if isinstance(o, dict):
        if 'enum' in o: enum.update(o['enum'])
        for vv in o.values(): collect(vv)
    elif isinstance(o, list):
        for vv in o: collect(vv)
collect(irk)
union = set(existing) | set(proposed)
print('route union minus manifest enum:', sorted(union - enum), '| manifest enum minus union:', sorted(enum - union))
print('\nproblems:', problems or 'none')
