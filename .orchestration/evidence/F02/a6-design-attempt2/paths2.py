#!/usr/bin/env python3
"""A6 attempt-2: every backticked repo path in the normative .md files, checked against the six
branches (git ls-tree) and against the working tree for .orchestration paths. A path absent
everywhere must be labelled proposed on its line, or sit in a paragraph/section whose heading or
lead says proposed. Prints each absent path with the label evidence it found."""
import re, subprocess, pathlib
R = '/home/user/bill'; C = pathlib.Path(R, '.orchestration/contracts')
BR = ['origin/main','origin/codex/desktop-iphone-unified','origin/claude/bill-centered-homepage',
      'origin/guide/pre-retirement-guide','origin/claude/bill-presentation-video','origin/add-ask-bill-section']
trees = {b: set(subprocess.run(['git','-C',R,'ls-tree','-r','--name-only',b],capture_output=True,text=True).stdout.split()) for b in BR}
dirs = {b: {str(pathlib.PurePosixPath(p).parent)+'/' for p in t} | {'/'.join(p.split('/')[:i])+'/' for p in t for i in range(1,p.count('/')+1)} for b,t in trees.items()}
PAT = re.compile(r'`((?:app|lib|components|scripts|content|docs|tests|supabase|infra|public|\.github|\.orchestration)/[^`\s]*|proxy\.ts|next\.config\.ts|README\.md)`')
absent = []
for md in sorted(C.glob('*.md')):
    lines = md.read_text().splitlines()
    heading = ''
    for i, line in enumerate(lines, 1):
        if line.startswith('#'): heading = line
        for m in PAT.finditer(line):
            p = m.group(1).rstrip('.,;:)')
            base = p.split('#')[0].split('?')[0]
            if base.startswith('.orchestration/'):
                ok = pathlib.Path(R, base).exists() or '…' in base or '<' in base
                where = 'worktree' if ok else None
            else:
                where = [b.split('/')[-1] for b in BR if base in trees[b] or (base.endswith('/') and base in dirs[b]) or ('<' in base or '*' in base or '…' in base)]
            if not where:
                lab = 'proposed' in line.lower() or 'proposed' in heading.lower()
                absent.append((md.name, i, p, lab, heading[:60]))
for a in absent:
    print(f"{a[0]}:{a[1]}  {a[2]}  labelled_proposed_on_line_or_heading={a[3]}  heading={a[4]!r}")
print('\nabsent paths:', len(absent), ' unlabelled:', sum(1 for a in absent if not a[3]))
