# Workshop math contract, version 1.0

**Review status: proposed. A6 must review the math, and G3 (Bill plus the firm reviewer) must give professional approval.** This document is not approved and it contains no retirement advice. HB-26 is still open. Its proposal is to keep the capital illustration off for the pilot, with no safe-withdrawal rule and no readiness verdict. Any approval must name the sha256 of this file, of `workshop-inputs.schema.json` and of `fixtures/workshop/*.json`, as printed in `.orchestration/evidence/F02/math/validation.log` or in the later record that supersedes it for a file (README §4 CX-29). After A0 patch 1 the whole bundle is printed in `.orchestration/evidence/A0-patch-1/math-bundle.sha256.log`.

This document takes the inputs defined in `workshop-inputs.md` and defines exactly what is computed from them. It is educational, deterministic, annual and nominal, and it runs in the browser. The formulas implement 01 §9. Where this document goes beyond §9, the text says so: the optional `end` index, the price-basis conversion, per-year computability and today-dollar display values.

## 1. Notation and units

| Symbol | Definition | Unit | From |
|---|---|---|---|
| Y₀ | base year | calendar year | `base_year` |
| t | year index = calendar year − Y₀ | integer ≥ 0 | — |
| A, R | current age (the age used for t = 0), retirement age | years | `timing.current_age`, `timing.retirement_age` |
| t_R | R − A, the first retirement year index | integer ≥ 0 (XF-01) | derived |
| H | number of retirement years illustrated | years | `planning_horizon_years` |
| W | the illustration window {t_R, t_R+1, …, t_R+H−1} | set of indices | derived |
| i | inflation scenario = `inflation_bp` / 10,000 | per year | `inflation_bp` |
| a | annual spending in today's dollars: 12·m (monthly input) or the annual input | cents / year | `life.spending` |
| D_t | nominal desired spending in year t | cents | §3 |
| a_j | stated annual amount of source j (12 × monthly amount) | cents / year | `sources[j].amount`, `.period` |
| s_j, e_j | start index; end index (exclusive, ∞ if absent) | integer | §4 |
| q_j | **nominal** annual increase after the start = `escalation_bp` / 10,000. An amount indexed to inflation uses q_j = i | per year | `sources[j].escalation_bp` |
| b_j | nominal annual amount paid in year s_j | cents | §4 |
| P_j,t | nominal income from source j in year t | cents | §4 |
| G_t, S_t | gap and surplus in year t | cents | §5 |
| r | nominal **net** annual return (after fees), used only by the capital illustration | per year | `capital_illustration_return_bp` |
| C_R | capital illustration value at the start of year t_R | nominal cents | §11 |

Every growth factor (1 + x)ⁿ with x = bp / 10,000 is the exact rational (10,000 + bp)ⁿ / 10,000ⁿ.

## 2. Time conventions

These conventions are shown to the participant as assumptions.

1. **Year index.** `t = 0` is the **whole calendar year** Y₀ that contains the base date. t = 1 is Y₀ + 1, and so on. Year 0 is not prorated, so if t_R = 0 the whole base year is treated as a retirement year. This is an approximation.
2. **Ages.** The age in year t is A + t. A milestone at age N for owner o falls at index N − A_o, where A_o is the participant's age for `self` and `joint` sources and the partner's age for `partner` sources. Birthdays within the year are ignored, so a timing error of up to one year is possible and is disclosed.
3. **Retirement boundary.** Retirement starts at the beginning of year t_R = R − A. Only the H years of W are illustrated. Years before t_R are never shown as gaps, because employment income before retirement is not collected.
4. **Flow timing.** Every amount is an **annual total attributed to calendar year t**. The gap table compares totals for the same year and needs no assumption about timing within the year. Timing matters only for the capital illustration (§11), where each year's gap is treated as **one end-of-year amount** paid at the end of year t_R + k, which is k + 1 years after retirement starts.
5. **Price level.** Amounts for year t are priced at the year-t level, which is the base level × (1 + i)ᵗ. "Today's dollars" means base-year (t = 0) prices.

## 3. Spending path

  D_t = a · (1 + i)ᵗ,  where a = 12·m for monthly input and a = the annual input for annual input.

- D_t is **unknown for every t** when `spending.amount.status = unknown`.
- Spending is after-tax and household-level by definition (the fields are consts).
- Real value: D_t / (1 + i)ᵗ = a for every t, which WM02 checks.

## 4. Income path

For each source j:

- **Start s_j:**
  - `already_receiving` gives 0.
  - `year_index` gives the point value.
  - `age` gives point − A_o.
  - If the point's status is `unknown`, s_j is **unknown**.
  - If the point is known but A_o is unknown, s_j is **unresolvable**.
  - Below, a bound is **resolved** when it is neither unknown nor unresolvable. An absent end counts as resolved (e_j = ∞).
- **End e_j:** absent means ∞. Otherwise it is resolved like the start, with e_j > s_j when both resolve (XF-05). *This is an extension of §9 that lets bridge benefits and part-time work stop.* When s_j is unresolved, XF-05 cannot be checked, so an e_j ≤ 0 (for example, an end age that has already passed) is accepted. By rule 2 below, such a source pays in no year t ≥ 0 (question 7 in §14).
- **Base amount b_j** (the nominal amount in year s_j, defined only when s_j is resolved and the amount is known):
  - b_j = a_j when s_j = 0 or `price_basis = start_year_dollars`.
  - b_j = a_j · (1 + i)^{s_j} when `price_basis = today_dollars` and s_j > 0. *This is an extension of §9. Growth before the start is assumed to equal the inflation scenario, which is a stated simplification for A6 and G3 to review.*
  - b_j is **unknown** when `price_basis = unknown` and s_j > 0.
- **Payments:**

  P_j,t = b_j · (1 + q_j)^{t − s_j} for s_j ≤ t < e_j, and P_j,t = 0 otherwise.

- **Three-state payment test** `pays_j(t)`. The rules are evaluated **in this order, and the first rule that applies decides**:
  1. `no` when `amount.status = zero`, whatever the other fields say.
  2. `no` when e_j is resolved and t ≥ e_j. This needs only the end: the source has stopped, whatever its start.
  3. `no` when s_j is resolved and t < s_j. This needs only the start.
  4. `yes` when s_j is resolved and e_j is resolved or absent. Rules 2 and 3 did not apply, so s_j ≤ t < e_j.
  5. `unknown` otherwise. That covers two cases: s_j is unresolved and the end is absent, unresolved or later than t; or s_j is resolved, t ≥ s_j and e_j is unresolved.

  In short, **a `no` needs one resolved bound and a `yes` needs both.** Rules 2 and 3 cannot conflict, because both give `no`. The test uses only the definition of the payment interval. It does not use XF-05 to infer that a source is paying: for example, at t = s_j with an unknown end, the year is `unknown`, not `yes`.

  WM32 is the case that an unordered reading would leave open: the start is unknown and the end is at t_R. By rule 2, the source is a known 0 in every window year, the result is `complete`, and W07 is selected. The other reading ("unknown" before "t ≥ e_j") is not conformant. WM26, WM27, WM28, WM29 and WM33 pin the other branches.
- **Value.** When `pays_j(t) = no`, P_j,t is an exact 0. When it is `yes`, P_j,t is known exactly when the amount is known and b_j is known. When it is `unknown`, P_j,t is `null`.
- **Reason codes for (j, t).** When `pays_j(t) = no`, (j, t) carries **no code at all**, even if other fields of the source are unknown. Otherwise **every** code whose condition holds is attached. The codes are not alternatives, and none of them hides another (WM34):

  | Code | Condition (checked only when `pays_j(t)` is `yes` or `unknown`) |
  |---|---|
  | `start_unknown` | The start point has status `unknown`. |
  | `start_unresolvable` | Age start, point known, owner's age unknown. |
  | `end_unknown` | An end is present and its point has status `unknown`. |
  | `end_unresolvable` | Age end, point known, owner's age unknown. |
  | `amount_unknown` | `amount.status = unknown`. |
  | `price_basis_unknown` | `price_basis = unknown`, and s_j is not resolved to 0 (s_j > 0, or s_j unresolved). |
  | `gross` | `tax_basis = gross`. |
  | `tax_basis_unknown` | `tax_basis = unknown`. |

  P_j,t is `null` exactly when at least one of the first six codes is attached. The last two never make P_j,t unknown. They block the comparison in §5 instead.

## 5. Comparability, gap and surplus

**Year t ∈ W is *computed*** only when all four conditions hold:

1. D_t is known.
2. `coverage` ∈ {`all_known_sources_listed`, `no_planned_income`}.
3. P_j,t is known for every j.
4. Every source with P_j,t ≠ 0 has `tax_basis = net`.

A source that is not paying in year t contributes an exact 0, whose basis does not matter. That is why a gross or unknown source that starts later does not block the earlier years (WM08, WM22).

For a computed year:

  G_t = max(0, D_t − Σ_j P_j,t)  S_t = max(0, Σ_j P_j,t − D_t)

At most one of G_t and S_t is positive. The surplus is shown separately. There is **no negative "required savings"**, and surpluses are **never netted** against gaps in other years (WM12).

For any other year, G_t = S_t = `null`, and the year lists its reason codes. Equivalently, a window year is computed exactly when it carries no reason code (§4, §7). **An unknown is never zero.**

**Display groups.** Income for each year is also shown by basis: I^net_t, I^gross_t and I^unknown-basis_t (`income_net_cents`, `income_gross_cents` and `income_unknown_basis_cents`). The rules below are evaluated in order:

1. **Incomplete coverage.** When `coverage` is `not_answered` or `some_sources_may_be_missing`, the year's income is unknown, so **all three groups are `null` in every row**. This is the same treatment `spending_cents` gets when spending is unknown (WM25). In this case a group is never 0, and it never carries the subtotal of the listed sources, because an unlisted source could have any basis and any amount (WM07, WM30). The listed amounts stay visible in `income_by_source_cents`, each shown with its own basis. The interface must not add them into a total. Their heading carries the note "listed sources only" (proposed copy).
2. **Complete coverage.** When `coverage` is `all_known_sources_listed` or `no_planned_income`, each group is the sum over the sources of that basis with P_j,t ≠ 0. A group is `null` if any of its members is unknown. It is 0 only when it has no members. That 0 is a known zero, because every listed source of that basis is known not to pay in that year and the coverage answer says no source is missing (WM06, WM08).

The groups are shown side by side and are **never subtracted across bases** (WM09, WM23).

**Today-dollar display.** The display also shows G_t / (1 + i)ᵗ and S_t / (1 + i)ᵗ. They are computed from the exact G_t and S_t and deflated with the same i used for spending, so real and nominal amounts are never mixed. Because the flows are nominal, the nominal figures stay the primary ones.

## 6. How unknowns propagate

Every row names the fixture that pins it, including the years, the null values and the reason codes.

| Unknown input | Effect | Pinned by |
|---|---|---|
| `spending.amount` | D_t is `null` for every t. Every window row is `not_computable` with the reason `spending_unknown`, and its gap, surplus and `exact.spending` are `null`, never 0. Income rows are still shown with their exact values. State: `incomplete_unknown_spending`. | WM25 |
| `current_age` | No window and no rows. Reason `current_age_unknown`, plus `retirement_age_unknown` when R is also unknown (§7). State: `incomplete_unknown_timing`. Age-based starts and ends of self and joint sources are unresolvable (found by the T\* scan, §8). | WM20, CS01 |
| `retirement_age` (current age known) | No window and no rows. Reason `retirement_age_unknown`. State: `incomplete_unknown_timing`. Age-based starts and ends **still resolve** against A, so they add no code of their own. | WM31, CS02 |
| `partner_current_age` (household present) | Partner-owned age-based starts and ends are unresolvable. Rows carry no `partner_age`. The household predicate H is false (`workshop-clip-rules.md`). | WM28, WM29, CS05 |
| `coverage` = `not_answered` | Every window year is not computable, with the reason `income_not_answered`. The three income groups are `null` in every row, never 0 (§5 rule 1). Spending is still shown. | WM07 |
| `coverage` = `some_sources_may_be_missing` | Every window year is not computable, with the reason `income_list_partial`. The listed amounts are still shown per source in `income_by_source_cents`. The three income groups are `null` in every row, never the listed subtotal (§5 rule 1). | WM30, CS03 |
| A source's `amount` | P_j,t is `null` in the years the source pays (s_j ≤ t < e_j), and a known 0 in the other years. Earlier years remain computable. | WM08 |
| A source's start (point unknown, or an age start whose owner's age is unknown) | P_j,t is `null` for every t < e_j (every t when there is no end). It is a known 0 for t ≥ e_j (§4 rule 2). | WM26, WM29, WM32, WM33 |
| A source's end (point unknown, or an age end whose owner's age is unknown) | P_j,t is a known 0 for t < s_j and `null` for t ≥ s_j. | WM27, WM28 |
| `price_basis` of a source that starts after t = 0 | P_j,t is `null` in the years the source pays. | WM22 |
| `tax_basis` = `unknown` | The years in which the source pays, or may pay, are blocked (`tax_basis_unknown`). The amount is shown in the unknown-basis group. | WM23, CS04 |
| Several of these on one source | Every applicable code is listed (§4). | WM34 |
| Any savings field | No effect on any number. It is used by flags only. | WM10, WM11 |

It is forbidden to substitute 0, a default, an average or a "typical" value for any unknown. An unknown also never becomes "not paying", "already receiving" or "no end": only the rules in §4 decide those.

## 7. Completeness state

`completeness.state` is chosen by this fixed precedence, and `completeness.reasons` lists every code found:

1. `incomplete_unknown_timing`: there is no window (A or R unknown).
2. `incomplete_unknown_spending`: spending is unknown.
3. `incomplete_unknown_income`: coverage is incomplete, or some window year has a code among `amount_unknown`, `start_unknown`, `start_unresolvable`, `end_unknown`, `end_unresolvable` or `price_basis_unknown`.
4. `basis_mismatch`: some window year is blocked by `gross`.
5. `basis_unknown`: some window year is blocked by `tax_basis_unknown`.
6. `complete`: every year of W is computed.

Reason codes are either global (`current_age_unknown`, `retirement_age_unknown`, `spending_unknown`, `income_not_answered`, `income_list_partial`) or tied to a source as `<code>:<source id>`. Source ids are opaque local keys, and reasons never leave the browser.

`completeness.reasons` is the union of the global codes, the codes of every window row, and the source-tied codes found by the T\* scan (§8). When the window is unknown, the scan is the only source of source-tied codes (WM20, WM31). Every code array is sorted (§12).

Each global code is listed whenever its own condition holds, independently of the other global codes and of whether there is a window. So when A and R are both unknown, both `current_age_unknown` and `retirement_age_unknown` are listed, and `spending_unknown`, `income_not_answered` and `income_list_partial` are listed even when there is no window.

## 8. Warnings and flags

Flags are informational. They never alter a number.

**The scan set T\*.** T\* is W when the window is known. When the window is unknown, T\* is every t ≥ 0. Because every change point is ≤ 82, the range t = 0…83 is equivalent to every t ≥ 0.

| Flag | Condition | Meaning shown to the participant (direction; the copy comes from C02) |
|---|---|---|
| `gross_net_mismatch` | Some (j, t ∈ T\*) has code `gross` | Before-tax income can't be compared with after-tax spending, so no gap is shown for those years. |
| `tax_basis_unknown` | Some (j, t ∈ T\*) has code `tax_basis_unknown` | We don't know whether this amount is before or after tax. |
| `incomplete_income` | Predicate M (`workshop-clip-rules.md` §3) | Some income is unknown, so those years are incomplete. They are not zero. |
| `housing_only_wealth` | Home or business value is positive and known, **and** no accessible account category has a positive known value | The only wealth entered is your home or business, which this exercise does not treat as spendable. |
| `pension_double_count_risk` | `pension_value.amount` is positive and known, and `also_entered_as_income` ∈ {yes, not_sure} | A pension should count once, either as income or as an asset, not both. |
| `uncertain_kind_labelled_scheduled` | A source has `kind` ∈ {rental, business} and `dependability = scheduled` | Rent and business income can vary. It is shown as entered and never as guaranteed. |
| `horizon_shorter_than_timeline` | The window is known and either some source whose `amount.status` is not `zero` (an unknown amount counts) has a resolved s_j ≥ t_R + H, or the partner's retirement index is ≥ t_R + H | Something you entered falls after the years illustrated. |
| `household_timing_differs` | Predicate H | You and your partner retire in different years. |
| `includes_uncertain_income` | An `uncertain` source may pay in T\* (`pays_j(t)` is `yes` or `unknown`, §4) | Included as entered and labelled uncertain. |

Flag names, completeness states and reason codes are identifiers inside the browser only. They are covered by the D-014 boundary.

## 9. Rounding and arithmetic

- **Arithmetic.** Arithmetic must be exact. The normative choice is BigInt numerator and denominator pairs. D_t, P_j,t, G_t and S_t are finite decimals with denominator 10^{4t}. C_R and the deflated values are general rationals. The fixtures give exact values in `expected.years[].exact` (decimal strings) and `C_R_exact` (decimal or `p/q`).
- **Rounding.** Rounding happens **only for display**. It is round half to even (banker's rounding), to whole cents, applied **once**, to the **exact** value. Sums and differences are formed from exact values before rounding.
- **Display gaps between rounded figures.** As a result, rounded figures need not add up:
  - Against the displayed income group total I^net_t, the displayed G_t or S_t differs from the difference between the displayed D_t and the displayed I^net_t by **at most 1 cent**. There are three roundings of at most half a cent each, and the difference is a whole number of cents. WM17 shows this: S₁ = 101, while the displayed P − D is 102.
  - Against the **sum of the displayed per-source rows**, the difference can reach ⌊(n + 2)/2⌋ cents, where n is the number of sources with P_j,t ≠ 0 in that year (n + 2 roundings). For example, 8 sources of exactly 1,100,004.4 each show 1,100,004, so the rows sum to 8,800,032 while the total is 8,800,035.
  - The interface must not "correct" either difference. The table carries the note "totals are computed before rounding" (proposed copy), and the note covers the per-source rows as well.
- **Coarser display.** Rounding to whole dollars, for example, is applied half-even to the exact value. Rounding an already-rounded figure (double rounding) is forbidden.
- **Float64 is not conformant.**
  - WM17: JavaScript `Math.round(1010050.5) = 1010051`, but half-even gives 1010050.
  - WM24: 1,000,800 × 1.025 × 1.025 evaluates to 1051465.4999999998 in IEEE doubles, while the exact value is 1,051,465.5, which rounds to 1,051,466.
  - Both results were recorded in the evidence log.
- **Bounds.** Within the input limits, t ≤ R − A + H − 1 ≤ 120 − 18 = 102 (XF-03), every rate is at most 10%, and there are at most 8 sources. The largest rounded outputs, computed exactly in `compute_fixtures.py` and recorded in the evidence log, are:
  - D_t: 2,000,944,911,742 cents (120,000,000 × 1.1¹⁰²);
  - one P_j,t: 1,000,472,455,871 cents (60,000,000 × 1.1¹⁰², a today-dollar source with q_j = i = 10%);
  - an income group total: 8,003,779,646,969 cents (8 such sources);
  - C_R at r = 0: 21,938,105,946,171 cents (the sum of D_t for t = 43…102, that is A = 18, R = 61, H = 60).

  C_R with r > 0 and every deflated value are smaller. All of them are below 2⁵³ − 1 = 9,007,199,254,740,991, so final cents fit in a JS number. Intermediate numerators and denominators must stay BigInt.
- **Currency display.** Formatting as fr-CA ("1 234,56 $") or en-CA ("$1,234.56") belongs to the UI and does not change any value.

## 10. Fixtures and tolerance policy

`fixtures/workshop/` contains:

- 40 math fixtures (WM01–WM40). Each has `input` (valid against the schema and the semantic rules), `expected` (the full output record in §12) and `independent_checks`. WM37–WM40 were added by F02a (D-072) under README §3 rule 6; no formula or rule changed.
- `clip-rules.json`.
- `index.json`.

Two paths produce every expected value:

1. the exact-rational reference model `evidence/F02/math/workshop_reference.py`;
2. independent hand arithmetic or closed forms in `evidence/F02/math/compute_fixtures.py` (the geometric series, the level annuity g[1 − (1+r)^−H]/r, the growing annuity a(1+i)^{t_R}[1 − ((1+i)/(1+r))^H]/(r − i), hand powers, and code sets written out by hand from §4).

WM37–WM40 come from `evidence/F02a/compute_f02a_fixtures.py`, which uses the same two paths: the reference model above, and hand arithmetic from §2–§5 and §9.

A fixture is written only if both paths agree. Negative controls in `evidence/F02/math/validate.py` inject each of the following faults into the reference model, and each one is caught by the fixture written for it:

- half-up rounding (WM17) and float64 factors (WM24);
- unanswered income treated as zero (WM07), and a partial source list read as complete (WM30);
- unanswered income shown as 0 in the income groups, or a partial list's subtotal shown as the year's income there, while the gap stays null (WM07, WM30);
- unknown spending read as 0 in the rows (WM25);
- an unknown start read as "not paying" or as "already receiving" (WM26, WM33);
- an unresolvable start read as "not paying" while the window is known (WM29);
- an unknown or unresolvable end read as "no end" (WM27, WM28);
- the "unknown first" reading of §4 (WM32, WM33), and one code per source instead of every applicable code (WM34);
- an unknown retirement age treated as blocking age-based starts (WM31);
- gross income subtracted (WM09), and a today-dollar amount treated as nominal (WM04);
- the home counted as spendable (WM10);
- the wrong clip precedence (WM08, WM21);
- netted surpluses (WM12);
- C_R discounted to t = 0 instead of the start of t_R (WM35), and C_R = 0 treated as display-eligible (WM36).

F02a's negative controls run in `evidence/F02a/mutation_check.py`, not in the lane `validate.py`. They inject each of the following faults into the same reference model. Each fault is caught by the fixture written for it, and WM01–WM36 alone miss it:

- a today-dollar amount grown before its start at q_j instead of i, or indexed at i after its start (WM37);
- a `joint` source's age-based start or end resolved against the partner's age (WM38);
- an income group summed from the rounded per-source rows (WM39, and WM37);
- a today-dollar value deflated from the rounded gap instead of the exact gap (WM40).

A6 reproduced these results with its own model (`evidence/F02a/a6-attempt3/`).

**Tolerance: none.** Rounded cents must match exactly, and exact strings must match character for character. A runtime that cannot reproduce every fixture is not conformant (W00).

| Fixture | Covers | Case |
|---|---|---|
| WM01 | WK02 | i = 0, q = 0; the gap is constant |
| WM02 | WK02 | geometric growth, closed form, deflated gap constant |
| WM03 | WK02 | later income start (boundary t = s_j) |
| WM04 | WK02 | today's dollars vs start-year dollars (real/nominal) |
| WM05 | WK01 | monthly→annual conversion; the monthly and annual versions give identical results |
| WM06 / WM07 | WK01, WK03 | declared zero income vs income not answered: gap and income groups null, never 0 |
| WM08 | WK01, WK06 | unknown amount starting later: early years exact, M outranks F |
| WM09 | WK03 | gross vs after-tax: no gap, warning, W08 |
| WM10 | WK03 | housing-only wealth |
| WM11 | WK03 | pension double count; capital illustration display-ineligible |
| WM12 | WK02, WK03 | surplus years, then gap years; surplus not netted |
| WM13 | WK02 | retirement boundary t_R = R − A; pre-retirement start |
| WM14 / WM15 / WM16 | WK02 | capital illustration with r = 0, growing annuity, level annuity (feature OFF) |
| WM17 / WM24 | WK01, WK02 | half-even ties (down, up); a float64 trap |
| WM18 | WK02, WK03 | source end index; source beyond the horizon |
| WM19 | WK03 | rent labelled scheduled; uncertain business income |
| WM20 | WK01, WK06 | current age unknown: no window |
| WM21 | WK02, WK06 | partner timing; partner-owned start |
| WM22 | WK01, WK02 | price basis unknown for a future source |
| WM23 | WK03, WK06 | tax basis unknown |
| WM25 | WK01, WK03 | spending unknown with a known window: rows null, income still shown |
| WM26 | WK01, WK06 | start point unknown: null in every year, never "not paying" or "already receiving" |
| WM27 | WK01, WK02 | end point unknown: known 0 before the start, null from the start |
| WM28 | WK01, WK02 | partner-owned end age with the partner's age unknown (`end_unresolvable`) |
| WM29 | WK01, WK06 | partner-owned start age with the partner's age unknown, window known (`start_unresolvable`) |
| WM30 | WK01, WK03 | partial source list (`income_list_partial`): listed amounts per source, income groups null |
| WM31 | WK01, WK06 | retirement age unknown: no window, age starts still resolve (`retirement_age_unknown`) |
| WM32 | WK02, WK06 | unknown start, known end at t_R: §4 rule 2 decides, complete, W07 |
| WM33 | WK01, WK02 | unknown start, known end inside the window: null before the end, 0 after |
| WM34 | WK01, WK03 | several unknowns on one source: every applicable code |
| WM35 | WK02 | capital illustration with t_R = 4 > 0: valued at the start of t_R (feature OFF) |
| WM36 | WK02, WK03 | capital illustration, all surplus: C_R = 0, `no_positive_gap` (feature OFF) |
| WM37 | WK02 | today-dollar amounts carried to their start at i, then escalated at their own q_j (F02-MATH3-P2-1) |
| WM38 | WK02 | a `joint` source's age-based start and end resolve against the participant's age, never the partner's (F02-MATH3-P2-2) |
| WM39 | WK01, WK02 | income group total rounded once from exact values, not summed from rounded rows (F02-MATH3-P3-1) |
| WM40 | WK01, WK02 | today-dollar gap deflated from the exact gap, not from the rounded gap (F02-MATH3-P3-1) |

## 11. Capital illustration: documented, feature flag OFF by default

  C_R = Σ_{k=0}^{H−1} G_{t_R+k} / (1 + r)^{k+1}

**What it means.** C_R is the nominal amount at the **start of year t_R** (not at t = 0; `valued_at` records the date, WM35) that would pay each projected gap at the **end** of its year for H years, and nothing afterwards, if it earned exactly r every year with no volatility. It is in the nominal dollars of that date, not today's dollars. Valuing the flows at the start of each year instead would multiply it by (1 + r); that alternative is not used. **It is not a savings target, it does not test sufficiency, and it is never compared with any balance.** r is nominal and G is nominal. Applying r to today-dollar values, or a real rate to nominal gaps, is forbidden.

**When it can be computed.** The state must be `complete` and r must be present.

**When it could be displayed if the flag were on.** It must also meet two further conditions:

- none of `gross_net_mismatch`, `tax_basis_unknown`, `incomplete_income` or `pension_double_count_risk` is raised;
- at least one G_t is greater than 0.

A C_R of 0 is never displayed, because it would read as "you have enough". Its `ineligible_reasons` then contain the code `no_positive_gap` (WM36).

**Feature flag.** The proposed name is `workshop_capital_illustration`, and it is **OFF** by default and for the pilot. It does not exist yet: the sibling `feature-flags.json` 1.0 has a closed list of six flags, so adding this one means A0 publishes a new version of that contract. All of the following must be recorded and tied to hashes before it can be switched on. An agent cannot switch it on.

1. An A6 math review report that accepts this section and fixtures WM11, WM12, WM14–WM16, WM35 and WM36 at their exact hashes.
2. G3 approval by Bill and the firm reviewer (HB-26) of this document's hash **and** of the exact interface copy and chart design.
3. A five-state flag record (code_ready, approved, enabled) under D-035, set by a human at G6.
4. W02 reproduces the fixtures exactly, and A6 verifies the display rules in the rendered UI.

**Display rules if it is ever enabled** (proposed; subject to G3):

- Show the year-by-year gap stream first.
- Show C_R only as a labelled range across at least three return assumptions (r − 1%, r, r + 1%, each kept within 0–10%), never as a single target.
- Never place it next to RRSP/RRIF, TFSA, non-registered, pension or home values.
- Never use words of success or failure.
- Always show the exclusions.

**Exclusions** (always stated):

- income tax on withdrawals and on returns (r is net of fees only; tax is not modelled);
- market volatility and the sequence of returns;
- longevity beyond H;
- expenses that were not entered, and one-time goals;
- reinvestment of surpluses;
- variation in inflation;
- changes to government benefits or clawbacks;
- a partner's employment income;
- any sale of a home or business.

In the pilot, `expected.capital_illustration` is always `{feature_flag: "off", displayed: false, state: "disabled_by_flag"}`. The fixtures carry `reference_if_enabled` for verification only.

## 12. Output record

These field names are normative for the fixtures and for W02/W03.

```
contract_version, assumptions_echo{base_year, inflation_bp, planning_horizon_years, capital_illustration_return_bp, year_index, rounding},
window{t_R, first_t, last_t, first_calendar_year, last_calendar_year, first_age, last_age} | null,
completeness{state, reasons[]},
years[]{t, calendar_year, age, partner_age?, spending_cents, income_by_source_cents{src-id: cents|null},
        income_net_cents, income_gross_cents, income_unknown_basis_cents, status: computed|not_computable,
        reasons[], gap_cents, surplus_cents, gap_today_dollars_cents, surplus_today_dollars_cents,
        exact{spending, income_compared?, gap?, surplus?}},
flags[], savings_summary{accessible_categories_with_positive_value[], home_or_business_positive_value,
        excluded_from_spendable[], pension_value_kept_separate, totals_computed: false},
capital_illustration{feature_flag, displayed, state, reference_if_enabled{...}},
clip{predicates{C,M,X,H,F}, selected, selection_reason}
```

All amounts are integer cents after half-even rounding, or `null`. Savings are never totalled across tax categories (`totals_computed: false`).

**Serialization conventions.** These are normative, because the tolerance in §10 is an exact match:

1. **Code arrays.** `completeness.reasons`, `years[].reasons`, `flags`, `reference_if_enabled.not_computable_reasons` and `reference_if_enabled.ineligible_reasons` have no duplicates. They are sorted in ascending code-point order of the whole string, which is what Python `sorted()` and the JavaScript default `Array.prototype.sort()` give for these ASCII codes. For example, WM20 gives `["current_age_unknown", "gross:src-1", "start_unresolvable:src-1"]`.
2. **Objects.** Key order is not significant. `income_by_source_cents` has one key for every source, and a zero-status source shows 0. `income_net_cents`, `income_gross_cents` and `income_unknown_basis_cents` follow §5: all three are `null` in every row when `coverage` is `not_answered` or `some_sources_may_be_missing` (WM07, WM30). Otherwise a group is `null` when a member is unknown, and 0 only when it has no member.
3. **`partner_age`.** It is present in every row when `timing.household` is present and `partner_current_age` is known. Otherwise the key is absent, not `null` (WM28).
4. **`exact`.** `exact.spending` is always present, and it is `null` when D_t is unknown (WM25). `exact.income_compared`, `exact.gap` and `exact.surplus` are present only in computed rows.
5. **Exact strings.** A finite decimal uses the shortest plain form: no exponent, no trailing zeros, no trailing point, and `"0"` for zero. Any other rational is written `p/q` in lowest terms. No negative value occurs.
6. **`window` and `years`.** `window` is `null` exactly when the state is `incomplete_unknown_timing`, and then `years` is `[]`.
7. **Savings summary.**
   - `accessible_categories_with_positive_value` uses the fixed order `rrsp_rrif`, `tfsa`, `non_registered`, `other`, `not_sure`. It lists a category only when its value is known and greater than 0; a zero, unknown or absent category is omitted.
   - `home_or_business_positive_value` is true when either amount is known and greater than 0.
   - `excluded_from_spendable` lists `home_value` and then `business_value`, each when the field is present, whatever its amount status.
   - `pension_value_kept_separate` is true when `pension_value` is present, whatever its amount status.
8. **Capital illustration reference.**
   - When it is not computable, `not_computable_reasons` is a subset of {`return_assumption_absent`, `state_not_complete`}. `ineligible_reasons` repeats that list and adds no flag. `C_R_cents`, `C_R_exact` and `valued_at` are `null`.
   - When it is computable, `not_computable_reasons` is `[]`. `ineligible_reasons` is the sorted union of the raised blocking flags (§11) and `no_positive_gap` when no G_t > 0. `reference_if_enabled.display_eligible_if_enabled` is true exactly when that list is empty. `valued_at` is `{t: t_R, calendar_year, point: "start_of_year"}`.
   - `flow_timing` is always `"end_of_year"`.

## 13. Forbidden outputs

A6 checks for these in the UI, copy, export and print (WK03, WK07). None of them may appear:

- a readiness verdict of any kind: "you can retire", "you can't retire", "on track", "you'll be fine", a readiness score or percentage, or a traffic light;
- a depletion alarm: "you will run out of money at age X" or "your money lasts until …";
- a recommendation of an optimal account, withdrawal order or product, or a safe-withdrawal-rate rule (for example "4%");
- Monte Carlo output, a probability of success, or percentile bands that claim precision;
- any comparison of a gap or C_R with RRSP/RRIF/TFSA/pension/home balances that declares a surplus or shortfall;
- a negative "required savings", or surpluses netted against gaps;
- an undiscounted multi-year nominal total presented as "what you need" (it mixes price levels);
- a home or business treated as spendable;
- a gross-to-net or tax estimate;
- a life-expectancy prediction; H is an assumption;
- "Bill reviewed your answers", or any framing of the result as personalized advice;
- a computable figure hidden or withheld in order to push a booking.

## 14. Questions for A6 and the professional reviewers (G3)

1. Is it acceptable to carry today-dollar income forward to its start at i (§4)? For example, QPP amounts before the start follow wage-based rules rather than CPI.
2. Should the optional `end` index (an extension of §9) remain?
3. Are the proposed range limits acceptable? They exist to prevent typos and overflow, not to judge anyone: spending up to $100,000 a month, income up to $50,000 a month, balances up to $50M, rates of 0–10%, H of 1–60, last age ≤ 120.
4. Should `employment` join `rental` and `business` in `uncertain_kind_labelled_scheduled`?
5. What default H and default i should the UI show? The contract deliberately sets none. Any default needs a cited source and G3 approval. For example, a central-bank inflation target is a policy target, not a forecast.
6. Birthdays are ignored (up to one year of error). Should the tool ask for the month of birth? It is currently not collected, which keeps the data minimal.
7. When a source's start is unknown, XF-05 cannot be checked, so an end at or before t = 0 (for example, an end age that has already passed) is accepted, and the source then pays in no year (§4 rule 2). Should W01 reject such an end in the interface? That would be a UI rule, and it would not change the math.
8. The payment test does not use XF-05 to infer that a source is paying (§4). For example, with a known start and an unknown end, the start year itself is `unknown` although XF-05 implies the source pays then. This withholds a few years that could in principle be computed. It is conservative, it is disclosed, and it never produces a false number. Is that acceptable?

## 15. Revision notes (pre-approval, contract still 1.0)

### A0 patch 1 (F02a integration, D-072, D-074; editorial)

- No formula, rule, field, state, flag, clip or existing fixture changed, and this contract stays 1.0. The patch only records the four fixtures that F02a added under README §3 rule 6.
- §10: the fixture count and range (40, WM01–WM40), the WM37–WM40 rows, and F02a's negative controls with where they run.
- Header: where the approval hash list is printed. The approval rule itself is unchanged.
- The repair-3 note below that P3-1 is open is historical: WM39 and WM40 now pin both display-rounding faults.
- This file's hash changed, so the change needs a `validate.py` run and an A6 look (README §3 rule 6). Any approval bound to the old hash is void.

### Repair 3 (after `reviews/F02-math-attempt2.md`)

No field, enum or range of `workshop-inputs.schema.json` changed, and no output field was added or removed.

- **F02-MATH2-P2-1.** The earlier §5 made a group 0 whenever it had no members. That forced every conformant runtime to show 0 income by basis for a participant who skipped the income chapter (WM07), which looked identical to a declared zero (WM06). It also filled `income_net_cents` with the listed subtotal when the list was partial (WM30). The new rule 1 of §5 makes all three groups `null` whenever `coverage` is `not_answered` or `some_sources_may_be_missing`. The per-source rows still carry the listed amounts.
  - Updated in the §6 rows for `coverage`, in the §10 list of negative controls and in §12 item 2.
  - Fixture changes:
    - WM07 and WM30: `expected` and `purpose` changed, with the groups now `null` in every row, and `independent_checks` added.
    - WM06: only `independent_checks` changed, adding a check that its groups are 0/0/0.
    - Every other fixture, `clip-rules.json` and `index.json` regenerate byte for byte.
  - The reference model has a new fault hook, `incomplete_coverage_groups_as_listed`, which reproduces the old reading. WM07 and WM30 catch it (`validate.py` §6).
- **P3-2 (wording only).** §7 now states that every global code is listed on its own condition, with or without a window. §6 names `retirement_age_unknown` alongside `current_age_unknown`. §8 says that an unknown amount counts for `horizon_shorter_than_timeline`. These match what the reference model and the fixtures already did, so no number, state, flag or clip changed. No fixture was added to pin these three readings.
- **P3-3 (wording only).** `workshop-inputs.md` §7 and `infinity-literal.why.txt` now say that Python jsonschema 4.26 reports `type` and also `maximum`, while Ajv 8 reports only `maximum`.
- **P3-1 is not addressed in this repair.** Two display-rounding faults are still not caught by any fixture: a group total summed from rounded per-source rows, and a today-dollar value deflated from a rounded gap. §5 and §9 already forbid both, and the gap itself is protected by WM17. Pinning them needs a new fixture, and a new fixture would change the WM01–WM36 set that `README.md` row 14 names. That row belongs to another lane, so the decision is left to A0 and A6.

### Repair 2 (after `reviews/F02-math.md`)

Repair 2 of F02 changed the following after the A6 math review `reviews/F02-math.md`. No field, enum or range of `workshop-inputs.schema.json` changed. All 24 earlier fixtures regenerate byte for byte.

- **F02-MATH-P2-2.** §4 now evaluates the payment test in a fixed order: a `no` needs one resolved bound and a `yes` needs both. It also specifies the complete reason-code set for (j, t). WM32, WM33 and WM34 pin these rules.
- **F02-MATH-P2-1.** §6 names a pinning fixture for every unknown path. New fixtures WM25–WM31 pin spending, start, end, unresolvable start and end, partial list and retirement age. The negative controls now include each unknown-read-as-zero fault that the review found missed.
- **P3-1.** New fixtures WM35 (t_R > 0) and WM36 (all surplus, `no_positive_gap`) are added to §11 condition 1.
- **P3-2.** §12 now states the serialization conventions. `ineligible_reasons` is fully sorted; no earlier fixture changed as a result.
- **P3-3.** §9 gives the exact bounds and the rounding difference against per-source rows.
- **P3-4.** `infinity-literal.why.txt` records that the schema keyword depends on the validator.
- **P3-5.** §6 now separates an unknown current age from an unknown retirement age (WM31). q_j is stated to be nominal, with q_j = i for an inflation-indexed amount.
- **A6D-02 (design review, clip-rules sentence).** `workshop-clip-rules.md` §8 no longer offers a path-free first-party origin as an alternative. The branch-clip request pattern must not depend on the selection, and `privacy-boundary.md` PB-MEDIA-4 controls.
