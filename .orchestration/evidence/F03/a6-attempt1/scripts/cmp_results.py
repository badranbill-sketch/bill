import json,re
a=json.load(open('/home/user/bill/.orchestration/evidence/F03/suite/final-5545c2a/results.json'))
b=json.load(open('/home/user/bill/.orchestration/evidence/F03/a6-attempt1/results.json'))
print('builder head',a['git_before']['head'],'a6 head',b['git_before']['head'])
print('builder summary',a['summary'],a['overall'],a['exit_code'])
print('a6 summary     ',b['summary'],b['overall'],b['exit_code'])
print('dirtied builder',a['dirtied_by_suite'],'a6',b['dirtied_by_suite'], 'a6 git_before status', b['git_before']['status'])
print('env a6', json.dumps(b['environment']['env_present']), b['environment']['browser']['version'], b['environment']['gh_cli_installed'])
print(f"{'step':24} {'builder':32} {'a6':32} match")
bb={s['id']:s for s in b['steps']}
for s in a['steps']:
    t=bb[s['id']]
    m = s['classification']==t['classification'] and s['exit_code']==t['exit_code']
    print(f"{s['id']:24} {str(s['exit_code'])+' '+s['classification']:32} {str(t['exit_code'])+' '+t['classification']:32} {'YES' if m else 'NO'}")
    na=(s.get('note') or '')[:160]; nb=(t.get('note') or '')[:160]
    if na!=nb: print('   note builder:',na,'\n   note a6     :',nb)
    if s.get('citation')!=t.get('citation'): print('   citation differs', s.get('citation'), t.get('citation'))
print('launch citation a6:', bb['launch_check'].get('citation'))
