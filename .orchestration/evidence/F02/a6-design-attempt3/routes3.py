"""A6 design attempt 3: proposed route keys/slugs in routes.md s3.1 vs lib/routes.ts on all six
branches; RT-SLUG-1/2; asset-manifest intended_route_key enum; offer-matrix route lists. Read-only."""
import re, json, subprocess, pathlib
R = pathlib.Path('/home/user/bill'); C = R/'.orchestration/contracts'
BR = ['origin/main','origin/codex/desktop-iphone-unified','origin/claude/bill-centered-homepage',
      'origin/guide/pre-retirement-guide','origin/claude/bill-presentation-video','origin/add-ask-bill-section']
existing = {}
for b in BR:
    src = subprocess.run(['git','-C',str(R),'show',f'{b}:lib/routes.ts'],capture_output=True,text=True).stdout
    for k, fr, en in re.findall(r'^\s*(\w+): \{ fr: "([^"]*)", en: "([^"]*)" \}', src, re.M):
        existing.setdefault(k, (fr, en))
    n = len(re.findall(r'^\s*(\w+): \{ fr:', src, re.M))
    print(f"{b}: keys={n}")
print("existing keys (union):", sorted(existing))
md = (C/'routes.md').read_text()
sec = md.split('### 3.1')[1].split('### 3.2')[0]
proposed = {}
for row in sec.split('\n'):
    cells = [c.strip() for c in row.split('|')]
    if len(cells) > 6 and cells[2].startswith('`') and 'proposed' in cells[5]:
        proposed[cells[2].strip('`')] = (cells[3].strip('`'), cells[4].strip('`'))
print("proposed keys:", len(proposed), sorted(proposed))
problems = []
for lang_i, lang in enumerate(('fr','en')):
    ex = {v[lang_i]: k for k, v in existing.items()}
    seen = {}
    for k, v in proposed.items():
        s = v[lang_i]
        if not re.fullmatch(r'[a-z0-9-]+(?:/[a-z0-9-]+)*', s): problems.append(f'{k} {lang} not ASCII slug: {s}')
        if s in ex: problems.append(f'{k} {lang} collides with existing {ex[s]}: {s}')
        if s in seen: problems.append(f'{k} {lang} duplicates {seen[s]}')
        seen[s] = k
        res = existing['resources'][lang_i]
        if s.startswith(res + '/'): problems.append(f'{k} {lang} shadows article paths under {res}/')
        if s.split('/')[0] in ('revision','api','assets','_next','operations'): problems.append(f'{k} {lang} reserved first segment')
    if any(k in existing for k in proposed): problems.append('a proposed key reuses an existing key')
print("slug problems:", problems or 'none')
am = json.loads((C/'asset-manifest.schema.json').read_text())
def find_enum(o):
    if isinstance(o, dict):
        if 'intended_route_key' in o.get('properties', {}):
            return o['properties']['intended_route_key']
        for v in o.values():
            r = find_enum(v)
            if r: return r
    elif isinstance(o, list):
        for v in o:
            r = find_enum(v)
            if r: return r
irk = find_enum(am)
enum = set(irk.get('enum') or [])
if not enum and 'anyOf' in irk:
    for a in irk['anyOf']: enum |= set(a.get('enum', []))
want = set(existing) | set(proposed)
enum.discard(None)
print("asset-manifest intended_route_key (null allowed, ignored) == existing+ask+proposed:", enum == want, sorted(enum ^ want))
om = json.loads((C/'examples/valid/offer-matrix/authoritative-2026-09-30.json').read_text())
r = om['rules']['no_mandatory_funnel_staircase']
must, exempt = r['must_link_to_meeting'], r['exempt_from_meeting_link']
print("must_link_to_meeting:", must); print("exempt:", exempt)
cover = set(must) | set(exempt)
print("route keys in neither list:", sorted(want - cover), "| non-route keys in lists:", sorted(cover - want), "| in both:", sorted(set(must) & set(exempt)))
