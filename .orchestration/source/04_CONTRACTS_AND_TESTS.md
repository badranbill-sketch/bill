# Source transcription — 04_CONTRACTS_AND_TESTS.md

> Transcribed by A0 on 2026-09-30 from the operator-supplied handoff v1.0 (2026-09-29). §8 is the human-readable form of acceptance_catalog.json; A0 regenerates that JSON from this section. Every check starts not_run.

## Operational contracts, workflow inventory and acceptance

These are implementation contracts. Proposed paths/tables/endpoints are not claims that they exist. A0 freezes their final names against the existing repository before parallel coding.

### 1. Authority and data ownership

| Domain | Authoritative record | Never infer it from |
|---|---|---|
| Marketing consent | Versioned explicit consent/revocation evidence plus applicable provider suppression | Download, purchase, registration or a page view alone |
| Payment | Verified payment provider state/signature | Return-page query string, browser JavaScript or email text |
| Book consultation right | One durable entitlement derived from a verified order | A reusable hidden scheduling URL |
| Booking | Provider/calendar event or authorized documented reconciliation | Booking-link click |
| Attendance | Actual permitted provider/manual attendance evidence | Registration, Join click, missing report or replay view |
| Financial inputs | Visitor's private local workshop state | Marketing database or inferred wealth segment |
| Content approval | Real reviewer decision tied to exact artifact/claim hash | Agent score, draft status or old version approval |
| Publication | Actual live URL/provider publication ID + verified content version | A prepared draft, queued job or successful build |

Consent changes and provider blocklists can veto a send even when an older application record says subscribed. Avoid an "upsert" that accidentally resubscribes a blocked address.

### 2. Minimal operational data model

Use the fewest tables that correctly preserve consent, payment and job history. Names below are candidates, not a mandate to build a CRM.

- **contacts**: internal random ID, normalized email, optional first name, chosen language, minimal lifecycle state, provider contact ID, timestamps. Unique normalized email; no financial amount/age/health fields.
- **consent_events**: contact, purpose, granted/revoked state, text/version, timestamp, capture source and evidence reference. Retention/metadata policy approved; do not collect full IP/device fingerprints simply because a form library permits it.
- **webinar_events / registrations**: actual date/timezone, cap, language, provider link reference; contact/event uniqueness; registration/cancellation; verified attendance state or unknown with evidence source.
- **book_orders / consultation_rights**: provider order/payment IDs, product/version, payment state, fulfilment state, entitlement status and booked event reference. Shipping address remains with the payment/fulfilment system unless necessary to copy under approved handling.
- **bookings**: provider event ID, contact, offer ID, online/in-person, start/end UTC, status and evidence origin. No public detail access.
- **integration_events**: unique (provider, external_event_id), bounded non-sensitive event metadata, receive/processing status and reconciliation state.
- **delivery_jobs**: unique purpose key, contact/event/order reference, template/version, due/expiry, status, attempt count, lease, provider ID and last sanitized error.
- **audit_events**: minimal who/what/when for operational state, consent, release and human reconciliation; no copied financial inputs.

Approval ledgers can remain in Git with exact content hashes; do not create another CMS just for them. Ordinary visitor browsing does not require creating a contact row. A paid order is retained according to the approved business/legal schedule, not indiscriminately deleted with a newsletter unsubscribe.

### 3. Event envelope

```json
{
  "schema_version": "1.0",
  "event_id": "server-generated-uuid",
  "type": "guide.requested",
  "occurred_at": "RFC3339 UTC timestamp",
  "subject_id": "internal-random-id",
  "locale": "fr",
  "source": "approved-source-code",
  "resource_id": "approved-guide-version",
  "consent_reference": "optional-real-consent-id",
  "idempotency_key": "stable-key-for-this-accepted-action"
}
```

Permit only known event types and fields. Never attach arbitrary form bodies. Never use email addresses, account balances, retirement ages or questions in idempotency keys, URLs or analytics labels. Use separate internal records for necessary delivery recipients.

Event types include: guide.requested, marketing.opted_in, marketing.withdrawn, webinar.registered, webinar.cancelled, webinar.join_clicked, webinar.attendance_verified, workshop.access_requested, workshop.completed, book.payment_confirmed, book.refunded, book.dispatched, consultation.redeemed, meeting.confirmed, meeting.cancelled, meeting.held, content.draft_created, content.approved, content.published, delivery.failed.

workshop.completed is a minimal optional operational/consented signal. It contains no answers, calculated gap, selected financial-warning clip or inferred financial diagnosis. A self-selected general topic may be collected separately only with clear purpose and approval.

### 4. Ingress and job state

Public forms validate input, origin where applicable and rate/size limits. For every accepted operation, persist its authoritative record and job in a transaction, then return a truthful queued/accepted state. When storage is unavailable, do not show false success. The ungated approved guide remains available where safe.

Provider callbacks verify signatures/authentication using raw bodies where required; deduplicate before side effects. Narrowly exclude genuine callback routes from preview Basic Auth only when those routes enforce their own verification. An obscure URL is not sufficient authentication.

Proposed job state: pending → leased → sent/complete. Alternatives: retry_due, suppressed, expired, reconcile_required, dead_letter.

Claim due jobs atomically with a bounded lease. Use a stable purpose key such as internal contact ID + event ID + template ID + approved version. Check consent and current booking/suppression immediately before marketing dispatch. After a timeout that may have followed a successful provider action, reconcile by provider/event/job evidence; do not blindly resubmit.

Retries use an exponential bounded schedule and jitter with an attempt cap. Due/expiry are separate: an event reminder can expire before retries finish. Keep job creation and dispatcher restart idempotent. Redact provider errors before logging.

n8n calls scoped internal server operations or explicitly restricted database procedures. It does not accept a public url, SQL fragment, JavaScript snippet or template name that becomes arbitrary privileged work.

### 5. Fourteen workflow deliverables

All exports are disabled, version-labelled, import-tested in the pinned n8n version and free of credential values. Each has a README, input/output schema, fixture, failure example, ownership and activation gate.

| Workflow | Trigger and action | Required failure behavior |
|---|---|---|
| WF00 — intake/claim adapter | Authenticated durable-job claim/reconciliation | Replay and simultaneous claim cannot duplicate work |
| WF01 — contacts/consent | Accepted operational event → minimal Brevo sync | Never override revocation/provider blocklist |
| WF02 — message dispatcher | Short periodic schedule → due eligible jobs | Shared quota; operational priority; expiry; uncertain result reconciliation |
| WF03 — guide/workshop | Requested access/delivery and consented follow-up | No financial summary transmission; immediate site fallback |
| WF04 — event lifecycle | Actual event date/registration → confirmations/reminders/replay | No guest-list leak; cancel expired/remade event jobs; unknown attendance remains unknown |
| WF05 — book/fulfilment | Verified payment/refund/dispatch event → right and message | No duplicate entitlement, fake dispatch or unverified sale |
| WF06 — booking reconciliation | Supported provider/calendar read or operator import | Click is not booked; cancellation/reschedule distinct |
| WF07 — suppression/replies | Withdrawal/blocklist/qualifying human reply | Pending promotions stop; one human task, not an AI financial reply |
| WF08 — weekly article draft | Weekly due brief + approved Bill material + current sources | One draft per content key; bounded model spend; no automatic publishing |
| WF09 — approved publication handoff | Real version-bound approvals + explicit publication permission | Failed deploy/post does not mark published; LinkedIn manual package fallback |
| WF10 — health/operations report | Health, backup age, quota, jobs and actual calendar outcomes | Deduplicate alerts; no secrets/financial data in alert payloads |
| WF11 — approved retention/reconciliation | Scheduled review of data due for retention/deletion | Preserve legally/business-required evidence appropriately; dry-run before deletion |
| SM01 — RSS to email | Manual or explicit smoke schedule; approved feed and inbox | Treat content as data; limit size; empty/feed/SMTP failure visible |
| SM02 — webhook to Telegram | Authenticated bounded webhook to approved chat | Reject unauthenticated payloads; safe formatting; no token in export |

Use one dispatcher, not a long-lived Wait node per person for every nurture step. A moderate short schedule is enough initially; exact frequency follows tested latency and resource needs. Long-running model work cannot block payment/email delivery.

### 6. Email eligibility matrix

Requested guide/access, event logistics, receipts and scheduling messages are prepared for their stated purposes. Their legal classification is approved at G5; a technical "transactional" API does not make promotional content non-promotional.

Nurture requires recorded appropriate marketing permission. Unsubscribe is easy and prompt. New purchase/registration cannot silently regrant it. A meaningful reply or confirmed booking suppresses irrelevant appointment-solicitation messages. An internal client flag is set only by Bill/authorized operator, not inferred from a purchase.

Default proposed safeguards: one acquisition nurture message per contact per 48 hours, pause weekly newsletter collision with event reminders, operational priority, a configurable daily soft budget below Brevo's 300 total sends, reserved capacity and no stale reminders. Validate against real overlap: two reminders × registrants plus guide/receipt/other sends on the same day.

A small pilot registration cap is a human choice; do not use the meeting room's maximum capacity as the email budget. Before increasing event volume, calculate the busiest sending day and the number of actual available consultation slots.

### 7. Permission and feature flags

Default flags: public launch off; checkout live off; marketing dispatch off; automatic publication off; ads off; optional third-party tracking off. Test-mode integrations use recipient allowlists and sandbox payment keys.

Separate code_ready, provider_tested, approved, enabled, and live_verified. A single true cannot stand for all five. Content/media version changes invalidate affected approval, not unrelated verified code. Permissions are scoped to the action and asset hash.

### 8. Acceptance catalog

The machine-readable catalog is acceptance_catalog.json. Every check starts not_run. It specifies future implementation tests, not test results. Format: ID — Title | Method | Required evidence.

- BASE01 — Preserve and reproduce the actual baseline | Inspect git status and branch graph; clean install and run existing check commands without modifying guards. | Commit SHA, dirty-tree handling, command logs and observed failures.
- BASE02 — No regressions in chosen site | Exercise both language routes and existing guide/journey/contact paths at supported widths. | Before/after screenshots, browser logs and regression results.
- AUTH01 — No unauthorized operational data access | Attempt anonymous and other-identity reads/writes of contacts, orders, rights and jobs. | Denied access tests plus RLS/grant review.
- AUTH02 — No secrets in client/source/artifacts | Scan bundle, source, exports, logs and screenshots; inspect public environment prefix use. | Scanner output and manually inspected bundles.
- AUTH03 — Verified ingress and validation | Send invalid signatures, stale/replayed requests, oversized/malformed bodies and foreign-origin form posts. | HTTP results and unchanged durable state.
- AUTH04 — Staging stays separate and private | Access staging without credentials and test callback-specific verification; compare provider/database IDs. | Access tests, configuration names, recipient allowlist evidence.
- AUTH05 — No privilege escalation through agent or content input | Inject instructions/URLs into RSS, forms and notes; verify data never becomes commands or new tool authority. | Adversarial fixtures and resulting safe behavior.
- INF01 — n8n loopback and TLS | Inspect compose/ss/docker ports and external probes; inspect proxy and HTTPS chain. | Only intended public ports; hostname and editor authentication evidence.
- INF02 — Pinned supported n8n setup | Resolve exact official image tag/digest and version-supported variables; validate Compose and start clean. | Image digest, version, startup logs and Compose validation.
- INF03 — Encryption key recovery works | Restore encrypted credentials into isolated instance using separate backed-up original key. | Isolated decryption/use evidence without exposing values.
- INF04 — Consistent nightly backup and retention | Run backup twice, inject failure, verify data/exports/checksums and fourteen successful daily sets. | Manifests, failure alert and retained known-good snapshot.
- INF05 — Off-host restore and update rollback | Restore to separate blocked-egress environment; exercise pinned update and failed health check. | Measured recovery, compatible version/data pair and no real side effects.
- INF06 — Supabase restore and media separation | Restore database/schema and required object manifest into isolated test project/store. | Counts/checksums, RLS restored and object availability.
- INF07 — No production first-boot takeover | Verify owner setup is inaccessible to arbitrary internet user until legitimate owner establishes account. | Bootstrap access procedure and authentication check.
- WK01 — Units and missingness | Test zero versus unknown, month/year conversion, household basis, invalid numbers and field limits. | Independent deterministic unit fixtures.
- WK02 — Inflation and timing math | Test zero inflation/return, known closed forms, later starts, start/end-year conventions and nominal/real handling. | Independently computed fixtures and tolerance results.
- WK03 — No false sufficiency verdict | Use gross/net mismatch, incomplete income, housing-only wealth and overlapping pension asset/income cases. | Explicit warnings/no verdict; reviewer output.
- WK04 — Private figures remain local | Enter synthetic distinctive amounts; inspect all requests, analytics, errors, logs and storage. | Network capture proves no amounts/derived financial profile leaves browser.
- WK05 — Navigate/edit/reset | Complete, go back, edit, skip, refresh and reset; test optional local-save expiry/shared-device disclosure. | State-machine/browser test results.
- WK06 — Branch precedence and truthful media | Test all clip-rule overlaps and fallback; verify disclosure and actual media/captions. | Rule matrix, playable IDs and no false personal-review copy.
- WK07 — Useful independent summary | Finish without email or booking and print/export; inspect assumptions and accessible data. | Readable local summary/PDF/print and no mandatory upsell.
- UX01 — Phone and desktop accessibility | Keyboard, focus, screen-reader spot test, contrast, zoom, reduced motion, 320/390/768/1440 widths. | Screenshots, a11y scan and manual walkthrough notes.
- UX02 — Real iPhone Safari walkthrough | Use actual available iPhone Safari for video/form/print/booking; if unavailable record blocked not pass. | Device/version, steps and observed issues.
- UX03 — Professional ink family | Render all eight in context and mobile crops; inspect perspective, hatching and accidental artifacts. | Approved contact sheet, source files, alt text and rights manifest.
- MED01 — Real approved recordings | Compare manifest against supplied Bill recordings, rights, transcripts and actual clip durations. | Playable files, checksums, caption checks and permission refs.
- MED02 — Bandwidth/playback behavior | Measure real encode sizes; test seek/range, buffering, no-autoplay audio and caption behavior. | Media-origin test and usage estimate.
- EV01 — Correct event details and private invites | Register external test guests in chosen language; verify time zone/link/ICS/cap; inspect recipient visibility. | Received individual invitations and no exposed guest list.
- EV02 — Fair cases and scoring | Independently solve all ten cases from disclosed facts; check sources and hidden-reveal scoring. | Answer-key audit and timed rehearsal.
- EV03 — Meet works for external attendees | Test outside-organization phone/desktop guest, host/moderator, polls/chat and recording disclosure. | Actual tenant/feature evidence and rehearsal checklist.
- EV04 — Attendance truthfulness | Exercise registered, join_clicked, verified attended and unknown states. | No-show branch never inferred from missing/unavailable evidence.
- MAIL01 — Delivery not just API acceptance | Send approved test messages to allowlisted inboxes; verify headers, body, language, links and actual receipt. | Provider ID plus inbox evidence, no exposed credentials.
- MAIL02 — No silent marketing enrolment | Request PDF/event without opt-in and separately opt in; inspect eligibility and records. | Consent fixtures and no unauthorized promotional sends.
- MAIL03 — Unsubscribe wins races | Withdraw consent while a job is queued/leased; upsert contact after blocklist and retry old job. | Suppressed send, no automatic resubscribe and audit record.
- MAIL04 — Shared quota and expired reminders | Forecast overlapping campaigns; force 429/daily cap/restart and event-time expiry. | Priority/cap behavior, no overdue reminder and operator alert.
- MAIL05 — No duplicate send on uncertain timeout | Simulate provider accepted request then response lost; restart worker and reconcile. | Stored provider/job state, documented uncertainty handling.
- AUTO01 — Import works in selected n8n version | Import each disabled export and validate credentials/nodes manually with fixtures. | Actual workflow IDs, version and import logs.
- AUTO02 — Atomic job claim and retry | Run simultaneous worker claims, replay same source event, crash mid-job and re-run. | Unique event/job rows, lease recovery and bounded retries.
- AUTO03 — Smoke integrations work | Run RSS-to-email and authenticated Telegram webhook to approved test recipients; test failure cases. | Imported workflow IDs, actual received messages and safe rejection.
- AUTO04 — Manual fallback reconciles | Use documented manual fulfilment/booking/posting path; record ID; resume automation. | No duplicate or lost action after operator reconciliation.
- PAY01 — Payment truth and deduplication | Replay signed paid webhook; send redirect-only and unpaid/failed/asynchronous fixtures. | No entitlement until verified paid; one right/order.
- PAY02 — Rights redemption and rescheduling | Redeem another identity, expired/used token, duplicate request and valid buyer reschedule. | Unauthorized denied; existing right preserved once.
- PAY03 — Refund/cap/fulfilment consistency | Test approved refund behavior, stock/calendar cap and dispatch failure. | Correct rights/fulfilment ledger and no fabricated shipment.
- BOOK01 — Actual calendar is authoritative | Book/cancel/reschedule with cross-calendar conflict, buffer, DST and online/in-person variants. | Provider event IDs and no double-booked slot.
- BOOK02 — No false conversion from clicks | Visit scheduling page without booking; reconcile actual test booking and cancellation. | Only actual event/operator evidence changes booked state.
- CNT01 — Inventory exists and is substantive | Count and read all required scripts/briefs/templates/drawings, not filenames only. | Asset manifest with completeness review.
- CNT02 — No fabricated Bill claims | Check every client anecdote, experience/designation, first-person philosophy and promise against approved sources. | Claim ledger and flagged/removed unsupported copy.
- CNT03 — Financial claims are current and reviewed | Follow primary sources for jurisdiction/date; independently check arithmetic and meaning. | Source ledger and real reviewer approval refs.
- CNT04 — Bilingual meaning and natural voice | Read scripts aloud; verify FR/EN terms, offer durations and unsupported overclaims. | Bill/reviewer notes and matched versions.
- CNT05 — Approval hashes cannot be bypassed | Modify approved title/body/claim/clip and try publishing; edit approval ledger as worker. | Release blocked; only genuine latest approvals accepted.
- CNT06 — Weekly publication is controlled | Run draft job twice, reject draft, expire approval, fail deploy and fail LinkedIn publish. | One draft/week, no unauthorized publication, ready-to-post fallback.
- SEO01 — Public content is crawlable and truthful | Check robots/canonicals/hreflang/sitemap/status/structured data and protected drafts. | HTTP/schema results and correct indexing boundaries.
- ADS01 — Current category/permissions verified | Review current official/account-specific rules and permitted targeting, creative and audiences. | Dated operator/account evidence; no unsupported age-targeting claim.
- ADS02 — No financial tracking leakage | Inspect pixel/server events before/after consent, route and payload allowlists. | No financial inputs, hidden personal profiling or unauthorized tags.
- ADS03 — Budget and destinations match approval | Test every ad CTA; compare active scope/spend cap to human authorization. | Approved campaign IDs, working destinations and cap evidence.
- OPS01 — Fail safely during outages | Disable email/DB/media/integration in staging and interrupt deployment. | Helpful user states, durable accepted work or honest retry error, no fake success.
- OPS02 — Actionable operator report | Seed pending rights/orders, provider failures, quota warnings and booking gaps. | One readable report with owner, event ID and next action.
- OPS03 — Privacy and deletion procedure | Exercise access/deletion with order/consent retention constraints in fictional data. | Approved retention behavior, minimal suppression retained appropriately.
- REL01 — Manifest/rollback match tested version | Compare artifact hashes, approved media, migrations, workflow versions and active flags. | Signed/scoped human release ref and reproducible rollback.
- REL02 — End-to-end invited pilot | An external tester completes guide, workshop, event join, booking and test book path. | Timestamped user journey evidence and fixed P0/P1 findings.
- GROW01 — Weekly metrics reflect real outcomes | Reconcile provider/calendar/operator outcomes to source cohorts; show unknown attendance. | Held-meeting counts and denominators without invented conversion results.
- GROW02 — One measured change with limits | Review 30/60/90-day cohorts and actual time/cost; approve one experiment at a time. | Decision log, actual budget and no autonomous spend increase.
- HAND01 — Owner can operate and recover | Run an owner walkthrough, renewals review, rights/keys transfer and isolated recovery. | Owner acceptance, revoked temporary access and complete runbooks.
