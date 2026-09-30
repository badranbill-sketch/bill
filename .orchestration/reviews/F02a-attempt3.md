# F02a review, attempt 3: A6 independent verifier (fresh context)

- Reviewer: A6 (independent verifier), attempt 3 of 3. This is technical verification only. It is not professional (G3) approval, and it is not signed for Bill or the firm.
- Date: 2026-09-30. Repo `/home/user/bill`, branch `claude/orchestration-foundation`, HEAD `cb3becf25ed042b977d4864ae71e74d13829320f`. The F02a files are uncommitted working-tree files.
- Scope:
  - (A) F02a: fixtures WM37–WM40, the appended `index.json`, `handoffs/F02a.json` (sha256 `d04c6944…`, regenerated for repair attempt 3) and `evidence/F02a/`.
  - (B) The A0 post-acceptance patch to `blockers.md`, checked against `reviews/F01-attempt2.md` P3-1…P3-5.
- Environment: local container, fixture evidence only. No browser, no network, no provider. Node v22.22.2, Python 3.11.15 with jsonschema 4.26.0 (existing scratchpad venv), GNU bc 1.07.1. No package was installed.
- Evidence: `.orchestration/evidence/F02a/a6-attempt3/` holds `run_all.sh`, my six scripts, `out/00…13`, `fault_results.json` and `MANIFEST.sha256`. Scratch work: `scratchpad/a6-f02a-3/`.

## Verdict: needs_changes. The fixtures are correct and pin both faults; the two A0-owned P2 items still reproduce

- **The fixtures are correct.** I wrote a new model from the contract text only. It reproduces all 40 WM fixtures as full §12 records, every clip case and every media case with exact equality.
- **Both required faults are pinned, and only the new fixtures catch them.**
  - Growing a today-dollar amount before its start by (1+q_j)^{s_j} fails WM37 only.
  - Resolving a joint source's ages against the partner fails WM38 only.
  - Each of these faulty runtimes passes all of WM01–WM36, the 24 possible truth-table rows and CS01–CS07.
- **F02a's own acceptance text in `tasks.json` is met:** both faults fail a fixture, the values are exact, mutation evidence exists and contract semantics are unchanged.
- **No contract text or schema changed.** `git diff --stat HEAD -- .orchestration/contracts` shows only `index.json` (+42/−0). Of the 407 tracked contract files, only `index.json` differs from its HEAD blob. The only untracked contract files are the four new fixtures.
- **The verdict stays needs_changes**, because two P2 items from attempts 1 and 2 reproduce unchanged:
  - P2-1: `contracts/validate.py` exits 1, and two of its four failures (CX-21, CX-29) come from the new fixtures.
  - P2-2: the handoff cannot validate against worker-handoff 1.0.
- **Both P2 items belong to A0, and no worker change is requested.** Nothing in `decisions.md`, `blockers.md`, `costs.json`, `tasks.json`, README, `validate.py`, `worker-handoff.schema.json` or `evidence/F02/` has changed since attempt 2 (`out/05`). The task packet allows the worker "only additive fixture files + index entries", so a fourth worker repair cannot close either item. The escalation made in attempt 2 (03 §A0, "Escalate after two repairs") still stands.
- **Part B passes.** The blockers.md patch addresses P3-1…P3-5. It asks for no secret, invents no price or cap and does not contradict D-073, D-064 or D-022. Three small A0 residuals remain at P3 (P3-3…P3-5).

## Artifacts reviewed (sha256, `out/13`)

| File | sha256 | Check |
|---|---|---|
| `fixtures/workshop/WM37-today-dollar-pre-start-factor.json` | `e2afa56e528fff82ed2cff6e5e01bad4916bb6d0a859de126c7a7941096ca876` | = handoff, = attempts 1 and 2 |
| `fixtures/workshop/WM38-joint-owner-participant-age.json` | `b27eaf5f6b9b40dae43763dc1ec5fe8f66c1ad312d493079fb26883fa5433f35` | = handoff, = attempts 1 and 2 |
| `fixtures/workshop/WM39-group-total-from-exact-values.json` | `fee6cc8372e2e571dabc32400fcf2dc11e50f64974aabab03bb035dd770bb9f5` | = handoff, = attempts 1 and 2 |
| `fixtures/workshop/WM40-today-dollar-display-from-exact-gap.json` | `9653eda5f2360416a428aa08a89aae63c3f4923fc2eba6f6bac0f966f7f50e95` | = handoff, = attempts 1 and 2 |
| `fixtures/workshop/index.json` | `ebb7cee73c786222fdadccec1eaa6ac215599badc4bbfdb67fa1af875ef4c380` | = handoff, = attempts 1 and 2 |
| `handoffs/F02a.json` | `d04c6944a8cf3db7735a43a923a26d0297f160b5d8e8d660b005e221c8aa6e00` | regenerated (attempt 2 reviewed `e6d9907b…`) |
| `blockers.md` (= HEAD blob) | `a163bc5bcf3b79306a53fa111fd6d8ca31eca0b6a467bacc0edb716a0bb3ee12` | unchanged since attempts 1 and 2 |
| pre-patch `scratchpad/blockers.f01-accepted.md` | `486adbde15cabbcef222fa2e186a98382608c69a044a429e20b56cacf500a303` | = the copies in `a6-attempt1/` and `a6-attempt3/` |

These contract files equal their HEAD blobs (`out/05`):
- `README.md` `e0aa064a…`, `validate.py` `143f118a…`, `worker-handoff.schema.json` `b9203fc8…`;
- `workshop-math.md` `583bd204…`, `workshop-inputs.md` `ba3da0b8…`, `workshop-clip-rules.md` `f6b78b9e…`;
- `workshop-inputs.schema.json` `20df5bc3…`, `clip-rules.json` `c8201bc1…`;
- WM01–WM36.

## Method (part A)

1. **Order of work.** I read, in this order:
   - `03_AGENT_PROMPTS.md` (the shared contract and the A6 role), D-072 and D-073;
   - `workshop-math.md`, `workshop-inputs.md`, `workshop-clip-rules.md` and the relevant schema parts;
   - the fixtures, `clip-rules.json`, `index.json` and the handoff.

   I did not open or import `compute_f02a_fixtures.py`, `mutation_check.py`, the lane's `workshop_reference.py`, `compute_fixtures.py`, or any earlier A6 model (`intmodel.py`, `decmodel.py`, `run_fixtures.mjs`).
2. **A new model, `pyearmodel.mjs`** (Node, BigInt). It uses a per-year common denominator, which differs from the builder's `fractions.Fraction` reference and from the earlier A6 models:
   - **Nominal amounts.** Every nominal amount of year t (D_t, P_j,t, G_t, S_t) is one BigInt numerator over the implicit denominator 10000^t. For example, a today-dollar source is `a_j·(10000+i)^{s_j}·(10000+q_j)^{t−s_j}`, and a start-year source is `a_j·(10000+q_j)^{t−s_j}·10000^{s_j}`. Sums and differences inside a year are plain integer additions.
   - **Rounding.** Half-even rounding is an integer `divmod` on N / 10000^t.
   - **Today-dollar values.** They are N / (10000+i)^t.
   - **C_R.** It is summed over the single common denominator 10000^{t_R+H−1}·(10000+r)^H and then reduced by gcd.
   - **Exact strings.** They come from a gcd reduction and a check that the denominator has only the factors 2 and 5.
   - **Scope.** The model implements the whole §12 record: window, rows, the three-state `pays_j(t)`, every reason code, groups, completeness, the T\* scan, flags, savings summary, the capital-illustration reference, predicates and precedence. It also implements XF-04 to XF-06 and the §7 media render states.
   - **Self-check.** The model asserts in every row that "computed" (the four §5 conditions, coded literally) equals "carries no reason code". The assertion never fired.
3. **Faulty runtimes.** Each is a switch in the same model; the empty switch set is the contract reading.
   - The two required faults: `today_dollars_uses_q` (b_j = a_j(1+q_j)^{s_j}) and `joint_uses_partner` (A_o = partner's age for `joint`).
   - Variants and controls:
     - joint against the partner for the start only or the end only;
     - joint against min(A, A′) or max(A, A′);
     - new in this attempt: `joint_needs_partner_age`, which resolves joint against A but treats it as unresolvable when the partner's age is unknown or absent;
     - a today-dollar amount treated as nominal, or indexed at i after its start;
     - the P3-1 rounding readings, gap from rounded rows, and half-up rounding.
4. **A third path, `hand_bc.sh`.** It recomputes the WM37–WM40 closed forms in GNU bc at scale 80, with a half-even function written in bc. No code is shared with the JS model.
5. **Non-vacuity, `perturb.mjs`.** Seven perturbations are applied to each new fixture's expected record: ±1 cent in the gap, the today-dollar gap, the net group and a source row, one digit of `exact.gap`, an extra flag, and `window.last_t`. The comparison must see each one.
6. **Repository checks.** `schema_check.py` validates all inputs and the handoff. I ran `contracts/validate.py` three ways: on the live tree, with `--contracts-dir` pointing at a `git archive HEAD` copy (the baseline), and with `--handoff`. I also ran the lane `evidence/F02/math/validate.py` with `PYTHONDONTWRITEBYTECODE=1`. It wrote nothing: `__pycache__` timestamps are unchanged and git status is clean.

## What passes (with evidence)

1. **The contract reading reproduces everything** (`out/01`, CONTRACT READING: ALL PASS). The comparison is exact, key-order-insensitive deep equality with no tolerance. It covers:
   - all 40 WM fixtures, WM01–WM40, as full §12 records;
   - the 24 possible truth-table rows (predicates, selected clip, reason, state and flags; predicates are compared as well, so wrong F values in rows 6 and 8 would be caught);
   - CS01–CS07 and MS01–MS06;
   - the 8 impossible rows, which are exactly C ∧ F, have `input: null` and select W10 by precedence.

   All 71 inputs are valid under jsonschema 2020-12 (`out/04`) and my own XF-04 to XF-06 checker (`out/01`). The 40 WM entries in `index.json` agree with their files (file, title, covers) and with my computed clip and state.
2. **The faulty runtimes** (`out/01`, `fault_results.json`):

   | Fault | Caught by (all cases) | WM01–WM36 + clip cases only |
   |---|---|---|
   | **(1) `today_dollars_uses_q`**: pre-start growth by (1+q_j)^{s_j} | **WM37** | MISSED |
   | **(2) `joint_uses_partner`**: joint ages resolved against the partner | **WM38** | MISSED |
   | joint start only / joint end only against the partner | WM38 / WM38 | MISSED |
   | joint against min(A, A′) | WM38 | MISSED |
   | joint against max(A, A′) | **NONE** | MISSED (P3-1) |
   | joint unresolvable when partner age unknown (`joint_needs_partner_age`) | **NONE** | MISSED (P3-1) |
   | `group_from_rounded_rows` | WM37, WM39 | MISSED |
   | `deflate_rounded_gap` | WM40 | MISSED |
   | today dollars indexed at i after the start | WM37 | MISSED |
   | today dollars treated as nominal | WM04, WM37 | WM04 |
   | controls: gap from rounded rows / half-up | WM17, WM39 / WM04, WM17, WM39 | WM17 / WM04, WM17 |

   Every claim in the WM37–WM40 `purpose` texts about which reading fails is confirmed.
3. **What the two faults do in cents** (`out/01`, `out/03`):
   - **WM37**, a runtime that grows by q_j before the start. The first difference is `/years/0/exact/gap`: 3,588,419.969475097369428 against 2,995,899.88763830938048. The gap is overstated by 592,520, 593,190, 499,354, 497,202 and 494,971 cents at t = 10–14.
   - **WM38**, a runtime that uses the partner's age:
     - the joint start moves from s = 5 to s = 10, and the joint end from e = 4 to e = 9;
     - the gap is 4,200,000 in every year, against the contract's 4,200,000 (t = 2, 3), 4,800,000 (t = 4) and 3,600,000 (t = 5–7);
     - the faulty reading also raises `horizon_shorter_than_timeline`.
4. **bc hand checks agree with every value checked** (`out/03`):
   - WM37: D, P1, P2, P3, the net group, G, today-dollar G and the exact G strings for t = 10–14;
   - WM38: the gaps and `partner_age` for t = 2–7;
   - WM39: t = 1 rows 1,010,050.50 → 1,010,050 each, group 2,020,101 against a sum of rows of 2,020,100, G 1,009,899;
   - WM40: at t = 2 the exact deflation is 1,029,264.5104… → 1,029,265, and deflating the rounded gap gives 1,029,264.4810… → 1,029,264.

   All 28 perturbations were detected (`out/02`).
5. **The new fixtures follow the existing rules** (`out/04`, `out/05`):
   - They have the same top-level and `expected` key sets and the same tolerance string as WM01–WM36.
   - They use the same serialization (indent 1, trailing newline) and the `WMnn-` file-name prefix.
   - The `index.json` diff removes 0 lines, and the 4 new entries follow the CLIP entry.
6. **Handoff integrity** (`out/04`, `out/08`, `out/10`):
   - 35/35 artifact sha256 values match.
   - All 7 changed paths and all 20 test evidence paths exist, and `base_commit` equals HEAD.
   - All 20 declared exit codes match the `[exit N]` or `exit_code=` markers in their logs.
   - The recorded `after-hashes.log` still verifies: 48/48 OK.
   - As submitted, the handoff has exactly one schema error, the `task_id` pattern. With `task_id` replaced in memory, it has 0.
   - The assumptions and `blocked_checks` describe the repository accurately:
     - `validate.py` gives 353 pass and 4 fail (CX-18, CX-21, CX-29, S9);
     - the lane gate gives 116 pass and 1 fail;
     - no file outside F02a's paths changed (`out/05`: `evidence/F02/`, `decisions.md`, `blockers.md`, `costs.json` and `tasks.json` equal HEAD).
   - The handoff claims no external action and no metered cost, and it lists the G3 re-approval of the new hashes as a human approval.
7. **The lane validator recomputes WM37–WM40 correctly.** Its only failure is `compute_fixtures.py --check`, which reports 4 unexpected files and a differing `index.json` (`out/09`; P2-1).

## Findings

### F02A-A6R3-P2-1: the additive-fixture round is still not closed, so `contracts/validate.py` exits 1 (carried from attempt 1 F02A-A6-P2-1 and attempt 2 F02A-A6R2-P2-1; owner: A0 / F02 integrator, with the math lane)

- **Reproduce:** `python .orchestration/contracts/validate.py` exits 1, with 353 pass and 4 fail (`out/06`).
- **Baseline:** the same run with `--contracts-dir` pointing at a `git archive HEAD` copy of `contracts/` gives 351 pass and 2 fail, CX-18 and S9 (`out/07`). **So the new fixtures introduce CX-21 and CX-29:**
  - **CX-21:** "workshop-math.md fixture count vs 40". `workshop-math.md` §10 still says "36 math fixtures (WM01–WM36)". Its fixture table and negative-control list omit WM37–WM40, and README row 14 names WM01–WM36.
  - **CX-29:** `evidence/F02/math/validation.log` records the pre-F02a `index.json` hash and no WM37–WM40 hash. Line 3 of `workshop-math.md` says any approval must name the fixture hashes "as printed in" that log, so G3 has no canonical hash list for the bundle as it now stands.
- **The lane gate is also red.** `evidence/F02/math/validate.py` exits 1, because `compute_fixtures.py --check` reports the four new files as unexpected and `index.json` as differing (`out/09`).
- **The new negative controls exist only in F02a's evidence.** The four faults are not in the lane `FAULTS` hooks or the `validate.py` negative controls. `index.json`'s `generator` field names only `compute_fixtures.py`, which cannot produce WM37–WM40.
- **Expected:**
  - README §3 rule 6: an added fixture "must pass `validate.py`".
  - Row 14: "the integrator then updates this row and CX-21 in the same round".
  - Row 16: every consuming task, W00 and C02 included, "runs `validate.py` before its handoff".
- **Actual:** the suite is red, and W00 and C02 (both depend on F02a per D-072) would inherit two failures they do not own.
- **Fix direction (A0; no fixture byte changes):**
  1. Fold `compute_f02a_fixtures.py` into `compute_fixtures.py`, keeping the 4 index entries after CLIP, and check that WM37–WM40 and `index.json` regenerate byte for byte.
  2. Add `today_dollars_uses_q`, `joint_uses_partner`, `group_from_rounded_rows` and `deflate_rounded_gap` to the lane `FAULTS` and fault matrix, with required catchers WM37, WM38, WM37/WM39 and WM40.
  3. Make the editorial update to `workshop-math.md` §10 and README row 14.
  4. Regenerate `validation.log` last.
  5. Rerun `validate.py`.

  The §10 edit changes that file's hash, so under rule 6 (third bullet) it needs its own `validate.py` run and an A6 look.

### F02A-A6R3-P2-2: `handoffs/F02a.json` still cannot validate against worker-handoff 1.0 (carried from attempt 1 F02A-A6-P2-2 and attempt 2 F02A-A6R2-P2-2; owner: A0)

- **Reproduce:** `python .orchestration/contracts/validate.py --handoff .orchestration/handoffs/F02a.json` exits 1 (`out/08`). The message is `schema pattern@/task_id: 'F02a' does not match '^(?:F0[0-3]|…)$'`.
- **Root cause:** README §3 rule 4 and WH-ID-1 say "Splitting a task needs a minor version", but D-072 creates the split task F02a and keeps "contract version stays 1.0". CX-18 already fails on HEAD's contracts (`out/07`), because `tasks.json` lists F02a.
- **Expected:** a submitted handoff validates, so that A0 can record acceptance (README row 12).
- **Actual:** the handoff is otherwise complete: 35/35 hashes, 0 other schema errors, and paths and exit codes verified (`out/04`). It fails only on an ID that A0's own decision created, and the worker cannot change that ID without misstating the task.
- **Fix direction (A0):** do one of the following, after which CX-18 and S9 should pass:
  - publish worker-handoff 1.1 with an ID rule that admits split IDs, and update CX-18;
  - or record a `decisions.md` entry on how split-task handoffs are validated under 1.0, and track it as a KNOWN item in `validate.py`.

### F02A-A6R3-P3-1: the joint-age pin is one-sided (carried, extended; owner: math lane, optional)

- In WM38 the partner (55) is younger than the participant (60), and the partner's age is known. Two faulty readings therefore pass all 40 WM fixtures and all 31 clip cases with an input (`out/01`):
  - `joint_uses_older`: joint resolved against max(A, A′). This one was already reported.
  - `joint_needs_partner_age`: joint resolved against A, but treated as unresolvable when the partner's age is unknown or `household` is absent. This one is new in this attempt. No fixture has a joint age bound in a household without a known partner age.
- The builder discloses the first in the handoff assumptions.
- **Fix direction:** if A0 wants "joint = participant" pinned in both directions, add a joint age bound with an older partner, and one with the partner's age unknown.

### F02A-A6R3-P3-2: a WM37 `independent_checks` line reads as the whole gap effect (carried; owner: math lane, optional)

- "(growth at q before the start: 2,400,000; gap overstated by 525,587 cents a year)" is src-1's contribution only.
- The whole fault overstates the gap by 592,520, 593,190, 499,354, 497,202 and 494,971 cents for t = 10–14 (`out/03`).
- Change it only if WM37 is regenerated anyway, because any byte change re-hashes the fixture.

### F02A-A6R3-P3-3: D-070 still omits the three new secret rows (carried; owner: A0)

- The D-070 row in `decisions.md` still lists six items. It names neither the backup write credential, nor the backup encryption key, nor the media-master credential (`out/12`: "D-070 mentions 'backup' credential/key: False").
- The blockers.md note says its rows are "proposed in D-070", and the HB-07 PROPOSAL reads "The D-070 destinations as written". HB-07's question does cite "(Secrets table, D-070)", but a reply of "Proposal OK" could still be read as confirming a list without the three rows.
- **Fix direction:** add the three rows to D-070, or have the HB-07 proposal cite the Secrets table.

### F02A-A6R3-P3-4: costs.json still points to HB-02 for the VPS price (carried; owner: A0)

- `costs.json` `vps_increment.note` still reads "The current VPS price, its plan … are unknown (HB-02)". HB-08(b) now asks this; HB-02 does not.
- None of the 11 `existing_cost_unknown` items cites HB-08.
- HB-08's "Provide" line routes answers only to D-064 and `authorized_caps` (`out/12`).
- **Fix direction:** point the notes to HB-08(b), and add the costs items to HB-08's "Provide" line.

### F02A-A6R3-P3-5: the blockers.md and decisions.md headers still say "submitted, not accepted" (carried; owner: A0)

- Line 3 of both files reads "Status: **submitted, not accepted**".
- `tasks.json` records F01 as `accepted`, and blockers.md line 6 is labelled an "A0 post-acceptance patch" (`out/12`).
- **Fix direction:** state acceptance at `cb3becf` in both headers.

## Part B: the blockers.md patch against the F01 attempt-2 P3 items

`diff -u` of the pre-patch copy against the current file shows 10 added and 5 removed lines (`out/11`, `out/12`). The 29 HB IDs are unchanged, and the file is byte-identical to the HEAD blob.

| Item | Change | Assessment |
|---|---|---|
| P3-1 backup and media secrets | Three rows added to "Outside the 06 map": the backup write credential (a VPS job-only secret file, plus a copy in HB-07); the backup encryption key (HB-07 plus one offline owner copy, "never on the backup destination or inside a backup set"); the media-master upload credential (HB-07) | Addressed in blockers.md. The key is not held only on the VPS, which was the review's concern. D-070 was not updated (P3-3) |
| P3-2 AI cover, likeness and signature | HB-22 asks who made the review book's cover and its "AI-assisted editorial artwork" and on what terms, whether Bill consents to an AI-drawn likeness, and whether the signature is his | Addressed |
| P3-3 existing subscription prices | HB-08(b) asks the plan, amount, currency and renewal date for the VPS, domain/registrar, mailbox, Calendly, Google, GitHub, and Resend/Upstash; "Don't know" is fine | Addressed (the review's first option). The stale costs.json pointer is P3-4 |
| P3-4 HB-08 contradiction | The caps stay 0. If HB-14 shows the account cannot host Meet, the director returns with one Workspace line item (tier, seats, "the price shown at Bill's own checkout") for an explicit yes/no. "Nothing is bought under a 0 cap" | Addressed: "Proposal OK" now has one outcome |
| P3-5 gate mapping | The G2 "not askable yet" cell lists the per-action test scopes (allowlisted test sends, live-calendar test bookings, Stripe test payments, N10 delivery), requested when P05/L01 fix the actions. The G5 row adds HB-20 | Addressed. HB-title-versus-row mismatches: before `['HB-20->G5']`, after `[]` (`out/12`) |

Checks on the patch as a whole (`out/12`):
- **No secret is requested.**
  - 0 added lines ask for a secret value.
  - The new rows name locations only.
  - The "Secrets: never in chat" heading remains.
  - HB-07 still says "reply with the tool's name and the person's name only, never a secret".
- **No invented price or cap.**
  - The only amount in the added or removed lines is the pre-existing D-066 "CAD 20/day × 14 days" proposal, carried over unchanged.
  - The Workspace price is left to Bill's own checkout, which matches D-064 ("regional checkout is the price source of truth").
  - `costs.json` `authorized_caps` is 0/0/0.
- **No contradiction with decisions.md.**
  - HB-03 now keeps "presentation/ … on its own branch, outside the baseline, pending HB-12", and "ignore-list union" no longer appears anywhere in the file. This matches D-073 ("presentation … stay preserved, unmerged, on their own branches").
  - HB-12 still proposes excluding presentation/ from the production build.
  - HB-08 matches D-064 (caps 0 until G2) and D-022 (Workspace is only a candidate; verify entitlement before any purchase).
  - The only mismatch is the D-070 omission (P3-3), which is an incomplete cross-reference, not a conflicting rule.

## Status of earlier findings

| Earlier finding | Status now | Evidence |
|---|---|---|
| F02-MATH3-P2-1 (the pre-start factor is unpinned) | **Fixed by WM37**, which is the only catcher | `out/01` |
| F02-MATH3-P2-2 (the joint rule is unpinned) | **Fixed by WM38.** The partner fault and its start-only, end-only and younger variants are caught only by WM38. The older-age and partner-unknown variants remain (P3-1) | `out/01` |
| F02-MATH3-P3-1 (two display-rounding faults) | **Fixed by WM39/WM37 and WM40** | `out/01` |
| F02-MATH3-P3-2 and P3-3 | Open, outside D-072's scope (disclosed in the handoff) | — |
| F02A-A6R2-P2-1 (`validate.py` red) | **Still reproduces.** No A0 action since attempt 2 → R3-P2-1 | `out/06`, `out/07`, `out/09` |
| F02A-A6R2-P2-2 (handoff ID) | **Still reproduces.** No A0 action → R3-P2-2 | `out/04`, `out/08` |
| F02A-A6R2-P3-1 … P3-5 | All still reproduce (no file changed) → R3-P3-1 … P3-5; P3-1 gains the partner-unknown variant | `out/01`, `out/03`, `out/12` |

## Observations (not findings)

- **Backup encryption key (P04).** The new row keeps the key in HB-07 plus an offline owner copy. A nightly job with a symmetric key would need the key on the VPS at run time, which the row neither lists nor forbids. P04 should either use asymmetric encryption, with only a public key on the VPS, or name that runtime location.
- **G3.** The calculation bundle's hashes changed (WM37–WM40 and `index.json`). Any G3 or HB-26 approval must name them once P2-1 has put them into `validation.log`.
- **Self-referencing logs.** `final-contracts-validate.log`, `handoff-check.log` and `handoff-validate.log` postdate the handoff, so they are cited as evidence but cannot be hashed in it. They exist and their exit markers match.
- **`assumptions_echo` strings.** The strings `year_index` and `rounding` are fixed text that appears only in the fixtures, not in `workshop-math.md` §12. My model copies them verbatim. This predates F02a.

## Reproduction

```
cd .orchestration/evidence/F02a/a6-attempt3
PY=/path/to/python-with-jsonschema-4.26 ./run_all.sh     # optional PRE=/path/to/blockers.f01-accepted.md, TMPDIR=...
```

- The script writes only `out/`, `fault_results.json` and a scratch `git archive` copy under `$TMPDIR`. It never commits and uses no network.
- Expected markers:
  - 01, 02, 03, 04, 05, 10, 12 and 13: exit 0.
  - 06, 07, 08 and 09: exit 1 (P2-1 and P2-2).
  - 11: exit 1 (`diff` found differences).
- `MANIFEST.sha256` lists every script and output.

Not run: browser, network capture, rendered UI and media playback. WK04 to WK07 are downstream checks. No live provider was used. The builder's `mutation_check.py`, `compute_f02a_fixtures.py` and the copied attempt-3 A6 harness were not run, because my own model and bc path replace them.
