# F02 math review, attempt 2: A6 independent math verifier (fresh context)

- **Scope.** This review covers only the F02 lane "workshop inputs, units and math". I read and checked:
  - `contracts/workshop-math.md`, `workshop-inputs.md`, `workshop-inputs.schema.json` and `workshop-clip-rules.md`;
  - all 36 WM fixtures, `clip-rules.json` and `index.json`;
  - the 5 valid and 27 invalid workshop-input examples;
  - 01 §9, the controlling formulas.
- **Reviewed artifacts.** Every sha256 is identical to the list at the end of `evidence/F02/math/validation.log`. `run_all.sh` checks this and prints "hashes identical … yes". The main ones:

  | File | sha256 |
  |---|---|
  | `workshop-math.md` | `00be5214821ab72523776faf93bb7a01765ab3032fd75c97c59440b55980a2cc` |
  | `workshop-inputs.schema.json` | `20df5bc3a360a70d2cbaef2d980d72181a938571f9c602f4377d135fcca3775e` |
  | `workshop-inputs.md` | `7df15a60290c9435312efb8b561365c292b352c9fc5c3c7ecf81f9a22e46d075` |
  | `workshop-clip-rules.md` | `f6b78b9e4db2108a53154bebe6344c6bde62b7b2e163c9d610e9912902429aff` |
  | `clip-rules.json` | `c8201bc12d53855c251ab2d5583673683940aeecaf327467d239a4ad5bc03071` |
  | `index.json` | `e2c690ff8cc11b85182e29b721aff9a08c845f1044abe01c65112087f8c11c8b` |
  | WM01–WM36 | the per-file list is in `out/current_hashes.txt` |

- **Repo state.** HEAD is `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b` on `claude/orchestration-foundation`, and the F02 files are untracked. I checked out nothing and committed nothing.
- **Independence.** I did not read, import or run `evidence/F02/math/compute_fixtures.py`. I wrote my model from the contract text alone, before I looked at any other implementation. It differs from both earlier models:

  | | Author (`workshop_reference.py`) | A6 attempt 1 (`model.mjs`) | This review (`model.py`) |
  |---|---|---|---|
  | Number type | `fractions.Fraction` | BigInt rationals | `decimal.Decimal` in an exact context. Inexact and Rounded are trapped, so any operation that is not exact raises. |
  | Growth | not relevant here | year-by-year recurrence | closed-form powers (1+x)ⁿ |
  | C_R | not relevant here | Horner recursion | direct sum of plain Python ints over one common denominator |
  | Rounding | not relevant here | not relevant here | integer divmod, half to even |

  Only after my model matched all 36 fixtures did I call the author's `workshop_reference.compute()`. I used it as a black box for a differential run (point 7 below), and I did not use its source.
- **Environment.** Local container, Python 3.11.15, jsonschema 4.26.0, node v22.22.2, Ajv 8.20.0. All evidence is fixture or property evidence: no browser, no network calls from the checks, no provider.
- **Evidence.** Code, `run_all.sh` and outputs are in `.orchestration/evidence/F02/a6-math-attempt2/`, with outputs under `out/`:
  - `run.log` is the full run with commands and exit codes, re-run from the evidence folder itself;
  - `computed_fixture_outputs.json`;
  - `invalid_examples_{jsonschema,ajv}.json`;
  - `properties_*.json`;
  - hash lists.
- **Writes.** I wrote only that evidence folder, my scratchpad and this file. There were no commits, pushes, connector calls or external actions.
- **Approvals.** This is a technical verification only. It is not G3 professional approval and does not sign for Bill or the firm.

## Verdict: needs_changes

There is **1 P2** and **3 P3**. There is **no P0 and no P1**:
- No calculation is wrong. Every cent and every exact string in all 36 fixtures reproduces.
- No unit or timing convention is ambiguous.
- Clip selection is total and matches the table.

The P2 is a place where the contract itself turns an unknown into a displayed 0, which goes against its own "unknown is never zero" rule.

## What passes (with evidence)

1. **Every fixture reproduces exactly.** 36 of 36 WM fixtures give a full output record identical to `expected`, with 0 differences across 4,970 leaf values. Dict key order is ignored, list order counts, and types are strict (so 0 ≠ null ≠ false). The match covers:
   - every rounded cent and exact decimal string;
   - every `C_R_exact` `p/q`;
   - every flag, reason, state and clip.

   The 24 possible truth-table rows and 7 supplementary cases in `clip-rules.json` also reproduce: predicates, selected clip, reason, state and flags. The 6 media cases match my own transcription of §7. `index.json` matches every fixture. (`run_fixtures.py`, `clip_rules_check.py`, `index_check.py`)

2. **The closed forms agree** (`closed_forms.py`, 56 of 56). These checks use plain integer rationals, separate from the model:
   - WM02: D_t = a·1.02ᵗ. The window sum equals a·1.02⁵(1.02¹⁰−1)/0.02, which is 60,446,883 cents, and the deflated gap is exactly a in every year.
   - WM04: P = a·1.025ᵗ for the today-dollar source; the start-year source stays flat.
   - WM15, growing annuity: a[1−(1.02/1.04)²⁰]/0.02 = 80,458,251 cents.
   - WM16, level annuity: g[1−1.05⁻²⁵]/0.05 = 25,369,100 cents.
   - WM35: valued at the start of t_R = 4, C_R = 20,223,203 cents. Valuing at t = 0 would give 17,286,878.
   - WM11 and WM14 check by hand. WM36 gives C_R = 0 with `no_positive_gap`.
   - WM12: C_R at r = 0 is the sum of the gaps, 339,131.5372. Netting surpluses would give −526,360.4628.

3. **Units and timing are consistent with 01 §9.**

   | §9 | Contract |
   |---|---|
   | D_t = 12m(1+i)ᵗ | Same. t = 0 is the whole base calendar year, a disclosed approximation. |
   | P_j,t = b_j(1+q_j)^(t−s_j) for t ≥ s_j | Same. It adds two disclosed extensions: the `price_basis` treatment of b_j and an optional exclusive `end`. |
   | G_t = max(0, D_t − ΣP_j,t) with surplus separate | Same. Only `net` income is compared with after-tax spending. |
   | C_R = Σ_{k=0}^{H−1} G_{R−A+k}/(1+r)^{k+1} | Same. Flows are end-of-year and the value is taken at the start of t_R. r is nominal and net of fees. |

   The units are clear:
   - money is integer CAD cents;
   - rates are basis points, converted exactly as (10,000+bp)/10,000;
   - ages, indices and the horizon are whole years;
   - a monthly amount is multiplied by 12.

   Replacing every monthly amount with its annual twin (m → 12m) gives an identical output record in 10,000 of 10,000 random valid inputs. Reordering the sources never changes the output (5,953 checks).

4. **Unknown is not zero, in the gap computation.** In the property runs:
   - A known source amount made unknown never yields a number where the source pays, never makes a year computable, and never changes a year in which the source does not pay (4,267 checks).
   - Spending made unknown gives null spending, gap, surplus and `exact.spending`, with the reason `spending_unknown`, in every row (4,805 checks).
   - The fixtures WM07, WM08, WM20, WM22, WM23 and WM25–WM34 pin every path in the §6 table.

   The one exception is in the display groups (P2-1).

5. **A basis mismatch blocks the gap.**
   - Every computed row in 10,000 random inputs has income only in the net group.
   - Switching one paying source to `gross` never leaves a paying year computed (4,423 checks).
   - WM09 and WM23 show the groups side by side and are never subtracted across bases.

6. **The surplus is separate and never netted.** In every computed row, at most one of G and S is positive, and G − S = D − ΣP exactly (10,000 inputs).

7. **Differential run against the author's reference model.** I compared the full output records of my model and `workshop_reference.compute()` on 10,000 random schema-valid and XF-valid inputs, using two seeds and unknown rates of 12% and 35%. There were **0 differences**. All 24 possible predicate vectors occurred, and none of the 8 impossible C∧F vectors did.

   `targeted.py` covers 12 cases that no fixture pins, and both models agree on all of them:
   - A and R both unknown;
   - the window unknown together with unknown spending and income not answered;
   - a source with an unknown amount starting after the window;
   - zero-amount gross, rental and uncertain sources;
   - a null member of the net group;
   - a partner whose current age is known but whose retirement age is unknown;
   - an end at or before t_R with an unknown start;
   - an unknown year-index end;
   - a partner retiring after the window.

8. **The capital illustration is OFF.**
   - Every fixture has `{feature_flag: off, displayed: false, state: disabled_by_flag}`.
   - No `workshop_capital_illustration` flag exists in `feature-flags.json` (FF-SHAPE-1 allows exactly six flags), so the illustration cannot be enabled.
   - The §11 enable conditions are explicit and bound to hashes.
   - The §11 faults are caught by the negative controls:
     - discounting C_R to t = 0 (WM35);
     - treating C_R = 0 as eligible for display (WM36);
     - start-of-year flows (WM11, WM15, WM16, WM35);
     - building C_R from rounded gaps (WM12, WM15, WM35).
9. **Rounding follows the stated rule, where the fixtures check it.**
   - Every displayed value equals half-even rounding of its exact value (10,000 inputs).
   - Against the displayed net group total, the displayed difference is never more than 1 cent.
   - Against the displayed per-source rows, the difference is never more than ⌊(n+2)/2⌋ cents.
   - Both float traps reproduce. WM17: JS `Math.round(1010050.5)` gives 1010051, while half-even gives 1010050. WM24: `1000800*1.025*1.025` gives 1051465.4999999998, while the exact value 1051465.5 rounds half-even to 1051466.
   - The §9 bounds are exact and within JS safe integers. I checked them by hand and by running the extreme valid inputs:

     | Bound | Cents |
     |---|---|
     | D_t | 2,000,944,911,742 |
     | one P_j,t | 1,000,472,455,871 |
     | group total | 8,003,779,646,969 |
     | C_R at r = 0 | 21,938,105,946,171 |

10. **The clip rules are total and match the table.**
    - The precedence in the fixture equals §3.
    - All 32 vectors map to exactly one (clip, reason).
    - The impossible rows are exactly 18, 20, …, 32, the C∧F rows. Proof: C means there is no window (so no rows) or D_t is null (so no computed row), and in both cases F is false.
    - W10 appears both first and last, and `selection_reason` tells the two apart.
    - Every selection in 10,000 inputs follows the precedence.
11. **No forbidden verdict output.** I scanned 2,109 records: the fixture expectations, the clip expectations, my outputs on the fixtures, and my outputs on 2,000 random inputs. There were 0 keys or values matching verdict, readiness, depletion, safe-withdrawal or 4%, optimal or recommend, Monte Carlo or probability, "enough" or shortfall, required savings, life expectancy or "reviewed". The output vocabulary is only neutral codes (`scan_forbidden.py`).
12. **The schema rejects every invalid example for its stated reason.** I ran this myself with two validators.
    - Python jsonschema 4.26:
      - The schema is valid against the 2020-12 metaschema.
      - All 5 valid examples, 36 WM inputs and 31 clip inputs are accepted, and they pass my own XF-04 to XF-06 checker.
      - Each of the 22 schema-layer invalid examples fails with the exact keyword, path, validator value and message named in its `.why.txt`, and with no unrelated error.
      - The 3 semantic examples are schema-valid and rejected only by my XF checker, each for the named rule and path.
      - `nan-literal` and `infinity-literal` fail a strict JSON parse, and also fail the schema at the stated path (P3-3).
    - Ajv 8 confirms the same results (33 of 33).
    - Exhaustive sweeps of the generated clauses found no mismatch:
      - XF-01: 5,893 cases;
      - XF-02: 5,893 cases;
      - XF-03: 4,260 cases.
    - 31 extra adversarial documents behave as expected. Examples: 2⁵³, per-period maximums, escalation or return of 1001 bp, `confirmed` inflation, a year-index start of 0 or 83, 9 sources, a `total` field, `excluded_from_spendable: false`, and string or boolean values. `450000.0` is accepted, as `workshop-inputs.md` §4 discloses.
13. **The earlier review's findings are fixed.** Attempt 1's P2-1, P2-2, P3-1 and P3-2 are resolved:
    - WM25–WM36 now pin the unknown paths, the ordered payment test, the reason-code sets and t_R > 0 with no positive gap.
    - §12 states the serialization rules.

    My fault injections for every item on the §10 list are caught by the fixtures named there (24 of 24).

## Findings

### P2-1: unanswered income is output as 0 income in the display groups, and a partial list's subtotal fills the same fields (owner: math)

**Location:**
- `workshop-math.md` §5, "Display groups": "A group is null if any of its members is unknown, and 0 if it has no members".
- Fixtures WM07 and WM30.
- It conflicts with §5 ("An unknown is never zero"), §6 ("It is forbidden to substitute 0 … for any unknown") and `workshop-inputs.md` §5 (`not_answered` is **unknown**).

**Reproduce:** `python3 unknown_income_zero_demo.py` (output in `out/run.log`).

**Expected:** When the participant has not answered the income chapter (`coverage = not_answered`), the year's income is unknown. Its display value must be null, as `spending_cents` already is when spending is unknown (WM25). It must not be 0.

**Actual:** The output depends on the coverage answer:

| Coverage | Rows | `income_net_cents` / `income_gross_cents` / `income_unknown_basis_cents` |
|---|---|---|
| `no_planned_income` (WM06, a known zero) | every row | `0` / `0` / `0` |
| `not_answered` (WM07, unknown) | every row | `0` / `0` / `0`, **identical** to WM06 in all four income fields |
| `some_sources_may_be_missing` (WM30) | every row | `income_net_cents: 3300000`, the listed subtotal, in the field that §5 describes as "Income for each year … by basis" |

In WM07 only `status`, `reasons` and the null gap tell a known zero apart from an unknown. The zero tolerance means every conformant W02/W04 runtime must emit these zeros, and the summary or print table would show "$0" of after-tax income for someone who skipped the question. The gap, state and clip are correct (null, `incomplete_unknown_income`, W06), so this is limited, not P0/P1.

**Fix direction (math lane):**
- When `coverage` is not in {`all_known_sources_listed`, `no_planned_income`}, make the three group totals `null`. Alternatively, keep the listed subtotal under an explicitly partial field or marker whose copy says "listed sources only". Either way, never publish a 0 for `not_answered`.
- Update WM07 and WM30, add a negative control, and note the change in §15.

### P3-1: two display-rounding faults pass all 36 fixtures (owner: math)

**Location:**
- `workshop-math.md` §5 (today-dollar values are "computed from the exact G_t and S_t") and §9 ("Sums and differences are formed from exact values before rounding"; the 8-source example appears in prose only).
- §10 (the fixtures are the conformance gate, tolerance none).

**Reproduce:** `python3 negative_controls.py` (lines `MISSED deflate_rounded` and `MISSED round_then_sum`) and `rounding_demo.py`.

**Actual:** Two faults change displayed cents on valid inputs, yet pass every WM fixture and clip-rule case:

| Fault | Valid input | Conformant | With the fault |
|---|---|---|---|
| Group total summed from the rounded per-source rows | WM17 with two sources of 1,000,050, t = 1 | `income_net_cents` 2,020,101 | 2,020,100 |
| Today-dollar value deflated from the rounded gap | one net source of 1,000,077, spending 2,000,001, i = 150 bp, t = 2 (exact gap 1,060,374.030225) | `gap_today_dollars_cents` 1,029,265 | 1,029,264 |

The gap itself cannot go wrong this way: WM17 already catches a gap computed from rounded components. The error is at most a few cents in display fields.

**Fix direction:** Add one fixture with at least two sources whose year-t amounts are fractional (Demo A), and one row where the two deflation orders differ (Demo B). Add both faults to the negative controls in `validate.py`.

### P3-2: three reason and flag readings are not pinned by any fixture (owner: math)

**Location:** `workshop-math.md` §6 (the row "`retirement_age` (current age known)"), §7 (reasons are the union of the global codes) and §8 (`horizon_shorter_than_timeline`, "some non-zero source").

**Reproduce:** `negative_controls.py` (`MISSED R_code_only_if_A_known`, `no_global_codes_without_window`, `horizon_known_positive_only`) and `targeted.py`.

**Actual:** Under an exact-match policy, each of these leaves a second reading open, and no fixture decides between them:
- When A and R are both unknown, is `retirement_age_unknown` listed as well? The §6 parenthetical invites the answer "no".
- With no window, do `spending_unknown` and `income_not_answered` enter `completeness.reasons`? CS01 and CS02 compare only state and flags.
- Does a source with an unknown amount count as "non-zero" for the horizon flag?

My model and the reference make the same choice (yes, yes, yes), and §7's union rule and "an unknown is never zero" support that choice. Nothing numeric, no state and no clip changes.

**Fix direction:** Add one full-record fixture with no window and several global unknowns. Reword §8 to "a source whose amount status is not `zero` (an unknown amount counts)".

### P3-3: the documentation of the `infinity-literal` rejection is incomplete (owner: math)

**Location:** `workshop-inputs.md` §7 and `examples/invalid/workshop-inputs/infinity-literal.why.txt`.

**Reproduce:** `validate_schema.py`, `validate_ajv.mjs`.

**Actual:** Both say "Python jsonschema reports `type`". Python jsonschema 4.26 actually reports `type` **and** `maximum` (twice) at `/chapters/life/spending/amount/value`, while Ajv 8.20 reports only `maximum`, as stated. The document is rejected either way, so this is wording only.

**Fix direction:** Change the wording to "reports `type` (and `maximum`)".

## Observations for G3 and A0 (not findings)

- **r = 0 in the capital illustration.** At r = 0, C_R is the undiscounted nominal sum of the gaps (WM14). That is close to the §13 prohibition on "an undiscounted multi-year nominal total", and the ±1% display range would clamp to {0, 0, 1%}. G3 should decide whether r = 0 may be shown if the flag is ever created. Today the illustration cannot be enabled.
- **Enable condition 1 of §11.** I found no defect in §11 or in fixtures WM11, WM12, WM14–WM16, WM35 and WM36 at the hashes above. Fixing P2-1 will change the hash of `workshop-math.md`, so the §11 acceptance should be recorded against the final hashes.
- **Answers to the §14 technical questions.** Q7 and Q8 are handled consistently by the math:
  - Q7: an end at or before t_R with an unknown start gives a known 0 (§4 rule 2).
  - Q8: a known start with an unknown end is `unknown` in the start year.

  Q1, Q3, Q5 and Q6 are professional questions for G3.
- **The state name `complete`.** It means complete data, not readiness. C02 copy must not present it as a verdict.
