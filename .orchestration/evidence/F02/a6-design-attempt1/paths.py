import re, subprocess, pathlib, collections
C = pathlib.Path('/home/user/bill/.orchestration/contracts')
branches = ['origin/main', 'origin/codex/desktop-iphone-unified', 'origin/claude/bill-centered-homepage']
trees = {b: set(subprocess.run(['git','-C','/home/user/bill','ls-tree','-r','--name-only',b],capture_output=True,text=True).stdout.split()) for b in branches}
dirs = {b: {str(pathlib.PurePosixPath(p).parent) for p in t} | {'/'.join(p.split('/')[:i]) for p in t for i in range(1,len(p.split('/')))} for b,t in trees.items()}
pat = re.compile(r'`((?:app|lib|components|scripts|docs|content|tests|public|supabase|infra|\.github)/[^`\s]*|proxy\.ts|next\.config\.ts|README\.md)`')
rows = collections.OrderedDict()
for f in sorted(C.glob('*.md')):
    for i, line in enumerate(f.read_text().splitlines(), 1):
        for m in pat.finditer(line):
            p = m.group(1).rstrip('/').split('#')[0]
            if '<' in p or '…' in p or '*' in p: continue
            where = [b.split('/')[-1] for b in branches if p in trees[b] or p in dirs[b]]
            prop = 'proposed' in line.lower() or 'propos' in line.lower()
            rows.setdefault(p, []).append((f.name, i, where, prop))
for p, occ in rows.items():
    where = occ[0][2]
    if not where:
        unlabelled = [(fn, ln) for fn, ln, _, prop in occ if not prop]
        print(f"MISSING-ON-ALL  {p}  occurrences={len(occ)}  lines-without-'proposed'={unlabelled}")
print('checked', len(rows), 'distinct paths')
