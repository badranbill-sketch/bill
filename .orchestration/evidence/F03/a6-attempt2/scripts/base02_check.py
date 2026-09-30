import json,os,hashlib,glob
B='/home/user/bill/.orchestration/evidence/F03/base02'
R2='/home/user/bill/.orchestration/evidence/F03/repair2'
h=lambda p: hashlib.sha256(open(p,'rb').read()).hexdigest()
pngs=sorted(f for f in os.listdir(f'{B}/before') if f.endswith('.png'))
same=sum(h(f'{B}/before/{f}')==h(f'{B}/after/{f}') for f in pngs)
print('before/after PNGs:',len(pngs),'byte-identical:',same)
for name in ('diff/report.json',):
    r=json.load(open(f'{B}/{name}'))
    print(name,'summary:',json.dumps(r.get('summary'))[:400])
r=json.load(open(f'{R2}/base02-diff-codex-vs-b0bc6cf/report.json'))
print('repair2 report summary:',json.dumps(r.get('summary'))[:400])
# records
recs=sorted(glob.glob(f'{B}/before/records/*.json'))
print('before records:',len(recs), 'after records:', len(glob.glob(f'{B}/after/records/*.json')))
r0=json.load(open(recs[0])); print('record keys:',sorted(r0.keys()))
apps=set()
for side in ('before','after'):
    for p in sorted(glob.glob(f'{B}/{side}/records/*.json')):
        r=json.load(open(p))
        apps.add((side,r.get('app_dir')))
print('app_dirs:',apps)
# summarize key facts from records
agg={}
for side in ('before','after'):
    bad=[]
    for p in sorted(glob.glob(f'{B}/{side}/records/*.json')):
        r=json.load(open(p)); n=os.path.basename(p)
        st=r.get('status'); ce=len(r.get('console_errors',[]) or []); pe=len(r.get('page_errors',[]) or [])
        fr=len(r.get('failed_requests',[]) or []); ov=r.get('overflow') or r.get('horizontal_overflow')
        if (st not in (200,None)) or ce or pe or fr or ov: bad.append((n,st,ce,pe,fr,ov))
    print(side,'records with status!=200/console/page errors/failed req/overflow:',bad)
