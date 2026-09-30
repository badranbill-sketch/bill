# Baseline check suite (F03)

One command reproduces the repository's checks on any checkout and records what happened:

```bash
npm run test:baseline                      # = node tests/baseline/run.mjs
node tests/baseline/run.mjs --out DIR      # results elsewhere (default test-results/baseline/)
node tests/baseline/run.mjs --list         # print the steps and their prerequisites
node tests/baseline/run.mjs --only lint,test
node tests/baseline/run.mjs --only build,test_e2e
node tests/baseline/run.mjs --skip test_e2e,base02_capture
node tests/baseline/run.mjs --python /path/to/venv/bin/python   # a Python with jsonschema, for validate.py
node --test tests/baseline/runner.test.mjs  # the runner's own tests (also the last suite step)
```

Exit status:

| exit | meaning                                                                                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | no step failed and every requested step ran. `blocked` and `expected_fail_by_design` steps are allowed and listed                                                                |
| 1    | at least one step is `fail`                                                                                                                                                      |
| 2    | usage error, before anything runs: an unknown option or step id in `--only`/`--skip`, or a flag without a value                                                                  |
| 3    | incomplete: no step failed, but a requested step could not run (`requested_not_run` in `results.json`), or no step was selected. A partial run never reports success by omission |

### Partial runs (`--only`, `--skip`)

A step left out by `--only`/`--skip` is `not_run` with `excluded: true`. The steps you asked for keep their
prerequisites:

- `npm_ci` (for every node step). When it is left out, the node steps still run if `node_modules` is exactly
  the lockfile's install: `package.json` agrees with `package-lock.json`, `node_modules/.package-lock.json`
  lists the lockfile's version and integrity for every package (optional platform builds may be absent) and
  nothing else, and every listed package is on disk at that version. The step records this under
  `prerequisites_from_state`. Otherwise the step is `not_run` with the reason, and the run exits 3.
- `build` (for `test_e2e` and `base02_capture`). A left-out build is never assumed: an existing `.next/` cannot be
  matched to the working tree. `--only test_e2e` therefore exits 3; use `--only build,test_e2e`.

The runner never edits a guard, a flag or a test. It passes the environment through (plus
`NEXT_TELEMETRY_DISABLED=1`) and writes, under `--out`:

- `NN_<step>.log`: command, working directory, start time, env overrides, full output, exit code and seconds.
  Values of variables whose names look secret (`TOKEN`, `SECRET`, `PASSWORD`, `API_KEY`, `PRIVATE`) are
  replaced by `[REDACTED:<name>]`.
- `results.json`: per step `id`, `command`, `exit_code`, `seconds`, `log`, `classification`, and `reason`,
  `citation` or `note` where they apply. Also the git HEAD and `git status` before and after (the files the
  suite dirtied), and the environment: node, npm, Python, OS, browser, whether `gh` exists, and which of
  `GITHUB_REPOSITORY`, `GH_TOKEN`, `GITHUB_TOKEN`, `CONTENT_REVIEWERS`, `FIRM_REVIEWERS`,
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE` and `CI` were set. Values are never recorded.
- `base02/`: the BASE02 captures from the last step.

Logs are staged in the OS temp directory and copied to `--out` after every step, because Playwright empties
`test-results/` when the e2e run starts.

## Steps, in order

| id                      | command                                                 | source                                            |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `npm_ci`                | `npm ci`                                                | `.github/workflows/verify.yml`                    |
| `lint`                  | `npm run lint`                                          | verify.yml                                        |
| `test`                  | `npm test`                                              | verify.yml                                        |
| `typecheck`             | `npm run typecheck`                                     | before the build                                  |
| `build`                 | `npm run build`                                         | verify.yml                                        |
| `typecheck_after_build` | `npm run typecheck`                                     | verify.yml order (lint, test, build, typecheck)   |
| `protections_check`     | `npm run protections:check`                             | `docs/CONTENT-WORKFLOW.md`, `LAUNCH-CHECKLIST.md` |
| `launch_check`          | `npm run launch:check` (strict)                         | `LAUNCH-CHECKLIST.md`                             |
| `verify_publication`    | `node --import tsx scripts/verify-publication.ts`       | verify.yml (with whatever env is present)         |
| `test_e2e`              | `npm run test:e2e`                                      | verify.yml (`playwright.config.ts`)               |
| `contracts_ajv`         | `npm run test:contracts`                                | this folder, `contracts.test.ts`                  |
| `contracts_validate_py` | `<python> .orchestration/contracts/validate.py`         | `.orchestration/contracts/README.md` §7           |
| `build_graph_check`     | `python3 .orchestration/scripts/build_graph.py --check` | `.orchestration/scripts/build_graph.py`           |
| `base02_capture`        | `npm run test:base02`                                   | this folder, `screens.spec.ts`                    |
| `runner_selftest`       | `node --test tests/baseline/runner.test.mjs`            | this folder, `runner.test.mjs`                    |

CI runs `lint && test && build && typecheck` as one step, so the first failure hides the rest. The suite runs
each step on its own so every failure is visible. A step whose prerequisite did not pass (`npm_ci` for the node
steps; `build` for `test_e2e` and `base02_capture`) is `not_run`, never `pass`. In a full run that only happens
after the prerequisite failed, so the run already exits 1.

`runner_selftest` checks the runner itself: argument parsing, the `node_modules` check, prerequisite resolution,
the Playwright classifier and the exit codes, including `run.mjs --only test_e2e` (exit 3), `--only lnt` (exit 2)
and `--only contracts_ajv` (runs on a verified install).

## Classifications

| value                     | meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pass`                    | exit 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `fail`                    | a non-zero exit that no rule below explains. Nothing downgrades it. **Any `fail` makes the runner exit 1.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `expected_fail_by_design` | only `launch_check`, and only when (a) it exits 1, (b) every blocker it prints after "Launch blocked:" is one of the approval flags in `lib/business.ts`, and (c) `LAUNCH-CHECKLIST.md` still contains the line that says `npm run launch:check` intentionally fails for unresolved approval categories (the runner cites that line number; see also `.orchestration/decisions.md` D-061). Any other blocker in the output makes it `fail`.                                                                                                                                                                                                                                 |
| `blocked`                 | a missing tool, secret or browser build, and the output must show it: `protections_check` without `GITHUB_REPOSITORY`, without `gh` or without gh authentication; `verify_publication` needing `gh` for a published article; a Playwright browser that cannot be launched, and only when every failing test failed with the launch error (the summary's failed count equals the failure blocks, each carrying "Executable doesn't exist" or a launch ENOENT); if any other test failed, for example an API test that needs no browser, the step is `fail`; `validate.py` without `jsonschema` (checked before running) or its setup error (exit 2). The reason is recorded. |
| `not_run`                 | the step was excluded with `--only`/`--skip` (`excluded: true`), or a prerequisite did not pass. A requested step that is `not_run` makes the run exit 3 unless a step failed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

`results.json` `overall` is `fail` if any step failed (exit 1); `incomplete` if a requested step did not run or
nothing was selected (exit 3); `pass_with_exceptions` if any step is blocked, excluded or expected to fail by
design (exit 0); and `pass` only if every step passed (exit 0). `verify_publication` passing with 0 published
articles is noted as vacuous: no GitHub call is made.

## Contract validation (`npm run test:contracts`)

`contracts.test.ts` runs under `node --import tsx --test` with Ajv 8 (`ajv/dist/2020`, JSON Schema 2020-12) and
`ajv-formats`, both pinned in `devDependencies`. It checks:

- every schema of the contract set compiles (meta-validated; unknown keywords and formats refused);
- every `examples/valid/<name>/*.json` passes its schema;
- every `examples/invalid/<name>/*.json` is rejected for the reason in its `.why.txt`: the expected keyword at the
  expected instance path (and the expected keyword value or parameter where the file names one). For
  `workshop-inputs`, no error may fall outside that path; Ajv's summary error for a failed `if`/`then` is allowed
  only on the path or an ancestor;
- the two `json-parse` examples (NaN, Infinity): strict `JSON.parse` refuses them, and a lenient parse still fails
  the schema at the stated path;
- the ten `semantic`/`harness` examples are **schema-valid by contract design** (only a harness rule rejects them;
  `validate.py` S3 fails if the schema does). The test asserts they pass the schema and does not re-implement the
  harness. Their rejection is checked by the `contracts_validate_py` step;
- every workshop fixture input (`WM*.json`, the possible rows and supplementary cases of `clip-rules.json`) passes
  `workshop-inputs.schema.json`, and `fixtures/workshop/index.json` lists exactly the files on disk.

The mapping from example folder to schema mirrors `SCHEMAS` in `validate.py`; a new folder without a mapping fails.
`BASELINE_CONTRACTS_DIR=<copy>` points the test at a copy of `contracts/` for negative controls.

Ajv options: `strict: true` with `strictTypes: false` and `strictRequired: false`. Those two are Ajv lint rules,
not JSON Schema: the contracts refine properties inside typeless `if`/`then` branches, which 2020-12 allows.

## BASE02 capture (`npm run test:base02`)

`playwright.baseline.config.ts` starts `next start` on port 3200 (needs `npm run build` first) with the
review-mode test values of `playwright.config.ts` (placeholders only; public launch off), and runs
`screens.spec.ts`:

- full-page screenshots of the home page (which carries the journey, `#parcours`), the guide page (route key
  `resources`) and the contact path (route key `meeting`, `#contact` inquiry form), in `fr` and `en`, at 320, 390,
  768 and 1440 px, paths from `lib/routes.ts`;
- per capture: HTTP status, console errors, uncaught page errors, failed requests (page-cancelled prefetches are
  counted, not listed), 4xx/5xx subresources, horizontal overflow, images still incomplete after a bounded wait;
- a status/console smoke check of the other route keys at 320 and 1440, and the `/` entry and `/api/guide` status.

A capture fails only on a non-200 document, an uncaught page error, or a missing journey or contact section.
Console errors and overflow are recorded and compared, not asserted.

Captures use `reducedMotion: "reduce"` so reveals and the ride render as still panels: two captures of the same
build are pixel-identical. Motion states are therefore not captured here (the e2e suite covers them).

Environment: `BASE02_OUT` (output), `BASE02_APP_DIR` (serve another checkout that already has a build and
`node_modules`, for "before" captures with the same spec), `BASE02_PORT`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

Compare two captures:

```bash
node tests/baseline/compare-screens.mjs --before DIR_A --after DIR_B --diff DIR_DIFF [--threshold 0.1]
```

Per screenshot: byte identity, exact pixel mismatches, pixelmatch mismatches (threshold 0.1, anti-aliasing
detection on) and diff % over the union canvas. Status `identical` when sizes match and every pixel is equal;
`within_threshold` when pixelmatch finds 0 pixels but some pixels differ exactly (reported and counted
separately); `changed` otherwise. Records are compared field by field. Writes `DIR_DIFF/report.json` and a diff
PNG per changed shot. Exits 1 when anything changed or is missing, and when there is nothing to compare (no
screenshot on either side).

## Environment requirements

- Node 22 and npm 10 (as in verify.yml). `npm ci` warns that `agent-browser@0.38.1` wants Node 24; it installs.
- Browser: the lockfile's `@playwright/test` 1.63.0 expects Chromium revision 1243. Where it is not installed
  (and the Playwright CDN is unreachable), set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium. The
  runner records the substitute's version in every e2e/BASE02 note, for example "under substitute Chromium 141".
  Without a usable browser both browser steps are `blocked`.
- `protections_check` needs `GITHUB_REPOSITORY` and an authenticated `gh` CLI; without them it is `blocked`.
- `contracts_validate_py` needs Python 3.10+ with `jsonschema` (Draft 2020-12), and it reads
  `git show origin/main:lib/routes.ts`, `origin/codex/desktop-iphone-unified` and
  `origin/claude/bill-centered-homepage`. A shallow CI checkout without those refs makes it exit 2 (`blocked`).
- `build_graph_check` needs `python3` (standard library only).

## Files the suite dirties

`npm run build` rewrites `next-env.d.ts` (the `.next/dev/types` imports become `.next/types`). `results.json`
lists every tracked file the run changed under `dirtied_by_suite`. Build output (`.next/`), `test-results/`,
`playwright-report/` and `*.tsbuildinfo` are git-ignored.
