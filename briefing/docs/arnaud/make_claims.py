#!/usr/bin/env python3
"""Write docs/arnaud/CLAIMS.md: every factual statement in operator-briefing.md -> source file:line -> verbatim excerpt.

Each row names a file and a verbatim needle; the line number is found here, never typed, and the run fails if a needle
is missing. Computed figures (counts, sums) are recomputed from the files and printed with the command logic.
Run from the briefing package:  python3 docs/arnaud/make_claims.py
"""
import collections, glob, json, os, re, subprocess, sys

O = '/home/user/bill/.orchestration'
HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.abspath(os.path.join(HERE, '..', '..'))  # the briefing package

ALIAS = [(O + '/source/', '01-07/'), (O + '/', '.orchestration/'), (B + '/', 'briefing/')]


def short(p):
    for a, b in ALIAS:
        if p.startswith(a):
            return b + p[len(a):]
    return p


def f(rel):
    if rel.startswith('B:'):
        return os.path.join(B, rel[2:])
    if rel.startswith('S:'):
        return os.path.join(O, 'source', rel[2:])
    return os.path.join(O, rel)


missing = []


def cite(rel, needle, nth=1):
    path = f(rel)
    lines = open(path, encoding='utf-8').read().split('\n')
    hits = [i + 1 for i, l in enumerate(lines) if needle in l]
    if len(hits) < nth:
        missing.append(f'{short(path)}: {needle!r}')
        return f'`{short(path)}` (NOT FOUND)', needle
    return f'`{short(path)}:{hits[nth - 1]}`', needle


def esc(s):
    return s.replace('|', '\\|').replace('\n', ' ')


rows = []  # (section, id, statement, [(rel, needle, nth)], note)


def R(sec, stmt, *srcs, note=''):
    rows.append((sec, stmt, [s if isinstance(s, tuple) and len(s) == 3 else (s[0], s[1], 1) for s in srcs], note))


# ------------------------------------------------------------------ computed facts
T = json.load(open(f('tasks.json')))
TS = {t['id']: t for t in T['tasks']}
states = collections.Counter(t['state'] for t in T['tasks'])
acc = {k for k, v in TS.items() if v['state'] == 'accepted'}
ready = [k for k, v in TS.items() if v['state'] == 'planned' and all(d in acc for d in v['dependencies']) and not v['required_gates']]
chain = T['meta']['longest_dependency_chain']
dec = open(f('decisions.md')).read()
dec_ids = sorted(set(re.findall(r'^(?:\| |\*\*)(D-0\d\d)', dec, re.M)))
hb_ids = sorted(set(re.findall(r'^\*\*(HB-\d+)', open(f('blockers.md')).read(), re.M)))
tb_ids = sorted(set(re.findall(r'^\| (TB-\d+)', open(f('blockers.md')).read(), re.M)))
open_rows = []
for line in dec.split('\n'):
    m = re.match(r'^\| (D-0\d\d) \|', line)
    if not m:
        continue
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    st = [c for c in cells if re.search(r'frozen-by-plan|default-pending|resolved-by|^\**open', c)]
    if st and re.fullmatch(r'\**(open|default-pending-G0)\**( \(.*\))?', st[0]):
        open_rows.append(m.group(1))
runs = []
for p in sorted(glob.glob(O + '/runs/*.json')):
    d = json.load(open(p))
    runs.append(d)
metered = [d for d in runs if d.get('agents') is not None]
tot = dict(runs=len(metered), agents=sum(d['agents'] for d in metered), tokens=sum(d['subagent_tokens'] for d in metered),
           wall=sum(d['wall_time_s'] for d in metered), tools=sum(d['tool_uses'] for d in metered))
lost = [d['run_id'] for d in runs if d.get('agents') is None]
costs_status = sorted({(d.get('metered_cost') or {}).get('status') for d in runs})
git = subprocess.run(['git', '-C', '/home/user/bill', 'branch', '-a', '-vv'], capture_output=True, text=True).stdout

computed = [
    ('tasks.json states', f"{dict(states)} of {len(T['tasks'])} tasks",
     "python3: collections.Counter(t['state'] for t in tasks.json['tasks'])"),
    ('Ready now', ', '.join(ready), "planned tasks whose dependencies are all accepted and whose required_gates list is empty"),
    ('Critical path', f"{len(chain)} tasks: " + ', '.join(chain), "tasks.json meta.longest_dependency_chain"),
    ('Gates on the chain', '; '.join(f"{k} {TS[k]['required_gates']}" for k in chain if TS[k]['required_gates']),
     "tasks.json tasks[*].required_gates for the chain"),
    ('Decision entries', f"{len(dec_ids)} ({dec_ids[0]} to {dec_ids[-1]}); wholly open: {len(open_rows)} ({', '.join(open_rows)})",
     "regex ^(| |**)D-0dd on decisions.md; open = status cell wholly 'open' or 'default-pending-G0' (method of briefing CLAIMS.md C04-3)"),
    ('Questions and technical blockers', f"{len(hb_ids)} HB ({hb_ids[0]} to {hb_ids[-1]}); {len(tb_ids)} TB",
     "regex ^**HB-n and ^| TB-n on blockers.md"),
    ('AI usage', f"{len(runs)} run files; {tot['runs']} metered: {tot['agents']} agent sessions, {tot['tools']} tool uses, "
                 f"{tot['tokens']:,} subagent tokens, {tot['wall']:,} s = {tot['wall'] // 3600} h {tot['wall'] % 3600 // 60} min "
                 f"{tot['wall'] % 60} s; metering lost: {', '.join(lost)}; metered_cost.status values: {costs_status}",
     "sum of agents, tool_uses, subagent_tokens, wall_time_s over runs/*.json where agents is not null"),
]

# ------------------------------------------------------------------ statements
S = 'Cover and 01 At a glance'
R(S, 'Nothing deployed, sent, bought or published; spend $0',
  ('blockers.md', 'None of it deploys, sends, buys or publishes.'),
  ('costs.json', '"measured": "The amount comes from an actual invoice or provider metering. No item has this status yet."'),
  ('decisions.md', '**Spend is zero until G2.** Authorized caps: purchased API 0, ads 0, subscriptions 0. Nothing is bought.'))
R(S, 'Five foundation tasks accepted (F00, F01, F02, F02a, F03)', *[('tasks.json', '"state": "accepted",', k) for k in range(1, 6)],
  note='See computed row "tasks.json states": 5 accepted. F00, F01, F02, F02a at design_or_audit; F03 at local_implementation_tested.')
R(S, 'Each checked by an AI verifier that did none of the work', ('S:01_MASTER_PLAN.md', 'Use an independent fresh-context verifier.'),
  ('S:01_MASTER_PLAN.md', '| **A6 Independent verifier / red team** |'),
  ('S:01_MASTER_PLAN.md', 'A6 reviews a clean checkout or fresh context, not merely the worker'))
R(S, 'Combined version: 13 checks pass, 1 blocked, 1 fails by design; 41 of 41 browser tests; stand-in browser',
  ('tasks.json', '"summary": "13 pass, 1 blocked (protections_check: no gh/token), 1 expected_fail_by_design'),
  ('evidence/A0-regression-e766026/results.json', '"note": "playwright: 41 passed; under substitute Chromium 141.0.7390.37'))
R(S, 'The 18 Instagram capsules started early, at your request, as drafts',
  ('decisions.md', '**C01 early start at operator request.** Arnaud asked for the 18 capsules before C00 exists. C01 runs as a draft package'),
  ('tasks.json', '"note": "Operator-directed early start (Arnaud asked for the 18 capsules now).'))
R(S, 'No Bill recording, no approved book', ('blockers.md', '0 Bill video recordings exist, and no approved book PDF'))
R(S, 'None of the seven approvals (G0–G6) recorded', ('decisions.md', '**This register records no human approval.** No G0–G6 gate is recorded here.'),
  ('blockers.md', 'L05, the controlled invited pilot, needs gates G0, G1, G3, G4, G5 and G6 recorded (TASK_LEDGER). **None is recorded.**'))
R(S, 'Friday 2 October can only be a labelled protected rehearsal unless approvals are recorded and recordings exist',
  ('blockers.md', 'So on the current evidence, Friday October 2 can only be a **clearly labelled protected rehearsal**'),
  ('blockers.md', 'That changes only if the gates are recorded and the recordings exist.'))
R(S, 'Spending limits at 0', ('costs.json', '"authorized_caps": {'), ('costs.json', '"note": "zero until G2 records a cap"'))
R(S, 'No new subscription for the pilot if the existing server, Bill\'s Google account and existing backup storage suffice',
  ('blockers.md', '- Friday: nothing, if the caps stay 0 and Bill\'s existing account can host Meet.'),
  ('decisions.md', '**Default: reuse the existing VPS** (no new host subscription).'),
  ('blockers.md', 'No backup provider is proposed: an existing owner-controlled storage is preferred, and buying one needs HB-08.'),
  note='Same wording as the briefing film (briefing/CLAIMS.md C09-2).')
R(S, 'AI build usage: 14.1 million tokens over 6 metered runs, 50 sessions, 11 h 22 min; no price metered; one run lost',
  ('runs/wf_1b4ec6c8-e3c.json', '"note": "interrupted by container restart during repair attempt 3; per-agent metering for this run was not recovered"'),
  ('runs/wf_5bb05036-e58.json', '"status": "unavailable-not-estimated",'), note='Totals: computed row "AI usage". 14,098,665 rounds to 14.1 million.')
R(S, 'CAD 280 ad test is a proposal, not authorized', ('S:01_MASTER_PLAN.md', 'The provisional test is CAD20/day for 14 days only after approval; this is a proposal, not a benchmark or authorization.'),
  ('costs.json', '"arithmetic_total": 280,'), ('costs.json', '"status": "proposal_unconfirmed_not_authorized",'))
R(S, '13 questions for you', ('blockers.md', '## 1. Arnaud'), ('blockers.md', '**HB-01. Production host** (G0)'),
  ('blockers.md', '**HB-13. Advertising, social and Google listing accounts** (G2, G6; with Bill)'))
R(S, 'Proposed: you deploy and operate, check bookings daily, moderate the event, run the weekly review',
  ('blockers.md', '- PROPOSAL: Arnaud deploys and operates, and Bill is kept informed.'),
  ('blockers.md', 'Arnaud reconciles bookings daily.'),
  ('blockers.md', '- PROPOSAL: the 60-minute event run-of-show in D-030, with Arnaud moderating.'),
  ('S:06_HUMAN_GATES_AND_RUNBOOK.md', 'The operator reviews one report:'))
R(S, 'Your operating time not estimated; recorded in hours once operating',
  ('costs.json', '"note": "Not estimated. Record actual hours once operating.'))
R(S, 'Bill: 10 questions; a 20-minute voice interview', ('blockers.md', '## 2. Bill'), ('blockers.md', '**HB-14. Your Google account and Meet**'),
  ('blockers.md', '**HB-23. Where quotes and questions came from**'), ('S:05_CONTENT_AND_ART_BRIEFS.md', 'Obtain a 20-minute recorded voice interview with consent.'))
R(S, '22 to 35 minutes of finished video per language, not studio time',
  ('B:CLAIMS.md', '| **Total on screen** | | **1,335 s = 22 min 15 s** | **2,100 s = 35 min** |'),
  ('S:05_CONTENT_AND_ART_BRIEFS.md', 'A5 delivers 18 complete spoken scripts, each approximately 45–75 seconds after an actual read-through'),
  note='Computation in briefing/CLAIMS.md §3 (reused, not re-derived).')
R(S, 'Meetings, proposed: 3 h 50 min a week reserved', ('S:01_MASTER_PLAN.md', '(6×25 + 2×40) / 60 = 3 hours 50 minutes reserved'))
R(S, 'Crossroads 60 minutes, proposed monthly', ('S:01_MASTER_PLAN.md', 'Proposed first event: 60 minutes'),
  ('S:01_MASTER_PLAN.md', 'Suggested initial cadence: one pilot event, then one Crossroads session per month'))
R(S, 'HB-02 Friday: HARD', ('blockers.md', '- Friday: HARD (no staging without it).'))
R(S, 'HB-03 proposal: the combined version; Friday HARD', ('blockers.md', '- PROPOSAL: A as the technical integration baseline'),
  ('blockers.md', '- Friday: HARD (nothing integrates without a baseline).'))
R(S, 'HB-06, HB-07 Friday: HARD', ('blockers.md', '- Friday: HARD for provider tests.'), ('blockers.md', '- Friday: HARD for any staging integration.'))
R(S, 'HB-10 Friday: HARD; proposal: you', ('blockers.md', '- Friday: HARD (06 requires an operator watching during the pilot).'))
R(S, 'HB-04: the free PDF and the paid book both need one approved file; HARD for the guide path',
  ('blockers.md', '- Why: The free PDF and the paid book both need one approved file (D-054).'), ('blockers.md', '- Friday: HARD for the guide path.'))
R(S, 'HB-19 and HB-21 gate everything public', ('blockers.md', '- Friday: HARD. Without recordings, the workshop is not "usable with approved media"'),
  ('blockers.md', '- Friday: HARD for any public copy.'), note='"Our reading": the five-item ranking is ours, from each item\'s Blocks and Friday lines; it is labelled so on the page.')

S = '02 What was built first'
R(S, 'Wave 0 fixes facts and rules first so parallel work cannot drift, leak numbers or promise what Bill has not approved',
  ('S:01_MASTER_PLAN.md', '**Wave 0 — inspect and freeze.**'), ('S:01_MASTER_PLAN.md', 'Gate: no parallel implementation before the shared contracts are coherent.'),
  ('decisions.md', '**Workshop financial figures never leave the browser.**'), ('decisions.md', '**The offer structure is final; the public wording is not yet approved.**'),
  note='Same statement as briefing/CLAIMS.md C04-8.')
R(S, 'F00: 6 code versions', ('inventory.md', '| main | `77de3bd51a8c9cb73aec0b32d27ca0cacb6285cd`'),
  ('inventory.md', '| guide/pre-retirement-guide | `749b360f75185041e1aa3408500857605bc4507f`'),
  note='Branch table rows main, add-ask-bill-section, codex, homepage, presentation-video, guide (six rows).')
R(S, 'F00: 171-row gap list (7 exist, 30 partial, 119 missing, 15 waiting on a person)', ('inventory.md', '171 rows. Totals: **7 exists / 30 partial / 119 missing / 15 blocked_human**.'))
R(S, 'F00: pass on attempt 3; accepted at the design stage', ('reviews/F00-attempt3.md', '## Verdict: pass'),
  ('reviews/F00.md', '## Verdict: needs_changes'), ('reviews/F00-attempt2.md', '## Verdict: needs_changes'))
R(S, 'F01: the decision log, 75 entries today (13 still open); 29 questions; 16 technical blockers', ('decisions.md', '| D-001 | **Free PDF.**'),
  ('decisions.md', '| D-075 | **C01 early start at operator request.**'), note='Counts: computed rows "Decision entries" and "Questions and technical blockers".')
R(S, 'F01: a cost sheet of known amounts only', ('costs.json', '"purpose": "Real cost sheet required by 01 §17. It holds only amounts that are actually known from evidence.'))
R(S, 'F01: pass on attempt 2', ('reviews/F01-attempt2.md', '## Verdict: pass'), ('reviews/F01.md', '## Verdict: needs_changes'))
R(S, 'F02: 15 versioned contracts (listed)', ('contracts/README.md', '| 1 | Event envelope 1.0 |'), ('contracts/README.md', '| 15 | Workshop clip rules 1.0 |'),
  ('contracts/README.md', '| 16 | Index and harness |'), note='Rows 1–15 are the contracts; row 16 (index and harness) is not counted, as in briefing/CLAIMS.md C04-4.')
R(S, 'F02: design pass on attempt 3; maths review found two coverage gaps, not wrong formulas, moved to F02a',
  ('reviews/F02-design-attempt3.md', '## Verdict: pass'),
  ('tasks.json', 'Math review: formulas and fixtures correct, but 2 P2 conformance-coverage gaps'),
  ('decisions.md', '**Split F02 once (01 §5 bounded repair).**'))
R(S, 'F02a: four test cases WM37 to WM40; A0 patch 1 moved the rule set to 1.1', ('decisions.md', "F02a's fixtures WM37–WM40 are noted as additions"),
  ('contracts/README.md', 'contract_set_version: 1.1'))
R(S, 'F02a: faulty calculators now fail; the patch passed on attempt 2', ('tasks.json', '"note": "Fixtures verified (faulty runtimes fail); A0 patch 1'),
  ('reviews/A0-patch-1-attempt2.md', '## Verdict: pass (no P0, P1 or P2; two P3)'))
R(S, 'F03: codex and the guide merged with no conflict, plus the orchestration record and a re-runnable check suite',
  ('baseline.md', '**Integration baseline = `codex/desktop-iphone-unified@66cce52` + `guide/pre-retirement-guide@749b360` (merged) + orchestration record `cb3becf` (merged).**'),
  ('baseline.md', 'No conflict was resolved, so no hunk was taken from either side.'))
R(S, 'F03: one runner defect, then pass on attempt 2', ('reviews/F03.md', '## Verdict: needs_changes (one P2, in the suite runner)'),
  ('reviews/F03-attempt2.md', '## Verdict: pass (3 findings, all P3; no P0, P1 or P2)'))
R(S, 'F03: pages pixel-identical before and after the merge (24 of 24)', ('baseline.md', '**Result: 24/24 `identical`, diff 0 %, 24/24 byte-identical'))
R(S, 'F03 accepted at the local-tested stage', ('tasks.json', '"accepted_at_stage": "local_implementation_tested"'))
R(S, 'Checks on integration at e766026, re-run on 30 September, exit 0', ('tasks.json', '"commit": "e766026"'), ('tasks.json', '"driver_exit": 0,'),
  ('evidence/A0-regression-e766026/results.json', '"started_at": "2026-09-30T12:00:20.633Z"'))
R(S, 'Unit tests 13 of 13', ('evidence/A0-regression-e766026/results.json', '"note": "node:test 13/13 passed, 0 failed"'))
R(S, 'Schema tests 244 of 244; validator 361 pass, 0 fail', ('evidence/A0-regression-e766026/results.json', '"note": "node:test 244/244 passed, 0 failed"'),
  ('evidence/A0-regression-e766026/results.json', '"note": "pass: 361  fail: 0  known: 16  info: 2"'))
R(S, 'Runner self-test 13 of 13', ('evidence/A0-regression-e766026/results.json', '"note": "node:test 13/13 passed, 0 failed"', 2))
R(S, 'Page captures 49 of 49, stand-in browser', ('evidence/A0-regression-e766026/results.json', '"note": "playwright: 49 passed; under substitute Chromium 141.0.7390.37'))
R(S, 'A run in the pinned browser is still needed before release', ('decisions.md', 'e2e results are labelled "Chromium 141 substitute"; a CI-equivalent run is needed before release.'))
R(S, 'Publication check passes but empty', ('evidence/A0-regression-e766026/results.json', '"note": "vacuous: 0 articles have status=published, so no GitHub API call is made"'))
R(S, 'Branch protection blocked: no GitHub tool or token here', ('evidence/A0-regression-e766026/results.json', '"reason": "GITHUB_REPOSITORY is not set; the audit needs the repository name and an authenticated gh CLI (gh is also not installed here)"'))
R(S, 'Launch check fails by design: 8 approval flags off; agents never switch them on', ('evidence/A0-regression-e766026/results.json', '"note": "blocked only by 8 approval flag(s) of lib/business.ts'),
  ('decisions.md', '**The launch guard stays closed.** 8 approval flags are false on every branch and `launch:check` blocks by design. Agents never flip them.'))
R(S, 'Accepted = no blocking defect at that stage; not an approval; not live', ('S:01_MASTER_PLAN.md', 'Keep human approvals distinct from technical verification.'),
  ('decisions.md', 'Accepting a task at one stage claims nothing about later stages.'), ('decisions.md', 'a local build is not a live release'))

S = '03 What we found'
R(S, 'main does not build: film/ has 2 lint and 26 type errors; resolved on integration, main still fails',
  ('decisions.md', '**main is not green in clean CI conditions.** Lint (2 errors), typecheck (26 errors) and build fail on main, guide and video, all inside `film/`.'),
  ('baseline.md', '**Resolved on the integration candidate by the baseline choice:**'))
R(S, 'Homepage narration clones a third-party voice saying "I\'m Bill Badran"; film audio free, non-commercial plan',
  ('decisions.md', '`public/audio/journey/en.mp3` on every branch is a clone of a third-party voice speaking as Bill. The film/ voice, music and sfx are ElevenLabs free-plan (non-commercial).'),
  ('inventory.md', '**Chatterbox clone of a third-party `lawyer.wav`, speaking first-person "I\'m Bill Badran"**'))
R(S, 'Kept out of any public build', ('decisions.md', 'None of it enters a public build.'))
R(S, 'Quarantine proposed to Bill (HB-22)', ('blockers.md', '- PROPOSAL: quarantine both audio sets now; use the portrait only after its rights are confirmed; no synthesis.'))
R(S, 'Film: invented client story, unsupported titles, press citations, urgency; never reused',
  ('decisions.md', 'the invented "Nathalie, 54 ans, Laval" story, press citations and urgency framing'))
R(S, 'Site copy makes 8 claims about Bill, held behind approval flags until G1',
  ('decisions.md', 'Site claims C1–C8 (independence, protected title, "more than 15 years", designations, compensation, missing firm disclosure, "In their words" quotes, Ask Bill Q&A) stay behind `approvals` = false until G1.'))
R(S, 'Older copy contradicts the offers (45-minute monthly session, free printed copy); no 15- or 30-minute offer text',
  ('decisions.md', 'Presentation: a 45-minute monthly session, a 7-email automation'), ('decisions.md', 'No 15-minute or 30-minute text exists; the meeting page gives no duration.'))
R(S, 'Superseded; new copy follows the frozen offers', ('decisions.md', 'New copy follows D-001 to D-004; the superseded items are not reused.'))
R(S, 'Code assumes Vercel; inquiry form uses Resend and Upstash; plan stack stands; retirement is your call (HB-06)',
  ('decisions.md', '**The repo\'s stack differs from the plan\'s.**'), ('decisions.md', 'Retiring Resend and Upstash is open (HB-06, HB-27).'))
R(S, 'The only n8n in reach is someone else\'s n8n Cloud; whether one runs on your server is unknown; nothing installed before a read-only look',
  ('decisions.md', '**(a) The connected n8n is n8n Cloud and is not Bill\'s.**'), ('blockers.md', 'if an instance exists, A3 inspects it read-only'))
R(S, 'Three books compete (40-page review PDF, 32-page generator, on-site booklet)', ('decisions.md', '**No canonical book exists.** Three competing artifacts'))
R(S, 'Review protection skips images: portrait and AI cover visible on a hosted preview; no hosted preview until fixed',
  ('decisions.md', '**The review proxy does not protect `/assets/*`.**'), ('decisions.md', 'No hosted preview is exposed until the matcher is fixed or those assets are removed.'))
R(S, 'Publication controls exist but are not enforced; enforced once you name reviewers', ('decisions.md', '**Publication controls exist but are not enforced.** No CODEOWNERS, unprotected branches'),
  ('decisions.md', 'No publication step treats them as enforcing until G2 names reviewers and branch protection.'))
R(S, 'This environment cannot reach Brevo, Supabase, Stripe, Calendly or n8n\'s sites; its browser is a stand-in',
  ('decisions.md', '**The build container cannot reach the providers.** CONNECT 403 for Brevo, Supabase, Stripe, Calendly, docs.n8n.io, docker.n8n.io'),
  ('decisions.md', '**Local e2e evidence uses a substitute browser.**'), ('decisions.md', 'Live provider evidence comes only from authorized staging or an operator'))
R(S, 'Validator failed after the F02 split; fixed by A0 patch 1', ('baseline.md', '`validate.py` exits 1: CX-18 "worker-handoff task_id pattern vs tasks.json: [\'F02a\']"'),
  ('decisions.md', '**Contract set 1.1: worker handoff 1.1 for split tasks (A0 patch 1).**'))
R(S, 'Site lint also reads orchestration files: 22 warnings, 0 errors (latest run)', ('evidence/A0-regression-e766026/02_lint.log', '22 problems (0 errors, 22 warnings)'),
  note='All 22 warnings are in .orchestration/evidence/ scripts (paths in the same log).')
R(S, 'A repo-wide format would rewrite 240 orchestration files; proposals P2, P5 not applied', ('baseline.md', '`npx prettier --check .orchestration` flags 240 files'),
  ('baseline.md', '**P2:** decide whether `.orchestration/**` belongs in the ESLint ignore list'))
R(S, 'No Bill Google account or ad account visible', ('decisions.md', '**No Bill Google account is visible.**'), ('decisions.md', '**No Bill advertising account is visible**'))

S = '04 The plan'
R(S, 'Purpose: held, relevant retirement conversations, then relationships where the fit is mutual', ('S:01_MASTER_PLAN.md', 'Its purpose is to produce held, relevant retirement conversations, followed by mutually appropriate client relationships.'))
R(S, 'Brand line and underlying idea (creative direction, not trademark clearance); navy ink on warm paper, ordinary life',
  ('S:01_MASTER_PLAN.md', 'The brand line is **Build a Better Retirement Together**.'), ('S:01_MASTER_PLAN.md', 'navy ink on warm paper, professional editorial drawings, clear questions, ordinary life'))
R(S, 'Workshop Journey description', ('S:01_MASTER_PLAN.md', '- **Workshop Journey:** a custom, asynchronous, four-part exercise.'))
R(S, 'The numbers a visitor types never leave their browser; no AI talks to visitors', ('S:01_MASTER_PLAN.md', 'Financial figures stay local in the workshop. No live LLM advises a visitor.'))
R(S, 'Crossroads description; on Google Meet', ('S:01_MASTER_PLAN.md', '- **Retirement Crossroads Challenge:** a live, Bill-hosted game show'),
  ('S:01_MASTER_PLAN.md', 'the ten-case Retirement Crossroads Challenge on Google Meet'))
R(S, 'The four offers as frozen', ('S:01_MASTER_PLAN.md', '| Free PDF | The approved digital retirement book |'),
  ('S:01_MASTER_PLAN.md', '| Free introduction | 15 minutes with Bill, one question, online or in person |'),
  ('S:01_MASTER_PLAN.md', '| Physical book | A paid printed book **including one 30-minute consultation**, online or in person |'),
  ('S:01_MASTER_PLAN.md', '| Continued work | A discussion of scope, fees and next steps if the fit is mutual |'))
R(S, 'Offer statuses: no approved edition; weekly slots and room; no price; public wording needs G1',
  ('blockers.md', 'The free PDF and the paid book both need one approved file (D-054).'),
  ('decisions.md', 'In person is offered only once Bill\'s location and room are confirmed (HB-16).'),
  ('decisions.md', '**No price exists anywhere** (F00 gap matrix, "book terms": blocked_human). No price is proposed here.'),
  ('decisions.md', 'final public wording needs G1 and an exact-hash G3'))
R(S, 'Every relevant page can lead straight to the 15-minute meeting', ('decisions.md', 'Every relevant page can lead straight to the 15-minute meeting. Nobody must watch a webinar, finish the workshop or buy the book before asking Bill a question.'))
R(S, 'System map legend (site on the existing server; Supabase Free; self-hosted n8n; Brevo Free; Google calendar and Calendly; Stripe; recordings; backups)',
  ('S:01_MASTER_PLAN.md', '| Application hosting | Reuse the existing VPS for the no-new-host-subscription route |'),
  ('S:01_MASTER_PLAN.md', '| Database | Supabase Free for minimal operational records |'),
  ('S:01_MASTER_PLAN.md', '| Email | Brevo Free; n8n schedules, Brevo delivers |'),
  ('S:01_MASTER_PLAN.md', '| Scheduling | Existing Calendly stays working during build'),
  ('S:01_MASTER_PLAN.md', '| Book payments | Hosted Stripe checkout |'),
  ('S:01_MASTER_PLAN.md', 'store versioned approved masters in owner-controlled storage'),
  ('S:01_MASTER_PLAN.md', 'and encrypted off-host copy.'), note='Objects of the system-map drawing: briefing/ASSETS.md; labels as in briefing/CLAIMS.md C06-2 to C06-6.')
R(S, 'Ways in lead to the 15-minute conversation; the book carries its own 30-minute consultation',
  ('S:01_MASTER_PLAN.md', '- Fifteen-minute meeting page and provider handoff.'), ('B:CLAIMS.md', 'The book is deliberately not on this path'))
R(S, 'Build loop: bounded task, build, test, verify, at most two repairs then split/simplify/block, integrate, record',
  ('S:01_MASTER_PLAN.md', 'Run this loop: select a ready task'), ('S:01_MASTER_PLAN.md', 'Maximum: one initial implementation plus two repair attempts per task.'))
R(S, 'By rule one director and at most three specialists at once, verifier included', ('S:01_MASTER_PLAN.md', 'Start with one director and at most three active specialist sessions, including the verifier when it runs.'))
R(S, 'Operating loop: n8n sends registrations, reminders, receipts; weekly article loop; no agent decides for a client or changes ad spend',
  ('S:01_MASTER_PLAN.md', '**Loop B — the operating loop.**'))
R(S, 'Agent roles: does and cannot', ('S:01_MASTER_PLAN.md', '| **A0 Director / integrator** |'), ('S:01_MASTER_PLAN.md', '| **A6 Independent verifier / red team** |'))
R(S, 'Seven gates: who, what is recorded, what it unlocks', ('S:06_HUMAN_GATES_AND_RUNBOOK.md', '| G0 | Arnaud + Bill where relevant |'),
  ('S:06_HUMAN_GATES_AND_RUNBOOK.md', '| G6 | Arnaud/Bill as appropriate |'))
R(S, 'A chat yes never approves copy, calculations or media: H00 packet with name, date, hash',
  ('blockers.md', '**Approvals of final copy, calculations or media** (G1, G3, G4) are not given by a chat "yes".'))

S = '05 Infrastructure'
R(S, 'Existing server: exists but not inspected; owner you; existing cost to confirm; inspect read-only first',
  ('inventory.md', '**Not probed or not visible:** the VPS and its reverse proxy'), ('costs.json', '"id": "vps_increment",'),
  ('decisions.md', 'nothing is installed over it before A3\'s read-only inspection'))
R(S, 'The site is a bilingual Next.js app', ('inventory.md', '| Branded bilingual site (Next 16.3.6, React 19.2.4) |'))
R(S, 'The site exists as code on integration; not deployed', ('tasks.json', '"branch": "integration",'), ('blockers.md', 'None of it deploys, sends, buys or publishes.'))
R(S, 'n8n self-hosted: licence fee 0, terms to verify; lost key makes credentials unusable',
  ('costs.json', '"licence_status": "to_verify:'), ('S:01_MASTER_PLAN.md', 'Losing it makes stored credentials unusable even when the database backup survives.'))
R(S, 'Supabase Free: no project yet; pauses after a week idle, no backups; our backup covers it',
  ('costs.json', 'No project exists yet.'), ('decisions.md', 'pausing after about 7 days of low activity, no included automatic backups. Our own encrypted off-host backup covers the gap (P04).'))
R(S, 'Brevo Free: 300 sends a day shared; MX untouched', ('decisions.md', '300 sends/day shared by transactional and marketing traffic'),
  ('blockers.md', '- PROPOSAL: leave the current mail provider and MX untouched.'))
R(S, 'Google account: edition unknown; Meet limits depend on edition; Workspace only if short',
  ('blockers.md', "- Why: Meet's participant limit, recording and polls depend on the edition (D-022)."),
  ('costs.json', 'Buy only if HB-14 shows the existing entitlement is insufficient.'))
R(S, 'Calendly exists; meeting lengths unverified', ('decisions.md', '**Calendly exists and stays live.**'), ('decisions.md', 'Their durations and plan tier are not verified'))
R(S, 'Stripe hosted checkout, test mode first; paid only on the signed message', ('decisions.md', 'Hosted Stripe Checkout. Never build card handling. Payment truth is the verified signed webhook, not the return page.'))
R(S, 'Video host not chosen; after real file sizes', ('decisions.md', '**The origin is not selected**: it is chosen after real encode sizes give bitrate × viewers (MED02).'))
R(S, 'Off-server backups: 14 nightly encrypted sets; destination unknown; existing storage preferred',
  ('S:01_MASTER_PLAN.md', '14 successful daily snapshots, and encrypted off-host copy'), ('costs.json', '"note": "Destination unknown (HB-10). An existing owner-controlled storage is preferred; buying one needs a G2 cap."'))
R(S, 'GitHub exists, private; controls not enforced until HB-11', ('costs.json', '"item": "GitHub repository hosting and Actions minutes (arnaudverdier8-svg/bill, private)",'))
R(S, 'Domain and mailbox exist; not migrated or changed', ('costs.json', 'Provider unknown (HB-05). Not migrated or changed by this project.'))
R(S, 'Owners "Bill or firm (proposed)"', ('blockers.md', '(a) yes: free tiers and Stripe test mode, each opened by its named owner (Bill or the firm), who keeps the login.'))
R(S, 'Deliberately not used list', ('S:01_MASTER_PLAN.md', 'Do not resurrect Zoom, n8n Cloud, the one-hour book offer, a custom video platform, or Vercel Hobby for commercial production.'),
  ('decisions.md', '**Anti-overengineering.** No new CRM, custom email server'), ('decisions.md', 'No new work extends Resend or Upstash.'))

S = '06 Money'
R(S, 'What a pilot needs; Workspace comes back as one line for a yes or no',
  ('blockers.md', 'the director comes back with one Workspace line item (tier, seats, the price shown at Bill\'s own checkout) for an explicit yes/no; nothing is bought under a 0 cap.'))
PP = 'B:data/published-prices.json'
R(S, 'Workspace Business Standard USD 14.00 annual / 16.80 flexible per user per month [unverified]', (PP, '"price": "14.00 (annual commitment) / 16.80 (Flexible)",'))
R(S, 'Starter USD 7.00 / 8.40 [unverified]', (PP, '"price": "7.00 (annual commitment) / 8.40 (Flexible)",'))
R(S, 'Meet for 150 with recording (Standard); 100, no recording (Starter) [unverified]', (PP, '"price": "Starter: 100 participants, no recording; Standard: 150 participants, with recording",'))
R(S, 'Workspace in CAD from a reseller page [unverified]', (PP, '"price": "Starter 9.20 (annual) / 11 (Flexible); Standard 18.40 (annual) / 22 (Flexible)",'), (PP, '"url": "https://northstarit.ca/learn/google-workspace-pricing-canada/",'))
R(S, 'Supabase Pro from $25 per month + usage (USD), one project on Micro compute [fetched]', (PP, '"price": "From 25",'), (PP, '"unit": "per month (organization), includes one project on Micro compute",'))
R(S, 'Brevo Starter from USD 9 per month (5,000 emails) [unverified]', (PP, '"price": "From 9 (5,000 emails/month tier)",'))
R(S, 'Vercel Pro USD 20 per paid seat per month with USD 20 usage credit [unverified]', (PP, '"unit": "per paid seat (Owner/Member) per month; includes $20 monthly usage credit",'))
R(S, 'Remotion: free up to 3 people; needed at 4+; USD 25 per seat per month [fetched]', (PP, '"price": "Free for individuals and for-profit organizations with up to 3 employees;'),
  (PP, "'Required for collaborations and companies of 4+ people'"))
R(S, 'n8n Cloud Starter $20 per month billed annually, 2,500 executions [unverified]', (PP, '"unit": "per month, 2,500 workflow executions",'), (PP, '"billing": "billed annually",'))
R(S, 'Backblaze B2 USD 6.95 per TB per 30 days, example [unverified]', (PP, '"price": "6.95",'), (PP, '"unit": "per TB per 30 days",'))
R(S, 'Hetzner BX11 EUR 3.20 per month excl. VAT, EU, example [unverified]', (PP, '"price": "3.20 (excl. VAT); about 4.00 incl. VAT",'))
R(S, 'Cloudflare R2 USD 0.015 per GB-month; egress free; 10 GB-month free, example [fetched]', (PP, '"price": "0.015 per GB-month storage; egress free; first 10 GB-month free",'))
R(S, 'Bunny Stream storage 0.01/GB/region; delivery 0.005/GB (Volume tier); 1 minimum, example [unverified]', (PP, '"price": "Storage 0.01 per GB per region; delivery Volume tier 0.005 per GB'))
R(S, 'Retrieved 30 September 2026; list prices, not quotes; taxes extra; fetched vs snippet-only', (PP, '"retrieved": "2026-09-30",'),
  ('B:data/published-prices.md', 'These are list prices, not quotes, and exclude GST/QST.'))
R(S, 'Stripe Canadian card 2.9% + CA$0.30; international +0.8%; conversion +2%; no monthly fee [unverified]', (PP, '"price": "2.9% + 0.30",'),
  (PP, '"price": "+0.8%",'), (PP, '"price": "+2%",'), (PP, '"quote": "Stripe does not charge setup fees, monthly fees'))
R(S, 'Printing and shipping: quote needed (HB-20); taxes: Bill with his accountant', ('costs.json', 'Printer, print proof and unit cost unknown.'),
  ('costs.json', '"owner": "Bill (with his accountant)",'))
R(S, 'Book price: none exists or is proposed; first batch proposed at 8 bundles', ('costs.json', '"value": 8,'), ('costs.json', 'No price is proposed.'))
R(S, 'Ad test needs a real Bill ad account, a rules check, your limit (G2) and scope (G6); ads limit stays 0',
  ('decisions.md', '**No Bill advertising account is visible** (2 unrelated CAD Meta accounts). → Ads stay blocked and the ad cap stays 0.'),
  ('costs.json', '"confirm_by": "Arnaud (G2 cap) and G6 scope, after ADS01 account/category verification",'))
R(S, 'Meta recommended start "at least $5" a day over more than six days [unverified]', (PP, '"price": "Recommended start \'at least $5\' per day over more than 6 days'))
R(S, 'Existing costs to confirm (HB-08 b); "don\'t know" is fine; build assistant from your own invoice',
  ('blockers.md', '- (b) For `costs.json` (01 §17 real cost sheet; 06 handover renewals)'), ('costs.json', "it is Arnaud's build-time subscription, recorded from its own invoice"))
R(S, 'Not priced yet: video host traffic, weekly-draft model API (limit 0), book printing', ('costs.json', '"id": "media_storage_egress",'),
  ('costs.json', '"note": "Cap 0. N08 can be built and tested with fixtures; a live paid run needs a recorded cap."'), ('costs.json', '"id": "book_printing",'))
for rid, work in [('wf_5bb05036-e58', 'F00'), ('wf_1e398e6e-3ba', 'F01, F02'), ('wf_31fbf929-015', 'F03, F02a'), ('wf_cc398756-8c2', 'A0 patch 1, F02a'),
                  ('wf_f0daf97f-ca5', 'briefing prep'), ('wf_53283c8e-d09', 'briefing resume')]:
    d = json.load(open(f(f'runs/{rid}.json')))
    R(S, f"Run {rid} ({work}): {d['agents']} agents, {d['subagent_tokens']:,} tokens, {d['wall_time_s']:,} s",
      (f'runs/{rid}.json', f'"subagent_tokens": {d["subagent_tokens"]},'), (f'runs/{rid}.json', f'"wall_time_s": {d["wall_time_s"]},'))
R(S, 'The runs used your existing build-assistant subscription', ('costs.json', '"item": "Build-time coding assistant sessions (existing authorized subscription)",'),
  ('costs.json', '"cost_item": "build_assistant_existing",'))

S = '07 Time'
R(S, 'Add the operator\'s public SSH key yourself; owners open their own accounts', ('blockers.md', "For access, you add the operator's **public** SSH key on the server yourself."),
  ('blockers.md', 'Agents do not sign up on anyone\'s behalf.'))
R(S, 'Moderate Crossroads: chat, guests, technical problems', ('S:01_MASTER_PLAN.md', 'Bill hosts; Arnaud moderates chat, admits guests and handles technical problems.'))
R(S, 'Watch operations during the pilot', ('S:06_HUMAN_GATES_AND_RUNBOOK.md', '**During the pilot.** Arnaud watches the operations list, provider errors and inbox.'))
R(S, 'Crossroads one pilot then monthly if justified, plus rehearsal; a weekly voice note; drafts to review',
  ('S:01_MASTER_PLAN.md', 'Rehearse against a clock.'), ('S:01_MASTER_PLAN.md', "Weekly pipeline: real question → Bill's short non-identifying voice note"),
  ('decisions.md', 'Scripts stay drafts until Bill approves and records them.'))
R(S, 'Reviewer: named in HB-21; 6 questions HB-24 to HB-29; approves exact versions (G1, G3) and privacy (G5)',
  ('blockers.md', '## 3. Reviewer and privacy owner'), ('blockers.md', '**HB-24. Offer wording** (G1)'), ('blockers.md', '**HB-29. Testimonials and review requests** (G1, G3)'))
R(S, 'Recording and event time not estimated; no source gives reviewer time', ('costs.json', 'Recording and event time are not estimated.'),
  note='Checked: grep -rn "hour\\|minutes" over .orchestration/*.md and source/ finds no estimate of reviewer time.')
R(S, 'Recording arithmetic: 12 clips 8 min 45 s to 12 min 30 s; 18 capsules 13 min 30 s to 22 min 30 s; both languages 44 min 30 s to 70 min',
  ('B:CLAIMS.md', '| **Workshop clips, 12** | | **525 s (8 min 45 s)** | **750 s (12 min 30 s)** |'),
  ('B:CLAIMS.md', '| Social capsules S01–S18 | 18 × 45–75 s | 810 s (13 min 30 s) | 1,350 s (22 min 30 s) |'),
  ('B:CLAIMS.md', 'if Bill records English and French, the total is 2,670–4,200 s = 44 min 30 s to 70 min'))

S = '08 Timeline'
R(S, 'Finishing wave 0; hosting choice waits for HB-01, server inspection for HB-02', ('B:CLAIMS.md', '| C12-1 | B12 title: "Where we are: finishing wave 0." |'),
  ('blockers.md', '- Blocks: final selection in P00; live parts of P03, P04, N09; L06.'))
R(S, 'Waves 0 to 5', ('S:01_MASTER_PLAN.md', '**Wave 1 — a usable design slice and operating foundation.**'),
  ('S:01_MASTER_PLAN.md', '- A1: one real workshop screen with its first ink illustration'), ('S:01_MASTER_PLAN.md', '- A3/A4: local infrastructure configuration, schema, email/booking adapter contracts and dry-run providers.'), ('S:01_MASTER_PLAN.md', '**Wave 2 — build the full paths.**'),
  ('S:01_MASTER_PLAN.md', '**Wave 3 — review, recording and provider tests.**'), ('S:01_MASTER_PLAN.md', '**Wave 4 — Friday pilot gate.**'),
  ('S:01_MASTER_PLAN.md', 'Complete the entire 18-script/36-piece content bank'))
R(S, '90 days: weekly checks, one article and two social pieces, one change at a time; cadence proposed', ('S:01_MASTER_PLAN.md', '5. Change one variable in the current weakest stage'),
  ('S:01_MASTER_PLAN.md', 'one article/week; two social videos/week'))
R(S, '26 of 36 capsule pieces over 90 days, 10 in reserve', ('S:05_CONTENT_AND_ART_BRIEFS.md', 'Publish 26 pieces in the first 90 days'))
R(S, 'Reviews at days 30, 60, 90', ('tasks.json', '"title": "Review cohorts, economics and capacity at days 30/60/90",'))
R(S, 'Success is meetings held, not clicks', ('S:01_MASTER_PLAN.md', 'Open/click counts are supporting signals, not proof of understanding or commercial value.'))
R(S, 'At most three at once', ('decisions.md', '**Concurrency.** One director and at most three active workers, the verifier included'))
R(S, 'The invited pilot needs G0, G1, G3, G4, G5, G6', ('S:TASK_LEDGER.md', '- gates: G0, G1, G3, G4, G5, G6'))
R(S, 'A controlled pilot means (definition)', ('decisions.md', '**Friday October 2 means a controlled pilot, not the full scope.**'))

S = '09 Your decisions'
R(S, 'How to answer (one reply, "Proposal OK", "Don\'t know yet", non-secret, personal data, secrets, approvals)',
  ('blockers.md', '1. Reply to the director (A0) once, item by item, using the HB numbers.'), ('blockers.md', '2. **Non-secret answers**: reply to the director.'),
  ('blockers.md', '3. **Personal data** (such as tester email addresses): reply to the director.'), ('blockers.md', '4. **Secrets** (passwords, API keys, tokens, private keys, card numbers): **never in chat**.'))
R(S, 'Friday codes HARD, REHEARSAL, LATER', ('blockers.md', '- **HARD**: the controlled invited pilot (L05) cannot run without this.'), ('blockers.md', '- **REHEARSAL**: needed even for a meaningful protected rehearsal of that path.'),
  ('blockers.md', '- **LATER**: not needed for Friday October 2.'))
for hb, prop in [('HB-01', '- PROPOSAL: the existing VPS.'), ('HB-02', "- PROPOSAL: none for the facts."), ('HB-03', '- PROPOSAL: A as the technical integration baseline'),
                 ('HB-04', '- PROPOSAL: none (a content choice).'), ('HB-05', '- PROPOSAL: leave the current mail provider and MX untouched.'),
                 ('HB-06', '(a) yes: free tiers and Stripe test mode'), ('HB-07', '- PROPOSAL: one named operator, with Bill as the account owner. No tool is proposed.'),
                 ('HB-08', '- PROPOSAL: keep all three caps at 0 through the pilot.'), ('HB-09', '(a) a short list of inboxes you control, plus at least one consenting outside tester.'),
                 ('HB-10', '- PROPOSAL: Arnaud deploys and operates, and Bill is kept informed.'), ('HB-11', '- PROPOSAL: protect the canonical branch after F03.'),
                 ('HB-12', '- PROPOSAL: exclude both from the production build and deploy artifact, and keep them in git.'),
                 ('HB-13', '- PROPOSAL: no ads and no automated posting during the pilot')]:
    R(S, f'{hb}: question, proposal, Friday effect, how to answer', ('blockers.md', f'**{hb}.'), ('blockers.md', prop))
R(S, 'HB-09 (b) HARD on the task graph; bot token never in chat', ('blockers.md', '(b) HARD on the task graph'), ('blockers.md', 'The Telegram bot token and the SM02 webhook secret → never in chat'))
R(S, 'Bill\'s items that need you (HB-14 to HB-20)', ('blockers.md', "- PROPOSAL: use your existing account if it can host the pilot; nothing is bought before this is checked (HB-08)."),
  ('blockers.md', 'Retire any 60-minute introduction.'), ('blockers.md', 'No replay for the pilot unless you approve the recording (G4)'),
  ('blockers.md', '- PROPOSAL: drafts in English and natural Quebec French; record and publish only the languages you record.'),
  ('blockers.md', '- PROPOSAL: the interview as soon as possible, since it needs no script.'), ('blockers.md', '**No price is proposed.**'),
  ('decisions.md', '| Bill and Arnaud (HB-20); terms also G1/G5 |'), ('decisions.md', '| Bill and Arnaud (HB-17) |'), ('decisions.md', '| Arnaud and Bill (HB-18) |'))
R(S, 'HB-21: claims stay pending; naming the reviewer unlocks HB-24 to HB-29 and G1/G3', ('blockers.md', '- PROPOSAL: until confirmed, drafts mark these claims as pending G1, and none goes public.'),
  ('blockers.md', 'Once named in HB-21.'))
R(S, 'Where each secret goes', ('blockers.md', '| n8n encryption key | HB-02 (b), HB-06, HB-07 |'), ('blockers.md', '| GitHub token for CI | HB-11 | A GitHub repository secret | Repository owner |'),
  ('blockers.md', '| Backup encryption key or passphrase | HB-10, P04 |'))

S = '10 Risks and controls'
R(S, 'Protected-rehearsal rule; no stand-in as live Bill; no unapproved book; no faked success', ('decisions.md', 'No stand-in presented as live Bill, no unapproved book, no faked success.'))
R(S, 'No synthesis without consent; ink drawings only', ('decisions.md', 'No voice clone or avatar of Bill without his specific consent.'), ('blockers.md', 'Do you consent to any voice synthesis? (Default: no.)'))
R(S, 'Workshop figures never leave the browser (not links, analytics, email, n8n, Supabase, ads, AI prompts)',
  ('decisions.md', 'Not in URLs, cookies, analytics, error reports, logs, email, n8n, Brevo, Supabase, ad platforms or LLM prompts.'))
R(S, 'Existing n8n key backed up off-server before any credential', ('S:01_MASTER_PLAN.md', 'Back it up outside the VPS, separately.'))
R(S, 'Regional checkout is the price that counts', ('costs.json', '"Regional checkout is the price source of truth; some Google pages display USD for a Canadian link (07 S4).",'))
R(S, 'Approvals bind the exact file (G3)', ('decisions.md', 'Approvals bind exact hashes: G3 is asset-scoped'))
R(S, 'Capsules: voice pass and G1/G3 review before recording', ('decisions.md', 'Before C10 records anything, the scripts get a voice pass against C00\'s interview and a G1/G3 review.'))
R(S, 'At most three attempts per task', ('decisions.md', 'Maximum 3 attempts, then split, simplify or block with an owner decision.'))
R(S, 'Pass, fail, blocked or not run; a timeout is never a success', ('decisions.md', 'Checks are pass, fail, blocked or not_run.'), ('decisions.md', 'A timeout, missing tool or missing approval never becomes success.'))
R(S, 'No DNS or MX change without a recorded authorization; proposed: only Brevo DKIM after review',
  ('decisions.md', 'No public deploy, purchase or subscription, real marketing send, publication, card charge, paid ad, DNS, MX or firewall change'),
  ('blockers.md', 'After review, add only Brevo\'s DKIM record, and review SPF and DMARC alignment.'))
R(S, 'Planned: nightly encrypted backups and a restore drill (P04)', ('S:TASK_LEDGER.md', 'Implement and prove backup/update/isolated restore routines'))
R(S, 'Never fake traffic', ('costs.json', '"never": "Run fake traffic to evade inactivity policies, or split accounts to evade quotas."'))

S = '11 Where everything lives'
R(S, 'Branches and heads (integration e766026 and orchestration f3cbc0c on origin; briefing 3df1fe5 local, f104e18 on origin)', note='git branch -a -vv, read 30 September 2026; output in the "git" block below.')
R(S, 'Draft PR #1 from codex into add-ask-bill-section', ('inventory.md', '- **PR #1** is open, a **draft** and unmerged'))
R(S, 'Homepage and presentation kept, not merged', ('decisions.md', 'homepage (design conflict, HB-03) and presentation (internal pitch with superseded offers, HB-12) stay preserved, unmerged'))
R(S, 'The briefing film: 6 min 59 s, English, no audio', ('B:README.md', '6:59.0 (12,570 frames)'))
R(S, 'Glossary: Brevo free up to 300 emails a day', ('S:01_MASTER_PLAN.md', 'Brevo Free currently allows 300 sends/day'))
R(S, 'Glossary: RLS, browsers cannot read leads', ('decisions.md', 'Explicit RLS and grants; browsers cannot read leads, orders, consent or jobs'))

# ------------------------------------------------------------------ write
out = []
out.append('# CLAIMS — the operator briefing PDF, statement by statement\n')
out.append('Every factual or numeric statement in `docs/arnaud/operator-briefing.md` (printed as '
           '`arnaud-operator-briefing.pdf`) maps to a source line and a verbatim excerpt. Generated by '
           '`python3 docs/arnaud/make_claims.py`, which finds each line number from the excerpt and fails if an excerpt is '
           'missing, so the table cannot drift silently. Files were read on 30 September 2026.\n')
out.append('- `.orchestration/` = `/home/user/bill/.orchestration` (live working tree, branch `claude/orchestration-foundation` '
           'at `f3cbc0c`); `01-07/` = `.orchestration/source/`; `briefing/` = this package.')
out.append('- Prices come only from `briefing/data/published-prices.json` (retrieved 2026-09-30). `fetched` = the vendor\'s own '
           'public source file on GitHub; `snippet-only` = a search summary, printed `[unverified]`, confirm at checkout.')
out.append('- The five-decision ranking on page 3 is our reading of the Blocks/Friday lines, and is labelled so.')
out.append('- Statements deliberately not made: no professional claim about Bill (designations, title, affiliation, '
           'experience: pending G1); no book price; no approval, deployment, send or purchase; no photo, voice or likeness.\n')
out.append('## 1. Computed figures\n')
out.append('| Figure | Value | How |')
out.append('|---|---|---|')
for a, b, c in computed:
    out.append(f'| {esc(a)} | {esc(b)} | {esc(c)} |')
out.append('\n## 2. Statements\n')
out.append('| # | Section | Statement | Source | Verbatim excerpt |')
out.append('|---|---|---|---|---|')
n = 0
for sec, stmt, srcs, note in rows:
    n += 1
    locs, exs = [], []
    for rel, needle, nth in srcs:
        loc, ex = cite(rel, needle, nth)
        locs.append(loc)
        exs.append('"' + esc(ex) + '"')
    exc = '; '.join(exs) + (f' — {esc(note)}' if note else '')
    out.append(f'| {n} | {esc(sec)} | {esc(stmt)} | {"; ".join(locs) or "—"} | {exc or esc(note)} |')
out.append('\n## 3. git (branches), read 30 September 2026\n')
out.append('```')
out.append('\n'.join(l[:150] for l in git.strip().split('\n')))
out.append('```')
open(os.path.join(HERE, 'CLAIMS.md'), 'w').write('\n'.join(out) + '\n')
if missing:
    print('MISSING needles:\n  ' + '\n  '.join(missing))
    sys.exit(1)
print(f'CLAIMS.md: {n} statements, {len(computed)} computed figures')
