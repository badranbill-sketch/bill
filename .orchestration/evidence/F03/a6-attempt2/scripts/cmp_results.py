import json
A=json.load(open('/home/user/bill/.orchestration/evidence/F03/a6-attempt2/results.json'))
B=json.load(open('/home/user/bill/.orchestration/evidence/F03/repair2/suite-full-b0bc6cf/results.json'))
print('A6 head', A['git_before']['head'], 'builder head', B['git_before']['head'])
print('A6 git_before.status', A['git_before']['status'], '| builder', B['git_before']['status'])
print('dirtied A6', A['dirtied_by_suite'], '| builder', B['dirtied_by_suite'])
print('overall A6', A['overall'], A['summary'], A['exit_code'], A['requested_not_run'])
print('overall B ', B['overall'], B['summary'], B['exit_code'], B['requested_not_run'])
print('env A6', json.dumps(A['environment'])[:600])
bs={s['id']:s for s in B['steps']}
mism=0
for s in A['steps']:
    b=bs[s['id']]
    m = s['exit_code']==b['exit_code'] and s['classification']==b['classification']
    mism += not m
    print(f"{s['id']:22s} A6 {s['exit_code']} {s['classification']:24s} {s.get('seconds')}s | B {b['exit_code']} {b['classification']:24s} | {'MATCH' if m else 'MISMATCH'}")
    for k in ('note','reason','citation'):
        if s.get(k)!=b.get(k): print(f"    {k} differs: A6={s.get(k)!r}\n                 B ={b.get(k)!r}")
print('mismatches:', mism)
