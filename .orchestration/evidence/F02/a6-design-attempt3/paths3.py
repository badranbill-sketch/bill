"""A6 design attempt 3: every backticked path-like token in contracts/*.md, checked for
existence on the six branches (git ls-tree) and in the working tree (.orchestration/ or contracts/).
Absent paths must be labelled proposed/not-existing on the same line, in the enclosing table row,
in the nearest heading, or in the paragraph's first line. Read-only."""
import re, subprocess, pathlib
R = pathlib.Path('/home/user/bill')
C = R/'.orchestration/contracts'
BR = ['origin/main','origin/codex/desktop-iphone-unified','origin/claude/bill-centered-homepage',
      'origin/guide/pre-retirement-guide','origin/claude/bill-presentation-video','origin/add-ask-bill-section']
trees = {}
for b in BR:
    out = subprocess.run(['git','-C',str(R),'ls-tree','-r','--name-only',b],capture_output=True,text=True).stdout.split('\n')
    s = set(out); d = set()
    for p in out:
        parts = p.split('/')
        for i in range(1,len(parts)): d.add('/'.join(parts[:i]))
    trees[b] = (s,d)
def exists(p):
    q = p.rstrip('/')
    q = q[2:] if q.startswith('./') else q
    hits = [b.split('/')[-1] for b,(s,d) in trees.items() if q in s or q in d]
    for base in (R, R/'.orchestration', C, C/'examples', C/'fixtures/workshop', R/'.orchestration/evidence/F02', R/'.orchestration/evidence/F02/data', R/'.orchestration/evidence/F02/math', R/'.orchestration/evidence/F02/offers', R/'.orchestration/source', R/'.orchestration/reviews', pathlib.Path('/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/wt/base01-codex')):
        if (base/q).exists() or (base/(q+'.json')).exists(): hits.append('worktree:'+str(base))
    return hits
PATHRE = re.compile(r'`([A-Za-z0-9_.\-\[\]\(\)]+(?:/[A-Za-z0-9_.\-\[\]\(\)\*…<>]+)+/?|[A-Za-z0-9_\-]+\.(?:ts|tsx|json|md|py|mjs|yml|pdf|sh))`')
LABEL = re.compile(r'propos|does not exist|none exists|not exist|no .* exists|future|candidate|to be (?:created|built)|placeholder|deliverable', re.I)
absent_unlabelled, absent_labelled, present = [], [], 0
for f in sorted(C.glob('*.md')):
    lines = f.read_text().split('\n'); heading = ''; para_first = ''
    for i, line in enumerate(lines):
        if line.startswith('#'): heading = line; para_first = ''
        if not line.strip(): para_first = ''
        elif not para_first: para_first = line
        for m in PATHRE.finditer(line):
            p = m.group(1)
            if p.startswith(('http','www.')) or '<' in p or '*' in p or '…' in p: continue
            if re.match(r'^(?:[a-z]+\.){1,}[a-z0-9\-]+$', p) and '/' not in p and not re.search(r'\.(ts|tsx|json|md|py|mjs|yml|pdf|sh)$', p): continue
            h = exists(p)
            if h or re.match(r'^(origin/|claude/)', p): present += 1; continue
            ctx = ' '.join([line, heading, para_first])
            (absent_labelled if LABEL.search(ctx) else absent_unlabelled).append((f.name, i+1, p, line.strip()[:170]))
print(f"present references: {present}")
print(f"absent, labelled proposed in context: {len(absent_labelled)}")
for x in absent_labelled: print('  L', x[0], x[1], x[2])
print(f"absent, NOT labelled in line/heading/paragraph lead: {len(absent_unlabelled)}")
for x in absent_unlabelled: print('  U', x[0], x[1], x[2], '::', x[3])
