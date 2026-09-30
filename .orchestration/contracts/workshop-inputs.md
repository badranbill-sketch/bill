# Workshop inputs contract, version 1.0

**Status: proposed.** A6 still has to review the math, and G3 (Bill plus the firm reviewer, blocker HB-26) still has to give professional approval. Nothing in this folder is approved. Any approval must name the sha256 hashes that are printed at the end of `.orchestration/evidence/F02/math/validation.log`.

- Task: F02, lane "workshop inputs, units and math". Author: A2 (contract author). Reviewer: A6.
- Machine contract: `workshop-inputs.schema.json`, JSON Schema draft 2020-12, `$id` `https://bill.contracts.local/workshop-inputs/1.0`.
- Related documents: `workshop-math.md` (what is computed from these inputs), `workshop-clip-rules.md` (which branch clip is chosen), `fixtures/workshop/` (worked cases with independently computed answers).
- Examples: `examples/valid/workshop-inputs/` (5 files) and `examples/invalid/workshop-inputs/` (27 files, each paired with a `.why.txt`).
- Sources: 01 §9 (the controlling specification), 05 §3 (clips W01–W04), 04 §1 and §3, acceptance checks WK01–WK03 and WK06, decisions D-014, D-040 and D-068, blocker HB-26.

## 1. What this object is, and the boundary it must never cross

This object holds a participant's answers to the four chapters while they work through the workshop. Under D-040, its authoritative record is **the visitor's private local workshop state**, and it lives only in the browser.

- It is kept in memory by default. Saving it on the device is optional, must be offered clearly, can be reversed, and needs an expiry plus a warning for shared devices. That design belongs to W01/W05; this contract does not define a storage key.
- It is **never serialized to anything outside the browser**. That rules out URLs, query strings, cookies, request bodies, analytics, error reports, logs, email, n8n, Brevo, Supabase, ad platforms and LLM prompts (D-014). The same ban covers anything derived from it: the gap, the flags, the completeness state and the selected clip (see `workshop-clip-rules.md` §8).
- `workshop.completed` is an optional operational event whose envelope is owned by the event contract lane. It carries none of these fields (04 §3).
- The schema has **no free-text field and no personal identifier**. Every string is an enum, a const or the pattern `^src-[0-9]{1,2}$`. Every object is closed with `additionalProperties: false`. As a result, an email address, name, employer or note has no place to go (see the invalid examples `extra-pii-email` and `pii-label-in-source`).

## 2. Names checked against the existing repository

The following files were read on `origin/codex/desktop-iphone-unified` at 66cce52. `origin/main` is identical for these files, except that `lib/features.ts` exists only on codex.

| Existing name (exists) | What it means for this contract |
|---|---|
| `lib/business.ts` `Language = "fr" \| "en"` | Wherever this contract refers to a locale (media availability), it uses exactly these two values. |
| `lib/routes.ts`: 9 page keys (`home` … `legal`) | None of them is a workshop route. Page keys and slugs belong to the routes and interfaces lane and are not defined here. |
| `lib/features.ts` `features.{fr,en}.journey` ("Le chemin vers la retraite") and `components/journey/*` | This is the homepage scroll story (the "ride"), not the Workshop Journey. To avoid a collision, code identifiers for this product use **`workshop`**, never `journey`. |
| `lib/fees.ts` `compareFees()` | It is the existing precedent for pure math: it throws `RangeError` outside its limits and computes in float64. The workshop must **not** copy the float approach, because float64 fails fixtures WM17 and WM24 (`workshop-math.md` §9). |
| `lib/checklist.ts`, `components/checklist.tsx` | The existing precedent for a feature that stays local and supports print. |
| `package.json` `"test": "node --import tsx --test tests/*.test.ts"` | That glob does not recurse into subfolders. The proposed `tests/workshop/math/*.test.ts` would therefore **not run** until the test script changes. `package.json` is a shared file, so A0 applies that patch (D-065). |
| `package.json` dependency `zod ^4.3.6` | The runtime validator is proposed to be written in zod and to mirror this schema, including XF-01 to XF-08 as refinements. |
| `content/approvals.json` (`{}`, keyed by article filename) and `scripts/verify-publication.ts` | These cover articles only. No existing guard ties a calculator or clip approval to a hash, so H00/G3 needs a mechanism (proposed, not built here). |
| `proxy.ts` matcher excludes `assets/` (D-060) | Labelled test media must not be placed under `public/assets/` on any hosted preview. |
| `lib/business.ts` flags `newsletterEnabled`, `analyticsEnabled` | The five-state flag model does not exist yet (TB-16). The capital-illustration flag below is only a proposed name. |

**Proposed. None of these exist today.** `lib/workshop/model/`, `tests/workshop/math/` (W00), `lib/workshop/state/`, `components/workshop/` (W01), `lib/workshop/clips/`, `components/workshop/media/` (W03). These paths come from the TASK_LEDGER deliverables. The feature flag name `workshop_capital_illustration` is also proposed and defaults to off. It is **not** in the sibling `feature-flags.json` 1.0, whose flag list is closed at six snake_case flags. Only A0 can add it, and doing so means a new version of that contract. Until then the capital illustration cannot be enabled at all. The optional local-save key is proposed by the sibling `privacy-boundary.md` (PB-FIN-3: `bill.workshop.v1`), not by this contract.

## 3. Document shape

```
{ contract: "workshop-inputs", contract_version: "1.0", currency: "CAD", base_year: 2026..2100,
  chapters: { life, income, savings, timing } }          // exactly these four, all required
```

`base_year` is the calendar year of the base date and defines year index `t = 0`. It is read from the device clock and shown to the participant ("figures use 2026 as year 0").

## 4. The quantity wrapper (every numeric field)

Every number is wrapped as `{ "status": ..., "value": ... }`.

| status | value | Meaning |
|---|---|---|
| `unknown` | **absent** (STATUS-1) | Not known, skipped or "not sure". It is never read as 0. |
| `zero` | exactly `0` | A stated zero. This is **the only way to record 0** (STATUS-2). |
| `estimated` | integer ≥ 1 (STATUS-3) | An approximate value. For assumptions (inflation, escalation, horizon, return) it means an explicit illustration assumption, chosen by the participant or shown to them as a default. |
| `confirmed` | integer ≥ 1 (STATUS-3) | Taken from a statement or document. It is not allowed for assumptions whose future value cannot be confirmed (inflation, horizon, return). |

Units are carried by the field, never by the value:

- Money is an **integer number of CAD cents**.
- Ages, year indices and the horizon are **whole years**.
- Rates are **integer basis points** (100 bp = 1%).

Each value must satisfy `Number.isSafeInteger` after parsing. JSON Schema treats `450000.0` as an integer, so the runtime must also require a safe integer after it parses the input.

Assumption fields (`inflation_bp`, `escalation_bp`, `planning_horizon_years`, `capital_illustration_return_bp`) **cannot be `unknown`**. An assumption is always explicit and visible.

## 5. Field reference

Money limits are in cents, with the dollar figure in brackets. Plain-language messages are English drafts. A5 writes the French and final English (C02), and G1/G3 approve them.

### Chapter 1: `life` ("What life do you want to fund?")

| Path | Statuses | Range | Meaning / symbol | Plain message (draft) |
|---|---|---|---|---|
| `spending.amount` | unknown, estimated, confirmed (**no zero**) | monthly 1–10,000,000 ($100,000); annual 1–120,000,000 ($1.2M) | Desired household spending; `m` (monthly) or `a` (annual) | "Spending can't be zero. If you don't know yet, choose 'I'm not sure'." / "This exercise accepts monthly spending up to $100,000." |
| `spending.period` | `monthly` \| `annual` | — | The input mode; D_0 = 12m or a | — |
| `spending.tax_basis` | const `after_tax` | — | Stated, not chosen | — |
| `spending.price_basis` | const `today_dollars` | — | Stated: base-year prices | — |
| `spending.unit` | const `household` | — | Spending is for the whole household | — |
| `lifestyle_focus` | optional enum (6 proposed keys) | — | One lifestyle choice. It stays local and has no effect on the math | — |

### Chapter 2: `income` ("What income is already planned?")

| Path | Values / range | Meaning / symbol |
|---|---|---|
| `coverage` | `all_known_sources_listed` \| `some_sources_may_be_missing` \| `no_planned_income` \| `not_answered` | Separates a **known zero** (`no_planned_income`) from **unknown** (`not_answered`, `some_sources_may_be_missing`). |
| `sources[]` | 0–8 items | Source j. |
| `.id` | `src-1` … `src-99` | Opaque local key. It is never a label. |
| `.kind` | `qpp_cpp`, `oas`, `workplace_pension`, `annuity`, `employment`, `rental`, `business`, `other` | Used for display and for the flag `uncertain_kind_labelled_scheduled`. |
| `.owner` | `self` \| `partner` \| `joint` | Whose age an age-based start or end refers to (`joint` uses self). |
| `.amount` | any status; monthly ≤ 5,000,000 ($50,000), annual ≤ 60,000,000 ($600,000) | The amount; annual amount = 12 × monthly amount. |
| `.period` | `monthly` \| `annual` | — |
| `.tax_basis` | `gross` \| `net` \| `unknown` (**required**) | Only `net` can be compared with after-tax spending. |
| `.price_basis` | `today_dollars` \| `start_year_dollars` \| `unknown` | Separates real from nominal amounts. Ignored when the income is already being received. |
| `.start` | `{reference: already_receiving}` or `{reference: age\|year_index, point: quantity}` | s_j. For an age, the point is 18–100 and must not be before the owner's current age (XF-04). For a year index, the point is 1–82. A point with status `unknown` means the start is unknown. An age start whose owner's age is unknown is unresolvable. Neither is ever read as "not paying" or "already receiving": `workshop-math.md` §4 and §6 set exactly which years become unknown. |
| `.end` | optional `{reference: age\|year_index, point}` | e_j, exclusive (the source pays for t < e_j). It must be after the start (XF-05). XF-05 can only be checked when both resolve (`workshop-math.md` §4 and §14, question 7). An unknown end is never read as "no end". **This extends the §9 formula** so that bridge benefits can be represented, and it is flagged for A6. |
| `.escalation_bp` | zero, estimated or confirmed; 0–1000 | q_j, the explicit **nominal** annual increase after the start. An amount indexed to inflation uses q_j = i (the same value as `inflation_bp`). It cannot be unknown. |
| `.dependability` | `scheduled` \| `uncertain` | There is deliberately **no `guaranteed` value**. Rent or business income labelled `scheduled` raises a warning. |

### Chapter 3: `savings` ("What have you built?")

Every field is optional. When a field is absent it was not entered, and the model treats it as unknown. Savings never enter the gap calculation.

| Path | Range | Meaning |
|---|---|---|
| `accounts.rrsp_rrif`, `.tfsa`, `.non_registered`, `.other`, `.not_sure` | 0 – 5,000,000,000 ($50M) each | Balances by tax category. `not_sure` holds an amount whose tax category is unknown. They are never summed across categories (the tax treatment differs). |
| `pension_value.amount` + `.also_entered_as_income` (`yes`\|`no`\|`not_sure`) | same | **Double-count guard.** It records a pension's lump-sum or commuted value, or a DC balance, and whether the same pension also appears as an income source. |
| `home_value.amount`, `business_value.amount` | same | Illiquid assets, kept separate. |
| `*.excluded_from_spendable` | const `true`, default `true` | Contract 1.0 has no disposal assumption, so only `true` is accepted. Adding a sale assumption requires contract 1.1 plus A6 and G3 review. |

### Chapter 4: `timing` ("When do the pieces change?")

| Path | Statuses | Range | Symbol / note |
|---|---|---|---|
| `current_age` | unknown, estimated, confirmed | 18–100 | A: the age used for calendar year t = 0 |
| `retirement_age` | unknown, estimated, confirmed | 30–100, and ≥ `current_age` (XF-01) | R. Someone already retired enters their current age (t_R = 0). |
| `household` (optional) | `partner_current_age`, `partner_retirement_age` | 18–100 and 30–100; partner R ≥ partner A (XF-02) | Ages only, no identity. Required when any source is partner-owned (XF-07). |
| `planning_horizon_years` | estimated only | 1–60, and R + H − 1 ≤ 120 (XF-03) | H: the **number of retirement years illustrated. It is an assumption, not a life-expectancy prediction.** |
| `inflation_bp` | zero, estimated | 0–1000 | i, the inflation scenario |
| `capital_illustration_return_bp` (optional) | zero, estimated | 0–1000 | r, the nominal **net** return. It is used only by the capital illustration, which is OFF (`workshop-math.md` §11). |

Income start milestones are the `start` of each chapter-2 source. Chapter 4 shows them but does not ask for them again, so each has a single source of truth.

## 6. Cross-field rules

The schema has two layers. Layer 1 is JSON Schema. Layer 2 holds the rules JSON Schema cannot express, and the runtime must still enforce them. Both layers reject the input with a plain message. Neither layer turns a bad value into a warning.

| ID | Rule | Layer | Example that must fail |
|---|---|---|---|
| XF-01 | `retirement_age` ≥ `current_age` | schema (70 enumerated if/then clauses, A = 31…100) | `retirement-before-current-age` |
| XF-02 | `partner_retirement_age` ≥ `partner_current_age` | schema (70 enumerated clauses) | `partner-retirement-before-partner-age` |
| XF-03 | R + H − 1 ≤ 120 | schema (enumerated for R = 62…100) | `horizon-beyond-age-120` |
| XF-04 | An age-based `start` is not before the owner's current age, when both are known | **semantic** | `start-age-already-passed` |
| XF-05 | When both resolve, the end index is greater than the start index | **semantic** | `end-before-start` |
| XF-06 | Source `id`s are unique | **semantic** | `duplicate-source-id` |
| XF-07 | A partner-owned source requires `timing.household` | schema (root `contains`) | `partner-source-without-household` |
| XF-08 | `coverage` agrees with the list: `all_known_sources_listed` ⇒ ≥ 1 source; `no_planned_income` / `not_answered` ⇒ 0 sources | schema | `coverage-none-with-sources` |

JSON Schema cannot compare two instance values. That is why XF-01 to XF-03 are written as generated clauses (`evidence/F02/math/build_schema.py`, reproducible with `--check`). A zod runtime writes them as ordinary `refine` calls. The reference semantic checker for XF-04 to XF-06 is `workshop_reference.semantic_errors()`.

## 7. Rejection and missing-data behaviour

- A nonfinite value (NaN, Infinity), a string where a number belongs, a fractional cent, a negative value, a value outside the stated range, an unknown status that carries a value, or an estimated status with no value: each **rejects the edit with plain feedback**. The previous valid state is kept. No invalid value ever reaches the model.
- A strict JSON parser rejects `NaN` and `Infinity`. If a lenient parser admits them, the schema still rejects them (`nan-literal`, `infinity-literal`). For `Infinity` the keywords depend on the validator: Python jsonschema 4.26 reports `type` and also `maximum` (twice, once for each maximum that applies), while Ajv 8 reads it as an integer and reports only `maximum`. That is why the runtime must also check `Number.isFinite` and `Number.isSafeInteger` explicitly (§4).
- Skipping is always allowed. Skipping writes `unknown`, never 0. What the model does with each unknown is set out in `workshop-math.md` §6.

## 8. Deliberately not in contract 1.0

These are not modelled, and each needs a new version plus review:

- one-time goals such as renovations or gifts (W04 may mention them only as a question);
- a home or business sale assumption;
- any tax calculation or gross-to-net conversion;
- employment income before retirement;
- separate spending per person;
- birthdays inside a year;
- any free-text note;
- uploads of any kind.

## 9. Conformance obligations for downstream tasks

These checks belong to downstream tasks; F02 does not run them.

- **W00/W01:** the runtime validator must accept all 5 valid examples and reject each of the 27 invalid examples for the rule named in its `.why.txt`. Where a rule belongs to a specific field, the rejection must be attributed to that field. It must also accept every `input` found in `fixtures/workshop/*.json`.
- **W04:** synthetic, distinctive values drawn from these fields must appear in no outbound request (WK04).
- A change to any field name, enum, range or rule creates a new contract version. Minor versions add optional fields; major versions change meaning. Changing any hashed artifact invalidates the G3 approval that names it (D-043).

## 10. Evidence

`.orchestration/evidence/F02/math/validation.log` records the exact commands and output: metaschema check, builder reproduction, the valid and invalid example results, fixture recomputation, negative controls and artifact sha256 hashes.
