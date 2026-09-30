import json,glob,os,collections
B='/home/user/bill/.orchestration/evidence/F03/base02'
for side in ('before','after'):
    c=collections.Counter(); inc=[]; kinds=collections.Counter()
    for p in sorted(glob.glob(f'{B}/{side}/records/*.json')):
        r=json.load(open(p)); kinds[r.get('kind')]+=1
        c[(r.get('http_status'))]+=1
        if r.get('bad_responses'): print(side, os.path.basename(p), 'bad_responses', r['bad_responses'])
        if r.get('images_incomplete'): inc.append((os.path.basename(p), r['images_incomplete']))
        if r.get('kind')=='screenshot' or r.get('screenshot'):
            pass
    print(side,'http_status counts',dict(c),'kinds',dict(kinds))
    print(side,'images_incomplete',inc)
    for p in sorted(glob.glob(f'{B}/{side}/records/*meeting*.json')):
        r=json.load(open(p)); print(side, os.path.basename(p), 'inquiry_form', r.get('inquiry_form'), 'contact', r.get('contact_section'), 'rm', r.get('reduced_motion'))
    for p in sorted(glob.glob(f'{B}/{side}/records/*home*.json')):
        r=json.load(open(p)); print(side, os.path.basename(p), 'journey', r.get('journey'))
