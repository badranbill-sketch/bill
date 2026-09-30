import json, hashlib, subprocess, os, sys
R='/home/user/bill'
h=json.load(open(f'{R}/.orchestration/handoffs/F03.json'))
def git(*a): return subprocess.run(['git','-C',R,*a],capture_output=True).stdout
rc=h['result_commit']; bc=h['base_commit']
print('base_commit type:', git('cat-file','-t',bc).decode().strip(), '| equals main HEAD:', git('rev-parse','HEAD').decode().strip()==bc)
print('result_commit type:', git('cat-file','-t',rc).decode().strip(), '| equals integration:', git('rev-parse','integration').decode().strip()==rc)
ok=bad=0
for a in h['artifacts']:
    p=a['path']
    src=None
    if p.startswith('.orchestration/'):
        fp=os.path.join(R,p)
        if os.path.exists(fp):
            d=open(fp,'rb').read(); src='main-path file'
        else:
            d=None
    else:
        d=subprocess.run(['git','-C',R,'show',f'{rc}:{p}'],capture_output=True).stdout; src=f'blob in {rc[:7]}'
    got=hashlib.sha256(d).hexdigest() if d is not None else 'MISSING'
    m = got==a['sha256']
    ok+=m; bad+= (not m)
    print(('OK  ' if m else 'BAD ')+p+' ['+str(src)+'] '+(got if not m else ''))
print(f'artifacts: {ok} match, {bad} mismatch of {len(h["artifacts"])}')
# evidence paths of tests
miss=0
for t in h['tests']:
    e=t['evidence']
    fp=os.path.join(R,e)
    if not os.path.exists(fp):
        miss+=1; print('MISSING evidence', t['id'], e)
print(f'tests: {len(h["tests"])}, evidence missing: {miss}')
# tests exit codes vs results.json of repair2 suite
rj=json.load(open(f'{R}/.orchestration/evidence/F03/repair2/suite-full-b0bc6cf/results.json'))
steps={s['id']:s for s in rj['steps']}
for t in h['tests']:
    c=t['command']
    if "(step '" in c:
        sid=c.split("(step '")[1].split("'")[0]
        s=steps[sid]
        print(f"{t['id']:22s} step={sid:22s} handoff_exit={t['exit_code']} results_exit={s['exit_code']} class={s['classification']} {'OK' if t['exit_code']==s['exit_code'] else 'MISMATCH'}")
# changed_paths vs git diff
names=set(git('diff','--name-only',bc,rc).decode().split())
outside=[n for n in names if not n.startswith('.orchestration/')]
cp=h['changed_paths']
def covered(n):
    return any(n==c or (c.endswith('/') and n.startswith(c)) for c in cp)
unc=[n for n in outside if not covered(n)]
print('diff paths outside .orchestration:', len(outside), 'uncovered by changed_paths:', unc)
extra=[c for c in cp if not c.startswith('.orchestration') and not any(n==c or (c.endswith('/') and n.startswith(c)) for n in outside)]
print('changed_paths entries not in diff:', extra)
