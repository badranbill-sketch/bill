# Workshop clip selection rules, version 1.0

**Review status: proposed, pending A6 review and professional review (G3, HB-26).** The disclosure wording below is a draft. A5 owns the final copy through C02, and G1/G3 approve it. **No clip has been recorded yet:** there are 0 Bill recordings (inventory §4; HB-19). Every selectable clip is therefore `unavailable` today.

- Sources: 01 §9 "Ending and clip selection", 05 §3 (W00–W11), acceptance WK06, decisions D-014 and D-016, and W03's acceptance text in the TASK_LEDGER.
- Fixtures: `fixtures/workshop/clip-rules.json`. It holds the full 32-row truth table, 7 supplementary cases and 6 media-state cases. It is checked by `evidence/F02/math/validate.py`.

## 1. Which clips are selected

| Clip | Role | Selected by rule? |
|---|---|---|
| W00 Welcome, W01–W04 chapters, W05 Read the summary | Fixed by position in the journey | No |
| W06 Missing income, W07 Funding gap, W08 Tax basis, W09 Household timing, W10 Neutral / uncertain | Branch explanation at the ending | **Exactly one**, chosen by the rules below |
| W11 Invitation (15 minutes, one question, no charge; D-002) | Fixed and optional. Never a condition for seeing the summary (D-005) | No |

Selection is a pure function of the browser-local math result (`workshop-math.md` §12). It never depends on media availability, locale, time, randomness, prior sessions or anything received over the network. The same answers always select the same clip.

## 2. Predicates

The predicates are defined on the contract fields and on the model output. Here W is the window and T\* is the scan set from `workshop-math.md` §8.

| Predicate | Definition | Meaning |
|---|---|---|
| **C**: core inputs missing | The window is unknown (`current_age` or `retirement_age` unknown) **or** `life.spending.amount.status = unknown` | No year can be projected. |
| **M**: missing income | `income.coverage` ∉ {`all_known_sources_listed`, `no_planned_income`}, **or** some (j, t ∈ T\*) carries a code among `amount_unknown`, `start_unknown`, `start_unresolvable`, `end_unknown`, `end_unresolvable`, `price_basis_unknown` | An income estimate is missing, or cannot be placed in time or in price terms. |
| **X**: tax basis | Some (j, t ∈ T\*) carries `gross` or `tax_basis_unknown` | Income cannot be treated as spendable dollars without further work. |
| **H**: household timing | `timing.household` is present, all four ages (A, R, partner A′, partner R′) are known, and R′ − A′ ≠ R − A | You and your partner reach retirement in different calendar years. |
| **F**: funding gap | W is known and some computed year t ∈ W has G_t > 0 | The entered figures show a gap in at least one year. |

Codes are attached to (j, t) by `workshop-math.md` §4. A year in which a source is known not to pay carries no code, so an unknown start does not make M true through the years at or after a known end (WM32, selected W07). The same unknown start does make M true through the years before that end (WM33, selected W06).

`status = estimated` does **not** make M true on its own. Nearly every amount before retirement is an estimate. The summary always labels estimated and confirmed values, and W06 is reserved for inputs that are missing or cannot be placed.

## 3. Strict precedence

The first predicate in this list that is true selects the clip:

1. **C → W10**, reason `core_inputs_missing`
2. **M → W06**, reason `missing_income`
3. **X → W08**, reason `tax_basis`
4. **H → W09**, reason `household_timing`
5. **F → W07**, reason `funding_gap`
6. None of the above → **W10**, reason `neutral_fallback`

Why this order:

- **Missing inputs come before any projection (01 §9).** C, M and X each describe missing or ambiguous data, so they all rank above F.
- **C comes before M.** When spending or timing is unknown, the more basic question is the one to raise first.
- **M comes before X.** An unknown amount is more basic than the unknown basis of a known amount.
- **H comes before F.** The model does not collect the partner's employment income. When the retirement dates differ, the early-year gap may be overstated, so the coordination question comes first.
- **W10 serves as both the first and the last rule.** Its content, "insufficient or ambiguous information; no confident recommendation; a useful next question", fits both cases, and `selection_reason` tells them apart.

Only one branch clip plays. Any other predicates that are true are still visible in the summary as flags (`workshop-math.md` §8), so no computable information is hidden.

## 4. Full overlap truth table

The table is generated from `clip-rules.json`. There are 24 possible rows, and each has a validated input fixture whose computed predicates equal the intended ones. The other 8 rows are impossible because C excludes F: F needs a computed year, and C prevents every year from being computed.

| Row | C | M | X | H | F | Possible | Selected | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 0 | 0 | yes | W10 | neutral_fallback |
| 2 | 0 | 0 | 0 | 0 | 1 | yes | W07 | funding_gap |
| 3 | 0 | 0 | 0 | 1 | 0 | yes | W09 | household_timing |
| 4 | 0 | 0 | 0 | 1 | 1 | yes | W09 | household_timing |
| 5 | 0 | 0 | 1 | 0 | 0 | yes | W08 | tax_basis |
| 6 | 0 | 0 | 1 | 0 | 1 | yes | W08 | tax_basis |
| 7 | 0 | 0 | 1 | 1 | 0 | yes | W08 | tax_basis |
| 8 | 0 | 0 | 1 | 1 | 1 | yes | W08 | tax_basis |
| 9 | 0 | 1 | 0 | 0 | 0 | yes | W06 | missing_income |
| 10 | 0 | 1 | 0 | 0 | 1 | yes | W06 | missing_income |
| 11 | 0 | 1 | 0 | 1 | 0 | yes | W06 | missing_income |
| 12 | 0 | 1 | 0 | 1 | 1 | yes | W06 | missing_income |
| 13 | 0 | 1 | 1 | 0 | 0 | yes | W06 | missing_income |
| 14 | 0 | 1 | 1 | 0 | 1 | yes | W06 | missing_income |
| 15 | 0 | 1 | 1 | 1 | 0 | yes | W06 | missing_income |
| 16 | 0 | 1 | 1 | 1 | 1 | yes | W06 | missing_income |
| 17 | 1 | 0 | 0 | 0 | 0 | yes | W10 | core_inputs_missing |
| 18 | 1 | 0 | 0 | 0 | 1 | no | — | impossible: C excludes F |
| 19 | 1 | 0 | 0 | 1 | 0 | yes | W10 | core_inputs_missing |
| 20 | 1 | 0 | 0 | 1 | 1 | no | — | impossible: C excludes F |
| 21 | 1 | 0 | 1 | 0 | 0 | yes | W10 | core_inputs_missing |
| 22 | 1 | 0 | 1 | 0 | 1 | no | — | impossible: C excludes F |
| 23 | 1 | 0 | 1 | 1 | 0 | yes | W10 | core_inputs_missing |
| 24 | 1 | 0 | 1 | 1 | 1 | no | — | impossible: C excludes F |
| 25 | 1 | 1 | 0 | 0 | 0 | yes | W10 | core_inputs_missing |
| 26 | 1 | 1 | 0 | 0 | 1 | no | — | impossible: C excludes F |
| 27 | 1 | 1 | 0 | 1 | 0 | yes | W10 | core_inputs_missing |
| 28 | 1 | 1 | 0 | 1 | 1 | no | — | impossible: C excludes F |
| 29 | 1 | 1 | 1 | 0 | 0 | yes | W10 | core_inputs_missing |
| 30 | 1 | 1 | 1 | 0 | 1 | no | — | impossible: C excludes F |
| 31 | 1 | 1 | 1 | 1 | 0 | yes | W10 | core_inputs_missing |
| 32 | 1 | 1 | 1 | 1 | 1 | no | — | impossible: C excludes F |

**How the fixture inputs are built.** The template is A = 60, R = 62 (t_R = 2), H = 6, i = 0. Each predicate is switched on as follows:

- M adds a source with an unknown amount starting at age 65.
- X adds a gross source starting at 65.
- H adds a partner aged 58 who retires at 63.
- C sets spending to unknown.
- F sets pension 3,000,000 against spending 4,800,000. When F is off, the pension is 5,000,000.

Because the M and X sources start at t = 5, the early window years remain computable. That is what makes combinations such as M ∧ F, which occur in practice, reachable.

**Supplementary cases** in `clip-rules.json`:

- CS01: C via unknown current age, with M and X also true.
- CS02: C via unknown retirement age.
- CS03: M via a partial source list. No year is computed, so F is false.
- CS04: X via an unknown tax basis (not gross).
- CS05: household present but the partner's age unknown, so H is false.
- CS06: both partners retire in the same year, so H is false.
- CS07: uncertain income does not change the selection by itself.

## 5. Disclosure requirement

The disclosure is shown **next to every branch clip (W06–W10) and next to its written summary, in every media state**, including `unavailable`:

- EN (required meaning): "This explanation was selected automatically from your answers. Bill has not reviewed your submission."
- FR (draft): « Cette explication a été choisie automatiquement à partir de vos réponses. Bill n'a pas examiné vos réponses. »

**Forbidden anywhere** in clip scripts, captions, UI copy, the export and email (D-016; 05 §3):

- "I reviewed your file", "I looked at your answers" or "based on my review";
- any wording that implies a live or personal response, or advice tailored to the individual;
- any wording that implies the gap proves financial trouble or an inability to retire (see W07's content rule).

Bill does not read changing user numbers aloud. Personalized figures are rendered by the interface (05 §3).

## 6. Branch meaning constraints for C02 scripts

These come from 05 §3 and must match the predicates:

| Clip | Must say | Must not say |
|---|---|---|
| W06 | An income estimate is missing or cannot be placed yet; gathering it (a statement, a start date, whether it is in today's dollars) is a useful next step | That the missing value is zero, or a guess at the benefit amount |
| W07 | The gap is an illustration of the entered figures, year by year | That it is proof of trouble, "you can't retire", a savings target or a depletion date |
| W08 | Before-tax and after-tax amounts cannot be compared without more work | A tax estimate or a gross-to-net rule |
| W09 | Different dates or income sources raise a household coordination question | A recommendation about who should retire when |
| W10 | There is not enough, or not clear enough, information for a confident reading; here is one useful next question | A verdict of any kind (including "you're fine") |

## 7. Media availability states

Availability is tracked per (clip, locale), with locale ∈ `Language` = `fr` | `en` from `lib/business.ts`. The possible values are `available` (an approved, captioned recording by Bill), `unavailable`, and `test_media` (labelled local test media, never Bill). The manifest shape is proposed and belongs to W03/C10. It must carry the source, captions, poster, duration, sha256 and approval reference for every `available` entry.

| Render state | When |
|---|---|
| `play` | The selected clip is `available` in the active locale |
| `play_test_media_labelled` | It is `test_media` in the active locale **and** the build is local/test. It is visibly labelled "TEST MEDIA, not Bill" |
| `other_locale_only` | It is unavailable in the active locale but available in the other one. It is offered with an honest label. Captions in the other language do **not** count as a recording in this language (05 §3) |
| `unavailable` | Otherwise. There is no player, no placeholder video, no synthetic voice and no avatar (D-016, D-052). The approved written branch text and the disclosure are shown with "This explanation hasn't been recorded yet." The summary stays fully usable |

Further rules:

- **Never substitute another clip.** If W07 is selected and W10 exists, W07 is still shown as unavailable (MS06). Substituting would change the meaning.
- **No test media in production.** Any `test_media` reference in a production build fails the release check (MS05). Test media must never be placed under `public/assets/` on a hosted preview, because the proxy matcher does not protect that path (D-060).
- **Today's real state is MS01:** every branch clip is `unavailable`.

## 8. Privacy of the selection

The selected clip, the predicates, the flags and the completeness state together form a **derived financial profile**. They fall under D-014 and must never appear in a URL, fragment, cookie, analytics or error event, log, email, n8n, Brevo, Supabase or an LLM prompt. `workshop.completed` carries no selected clip (04 §3).

**The branch leaks through media requests.** If only the selected clip's file is requested, the media origin's access log learns which branch was chosen (for example, that someone has a funding gap). W03/W04 must therefore adopt one of these mitigations, and A0/A3 record which one in D-026 (the media origin is not selected yet):

- (a) **Preferred.** Request all five branch clips (W06–W10) identically, with the same preload policy and the same order, whatever was selected. Their durations of 30–45 seconds keep the cost small. This must be counted in the MED02 bandwidth estimate.
- (b) Serve all five through one opaque bundle.

Either way, **the media request pattern must not depend on the selection.** A first-party origin whose logs keep no request paths may be used in addition, but it does not replace (a) or (b). WK04 can verify a request pattern from a network capture, but it cannot verify a promise about log retention. Opaque file names and response sizes also still reveal which file was fetched to anyone who has run the workshop once and learned which file plays for which branch.

The sibling `privacy-boundary.md` sets the matching rules. PB-MEDIA-1 requires clip file names and URLs to be opaque, never `w07`-style or branch words, so the clip IDs in this document are internal identifiers only and never appear in a URL. That is hygiene, not the control. PB-MEDIA-2 forbids a query string, cookie or identifier on media requests. PB-MEDIA-4 is the controlling rule: the branch-clip request pattern never depends on the selection. Options (a) and (b) above are ways to meet it, and where this section and PB-MEDIA-4 differ, PB-MEDIA-4 applies. WK04 must show, from a network capture, that the request pattern is identical for every selection. This is a downstream check.

## 9. Downstream checks

F02 does not run these.

- **W03:** implement the predicates and the precedence exactly. Pass every row of `clip-rules.json` (the truth table, the supplementary cases and the media cases). Unit tests may use only labelled test media.
- **W04 / WK06:** in the rendered UI, check the disclosure in both locales and in every render state, confirm that no personal-review wording appears, and confirm that real media IDs and captions match the C10 manifest once recordings exist.
- **C02:** write the W06–W10 scripts to match §6. Bill records them only after the labels and logic are approved (05 §3).

## 10. Questions for review

1. Should H also fire when partner-owned income starts in a different year from the participant's own retirement year, even when the retirement ages match? Today it is based on the retirement years only.
2. Should an all-surplus complete result, which today selects W10 as `neutral_fallback`, get its own clip? The plan's inventory has none, so this contract uses W10.
