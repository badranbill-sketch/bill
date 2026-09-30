# F02 math review, attempt 3: A6 independent math verifier (fresh context)

- Reviewer: A6 (independent verifier), attempt 3 of 3. Technical verification only; this is not professional (G3) approval and is not signed for Bill or the firm.
- Date: 2026-09-30. Repo `/home/user/bill`, branch `claude/orchestration-foundation`, HEAD `5cbbf9b` (F02 files are untracked working-tree files).
- Environment: local container, fixture evidence only (no browser, no network, no provider). Node v22.22.2 + Ajv 8.20.0; Python 3.11 + jsonschema 4.26.0.
- Evidence: `.orchestration/evidence/F02/a6-math-attempt3/` (code, `run_all.sh`, `out/*.log`, `MANIFEST.sha256`). The whole run was repeated from a clean copy containing only this attempt's files, with identical results (`out/run_all.log`).

## Artifacts reviewed (sha256)

| File | sha256 |
|---|---|
| `contracts/workshop-math.md` | `583bd20434605b5dc5aa48288f706c0af9014607536f1ccac026fa501a260fbf` |
| `contracts/workshop-inputs.md` | `ba3da0b8de3f41929452cf705f9bbd71a2171d52d93dbb4bb3bd6cb7081d5757` |
| `contracts/workshop-clip-rules.md` | `f6b78b9e4db2108a53154bebe6344c6bde62b7b2e163c9d610e9912902429aff` |
| `contracts/workshop-inputs.schema.json` | `20df5bc3a360a70d2cbaef2d980d72181a938571f9c602f4377d135fcca3775e` |
| `fixtures/workshop/clip-rules.json` | `c8201bc12d53855c251ab2d5583673683940aeecaf327467d239a4ad5bc03071` |
| `fixtures/workshop/index.json` | `e2c690ff8cc11b85182e29b721aff9a08c845f1044abe01c65112087f8c11c8b` |
| WM01–WM36 | listed in `out/contract_hashes.txt` |

All 49 hashes printed in `evidence/F02/math/validation.log` still match the files on disk (`out/hash_check.txt`: 49/49 OK). No contract file changed during this review.

## Method

1. I read 01 §9, 04 WK01–WK07, the three workshop contracts, the schema and every fixture. I did **not** open `compute_fixtures.py` or `workshop_reference.py` before my model reproduced the fixtures.
2. I wrote a new implementation in JavaScript with BigInt rationals (`rational.mjs`, `model.mjs`). It differs from the A2 reference (Python `Fraction`) by construction:
   - growth factors are built by an iterative year-by-year product, not by `pow`;
   - C_R is computed by backward (Horner) recursion V_k = (G_k + V_{k+1})/(1+r), not as a sum of discounted terms;
   - the §4 payment test is an explicit ordered rule list.
3. A third path checks the formulas directly: closed forms with BigInt `**` (`closed_forms.mjs`).
4. Only after the fixtures matched did I use `workshop_reference.compute()` as a black-box oracle, for differential fuzzing (`oracle_ref.py`). None of its code is used in my model.
5. I also ran schema validation under two validators, exhaustive sweeps of the enumerated cross-field clauses, property and metamorphic tests on 8,000 random valid inputs, and 43 injected faults (negative controls) against the fixture set.

## Verdict: needs_changes

The math is correct, and the units and timing conventions are unambiguous and consistent with 01 §9. There is no P0 or P1. Two **P2** gaps remain in the conformance fixture set: two normative numeric rules can be implemented wrongly and still pass every WM fixture and every clip-rule case, while producing materially different gaps. Both are fixed by adding fixture rows and negative controls. No formula needs to change.

## What passes (with evidence)

1. **Every fixture recomputes exactly** (`run_fixtures.mjs`, `out/run_fixtures.log`).
   - 36/36 WM fixtures. Every field of `expected` is deep-equal, with no tolerance; key order is ignored per §12.2. All inputs are schema-valid and pass XF-04 to XF-06.
   - `index.json`: 37 entries. `selected_clip` and `completeness_state` agree with the model for all 36 WM entries, and the CLIP entry's file exists.
   - `clip-rules.json`:
     - all 24 possible truth-table rows match predicates, clip, reason, state and flags;
     - the 8 impossible rows are exactly those with C ∧ F, have no input, and give W10 by precedence;
     - CS01–CS07 and MS01–MS06 all pass, the MS cases through an independent render-state function written from clip-rules §7.
2. **Closed forms and hand checks** (`closed_forms.mjs`, `out/closed_forms.log`, ALL OK).
   - WM02: every D_t equals a(1+i)^t, and the geometric-series identity holds.
   - WM14: the plain sum 5 × 1,800,000.
   - WM15: the growing annuity a(1+i)^{t_R}[1 − ((1+i)/(1+r))^H]/(r − i).
   - WM16: the level annuity g[1 − (1+r)^−H]/r.
   - WM35: valued at the start of t_R, 20,223,203. Discounting to t = 0 would give 17,286,878, which the fixture correctly rejects.
   - WM12: C_R is the sum of the positive gaps only; surplus is not netted.
   - C_R_exact matches character for character in every case.
3. **Rounding and bounds.**
   - WM17 has half-even ties in both directions (1,010,050.5 → 1,010,050 and 1,010,151.5 → 1,010,152), and `Math.round` gives 1,010,051.
   - WM24: float64 gives 1051465.4999999998, while the exact value 1,051,465.5 rounds to 1,051,466.
   - All four §9 bound figures are reproduced exactly: D_t 2,000,944,911,742; P 1,000,472,455,871; group 8,003,779,646,969; C_R(r=0) 21,938,105,946,171. All are below 2^53 − 1.
   - The largest t over the input space is 102.
   - The §9 per-source example gives rows 8,800,032 against a total of 8,800,035.
   - Property "displayed G/S differs from displayed D − displayed I^net by at most 1 cent": 0 violations in 8,000 inputs.
4. **Units and timing are unambiguous and match 01 §9.**

   | 01 §9 | Contract | Check |
   |---|---|---|
   | D_t = 12m(1+i)^t, t from today | §3, t = 0 is the whole base calendar year; a = 12m or the annual input | WM02, WM05 (monthly ≡ annual); metamorphic ×12 test on 8,000 inputs: 0 differences |
   | P_j,t = b_j(1+q_j)^(t−s_j), t ≥ s_j | §4, plus the disclosed `price_basis` rule for b_j and an optional exclusive end | WM03, WM04, WM18 |
   | G_t = max(0, D_t − ΣP) when bases agree; surplus separate; unknown ≠ 0 | §5: computed only when every paying source is `net` and all P are known | WM06–WM09, WM12, WM23 |
   | C_R = Σ_{k=0}^{H−1} G_{R−A+k}/(1+r)^{k+1} | §11, identical; nominal r and G; start of t_R | WM14–WM16, WM35 |

   Money is integer cents, rates are integer bp, ages and indices are whole years. Every flow is an annual total for calendar year t, and end-of-year timing is used only for C_R. Birthdays are ignored, which is disclosed. I found no unit or timing statement that admits two readings.
5. **Unknown is never zero.**
   - Pinned by WM07, WM08 and WM20–WM34.
   - Properties on 8,000 random valid inputs:
     - P_j,t is null exactly when one of the six "unknown" codes is attached;
     - a row is `computed` exactly when it has no reason;
     - with incomplete coverage, all three income groups are null.

     There were 0 violations.
   - Metamorphic test (`metamorphic.mjs`): for each unknown (spending, amount, start, end, price basis, partner age), I substituted two different known values and required every row computed in the original to stay byte-identical. That is 4,922 row checks with 0 violations. Savings never move a number (0 violations).
6. **A basis mismatch blocks the gap.** WM09 (gross), WM23 and CS04 (unknown basis). In the fuzz run, no computed row had non-zero gross or unknown-basis income. The groups are never subtracted across bases.
7. **Surplus is shown separately.** WM12 has 4 surplus years and 2 gap years, with no netting. No row has both G > 0 and S > 0. An injected netting fault is caught by WM12.
8. **The capital illustration is off by default, with enable conditions.**
   - In every output (36 fixtures and 8,000 fuzz inputs): `feature_flag: off`, `displayed: false`, `state: disabled_by_flag`.
   - `workshop_capital_illustration` is absent from `feature-flags.json`, whose FF-SHAPE-1 requires exactly six flags. It therefore cannot be enabled today.
   - §11 lists the four enable conditions: the A6 report at hashes, G3/HB-26, a human G6 flag record, and W02 reproduction plus UI verification.
   - C_R = 0 is never display-eligible (WM36, and 0 property violations).
9. **Clip precedence is total and matches the truth table.**
   - The rule is a first-match list with a default, so every input maps to exactly one clip.
   - On 8,000 random inputs, the selected clip always equalled the precedence applied to the computed predicates, and all six outcomes occurred.
   - C ∧ F never occurred, as the proof requires: F needs a computed year, and C rules out every computed year.
10. **No forbidden verdict output.** The expected outputs of all 36 fixtures and all clip cases contain only neutral codes and the required disclosure. In the three contracts, every readiness, depletion, safe-withdrawal, Monte Carlo, "enough" or "required savings" phrase is inside a prohibition.
11. **The schema rejects every invalid example for the stated reason** (`validate_examples_ajv.mjs`, `validate_examples_jsonschema.py`).
    - Both validators accept the schema as draft 2020-12, and all 5 valid examples.
    - All 27 invalid examples are rejected with the stated keyword, path and validator value, and no unrelated error. Three are semantic cases (XF-04, XF-05, XF-06), which pass the schema and fail my own checker at the stated path.
    - `infinity-literal`: Ajv reports `maximum` (twice); jsonschema reports `type` and `maximum` (twice). Both match the corrected text.
    - All 67 fixture and clip inputs are valid under both validators.
    - Exhaustive sweeps (`schema_sweeps.mjs`) show the enumerated clauses are exact over the whole input space: XF-01 in 5,893 cases, XF-02 in 5,893, XF-03 in 4,260 with A known and 4,260 with A unknown.
    - Of 36 targeted mutations, 34 are accepted or rejected as documented. The other 2 expose P3-3.
12. **Differential against the reference.** On 8,000 random valid inputs (seeds 20260930 and 777), the full output records of my model and `workshop_reference.compute()` are identical in 8,000/8,000 cases (`out/diff_oracle_*.log`).
13. **Negative controls** (`faults_run.mjs`, `out/negative_controls.log`). Of 43 injected faults, 35 are caught by at least one fixture, including every fault that §10 lists. The 8 that are missed are covered by the findings below.

## Findings

### F02-MATH3-P2-1: the pre-start price-basis factor (1+i)^{s_j} is not pinned by any fixture (owner: math)

**Location:** `workshop-math.md` §4, "b_j = a_j · (1 + i)^{s_j} when price_basis = today_dollars and s_j > 0"; §10 (fixtures are the W00 gate, tolerance none); TASK_LEDGER W00 acceptance ("Explicit timing/tax/price basis").

**Reproduce:**
- `node faults_run.mjs`: the line `MISSED today_dollars_uses_q`.
- `node demo_unpinned.mjs`: case U1.

**Expected:** A runtime that grows a today-dollar amount before its start by anything other than i (for example by its own escalation q_j) fails at least one fixture.

**Actual:** The only computed today-dollar source with s_j > 0 is WM04, and it has q_j = i = 250 bp. WM20 and WM31 have q ≠ i but no window. A runtime using (1+q_j)^{s_j} therefore passes all 36 WM fixtures and all 45 clip cases. Case U1 is a valid input: A = 55, R = 65, i = 2%, spending $60,000/yr, a net today-dollar pension of $24,000/yr from age 65, q = 0.

| t | Contract P / gap (cents) | Faulty P / gap |
|---|---|---|
| 10 | 2,925,587 / 4,388,380 | 2,400,000 / 4,913,967 |
| 11 | 2,925,587 / 4,534,659 | 2,400,000 / 5,060,246 |
| 12 | 2,925,587 / 4,683,864 | 2,400,000 / 5,209,451 |

The gap is overstated by $5,255.87 a year (about 12%). The reference model agrees with the contract column.

**Why P2, not P1:** the contract text is unambiguous and the reference is correct. The defect is in the conformance suite, which the downstream W00 implementation will be judged against.

**Fix direction:**
- Add one fixture row, or a second source in WM04, with `today_dollars`, s_j > 0 and q_j ≠ i. A case with q = 0 is enough; one with q > i also helps.
- Hand-check b_j = a_j(1+i)^{s_j}.
- Add the fault "pre-start growth at q_j" to the `validate.py` negative controls.
- Re-hash. Any change to the WM01–WM36 set that `README.md` row 14 names is coordinated by A0.

### F02-MATH3-P2-2: the rule "`joint` uses the participant's age" is not pinned by any fixture (owner: math)

**Location:** `workshop-math.md` §2 ("A_o is the participant's age for `self` and `joint` sources"); `workshop-inputs.md` §5 (`.owner`: "`joint` uses self"); the schema's `owner` description.

**Reproduce:**
- `grep -l '"joint"' fixtures/workshop/*.json` returns nothing.
- `node faults_run.mjs`: the line `MISSED joint_uses_partner`.
- `node demo_unpinned.mjs`: case U2.

**Expected:** A runtime that resolves a joint source's age-based start or end against the partner's age (for example `owner === 'self' ? A : partnerA`) fails at least one fixture.

**Actual:** No WM fixture and no clip input uses `owner: "joint"`, so this faulty runtime passes everything. Case U2 is a valid input: A = 60, R = 62, H = 6, i = 0, a partner aged 55 retiring at 60, spending $48,000/yr, and a joint net rental of $12,000/yr from age 65.
- Contract: s_j = 5, so the rental pays in t = 5–7 and the gap is 3,600,000 in those years.
- Fault: s_j = 10, so nothing pays inside the window and the gap is 4,800,000.

The gap is overstated by $12,000 in 3 of the 6 illustrated years. The reference model agrees with the contract.

**Fix direction:** Add a fixture, which can be the same new fixture as P2-1, with a household whose ages differ from the participant's and a joint-owned age-based start or end. Add the fault "joint resolved against the partner's age" to the negative controls.

### F02-MATH3-P3-1: two display-rounding faults are still unpinned (carried from attempt 2 P3-1; owner: math)

§15 records this as left to A0 and A6. It still reproduces (`node demo_rounding.mjs`):
- **Demo A:** a group total summed from the rounded per-source rows gives `income_net_cents` 2,020,100 instead of 2,020,101.
- **Demo B:** a today-dollar value deflated from the rounded gap gives 1,029,264 instead of 1,029,265.

Both faults pass every fixture (`MISSED group_from_rounded_rows`, `MISSED deflate_rounded_gap`). The effect is display-only, at most a few cents, and §5/§9 forbid both.

**A6 recommendation:** because P2-1 and P2-2 already require new fixture rows and re-hashing, pin these two in the same repair, so the fixture set only needs re-approving once.

### F02-MATH3-P3-2: four code or flag readings are specified but unpinned (partly carried from attempt 2 P3-2; owner: math)

The wording is now explicit (§7 and §8), and my model follows it. No fixture separates these faulty readings from the conformant ones (`out/negative_controls.log`):
- `R_code_only_if_A_known`: `retirement_age_unknown` is omitted when A is also unknown.
- `no_global_codes_without_window`: `spending_unknown` and `income_*` are dropped from `completeness.reasons` when there is no window.
- `horizon_flag_known_amount_only`: an unknown amount is not counted for `horizon_shorter_than_timeline`.
- `uncertain_flag_any`: this one is new. `includes_uncertain_income` is raised for an uncertain source that never pays in T\*, instead of evaluating `pays_j(t)` over T\*.

No number, state or clip changes, which is why this is P3.

**Fix direction:** add one full-record fixture with no window and several global unknowns. Add an uncertain source that ends before t_R and an unknown-amount source that starts after the window.

### F02-MATH3-P3-3: the source id pattern admits ids outside the documented range (owner: math)

`workshop-inputs.md` §5 and the schema description say `src-1` … `src-99`. The pattern `^src-[0-9]{1,2}$` also accepts `src-0`, `src-00` and `src-01`…`src-09` (`out/schema_sweeps.log`, NOTE lines). `src-1` and `src-01` are then distinct keys. This is harmless for the math: ids are opaque and XF-06 compares exact strings. It is a doc/schema mismatch. Either tighten the pattern to `^src-([1-9][0-9]?)$` or reword the doc.

## Observations for G3 and A0 (not findings)

- **r = 0 in the capital illustration.** At r = 0, C_R is the undiscounted nominal sum of the gaps. WM12 sums gaps at different price levels (i = 3%), and it is display-eligible if the flag were ever created. §11 would clamp the proposed display range {r − 1%, r, r + 1%} to {0, 0, 1%} at r = 0, and to {9%, 10%, 10%} at r = 10%. Both give fewer than the "at least three" assumptions that §11 requires. G3 should decide whether r = 0 or 10% may be shown. Today the illustration cannot be enabled.
- **§5 citation.** "A gross or unknown source that starts later does not block the earlier years (WM08, WM22)": neither fixture contains a gross source. The gross case is pinned at predicate level by clip-rules TT6 and TT8 (F true with X true), not by a full-record WM row. This is a wording issue only.
- **§14 Q1** (carrying a today-dollar amount forward at i before its start) is a professional question for G3. P2-1 asks only that whatever rule G3 approves is pinned by a fixture.
- **The state name `complete`** means complete data, not readiness. C02 copy must not present it as a verdict.
- **Downstream checks.** W03 must also compare truth-table `predicates`. Those rows' `expected` blocks omit predicates, so a harness that compares only `expected` would miss a wrong F in rows 6 and 8.

## Status of earlier findings

| Earlier finding | Status now | Evidence |
|---|---|---|
| Attempt 2 P2-1 (unanswered or partial income shown as 0 or as the listed subtotal in the groups) | **Fixed.** WM07 and WM30 groups are null in every row; WM06 is 0/0/0; the fault is caught by WM07 and WM30 | `out/run_fixtures.log`, `negative_controls.log` (`groups_as_listed_when_incomplete`) |
| Attempt 2 P3-1 (display rounding) | Open, carried as P3-1 | `out/demo_rounding.log` |
| Attempt 2 P3-2 (unpinned readings) | Wording fixed; pins still missing; carried as P3-2 | `out/negative_controls.log` |
| Attempt 2 P3-3 (`infinity-literal` wording) | **Fixed.** The text matches both validators | `out/validate_examples_*.log` |
| Attempt 1 findings | Remain fixed; their faults are caught (`unknown_first`, `one_code_per_source`, `unknown_start_not_paying`, `unknown_end_no_end` and others) | `out/negative_controls.log` |

## Reproduction

```
cp -r .orchestration/evidence/F02/a6-math-attempt3 /tmp/a6m3 && cd /tmp/a6m3
npm ci && python3 -m venv venv && venv/bin/pip install 'jsonschema==4.26.0'
./run_all.sh        # ~1 minute; writes ./out, exits 0; the negative controls print the 8 MISSED faults
```

Large regenerable files (the fuzz inputs and the reference outputs) are not committed. Their sha256 values are in `out/omitted_large_files.sha256`, and they regenerate deterministically from the seeds.

Not run: browser, network capture, rendered UI and media checks (WK04 to WK07 are downstream). No live provider was used.
