import json,subprocess
def lock(rev): return json.loads(subprocess.run(['git','-C','/home/user/bill','show',f'{rev}:package-lock.json'],capture_output=True,check=True).stdout)
a=lock('67ba636')['packages']; b=lock('5545c2a')['packages']
added=sorted(set(b)-set(a)); removed=sorted(set(a)-set(b)); changed=[]
for k in sorted(set(a)&set(b)):
    if a[k]!=b[k]:
        diffkeys=[x for x in set(a[k])|set(b[k]) if a[k].get(x)!=b[k].get(x)]
        changed.append((k,a[k].get('version'),b[k].get('version'),sorted(diffkeys)))
print('added',len(added)); [print('  +',k,b[k].get('version'),'dev' if b[k].get('dev') else '') for k in added]
print('removed',len(removed)); [print('  -',k,a[k].get('version')) for k in removed]
print('changed',len(changed)); [print('  ~',*c) for c in changed]
libc_a=sum(1 for v in a.values() if 'libc' in v); libc_b=sum(1 for v in b.values() if 'libc' in v); print('libc fields before/after',libc_a,libc_b)
