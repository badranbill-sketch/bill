# F03 baseline: integration branch and reproducible check suite

- Task F03 (owner A3, reviewer A6, stage local_implementation_tested, checks BASE01 and BASE02). Status: **submitted (repair attempt 2), not accepted**. A6 verifies it; A0 records acceptance.
- Written 2026-09-30 by the A3 delegate; updated the same day for repair attempt 2 (A6 review `reviews/F03.md`, verdict needs_changes on F03-A6-P2-1). What changed is in §10. Main repo `/home/user/bill` at `cb3becf25ed042b977d4864ae71e74d13829320f` (branch `claude/orchestration-foundation`). Work was done in the worktree `…/scratchpad/wt/integration` on the new local branch **`integration`**. Nothing was pushed. No remote ref changed (`E/reconcile/06_final_state.log`).
- **result_commit `b0bc6cf634b0b5498cc335da4d2d15da04276e3a`** ("Make baseline partial runs fail closed (F03 repair, A6 F03-A6-P2-1)"), a new commit on top of the attempt-1 suite commit `5545c2aeb3249e19e5f328c86fa7d264c04ec0d2` ("Add reproducible baseline check suite (F03)"). Nothing was amended or force-moved in repair 2.
- `E/` means `/home/user/bill/.orchestration/evidence/F03/`. `…/scratchpad` means `/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad`. Every command, exit code and wall time is in the `E/` logs. The `### command / exit / wall_s` records come from the helper `…/scratchpad/f03/rl.sh`.
- Every browser result below ran **under substitute Chromium 141** (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, 141.0.7390.37). The lockfile's Playwright 1.63.0 expects chromium rev 1243 (153.0.8010.12), which is not installed and cannot be downloaded here (D-058, TB-02).
- `GH_TOKEN` and `GITHUB_TOKEN` exist in this container's environment. They were withheld from every run (`env -u GH_TOKEN -u GITHUB_TOKEN`), as in F00. No token value was read, logged or used.

---

## 1. Selected baseline and why

**Integration baseline = `codex/desktop-iphone-unified@66cce52` + `guide/pre-retirement-guide@749b360` (merged) + orchestration record `cb3becf` (merged).** This is the technical baseline for local work (D-073). It is not the canonical production branch: G0 records that through **HB-03** (`blockers.md`, D-028).

| Reason | Evidence |
|---|---|
| codex is the only F00 target green on the full CI sequence (e2e 41/41 under Chromium 141). main, guide and video fail lint, typecheck and build because of `film/`. homepage's e2e was never run | `inventory.md` §8; `evidence/F00/checks/codex/*.log` |
| codex contains `add-ask-bill-section` (it is an ancestor) and is the newest line with human-authored commits (`d8ce2ef`, `66cce52`, arnaud verdier) | `inventory.md` §1.1; `E/reconcile/02_trial_merges.log` (codex ← add-ask: already contained) |
| guide merges clean and carries the 32-page book generator that C09/U00 build on | `E/reconcile/02_trial_merges.log`, `E/reconcile/03_merges.log` |
| The merged candidate keeps every CI step green that codex had green, with no regression (§4) and pixel-identical pages (§5) | `E/suite/final-5545c2a/results.json`, `E/repair2/suite-full-b0bc6cf/results.json`; `E/base02/diff/report.json`, `E/repair2/base02-diff-codex-vs-b0bc6cf/report.json` |
| The orchestration record merges clean and touches only `.orchestration/` (789 paths) | `E/reconcile/02_trial_merges.log`, `E/reconcile/03_merges.log` |

## 2. Merge record

The F00 trial-merge facts were re-verified first in a throwaway detached worktree (`…/scratchpad/wt/f03-trial`, removed afterwards). Method: `git merge --no-commit --no-ff`, then `git merge --abort`, then `git status --porcelain` (0 lines after each abort). Log: `E/reconcile/02_trial_merges.log`.

| Trial | Exit | Conflicted paths | Matches F00 §2.1 |
|---|---|---|---|
| codex ← guide `749b360` | 0 | none | yes |
| codex ← presentation `fc00445` | 1 | `eslint.config.mjs`, `tsconfig.json` | yes |
| codex ← homepage `d63aabd` | 1 | `components/pages.tsx`, `lib/copy.ts`, `lib/ink-files.json`, `scripts/build-ink.tsx`, `tests/browser/site.spec.ts` | yes |
| codex ← `cb3becf` | 0 | none; 789 staged paths, 0 outside `.orchestration/` | new |
| integration-after-guide `1316ebe` ← presentation | 1 | `eslint.config.mjs` (1 hunk), `tsconfig.json` (1 hunk) | same as codex |
| integration-after-guide `1316ebe` ← homepage | 1 | the same 5 files; 9 hunks (§3.1) | same as codex |

Merges on `integration` (log `E/reconcile/03_merges.log`; all `--no-ff`, with a descriptive message and the session trailers):

| # | Merged branch | Head SHA | Merge commit | Parents | Conflicts, and how resolved |
|---|---|---|---|---|---|
| 0 | start: `origin/codex/desktop-iphone-unified` | `66cce52046f535ddc1a90e6f94474877e375860d` | — | — | `git worktree add -b integration … origin/codex/desktop-iphone-unified`, then `git branch --unset-upstream integration`, so a bare push cannot target codex |
| 1 | `origin/guide/pre-retirement-guide` | `749b360f75185041e1aa3408500857605bc4507f` | `1316ebe10fe9ff753c3ce42151018ae3cebcc163` | `66cce52`, `749b360` | **None.** 21 files, +8304/−1: 18 new under `guide/`, new `scripts/ink-sheet.tsx`, `package.json` gains the `guide` script, `.gitignore` gains `guide/dist/` |
| 2 | orchestration record `cb3becf` (`claude/orchestration-foundation`) | `cb3becf25ed042b977d4864ae71e74d13829320f` | `67ba636cee04e8b0839d9c7b028a77d2791e32ff` | `1316ebe`, `cb3becf` | **None.** 789 files, all under `.orchestration/` |
| 3 | suite commit (not a merge) | — | `5545c2aeb3249e19e5f328c86fa7d264c04ec0d2` | `67ba636` | 8 files: `tests/baseline/*` (6), `package.json`, `package-lock.json` |
| 4 | repair-2 commit (not a merge) | — | **`b0bc6cf634b0b5498cc335da4d2d15da04276e3a`** | `5545c2a` | 5 files, all under `tests/baseline/`: `run.mjs`, `compare-screens.mjs`, `README.md` changed; `runner-lib.mjs`, `runner.test.mjs` new. No `package.json`/lockfile change (§10) |

No conflict was resolved, so no hunk was taken from either side. The suite commit was first created as `6b095fbc8033b51cbe92f044f310f5d8c27659cd`. Before any push, it was amended into `5545c2a`, so the suite stays one commit as the packet asks. The amend adds two small `run.mjs` changes: it re-reads the browser expectation after `npm ci`, and it names a missing `gh` in the protections reason. `6b095fb` was never pushed. Its full suite run (identical classifications) is kept in `E/suite/run1-6b095fb/`.

`package.json` / `package-lock.json` (lock granted by A0: pinned devDependencies and new test scripts only):
- New scripts: `test:baseline`, `test:contracts`, `test:base02`. The 13 existing scripts are unchanged (`git diff 67ba636 5545c2a -- package.json`).
- New devDependencies, exact versions: `ajv` 8.20.0, `ajv-formats` 3.0.1, `pixelmatch` 7.2.0 (the BASE02 pixel diff), `pngjs` 7.0.0.
- The lockfile only gains entries: 9 new package entries. The root `ajv` becomes 8.20.0 and `json-schema-traverse` becomes 1.0.0, and eslint's ajv 6.15.0 / json-schema-traverse 0.4.1 move under `eslint/node_modules/` and `@eslint/eslintrc/node_modules/` (`E/suite/00_dev_setup.log`).
- First attempt, reverted: npm 10.9.7's `npm install` also stripped the `libc` field from 30 optional platform entries (`@img/sharp-*`, `@next/swc-*`, `@unrs/resolver-binding-*`). That is unrelated to the new packages, so the files were restored and the install was redone with `npx npm@11.20.0`, which keeps them (`E/suite/00_dev_setup.log`).

## 3. Branches preserved, not merged

Every branch stays on origin at its F00 SHA (`git ls-remote`, `E/reconcile/06_final_state.log`). Nothing was cherry-picked.

### 3.1 `claude/bill-centered-homepage` `d63aabd50d0760145208857856f32779b1069e15`: a competing homepage; the G0 decision is **HB-03**

Conflicts against the integration candidate (after guide; `E/reconcile/05_homepage_conflict_hunks.log`; lines strictly between markers):

| File | Hunk (marker line) | integration lines | homepage lines | What competes |
|---|---|---|---|---|
| `components/pages.tsx` | 1 (96) | 2 | 6 | the `Home` doc comment that fixes the page order: codex has introduction, guide and questions, Bill, journey, conversation; homepage has Bill, why, questions, guide, meeting, with the ride as an epilogue |
| | 2 (158) | 24 | 137 | after the hero portrait: codex's desk-caption overlay, `<Features>` and the philosophy section `#about-bill`, against homepage's photo caption and the new "Why Bill" section `#pourquoi-bill` |
| | 3 (329) | 35 | 4 | the page end: codex's `<Ride>`, meeting steps `#rencontre` and `<Conversation>`, against homepage's `<Ride>` + `<Contact>` |
| `lib/copy.ts` | 1 (4), 2 (156) | 6, 6 | 14, 14 | FR and EN nav: an array in codex, an object with an `ask` entry in homepage; new eyebrow and hero copy |
| `lib/ink-files.json` | 1 (26) | 24 | 0 | homepage drops the dock and desk-caption entries |
| `scripts/build-ink.tsx` | 1 (23), 2 (42) | 3, 2 | 2, 0 | the same drawings in the ink export |
| `tests/browser/site.spec.ts` | 1 (23) | 5 | 5 | `.hero-person img` (codex) against `.hero-print img` (homepage) |

The merge would also delete `public/assets/ink/dock.ccd6542ba7.svg`, `desk-caption-en.6834acbe8c.svg` and `desk-caption-fr.15f201593d.svg`. Dock is the closest seed for ink asset A06 (`inventory.md` §4).

What the branch would add or change (37 files, +2177/−615 against the merge base `77de3bd`; `E/reconcile/04_preserved_branch_deltas.log`):
- **New:** the Ask Bill page and data: `components/ask.tsx`, `lib/ask.ts` (12 Q&A in Bill's name, claim C8, provenance unverified: HB-23), `docs/ASK-BILL.md`, and `tests/ask.test.ts` (+5 unit tests). Also the "Before You Retire" booklet, `components/booklet.tsx` (`guide.pdf=null`; the free printed-copy request conflicts with the paid book: D-049).
- **Changed:** the "Why Bill" / independent-practice copy (claims C1–C3; `lib/copy.ts`, `lib/pages.ts`), the navigation, `components/journey/ride.tsx`, `lib/journey.ts`, `lib/ride.ts`, `app/globals.css`, `app/ride.css` and `docs/COPY-STRATEGY.md` (flags 16–22).
- **Guard-relevant changes that need review in any port:** `lib/routes.ts` (adds the `ask` route key), `lib/business.ts`, `scripts/launch.ts`, `eslint.config.mjs`, `tsconfig.json`, `.prettierignore`.

Decision needed: **G0, HB-03** (Arnaud, with Bill for the design): codex, homepage, or a manual merge of the hero, the navigation and the 3 drawings. Also D-028, D-073 and TB-13. Per HB-03's proposal, homepage content is ported only after that decision and after HB-23 (Ask Bill provenance). **Hypothesis, not tested:** the non-conflicting parts (`lib/ask.ts`, `tests/ask.test.ts`, `docs/ASK-BILL.md`) could be ported alone. But `components/ask.tsx` depends on the nav/route change (`ask` key), so a port is a design task, not a merge.

### 3.2 `claude/bill-presentation-video` `fc0044576d851be414d19e2f7a21ca7fd1285eae`: internal pitch, repository scope **HB-12** (Q10)

- It is not merged, because it is an internal pitch video whose offers are superseded (a 45-minute monthly session, a 7-email automation, "print 50–100 books", "webinars next, paid ads last"; `inventory.md` §6.3, D-049). Whether it belongs in the product baseline is Arnaud's open question Q10, recorded as **HB-12** in `blockers.md`.
- It adds 64 files under `presentation/` and modifies `.prettierignore`, `eslint.config.mjs` and `tsconfig.json` (67 files, +7378/−1).
- A merge would conflict only in the two ignore one-liners: `"film/**"` against `"presentation/**"` in `eslint.config.mjs`, and `["node_modules", "film"]` against `["node_modules", "presentation"]` in `tsconfig.json` (`E/reconcile/02_trial_merges.log`). **Hypothesis, not tested:** keeping both entries resolves it.

### 3.3 Other refs

- `add-ask-bill-section` `01e296c` is contained in codex (ancestor), so there is nothing to merge.
- `main` `77de3bd` is the merge base of every branch.
- PR #1 (a draft, from codex into add-ask-bill-section) was not touched. Retargeting or closing it waits for HB-03.

## 4. Results: integration candidate against F00 codex

Integration: `node tests/baseline/run.mjs` at **`b0bc6cf`**, after `git clean -fdX` (a clean-checkout equivalent), 2026-09-30T10:11:20Z–10:15:48Z. Total wall time 268.18 s (`E/repair2/01_suite_full_b0bc6cf.log`). Results are in `E/repair2/suite-full-b0bc6cf/results.json`, and each step log is in that directory. The attempt-1 run at `5545c2a` (`E/suite/final-5545c2a/`, 264.96 s) gave the same exit code and classification for each of its 14 steps; A6 reproduced it independently (`reviews/F03.md`). F00 codex rows come from `evidence/F00/checks/results.json` and `evidence/F00/checks/codex/*.log`.

Command, verbatim: `env -u GH_TOKEN -u GITHUB_TOKEN PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tests/baseline/run.mjs --out …/scratchpad/f03r2/suite-full --python …/scratchpad/venv-f02/bin/python` (Python 3.11.15, jsonschema 4.26.0).

| Step | Command | Integration exit, s (`b0bc6cf`) | Classification | `5545c2a` | F00 codex exit | Regression? |
|---|---|---|---|---|---|---|
| npm_ci | `npm ci` | 0, 18.5 | pass | 0, pass | 0 | no |
| lint | `npm run lint` | 0, 15.6 | pass | 0, pass | 0 | no. New: 21 warnings, all in `.orchestration/evidence/F02/a6-math-attempt{1,3}/*.mjs` (codex: 0). Finding FND-1, §6 |
| test | `npm test` | 0, 0.8 | pass (13/13) | 0, pass | 0 (13/13) | no |
| typecheck | `npm run typecheck` (before build) | 0, 7.1 | pass | 0, pass | 0 | no |
| build | `npm run build` | 0, 23.0 | pass | 0, pass | 0 | no |
| typecheck_after_build | `npm run typecheck` | 0, 7.7 | pass | 0, pass | 0 | no |
| protections_check | `npm run protections:check` | 1, 0.5 | blocked: GITHUB_REPOSITORY not set, and gh not installed | 1, blocked | 1 (blocked) | no |
| launch_check | `npm run launch:check` | 1, 0.6 | expected_fail_by_design: only the 8 approval flags; cites `LAUNCH-CHECKLIST.md:3` and D-061 | 1, same | 1 (by design) | no |
| verify_publication | `node --import tsx scripts/verify-publication.ts` | 0, 0.4 | pass, **vacuous**: 0 published articles, no GitHub call | 0, same | 0 (vacuous) | no |
| test_e2e | `npm run test:e2e` | 0, 85.9 | pass: **41 passed, under substitute Chromium 141** | 0, 41 passed | 0 (41 passed, Chromium 141) | no |
| contracts_ajv | `npm run test:contracts` | 0, 1.8 | pass (240/240) | 0, 240/240 | new | — |
| contracts_validate_py | `…/venv-f02/bin/python .orchestration/contracts/validate.py` | 1, 5.3 | **fail**: pass 350, fail 1 (CX-18), known 16 | 1, identical output | new | pre-existing at `cb3becf` (§6) |
| build_graph_check | `python3 .orchestration/scripts/build_graph.py --check` | 0, 0.04 | pass (62 tasks, 62 checks, 0 errors) | 0, pass | new | — |
| base02_capture | `npm run test:base02` | 0, 97.7 | pass: **49 passed, under substitute Chromium 141** | 0, 49 passed | new | — |
| runner_selftest | `node --test tests/baseline/runner.test.mjs` | 0, 1.8 | pass (13/13) | new in repair 2 | new | — |

**Suite overall: `fail`, exit 1** (`{"pass": 12, "blocked": 1, "expected_fail_by_design": 1, "fail": 1}`, `requested_not_run: []`). The single failure is `contracts_validate_py`, which is pre-existing in the orchestration record and not introduced by F03 (§6). The suite does not mask it. `dirtied_by_suite` is `[" M next-env.d.ts"]`, as in attempt 1.

Supporting runs:
- **Guide generator on integration:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE=… npm run guide` exits 0 and writes 4 PDFs (EN/FR × screen/print). guide/build.tsx itself reports 32 pages each, 1.1–1.3 MB, as F00 saw on the guide branch (`E/suite/03_guide_generator_integration.log`; sha256 values there). The page count is self-reported: pypdf is not installed, and a byte regex finds no page objects because they sit in compressed object streams.
- **Contract negative controls** (`E/suite/contracts_negative_controls.log`), each run on a scratch copy through `BASELINE_CONTRACTS_DIR`:
  - NC-A: `idempotency_key` dropped from `required`.
  - NC-B: an unknown property added to a valid delivery job.
  - NC-C: a harness-layer example made schema-invalid.
  - NC-D: one fixture dropped from the index.
  - NC-F: both minimum-1 rules on the planning horizon loosened.

  Each exits 1 at the named subtest. NC-E mutated nothing because its selector matched no node, so it is void. NC-E2 loosened only one of two independent minimum-1 rules; the second rule (`$defs/quantity/allOf/2/then`) still rejects the example, so its exit 0 is explained, not a test gap.
- **Forward check (informative):** the same Ajv test against the main path's uncommitted, in-flight F02a contracts (WM37–WM40 added by another task) gives 244/244 (`E/suite/04_contracts_ajv_on_main_path_inflight_F02a.log`).

## 5. BASE02 comparison (before = codex `66cce52`, after = integration `5545c2a`; re-checked at `b0bc6cf`)

- Spec: `tests/baseline/screens.spec.ts` + `playwright.baseline.config.ts`, the same bytes for both runs (sha256 `c224d751…` / `d853eec5…`, `E/base02/before_capture.log`, `E/base02/after_capture.log`). `lib/routes.ts` is identical in both trees (`routes_identical=yes`).
- **Before:** served from `…/scratchpad/wt/base01-codex` (the F00 worktree at `66cce52`), rebuilt first with `npm run build` (exit 0, `E/base02/before_build.log`), via `BASE02_APP_DIR`.
- **After:** the integration worktree at `5545c2a`, served from the suite's production build.
- Both runs used `next start` on port 3200 with the review-mode test values of `playwright.config.ts`, `reducedMotion: "reduce"`, and **substitute Chromium 141.0.7390.37**.
- Captured: home (with the journey `#parcours`), guide (`resources`) and contact (`meeting`, whose `#contact` holds the inquiry form), in fr and en, at 320, 390, 768 and 1440 px: 24 full-page PNGs. Also a status/console smoke check of the other 6 route keys × 2 languages × {320, 1440}, and the `/` entry and `/api/guide`. Before: 49/49 tests passed; after: 49/49.
- **Result: 24/24 `identical`, diff 0 %, 24/24 byte-identical, 0 record differences** (status, console errors, page errors, failed requests, 4xx/5xx subresources, overflow, incomplete images, journey, inquiry form, endpoints) (`E/base02/diff/report.json`, `E/base02/compare_before_after.log`). Merging guide and the orchestration record did not change the site. **No finding.**
- Facts recorded on both sides:
  - Every document returned 200, with 0 console errors, 0 uncaught page errors, 0 failed requests (page-cancelled Next.js prefetches are counted separately) and no horizontal overflow.
  - `/` redirects 307 to `/fr`.
  - `/api/guide` returns the 912,448-byte review PDF, because `LOCAL_REVIEW=true` in review mode.
  - At 390 px, `/assets/ink/lighthouse.b6b8127f9b.svg` stays incomplete after the bounded wait on both home pages: it is a lazy image that never enters the layout at that width. This is recorded, not a regression.
  - The journey renders `data-mode="static"` under reduced motion.
- **Controls:**
  - Determinism: the suite's own capture and the separate "after" capture of the same build compare 24/24 identical, 0 record differences (`E/base02/compare_determinism_suite_vs_after.log`, `E/base02/determinism_suite_vs_after.report.json`).
  - Comparator: a 40×40 red block painted into one PNG and one injected console error are both detected (1 changed, diff 0.0917 %; 1 record difference; exit 1) (`E/base02/compare_negative_control.log`).
- **Repair 2 re-check:** the repaired suite's own capture at `b0bc6cf` compared with the same codex "before", using the repaired `compare-screens.mjs`: 24/24 `identical`, 0 `within_threshold`, 24/24 byte-identical, 0 record differences, exit 0 (`E/repair2/02_base02_codex_before_vs_b0bc6cf.log`, `E/repair2/base02-diff-codex-vs-b0bc6cf/report.json`). Repair 2 touched only `tests/baseline/`, so no site change was expected, and none was found.
- Size: `E/base02/before/` and `E/base02/after/` are about 33 MB each (PNGs plus `records/`). The suite runs' own PNGs were compared and not kept; their records, with each PNG's sha256, are in `E/suite/*/base02-records/`.

## 6. Pre-existing failures, blocked checks and findings

| ID | Where | What | Root cause | Status |
|---|---|---|---|---|
| PRE-1 | integration (from `cb3becf`) | `validate.py` exits 1: CX-18 "worker-handoff task_id pattern vs tasks.json: ['F02a']" | **Confirmed:** the same single failure, with identical output, on a clean checkout of `cb3becf` (`E/suite/preexisting_validate_py_at_cb3becf.log`). `tasks.json` gained `F02a` (A0's split, commit `cb3becf`). The frozen `worker-handoff.schema.json` `task_id` pattern (`F0[0-3]…`) and CX-18 were not updated with it | Contract-set change, owner A0 (contracts README §3). Not fixed by F03 (not in its locks). The F02a task in flight may resolve it |
| PRE-2 | all branches | `protections:check` exit 1: "Set GITHUB_REPOSITORY=owner/repo and authenticate gh." With the repository set, `spawnSync gh ENOENT` (F00) | `gh` is not installed; the token is deliberately withheld | **blocked**. Needs HB-11 (token as a repository secret) and a CI or `gh` environment. If it could run, branch protection is known to be off (`inventory.md` §1.1), so it would *fail*: that is TB-12, not by design |
| PRE-3 | all branches | `launch:check` exit 1: "Launch blocked: businessDetails, serviceScope, qualificationsAndAffiliation, portraitRights, websiteCopy, privacyPolicy, legalNotices, contactOperations" | 8 human approvals are false in `lib/business.ts` | **expected_fail_by_design** (`LAUNCH-CHECKLIST.md:3`, D-061). The flags were not touched |
| PRE-4 | all branches | `verify-publication` passes vacuously | 0 articles have `status: published` | Not evidence of working publication controls (D-059, TB-03) |
| PRE-5 | local environment | e2e under the lockfile's default browser: 38 of 41 fail on codex (F00 `codex/11_…log`) | chromium rev 1243 / headless shell 1243 not installed; the CDN returns 403 | blocked here. All browser evidence is under the substitute Chromium 141 (TB-02). Re-run in repair 2 through the suite (`--only build,test_e2e`, default browser): 38 failed, all with "Executable doesn't exist", 3 passed, so `blocked`; since repair 2 the step is `blocked` only when every failing test has the launch error (§10) |
| TB-01 | main, guide branch, video | lint, typecheck and build fail inside `film/` (F00) | **Confirmed in F00:** main's config does not exclude `film/` | **Resolved on the integration candidate by the baseline choice:** codex's `film` exclusions came in unchanged, and guide added no `film/` change. lint, typecheck and build pass |
| TB-14 | main | e2e `.hero img` strict-mode failures (F00 diagnostic) | Hypothesis: a stale selector. On integration the test uses `.hero-person img` (`git grep`) and 41/41 pass | Consistent with the hypothesis; main itself was not re-run (outside the baseline) |
| FND-1 | integration | `npm run lint` now lints 28 files under `.orchestration/` (the F02 evidence scripts `.mjs`/`.ts`) and reports 21 warnings there (`no-unused-vars` 16, `no-unused-expressions` 5; 0 errors). `tsc` does not include them (TypeScript skips dot-directories: 0 `.orchestration` files in `tsc --listFilesOnly`) | The orchestration record merged into the app tree, and `eslint.config.mjs` does not ignore `.orchestration/**` | Exit 0 today. Risk: a future evidence script with a lint error would fail the app's CI. Proposal P2 (§7) |
| FND-2 | environment | `npm install` with npm 10.9.7 strips the lockfile `libc` fields | An npm version difference (the lock was written by a newer npm) | Worked around with npm 11.20.0 (§2). Lock edits should use npm ≥ 11. `npm ci` is unaffected |

## 7. Reproducibility notes and proposals (not applied; root CI config is not in F03's locks)

**Files the suite, build or dev dirty:**
- `npm run build` rewrites the tracked `next-env.d.ts` (`./.next/dev/types/…` becomes `./.next/types/…`). It is the only tracked change after a full suite run (`dirtied_by_suite` in `results.json`). The committed version reflects a `next dev` run.
- `npm run ink` (inside `build` and `dev`) regenerates `public/assets/ink/*.svg` and `lib/ink-files.json`. It produced no diff in any F03 run (deterministic here).
- `next dev` (not run by F03) rewrites the managed block in `AGENTS.md`/`CLAUDE.md` (`node_modules/next/dist/server/lib/generate-agent-files.js`).
- `npm run guide` writes `guide/dist/` (gitignored).
- Playwright empties `test-results/` at the start of `test:e2e`, so `run.mjs` stages its logs in the OS temp directory and copies them to `--out` after every step.
- `agent-browser` is declared as `"latest"`. `npm ci` installs the locked 0.38.1, which warns that it wants Node ≥ 24 (EBADENGINE). A plain `npm install` could move it.

**Proposals for A0:**
- **P1 (verify.yml):** add `npm run test:contracts` (1.8 s, no network) and `python3 .orchestration/scripts/build_graph.py --check`. `validate.py` would need `pip install jsonschema` and `fetch-depth: 0`, because it runs `git show origin/{main,codex/…,claude/bill-centered-homepage}:lib/routes.ts`. Keep it as a separate job until PRE-1 is fixed.
- **P2:** decide whether `.orchestration/**` belongs in the ESLint ignore list (FND-1). This scopes evidence scripts out of the app lint without weakening any app rule. The alternative is to keep the record out of product branches.
- **P3:** get a CI-equivalent browser run (verify.yml already runs `npx playwright install --with-deps chromium`, which yields rev 1243) before release (TB-02).
- **P4:** pin `agent-browser` to an exact version.
- **P5 (A6 F03-A6-P3-2, owner A0):** add `.orchestration` to `.prettierignore` (or keep the record out of product branches). On integration, `npx prettier --check .orchestration` flags 240 files, including the hash-bound `contracts/`, so `npm run format` (`prettier --write .`) would rewrite the contract set and the evidence. `.prettierignore` is not in F03's locks, so this is a proposal only. It is the Prettier counterpart of P2.
- **P6 (if P1 adopts the runner in CI):** gate on the runner's exit code, not on `overall`. 0 = no failure and every requested step ran; 1 = a step failed; 2 = usage error; 3 = incomplete (a requested step did not run). A CI job that runs a subset must list the prerequisite `build` explicitly (for example `--only build,test_e2e`).

## 8. What remains untested, and why

- **The CI-equivalent browser:** all e2e and BASE02 results are under the substitute Chromium 141, not rev 1243 (it is not installed and the CDN returns 403).
- **Motion states in BASE02:** captures use reduced motion so they are pixel-stable. The ride and reveal animations are covered only by `test:e2e` (41 tests).
- **`protections:check` against the real repository:** no `gh`, and the token is withheld. **`verify-publication` with a published article:** there are none.
- **The GitHub Actions run of the suite and `verify.yml`:** no Actions access. `validate.py` in a shallow checkout would exit 2 (blocked), a hypothesis from its `git show` calls, not run.
- **homepage and presentation:** not built or tested as part of the integration candidate (they are not merged). homepage's e2e is still not_run (F00).
- **`next dev`, and `npm run format` (prettier over the whole repo):** not run. Prettier was applied only to the files under `tests/baseline/`. Since repair 2 all eight pass `npx prettier --check tests/baseline`, including `README.md`, which attempt 1 had left unformatted (A6 F03-A6-P3-4).
- **The generated guide PDFs:** only the generator's exit code and self-reported page counts; no content or visual review. The PDFs are unapproved drafts (G3).
- **The runner's exit codes in a real CI job:** they are tested locally only (§10: the self-test, the partial-run controls and the mutations).
- **The `validate.py --handoff` deep check of `handoffs/F03.json`:** by design it compares `base_commit` with the HEAD of the repo it runs in and hashes artifacts in that tree. The F03 artifacts live partly in the result commit on `integration` and partly under the main path, so no single tree passes it until A0 carries `baseline.md`, the handoff and the evidence into `integration`. The schema check passes (§9).

## 9. Evidence index (`E/` = `.orchestration/evidence/F03/`)

- `reconcile/`:
  - `01_refs_and_worktree.log`: remote heads, worktree creation, upstream unset.
  - `02_trial_merges.log`: the F00 re-verification plus integration trials.
  - `03_merges.log`: the real merges, the suite commit and the amend.
  - `04_preserved_branch_deltas.log`: what homepage and presentation would add.
  - `05_homepage_conflict_hunks.log`: hunk sizes and staged deletions.
  - `06_final_state.log`: worktrees, branch graph, remote refs, main repo status.
- `suite/`:
  - `00_dev_setup.log`: `npm ci`, the npm 10 `libc` finding, the npm 11 install and the lock diff.
  - `01_suite_integration.log`: the run-1 driver, at `6b095fb`.
  - `02_suite_integration_final.log`: the final driver, at `5545c2a`.
  - `final-5545c2a/`: `results.json`, 14 step logs and `base02-records/`.
  - `run1-6b095fb/`: the same, for the superseded commit.
  - `03_guide_generator_integration.log`.
  - `04_contracts_ajv_on_main_path_inflight_F02a.log`.
  - `contracts_negative_controls.log`.
  - `preexisting_validate_py_at_cb3becf.log`.
- `base02/`:
  - `before_build.log`, `before_capture.log`, `before/`.
  - `after_capture.log`, `after/`.
  - `compare_before_after.log`, `diff/report.json`.
  - `compare_determinism_suite_vs_after.log`, `determinism_suite_vs_after.report.json`.
  - `compare_negative_control.log`.
- `repair2/` (repair attempt 2, §10):
  - `01_suite_full_b0bc6cf.log`, `suite-full-b0bc6cf/`: the full suite at `b0bc6cf` (`results.json`, 15 step logs, `base02-records/`).
  - `02_base02_codex_before_vs_b0bc6cf.log`, `base02-diff-codex-vs-b0bc6cf/report.json`: BASE02 re-check.
  - `03_partial_runs.log`, `partial/`: the partial-run controls a–j and f2, with each run's `results.json` and step logs.
  - `04_compare_screens_controls.log`: the comparator controls.
  - `05_selftest_mutations.log`: mutations M1–M4 against the runner self-test.
  - `06_final_state.log`: branch, worktree and remote refs after repair 2.
  - `handoff_validation.log`: the handoff checks.
- `.orchestration/handoffs/F03.json`: the worker handoff, schema-validated.

## 10. Repair attempt 2: A6 findings (`reviews/F03.md`) and what changed

Commit `b0bc6cf` (parent `5545c2a`, branch `integration`, not pushed) changes only `tests/baseline/`. It changes no guard, flag, existing test, npm script or dependency (`git diff 5545c2a b0bc6cf --stat`: 5 files, +822/−100).

| Finding | Severity | Handling | Evidence |
|---|---|---|---|
| F03-A6-P2-1: `run.mjs --only lint,test` ran nothing and exited 0, even with a lint error | P2 | **Fixed.** (1) An excluded `npm_ci` counts as met only when `node_modules` is verifiably the lockfile's install (`runner-lib.mjs` `installState`). It checks that `package.json` agrees with the lockfile root, that `node_modules/.package-lock.json` has the same version and integrity for all 532 locked packages (82 optional platform packages may be absent) and nothing extra, and that each of the 450 installed packages is on disk at that version. The step records this as `prerequisites_from_state`. (2) An excluded `build` is never assumed. (3) A requested step left `not_run`, or a run with no step selected, gives `overall: "incomplete"` and **exit 3**. `fail` still wins with exit 1. (4) An unknown step id or option, or a flag without a value, is a usage error (exit 2) before anything runs. Before the fix, `--only` without a value silently ran the full suite | `E/repair2/03_partial_runs.log`, `E/repair2/partial/` |
| F03-A6-P3-1: `compare-screens.mjs` could report `identical` vacuously | P3 | **Fixed.** No screenshot on either side gives "nothing to compare" and exit 1. A shot that is clean under pixelmatch but not pixel-identical gets the separate status `within_threshold` (counted in the summary, exit 0). `identical` now means every pixel is equal | `E/repair2/04_compare_screens_controls.log` |
| F03-A6-P3-2: `npm run format` would rewrite 240 `.orchestration` files | P3 | Not in F03's locks (`.prettierignore`). Proposal **P5** for A0 (§7) | — |
| F03-A6-P3-3: `changed_paths` followed codex `66cce52`, not `base_commit` `cb3becf` | P3 | **Fixed in the handoff.** `changed_paths` now lists every path in `git diff --name-only cb3becf b0bc6cf` outside `.orchestration/`, plus the main-path files. The assumption names the 24 that come from codex's own commits against main | `handoffs/F03.json` |
| F03-A6-P3-4: `tests/baseline/README.md` was not Prettier-formatted | P3 | **Fixed.** `npx prettier --check tests/baseline` passes for all 8 files | `E/repair2/suite-full-b0bc6cf/02_lint.log` (lint) and §8 |
| Observation: `e2eClassify` would mark a real API-test failure `blocked` when the browser is missing | — | **Fixed.** `blocked` now requires the summary's failed count to equal the number of failure blocks, and every block to carry the launch error. Otherwise the step is `fail`, and the reason counts the other failures | controls i, j below |

**Partial-run controls** (worktree at `b0bc6cf` after the full suite's `npm ci`; `E/repair2/03_partial_runs.log`; `GH_TOKEN`/`GITHUB_TOKEN` withheld):

| # | Invocation | Expected | Got |
|---|---|---|---|
| a | `--only lint,test` (the A6 reproduction) | both run and pass, exit 0 | lint 0 (15.96 s), test 0 (13/13); `prerequisites_from_state` npm_ci; exit **0** |
| b | the same, with `app/__a6_broken.ts` = `const x = ;` | lint fail, exit 1 | lint exit 1, "Parsing error: Expression expected" (1 error, 21 warnings) → `fail`; exit **1**. The file was removed afterwards |
| c | `--only contracts_ajv` | runs, exit 0 | 240/240; exit **0** |
| d | `--skip npm_ci,build,test_e2e,base02_capture,contracts_validate_py` | the other 10 steps run | 8 pass, protections blocked, launch expected_fail_by_design; exit **0** |
| e | `--only test_e2e` | not_run, exit 3 | "prerequisite build excluded by --only/--skip and its result cannot be verified from the working tree"; `overall: incomplete`; exit **3** |
| f2 | `--only lnt` | usage error, exit 2, nothing written | exit **2**, and no `--out` directory was created (record f ended with `ls`, so its exit is that of `ls`; f2 repeats it without) |
| g | `--only lint,test` with `node_modules/pngjs` moved aside | not_run, exit 3 | "node_modules does not match package-lock.json: node_modules/pngjs missing on disk"; exit **3**. After the restore, `installState` is ok again |
| h | `--only build,test_e2e`, substitute Chromium 141 | both pass, exit 0 | build 0, e2e 41 passed; exit **0** |
| i | `--only build,test_e2e`, the lockfile's default browser (rev 1243 absent) | test_e2e blocked | 38 failed (all "Executable doesn't exist"), 3 passed → `blocked`; exit **0** |
| j | as i, with the browser-free test "review PDF is unavailable outside review mode" made to expect 418 | test_e2e fail, exit 1 | "38 of 39 failing test(s) could not launch the browser, but 1 failed for another reason" → `fail`; exit **1**. The mutation was reverted with `git checkout`. The attempt-1 classifier would have said `blocked` and exit 0 |

After the controls, the worktree differs from `b0bc6cf` only in the build-rewritten `next-env.d.ts`, which was then restored (`E/repair2/06_final_state.log`).

**Runner self-test** (`tests/baseline/runner.test.mjs`, 13 tests; also the suite's last step, `runner_selftest`). It covers argument parsing, `installState` against 9 kinds of broken install, prerequisite resolution, the classifier (synthetic logs, plus the recorded F00 default-browser log and a tampered copy), `summarize`, and `run.mjs` itself: `--only lnt` gives 2, `--only test_e2e` gives 3, skipping every step gives 3, and `--only contracts_ajv` runs on a verified install. Mutations of `runner-lib.mjs` (`E/repair2/05_selftest_mutations.log`), each reverted afterwards:
- M1, the attempt-1 exit rule: 3 tests fail.
- M2, an excluded prerequisite assumed met: 3 fail.
- M3, the attempt-1 classifier: 2 fail.
- M4, packages missing on disk ignored: 1 fails.

In every case the self-test exits 1. After the revert, 13/13 pass.

**Comparator controls** (`E/repair2/04_compare_screens_controls.log`, on scratch copies of `before/en-meeting-390`):

| Control | Status | Exit |
|---|---|---|
| empty vs empty | "nothing to compare" | 1 (was 0) |
| one pixel R+3 | `within_threshold` (was `identical`) | 0 |
| 10×10 black block | `changed`, 0.0057 % | 1 |
| missing "after" | `missing_after` | 1 |
| identical copy | `identical` | 0 |
