"""A6 reproduction of the README's self-reported P2 items XL-01 and XL-11(c)."""
import json, pathlib, copy, glob
from jsonschema import Draft202012Validator
C = pathlib.Path('/home/user/bill/.orchestration/contracts')
env = Draft202012Validator(json.loads((C/'event-envelope.schema.json').read_text()))
job = Draft202012Validator(json.loads((C/'delivery-job.schema.json').read_text()))
am = Draft202012Validator(json.loads((C/'asset-manifest.schema.json').read_text()))
base = json.loads((C/'examples/valid/event-envelope/content-approved.json').read_text())
print('# XL-01: content.approved for asset kinds that asset-manifest 1.0 defines')
for rid in ['ink.a01.h1f10e4f87273', 'companion.s01.v1', 'book.printed-guide.v1', 'event.crossroads-kit.v1', 'copy.price-disclosure.v1', 'article.five-years-before-retirement.v1']:
    d = copy.deepcopy(base); d['resource_id'] = rid
    e = list(env.iter_errors(d))
    print(f"  {'REJECTED' if e else 'ACCEPTED'}  content.approved resource_id={rid}")
# asset IDs accepted by the manifest schema?
am_ids = am.schema['$defs']['entry']['properties']['asset_id']
print('  asset-manifest asset_id schema:', json.dumps(am_ids)[:300])
print('# XL-11(c): a promotional E09 job is schema-valid, and its owning capability (event_lifecycle) is controlled only by public_launch')
j = None
for f in sorted((C/'examples/valid/delivery-job').glob('*.json')):
    d = json.loads(f.read_text())
    if d['template_id'] == 'e09' or j is None: j = d
j = copy.deepcopy(j)
j.update(template_id='e09', message_class='promotional', priority=8, consent_reference='cev_0rv6kbtcg8zyd6m76tv1pmxp7d', resource_ref='wev_rrrt8jn3qqp17g4yaqcs747g6t')
j['purpose_key'] = ':'.join(j['purpose_key'].split(':')[:3] + ['e09', j['template_version']])
e = list(job.iter_errors(j))
print(f"  promotional e09 job: {'REJECTED '+e[0].message[:100] if e else 'ACCEPTED (schema)'}")
ff = json.loads((C/'feature-flags.json').read_text())
print('  event_lifecycle.controlling_flags =', ff['properties']['capabilities']['properties']['event_lifecycle']['properties']['controlling_flags']['const'])
ee = json.loads((C/'email-eligibility.json').read_text())
print('  PSC-3 =', [p for p in ee['common_pre_send_checks'] if p.startswith('PSC-3')][0])
print('  => with public_launch=true and marketing_dispatch=false (the kill switch), PSC-3 passes for a promotional E09; only prose (feature-flags.md §4, E09 notes) says otherwise.')
