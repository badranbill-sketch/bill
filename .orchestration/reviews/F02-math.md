# F02 math review, attempt 1: A6 independent math verifier (fresh context)

- **Scope.** This review covers the F02 lane "workshop inputs, units and math" only. I checked the math contract, the input schema, the clip rules, all 26 fixture files, and the 5 valid and 27 invalid input examples.
- **Reviewed artifacts.** Their sha256 hashes are identical to the ones printed at the end of `.orchestration/evidence/F02/math/validation.log`. `run_all.sh` rechecks this and prints "hashes identical to validation.log: yes".

  | File | sha256 |
  |---|---|
  | `contracts/workshop-math.md` | `56fe68faeaf8fd454876d403af9203664e1c1d72f069b9ffc833dd821a5365c3` |
  | `contracts/workshop-inputs.schema.json` | `20df5bc3a360a70d2cbaef2d980d72181a938571f9c602f4377d135fcca3775e` |
  | `contracts/workshop-inputs.md` | `724eacd898fdd63d377846e0dd393b08668f2464f903277e2dbbe2758ddc6154` |
  | `contracts/workshop-clip-rules.md` | `292ae40ccb400ae464889b061dab8f2f4d1b8f1b8a7543c766f894c67c045f57` |
  | `contracts/fixtures/workshop/clip-rules.json` | `c8201bc12d53855c251ab2d5583673683940aeecaf327467d239a4ad5bc03071` |
  | `contracts/fixtures/workshop/index.json` | `eba475882d5d82ba9df657f8d26f226cfda4fbe2092dd7a0e04f00d04daa0a64` |
  | `WM01`…`WM24` | all 24 match `validation.log` |

- **Repo state.** HEAD is `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b` on `claude/orchestration-foundation`. The F02 files are untracked.
- **Independence.** I did not read, import or run `evidence/F02/math/compute_fixtures.py` or `workshop_reference.py`. My model was written from the contract text alone. It differs from the author's in four ways:
  - **Language.** It is JavaScript using BigInt rationals. The author's is Python using `fractions.Fraction`.
  - **Growth paths.** Every growth path is a year-by-year recurrence, X_{t+1} = X_t·(10000+bp)/10000. Closed-form powers are used only as cross-checks.
  - **C_R.** C_R is computed by backward Horner recursion, V_k = (G_k + V_{k+1})/(1+r).
  - **Schema validator.** Schema validation uses Ajv 8.20.0 (draft 2020-12), not Python jsonschema.
- **Environment.** Local container, node v22.22.2. All evidence is fixture evidence: no browser, no network, no provider.
- **Evidence.** `.orchestration/evidence/F02/a6-math-attempt1/` holds the code, `run_all.sh`, and `out/run.log` (full output with exit codes). The `out/` folder also has:
  - `computed_fixture_outputs.json`
  - `invalid_examples_report.json`
  - `negative_controls.{json,log}`
  - `ambiguity_demo.log`

  I re-ran everything from a fresh copy outside the repo and got identical check lines.
- **Writes.** I wrote only that evidence folder and this file. There were no commits, pushes, connector calls or external actions.
- **Approvals.** This is a technical verification. It is not G3 professional approval and does not sign for Bill or the firm.

## Verdict: needs_changes

There are **2 P2** and **5 P3** findings. There is **no P0 and no P1**. I found no wrong calculation, and no unit is ambiguous. Every expected cent and every exact string in the fixtures reproduces from the independent model.

The P2 findings are about determinism and coverage:
- The conformance suite would certify a runtime that reads several kinds of unknown input as zero or as a default.
- One timing rule in §4 has two literal readings. They pick different clips, and no fixture tells them apart.

## What passes (with evidence)

1. **Every fixture reproduces exactly.** 24 of 24 WM fixtures give a full output record that equals `expected` with zero differences (`run_fixtures.mjs`, 169 of 169 checks). The comparison covers every rounded cent, every `exact` decimal string, every `C_R_exact`, and the three `p/q` strings (WM11, WM15, WM16). Tolerance was zero, as the contract requires.
2. **The closed forms agree.**
   - For every window year of every fixture, D_t from the recurrence equals a·(1+i)^t computed as a BigInt power.
   - Every paying P_j,t equals b_j(1+q_j)^{t−s_j}, with b_j = a_j or a_j(1+i)^{s_j}.
   - WM02: Σ D_5..14 = a(1.02)^5((1.02)^10−1)/0.02 exactly, and the deflated gap is 5,000,000 in every year.
   - WM15 equals the growing annuity a[1−((1+i)/(1+r))^H]/(r−i), which is 80,458,251 cents.
   - WM16 equals the level annuity g[1−(1+r)^−H]/r, which is 25,369,100 cents.
   - WM11 equals Σ 1,800,000/1.03^{k+1}.
   - WM14 and WM12 at r = 0 are plain sums of the gaps.
   - C_R by Horner recursion equals the direct discounted sum in 323 of 323 random computable cases.
3. **Units and timing match 01 §9.**

   | 01 §9 | Contract |
   |---|---|
   | D_t = 12m(1+i)^t | Same formula. t = 0 is the whole calendar year that contains the base date. |
   | P_j,t = b_j(1+q_j)^{t−s_j} for t ≥ s_j | Same formula. It adds a disclosed `price_basis` extension for b_j and an optional exclusive `end`. |
   | G_t = max(0, D_t − ΣP_j,t), surplus separate | Same. Only `net` income is compared with after-tax spending. |
   | C_R = Σ_{k=0}^{H−1} G_{R−A+k}/(1+r)^{k+1} | Same. It is valued at the start of year t_R, with end-of-year flows, and is stated to be nominal. |

   The units are clear:
   - money is integer CAD cents;
   - rates are basis points;
   - ages, indices and the horizon are whole years;
   - monthly amounts are multiplied by 12;
   - r is labelled nominal net.

   The monthly/annual twin (monthly m versus annual 12m) gives identical output records in 4,000 of 4,000 random valid inputs.
4. **Unknown is not zero, where fixtures test it.**
   - WM07: income not answered gives null gaps.
   - WM08: an unknown amount on a later source leaves the early years exact and later years null.
   - WM20: unknown age gives no window.
   - WM22: an unknown price basis on a future source gives null.
   - In the property run, changing a known source amount to unknown never creates a number, and it blocks every year in which the source pays (4,000 of 4,000).
5. **A basis mismatch blocks the gap.** WM09 (gross) and WM23 (unknown basis) have no computed year. Their income is shown by basis group, side by side, never subtracted across bases. In 4,000 of 4,000 random inputs, every computed year has income only in the net group.
6. **The surplus is separate and never netted.** At most one of G_t and S_t is positive (4,000 of 4,000). In WM12, C_R at r = 0 is 339,131.5372, the gaps only. Netting would give −526,360.4628.
7. **The capital illustration is OFF.**
   - Every fixture has `{feature_flag: off, displayed: false, state: disabled_by_flag}`.
   - `workshop_capital_illustration` is absent from the closed six-flag list in `feature-flags.json` 1.0, so the illustration cannot be enabled.
   - The enable conditions in §11 are explicit and hash-bound.
8. **Rounding is applied consistently.** Every displayed field is rounded half to even exactly once, from the exact rational. Both float claims were reproduced:
   - WM17: JS `Math.round(1010050.5)` gives 1010051, while half-even gives 1010050.
   - WM24: `1000800*1.025*1.025` gives `1051465.4999999998` in doubles, while the exact value 1051465.5 rounds half-even to 1051466.

   Every extreme output within the schema limits is a safe integer.
9. **The clip rules are total and match the table** (`clip_rules.mjs`, 262 of 262 checks).
   - The fixture's precedence list equals §3 (C > M > X > H > F > neutral).
   - All 32 predicate vectors map to exactly one (clip, reason), which equals `selected_by_precedence`.
   - The 8 impossible rows are exactly those with C ∧ F.
   - For the 24 possible rows and 7 supplementary cases, the predicates, state, flags and selection were recomputed from each input and all match.
   - An independent implementation of §7 matches all 6 media cases.
   - C ∧ F never occurred in 4,000 random valid inputs.
10. **No forbidden verdict output.** A scan of every fixture `expected` record, every computed record and every clip expectation found 0 keys or values matching verdict, readiness, depletion, probability or percentile, safe-withdrawal or 4%, "optimal", "recommend", "reviewed", "required savings" or life expectancy. The selection is always a clip id.
11. **The schema behaves as stated.**
    - It is valid against the Ajv 2020-12 metaschema.
    - All 5 valid examples, 24 fixture inputs and 31 clip-rule inputs are accepted by the schema and pass XF-04 to XF-06.
    - All 27 invalid examples are rejected. 26 of 27 are rejected for the exact keyword, path and validator value named in their `.why.txt`, with no unrelated errors (see P3-4 for the one exception).
    - The three semantic examples are schema-valid and rejected only by my independent XF-04, XF-05 and XF-06 checker.
    - Exhaustive sweeps of the generated clauses show no mismatch:
      - XF-01: 5,893 cases (A = 18…100 × R = 30…100);
      - XF-02: 5,893 cases (partner A′ = 18…100 × R′ = 30…100);
      - XF-03: 4,260 cases (R = 30…100 × H = 1…60).
12. **Most negative controls are caught** (`negative_controls.mjs`). 17 of 24 injected faults are caught, including all nine listed in `validation.log`: half-up rounding, float64 growth, unanswered income treated as zero, gross subtracted, today-dollar income treated as nominal, the home counted as spendable (checked through flags), F ranked before M, H ranked after F, and netted surpluses. Also caught: monthly income not multiplied by 12, deflating from t_R, start-of-year C_R, the partner's age resolved with the participant's, an inclusive end, escalating from t = 0, pre-retirement rows, and tax basis "unknown" read as net. The 7 misses are the findings below.

## Findings

### P2-1: the fixture suite does not detect unknown-read-as-zero faults on four unknown paths (owner: math)

**Location:** `contracts/fixtures/workshop/` (WM01–WM24 and `clip-rules.json`), and `workshop-math.md` §6 and §10.

**Reproduce:** `node negative_controls.mjs` and `node extra_checks.mjs`, demos A to C, in `evidence/F02/a6-math-attempt1/`.

**Expected:** §6 says "It is forbidden to substitute 0, a default, an average or a 'typical' value for any unknown", and §10 says a runtime that reproduces every fixture is conformant. So every path in §6 needs at least one fixture that pins `years[]`, meaning null gap and surplus plus reasons, as well as the state.

**Actual:** Five of the six rows in that table have no such fixture:

| Unknown path | Fixture coverage | Injected fault that passes all 24 WM fixtures and all 31 clip-rule inputs |
|---|---|---|
| `spending.amount` unknown with a known window | `incomplete_unknown_spending` appears in no WM fixture. `clip-rules.json` compares only the state, clip and flags. | Unknown spending read as 0 in the rows. Demo C shows "spending 0, surplus 30,000.00" every year, with the state, clip and flags unchanged. |
| `start.point` status `unknown` | The code `start_unknown` appears in no fixture. No fixture has an unknown start point. | (a) Read as "not paying": demo A shows `complete`, W07, and a confident gap of 18,000.00 instead of W06 with null gaps. (b) Read as already receiving: the gap shown is 8,000.00. |
| `end.point` unknown or unresolvable | `end_unknown` and `end_unresolvable` never appear. The only `end` is the known one in WM18. | Read as "no end": demo B shows `complete`, W07 and a gap of 6,000.00. |
| `start_unresolvable` with a known window (partner-owned age start, partner age unknown) | This code appears only with no window (WM20, CS01). CS05 has no partner-owned source. | Read as "not paying". |

Also absent from every expected `reasons` list: `retirement_age_unknown`, `spending_unknown` and `income_list_partial`.

**Fix direction (math lane):** Add WM fixtures with full `years[]` for:
- spending unknown with a known window;
- an age or year-index start with `point.status = unknown`;
- an unknown end, and an end that cannot be resolved;
- a partner-owned age start while the partner's age is unknown and the window is known;
- a partial source list, so that `income_list_partial` is pinned.

Then add these four faults to the negative controls in `validate.py`.

### P2-2: the three-state payment test in §4 has no precedence rule, and the two readings select different clips (owner: math)

**Location:** `workshop-math.md` §4, the bullet "Three-state payment test".

**Reproduce:** `node ambiguity_demo.mjs`, output in `out/ambiguity_demo.log`. The input is schema-valid and passes XF-04 to XF-06: src-2 has an age start with status unknown and an end at age 62 (e_j = 2 = t_R). A = 60, R = 62, H = 6.

**Expected:** One deterministic result.

**Actual:** The text says "`no` … when t ≥ e_j" and "`unknown` when s_j is unknown or unresolvable". Both conditions hold for t ≥ e_j, and nothing orders them.

| Reading | Result |
|---|---|
| "no" first | `complete`, W07/`funding_gap`, t = 2 computed with a gap of 1,800,000 |
| "unknown" first | `incomplete_unknown_income`, W06/`missing_income`, t = 2 not computable |

No WM fixture or clip-rule input has an `end` together with an unresolved start, so neither reading is pinned.

Two related gaps affect only the reason lists, not numbers or state, because all these codes are M codes:
- which codes attach when both s_j and e_j are unresolved;
- whether `price_basis_unknown` attaches alongside `amount_unknown`, or when s_j is unknown.

**Fix direction:** State the order explicitly. I suggest that the "no" conditions (t < s_j when s_j is known, t ≥ e_j when e_j is known, zero-status) are evaluated first, because t ≥ e_j is decidable without s_j. Pin the result with a fixture, and specify the code set for the combined-unknown cases.

### P3-1: capital-illustration fixtures never test t_R > 0 or an all-surplus result with r present (owner: math)

**Location:** WM11, WM12 and WM14–WM16 (all have A = R, so t_R = 0). WM17 has no r. `workshop-math.md` §11.

**Reproduce:** Run `negative_controls.mjs`. The faults `crDiscountToBase` and `ignoreNoPositiveGap` are both MISSED. Demo D is A = 58, R = 62, H = 4, i = 2%, r = 4%:
- correct C_R, valued at the start of t_R = 4: 19,414,275 cents;
- faulty C_R, discounted to t = 0: 16,595,403 cents;
- `valued_at` is identical in both.

In demo E, with all surplus and r = 3%, C_R is 0. The fault marks it display-eligible, which §11 forbids.

**Expected:** The fixtures that §11 condition 1 asks A6 to accept should catch both faults.

**Actual:** Neither is caught.

The illustration is OFF and cannot be enabled, so this is P3 today. **This review does not satisfy §11 enable condition 1.** I do not accept WM11, WM12 and WM14–WM16 as sufficient until they include a t_R > 0 case and an all-surplus case with r present. The code name for "no positive gap" in `ineligible_reasons` is also not pinned.

### P3-2: output-record conventions required for an exact match are not written down (owner: math)

**Location:** `workshop-math.md` §7, §11 and §12.

**Actual:** The tolerance policy is an exact match, but the following conventions are only inferable from the fixtures:
- **Array order.** `completeness.reasons`, `years[].reasons` and `flags` are sorted lexicographically in every fixture, for example WM20 `["current_age_unknown","gross:src-1","start_unresolvable:src-1"]`. The contract names no order.
- **`partner_age?`.** Its presence when a household is present but the partner's age is unknown is unspecified.
- **Savings summary.** For `excluded_from_spendable` and `pension_value_kept_separate`, the behaviour with a zero or unknown value is unspecified.
- **`ineligible_reasons`.** When the illustration is not computable, `ineligible_reasons` repeats `not_computable_reasons` and omits flags (WM07, WM20, WM22). This convention is unstated.

A correct runtime could fail WM20 on ordering alone.

**Fix direction:** Add these rules to §12.

### P3-3: two sentences in §9 are imprecise (owner: math)

- **Bounds.** "The largest rounded output is about 2.0 × 10¹² cents" is exceeded inside the schema limits. `extra_checks.mjs` BOUNDS gives:
  - `spending_cents` max 2.0009e12;
  - `income_net_cents` max 8.0038e12 (8 sources × 600,000/yr at q = 10%);
  - `C_R_cents` at r = 0 of 2.1938e13 (A = 18, R = 61, H = 60).

  All stay below 2^53−1, so the conclusion holds.
- **"At most 1 cent".** The claim holds against the displayed income group total, but not against the sum of the displayed per-source rows. With 8 sources of 1,100,004.4 exact, each row shows 1,100,004. The rows sum to 8,800,032, while `income_net_cents` is 8,800,035. The gap is 1,199,965, while spending minus the rows is 1,199,968: 3 cents apart.

**Fix direction:** State that per-source rows can differ from the total by up to about n/2 cents, and that the "computed before rounding" note covers the rows as well.

### P3-4: `infinity-literal.why.txt` names a validator-dependent keyword (owner: math)

**Location:** `contracts/examples/invalid/workshop-inputs/infinity-literal.why.txt` (`also_schema_keyword: type`).

**Reproduce:** Run `validate_schema.mjs`. It is the one FAIL line in `run.log`, and its exit code of 1 is intentional.

**Actual:**
- Under a lenient parse, Ajv 8.20.0 treats `Infinity` as `type: integer`. It rejects the document only through `maximum` (10,000,000 and 9,007,199,254,740,991).
- Python's `float('inf').is_integer()` is False, so jsonschema reports `type`.
- The document is rejected either way.

Also informative: under Ajv's default options this schema logs `strictTypes` warnings, for example a missing `"type": "object"` in the XF-07 `if` clause. With `strict: true` it throws. The proposed zod runtime is not affected.

**Fix direction:** Record "type (jsonschema) or maximum (Ajv)". Keep the explicit `Number.isFinite`/`isSafeInteger` runtime check already required by `workshop-inputs.md` §4.

### P3-5: two wording issues (owner: math)

- **§6 table, first row.** It says age-based starts of self and joint sources "become unresolvable" when `current_age` **or** `retirement_age` is unknown. Only an unknown current age does that. With R unknown and A known they resolve. No fixture pins this: CS02 has only an already-receiving source.
- **q_j.** It is not called nominal, although r is. The formula makes q_j nominal, since it compounds the nominal b_j. A participant with an inflation-indexed benefit must enter q_j = i, and WM04 relies on exactly that. Add "nominal annual increase; an amount indexed to inflation uses q_j = i" to §1 and to `workshop-inputs.md` §5.

## Technical notes on §14 questions (for G3; not professional approval)

1. **Carrying today-dollar income forward at i.** The math is internally consistent (WM04) and disclosed. Whether it suits QPP/CPP before the start is a professional question.
2. **The optional `end`.** It is sound as defined, exclusive and extending §9. It is under-tested and under-specified: see P2-1 and P2-2.
3. **Range limits.** No overflow is possible within them (see P3-3).
4. **`employment` in the uncertain-kind flag.** This is a policy question with no math impact.
5. **Default H and i.** The contract sets none, and I agree none should be set without a cited source and G3 approval.
6. **Month of birth.** This is a policy question. The one-year error is disclosed in §2.

## Rechecks

| What | Command (in `evidence/F02/a6-math-attempt1/`) | Result |
|---|---|---|
| Artifact hashes equal `validation.log` | `bash run_all.sh` (hash block) | identical |
| All 24 WM fixtures reproduced independently | `node run_fixtures.mjs` | 169 passed, 0 failed |
| Clip precedence, truth table, supplementary and media cases | `node clip_rules.mjs` | 262 passed, 0 failed |
| Schema: metaschema, valid and invalid examples, fixture inputs, sweeps | `node validate_schema.mjs` | 80 passed, 1 failed (P3-4) |
| Negative controls | `node negative_controls.mjs` | 17 of 24 caught; 7 missed (P2-1, P3-1) |
| §4 ambiguity | `node ambiguity_demo.mjs` | two readings: W07 vs W06 (P2-2) |
| Demos, bounds, rounding, forbidden outputs, 4,000 random inputs | `node extra_checks.mjs` | 24 passed, 0 failed |
| Reproducible from a fresh copy | `bash run_all.sh <copy>` | identical check lines |

## Not verified (out of F02 scope)

- No W02/W03 runtime exists yet, so browser behaviour was not tested: rendered UI, print/export, network capture (WK04), and the disclosure in the rendered clip states (WK06).
- UI copy against the forbidden-output list (§13) was not checked. No C02 copy exists yet.
- No G3 professional judgement on the model's assumptions is implied.
