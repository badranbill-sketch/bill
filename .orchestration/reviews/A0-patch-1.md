# A0 patch 1 review, attempt 1: A6 independent verifier (fresh context)

- Reviewer: A6 (independent verifier), attempt 1 of 3, fresh context. This is technical verification only. It is not professional (G3) approval, not a human approval of any kind, and it is not signed for Bill or the firm.
- Subject: the uncommitted A0 integration patch on `claude/orchestration-foundation`, HEAD `d1a37cf3c17953529774e7801af8f0c16eedb925`. I looked at `git -C /home/user/bill diff -- .orchestration` (11 modified files) and the untracked `evidence/A0-patch-1/` (26 files). The evidence `patch.diff` is byte-identical to the live diff, and `MANIFEST.sha256` verifies.
- Date (UTC): 2026-09-30, about 11:05–11:25. Environment: local container, fixture evidence only. No browser, network, provider, commit or push. Every mutation ran in scratch copies under `/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6-a0p-1/`. I wrote only this file in the repo.
- Venv: `/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-f02` (Python 3.11.15, jsonschema 4.26.0). It already existed, so I did not recreate it.

## Verdict: needs_changes (one P2, four P3)

Most of the patch holds up. The task_id rule is exact. The version records agree with each other, and the change log is present. Formulas, schemas other than worker handoff, and the existing fixtures are unchanged. WM37–WM40 match their rows. The validator passes, and every earlier check and negative control is still there. The F01 document fixes are correct.

One P2 remains. The new CX-29 "record" mechanism lets a hash-only regeneration re-approve a changed file in the calculation bundle, including WM01–WM36, which this patch never touched. The record's own header tells the next editor to do exactly that. I reproduced it: a wrong WM01 expected value passes `validate.py` with exit 0, and the output credits it to "A0 patch 1 (D-074)". This makes CX-29 weaker than it was at HEAD for files the patch did not change.

## Artifacts reviewed (sha256 at review time)

```
7f14d51dc160c8d860b31acb9911cbf32b4c336fba887e1cbaa53823db0ff9ae  .orchestration/contracts/README.md
4d202b415108325952329f43eaf911e17ac62546424330c2da71d622cc05c71b  .orchestration/contracts/validate.py
11853fe1551f6e69f765ab13bb5878f246ea196692295e1719c04e95666c831d  .orchestration/contracts/worker-handoff.schema.json
2a5f7b4482e8aa83e842f7ce2f1e2b46320d7272ec6bad3334430d36971cdc1c  .orchestration/contracts/approval-scopes.md
4c93d741f40096aae7f0f8c9a2ce2e7367509714aa9b09b61acb0cabb9dca9c0  .orchestration/contracts/examples/invalid/worker-handoff/unknown-task-id.why.txt
c14827049b66d98ab79eba862d08531078a88898cf2851e0995009d47dafa53c  .orchestration/contracts/workshop-math.md
7c3358648b70bba12c7f6f980d8560a7503297b74fe0eb3a9c400c5656e7f42a  .orchestration/decisions.md
4b26f8b57a41e9fb551c8ae42577aa9c2297685ad6e973ccbe8ae3ff6d33bb5c  .orchestration/blockers.md
52ae5849044bd2aa8cb3143122223aa51f5d3e29a4ff7fd6b23d4fa7012b090d  .orchestration/costs.json
d0b6d93c4a8f13a2e568eb92fbbae93385e5b52e0767fd87933c087e385c1d71  .orchestration/evidence/F02/offers/gen_offers.py
f99e7300d64f2ebb2f5395611412f93e8d83b3f1509080fa7256c75c1b7f294f  .orchestration/evidence/F02/offers/validate_offers.py
bc80f539dc5c73809610d4bba7f3de002383889860bdfb3e57280c0d03402b05  .orchestration/evidence/A0-patch-1/math-bundle.sha256.log
e838813371b9684567d4f918ce4411fb515a051deb8a1b4cf486cfc7ee304985  .orchestration/evidence/A0-patch-1/worker-handoff-1.1.sha256.log
646e05aa83a803267c056de30124f64ee1c56b0afb2e40aff199e40a89a2cf8b  .orchestration/evidence/A0-patch-1/make_records.sh
789edc68a288bf31e011ba55da4c26dc1850d307eaef80e64d23fbb48152329e  .orchestration/evidence/A0-patch-1/MANIFEST.sha256
```

## Method and exact commands

`$S` = `/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6-a0p-1` and `$V` = the venv above. The scripts and logs named below stay in `$S`, which is scratch and not evidence in the repo.

1. **Diff inspection:** `git diff -- .orchestration`, file by file, with `git diff HEAD --stat -- .orchestration/contracts/fixtures .orchestration/contracts/workshop-inputs.md .orchestration/contracts/*.schema.json`. The only schema changed is `worker-handoff.schema.json`. No fixture changed, and `workshop-inputs.md` did not change.
2. **Validator after the patch:** `cd /home/user/bill && PYTHONDONTWRITEBYTECODE=1 $V/bin/python .orchestration/contracts/validate.py > $S/after-validate.log` gave `exit=0` and `pass: 360  fail: 0  known: 16  info: 2`, with no "unexpected results" block.
3. **Validator before the patch:** I copied the repo (`cp -a /home/user/bill $S/headcopy`), reset the copy (`git checkout HEAD -- .orchestration`) and removed `evidence/A0-patch-1`. Running HEAD's own `validate.py` there gave `exit=1` and `pass: 353  fail: 4  known: 16  info: 2`. The four failures were CX-18 (F02a), CX-21 (40 fixtures versus a stated 36), CX-29 (math log, `index.json`), and S9 for `handoffs/F02a.json`. This matches `before-contracts-validate.log`.
4. **Check list before and after:** `$S/cmp_checks.py` normalizes labels (it drops bracketed details and maps 1.0 and 1.1 to V) and compares them as multisets. 375 results before, 378 after. **Removed: none.** Two were relabelled: CX-01 (from one version to per-contract versions) and XL-14 (now "1.0 or 1.1"). Three were added: NC-15, NC-16 and NC-17. NC-1 to NC-14 are unchanged. In the logic, the only relaxations are CX-01's per-contract versions and `--handoff` accepting a `contract_version` of 1.0 or 1.1, both needed for the change, plus CX-29's supersession (P2-1 below). CX-18 is stricter: it now tests 70,200 candidates including every suffixed ID, and it checks `split_from`. CX-21 is stricter: it adds the range, the §10 table and README row 14. CX-29 also gains a new coverage rule.
5. **task_id probe** (`$S/taskid_probe.py`, using the harness's ECMA translation and `EcmaValidator` on a copy of `handoffs/F02a.json`):
   - Accepted: F02a, F02, F00, F03, W00, O02.
   - Rejected: F02b, F99, f00, F00x, F00a, F03a, F02A, f02a, F02aa, `"F02a\n"`, `" F02a"`, `"F02a "`, F04, W99, O03.
   - Whole documents: `task_id` F02a gives 0 errors, and F02b, F99, f00 and F00x give 1 `pattern` error each.
   - `tasks.json` has 63 tasks, and the only split is `('F02a', 'F02')`.
   - Plain Python `re` accepts `"F02a\n"`, but the harness does not. This behaviour predates the patch (A6D2-04) and is not a regression.
6. **Deep handoff checks:** `validate.py --handoff .orchestration/handoffs/{F00,F02,F02a,F03}.json`, before (in `headcopy`) and after:
   - F00: the same 6 schema errors before and after (XL-14; the patch does not change it).
   - F02a: the schema failure before is fixed. Afterwards, the only remaining problem is `base_commit cb3becf… != HEAD`, and 35/35 artifact hashes match.
   - F02 and F03: schema-valid under 1.1. Their deep failures come from base_commit, the F03 branch artifacts and the patched F02 contract bytes. All of these are expected after later commits and are unchanged or explained.
   - S9 reports PASS for F02, F02a and F03.
7. **Generator reproducibility:** in a full copy of the patched repo (`$S/patchcopy`), I ran `PYTHONDONTWRITEBYTECODE=1 $V/bin/python .orchestration/evidence/F02/offers/gen_offers.py`. It exited 0 and printed "generated: 22 offer-matrix invalid, 22 asset-manifest invalid, 17 worker-handoff invalid". Afterwards `diff -r /home/user/bill/.orchestration/contracts $S/patchcopy/.orchestration/contracts` found no difference, and `git status` matched the real repo. So the schema and the `.why.txt` file are generator output, not hand edits (README §3 rule 7).
8. **Lane validators** (re-run in the copies):

   | Lane | After | At HEAD |
   |---|---|---|
   | data | 298/0, exit 0 | not re-run |
   | offers | 92/0, exit 0 | 92/0, exit 0 |
   | math | **116/1, exit 1** | **116/1, exit 1** |

   The math failure is `compute_fixtures.py --check`: 4 unexpected WM37–WM40 files, and `index.json` differs. It already failed at HEAD (see P3-3).
9. **Negative controls on copies** (`$S/nc_run.sh`, `$S/nc_run2.sh`). Each case is a fresh `cp -a contracts`, one injected defect, then `validate.py --contracts-dir <copy>`:

   | Case | Injected defect | Exit | Caught by |
   |---|---|---|---|
   | m0 | none | 0 | 360 pass (control) |
   | m1 | WM38 t=3 `gap_cents` 4200000 → 4200001 | 1 | CX-29: F02a record stale for WM38 |
   | m2 | WM38 t=3 changed consistently (income 700000, gap 4100000, exact strings) | 1 | CX-29: F02a record stale for WM38 |
   | m3 | job-state-machine.md stated count 12 → 13 | 1 | CX-21 (and CX-29 data-log drift) |
   | m4 | workshop-math.md "40 math fixtures" → "39" | 1 | CX-21 fixture count; CX-29 math-bundle record stale |
   | m5 | workshop-inputs.md stated count 5 → 6 | 1 | CX-21; CX-29 |
   | m6 | the WM38 §10 row's covers changed WK02 → WK01 | 1 | CX-29 only |
   | m7 | task_id pattern adds `F02b` | 1 | CX-18 (64 accepted, F02b extra); CX-29 |
   | m8 | task_id pattern drops `F02a` | 1 | CX-18; NC-15; S9 F02a; CX-29 |
   | m9 | worker-handoff title back to 1.0 | 1 | CX-01; CX-29 |
   | m10 | README row 12 says "Worker handoff 1.0" | 1 | CX-01 |
   | m11 | `contract_set_version: 1.0` | 1 | S1 "README declares contract_set_version 1.1" |

   The WM38 value change and the stated-count changes asked for in the packet are both caught. A0's own `negative-controls-copy.log` (nc0–nc5) agrees with these results.
10. **Re-approval test** (`$S/rebless.sh`, in full copies of the patched repo): see P2-1.
11. **F01 documents:**
    - I diffed `costs.json` against `git show HEAD:.orchestration/costs.json` after removing every `note` and `status` string. The result was `identical apart from note/status strings: True`.
    - `authorized_caps` is `{"purchased_api": 0, "ads": 0, "subscriptions": 0}`. No amount or currency changed.
    - The HB-08(b) list (VPS, domain, mailbox, Calendly, Google, GitHub, Resend/Upstash) maps to the 7 notes that say they are asked. The other 4 notes (the build assistant, taxes, Bill's time, operator time) say HB-08(b) does not ask for them.
    - The three new D-070 rows match the Secrets table in blockers.md (lines 340–342): "never in chat".
    - The headers cite `cb3becf` (commit "Accept F01 …") and the verdict of `reviews/F01-attempt2.md` ("pass"). Both are true.
    - A credential-pattern scan of the evidence, README, decisions, blockers and costs found no match.

## What passes (with evidence)

- **Version, and the change log entry.**
  - The README title, `contract_set_version: 1.1`, `SET_VERSION`, the validator's docstring and argparse text, the schema `$id` (`…/worker-handoff/1.1`) and title, README row 12, the heading of approval-scopes.md §8, `gen_offers.py` and `validate_offers.py` all say 1.1 where they should.
  - Every other contract stays 1.0. README §3 rule 2 requires this: "Unchanged contracts keep their version, and the index records each one". CX-01 checks 15 versioned index rows.
  - The §3a change log has a 1.1 row that cites D-074. D-074 exists in decisions.md, and D-072 carries an amendment note.
  - A grep for leftover "worker handoff 1.0", "62 IDs" or "contract set 1.0" found only historical or explanatory text, plus the harmless regex alternative `all 62 tasks` at validate.py line 612. Row 12's "every task" still matches that regex.
- **task_id.** F02a is listed explicitly, and no generic suffix is allowed. The accepted set equals the 63 IDs in tasks.json (CX-18: "63 of 70200 candidate IDs (62 planned, 1 split: ['F02a'])"). F02b, F99, f00 and F00x are rejected.
- **No semantic change to the workshop contracts** (except P3-2).
  - `workshop-inputs.md`, `workshop-inputs.schema.json`, `workshop-clip-rules.md` and every fixture have zero diff.
  - The `workshop-math.md` diff is the §10 count and range, four table rows, the F02a generator and negative-control paragraphs, a §15 note, a disambiguation (`validate.py` → `evidence/F02/math/validate.py`, which is true: those FAULTS live there), and the header sentence covered in P3-2.
  - No formula, reason code, flag, state, precedence rule or output field changed.
- **The WM37–WM40 rows match the files.**

  | ID | §10 row | `index.json` and fixture | Match |
  |---|---|---|---|
  | WM37 | WK02; pins F02-MATH3-P2-1 | covers WK02; purpose "Pins F02-MATH3-P2-1" | yes |
  | WM38 | WK02; pins P2-2 | covers WK02; purpose "Pins F02-MATH3-P2-2" | yes |
  | WM39 | WK01, WK02; P3-1 group reading | covers WK01, WK02 | yes |
  | WM40 | WK01, WK02; P3-1 deflation reading | covers WK01, WK02 | yes |

  The four negative-control claims in §10 are supported by `evidence/F02a/mutation_check.log`, which shows each fault caught by its fixture and missed by WM01–WM36 alone. The one missed reading, `joint_uses_older`, is not claimed and stays F02A-A6R3-P3-1.
- **Validator.** It shows 0 fail and no unexpected results, and every earlier check is still present (method step 4). NC-15 to NC-17 cannot pass vacuously: each asserts that its precondition matched, for example `len(hits) == 3`, and requires the stale-record hit.
- **Handoffs.** F02, F02a and F03 validate against 1.1. F00 has the same 6 known XL-14 errors as under 1.0. Its accepted status is unaffected, and A0 owns any reissue.
- **The F01 fixes** for F02A-A6R3-P3-3, P3-4 and P3-5 are present and true. No amount was invented, the caps are still 0, and no secret is requested in chat.

## Findings

### A0P1-A6-P2-1: CX-29 records can be regenerated to approve any changed file in the bundle, credited to "A0 patch 1" (P2; owner A0)

- **Where:**
  - `contracts/validate.py` `LANE_LOG_RECORDS`: `math-bundle.sha256.log` and `worker-handoff-1.1.sha256.log` are registered with `paths=None`, and `cx29_problems` treats any lane-log entry that no longer matches as superseded if a record currently holds the file's hash.
  - `evidence/A0-patch-1/make_records.sh`, whose header says "Re-run after any change to a listed file".
- **Reproduce** (scratch copy `$S/rb-WM01` of the patched repo, `$S/rebless.log`):
  1. In `WM01-zero-inflation-zero-escalation.json`, change the first `"gap_cents": 1800000` to `1800001`. That is a wrong expected value, and the patch never touched WM01.
  2. `validate.py` gives `exit=1`: CX-29 "record …/math-bundle.sha256.log (A0 patch 1 (D-074)) is stale". This is correct so far.
  3. `bash .orchestration/evidence/A0-patch-1/make_records.sh`, then `validate.py`, gives **`exit=0`, `pass: 360 fail: 0`**. CX-29 reads "49 recorded hashes, 46 match; 3 superseded and 7 files recorded by ['A0 patch 1 (D-074)', 'F02a (D-072)']".
  4. For comparison, the lane's own `compute_fixtures.py --check` on that copy reports `differing: ['WM01-zero-inflation-zero-escalation.json', 'index.json']`.
  5. At HEAD (`$S/rb-WM01-head`), the same edit fails CX-29 with "…WM01-zero-inflation-zero-escalation.json". The only documented way to record a new hash there was the lane's `run_validation.sh`, whose log carries the verdict of `compute_fixtures.py --check`.
  6. The same test on WM38 is still caught, because the F02a record lists explicit paths and `make_records.sh` does not rewrite it.
- **Expected:**
  - Check changes loosen nothing beyond what the change needs.
  - A record is evidence of one round: README §1 says "the lane logs are historical evidence and are never rewritten", and a record "gives the round, the file and the paths it covers".
  - A record may supersede only the lane-log entries that the round actually changed. For A0 patch 1, that is `workshop-math.md` and `index.json` in the math log, and `worker-handoff.schema.json`, `approval-scopes.md` and `unknown-task-id.why.txt` in the offers log.
- **Actual:**
  - Every file in both records can be superseded, including WM01–WM36, `clip-rules.json`, `workshop-inputs.schema.json`, `workshop-inputs.md`, `workshop-clip-rules.md`, the unchanged worker-handoff examples and `approval-scopes.md` outside §8.
  - Regeneration is what the script tells editors to do, needs no lane verdict, and overwrites the round's record in place. The harness output then credits the new bytes to "A0 patch 1 (D-074)", a round A6 reviewed.
  - In this harness, CX-29 is the only check that holds WM expected values: m1 and m2 were caught by CX-29 alone, because S5 does not recompute arithmetic. A wrong oracle value could therefore reach W00, which must reproduce the fixtures to the cent, with a green `validate.py` and misleading evidence.
  - This case is likely soon. The math lane's open fold (F02A-A6R3-P2-1, fix directions 1–2) will change bytes in the bundle, and the red lane gate (P3-3) would hide a new difference among the existing failures.
- **Fix direction (A0; no fixture bytes change):**
  1. Register each record with explicit supersession paths, limited to the files its round changed. A record may still print the whole bundle for G3, but its other lines must not supersede lane entries. Keep checking that all of its lines match the current bytes.
  2. Remove "Re-run after any change to a listed file" from `make_records.sh`. State that a record is written once for its round, and that a later round writes and registers its own record.
  3. Add a negative control: a changed WM01, plus a regenerated A0 patch 1 record, must still fail CX-29.
  4. Say in README §1 and CX-29 how the math lane records its fold (a new record, or a new lane validation log whose verdict is exit 0).

### A0P1-A6-P3-1: README §3 rule 4 still says an older `contract_version` is "not accepted", while §3a and the harness accept 1.0 (P3; owner A0)

- **Where:** `contracts/README.md` §3 rule 4 ("A handoff that names an older `contract_version` is not accepted") against §3a ("A task dispatched under 1.0 still names 1.0, and `validate.py --handoff` accepts 1.0 and 1.1") and `HANDOFF_CONTRACT_VERSIONS = ("1.0", "1.1")`.
- **Reproduce:** `handoffs/F02a.json` names `contract_version` "1.0". `--handoff` raises no `contract_version` problem for it, so its only remaining problem is base_commit.
- **Expected:** one rule. Either amend rule 4 with the exception (a minor version that forces no re-issue keeps handoffs under the older version acceptable, for tasks dispatched before it), or record the exception in §3a with the rule-4 sentence it overrides.
- **Actual:** the two texts contradict each other. Also, the harness accepts 1.0 even from a task dispatched after 1.1. The rationale (1.1 only widens) is sound, so this is P3.

### A0P1-A6-P3-2: the approval sentence in the `workshop-math.md` header was edited as "editorial" (P3; owner A0 with the math lane)

- **Where:** `workshop-math.md` line 3. The "must" sentence about where G3 takes the hashes gains "or in the later record that supersedes it for a file (README §4 CX-29). After A0 patch 1 the whole bundle is printed in …math-bundle.sha256.log." §15 describes this as editorial ("The approval rule itself is unchanged").
- **Expected:** this packet allows only registry, count and list additions in workshop-math.md. README §3 rule 1 counts a change to a "normative sentence" as a contract change.
- **Actual:**
  - The obligation itself is unchanged: an approval still names the exact sha256 of the same files. Without the edit, the header would point to a log that cannot list WM37–WM40, which makes this P3.
  - Still, the hash source G3 may cite is now a record that `make_records.sh` can regenerate (P2-1).
- **Fix direction:** once P2-1 is fixed, point the header at one fixed, per-round hash list, and state in §3a that this sentence changed, with the rule-6 or rule-1 reasoning.

### A0P1-A6-P3-3: the math-lane gate is still red, and the README does not say so (P3, disclosure; the fold belongs to the math lane)

- **Reproduce:** `$V/bin/python .orchestration/evidence/F02/math/validate.py` gives `== summary: 116 passed, 1 failed`, exit 1. The failing line is `compute_fixtures.py --check … differing: ['index.json']; unexpected files: ['WM37-…', 'WM38-…', 'WM39-…', 'WM40-…']`. HEAD gives the same result, so this predates the patch.
- **Expected:** README §7 lists this validator as a routine read-only re-run. §5.3 says only that folding into `FAULTS` and `compute_fixtures.py` "is open". The known red state should be stated, with its exact failure, so that W00 and C02 (which depend on F02a) and the math lane do not mistake it for a new regression, or miss one.
- **Actual:** the red state is visible only in `evidence/A0-patch-1/validator-summaries.txt`. The P2-1 reproduction shows that the existing failure already hides a new WM01 difference.

### A0P1-A6-P3-4: blockers.md still says "F01 running" under a header that now says accepted (P3; owner A0; predates the patch)

- **Where:** `blockers.md` line 24, "Tasks: F00 accepted, F01 running, 60 of 62 planned (`tasks.json`)", in "Pilot status on the evidence (2026-09-30)". The patch set line 3 to "Status: **accepted**".
- **Expected:** a file whose status header was just corrected does not contradict itself. Either update the line or label it as a snapshot taken at 5cbbf9b.
- **Actual:** it contradicts the header and `tasks.json` (F01 accepted, F02 accepted, F02a running, 63 tasks).

## Observations (not findings)

- **Version scheme:** the set is 1.1 because of a single contract. That is rule 2 as written. The heading of approval-scopes.md §8 reads 1.1 while the approval scopes contract stays 1.0. This is documented in row 12 and §3a ("§8 carries the worker handoff semantics"), and CX-01 enforces the index rows.
- **Re-issue:** "None" is supportable because nothing is narrowed. For tasks already submitted or accepted, rule 4's A6 re-verification is covered by S9 and this review of F02, F02a and F03 against 1.1.
- **F02 deep check:** it now also reports hash differences for the patched contract files. That is expected: F02's acceptance was bound to the 1.0 bytes, and this patch is the recorded change (§3a).
- **Math review:** the harness has no reference model, so WM values are only pinned by hash. This is by design (README §5.3). It is why P2-1 matters. Rule 3 still calls for a new A6 math review for any real math change. This patch makes none.

## Status of the items this patch targets

| Item | Status after A0 patch 1 |
|---|---|
| F02A-A6R3-P2-2 (the F02a handoff could not validate) | **closed:** worker handoff 1.1, CX-18 and S9 pass |
| F02A-A6R3-P2-1 (the additive round was not closed) | **partly closed:** the contracts harness is green, and CX-21, row 14 and §10 are done. The lane gate is still red, and the fold into FAULTS is open for the math lane (P3-3). The new CX-29 mechanism needs P2-1. |
| F02A-A6R3-P3-3 (D-070 secret rows) | closed |
| F02A-A6R3-P3-4 (VPS price pointer; HB-08 Provide) | closed |
| F02A-A6R3-P3-5 (header status) | closed (see P3-4 for the leftover line) |

## Not run

- The browser, network capture, rendered UI and media are not relevant to this patch.
- I did not re-run the math reference model or `evidence/F02a/mutation_check.py`. My math claims rest on the existing logs and on `compute_fixtures.py --check` in scratch copies.
- I did not run `build_graph.py --check`, because `tasks.json` is not changed by the patch.
