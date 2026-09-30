# F03 review, attempt 2: A6 independent verifier (fresh context)

- Reviewer: A6 (independent verifier), review attempt 2 of 3, of F03 repair attempt 2. This is technical verification only. It is not a professional or human approval: G0 / HB-03 and HB-12 stay open. It is not signed for Bill or the firm.
- Date: 2026-09-30, 10:28:41Z–10:42Z. Main repo `/home/user/bill` at `cb3becf25ed042b977d4864ae71e74d13829320f` (`claude/orchestration-foundation`).
- Reviewed:
  - the local, unpushed branch `integration` at `b0bc6cf634b0b5498cc335da4d2d15da04276e3a`;
  - `.orchestration/baseline.md` and `.orchestration/handoffs/F03.json`;
  - `.orchestration/evidence/F03/`.
- I did not build F03. I read the attempt-1 review `reviews/F03.md` only to learn which findings the repair claims to fix, and I re-tested every claim myself.
- Environment:
  - local container: Node v22.22.2, npm 10.9.7, Python 3.11.15 with jsonschema 4.26.0 (the existing `scratchpad/venv-f02`).
  - **Browser: substitute Chromium 141.0.7390.37.** Playwright 1.63.0 expects rev 1243, which is not installed.
  - `GH_TOKEN` and `GITHUB_TOKEN` were withheld from every run (`env -u`).
  - Network use: `npm ci` (twice) from the registry, and one read-only `git ls-remote origin`.
  - No push, no publication, no provider call, no branch created, moved or deleted.
- Worktrees (all mine, all removed at the end; `E6/logs/a6_27`, `a6_24`, `a6_28`):
  - `…/scratchpad/wt/a6-f03-2`: detached at `integration` (`b0bc6cf`), 0 porcelain lines at creation.
  - `…/wt/a6-f03-2-codex`: detached at codex `66cce52`, for an independent BASE02 "before".
  - `…/wt/a6-f03-2-cb3becf`: for the CX-18 reproduction, removed after 6 s.
  - `…/wt/a6-f03-2-carry`: for the deep-check simulation, removed after 1 s.
- Evidence: `.orchestration/evidence/F03/a6-attempt2/` (`E6/` below).
  - The suite's own `NN_*.log`, `results.json` and `base02/records/`.
  - My `logs/a6_NN_*.log` records. Each carries the command, cwd, start time, full output, exit code and wall time (helper `scripts/rl.sh`).
  - `partial/*.results.json`, `independent-codex-before/`, two `base02-diff-*/report.json`, and `scripts/` (my helpers).
  - The helpers are stored as `.py`, `.sh` and `.cjs.txt`. No `.mjs`/`.ts`/`.js` file was added, so the evidence adds nothing to `npm run lint` (FND-1).
  - My 24 suite PNGs were byte-identical to the builder's `base02/before/*.png` (24/24 sha256, `a6_25`), so I deleted them after hashing. Their sha256 values stay in `E6/base02/records/*.json`.

## Verdict: pass (3 findings, all P3; no P0, P1 or P2)

- **BASE01 reproduces exactly at `b0bc6cf`.** I ran the full suite in my own clean worktree. All 15 steps have the same exit code and the same classification as the builder's run, and the same notes, reasons and citation. Summary: `{"pass": 12, "blocked": 1, "expected_fail_by_design": 1, "fail": 1}`, overall `fail`, exit 1. The single `fail` is `contracts_validate_py` (CX-18). I reproduced it, byte for byte in its summary, on a throwaway checkout of `cb3becf`, so it is pre-existing.
- **No guard was weakened.** `git diff origin/codex/desktop-iphone-unified..integration` over the guard paths shows only two changes:
  - `package.json`: 4 new scripts and 4 exact-pinned devDependencies;
  - `scripts/ink-sheet.tsx`: new, and identical to guide's.

  `.github`, `proxy.ts`, `tests/browser`, `eslint.config.mjs`, `tsconfig.json`, `playwright.config.ts` and `next.config.ts` are unchanged. The whole tree has 0 deletions.
- **The merges are intact.**
  - The guide merge `1316ebe` and the record merge `67ba636` have tree hashes equal to a fresh `git merge-tree --write-tree` of their parents. Neither merge contains a hand edit or a conflict resolution.
  - 20 of guide's 21 paths are blob-identical in integration. The 21st, `package.json`, differs only by the suite commit's additive lines.
  - `.orchestration` is tree `558fdac…` in `cb3becf`, `67ba636`, `5545c2a` and `b0bc6cf`.
  - homepage `d63aabd` and presentation `fc00445` are unchanged on origin and locally. Neither is an ancestor of integration, and why each stays unmerged is documented (HB-03, HB-12, D-073).
- **F03.json checks out.**
  - `base_commit` and `result_commit` are real commits, and `result_commit` is the `integration` head.
  - 36 of 36 sha256 values match. All 42 test evidence paths exist.
  - `changed_paths` covers all 54 non-`.orchestration` paths of `cb3becf..b0bc6cf`, and exactly 24 of them come from main→codex, as the handoff states.
  - The handoff validates against `worker-handoff.schema.json` (Draft 2020-12, format checker on) with 0 errors.
- **BASE02 holds, and I confirmed it independently.**
  - The builder's before/after PNGs are 24/24 byte-identical.
  - My suite capture of integration is 24/24 byte-identical to the builder's codex "before".
  - I also built codex `66cce52` myself in a separate worktree and captured it with the same spec. That capture is identical 24/24, with 0 record differences, both against my integration capture and against the builder's "before".
  - The screenshots I opened are real, legible renders at 320 and 1440, in fr and en.
- **The contract test is effective.** Each of 4 schema-invalid examples, moved or copied into `valid/`, makes `npm run test:contracts` exit 1 at the named subtest. Run through the runner, the same mutation gives `contracts_ajv: fail`, exit 1.
- **Attempt-1 P2 (F03-A6-P2-1) is fixed.**
  - `--only lint,test` runs both steps: exit 0. With a lint error it exits 1.
  - `--only test_e2e` exits 3, skipping every step exits 3, and `--only lnt`, `--only` without a value and `--bogus` exit 2 without writing anything.
  - Four mutations of `runner-lib.mjs` that I wrote myself (different from the builder's M1–M4) each make the runner self-test fail.

## BASE01: my suite run against the builder's claims

Commands, in `…/scratchpad/wt/a6-f03-2`:
- `env -u GH_TOKEN -u GITHUB_TOKEN npm ci`: exit 0, 16.51 s (`a6_01`).
- Then `env -u GH_TOKEN -u GITHUB_TOKEN PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tests/baseline/run.mjs --out /home/user/bill/.orchestration/evidence/F03/a6-attempt2 --python …/scratchpad/venv-f02/bin/python`.
- Driver exit **1**, wall 262.63 s, 2026-09-30T10:29:19Z onward (`a6_02_suite_driver.log`).
- Step-by-step comparison with `E/repair2/suite-full-b0bc6cf/results.json`: `a6_12_results_compare.log`, 0 mismatches.

| Step | A6 exit, s | A6 class | Builder exit, class | Match |
|---|---|---|---|---|
| npm_ci | 0, 17.62 | pass | 0, pass | yes |
| lint | 0, 15.99 | pass (0 errors, 21 warnings, all in 10 files under `evidence/F02/a6-math-attempt{1,3}/*.mjs`: 3 files in attempt 1, 7 in attempt 3; FND-1) | 0, pass | yes |
| test | 0, 0.94 | pass, 13/13 | 0, pass 13/13 | yes |
| typecheck | 0, 7.67 | pass | 0, pass | yes |
| build | 0, 20.83 | pass | 0, pass | yes |
| typecheck_after_build | 0, 8.25 | pass | 0, pass | yes |
| protections_check | 1, 0.48 | blocked: "Set GITHUB_REPOSITORY…", and gh is not installed | 1, blocked | yes |
| launch_check | 1, 0.60 | expected_fail_by_design: exactly the 8 approval flags | 1, same | yes |
| verify_publication | 0, 0.42 | pass, vacuous (0 published) | 0, same | yes |
| test_e2e | 0, 83.85 | pass: **41 passed, substitute Chromium 141** | 0, 41 passed | yes |
| contracts_ajv | 0, 2.20 | pass, 240/240 | 0, 240/240 | yes |
| contracts_validate_py | 1, 4.87 | fail: pass 350 / fail 1 (CX-18) / known 16 / info 2 | 1, identical | yes |
| build_graph_check | 0, 0.04 | pass | 0, pass | yes |
| base02_capture | 0, 95.51 | pass: **49 passed, substitute Chromium 141** | 0, 49 passed | yes |
| runner_selftest | 0, 1.53 | pass, 13/13 | 0, 13/13 | yes |

- `git_before.status` is `[]` and `dirtied_by_suite` is `[" M next-env.d.ts"]` in both runs. `requested_not_run` is `[]` in both.
- These rows agree with F00's codex rows (`evidence/F00/checks/results.json`): the same exits, unit 13/13 and e2e 41 passed under Chromium 141.
- **The expected_fail_by_design citation is real** (`a6_10`):
  - On integration, `LAUNCH-CHECKLIST.md` line 3 reads "`npm run launch:check` intentionally fails for the unresolved approval categories."
  - `lib/business.ts:28-37` holds exactly the 8 printed flags, all `false`.
  - D-061 exists (`decisions.md:127`).
  - In `run.mjs:217-240`, the classifier needs all of: exit 1, a "Launch blocked:" list made only of the approval keys read live from `lib/business.ts`, and that doc line still present. Any other blocker, for example "contact credentials and trusted proxy", makes the step `fail`. `scripts/launch.ts` prints every blocker on that single line, so none can escape.
- **CX-18 is pre-existing** (`a6_24`). In a throwaway worktree at `cb3becf` (`.orchestration` tree `558fdac…`, the same as integration), `validate.py` exits 1 with a `## Summary` block identical to my integration run's (`diff`: identical). The root cause is visible directly: `tasks.json` has 63 ids, and the worker-handoff `task_id` pattern rejects exactly one of them, `F02a`.

## Guards not weakened

Command: `git diff origin/codex/desktop-iphone-unified..integration -- package.json .github scripts proxy.ts tests/browser eslint.config.mjs tsconfig.json playwright.config.ts next.config.ts` (`a6_03`). It gives 2 files, +74/−1.

`package.json`:
- The one removed line is `"format": "prettier --write ."`. It comes back unchanged, now with a trailing comma.
- Added scripts: `guide` (from the guide merge), `test:baseline`, `test:contracts`, `test:base02`.
- Added devDependencies, all exact: `ajv` 8.20.0, `ajv-formats` 3.0.1, `pixelmatch` 7.2.0, `pngjs` 7.0.0.
- No existing script or dependency changed.

`scripts/ink-sheet.tsx`:
- It is new, from guide, and `git diff origin/guide/pre-retirement-guide integration -- scripts/ink-sheet.tsx` is empty.
- Only `guide/README.md` references it. It is a developer preview script that no guard or CI step calls.

Whole tree, codex to integration (`a6_04`):
- 816 added, 3 modified (`.gitignore` gains `guide/dist/`; `package.json`; `package-lock.json`), 0 deleted.
- Outside `.orchestration/`, the only additions are `guide/` (18 files), `scripts/ink-sheet.tsx` and `tests/baseline/` (8 files).

Lockfile (`a6_20`):
- codex → `67ba636`: 0 changes.
- `67ba636` → `b0bc6cf`: 9 entries added, 0 removed, 3 changed.
  - The 3 changed entries are the root `devDependencies`, root `ajv` 6.15.0→8.20.0 and root `json-schema-traverse` 0.4.1→1.0.0.
  - eslint and `@eslint/eslintrc` get nested copies of ajv 6.15.0. Only those two packages and `ajv-formats` (^8) depend on ajv, so no consumer silently switches major version.
- The 30 `libc` fields are unchanged.

Runner design, read in full (`run.mjs`, `runner-lib.mjs`):
- A step becomes `pass` only on exit 0. A non-zero exit reported as pass is forced back to `fail` (`run.mjs:567`).
- `blocked` requires matching evidence in the output. For the browser, the classifier needs the failed count to equal the number of failure blocks, and every block to carry the launch error.
- `not_run` never becomes pass. `fail` always gives exit 1.

The runner edits no guard, flag or test.

## Merge integrity (`a6_05`, `a6_06`, `a6_22`)

| Commit | Parents | Tree equals a fresh `git merge-tree --write-tree` of the parents |
|---|---|---|
| `1316ebe` (guide) | `66cce52`, `749b360` | yes: `0b9593c…` |
| `67ba636` (record) | `1316ebe`, `cb3becf` | yes: `73102c4…` |
| `5545c2a` (suite) | `67ba636` | not a merge: 8 files (`tests/baseline/` ×6, `package.json`, `package-lock.json`) |
| `b0bc6cf` (repair 2) | `5545c2a` | not a merge: 5 files, all under `tests/baseline/`, +822/−100 |

- Reflog of `integration`: created from codex, the guide merge, the `cb3becf` merge, `6b095fb`, the amend to `5545c2a`, then `b0bc6cf`. This matches baseline.md §2. `integration` has no upstream, and no `integration` ref exists on origin.
- **guide (merged).**
  - It changed 21 paths against the merge base `77de3bd` (19 added, 2 modified).
  - By blob compare, 20 are identical in integration. `git diff origin/guide/pre-retirement-guide integration -- <21 paths>` shows only `package.json`, +8/−1.
  - `1316ebe:package.json` equals guide's. The remaining delta is exactly the suite commit's additive lines, shown in full in `a6_05`.
  - No conflict resolution exists, and none is claimed.
- **Orchestration record (merged).**
  - It changed 789 paths against `77de3bd`, 0 of them outside `.orchestration/`.
  - `git diff cb3becf integration -- .orchestration` is empty.
  - The first-parent diff of `67ba636` touches 0 paths outside `.orchestration/`.
- **Preserved, unmerged.**

| Branch | SHA: F00 `branch_heads.txt` = local ref = `git ls-remote origin` | Ancestor of integration | Reason documented |
|---|---|---|---|
| `claude/bill-centered-homepage` | `d63aabd50d0760145208857856f32779b1069e15` | no | HB-03 (`blockers.md:51`, proposal line 54), D-073 (`decisions.md:183`) |
| `claude/bill-presentation-video` | `fc0044576d851be414d19e2f7a21ca7fd1285eae` | no | HB-12 (`blockers.md:136`), D-073 |

- The other remote heads also equal F00: main `77de3bd`, add-ask `01e296c` (an ancestor of integration), codex `66cce52`, guide `749b360`, and orchestration-foundation `cb3becf`.
- **Conflict trials** (`git merge-tree --write-tree --name-only`, which leaves the worktree untouched):
  - integration ← presentation: exit 1 on `eslint.config.mjs` and `tsconfig.json`;
  - integration ← homepage: exit 1 on `components/pages.tsx`, `lib/copy.ts`, `lib/ink-files.json`, `scripts/build-ink.tsx` and `tests/browser/site.spec.ts`;
  - integration ← guide: exit 0.

  These match baseline.md §2 and §3. The diffstats also match: presentation 67 files, +7378/−1; homepage 37 files, +2177/−615.

## F03.json (`a6_07`, `a6_08`, `a6_09`, `a6_17`, `a6_28`)

- **sha256:** 36 of 36 match.
  - 10 are blobs in `b0bc6cf`: `tests/baseline/*` ×8, `package.json` and `package-lock.json`.
  - 26 are main-path files: `baseline.md` and the evidence.
- **Tests:** all 15 `(step '…')` entries have the same exit code as the builder's `results.json`, and all 42 evidence paths exist.
- **changed_paths:**
  - It covers every one of the 54 non-`.orchestration` paths of `git diff --name-only cb3becf b0bc6cf`, with no extra entry. The attempt-1 P3-3 is fixed.
  - The 24 paths the handoff attributes to codex equal `git diff --name-only 77de3bd 66cce52` exactly. Those commits are by arnaud verdier (`d8ce2ef`, `66cce52`) and Claude (`01e296c`).
- **Schema:** Draft 2020-12 against `contracts/worker-handoff.schema.json` (`$id …/worker-handoff/1.0`), with the format checker: 0 errors.
- **Deep check.**
  - In the main path, `validate.py --handoff` exits 1 only because the result-commit files are absent there. That is the documented split.
  - I simulated the carry: a throwaway worktree at `b0bc6cf`, plus copies of `baseline.md`, `handoffs/F03.json` and `evidence/F03/`. Then the only remaining problem is `base_commit cb3becf… != HEAD b0bc6cf…`. All 36 hashes, 42 evidence paths and changed paths pass in one tree. This is strong positive evidence for the handoff, and it is also finding P3-3.

## BASE02

Checks on the builder's evidence (`a6_11`):
- 24/24 before/after PNGs are byte-identical. The widths are 320/390/768/1440, with the heights shown in the log.
- The two `report.json` summaries: 24 identical, 0 changed, 0 missing, 0 record differences. The repair-2 report also has `within_threshold: 0`.
- 49 records per side (24 screenshots, 24 smoke, 1 endpoints).
  - `http_status` is 200 for all 48 documents.
  - 0 console errors, page errors, failed requests or bad responses, and no horizontal overflow.
  - `journey` is `static` on all 8 home captures, and `inquiry_form` and `contact_section` are true on all 8 meeting captures.
  - The lazy `lighthouse.b6b8127f9b.svg` is incomplete at 390 on both home pages, on both sides.
- "before" records carry `app_dir …/wt/base01-codex`; "after" records carry `…/wt/integration`.

My captures:
- **My suite capture of integration vs the builder's codex "before"** (`a6_13`): 24/24 identical, 0 record differences, exit 0. All 24 of my PNGs are sha256-equal to the builder's "before" PNGs.
- **Independent "before"** (`a6_14`):
  - fresh worktree at `66cce52`, 0 porcelain lines;
  - `npm ci`: exit 0, 16.83 s. `npm run build`: exit 0, 19.64 s;
  - the same spec with `BASE02_APP_DIR` pointing at that worktree: 49 passed, 100.56 s. Its records carry my codex `app_dir`.
  - Compared with my integration capture: 24/24 identical, 0 record differences, exit 0.
  - Compared with the builder's "before": 24/24 identical, 0 record differences, exit 0.
  - The builder's "before" is therefore genuinely codex, and merging guide and the orchestration record did not change the site.
- **Comparator control** (`a6_19`, scratch copies): a 20×20 red block painted into `fr-home-320` and `horizontal_overflow` flipped in one record. The result is `changed` (0.0129 %) plus 1 record difference, exit 1.

**Visual inspection.** I cropped the tall full-page PNGs with a pngjs helper and read them:
- `before` and `after` `en-home-1440`, top 2400 px: identical. The nav, the hero with the desk illustration and polaroid, the journey and guide cards, the Ask Bill row and "How Bill works".
- `before` and `after` `fr-home-320`, top 1600 px: identical. The phone header, the hiker, the hero, full-width actions and the guide cover.
- `after` `fr-meeting-1440`, the full page at 1/3 scale: the hero, the four explanatory sections, the "Pour joindre Bill" block and the contact form, and the footer.
- `before` `en-meeting-320`, 1800–3400 px: the "How to reach Bill" block and the inquiry form fields.
- `after` `en-resources-320` and `before` `fr-resources-1440`: the breadcrumb, the hero and the five-question check-up, and at 1440 the discussion-list sidebar.

All are complete, legible renders. None is blank, clipped or broken.

## Contract test mutation (my worktree only, reverted; `a6_15`, `a6_16`)

| # | Mutation | `npm run test:contracts` |
|---|---|---|
| M0 | none | exit 0, 240/240 |
| M1 | `invalid/workshop-inputs/extra-pii-email.json` (layer schema, `additionalProperties`) moved into `valid/` | **exit 1**, 239/240: `not ok 173 - valid workshop-inputs/extra-pii-email.json passes workshop-inputs.schema.json` |
| M2 | `invalid/worker-handoff/absolute-changed-path.json` (schema, `pattern`) moved into `valid/` | **exit 1**: `not ok 152 - valid worker-handoff/absolute-changed-path.json …` |
| M3 | `invalid/offer-matrix/agent-recorded-gate.json` **with** its `.why.txt` (no orphan left behind) moved into `valid/` | **exit 1**: `not ok 103 - valid offer-matrix/agent-recorded-gate.json passes offer-matrix.json` |
| M4 | `invalid/feature-flags/agent-recorded-approval.json` **copied** into `valid/` (the invalid side untouched) | **exit 1**, 240/241: `not ok 84 - valid feature-flags/agent-recorded-approval.json …` |
| M5 | after reverting each (`git checkout` + `git clean` on `.orchestration/contracts`) | exit 0, 240/240; `.orchestration` 0 porcelain lines |
| R1 | M1 through the runner: `run.mjs --only contracts_ajv` | `contracts_ajv: fail`, overall `fail`, **exit 1** (`partial/r1_contracts_mutated.results.json`) |

The Ajv test alone does not notice the orphan `.why.txt` left by M1 and M2. That is by design: `validate.py`, the `contracts_validate_py` step, checks orphans (README "Contract validation"). It is not a gap.

## Repair of F03-A6-P2-1 and the runner self-test (`a6_16`, `a6_18`)

| Invocation, in my worktree after the suite's `npm ci` | Result |
|---|---|
| `--only lint,test` | lint pass (exit 0), test pass (exit 0); overall `pass_with_exceptions`; **exit 0** |
| the same, with `app/__a6v2_broken.ts` = `const x = ;` (removed afterwards) | lint `fail` (exit 1), test pass; **exit 1** |
| `--only test_e2e` | `test_e2e` not_run (build excluded, never assumed); `incomplete`; **exit 3** |
| `--skip` of all 15 ids | `incomplete`; **exit 3** |
| `--only lnt` / `--only` without a value / `--bogus` | **exit 2** each; no `--out` directory created |

Runner self-test mutations, each my own edit of `tests/baseline/runner-lib.mjs`, reverted with `git checkout`:
- A: "incomplete" dropped from the exit code: 3 tests fail.
- B: the classifier says `blocked` if any failure has the launch error: 2 fail.
- C: the "installed but not in lockfile" check removed: 1 fails.
- D: unknown step ids accepted: 2 fail.
- After the revert: 13/13 pass, and `tests/baseline` has 0 porcelain lines.

Prettier: `npx prettier --check tests/baseline` reports "All matched files use Prettier code style!", so the attempt-1 P3-4 is fixed (`a6_23`).

## Findings

### F03-A6v2-P3-1: BASE02 leaves out the documented 700 px width, without saying so (owner: A3 / F03)

- **Where:** `tests/baseline/screens.spec.ts:33` (`const WIDTHS = [320, 390, 768, 1440]`) and baseline.md §5.
- **Reproduction:** `git show integration:docs/RESPONSIVE-REVIEW.md` ("Verification") says the responsive checks cover "English and French at 320, 390, 700, 768, and 1440 CSS pixels". `tests/browser/responsive.spec.ts:6` loops over `[320, 390, 700, 768, 1440]`. BASE02's method is "at supported widths", but the capture has no 700 px screenshot, and baseline.md does not record the omission or the reason for it.
- **Expected:** capture 700 px too, or state the omission and point to the covering evidence.
- **Actual:** 4 of the 5 documented widths are captured, and the fifth is silently absent.
- **Impact, limited:**
  - `test_e2e` covers 700 px for fr and en ("responsive conversion path at 700", passing in my `10_test_e2e.log`).
  - No served file differs between codex and integration (`a6_04`).
  - So no regression can hide at 700 px today. This is a coverage and recording gap, not a defect.

### F03-A6v2-P3-2: four `tests[].command` strings in F03.json are not the commands that ran (owner: A3 / F03)

- **Where:** `handoffs/F03.json` tests `F03-PARTIAL-E`, `-H`, `-I` and `-J`.
- **Reproduction** (`a6_21`):
  - E and H are written as `PLAYWRIGHT_CHROMIUM_EXECUTABLE=… cd <worktree> && env -u GH_TOKEN -u GITHUB_TOKEN node tests/baseline/run.mjs …`. A variable assignment in front of the `cd` builtin does not reach the next command. In a clean shell, the next command sees the variable as `[unset]`, so H as written would run the lockfile's default browser: `test_e2e` `blocked`, not "pass, 41 passed".
  - I and J are written as `env -u PLAYWRIGHT_CHROMIUM_EXECUTABLE cd <worktree> && …`. That fails with `env: 'cd': No such file or directory` (exit 127), so the runner never starts.
  - The B and G strings are prose ("mv node_modules/pngjs aside; …; restore").
- **Expected:** each `command` is the exact command that ran (shared contract: "Record exact tests and actual outputs").
- **Actual:** the evidence log `E/repair2/03_partial_runs.log` has the right commands (lines 200, 307, 350 and 393: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=… env -u GH_TOKEN …` and `env -u PLAYWRIGHT_CHROMIUM_EXECUTABLE env -u GH_TOKEN …`). The results are sound, and I reproduced the behaviour myself. Only the handoff's copies of the commands are wrong.

### F03-A6v2-P3-3: the deep handoff check will not pass "after A0 carries" the files, as documented (owner: A3 / F03; decision A0)

- **Where:**
  - `baseline.md` §8, last bullet: "no single tree passes it until A0 carries `baseline.md`, the handoff and the evidence into `integration`";
  - `F03.json` `blocked_checks`: "passes only after A0 carries …";
  - the same wording in `assumptions`.
- **Reproduction** (`a6_28`): in a throwaway worktree at `integration` (`b0bc6cf`), plus copies of `baseline.md`, `handoffs/F03.json` and `evidence/F03/`, run `validate.py --handoff .orchestration/handoffs/F03.json`. It exits 1 with the single problem `base_commit cb3becf25ed0… != HEAD b0bc6cf634b0…`. `validate.py:2461` requires `base_commit == HEAD`, and on `integration` HEAD can never be `cb3becf`.
- **Expected:** the statement says what it would actually take. For example: the deep check needs HEAD equal to `base_commit`, so in integration it fails on that rule alone. Or A0 decides how to deep-check a task whose result lives on another branch.
- **Actual:** the documentation says the check will pass after the carry. It will not: it still fails on `base_commit = HEAD`.
- **Positive side:** in the carried tree, every other deep check passes (36/36 hashes, 42/42 evidence paths, every changed path). The check is correctly marked `not_run`, so nothing is overstated as a pass.

### Observations (not findings)

- **Blocked steps exit 0.** A run with no usable browser marks `test_e2e` and `base02_capture` as `blocked` and still exits 0. This is documented in the README table, and §7 P6 tells A0 to gate on the exit code. If A0 adopts the runner in CI (P1), the job should make sure the browser install step fails loudly. `verify.yml`'s `npx playwright install --with-deps chromium` does that today.
- **The French home page shows the English guide cover** ("Build a Better Retirement Together"). This is pre-existing codex content, the same before and after, and `docs/RESPONSIVE-REVIEW.md` documents it ("The cover and English PDF are from the retirement-guide prototype"). It is not F03's scope, and it is not a regression.
- **Unchanged from attempt 1** (still A0 proposals, correctly not applied by F03):
  - FND-1 (`.orchestration` linted: 21 warnings, 0 errors);
  - P5 (`.prettierignore`);
  - CX-18 (a contract-set change owned by A0).
- **Technical versus human approval.** This review verifies the technical baseline only. The canonical branch and design direction (G0, HB-03), presentation's repository scope (HB-12), the approval flags (D-061) and the guide PDFs (G3) all still need human decisions.

## Cleanup

- My three worktrees were checked (0 porcelain lines after restoring the build-rewritten `next-env.d.ts`) and removed. The carry and `cb3becf` worktrees were throwaway and removed too. `git worktree list` shows no `a6-f03-2*` entry.
- The branch and remote refs are the same as at the start (`a6_27`).
- In the main repo I wrote only `E6/` and this review. The pre-existing ` M .orchestration/contracts/fixtures/workshop/index.json` (F02a, in flight) was there before I started, and I did not touch it.
- **Main-repo HEAD moved during this review.** At 10:42:29Z, after all my checks had run, A0 committed the WIP snapshot `ccf76bd` ("WIP snapshot: F02a and F03 outputs under verification (not accepted)") on `claude/orchestration-foundation`, on top of `cb3becf`.
  - It captured `baseline.md`, the handoffs, the F02a/F03 evidence and my `E6/` as they stood. `git status` shows no later change to `E6/`.
  - This review file came afterwards, so it is untracked.
  - Every check above ran while the main HEAD was `cb3becf` (`a6_07`: "equals main HEAD: True"). `integration` is still `b0bc6cf`.
  - A consequence for A0: `F03.json` `base_commit` `cb3becf` is no longer the main-path HEAD either, so `validate.py --handoff` in the main path now also fails the `base_commit = HEAD` rule. That adds to P3-3.
