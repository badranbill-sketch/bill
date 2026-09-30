# F02 independent design review (A6, contract/privacy/design, attempt 1 of 3)

- Reviewer: A6, fresh context. Technical verification only: this is not an approval, and it records no G0–G6 decision.
- Subject: `.orchestration/contracts/` (contract set 1.0, untracked). Base HEAD `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b` on `claude/orchestration-foundation`. Date 2026-09-30.
- Out of scope: the numeric correctness of the workshop fixtures, which a separate math verifier covers. I read the workshop contracts only for privacy and cross-contract consistency.
- Evidence: `.orchestration/evidence/F02/a6-design-attempt1/` (files 01–15 and the scripts that produced them). Every command below was run in this session; nothing is summarised from the implementer's logs.
- Writes: only this file and the evidence folder. No commits, no pushes, no network, no connector calls. `git status` is unchanged apart from these paths.

## Verdict: needs_changes

- **P0: 0.**
- **P1: 0.**
- **P2: 7.**
  - Four are new: A6D-01 to A6D-04.
  - Three are the README's own open P2 items (XL-17, XL-01, XL-11), which I reproduced independently: A6D-05 to A6D-07.
- **P3: 8** (A6D-08 to A6D-15).

The set is strong. The envelope, offer and approval schemas do what they claim against every adversarial instance I tried, except the resource-code slot (A6D-03). `validate.py` runs clean, and the routes and proxy description is exact. The P2 items are small, local edits. They are cheaper to fix now, before acceptance, than after, because a post-acceptance change forces the re-issue of every consuming task (README §3.4).

## What I checked, and the result

| Check | Command or evidence | Result |
|---|---|---|
| `validate.py` runs clean | `01-validate-py.log` | exit 0; pass 312, fail 0, known 17, info 2 |
| Every example, checked independently (my own script, not the harness) | `02-examples-independent.log` | All valid examples pass. Every invalid example fails, except 9 that are schema-valid by design. Each of those 9 declares a harness rule in its `.why.txt`, and `validate.py` rejects it for exactly that rule (log lines 494–608). |
| Raw PII and amount fields impossible in the envelope | `03-adversarial-envelope.log` ADV-1a to ADV-3c | Rejected: an email in the idempotency key, an uppercase key, an object or amount in `resource_id`, `$` in `subject_id`, digits in a workshop key, an email as `consent_reference`, a data-bearing locale |
| Encodings a schema cannot see | same log, ADV-4a to ADV-6 | Accepted, as expected for opaque hex and ID slots. Also accepted, **against the contract's claims**: ADV-5a to ADV-5d in `resource_id` (A6D-03). |
| Offer matrix forbids 60 minutes, extra offers and invented prices | `04-adversarial-offers.log` | Rejected: two consultations, a 60-minute meeting type, a price string while pending, a disclosure recorded without approvals, a priced continued-work, a paid intro, `"60"` as a string, an upgrade property, `ZOOM-meetings`. Accepted by the schema alone: O-7, then caught by CX-16 (`05-nc-offer-invented-record.log`). Also accepted: `z00m`, a lookalike I judge immaterial. |
| Harness refuses an invented gate record | `05-…`, `06-…` | A missing D-099 is caught by CX-16. A price citing the real but unrelated D-032 is caught only by CX-29 hash drift (A6D-13). |
| Human approval kept apart from agent verification | `10-adversarial-approvals.log` | Rejected: an `operator`, A0 or A6 role recording `approved`; an empty scope hash; gate G7; agent roles in asset `approved_by_roles` and offer `recorded_by_role`; a handoff with `accepted`, `live` or a `pass` blocked check. approval-scopes §7 and AS-SEP-1 to AS-SEP-3 keep the two separate in prose. |
| Routes against the real `lib/routes.ts` (6 branches) | `13-route-collisions.log`, `15-branch-blobs.log` | 9 keys, identical blob `7592590` on 5 branches; `ask` only on homepage. The 10 proposed keys and slugs: no collision, no shadowing, ASCII only. |
| routes.md describes `proxy.ts` correctly | `git show` of `proxy.ts` (blob `4159faf`, all 6 branches), `lib/business.ts`, `app/robots.ts`, `app/sitemap.ts`, `app/[lang]/[[...slug]]/page.tsx`, `app/api/guide/route.ts` | Accurate: matcher, `draft` regex, `needsAuth`, 503/401/404, headers, `launchApproved`/`localReview`/`reviewEnabled`, sitemap iterating every key, robots, `/api/guide` codex-only and review-only. One wording nit (A6D-15). |
| approval-scopes describes the hash-bound mechanism | `verify-publication.ts`, `docs/CONTENT-WORKFLOW.md`, `lib/articles.ts`, `verify.yml`, `protections.ts`, `content.ts` read on main and codex (identical blobs) | Accurate except the key-order claim (A6D-04, reproduced in `07-fingerprint-key-order.log`) and one overstated pagination claim (A6D-14). `content/approvals.json` is `{}` on all 6 branches. |
| Nothing claims a proposed path exists | `14-proposed-paths.log` | 19 paths are absent on every branch. Each is labelled proposed on its line or sits under a "(proposed)" heading. |
| README index complete | directory listing against README §2 | Every file in `contracts/` is indexed. Example counts equal the files (CX-21, rechecked by hand for the envelope, job, flags, offers, asset manifest and handoff examples). |
| Lane validators, and whether they write | `11-lane-validators.log` | data 209/0, math 86/0, offers 92/0. sha256 of `contracts/` and the lane evidence is identical before and after. |
| F02 handoff | `08-handoff-F02-deep.log` | Schema-valid, `base_commit` = HEAD, 390 artifact hashes match |
| Plan values not invented | `grep` of 01 and decisions | Cap 8 (01 l.361, D-032), capacity 6/2 with a 10-minute buffer (01 l.451, D-033), Brevo 300 (07 S11, D-023) and Calendly (D-024, D-062) all trace to sources. No price anywhere. The fixture price is `amount_minor: 1`, currency `XXX`. |
| 04 coverage | reading 04 §1–§7 against the contracts | Covered: authority (8 domains), data model (all 8 groups → 10 tables), envelope, the 20 types in order, the 9 job states, the email matrix (E01–E16 match 05 §8; the 48-hour cap, the collision rule, the budget below 300 with reserve and forecast), 6 flags, 5 readiness states. Gaps: A6D-08, A6D-10, A6D-12. |

## Findings

### P2

**A6D-01: The flag runtime rule contradicts the FF-INV-1 staging waiver. No capability controlled by `public_launch` or `checkout_live` can ever act in staging.** Owner: data.
- Location: `feature-flags.md` l.82 (FF-INV-1) and l.89 (runtime rule); `job-state-machine.md` §6 step 2 (l.78); `email-eligibility.json` PSC-3 (l.91); `examples/valid/feature-flags/staging-guide-delivery-allowlist-test.json`.
- Reproduction: `12-text-quotes.log` §F-A.
  - The staging example has `public_launch` = false (forced by FF-ENV-1) and `guide_request_delivery.enabled` = true (allowed by the FF-INV-1 waiver).
  - The runtime rule says a capability acts only when "all of its controlling flags are true in the running configuration". PSC-3 and JSM §6.2 check "its controlling flags are on", with no waiver.
  - So the E01 job is deferred with `capability_disabled` until it expires.
- Expected: the allowlisted staging send that the example models (MAIL01, PAY01 in Stripe test mode, `provider_tested` evidence) is possible under one consistent rule.
- Actual: the schema waives the flag for `enabled`, and three runtime rules do not. P02 and N02 must guess which rule wins.
- Fix: state the same waiver in the runtime rule, PSC-3 and JSM §6.2. Outside production, `public_launch` and `checkout_live` are replaced by "environment ≠ production, and the recipient is allowlisted".

**A6D-02: The privacy boundary leaves the media-request side channel open, and is weaker than the clip rules.** Owner: data, with math for the clip-rules sentence.
- Location: `privacy-boundary.md` PB-FIN-5 (l.63), PB-MEDIA-1 and PB-MEDIA-3 (l.76, l.78), §6 WK04 row (l.170); `workshop-clip-rules.md` §8 (l.160–166).
- Reproduction: `12-text-quotes.log` §F-B. Four statements do not fit together:
  - PB-FIN-5 allows "approved media" requests during the workshop.
  - PB-MEDIA-3 makes preloading all branch clips merely "an allowed mitigation".
  - WK04's rule list has no "identical request pattern" assertion.
  - clip-rules §8 says that fetching only the selected clip tells the media origin the branch (for example, a funding gap), that W03/W04 "must" mitigate, and that WK04 "must show … the request pattern is identical for every selection". Its option (c), a first-party origin that keeps no paths, contradicts that WK04 sentence.
- Why opaque names do not help: they give no protection, because anyone can run the workshop once and learn which opaque file plays for which branch. PB-MEDIA-3's "holds no identity" is also not true of an ordinary access log, which records the IP address.
- Expected: the controlling privacy contract makes the request pattern for the branch clips independent of the selection. It becomes a numbered PB rule that WK04 must assert.
- Actual: a WK04 run built from privacy-boundary.md §6 passes when only the selected clip is fetched. That DC-FIN-DERIVED value would then reach the origin's logs, which PB-FIN-1 forbids.
- Fix:
  - Add PB-MEDIA-4: "branch clips W06–W10 are requested identically, whatever the selection", and add it to the WK04 row.
  - Change PB-FIN-5 so that the approved-media allowance is subject to PB-MEDIA-4.
  - Drop option (c) from clip-rules §8, or qualify it.

**A6D-03: `resource_id` can carry an age, an amount or a diagnosis. Three texts claim it cannot, and the only barrier named is not specified.** Owner: data (the README CX-13 wording belongs to the index lane).
- Location: `event-envelope.schema.json` `$defs.resource_workshop_version`, `resource_guide_version` and the shared version alternation; `privacy-boundary.md` PB-ID-3 and PB-FIN-7; README CX-13; `event-envelope.md` §4.2 (l.68).
- Reproduction: `03-adversarial-envelope.log`. The schema accepts all of these, the first two on `workshop.completed`:
  - ADV-5a `workshop.eight-hundred-fifty-thousand.v1`
  - ADV-5b `workshop.shortfall-large-warning.v1`
  - ADV-5c `guide.before-you-retire.v65` (an age, in the version slot)
  - ADV-5d `guide.jean-tremblay.v1` (a name)
  PB-SCAN would not catch them either: PB-SCAN-1 tokens apply to keys only, and PB-SCAN-3 matches emails, currency and formatted amounts only.
- What the contracts say:
  - PB-ID-3: "so an age or amount cannot be encoded in a resource code", enforced by "schema".
  - PB-FIN-7: `workshop.completed` carries no diagnosis, "schema-enforced".
  - CX-13 repeats PB-ID-3.
  - The only barrier is one sentence in event-envelope.md §4.2 about a "proposed resource registry that P02 validates against". It checks keys, not versions. It has no content, no rule ID and no test mapping in privacy-boundary.md §6.
- Expected: the claims hold, or they are scoped to what is enforced and backed by a testable rule.
- Actual: the claims are false for the version slot and for keys written in words.
- Fix (for example):
  - pin `workshop.*` and `guide.*` keys to an enum of plan keys;
  - require the `h<sha>` version form for the workshop, guide and consent resources;
  - add a PB rule, "`resource_id` ∈ the approved resource registry", cited by WK04 and AUTH05;
  - correct PB-ID-3, PB-FIN-7 and CX-13.

**A6D-04: approval-scopes §3 misdescribes the existing article fingerprint. Reordering frontmatter keys does not change the hash.** Owner: offers.
- Location: `approval-scopes.md` §3, the bullet "Key order follows the file (JSON.parse keeps insertion order). Reordering frontmatter keys therefore changes the hash …". The same misdescription feeds `articles-contentFingerprint-v1` in §4.2 and the asset manifest's `review_hash.method`.
- Reproduction: `07-fingerprint-key-order.log`.
  - I called the real `parseArticle` from `lib/articles.ts` (codex `66cce52`, blob `df24ccb`, zod 4.6.5) on a fictional article.
  - Top-level keys reversed: same hash `41d981ae…`.
  - Source-object keys reordered: same hash.
  - Title changed (control): different hash.
  - The reason: `data = articleSchema.parse(JSON.parse(...))`, and zod builds its output in schema key order. `.strict()` rejects unknown keys.
- Expected: an accurate description. The key order follows `articleSchema`, not the file, so a reorder is harmless, and the fingerprint is JSON in schema order.
- Actual: the contract describes behaviour the code does not have. A `verify-assets.ts` or CX-15 conformance test built from this text would compute different hashes from `lib/articles.ts` for any article whose frontmatter is not in schema order. A CNT05 test that expects "a reorder blocks publication" would fail.
- Fix: rewrite the bullet. Name zod schema order as part of the method.

**A6D-05 (README XL-17, re-verified): the data model's PB-SCAN-1 list lacks `balances` and `assets`.** Owner: data.
- Location: `operational-data-model.md` §3 rule 1 (l.212), against `privacy-boundary.md` l.150.
- Reproduction: set difference, in `12-text-quotes.log` and in my own check: in PB but not in the data model, `['assets', 'balances']`.
- Expected: the identical list, which the data model itself claims.
- Actual: a P01 column test built from the data model lets a column named `assets` through.
- Fix: a two-word edit, needed now while F02 is unaccepted.

**A6D-06 (README XL-01, re-verified): the envelope cannot express content events for five asset kinds that asset manifest 1.0 defines.** Owner: data.
- Location: `event-envelope.schema.json` `$defs.resource_content_version`.
- Reproduction: `09-known-p2-repro.log`. `content.approved` is rejected for `ink.a01`, `companion.s01`, `book.*`, `event.*` and `copy.*`, and accepted for `article.*`.
- Expected: every asset that H00, N08 or C08 must approve or publish can emit `content.draft_created`, `content.approved` and `content.published`.
- Actual: the 8 ink drawings, 18 companions, the book, the event kit and the disclosure copy cannot.
- Fix: widen the pattern to the asset-manifest ID pattern. XL-02 (`zxx`) can go in the same edit.

**A6D-07 (README XL-11, re-verified): a promotional E09 is not stopped by the `marketing_dispatch` kill switch, and the flag's `controls` omits `workshop_followup`.** Owner: data.
- Location: `feature-flags.json` (`event_lifecycle.controlling_flags` = `["public_launch"]`; `marketing_dispatch.controls` = `["marketing_nurture", "preferences_unsubscribe"]`); `email-eligibility.json` PSC-3 and E09 `alternate_class`.
- Reproduction: `09-known-p2-repro.log`. A promotional `e09` job (priority 8, with `consent_reference`) is schema-valid. PSC-3 checks only `public_launch`, so with `marketing_dispatch` = false it passes.
- Expected: the kill switch stops every promotional send (feature-flags.md §2, "any authorized operator may set any flag to false at any time as a kill switch").
- Actual: only prose says a promotional E09 needs `marketing_dispatch`. Consented recipients would still receive it after the switch is thrown. FF-INV-3 never checks `workshop_followup` readiness.
- Fix: make PSC-3 read "the owning capability's flags, plus `marketing_dispatch` for every promotional job". Add `workshop_followup` to `marketing_dispatch.controls`.

### P3

**A6D-08: reschedule has no event mapping, and the `rescheduled` booking status is unreachable.** Owner: data.
- event-envelope.md §3 has `meeting.cancelled` writing `bookings (cancelled)`. No row writes `rescheduled` (`operational-data-model.md` l.124), although AM-BOOK-2 and WF06 require cancellation and rescheduling to be distinct.
- No contract says which events a provider reschedule emits (cancel plus confirm, with `supersedes_booking_id`?), or what happens to the right between the two. BOOK01 and PAY02 test exactly this.
- Fix: document the sequence and which event writes `rescheduled`.

**A6D-09: the key for `contacts.email_hmac` is an unnamed secret.** Owner: data.
- `operational-data-model.md` l.29 has `HMAC-SHA256(email_normalized)`. README §6 says `EVENT_KEY_SECRET` is the only secret the set names.
- Suppression after erasure depends on this key staying stable. If it is shared with `EVENT_KEY_SECRET`, the planned `ik2` rotation breaks suppression matching, which risks a silent re-enrolment (MAIL03).
- Fix: name a separate secret and its destination (application server-only environment, entered by the authorized operator, 06 map). Never its value.

**A6D-10: `consent_events` has no evidence-reference column.** Owner: data.
- 04 §2 requires one. `op_record_withdrawal(contact_id, purpose, source, evidence)` takes an `evidence` argument that no column stores.
- Fix: add `evidence_ref`, or state that `event_id` → `integration_events` is the evidence reference and drop the argument.

**A6D-11: the `expired` state's definition is contradicted by T13.** Owner: data.
- job-state-machine.md §2 defines `expired` as "expires_at passed before a provider call started". T13 moves a job to `expired` after a started call failed definitively.
- Fix: widen the definition.

**A6D-12: the 14 workflows are not traced.** Owner: index.
- WF01 and WF03 to WF06 are never named in any contract. Their needs are met through the primitives, but no table maps each workflow to its events, templates, capability, operations and activation gate.
- Two 04 rules appear nowhere:
  - 04 §4: return a truthful queued or accepted state, and never show false success when storage is down.
  - 04 §5: one dispatcher, no per-person Wait node, and model work can never block payment or email.
- Fix: add a workflow-to-contract table to README §2 or to job-state-machine.md.

**A6D-13: the invented-price guard checks only that the cited decision exists.** Owner: index.
- `06-nc-offer-price-citing-D032.log`: a recorded price of `4995 CAD` citing `decisions.md#D-032`, whose text says "No price exists anywhere", fails only CX-29. That check stops working once the offers lane log is regenerated, as it is when a real value is recorded (README §3.6).
- Suggested harness check: the cited D-row names the same gate and field and has a recorded (not default-pending) status.
- Human A6 review remains the backstop.

**A6D-14: approval-scopes §3 repeats "fails closed" for pagination as a fact.** Owner: offers.
- With more than 100 reviews, `verify-publication.ts` reads only the oldest 100 (`per_page=100`, chronological). A reviewer's APPROVED at the head in the first 100, followed by a CHANGES_REQUESTED beyond 100, is seen as approved.
- This is a pre-existing code property. Branch protection mitigates it, and it is very unlikely. The contract should say "fails closed only when the approval is beyond the first page".

**A6D-15: the routes.md §2 table cell "Basic Auth (503 without credentials)" is ambiguous.** Owner: offers.
- 503 means `REVIEW_USER` or `REVIEW_PASSWORD` is unset on the server. A client without credentials gets 401. The bullet above the table is correct.

## Items the README already lists that I judge P3 and accept as tracked

XL-02 to XL-10 and XL-12 to XL-16 reproduce as KNOWN in `01-validate-py.log`. I agree with their P3 classes.

## Not run or not covered

- Numeric correctness of the workshop fixtures: excluded by the task (separate math verifier).
- Runtime behaviour, browser network capture, providers and the n8n import: nothing to run yet. No implementation exists, and every such check is owned downstream (F02 acceptance text).
- The fingerprint test used the F00 codex worktree in scratch, read-only. Its pre-existing ` M next-env.d.ts` is not from this review.
