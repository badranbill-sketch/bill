# A6 review: A0 patch 1 (contract set 1.1, D-074), repair attempt 2

- Reviewer: A6 independent verifier, fresh context (attempt 2 of 3). Technical verification only; this is not a professional or human approval, and no G0–G6 gate is recorded by it.
- Repo `/home/user/bill`, branch `claude/orchestration-foundation`, HEAD `d1a37cf3c17953529774e7801af8f0c16eedb925`. The patch is uncommitted (11 modified files under `.orchestration/`, plus untracked `evidence/A0-patch-1/` and `reviews/A0-patch-1.md`).
- Date (UTC): 2026-09-30, review finished ~11:56Z.
- Scratch (everything I ran or mutated): `/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6-a0p-2/` (referred to below as `$S`). I wrote nothing else in the repo; `git status --porcelain --untracked-files=all | md5sum` was `dea09805496eba81d185813fe5add857` before and after my runs.
- Venv: `$VENV=/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-f02` (Python 3.11.15, jsonschema 4.26.0; existing). Every run used `PYTHONDONTWRITEBYTECODE=1`.

## Verdict: pass (no P0, P1 or P2; two P3)

- Contract set is consistently 1.1. Only worker handoff moved to 1.1. The change log (README §3a) and D-074 record it.
- The `task_id` pattern accepts F02a and rejects F02b, F99, f00, F00x and W99. Over 327,600 candidate IDs it accepts exactly the 63 IDs of `tasks.json`.
- No formula, rule or field changed in `workshop-math.md`, `workshop-inputs.md`, the workshop schema or any existing fixture. Every fixture byte equals HEAD. The only schema change is worker handoff: `$id`, title, description, and `F02a` added to the pattern.
- The WM37–WM40 rows match the fixture files, and so does the list of their negative controls, which I re-ran.
- `validate.py` exits 0: `pass: 361 fail: 0 known: 16 info: 2`, and it prints no "unexpected results" section. Every check that HEAD runs still runs, and NC-1..NC-14 are unchanged. The checks that changed were rewritten to allow per-contract versions and registered CX-29 records, and none accepts more than the change needs.
- The negative controls fire, both inside the harness and on 16 mutated copies of the contracts, 5 mutated full-repo copies and 4 mutated harness copies.
- Against the 1.1 schema, F02, F02a and F03 are valid. F00 has the same 6 errors it has under 1.0 (XL-14, KNOWN, not caused by this patch).
- The F01 document fixes are present and truthful: no amount was invented, every cap is still 0 and no secret is requested.
- Attempt 1's P2 (A0P1-A6-P2-1) is closed, and so are its four P3s.

## Artifacts reviewed (sha256 at review time)

```
0549f01ca4446bea57fe7e7025c02c668a1e9eec6efc7b6b0702a8c5c919d789  .orchestration/contracts/README.md
55352551226b44ff824126961dab1eeb75baed0b2908b1b808a2774a94236975  .orchestration/contracts/validate.py
11853fe1551f6e69f765ab13bb5878f246ea196692295e1719c04e95666c831d  .orchestration/contracts/worker-handoff.schema.json
2a5f7b4482e8aa83e842f7ce2f1e2b46320d7272ec6bad3334430d36971cdc1c  .orchestration/contracts/approval-scopes.md
4c93d741f40096aae7f0f8c9a2ce2e7367509714aa9b09b61acb0cabb9dca9c0  .orchestration/contracts/examples/invalid/worker-handoff/unknown-task-id.why.txt
c14827049b66d98ab79eba862d08531078a88898cf2851e0995009d47dafa53c  .orchestration/contracts/workshop-math.md
a0fd5cee7e7e0c8366d65eee128f83836db2a535a4576a4b0bd560a74902a021  .orchestration/decisions.md
1eff5aedf7a03c3ea867555feee733b8ca97e44dbf31b8b767e688fec5ca095a  .orchestration/blockers.md
52ae5849044bd2aa8cb3143122223aa51f5d3e29a4ff7fd6b23d4fa7012b090d  .orchestration/costs.json
d0b6d93c4a8f13a2e568eb92fbbae93385e5b52e0767fd87933c087e385c1d71  .orchestration/evidence/F02/offers/gen_offers.py
f99e7300d64f2ebb2f5395611412f93e8d83b3f1509080fa7256c75c1b7f294f  .orchestration/evidence/F02/offers/validate_offers.py
4eb22f88d3f9256a6ee20b309a477c44890f78790b58c71d80f5c6577b0b38a3  .orchestration/evidence/F02a/after-hashes.log
bc80f539dc5c73809610d4bba7f3de002383889860bdfb3e57280c0d03402b05  .orchestration/evidence/A0-patch-1/math-bundle.sha256.log
e838813371b9684567d4f918ce4411fb515a051deb8a1b4cf486cfc7ee304985  .orchestration/evidence/A0-patch-1/worker-handoff-1.1.sha256.log
8677b62d5d604459ee29e6d74a610a7a43603766c26191e9eb24606015131a44  .orchestration/evidence/A0-patch-1/make_records.sh
fffb18d5b85738752a26f93d1d432b09fdc0eb6f39d39e6e04ed11ae07dec306  .orchestration/evidence/A0-patch-1/MANIFEST.sha256
890e4e2d1d8d1258d60b404ede844ea5a1ed08105dfb5fb57bb5e18a33016b95  .orchestration/evidence/A0-patch-1/patch.diff
dab1a4be4508a058b972fea436b8b06df4264a5b15517e814b6d1fa2c7fd5aad  .orchestration/handoffs/F00.json
d6081f7cca8aad56292934face8e61eb2a7cb39b679cdcfaac5d61f74eb9da8a  .orchestration/handoffs/F02.json
d04c6944a8cf3db7735a43a923a26d0297f160b5d8e8d660b005e221c8aa6e00  .orchestration/handoffs/F02a.json
4dafb967750efccf3db6e2c98229e4bd37cec45f9263aeaed2b1c87d43f2ad8c  .orchestration/handoffs/F03.json
```

Since attempt 1's review, these files changed: `README.md`, `validate.py`, `decisions.md`, `blockers.md`, `make_records.sh` and `MANIFEST.sha256`. The schema, `approval-scopes.md`, `workshop-math.md`, `costs.json`, the two offers scripts and both A0 records are byte-identical to what attempt 1 reviewed. So the records were not regenerated.

## Method, exact commands and results

The before state comes from a local clone at HEAD (`git clone /home/user/bill $S/headclone`, origin refs fetched, `git checkout d1a37cf`). The original repo was only read.

### 1. Full harness, before and after

```
cd $S/headclone && $VENV/bin/python .orchestration/contracts/validate.py > $S/head.log   -> exit 1
  pass: 353  fail: 4  known: 16  info: 2
  FAIL CX-18 ... ['F02a'];  FAIL CX-21 ... fixture count vs 40;  FAIL CX-29 math ... index.json;  FAIL handoffs/F02a.json ... pattern@/task_id
cd /home/user/bill && $VENV/bin/python .orchestration/contracts/validate.py > $S/after.log   -> exit 0
  pass: 361  fail: 0  known: 16  info: 2   (no "unexpected results" section; same 16 KNOWN items)
```

**Check list, before vs after.** I took each labelled result line, stripped the bracketed notes and details, replaced digits with N, then sorted and compared (`comm`). HEAD has 359 labels and the patch has 363.
- Only at HEAD: the three CX-29 labels, CX-18 and CX-01. Each is present after with a reworded label.
- Only after: those five rewordings, plus NC-15, NC-16, NC-17 and NC-18.

No check disappeared. 353 + 4 + 4 = 361: the four failures now pass, and four controls were added.

**How the changed checks read, from `git show HEAD:.orchestration/contracts/validate.py` against the working tree** (`$S/a6-validate.diff`):
- **S2, S4, S5, CX-01.** `SET_VERSION` is replaced by `CONTRACT_VERSIONS[name]`.
  - The `$id` check is now an exact match. It used to be `endswith`.
  - New checks: schema titles, the set version must be the highest contract version with one major, and index rows that name a schema, registry or `workshop-math.md` must state that contract's version.
  - Mixed versions are required by README §3 rule 2 ("Unchanged contracts keep their version").
- **CX-18.** The candidate set now includes every ID with a lowercase suffix. `tasks.json` IDs must be planned IDs or recorded splits (`split_from`), and malformed IDs are refused. This is stricter.
- **CX-21.** Adds the §10 range, the §10 table and the README row-14 range. This is stricter.
- **CX-29.** A lane-log drift is excused only by a registered record that meets all of these:
  - its bytes equal the sha256 pinned in `LANE_LOG_RECORDS`;
  - it lists the file in its `changed` list;
  - it holds the file's current sha256.
  - Whole-bundle records must match on every line, but their other lines supersede nothing.
  - A new coverage rule fails any WM fixture, or any offers-lane file, that has no recorded hash. This is new and stricter.
  - The only way to excuse a drift is an explicit, reviewable edit of `validate.py`. The mechanism is needed so the historical lane logs are never rewritten.
- **Handoff `contract_version`.** HEAD accepted {1.0}; the patch accepts {1.0, 1.1}. The added value is exactly the new version. Keeping 1.0 is the rule-4 exception, which the README now states.
- **NC-1..NC-14.** Their code is unchanged: the only s8 hunk adds lines after NC-14.

### 2. Task ID pattern (ECMA-translated `validate.ecma_re`, plain `re`, and full schema validation of `handoffs/F02.json` with a substituted `task_id`)

```
F02a  accepted (re, ecma, schema VALID)     F02b  rejected   F99  rejected   f00  rejected   F00x  rejected   W99  rejected
F02A, f02a, F02aa, "F02a\n", F00a, D02a, F04, O03, N11, C12, L07, H02, R03, U06, P06, W05   all rejected
candidates [A-Za-z]NN plus [A-Za-z]NN followed by any [a-zA-Z0-9]: 327,600 -> accepted 63 == tasks.json (63 IDs; split {'F02a': 'F02'})
```

The generator reproduces the schema. I copied the working tree to `$S/gen` and ran `gen_offers.py` there. Output: `generated: 22 offer-matrix invalid, 22 asset-manifest invalid, 17 worker-handoff invalid`, exit 0. Then `diff -rq $S/gen/.orchestration/contracts /home/user/bill/.orchestration/contracts` reports IDENTICAL, and `sha256sum -c gen-offers-outputs.after.sha256` passes. So the worker-handoff schema and `unknown-task-id.why.txt` were regenerated, not hand-edited (README §3 rule 7).

### 3. No change of meaning in the math, input or schema contracts, or in existing fixtures

- `git diff --stat HEAD -- .orchestration/contracts/fixtures/ workshop-inputs.md workshop-inputs.schema.json` shows no change.
- `compute_f02a_fixtures.py --check`, run on the copy: "37 WM01-WM36 + clip-rules.json files regenerate byte for byte …; differing: none", exit 0.
- `workshop-math.md` diff:
  - §10 count and range go from 36 (WM01–WM36) to 40 (WM01–WM40).
  - Four table rows are added.
  - A provenance sentence for WM37–WM40 is added.
  - "Negative controls in `validate.py`" becomes "in `evidence/F02/math/validate.py`". That is accurate: the fault matrix lives in that file (lines 292–330), and the contracts harness has no reference model.
  - The F02a negative-control list is added.
  - A §15 note is added.
  - The header's approval-hash sentence gains a pointer to the later CX-29 record. That is attempt 1's P3-2. §3a now documents it with rule-6 reasoning, and the record it names is pinned.
  - No formula, rule, state, flag or code changed.
- `worker-handoff.schema.json` diff: only `$id`, title, the `task_id` description, and `|F02a|` in the pattern.

### 4. The WM37–WM40 rows against the fixture files

- **Covers.** WM37: WK02. WM38: WK02. WM39: WK01, WK02. WM40: WK01, WK02. These equal both `index.json` `covers` and each fixture's `covers`.
- **Case text.** Each row's text matches the fixture's `title` and `purpose`. WM37 and WM38 cite F02-MATH3-P2-1 and P2-2; WM39 and WM40 cite P3-1.
- **Negative controls.** `$VENV/bin/python .orchestration/evidence/F02a/mutation_check.py` exits 0:
  - `today_dollars_uses_q` is caught by WM37 only.
  - `today_dollars_indexed_at_i` is caught by WM37 only.
  - `joint_uses_partner` is caught by WM38 only.
  - `group_from_rounded_rows` is caught by WM37 and WM39.
  - `deflate_rounded_gap` is caught by WM40 only.
  - WM01–WM36 alone catch none of these.

  That is exactly the §10 list ("WM39, and WM37" included).
- **Own-model claim.** "A6 reproduced these results with its own model" is supported: `evidence/F02a/a6-attempt3/` holds `pyearmodel.mjs` and `fault_results.json` with the same catches.

### 5. Negative controls on mutated copies (`validate.py --contracts-dir $S/nc/<case>`; logs in `$S/nc/`)

| Case | Mutation | Exit | Caught by |
|---|---|---|---|
| nc00 | none | 0 | n/a (361/0) |
| nc01 | WM38 first `"gap_cents": 4200000` → `4200001` | 1 | CX-29: F02a record stale for WM38; A0 bundle stale for WM38; no recorded hash for WM38 |
| nc02 | `workshop-math.md` "40 math fixtures" → "41" | 1 | CX-21 fixture count vs 40; CX-29 drift and stale workshop-math.md |
| nc04 | nc01 + nc02 together | 1 | CX-21 and CX-29 (both) |
| nc03 | `workshop-inputs.md` "27 invalid examples" → "28" | 1 | CX-29 only (see observation O-2) |
| nc05 | formula text `g[1 − (1+r)^−H]/r` → `/(1+r)` | 1 | CX-29 drift and stale workshop-math.md |
| nc06 | `workshop-inputs.md` text edit (in no record's `changed`) | 1 | CX-29 drift and stale |
| nc07 | WM05 `gap_cents` +1 (old fixture) | 1 | CX-29 drift, stale, no recorded hash |
| nc08 | schema pattern adds `F02b` | 1 | CX-18 `['F02b']`; CX-29 offers |
| nc09 | README row 12 "Worker handoff 1.0" | 1 | CX-01 README row 12 |
| nc10 | `contract_set_version: 1.0` | 1 | S1 |
| nc11 | `approval-scopes.md` WH-ID-1 "no generic suffix" → "a generic suffix" | 1 | CX-29 offers drift and stale |
| nc12 | WM37 first `gap_cents` +1 | 1 | CX-29 |
| nc13 | schema `$id` → `/1.2` | 1 | S2, CX-01, CX-29 |
| nc14 | §10 row `WM38` relabelled `WM41` | 1 | CX-21 table missing WM38, extra WM41; CX-29 |
| nc15 | README row 11 "Approval scopes 1.1" | **0** | nothing (finding P3-2) |
| nc16 | `approval-scopes.md` heading "1.1" | 1 | CX-29 |

Record-level controls ran on full copies of the working tree (`$S/rec/`):
- **r4.** `make_records.sh` prints "refusing: … exists", exit 3.
- **r1.** WM38 +1 with the F02a record regenerated in place fails. CX-29 reports: "record … after-hashes.log (F02a (D-072)) bytes differ from its registration", and "A0 bundle stale for WM38".
- **r5.** r1, plus the F02a record re-pinned in `validate.py`, still fails. The later A0 whole-bundle record is stale for WM38.
- **r2.** One comment line appended to `math-bundle.sha256.log` fails: "bytes differ from its registration".
- **r3.** This is attempt 1's exploit. WM01 +1, both A0 records deleted and regenerated, and both re-pinned in `validate.py`: it still fails, with "drift … WM01" and "no recorded hash for WM01".

Harness mutations (`$S/harness/`) confirm the new controls are not vacuous:
- **m1.** Any record line supersedes (attempt 1's behaviour): NC-18 fails, and so does CX-29.
- **m2.** Record pin disabled: NC-18 fails.
- **m3.** CX-18 tests only planned IDs plus F02a: NC-15 fails.
- **m4.** CX-21 table comparison dropped: NC-16 fails.

### 6. Handoffs (`validate.py --handoff`, and the schemas directly)

```
schema 1.1        F00: 6 errors (enum /blocked_checks/5,6; pattern /changed_paths/2..5)   F02: 0   F02a: 0   F03: 0
schema 1.0 (HEAD) F00: the same 6 errors                                                  F02: 0   F02a: 1 (pattern /task_id)   F03: 0
--handoff (deep), all exit 1:
  F00: the 6 schema errors (XL-14)
  F02: base_commit 5cbbf9b != HEAD; artifact hashes differ for the 8 patched files plus index.json (F02a); WM37-WM40 not listed (F02 predates them)
  F02a: only base_commit cb3becf != HEAD (35/35 artifact hashes match)
  F03: base_commit != HEAD; tests/baseline/* artifacts missing (F03's branch); identical to before-handoff-F03.log
```

Every deep-check difference is expected, and all of them already appear in the evidence (`before-handoff-*.log`, `attempt2-handoff-*.log`). The F02 differences are the recorded change (§3a). The F03 differences exist at HEAD too.

### 7. Lane validators and the F02a regeneration check, run read-only on the copy `$S/wt`

- `evidence/F02/data/validate_f02_data.py`: 298 passed, 0 failed, exit 0.
- `evidence/F02/offers/validate_offers.py`: `pass: 92 fail: 0`, exit 0. Its result lines equal HEAD's except the pattern text in the `unknown-task-id` line.
- `evidence/F02/math/validate.py`: 116 passed, 1 failed, exit 1. The single failure is `compute_fixtures.py --check … differing: ['index.json']; unexpected files: WM37–WM40`, the same as in my run at HEAD. This is disclosed in README §5.3 and §7 (attempt 1's P3-3).

### 8. The F01 document fixes (`blockers.md`, `decisions.md`, `costs.json`)

- **Header status "accepted".**
  - `tasks.json` has F01 as `accepted`.
  - `cb3becf` is "Accept F01 decisions/blockers and F02 contracts; split F02a".
  - `reviews/F01-attempt2.md` gives "Verdict: pass".
  - `reviews/F02a-attempt3.md` line 24 reads "Part B passes".
- **Pilot-status snapshot.** `git show 5cbbf9b:.orchestration/tasks.json` gives F00 accepted, F01 running and 60 planned. The current `tasks.json` gives 4 accepted (F00, F01, F02, F03), F02a running and 58 planned, out of 63. Both statements are exact.
- **D-070's three new rows.** They match the blockers.md Secrets table rows 340–342 word for word in substance: names and locations only, and "never in chat". P04, C10 and HB-10 exist.
- **HB-08 "Provide" line.** It routes the (b) answers to `existing_cost_unknown`, with "`amount` and `currency` stay `null`".
- **costs.json.**
  - `authorized_caps` is identical to HEAD: purchased_api 0, ads 0, subscriptions 0.
  - No item has a non-null, non-zero amount (27 amount fields).
  - Removing every `note` and `meta.status` makes HEAD and the working tree identical, so only notes and the status changed.
  - All 11 `existing_cost_unknown` notes cite HB-08(b). Seven are asked there; four say why they are not.
- **Added lines.** A scan of the added lines finds no currency figure and no request to paste a credential.

### 9. Evidence integrity

- `cd evidence/A0-patch-1 && sha256sum -c MANIFEST.sha256` passes (36 entries, every file covered).
- `patch.diff` equals the live `git diff -- .orchestration` (`diff` exit 0).
- The three record hashes pinned in `validate.py` equal the record bytes.
- The F02a record equals its committed bytes (`git show HEAD:…/after-hashes.log | sha256sum` gives `4eb22f88…`).
- The attempt-2 summaries (`validator-summaries.txt`, `attempt2-*.log`) match my own numbers.

## Findings

### A0P1-A6R2-P3-1: F02a's handoff names `contract_version` 1.0 but is valid only under worker handoff 1.1 (P3; owner A0)

- **Where:**
  - `handoffs/F02a.json`: `"contract_version": "1.0"`, `"task_id": "F02a"`.
  - README §3 rule 4 exception and §3a: "Every handoff and packet valid under 1.0 is still valid under 1.1 … A task dispatched under 1.0 still names 1.0".
  - `validate.py` `HANDOFF_CONTRACT_VERSIONS = ("1.0", "1.1")`, while every handoff is validated against the 1.1 schema only.
- **Reproduce:**
  - `jq .contract_version .orchestration/handoffs/F02a.json` prints `"1.0"`.
  - Validating F02a.json against `git show HEAD:.orchestration/contracts/worker-handoff.schema.json` (1.0) gives `pattern@/task_id`.
  - `validate.py --handoff .orchestration/handoffs/F02a.json` reports no `contract_version` problem.
- **Expected:**
  - The split task that 1.1 was created for, which is still `running` and not yet accepted, hands off naming a version whose contract admits it. That version is 1.1.
  - Alternatively, the rule-4 exception says explicitly that a handoff naming 1.0 is checked against the current 1.1 schema, and that F02a's 1.0 name is accepted only under D-074.
- **Actual:**
  - The exception's reasoning covers 1.0 handoffs that stay valid under 1.1. It does not cover a handoff that names 1.0 yet fails 1.0.
  - A0 is about to accept F02a on this handoff. A reader who checks the handoff against the version it names gets a failure.
  - No result is wrong and no path is blocked, so this is P3 (traceability).

### A0P1-A6R2-P3-2: CX-01 claims every index row states its contract's version, but rows for markdown-only contracts are not checked (P3; owner A0)

- **Where:**
  - README CX-01: "Each contract's `$id`, title … and `schema_version` or `contract_version` const carry its own version, and its index row states that version".
  - README §3a: "`validate.py` checks each contract's own version".
  - `validate.py` `cx01()`: `by_file` holds only the schema and registry files and `workshop-math.md`.
- **Reproduce:**
  - Copy the contracts and change README row 11 to `| 11 | Approval scopes 1.1 |`, while `approval-scopes.md` still reads "# Approval scopes 1.0".
  - Run `validate.py --contracts-dir $S/nc/nc15`: exit 0, 361/0.
  - The same applies to rows 6, 7, 9 and 15 (authority matrix, data model, routes, clip rules). For those rows only "not above the set version" is enforced.
- **Expected:** a row that disagrees with its contract's own heading fails CX-01, or the invariant's wording is limited to the contracts it checks.
- **Actual:**
  - Today every row agrees with its heading (checked by hand: rows 1–15 against the md headings and `$id` values).
  - The check is new and stricter than HEAD's, which had no row check, so nothing is loosened. The stated invariant is just broader than the implementation.

## Status of attempt 1's findings (`reviews/A0-patch-1.md`)

| Item | Status | Evidence |
|---|---|---|
| A0P1-A6-P2-1: records regenerable; any line supersedes | **Closed** | Each record's sha256 is pinned, and it has an explicit `changed` list. Whole-bundle lines supersede nothing. `make_records.sh` refuses (exit 3). NC-18 is in the harness. My r1–r5 and m1–m2 runs above. The records are byte-identical to attempt 1's. |
| A0P1-A6-P3-1: rule 4 contradicts §3a | **Closed** | Rule 4 now states the exception and says that A0 checks when the task was dispatched. The residual is P3-1 above. |
| A0P1-A6-P3-2: header sentence edited as "editorial" | **Closed** | §3a has a "Header sentence" bullet with rule-6 and rule-5 reasoning. The named record is pinned. |
| A0P1-A6-P3-3: math lane gate red, undisclosed | **Closed** | README §5.3 and §7 state "116 passed, 1 failed" and give the exact failure. I reproduced it at HEAD and after. |
| A0P1-A6-P3-4: blockers "F01 running" line | **Closed** | The line is now labelled a snapshot at `5cbbf9b` with the current states, and both halves are accurate. |

## Observations (not findings)

- **O-1: approval scopes stays 1.0 although §8 changed.** Justified: §8 has always been the worker-handoff semantics section ("Its schema lives in this lane; this section gives its semantics"). Row 12 now names it, and §3a says so.
- **O-2: CX-21 does not parse some stated counts.** It misses the counts in `workshop-inputs.md` ("all 5 valid examples … each of the 27 invalid examples"; see nc03). This gap already exists at HEAD, the files match today (5 and 27), and CX-29 catches any edit. Out of this patch's scope.
- **O-3: stale sentence left in the README.** The bullet next to the one the patch edited still says "Nothing here is committed" (historical F02 wording). The contracts have been committed since `cb3becf`. This predates the patch.
- **O-4: A0's math record also lists `index.json`, which F02a changed.** The registration discloses this, both records hold the same current hash, and attempt 1 named `index.json` as allowed for this round.
- **O-5: NC-18 also fails when the real tree carries a regenerated record** (seen in r1). It fails closed, so this is expected noise, not a gap.
- **O-6: F02's acceptance hashes differ for the patched files.** Rule 4 calls for A6 re-verification of submitted and accepted tasks against 1.1. This review, together with S9 (F02, F02a and F03 are schema-valid under 1.1), is that re-verification for the worker-handoff change. "Re-issue: None" is supportable because nothing was narrowed.

## Not run

- No browser, network, provider or UI checks. None apply to this patch.
- No math re-derivation beyond `compute_f02a_fixtures.py --check` and `mutation_check.py`, which the patch did not change. This patch changes no WM value, so it needs no new A6 math review under rule 3.
- No commit, push or external side effect.
