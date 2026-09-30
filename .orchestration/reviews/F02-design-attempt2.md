# F02 independent design review (A6, contract/privacy/design, attempt 2 of 3)

- Reviewer: A6, fresh context. This is technical verification only. It is not an approval and records no G0–G6 decision.
- Subject: `.orchestration/contracts/` (contract set 1.0, untracked), after the lanes' repair attempt 2 and the integrator's repair attempt 2. Base HEAD `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b` on `claude/orchestration-foundation`. Date 2026-09-30.
- Out of scope: the numeric correctness of the workshop fixtures, which the separate math verifier covers. I read the workshop contracts only for privacy and cross-contract consistency.
- Evidence: `.orchestration/evidence/F02/a6-design-attempt2/` (logs 00–18 and the scripts that produced them). I ran every command below in this session. I did not rely on the implementers' logs or on attempt 1's logs.
- Writes: only this file and that evidence folder. No commits, no pushes, no network, no connector calls. The sha256 of every contract file is the same before and after the review (`00-contracts-sha256-before.txt`, rechecked at the end). One read-only script ran in the F00 codex scratch worktree; its pre-existing ` M next-env.d.ts` did not change.

## Verdict: needs_changes

| Class | Count | IDs |
|---|---|---|
| P0 | 0 | |
| P1 | 0 | |
| P2 | 2 | A6D2-01 (data), A6D2-02 (data) |
| P3 | 13 | 7 new: A6D2-03 to A6D2-09. 6 carried from attempt 1: A6D-08 to A6D-11, A6D-14, A6D-15 |

- **What changed since attempt 1.** The repair closed all seven P2 findings from attempt 1 (A6D-01 to A6D-07). The integrator also handled A6D-12 and A6D-13. I re-verified each one (table below).
- **The two new P2 items** are in contracts no earlier review tested:
  - A6D2-01 is a contradiction between two data-lane contracts about suppressing a leased job.
  - A6D2-02 is a missing join between a scheduler booking and a contact.
- **Neither is a privacy leak or an offer violation.** Each forces P02, N02, N06 or N07 to guess between contract texts that disagree. Both are small edits in data-lane files.

## What I checked, and the result

| Check | Evidence | Result |
|---|---|---|
| `validate.py` runs clean | `01-validate-py.log` | exit 0; pass 346, fail 0, known 15, info 2. NC-1 to NC-12 all caught. |
| Every example, checked by my own script | `02-examples-independent.log` (`check_examples.py`) | All 54 valid examples pass. 134 invalid examples fail on the schema. The other 10 are schema-valid by design. Each of those 10 names a harness rule in its `.why.txt`, and `validate.py` rejects it for exactly that rule (log 01, lines 531–669). All 24 invalid envelope examples fail on the schema. |
| PII in the idempotency key; amount fields | `03-adversarial-envelope.log` (17 new instances, none from attempt 1) | Holds: `idempotency_key` is `^ik1_[0-9a-f]{64}$` with maxLength 68, and the envelope is closed. Rejected: a consent code or a `clip.w07` code on `workshop.completed`; a `con_` subject on `content.published` or `delivery.failed`; `guide.retirement-guide.v65`; a click asserted by an operator; `consent_reference: null`; uppercase or full-width hex in the version. Accepted: ADV2-1a/1b, readable figures in the sub-second part of `occurred_at` (A6D2-03); ADV2-2a/2b/2d, one trailing newline, because Python's `$` matches before `\n` (A6D2-04); ADV2-3k, a readable `con_age62cad850000…` subject. That last one is the known ID-slot class, closed only by CSPRNG generation (PB-ID-1). |
| Offer matrix: no 60 minutes, no invented price | `04-adversarial-offers.log` (12 new instances) | All as expected. Rejected: `count: 2`; a hidden `extra_minutes: 30`; a `book-consultation-60` meeting type; a price of 0 or 49.95; a fixture document citing D-032; a price hint in an added field; validity in minutes; three questions; a priced continued-work; "Zoom Workplace". Accepted: `30.0`, which is numerically equal to 30. |
| Routes against the real `lib/routes.ts` | `05-…`, `07-route-collisions.log` (`route_collisions2.py`) | Blob `7592590` (9 keys) on main, codex, guide, video and add-ask-bill; `ask` only on homepage (`c094895`). The 10 proposed keys and 20 slugs: no key or slug collision, no shadowing of `guide-retraite/` or `retirement-guide/`, no reserved first segment, ASCII only. Existing keys, `ask` and the proposed keys equal the asset-manifest `intended_route_key` enum. |
| routes.md describes `proxy.ts` correctly | `05-…`, `06-codex-route-facts.log`; Next 16.3.6 `proxyClientMaxBodySize.md` read in the codex worktree | Accurate: matcher, `draft` regex, `needsAuth`, 503 (unset credentials), 401 with `WWW-Authenticate`, headers, the after-launch table, robots, sitemap iterating every key, `/api/guide` codex-only and review-only, the 12 000-byte inquiry limit, the StandardPage `cta` rule on main and codex, the 10 MB body buffer. Only the A6D-15 cell remains. |
| approval-scopes describes the hash-bound mechanism | `08-verify-publication-source.log`, `09-approval-mechanism-facts.log`, `10-fingerprint-rerun.log` | Accurate: `verify-publication.ts` (blob `393d8d6`, all 6 branches), `CONTENT-WORKFLOW.md`, `verify.yml`, `approvedArticle`, `approvals.json` = `{}`, no CODEOWNERS. The repaired §3 (key order follows `articleSchema`) is right: I re-ran the real `parseArticle` and got 15/15 as stated. Human approval is kept apart from agent verification (§7, AS-SEP-1 to AS-SEP-3, AS-WRITE-1 and 2, FF-APPR-1, OM-DOC-2, AM-APPR-2). Only the A6D-14 sentence remains. |
| Privacy boundary is concrete and testable | reading privacy-boundary.md, `data-flow-register.json`; `12-privacy-precedent-facts.log` | Yes. 18 data classes and 26 sinks. FL-04 and FL-05 forbid DC-FIN-* on every non-browser sink by name (Supabase, n8n, Brevo, analytics and ads, URL, cookies, logs, LLM, media origin and more). PB-SCAN-1 to PB-SCAN-3 are machine lists. The WK04 canary and media procedures are executable. PB-MEDIA-4 now makes the branch-clip request pattern independent of the selection. The codex precedent test (`tests/browser/site.spec.ts` l.157–177) is as described. |
| 04 coverage | 04 §1–§7 read against the contracts | Authority: 8 domains. Data model: 8 groups in 10 tables. Envelope: 10 fields. Event types: the 20 of 04 §3, in order. Job states: 9. Workflows: all 14 traced in README §2a. Email: E01–E16, the 48-hour cap, the reminder collision rule, a budget of 250 below 300 with a 150 reserve and a forecast. Flags: 6, all default false. Readiness: 5 separate states. Gaps: A6D2-02, A6D2-06, A6D2-08, A6D2-09, XL-18 (tracked). |
| Nothing claims a proposed path exists | `11-proposed-paths.log` (`paths2.py`, all 6 branches) | 34 references to absent paths. Every one is labelled proposed on its line or in its heading or lead bullet. The 4 flagged by the script are 3 sub-bullets of AS-WRITE-3 "(proposed …)" and one existing directory (`app/[lang]/[[...slug]]`) that the script missed. |
| README index complete | listing of `contracts/` against README §2 | Every file is indexed. Example counts equal the files. |
| Lane validators; are they read-only? | `14-lane-validators.log` | data 266/0, offers 92/0. The tree hash over contracts, lane evidence and handoffs is identical before and after. |
| F02 handoff | `13-handoff-F02-deep.log` | Schema-valid; `base_commit` = HEAD; 427 artifact hashes match. |
| Forbidden offers and tools | `17-forbidden-terms.log` | 60 minutes, one hour, Zoom, n8n Cloud, Vercel Hobby and a custom video platform appear only as prohibitions. "1-hour" appears only as the E08 reminder timing. |

### Repair of attempt-1 findings (re-verified)

| Attempt-1 ID | Status now | How I checked |
|---|---|---|
| A6D-01 (flag waiver vs runtime rule) | fixed | FF-RUN-1, job-state-machine.md §6 step 2, PSC-3 and `runtime_gate` state one non-production substitute |
| A6D-02 (media side channel) | fixed | PB-MEDIA-4, PB-FIN-5, WK04 row and media procedure; clip-rules §8 now defers to PB-MEDIA-4 |
| A6D-03 (resource code encodings) | fixed | My ADV2-3a/3b/3d/3h/3i/3j; NC-12; PB-ID-5 and PB-ID-6 |
| A6D-04 (fingerprint key order) | fixed | `10-fingerprint-rerun.log` |
| A6D-05, A6D-06, A6D-07 (XL-17, XL-01, XL-11) | fixed | `validate.py` S7 "resolved and still resolved"; flag `controls` const includes `workshop_followup` |
| A6D-12, A6D-13 | addressed | README §2a with CX-31 and NC-11; CX-16 reads the decisions.md status vocabulary (NC-9). I checked that the vocabulary covers the compound statuses (`**open**`, `frozen-by-plan (…); open (…)`). |
| A6D-08 to A6D-11, A6D-14, A6D-15 (all P3) | still reproduce | `18-text-quotes.log`; listed below as carried P3 |

## Findings

### P2

**A6D2-01: two contracts disagree on whether a withdrawal may suppress a leased job. The reading taken from the data model yields a false "suppressed" record for a message that may already be sent.** Owner: data.
- Location:
  - `operational-data-model.md` §4, `op_record_withdrawal`: "suppresses pending and leased promotional jobs in the same transaction".
  - `authority-matrix.md` AM-CONSENT-2: "vetoes every pending and leased promotional job".
  - Against `job-state-machine.md` §3:
    - T3 (pending or retry_due → suppressed, actor `op_record_withdrawal`) does not include `leased`.
    - T5 (leased → suppressed) belongs only to `op_prepare_send`, before `send_started_at`.
    - T11 sends a started call to `reconcile_required`.
    - "Any transition not in this table is forbidden. Every transition is conditional on the caller holding the current `lease_token`."
- Reproduction: `15-withdrawal-leased-race.log`.
  - I took the promotional valid job `retry-due-e04-deferred-daily-budget`.
  - I set `status: suppressed`, `suppression_reason: consent_withdrawn`, `send_started_at` set and `attempt_count: 1`.
  - `delivery-job` 1.0 **accepts** it: the suppressed state forbids `lease` and `provider_message_id`, but not `send_started_at`.
- Scenario:
  - A worker has passed `op_prepare_send` and started the Brevo call.
  - The visitor unsubscribes. An `op_record_withdrawal` built from the data model moves the leased job to `suppressed`.
  - Brevo accepts the message. The worker's `op_record_send_result` is fenced out, because the job is no longer `leased`.
  - The job says the withdrawal stopped the send. The provider ID is lost, and the message was in fact sent.
  - MAIL03's "audit record" and MAIL05's "stored provider/job state" would then record something that is not true. The state machine was built to prevent exactly this ("maybe sent" goes to `reconcile_required`).
- Expected: one rule. The state machine's rule is the safe one. The withdrawal suppresses pending and retry_due jobs (T3). A leased job is stopped by the pre-send consent check (T5) if `send_started_at` is null, and otherwise it runs its course to `sent` or `reconcile_required`.
- Fix:
  - Change the `op_record_withdrawal` row and AM-CONSENT-2 to say "pending and retry_due; a leased job is stopped at its pre-send check (T5)".
  - Optionally, make the schema forbid `send_started_at` on `suppressed`, so that the unsafe reading cannot produce a valid record.

**A6D2-02: no contract says how a scheduler booking is joined to a contact. The texts that do exist make an automatic join impossible, so `already_booked` (04 §6), E15 and E16 cannot work for bookings made on the scheduler.** Owner: data.
- Location:
  - `event-envelope.md` §3 and the schema: `meeting.confirmed`, `meeting.cancelled`, `meeting.held` and `consultation.redeemed` require a `con_` subject.
  - `operational-data-model.md` `bookings.contact_id`: "null until matched to a contact". No text defines the matching.
  - `privacy-boundary.md` DC-BOOKING-INTAKE ("Invitee name, email … Scheduler and calendar only") and PB-CAL-2 ("Supabase stores the provider event ID, times, offer, mode and status only").
  - `data-flow-register.json` DC-BOOKING-INTAKE `allowed_sinks` = `["scheduler", "google_workspace"]`, with no `app_server`; FL-15 notes.
  - routes.md: the 15-minute meeting is booked on the external, never-prefilled scheduler link.
- Reproduction: `16-booking-contact-gap.log`.
  - `meeting.confirmed` without a subject, or with a non-contact subject, is rejected.
  - The only matching key, the invitee's email, is excluded from the app server and Supabase.
  - E05 and E11 carry `already_booked` ("the contact has a confirmed future booking").
  - E15 and E16 need a contact (`contact_id` is required on every job).
  - A search of all contract text for how a booking is matched finds only the column comment.
- Consequences:
  - A contact who books the free introduction on the scheduler cannot be linked to that booking.
  - `meeting.confirmed` cannot be emitted for it, and `op_accept_event` is the only writer, so the nullable `contact_id` has no write path.
  - E05 ("book a meeting") and E11 keep reaching a person who already booked. This breaks 04 §6: "a … confirmed booking suppresses irrelevant appointment-solicitation messages".
  - N06 and P02 must either read the invitee email into the app server, against the register as written, or ship without the suppression.
- Expected: the contract names the join and its privacy basis. For example:
  - (a) booking sync may read the invitee email transiently, only to resolve `contact_id` by `email_normalized` or `email_hmac`, storing only the ID (a DC-CONTACT flow in the register); or
  - (b) in 1.0 the join is the operator's documented reconciliation (`operator.reconciliation`), and E05 and E11 use `already_booked` only after that match.
  - Either way, it must also say what happens to a booking that matches no contact: it is stored with no event, or ignored.
- Fix: add the rule to event-envelope.md §3 or authority-matrix.md AM-BOOK, plus the matching flow in `data-flow-register.json`.

### P3 (new)

**A6D2-03: `occurred_at` can carry readable figures, and no rule says the server sets it for `site.*` events.** Owner: data.
- `03-adversarial-envelope.log` ADV2-1a: `workshop.completed` with `occurred_at` `2026-10-03T13:40:00.386152Z` (the WK04 savings canary in the microseconds) is schema-valid.
- PB-ID-6 makes `resource_id` server-set. PB-FIN-7 lists the layers that keep a diagnosis out of `workshop.completed`, but `occurred_at` is not among them. event-envelope.md §2 defines it only as "when the fact happened".
- The WK04 canary search would catch a browser that sends it, so this is P3.
- Fix: add to PB-ID-6 or event-envelope.md §2 that, for `site.*` sources, the server stamps `occurred_at` from its own clock, and a timestamp in the request is ignored.

**A6D2-04: the Python harness accepts a trailing newline where ECMA-262 does not.** Owner: index.
- In Python `re`, the `$` in `^…$` matches before a final `\n`. JSON Schema patterns are ECMA-262, where it does not.
- ADV2-2a, 2b and 2d: `resource_id`, `occurred_at` and a `wev_` resource with a trailing `\n` pass `jsonschema` 4.26 and therefore `validate.py`. Fields whose `maxLength` is exact (idempotency key, IDs) are safe (ADV2-2c).
- Impact is one bit and no data. The registry and row lookups are exact, and a Node/ajv runtime rejects these values. But the conformance suite is not ECMA-exact.
- Fix: in `validate.py`, check patterns with `re.fullmatch`, or with `\Z` in place of `$`; or add a note in README §7.

**A6D2-05: asset-manifest.md §5 is stale, and §1 overclaims.** Owner: offers.
- §5 (l.89) says the envelope "**does not yet accept `companion`, `ink`, `book`, `event` or `copy`**" and asks A0 to reconcile. XL-01 is resolved, and the envelope now copies the asset-ID pattern. The offers lane's own validator prints "not yet: []" (`14-lane-validators.log`).
- §1 (l.16) says an asset ID's key form means "an age or amount cannot be encoded in it". Words can be, as in `article.retire-at-sixty-two`. CX-13(a) states the accurate form: "no digits". Asset IDs are editorial, so there is no privacy impact.
- Fix: replace the §5 bullet with the current fact, and reword §1 to "no digits".

**A6D2-06: the E09 job has no creation path.** Owner: data.
- E09 is anchored to `webinar.replay_available_at` ("When the operator marks the approved replay available. No anchor, no job."), with trigger `webinar.registered`.
- Jobs are created only by `op_accept_event` for the trigger event, and at registration the anchor is unset.
- Marking a replay available emits no event, calls no operation and writes no audit action (`18-text-quotes.log`). So the E09 job is never created, or P02 invents a path.
- Fix: name the operator action (for example `webinar.replay_released` in the audit list) and the operation that creates E09 jobs for active registrations. It keeps `trigger_event_id` = the registration event, so JS-KEY-1 and JS-KEY-2 still hold.

**A6D2-07: PB-FIN-5 and the WK04 canary procedure leave out the two workshop POSTs that are allowed.** Owner: data.
- PB-FIN-5 allows only static assets and approved media. The canary procedure expects "no non-static request during the interaction", over a run that includes following the next-step links.
- The allowed `POST /api/marketing/workshop-access` and the consented `POST /api/marketing/workshop-completed` (PB-FIN-7, routes.md §3.2) would fail that assertion. A tester would have to invent the exception.
- Fix: name these two requests as the only exceptions, and require WK04 to assert that each body holds only the fields the envelope server needs (never an answer). Say that navigating away ends the interaction window.

**A6D2-08: WF08's "one draft per content key" has no contract basis, and the draft job's idempotency origin cannot enforce it.** Owner: data.
- 04 §5 requires one draft per content key, and CNT06 runs the draft job twice.
- event-envelope.md §4.3 sets `origin_ref` for `editorial.*` to "the content sha256 plus the ledger entry". A second run of a non-deterministic model produces a different sha256, so a different key and a second `content.draft_created`.
- README §2a's WF08 row does not name the rule. The existing `content import` never overwrites, which gives de-facto dedupe per file, but no contract cites it.
- Fix: for `editorial.draft_job`, set `origin_ref` = asset ID + locale + ISO week (or the brief ID), or cite the import no-overwrite guard as the domain uniqueness.

**A6D2-09: README §2a gives no activation gate for five workflows and cites the wrong section for retention.** Owner: index.
- 04 §5 requires an activation gate for each workflow. The capability column reads "none" for WF00, WF10, WF11, SM01 and SM02. SM01 sends real email on the Brevo account, and SM02 posts to Telegram (FL-26 has G2). Neither names its gate, for example G2 for allowlisted smoke recipients, or G5 plus a dry run for WF11.
- The WF11 row cites "operational-data-model.md §6 retention classes". Retention is in §5; §6 is the event-to-row map. CX-31 checks names, not section numbers.

### P3 (carried from attempt 1, still reproducing; see `18-text-quotes.log`)

- **A6D-08 (data).** No event writes `bookings.rescheduled` or `no_show_recorded`. That second value is a further unreachable status. The reschedule sequence is undefined. This also bears on 04 §5 WF06, "cancellation/reschedule distinct".
- **A6D-09 (data).** The HMAC key for `contacts.email_hmac` is still unnamed (README §6 tracks it).
- **A6D-10 (data).** `consent_events` has no evidence column, but `op_record_withdrawal(…, evidence)` takes one.
- **A6D-11 (data).** The `expired` definition ("before a provider call started") is contradicted by T13 and T16.
- **A6D-14 (offers).** approval-scopes.md §3, l.72, still says a review beyond the first 100 "fails closed". It fails open when a reviewer's later CHANGES_REQUESTED falls beyond the first page and their earlier APPROVED at head is inside it (`08-verify-publication-source.log`: `latest.set` over the first page only).
- **A6D-15 (offers).** The routes.md §2 table cell "Basic Auth (503 without credentials)": 503 means the server credentials are unset, and a client without credentials gets 401.

I agree with README §5.1 that XL-02 to XL-08, XL-10, XL-12 to XL-16, XL-18 and XL-19 are P3. `validate.py` reproduces them as KNOWN.

## Owner summary

| Lane | Must fix (P2) | Should fix (P3) |
|---|---|---|
| data | A6D2-01, A6D2-02 | A6D2-03, A6D2-06, A6D2-07, A6D2-08, A6D-08 to A6D-11 |
| offers | none | A6D2-05, A6D-14, A6D-15 |
| index | none | A6D2-04, A6D2-09 |
| math | none | none (out of scope here) |

## Not run or not covered

- Numeric correctness of the workshop fixtures. The task excludes it, and I did not run the math lane validator.
- Runtime behaviour: browser network capture, providers, the n8n import and a real proxy. Nothing is implemented yet, and each such check is owned downstream.
- The Next docs claim about proxy body buffering is confirmed from the bundled 16.3.6 docs only. It is not tested (RT-PROXY-8 says so).
