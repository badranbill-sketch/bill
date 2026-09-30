# F02a review, attempt 2: A6 independent verifier (fresh context)

- Reviewer: A6 (independent verifier), attempt 2 of 3. This is technical verification only. It is not professional (G3) approval, and it is not signed for Bill or the firm.
- Date: 2026-09-30. Repo `/home/user/bill`, branch `claude/orchestration-foundation`, HEAD `cb3becf25ed042b977d4864ae71e74d13829320f`. The F02a files are uncommitted working-tree files.
- Scope:
  - (A) F02a: fixtures WM37–WM40, the appended `index.json`, `handoffs/F02a.json` (now sha256 `e6d9907b…`, regenerated for repair attempt 2) and `evidence/F02a/`.
  - (B) The A0 post-acceptance patch to `blockers.md`, checked against `reviews/F01-attempt2.md` P3-1…P3-5.
- Environment: local container, fixture evidence only. No browser, no network and no provider. Python 3.11.15 with jsonschema 4.26.0 (the existing scratchpad venv); no package was installed.
- Evidence: `.orchestration/evidence/F02a/a6-attempt2/` holds `run_all.sh`, my five scripts, `out/00…13` and `MANIFEST.sha256`.

## Verdict: needs_changes. The two P2 items from attempt 1 still reproduce, and both are A0's to fix

- **The fixtures are correct.** I wrote a new model from the contract text using a method none of the earlier models used. It reproduces WM37–WM40, and every other case, exactly.
- **Both target faults are pinned, and only by the new fixtures.**
  - Growing a today-dollar amount before its start by (1+q_j)^{s_j} fails WM37 only.
  - Resolving a joint source's ages against the partner fails WM38 only.
  - Each of these faulty runtimes passes all of WM01–WM36, the 24 truth-table rows and the 7 supplementary cases.
- **F02a changed no contract text or schema.** `git diff --stat HEAD -- .orchestration/contracts` shows only `index.json`, with 42 lines added and 0 removed. The only untracked contract files are the four new fixtures.
- **What went back to the worker, and what changed.**
  - Nothing in WM37–WM40, `index.json`, `blockers.md`, `decisions.md`, `costs.json`, README or `validate.py` changed since attempt 1.
  - The builder regenerated only the handoff. It now records both P2 items as `blocked_checks` owned by A0, and I checked that it describes them accurately.
- **The verdict stays needs_changes, because the two A0-owned P2 items reproduce unchanged:**
  - `contracts/validate.py` exits 1, and two of its four failures (CX-21, CX-29) come from the new fixtures (P2-1);
  - the handoff cannot validate against worker-handoff 1.0 (P2-2).
- **Another worker repair cannot close them.** Both need edits outside F02a's write scope, which the task packet forbids ("only additive fixture files + index entries"). Under 03 §A0 ("Escalate after two repairs"), **A0 has to act**: apply the integration round, or record a decision. **No change to WM37–WM40, `index.json` or the F02a evidence is requested.**
- **The blockers.md patch addresses P3-1…P3-5 without asking for a secret, inventing a price or cap, or contradicting decisions.md.** Three small A0 residuals from attempt 1 are still open (P3-3…P3-5), because none of those files changed.

## Artifacts reviewed (sha256)

| File | sha256 | Check |
|---|---|---|
| `fixtures/workshop/WM37-today-dollar-pre-start-factor.json` | `e2afa56e528fff82ed2cff6e5e01bad4916bb6d0a859de126c7a7941096ca876` | = handoff, = attempt 1 |
| `fixtures/workshop/WM38-joint-owner-participant-age.json` | `b27eaf5f6b9b40dae43763dc1ec5fe8f66c1ad312d493079fb26883fa5433f35` | = handoff, = attempt 1 |
| `fixtures/workshop/WM39-group-total-from-exact-values.json` | `fee6cc8372e2e571dabc32400fcf2dc11e50f64974aabab03bb035dd770bb9f5` | = handoff, = attempt 1 |
| `fixtures/workshop/WM40-today-dollar-display-from-exact-gap.json` | `9653eda5f2360416a428aa08a89aae63c3f4923fc2eba6f6bac0f966f7f50e95` | = handoff, = attempt 1 |
| `fixtures/workshop/index.json` | `ebb7cee73c786222fdadccec1eaa6ac215599badc4bbfdb67fa1af875ef4c380` | = handoff, = attempt 1 |
| `handoffs/F02a.json` | `e6d9907bdafc439d0f647771f98f5fd05293f00133f0341e76d73dd7bd6b2a86` | regenerated (attempt 1 reviewed `45572f0c…`) |
| `blockers.md` (= HEAD blob) | `a163bc5bcf3b79306a53fa111fd6d8ca31eca0b6a467bacc0edb716a0bb3ee12` | unchanged since attempt 1 |
| pre-patch `blockers.f01-accepted.md` (scratchpad) | `486adbde15cabbcef222fa2e186a98382608c69a044a429e20b56cacf500a303` | = the copy in `a6-attempt1/` |

Every one of these contract files equals its HEAD blob (`out/05`):
- `README.md` `e0aa064a…`
- `validate.py` `143f118a…`
- `workshop-math.md` `583bd204…`
- `workshop-inputs.md` `ba3da0b8…`
- `workshop-clip-rules.md` `f6b78b9e…`
- `workshop-inputs.schema.json` `20df5bc3…`
- `worker-handoff.schema.json` `b9203fc8…`
- `clip-rules.json` `c8201bc1…`
- WM01–WM36

## Method (part A)

1. **Order of work.** I read `03_AGENT_PROMPTS.md` (the shared contract and the A6 role), D-072, D-073, `workshop-math.md`, `workshop-inputs.md`, `workshop-clip-rules.md`, the schema definitions, the fixtures and `clip-rules.json`. I did not open or import `compute_f02a_fixtures.py`, `mutation_check.py`, the lane's `workshop_reference.py` or the attempt-1 A6 `intmodel.py`.
2. **A new model, `decmodel.py`.** Its method differs from the builder's `fractions.Fraction` reference, from the attempt-3 A6 BigInt JavaScript model and from the attempt-1 A6 scaled-integer model:
   - **Exact decimals.** Every product and sum is a `decimal.Decimal` at precision 4000, in a context where the `Inexact` and `Rounded` signals raise an error.
     - Growth factors (1 + bp/10000)^n are finite decimals, so D_t, P_j,t, G_t and S_t are either exact or the run aborts.
   - **Division.** Deflation and C_R use a second context. An inexact quotient cannot be a half-cent tie, because a tie is a short finite decimal and would divide exactly.
     - The approximation error, 10^−3983 in the worst case, is far below the smallest possible distance to a tie, 1/(2·denominator). The code asserts at runtime that the denominator stays under 10^1700.
   - **Rounding and strings.** Rounding uses `quantize(ROUND_HALF_EVEN)`. C_R's `p/q` form comes from a `math.gcd` reduction of the Decimal numerator and denominator.
   - **Scope.** The model implements the whole §12 record (window, rows, groups, codes, completeness, flags, savings summary, capital-illustration reference, clip predicates and precedence), XF-04 to XF-06, and the §7 media render states.
3. **Faulty runtimes.** Each is a switch inside the same model; the empty switch set is the contract reading.
   - The two required faults: `today_dollars_uses_q` (b_j = a_j(1+q_j)^{s_j}) and `joint_uses_partner` (A_o = the partner's age for `joint`).
   - Variants and controls: `joint_uses_partner` limited to the start or the end, `joint_uses_older`, `joint_uses_younger`, and a today-dollar amount carried to t_R, carried one year short, treated as nominal, or indexed at i after its start.
   - The P3-1 rounding readings, gap-from-rounded-rows, half-up rounding, and the two C_R controls.
4. **A third path.** `hand_and_selftest.py` recomputes the WM37–WM40 closed forms with plain Python integers, dividing by 100^t, 1000^t or 102^t and rounding with `divmod` half-even.
   - It also perturbs each new fixture's expected record by one cent, or adds a flag, and confirms that the comparison sees the change. This shows the comparison is not vacuous.

## What passes (with evidence)

1. **The contract reading reproduces everything** (`out/01`). The comparison is exact deep equality with no tolerance.
   - All 40 WM fixtures, WM01–WM40, as full §12 records.
   - The 24 possible truth-table rows (predicates, clip, reason, state and flags).
   - CS01–CS07.
   - MS01–MS06, through my own render-state function.
   - The 8 impossible rows are exactly C ∧ F, have `input: null` and select W10.
   - All 71 inputs are valid under jsonschema 2020-12 and my own XF-04 to XF-06 checker.
   - The 40 WM entries in `index.json` agree with their files (file, title, covers) and with my computed clip and state.
2. **The faulty runtimes** (`out/01`):

   | Fault | Caught by (all cases) | Caught by WM01–WM36 + clip cases only |
   |---|---|---|
   | **(1) `today_dollars_uses_q`**, pre-start growth by (1+q_j)^{s_j} | **WM37** | MISSED |
   | **(2) `joint_uses_partner`**, joint ages resolved against the partner | **WM38** | MISSED |
   | joint start only, or joint end only, against the partner | WM38 | MISSED |
   | joint against the younger age, min(A, A′) | WM38 | MISSED |
   | joint against the older age, max(A, A′) | MISSED | MISSED (P3-1) |
   | `group_from_rounded_rows` | WM37, WM39 | MISSED |
   | `deflate_rounded_gap` | WM40 | MISSED |
   | today dollars indexed at i after the start | WM37 | MISSED |
   | today dollars carried to t_R, carried one year short, or treated as nominal | WM04, WM37 | WM04 |
   | controls: gap from rounded rows / half-up / C_R to t = 0 / C_R = 0 eligible | WM02…WM40 / WM04 / WM35 / WM36 | same, without the new fixtures |

   Every claim in the WM37, WM38, WM39 and WM40 `purpose` texts about which reading fails is confirmed by this table.
3. **What the two faults do in cents** (`out/01`, `out/02`):

   **WM37**, a runtime that grows by q_j before the start. The src-1 row shows 2,400,000 instead of 2,925,587.

   | t | Gap, contract (cents) | Gap, faulty runtime (cents) | Overstated by |
   |---|---|---|---|
   | 10 | 2,995,900 | 3,588,420 | 592,520 |
   | 11 | 3,128,254 | 3,721,444 | 593,190 |
   | 12 | 2,502,450 | 3,001,804 | 499,354 |
   | 13 | 2,617,606 | 3,114,808 | 497,202 |
   | 14 | 2,734,979 | 3,229,950 | 494,971 |

   **WM38**, a runtime that uses the partner's age:
   - The joint start moves from s = 5 to s = 10, and the joint end from e = 4 to e = 9.
   - The gap is 4,200,000 in every year, against the contract's 4,800,000 at t = 4 and 3,600,000 at t = 5–7.
   - It raises `horizon_shorter_than_timeline`, which the contract reading does not.
4. **The integer hand checks agree with every value checked** (`out/02`, HAND/SELFTEST: PASS). They cover:
   - WM37: P1, P2 and P3 for every window year, and the gap, today-dollar gap and net group for t = 10–14;
   - WM38: the gaps and `partner_age` for t = 2–7;
   - WM39: the rows 1,010,050, the group rounded once to 2,020,101, the gap 1,009,899, and the t = 2 values;
   - WM40: the gaps and today-dollar gaps for t = 0–2. At t = 2 the gap deflated exactly gives 1,029,265; deflating the rounded gap would give 1,029,264.

   All 16 perturbations were detected.
5. **The contract text is unchanged** (`out/03`–`05`).
   - The `index.json` diff is append-only: 0 removed lines, and the 4 new entries follow the CLIP entry.
   - WM37–WM40 have the same top-level and `expected` key sets, the same serialization (indent 1, trailing newline) and the same tolerance string as WM01–WM36.
6. **Handoff integrity** (`out/09`):
   - 28/28 artifact sha256 values match.
   - All 7 changed paths and all 14 evidence paths exist.
   - `base_commit` equals HEAD.
   - All 14 declared exit codes match the `[exit N]` or `exit_code=` markers in their logs.
   - As submitted, the handoff has exactly one schema error, the `task_id` pattern. With `task_id` replaced in memory, it has 0.
   - Three cited logs postdate the handoff and cannot be hashed in it (a self-reference): `final-contracts-validate.log` `74a9a296…`, `handoff-check.log` `8c6e73e8…` and `handoff-validate.log` `5b712c61…`.
   - The assumptions and `blocked_checks` describe the repository accurately. The handoff claims no external action and no metered cost, and correctly lists the G3 re-approval of the new hashes as a human approval.
7. **The lane validator recomputes WM37–WM40 correctly** (`out/10`): 116 pass and 1 fail. The failure is P2-1.

## Findings

### F02A-A6R2-P2-1: the additive-fixture round is still not closed, so `contracts/validate.py` exits 1 (carried from attempt 1 F02A-A6-P2-1; owner: A0 / F02 integrator, with the math lane)

- **Reproduce:** from the repo root, run `python .orchestration/contracts/validate.py`. The result is exit 1, with 353 pass and 4 fail (`out/06`).
  - Attempt 1 and the builder's attempt-2 log had 352 pass. The extra pass is a concurrent `handoffs/F03.json` that appeared during this review; it has nothing to do with F02a.
- **Baseline:** the same run with `--contracts-dir` pointing at a `git archive HEAD` copy of `contracts/` gives 351 pass and 2 fail, CX-18 and S9 (`out/07`). **So the new fixtures introduce CX-21 and CX-29:**
  - **CX-21:** `workshop-math.md` §10 still says "36 math fixtures (WM01–WM36)". Its fixture table and its negative-control list do not mention WM37–WM40, and README row 14 names WM01–WM36.
  - **CX-29:** `evidence/F02/math/validation.log` records the pre-F02a `index.json` hash and no WM37–WM40 hash. Yet line 3 of `workshop-math.md` says any approval must name the fixture hashes "as printed in" that log, so G3 has no canonical hash list for the bundle as it now stands.
- **The lane gate also fails.** `evidence/F02/math/validate.py` exits 1, because `compute_fixtures.py --check` reports four unexpected files and a differing `index.json` (`out/10`).
- **The new negative controls live only in F02a's evidence.** They are not in the lane's `FAULTS` hooks or the `validate.py` negative controls, which the attempt-3 math review's fix direction asked for.
- **Provenance.** `index.json`'s `generator` field still names only `compute_fixtures.py`, which cannot produce WM37–WM40.
- **Expected:**
  - README §3 rule 6: an added fixture "must pass `validate.py`".
  - Row 14: "the integrator then updates this row and CX-21 in the same round".
  - Row 16: every consuming task, W00 and C02 included, "runs `validate.py` before its handoff".
- **Actual:** the suite is red, and W00 and C02 (both depending on F02a) would inherit the failure.
- **Fix direction (A0, outside F02a's paths; no fixture content changes):**
  1. Fold `compute_f02a_fixtures.py` into `compute_fixtures.py`, and check that WM37–WM40 and `index.json` regenerate byte for byte.
  2. Add the four faults to the lane `FAULTS` and to the lane fault matrix.
  3. Make the editorial update to `workshop-math.md` §10 and README row 14.
  4. Regenerate `validation.log` last.
  5. Rerun `validate.py`.
  - The §10 edit changes that file's hash, so under rule 6 (third bullet) it needs its own `validate.py` run and an A6 look.

### F02A-A6R2-P2-2: `handoffs/F02a.json` still cannot validate against worker-handoff 1.0 (carried from attempt 1 F02A-A6-P2-2; owner: A0)

- **Reproduce:** `python .orchestration/contracts/validate.py --handoff .orchestration/handoffs/F02a.json` exits 1 (`out/08`). The message is `schema pattern@/task_id: 'F02a' does not match '^(?:F0[0-3]|…)$'`.
- **Root cause:** README §3 rule 4 and the schema's WH-ID-1 say "Splitting a task needs a minor version", but D-072 creates the split task F02a and keeps "contract version 1.0". CX-18 already fails on HEAD's contracts (`out/07`), because `tasks.json` lists F02a.
- **Expected:** a submitted handoff validates, so that A0 can record acceptance (README row 12).
- **Actual:** the handoff is otherwise complete: 28/28 hashes, 0 other schema errors, and paths and exit codes verified. It fails only on an ID that A0's own decision created, and the worker cannot change that ID without misstating the task.
- **Fix direction:** either publish worker-handoff 1.1 with an ID rule that admits split IDs (and update CX-18), or record an explicit `decisions.md` entry on how split-task handoffs are validated under 1.0, and track it as a KNOWN item. Afterwards, CX-18 and S9 should pass.

### F02A-A6R2-P3-1: the joint-age pin is one-sided (carried from attempt 1; owner: math lane, optional)

- In WM38 the partner (55) is younger than the participant (60).
- A runtime that resolves joint ages against the older of the two, max(A, A′), therefore passes all 40 WM fixtures and all 31 clip cases with an input (`out/01`: MISSED).
- The builder discloses this in the handoff assumptions.
- **Fix direction:** add a joint age bound in a household with an older partner, if A0 wants "joint = participant" pinned in both directions.

### F02A-A6R2-P3-2: a WM37 `independent_checks` line reads as the whole gap effect (carried from attempt 1; owner: math lane, optional)

- "gap overstated by 525,587 cents a year" is src-1's contribution only. The whole fault overstates the gap by 592,520, 593,190, 499,354, 497,202 and 494,971 cents for t = 10–14.
- Change it only if WM37 is regenerated anyway, because any byte change re-hashes the fixture.

### F02A-A6R2-P3-3: D-070 still omits the three new secret rows (carried from attempt 1 F02A-A6-P3-3; owner: A0)

- The D-070 row in `decisions.md` still lists six items. It names neither the backup write credential, nor the backup encryption key, nor the media-master credential (`out/12`).
- Its only "backup" word is the generic rule "never … in general backups".
- The blockers.md note says its rows are "proposed in D-070", and the HB-07 PROPOSAL reads "The D-070 destinations as written". A reply of "Proposal OK" would therefore confirm a list that leaves the three new rows out.
- **Fix direction:** add the three rows to D-070, or have HB-07's proposal cite the Secrets table.

### F02A-A6R2-P3-4: costs.json still points to HB-02 for the VPS price (carried from attempt 1 F02A-A6-P3-4; owner: A0)

- `costs.json` `items[0].note` still reads "The current VPS price, its plan … are unknown (HB-02)". HB-08(b) now asks this; HB-02 does not.
- None of the 11 `existing_cost_unknown` items cites HB-08.
- HB-08's "Provide" line routes answers only to D-064 and `authorized_caps` (`out/12`).
- **Fix direction:** point the notes to HB-08(b), and add the costs items to HB-08's "Provide" line.

### F02A-A6R2-P3-5: the blockers.md and decisions.md headers still say "submitted, not accepted" (carried from attempt 1 F02A-A6-P3-5; owner: A0)

- Line 3 of both files reads "Status: **submitted, not accepted**".
- `tasks.json` records F01 as `accepted`, and blockers.md line 6 is labelled an "A0 post-acceptance patch" (`out/12`).
- **Fix direction:** state acceptance at `cb3becf` in both headers.

## Part B: the blockers.md patch against the F01 attempt-2 P3 items

`diff -u` of the pre-patch copy against the current file shows 10 added and 5 removed lines (`out/11`). HB numbering is unchanged, and the file is byte-identical to the HEAD blob.

| Item | Change | Assessment |
|---|---|---|
| P3-1 backup and media secrets | Three rows added to "Outside the 06 map": the backup write credential (a VPS job-only secret file, plus a copy in HB-07); the backup encryption key (HB-07 plus an offline owner copy, "never on the backup destination or inside a backup set"); the media-master upload credential (HB-07) | Addressed in blockers.md. The key is not held only on the VPS, which was the review's concern. D-070 was not updated (P3-3) |
| P3-2 AI cover, likeness and signature | HB-22 asks who made the cover and the "AI-assisted editorial artwork" and on what terms, whether Bill consents to an AI-drawn likeness, and whether the signature is his | Addressed. The wording matches `inventory.md:99-100` |
| P3-3 existing subscription prices | HB-08(b) asks the plan, amount, currency and renewal date for the VPS, domain, mailbox, Calendly, Google, GitHub, and Resend and Upstash; "Don't know" is fine | Addressed. The costs.json pointer residual is P3-4 |
| P3-4 HB-08 contradiction | The proposal keeps all caps at 0. If HB-14 fails, A0 returns with one Workspace line item (the price comes from Bill's own checkout) for a yes/no. "Nothing is bought under a 0 cap" | Addressed: "Proposal OK" now has one outcome, the one the review suggested |
| P3-5 gate mapping | The G2 "not askable yet" cell lists the per-action test scopes (P05/L01). The G5 row adds HB-20 | Addressed. My title-versus-row script finds 1 mismatch before the patch (HB-20 → G5) and 0 after (`out/12`) |

Checks on the patch as a whole (`out/12`):
- **No secret is requested.**
  - No added line asks for a value.
  - The new rows name locations only.
  - The "Secrets: never in chat" heading remains.
  - HB-07 still says "reply with the tool's name and the person's name only, never a secret".
- **No invented price or cap.**
  - The only amount in the added or removed lines is the pre-existing D-066 "CAD 20/day × 14 days" proposal, which is carried over unchanged.
  - The Workspace price is explicitly left to Bill's own checkout.
  - `costs.json` `authorized_caps` is 0/0/0 and the file equals HEAD.
- **No contradiction with decisions.md.**
  - HB-03 now keeps presentation/ "on its own branch, outside the baseline, pending HB-12", and it drops the earlier "presentation ignore-list union". That matches D-073 ("presentation … preserved, unmerged").
  - HB-12 still proposes excluding presentation/ from the build.
  - HB-08 matches D-064 (spend 0 until G2) and D-022 (Workspace is only a candidate).
  - The only mismatch is the D-070 omission (P3-3).

## Status of earlier findings

| Earlier finding | Status now | Evidence |
|---|---|---|
| F02-MATH3-P2-1 (the pre-start factor is unpinned) | **Fixed by WM37.** Caught only by WM37 | `out/01` |
| F02-MATH3-P2-2 (the joint rule is unpinned) | **Fixed by WM38.** The partner fault and its start-only, end-only and younger variants are caught only by WM38. The older-age variant remains (P3-1) | `out/01` |
| F02-MATH3-P3-1 (two display-rounding faults) | **Fixed by WM39 and WM40** | `out/01` |
| F02-MATH3-P3-2 and P3-3 | Open, outside D-072's scope (disclosed in the handoff) | — |
| F02A-A6-P2-1 (`validate.py` red) | **Still reproduces.** No A0 action since attempt 1 → R2-P2-1 | `out/06`, `out/07`, `out/10` |
| F02A-A6-P2-2 (handoff ID) | **Still reproduces.** No A0 action → R2-P2-2 | `out/08`, `out/09` |
| F02A-A6-P3-1 … P3-5 | All still reproduce (no file changed) → R2-P3-1 … P3-5 | `out/01`, `out/12`, `out/13` |

## Observations (not findings)

- **Backup encryption key (P04).** The new row keeps the key in HB-07 and in an offline owner copy. P04 will need either asymmetric encryption, with only a public key on the VPS, or a documented runtime location for a symmetric key. Otherwise the nightly job cannot encrypt without placing the key somewhere the row does not list.
- **G3.** The calculation bundle now has new hashes (WM37–WM40, `index.json`). Any G3 or HB-26 approval must name them once P2-1 has put them in `validation.log`.

## Reproduction

```
cd .orchestration/evidence/F02a/a6-attempt2
PY=/path/to/python-with-jsonschema-4.26 PRE=/path/to/blockers.f01-accepted.md ./run_all.sh
```

- The script writes only `out/` and a scratch `git archive` copy. It never commits and uses no network.
- Expected markers:
  - 01, 02, 03, 05, 09, 12 and 13: exit 0.
  - 04: exit 1 (the trailing `grep -c` of 0 removed lines).
  - 06, 07, 08 and 10: exit 1 (P2-1 and P2-2).
  - 11: exit 1 (`diff` found differences).
- The pre-patch copy is also kept at `evidence/F02a/a6-attempt1/blockers.f01-accepted.md` (same sha256).

Not run: browser, network capture, rendered UI and media. The builder's copies of the attempt-3 A6 JavaScript harness were not rerun, because my own model replaces them. WK04 to WK07 are downstream checks. No live provider was used.
