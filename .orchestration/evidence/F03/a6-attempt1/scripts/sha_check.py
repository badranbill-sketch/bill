import json, hashlib, subprocess, os
h = json.load(open('/home/user/bill/.orchestration/handoffs/F03.json'))
ok=bad=0
for a in h['artifacts']:
    p=a['path']
    if p.startswith('.orchestration/'):
        src='worktree-file /home/user/bill/'+p
        data=open('/home/user/bill/'+p,'rb').read()
    else:
        src='blob 5545c2a:'+p
        data=subprocess.run(['git','-C','/home/user/bill','show','5545c2a:'+p],capture_output=True,check=True).stdout
    got=hashlib.sha256(data).hexdigest()
    m = got==a['sha256']
    ok+=m; bad+= (not m)
    print(('OK  ' if m else 'BAD ')+p+'  '+src+'  claimed='+a['sha256'][:16]+' got='+got[:16])
print('ok',ok,'bad',bad)
# commits
for k in ('base_commit','result_commit'):
    r=subprocess.run(['git','-C','/home/user/bill','cat-file','-t',h[k]],capture_output=True,text=True)
    print(k,h[k],r.stdout.strip() or r.stderr.strip())
print('integration head', subprocess.run(['git','-C','/home/user/bill','rev-parse','integration'],capture_output=True,text=True).stdout.strip())
print('main repo HEAD', subprocess.run(['git','-C','/home/user/bill','rev-parse','HEAD'],capture_output=True,text=True).stdout.strip())
# evidence paths in tests exist?
for t in h['tests']:
    p='/home/user/bill/'+t['evidence']
    print('evidence', 'exists' if os.path.exists(p) else 'MISSING', t['id'], t['evidence'])
