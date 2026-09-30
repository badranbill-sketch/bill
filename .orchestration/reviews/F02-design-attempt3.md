# F02 independent design review (A6, contract/privacy/design, attempt 3 of 3)

- Reviewer: A6, fresh context. This is technical verification only. It is not an approval, it records no G0–G6 decision, and it does not sign for Bill or the firm.
- Subject: `.orchestration/contracts/` (contract set 1.0, untracked, 407 files) after the lanes' repair attempt 3 and the integrator's repair attempt 3. Base HEAD `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b` on `claude/orchestration-foundation`. Date 2026-09-30.
- Out of scope: the numeric correctness of the workshop fixtures, which the math verifier covers. I read the workshop contracts only for privacy and cross-contract consistency, and I did not run the math lane validator.
- Evidence: `.orchestration/evidence/F02/a6-design-attempt3/`. It holds logs 00–22 and the scripts that produced them. I ran every command below in this session. I did not rely on the implementers' logs or on the logs of attempts 1 and 2.
- Writes: only this file and that evidence folder, plus one scratch copy of `contracts/` in the session scratchpad for a negative control.
  - No commits, no pushes, no network, no connector calls.
  - The sha256 of all 407 contract files is the same before and after the review (`00-…before.txt` and `21-…after.txt`).
  - Read-only scripts ran in the F00 codex scratch worktree. Its pre-existing ` M next-env.d.ts` did not change.

## Verdict: pass

| Class | Count | IDs |
|---|---|---|
| P0 | 0 | |
| P1 | 0 | |
| P2 | 0 | |
| P3 | 18 | 7 new: A6D3-01 to A6D3-07. 11 carried: A6D2-03, A6D2-05 to A6D2-08, A6D-08 to A6D-11, A6D-14, A6D-15 |

- **What changed since attempt 2.** The lanes closed both P2 findings of attempt 2, A6D2-01 and A6D2-02. The integrator closed the two index findings, A6D2-04 and A6D2-09. I re-verified each one (table below).
- **Why this passes.** I found nothing at P0, P1 or P2. Each new item is P3:
  - five are gaps where a downstream task must add a rule or name, and none leaks data or breaks a frozen offer;
  - two are contradictions on paths that no 1.0 writer can reach today (A6D3-02) or that already have a sanctioned manual fallback (A6D3-03).
- **What the P3 items still need.** They are listed with owners for A0 to schedule. None blocks dispatch against 1.0. If A0 fixes any of them after acceptance, README §3 rule 8 no longer applies, and the fix bumps the version.

## What I checked, and the result

| Check | Evidence | Result |
|---|---|---|
| `validate.py` runs clean | `01-validate-py.log` | exit 0; pass 351, fail 0, known 16 (XL-02 to XL-08, XL-10, XL-12 to XL-16, XL-18 to XL-20), info 2. NC-1 to NC-14 all caught. |
| Every example, re-validated by my own script | `02-examples-independent.log` (`check_examples3.py`: plain `jsonschema` and a strict ECMA-style `$`) | 55 valid examples pass. 135 invalid examples fail on the schema, including all 24 envelope examples. The other 10 are schema-valid by design. Each names a harness rule in its `.why.txt`, and `validate.py` rejects each one for exactly that rule (log 01, l.536–615). Plain and strict modes agree on every file. |
| PII in the idempotency key; amount fields | `03-adversarial.log` (`adversarial3.py`: 20 envelope, 7 job and 11 offer instances, none from attempts 1–2; 38 of 38 as expected) | **Amounts cannot be added.** The envelope and job are closed, so these are rejected: an object `resource_id` with an amount (ADV3-06), a homoglyph property (ADV3-07), an empty-name property (ADV3-08), a `recipient_email` field (JOB3-03), a provider error body (JOB3-04), and a content-form code with a number on `workshop.completed` (ADV3-09). **A readable email cannot go in the key.** Rejected: `ik1_jean…@…` (ADV3-03), a zero-width character (ADV3-04), a JSON number (ADV3-05). **An encoded email can.** ADV3-01 (hex of an email) and ADV3-02 (unkeyed sha256 of an email) are schema-valid. Only the server-side HMAC construction excludes them, and no rule or test asserts it (A6D3-01). ADV3-15: an all-zero placeholder `con_` is schema-valid and forbidden only by EV-BOOK-1 at runtime. |
| Offer matrix: no 60 minutes, no invented price | `03-adversarial.log` OFF3-01 to 11; `04-offer-price-citing-frozen-row.log` | Rejected: two questions; `"30"` as a string; a free book; a 60-minute buffer smuggled into the capacity proposal; cap 8 while pending; 49.95 CAD while pending; an hourly rate on continued work; `zoom_workplace`; 60 minutes in a fixture; 30.5 minutes; a decimal price. OFF3-12, on a scratch copy: a price recorded in the authoritative instance citing D-003, a frozen-by-plan row that names G0, fails CX-16 (exit 1). |
| Routes against the real `lib/routes.ts` | `05-route-proxy-source.log`, `14-route-collisions.log` (`routes3.py`) | Blob `7592590` (9 keys) on main, codex, guide, video and add-ask-bill. The homepage branch has `c094895`, which adds `ask`. For the 10 proposed keys and 20 slugs: no key or slug collision, no shadowing of `guide-retraite/` or `retirement-guide/`, no reserved first segment, ASCII only. The asset-manifest `intended_route_key` enum equals existing keys + `ask` + proposed keys. XL-12 (`articles`, `ask`) reproduces. |
| routes.md describes `proxy.ts` correctly | `05-…`, `06-codex-route-facts.log`, `07-route-detail-facts.log`, `13-next-docs-and-csp.log` | Accurate: the matcher, the `draft` regex, `needsAuth`, 404 when review is off, 503 when server credentials are unset, 401 with `WWW-Authenticate`, the headers set before launch or on a draft path, the after-launch table, `robots.ts`, `sitemap.ts` iterating every key, `/api/guide` codex-only and 404 after launch or with review off, the 12 000-byte inquiry stream limit, the StandardPage `cta` rule on main and codex, the header CTA, `launchApproved()` with 8 approvals, `localReview()`, and the `generateMetadata` assumption. The Next 16.3.6 docs confirm body cloning with a 10 MB default and the "Execution order" warning. Only the A6D-15 cell remains. |
| approval-scopes describes the hash-bound mechanism | `08-approval-mechanism-source.log`, `09-articles-guards-source.log`, `10-fingerprint-rerun.log`, `11-pagination-fail-open.log` | Accurate: `verify-publication.ts` (blob `393d8d6`, same on all six branches), `CONTENT-WORKFLOW.md`, `verify.yml`, `approvedArticle`, `approvals.json` = `{}`, no CODEOWNERS on any branch, the `content.ts` and `protections.ts` guards, and the blob equality with main for all 13 files named. I re-ran the real `parseArticle` (zod 4.6.5): 8 of 8 §3 claims hold (key order, source-object key order and indentation are ignored; excluded fields; array order and URL case count; unknown source key stripped; unknown top-level key throws). The one exception is "fails closed", which is still wrong (A6D-14, replayed in log 11). Human approval stays separate from agent verification: §7, AS-SEP-1 to 3, AS-GATE-1 and 2, AS-WRITE-1 and 2, FF-APPR-1, OM-DOC-2, AM-APPR-2. |
| Privacy boundary is concrete and testable | privacy-boundary.md and `data-flow-register.json` read in full | Yes. 18 data classes, 26 sinks, 29 flows. No flow uses a sink outside its class's `allowed_sinks`. FL-04 and FL-05 forbid DC-FIN-* on every non-browser sink by name: app server, logs, Supabase, n8n, Brevo, Stripe, scheduler, analytics and ads, error monitoring, URL, cookies, LLM, media origin and more. PB-SCAN-1 to 3 are machine lists. The WK04 canary and media procedures can be run. PB-CAL-3 and FL-29 keep the invitee address transient and out of n8n. |
| 04 coverage | 04 §1–§7 read against the contracts | Authority: 8 domains. Data model: 8 groups in 10 tables. Envelope: 10 fields. Event types: the 20 of 04 §3, in order. Job states: 9, with 19 transitions. Workflows: 14, traced in README §2a with activation gates. Email: E01–E16, FC-1 (48 hours), FC-2 (reminder collision), a budget of 250 below 300 with a 150 reserve, a hard stop at 280, and a busiest-day forecast. Flags: 6, all defaulting to false. Readiness: 5 separate states. Gaps: A6D2-06, A6D2-08, A6D-10, A6D3-07, XL-18 (tracked). |
| Nothing claims a proposed path exists | `12-proposed-paths.log` (`paths3.py`, six branches plus working tree) | 366 references exist. 49 are absent and labelled proposed in their line, heading or lead. The 6 flagged by the script are not path claims: `release.json` (labelled proposed in §1 and §5 of the same file), a slug, `middleware.ts` named as the convention replaced, `_next/static` and the math notation `p/q`. |
| README index complete | `15-readme-index.log` | Every top-level file and every example and fixture folder is indexed. Stated example counts equal the files (26/24, 12/19, 5/14, 3/22, 2/22, 2/17, 5/27; 36 WM plus 2). No stray file. |
| Cross-contract names and enums | `20-enum-spot-checks.log` (`enums3.py`) and log 01 CX-01 to CX-31 | Consistent: every source code named in prose is in the enum and every enum value is used; the suppression codes of the job schema and the registry are equal and all used; defer reasons and error codes appear in the state machine; every `op_*` named is defined. Exceptions: A6D-08 and A6D3-02 (new, below). |
| F02 handoff | `17-handoff-F02.log` | `--handoff` exit 0. My own recount: 431 artifact hashes match, every contract file is listed, `base_commit` = HEAD, status `submitted`. |
| Lane validators; are they read-only? | `18-lane-validators.log` | data 298/0, offers 92/0. The tree hash over contracts, lane evidence and handoffs is the same before and after. |
| Forbidden offers and tools | `16-forbidden-terms.log` | 60 minutes, one hour, Zoom, n8n Cloud, Vercel Hobby, a custom video platform and a live customer-facing LLM appear only as prohibitions. The other hits are not offers: "1-hour" is the E08 reminder timing, "60 s" is a backoff, and 60 is used as an age or horizon. |

### Repair of attempt-2 findings (re-verified)

| Attempt-2 ID | Status now | How I checked |
|---|---|---|
| A6D2-01 (withdrawal vs leased job) | fixed | One rule in all five places: T3 (pending and retry_due only), T5 (the pre-send check is the only way from leased), JS-SUPP-1 to 3, the `op_record_withdrawal` row, AM-CONSENT-2, the envelope's `marketing.withdrawn` row and privacy-boundary §6 (`19-text-quotes.log`). The schema now rejects the race record: my JOB3-06 (suppressed with `send_started_at`) is rejected, and so are JOB3-05 (`sent_at`) and JOB3-07 (retry_due with a marker). JS-SUPP-3 serializes a withdrawal with the send marker on the contact row. |
| A6D2-02 (booking-to-contact join) | fixed | EV-BOOK-1, AM-BOOK-3 to 6, PB-CAL-3, FL-29, `bookings.contact_match` and `op_accept_event` define the join: an exact normalized-address match through `email_hmac` against contacts that are active or suppressed, with the address never stored. They also define the unmatched case: row stored, no event, no job, no contact, listed for the operator (OPS02); a later operator join emits `meeting.confirmed`. FL-29 stays inside DC-CONTACT's allowed sinks. `already_booked` and `already_rebooked` count joined bookings only, and E15 and E16 say so. Two P3 follow-ups: A6D3-03 (booking-to-right link) and A6D3-04 (WF06 n8n role). |
| A6D2-04 (trailing newline accepted) | fixed | `ecma_translate` maps `$` to `\Z`, and `.` and `\s` to the ECMA sets. It refuses `\d`, `\w`, `\b`, `\p` and named groups. S2 reports 93 patterns translated and no `patternProperties`. NC-13 passes. My strict checker agrees with it on every example. |
| A6D2-09 (activation gates, section citation) | fixed | README §2a has an activation-gate column. I recomputed WF01, WF03, WF04, WF05, WF06, WF09 and SM01 by hand from approval-scopes §2 and feature-flags §4, and each cell is right. WF11 now cites operational-data-model.md §5. CX-31 and NC-14 pass. |

## Findings

All findings are P3. Each one reproduces from the logs named.

### P3 (new in attempt 3)

**A6D3-01: no rule or test says the server derives `idempotency_key` from the §4.3 tuple. An encoded email in the key is schema-valid.** Owner: data.
- Reproduction: `03-adversarial.log`, ADV3-01 and ADV3-02.
  - `ik1_` + the hex of `jean.tremblay@example.com` (zero-padded) is accepted.
  - `ik1_` + an unkeyed `sha256(email)` is accepted.
  - A search for any rule that the key is recomputed or derived finds none (`grep` in `19-text-quotes.log`; no EV-KEY rule exists).
- Expected: event-envelope.md §4.3 makes the key an HMAC with `EVENT_KEY_SECRET` over (type, subject_id, resource_id, origin_ref). A testable rule should back that, as JS-KEY-1 does for purpose keys. For example: "EV-KEY-1: producers compute the key only from that tuple with the server secret, never from request input or an address; P02 unit tests recompute it from a fixture tuple."
- Actual:
  - Only the prose construction and "browsers never emit envelopes" exclude these values. The schema cannot.
  - A plain hash of an email is linkable by dictionary. PB-ADS-2 itself treats a hashed email as personal data.
- Why P3: the server builds every envelope, and a correct HMAC leaks nothing. This is a missing test hook, not a leak.

**A6D3-02: the state machine suppresses every job for a suppressed contact, but the registry leaves `contact_suppressed` off E12–E15. No 1.0 writer sets `lifecycle_state = 'suppressed'`.** Owner: data.
- Location:
  - job-state-machine.md §6 step 4 applies to every job: "The contact is not suppressed or erased … (`contact_suppressed`, `provider_blocklist`)".
  - email-eligibility.json: `suppressions` of E12, E13, E14 and E15 omit `contact_suppressed`. The other twelve templates list it.
  - PSC-4 ("contact lifecycle allow[s] the send") does not settle it.
  - AM-BOOK-3 joins bookings to `suppressed` contacts too.
- Reproduction: `22-e12-e15-contact-suppressed.log` (E12 to E15 → False; the only `lifecycle_state` lines are the column definition, its check and the retention row).
- Expected: one rule for whether a receipt, redemption instructions, dispatch notice or meeting logistics go to a contact whose lifecycle is `suppressed`. Also, a named writer and meaning for that state, since `operator.suppression` emits `marketing.withdrawn` (consent), not a lifecycle change.
- Actual: N02 must choose. One reading withholds E13, the consultation redemption instructions, from a paying buyer. The other sends operational mail to a contact marked suppressed.
- Why P3: no contract operation writes `suppressed` today, so the conflict is latent.

**A6D3-03: nothing links a provider booking to a consultation right, so `consultation.redeemed` from `provider.booking_sync` cannot legitimately be produced.** Owner: data (with offers for routes.md).
- Location:
  - authority-matrix.md AM-BOOK-3: "A join never redeems a consultation right by itself. `consultation.redeemed` follows AM-RIGHT-1." AM-RIGHT-1 requires the buyer's tokenized flow or a reviewed manual process.
  - routes.md §3.2 `POST /api/book/redeem`: protection "token, or operator", event source `provider.booking_sync` or `operator.reconciliation`. No `site.*` source is allowed for the type.
  - The data model has `bookings.right_id`, `consultation_rights.booking_id` and `redemption_token_hash` ("only if the token design … is approved"). It names no operation or column that ties the tokenized step to the later provider booking.
- Reproduction: `19-text-quotes.log`, section "booking-to-right link".
- Expected: either "in 1.0 a right is redeemed only by operator reconciliation", or the link is named. For example, a per-right single-use scheduling reference stored on the right and matched by the booking adapter.
- Actual:
  - Under the texts as written, only `operator.reconciliation` can redeem.
  - U03 and N06 would have to invent the link and a column for PAY02 ("redeem another identity, expired/used token, duplicate request").
  - A reusable scheduler link could be booked twice with one right until the operator notices.
- Why P3: AM-RIGHT-1 and 01 §11 already sanction the reviewed manual process, so the customer path works. What is missing is the automation contract.

**A6D3-04: WF06 is where 04 §5 puts the provider or calendar read, but PB-CAL-3 forbids the invitee address from reaching n8n. No contract names the server-side read that WF06 must call.** Owner: data (README §2a trace: index).
- Location:
  - 04 §5 WF06: "Supported provider/calendar read or operator import".
  - PB-CAL-3 and FL-29: the address "never reaches … n8n", and the adapter computes `email_hmac` "in application-server memory".
  - README §2a WF06 lists only `op_accept_event`.
  - operational-data-model.md §4 has no sync operation. The internal API is the generic `app/api/internal/automation/*`.
- Reproduction: `19-text-quotes.log`, section "WF06 n8n role".
- Expected: say that WF06 only schedules an app-server booking sync, and name that operation or endpoint. Otherwise N06 should implement no n8n provider read at all.
- Actual: the natural n8n build uses a Google Calendar or Calendly node. That would put invitee addresses and names in n8n execution data, against PB-CAL-3. Nothing in the WF06 row warns against it.

**A6D3-05: PB-MEDIA-4 and PB-MEDIA-2 depend on the codex security headers, but no contract mentions them or the shared-file change they need.** Owner: data.
- Location: codex `next.config.ts` (`13-next-docs-and-csp.log`) sets:
  - `Content-Security-Policy: default-src 'self'; … connect-src 'self'` with no `media-src` and no `blob:`;
  - `Referrer-Policy: strict-origin-when-cross-origin` site-wide.
- What depends on them:
  - PB-MEDIA-4 names Blob-URL playback as its example.
  - D-026 leaves open a media origin that may be separate.
  - PB-MEDIA-2 requires `no-referrer` or `same-origin` on media requests.
  - The shared-file patch list (routes.md §7) omits `next.config.ts`.
- Expected: the privacy boundary names the CSP and referrer changes each PB-MEDIA-4 variant needs, as a proposed shared-file patch for A0 with independent review.
- Actual:
  - Under the current header, a media origin other than `'self'` is refused (`media-src` falls back to `default-src`).
  - Blob playback relies on a scheme the policy does not list. I did not browser-test this.
  - The site-wide referrer policy sends the site origin to a cross-origin media host, which PB-MEDIA-2 does not allow.

**A6D3-06: no rule says the runtime refuses an offer matrix whose `document_kind` is `fixture`.** Owner: offers.
- Reproduction: `examples/valid/offer-matrix/fixture-all-gates-recorded-fictional.json` validates. It has `document_kind: fixture`, `sale_state: on_sale` and a recorded price of `{amount_minor: 1, currency: "XXX"}`.
- What exists: offer-matrix.md §7 asks the U02 and U03 loader to run the harness rules. README §1 names the authoritative path.
- Expected: a rule that a production or staging loader accepts only `document_kind: authoritative`, the analogue of AM-KIND for manifests and FF-ENV for flags.
- Actual: nothing forbids U03 from loading a fixture matrix and presenting a fictional recorded price.
- Why P3: the fixture price is 1 minor unit of `XXX`, which Stripe would refuse.

**A6D3-07: two 04 §5 failure behaviours are neither traced in README §2a nor tracked the way XL-18 tracks two others.** Owner: index.
- The two behaviours:
  - WF10: "Deduplicate alerts".
  - SM01: "limit size; empty/feed/SMTP failure visible".
- Reproduction: `grep -n -i dedup README.md` finds nothing. The WF10 and SM01 rows cite PB-LOG, BUD-3 and PB-LLM-2 only (`19-text-quotes.log`).
- Expected: add both to the rows' "rules" cell as "04 §5 directly", or to XL-18.

### P3 (carried from attempts 1 and 2; each still reproduces, `19-text-quotes.log`)

- **A6D2-03 (data).** No rule says the server stamps `occurred_at` for `site.*` sources.
- **A6D2-05 (offers).**
  - asset-manifest.md l.89 still says the envelope "does not yet accept `companion`, `ink`, `book`, `event` or `copy`". The offers validator prints "not yet: []".
  - l.16 still says an age or amount "cannot be encoded" in an asset ID. Words can be.
- **A6D2-06 (data).** E09 has no creation path. The operator setting `replay_available_at` emits no event, calls no operation and writes no audit action.
- **A6D2-07 (data).** PB-FIN-5 and the WK04 canary expect "no non-static request". They do not name the two allowed workshop POSTs (routes.md §3.2 l.100–101), and they do not say that navigating away ends the window.
- **A6D2-08 (data).** "One draft per content key" (04 §5 WF08, CNT06) has no rule, and the `editorial.*` origin (content sha256) cannot enforce it.
- **A6D-08 (data).** No event writes `bookings.status` `rescheduled` or `no_show_recorded`, and the reschedule mapping is undefined (README §2a WF06 says so).
- **A6D-09 (data).** The HMAC key for `contacts.email_hmac` is still unnamed. It now also carries the booking join (AM-BOOK-3). It is tracked in README §6 with an owner.
- **A6D-10 (data).** `consent_events` has no evidence-reference column. 04 §2 lists one, and `op_record_withdrawal(…, evidence)` takes one. `audit_events.evidence_ref` can hold it, but no rule says so.
- **A6D-11 (data).** §2 defines `expired` as "before a provider call started", but T13 and T16 expire after a call.
- **A6D-14 (offers).** approval-scopes.md l.72: "fails closed". Replayed in `11-pagination-fail-open.log`: an APPROVED review within the first 100 and a later CHANGES_REQUESTED at review 101 pass the script's first-page logic. The check fails open. `docs/CONTENT-WORKFLOW.md` l.22 makes the same claim, so the fix also concerns that existing doc.
- **A6D-15 (offers).** The routes.md §2 cell "Basic Auth (503 without credentials)": 503 means the server's review credentials are unset. A client without credentials gets 401.

I agree with README §5.1 that XL-02 to XL-08, XL-10, XL-12 to XL-16 and XL-18 to XL-20 are P3. `validate.py` reproduces each one as KNOWN.

## Owner summary

| Lane | Must fix (P0–P2) | Should fix (P3) |
|---|---|---|
| data | none | A6D3-01 to A6D3-05, A6D2-03, A6D2-06 to A6D2-08, A6D-08 to A6D-11 |
| offers | none | A6D3-06, A6D2-05, A6D-14, A6D-15 |
| index | none | A6D3-07 (and the README §2a side of A6D3-04) |
| math | none | none in this review's scope |

## Not run or not covered

- Numeric correctness of the workshop fixtures, and the math lane validator. Both are excluded by the task.
- Runtime behaviour: browser network capture, CSP enforcement of `blob:` (A6D3-05), providers, n8n import, a real proxy and raw-body signature checks. Nothing is implemented yet, and each check is owned downstream (WK04, AUTH03, AUTO01, BOOK01).
- The Next body-buffering claim (RT-PROXY-8) is confirmed from the bundled 16.3.6 docs only, not by a request.
- This review is technical verification. Every G0–G6 decision named in the contracts remains with its human owner.
