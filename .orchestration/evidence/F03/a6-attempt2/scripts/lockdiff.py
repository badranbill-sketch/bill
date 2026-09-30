import json,subprocess
def lock(c): return json.loads(subprocess.run(['git','-C','/home/user/bill','show',f'{c}:package-lock.json'],capture_output=True,text=True).stdout)['packages']
for a,b in (('origin/codex/desktop-iphone-unified','67ba636'),('67ba636','b0bc6cf')):
    A=lock(a); B=lock(b)
    added=sorted(set(B)-set(A)); removed=sorted(set(A)-set(B))
    changed=sorted(k for k in set(A)&set(B) if A[k]!=B[k])
    print(f'== {a} -> {b}: added {len(added)}, removed {len(removed)}, changed {len(changed)}')
    for k in added: print('  +',k or '<root>',B[k].get('version'))
    for k in removed: print('  -',k,A[k].get('version'))
    for k in changed:
        da={x:A[k].get(x) for x in set(A[k])|set(B[k]) if A[k].get(x)!=B[k].get(x)}
        print('  ~',k or '<root>',{x:(A[k].get(x),B[k].get(x)) for x in da if x!='devDependencies'} or '', '(devDependencies changed)' if 'devDependencies' in da else '')
    libcA=sum(1 for v in A.values() if 'libc' in v); libcB=sum(1 for v in B.values() if 'libc' in v)
    print('  libc fields', libcA, '->', libcB)
