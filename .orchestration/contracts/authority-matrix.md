# Authority matrix: "never infer X from Y" (contract 1.0)

- Task F02, data lane. **Status: proposed, submitted, not accepted.** This file restates the frozen 04 §1 table (D-040) as testable rules; it does not change it. Paths, tables, sources and procedures are **proposed** unless marked existing.
- Base: HEAD `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b`; repository names checked against `origin/codex/desktop-iphone-unified@66cce52`.
- Where a rule is already enforced by a schema in this lane, the table names the schema rule and the invalid example that proves it. Runtime enforcement belongs to the named downstream task.
- Repair attempt 3 (design review `F02-design-attempt2.md`):
  - A6D2-01: AM-CONSENT-2 now matches job-state-machine.md. A revocation suppresses `pending` and `retry_due` jobs, and a leased job is stopped at its own pre-send check.
  - A6D2-02: AM-BOOK-3 to AM-BOOK-6 define how a booking is joined to a contact, what happens to a booking that matches no contact, and how far `already_booked` reaches.

## 1. Matrix

| Domain | Authoritative record | Only event and source that may assert it | Never infer it from | Schema enforcement (F02) | Runtime owner and check |
|---|---|---|---|---|---|
| Marketing consent | Latest `consent_events` row per contact and purpose (explicit capture, wording version, time, source), plus the provider's suppression | `marketing.opted_in` / `marketing.withdrawn` from `site.consent_capture`, `site.optin_confirmation`, `site.preferences`, `site.unsubscribe`, `provider.brevo_webhook`, `operator.suppression`, always with `consent_reference` | A download, purchase, registration, workshop access request, page view, reply or booking | `consent_reference` required on consent events and forbidden on every other type (`invalid/event-envelope/consent-on-guide-request`); promotional jobs require `consent_reference` (`invalid/delivery-job/promotional-without-consent`) | U04, N01, N02, N07 (MAIL02, MAIL03) |
| Payment | Verified Stripe state and signature (signed webhook, event ID, current payment status) | `book.payment_confirmed`, `book.refunded` from `provider.stripe_webhook` only | The return-page query string, browser JavaScript, email text or an operator's reading of an email | per-type source enum (`invalid/event-envelope/payment-confirmed-by-operator`, `unknown-source`) | U03, N05 (PAY01) |
| Book consultation right | One `consultation_rights` row per verified paid order (unique `order_id`), `duration_minutes = 30` | Created only by the transition of an order to paid; redeemed via `consultation.redeemed` from `provider.booking_sync` or `operator.reconciliation` | A reusable hidden scheduling URL, a click, a second webhook, a second checkout session | resource kind `rgt_` on `consultation.redeemed` | U03, N05, U02 (PAY01, PAY02) |
| Booking | The provider or calendar event, or an authorized, documented operator reconciliation. The contact it belongs to comes only from the exact-address join of AM-BOOK-3. | `meeting.confirmed`, `meeting.cancelled` from `provider.booking_sync` or `operator.reconciliation`; `meeting.held` from `operator.reconciliation` only; each only for a booking joined to a contact | A booking-link click or a visit to the scheduling page. Which contact booked is never inferred from a name, a similar address or timing (AM-BOOK-4). | per-type source enum (`invalid/event-envelope/meeting-confirmed-from-click`); contact subject required on `meeting.*` (EV-TYPE-2) | N06, U02 (BOOK01, BOOK02) |
| Attendance | Permitted provider attendance evidence, or a manual attendance record by the operator | `webinar.attendance_verified` from `provider.meet_attendance` (only if a verified capability exists; Business Standard lists no native report, 07 S5) or `operator.reconciliation` | Registration, a Join click, a missing report or a replay view | per-type source enum (`invalid/event-envelope/attendance-from-join-click`) | N04, U01 (EV04) |
| Financial inputs | The visitor's private, local workshop state | none: no event carries them | The marketing database, an inferred wealth segment, a completion signal, a selected clip | closed envelope and job (`invalid/event-envelope/financial-amount-field`, `workshop-completed-with-gap`, `workshop-completed-with-selected-clip`; `invalid/delivery-job/financial-field-in-job`) | W04 (WK04), R02 (ADS02) |
| Content approval | A real reviewer decision bound to the exact artifact or claim hash: for articles, `content/approvals.json` entries (`sha256`, `pullRequest`, `humanReview`, `firmApproval`) checked by `approvedArticle()` in `lib/articles.ts` and `scripts/verify-publication.ts` (existing); for other assets, an H00 approval packet | `content.approved` from `editorial.approval_ledger` only | An agent score, draft status, a queued job or an older version's approval | per-type source enum; `approved` readiness state recordable only by human roles (`invalid/feature-flags/agent-recorded-approval`) | H00, N08, R00 (CNT05) |
| Publication | The live URL or provider publication ID plus the verified content version | `content.published` from `editorial.publication_handoff` only, after the live check | A prepared draft, a queued job, a merged PR or a successful build | per-type source enum | N08 (WF09), L06 (CNT06, REL01) |

## 2. Rules

Each rule is phrased so a test can fail it.

**Consent**
- **AM-CONSENT-1.** A contact is eligible for a promotional message only if the latest `consent_events` row for that purpose is `granted`, it is not blocked at Brevo and the contact is not suppressed. `guide.requested`, `webinar.registered`, `workshop.access_requested`, `book.payment_confirmed` and `meeting.confirmed` never create, extend or imply consent.
- **AM-CONSENT-2.** Revocation wins. A later `revoked` row, a Brevo blocklist or unsubscribe signal, or a global suppression vetoes every promotional job that has not reached its send marker, even if an older record says subscribed (04 §1).
  - `op_record_withdrawal` suppresses the `pending` and `retry_due` jobs in the same transaction (job-state-machine.md T3).
  - A `leased` job is stopped by its own pre-send check, before `send_started_at` (T5).
  - A job whose provider call has started is never marked suppressed by the revocation. It ends `sent` or `reconcile_required` (T9, T11), and it is suppressed later only on evidence that the call was not accepted (T16). The revocation and the send marker are serialized per contact, so a revocation committed first always wins (JS-SUPP-1 to JS-SUPP-3).
  - An upsert of a contact never clears a Brevo block or writes `granted` (MAIL03).
- **AM-CONSENT-3.** A new purchase or registration after a withdrawal does not regrant consent. Only a new explicit capture does (04 §6).
- **AM-CONSENT-4.** The eligibility check runs after the lease and before the provider call (job-state-machine.md §6; `email-eligibility.json` PSC-1 to PSC-7), not only when the job is queued.
- **AM-CONSENT-5.** An internal client flag is set only by Bill or an authorized operator through the operations view (audited). A purchase never sets it (04 §6).

**Payment and rights**
- **AM-PAY-1.** `book_orders.payment_state = paid` only after a signature-verified Stripe webhook whose event ID is stored and whose current status is paid. A redirect to the success page shows "we are confirming your payment", never "paid" (01 §11, PAY01).
- **AM-PAY-2.** Duplicate or reordered webhooks describing the same payment produce one paid transition, one right, one E12 and one E13. The idempotency key dedupes replays of one delivery; domain uniqueness (one paid transition per order, `unique(order_id)` on rights) dedupes different deliveries of the same fact.
- **AM-RIGHT-1.** A right is redeemed only through verified identity (the buyer's authenticated or tokenized flow) or a reviewed manual process. Rescheduling moves the existing right to a new booking; it never creates another right. A refund voids an unused right as the approved terms say (HB-20, HB-28).
- **AM-RIGHT-2.** The included consultation is 30 minutes. A value other than 30 in `consultation_rights.duration_minutes`, or a 60-minute event type linked to a right, is a defect (D-003, D-010).

**Booking and attendance**
- **AM-BOOK-1.** `bookings.status = confirmed` only from a provider event or an audited operator reconciliation. A click on the booking link changes nothing but, at most, an allowed analytics event.
- **AM-BOOK-2.** Cancellation and rescheduling are distinct states. A cancellation or no-show never restarts acquisition messages automatically (01 §11, N07).
- **AM-BOOK-3. Booking-to-contact join.** A booking is joined to a contact only when the invitee's address exactly matches an existing contact, after the normalization used for `contacts.email_normalized` (trimmed, lowercased, NFC). The contact must be `active` or `suppressed`. An erased contact is never joined again.
  - How the match is made: the application server computes the HMAC of the normalized address with the key that produces `contacts.email_hmac` (the key's name is still open, README §6). It passes only that value to `op_accept_event`, which looks it up and stores only the resulting `contact_id` and `contact_match` on `bookings` (operational-data-model.md).
  - Path (a), `provider.booking_sync` (WF06, N06): used only where P05 verifies an authenticated booking read or a signed callback. The booking adapter reads the invitee address from the provider record in memory for this lookup and then discards it (data-flow-register.json FL-29, privacy-boundary.md PB-CAL-3).
  - Path (b), `operator.reconciliation`: the 1.0 fallback and the daily check (01 §11). The operator reads the booking in the provider's own interface, applies the same exact-address rule in the operations view, and the join is audited as `booking.reconciled`.
  - The address is never written to `bookings`, `integration_events`, an envelope, `origin_ref`, a job, n8n, a log or an alert. The invitee's name and intake answers are not read for the join.
  - A join never redeems a consultation right by itself. `consultation.redeemed` follows AM-RIGHT-1.
- **AM-BOOK-4. Never infer the join.** Never infer it from:
  - a name;
  - an address that differs after normalization (another spelling, a `+tag`, another domain);
  - a booking made soon after a guide request, a workshop visit or a link click;
  - the order of events.

  In 1.0 a different address is a different person, for the operator as well as for the adapter.
- **AM-BOOK-5. A booking that matches no contact.** The booking row is stored with `contact_id` null and `contact_match = 'unmatched'`: IDs, times, offer, mode and status only. The delivery is recorded in `integration_events` with `envelope` null and `reconciliation_state = 'pending'`.
  - No event is emitted, because the `meeting.*` and `consultation.redeemed` types require a contact subject.
  - No job is created and no contact row is created. This system sends nothing about the booking. Whatever the scheduler itself sends is outside it.
  - The booking is listed as a booking gap in the operator report (OPS02) until the operator joins it under AM-BOOK-3 or closes it as unmatched.
  - A later join emits `meeting.confirmed` from `operator.reconciliation`, with the `aud_` ID as origin. Its jobs follow the ordinary rules, and a job whose send window has already closed is not created (JS-TIME-2).
- **AM-BOOK-6. How far `already_booked` reaches.** The suppression on E05 and E11 covers bookings joined to the contact. `meeting.confirmed` sweeps the contact's `pending` and `retry_due` E05 and E11 jobs (T3), and the pre-send check stops a leased one (T5). A person who booked under an address that matches no contact cannot be recognized, so E05 or E11 may still reach them at their contact address until the operator joins the booking. The operator report shows these gaps (OPS02). This is the honest limit of a scheduler link that is never prefilled (PB-CAL-2).
- **AM-ATT-1.** `registrations.attendance_state` starts `unknown`. It becomes `attended` or `not_attended` only with an evidence source and reference. A missing or unavailable report leaves it `unknown`, and replay or follow-up copy uses neutral wording (EV04).
- **AM-ATT-2.** `webinar.join_clicked` never changes attendance.

**Financial inputs**
- **AM-FIN-1.** No server-side record, log, event, job, provider attribute or ad audience holds or implies a visitor's financial position. The server cannot personalise a message with a workshop result because it never has one (privacy-boundary.md PB-FIN).
- **AM-FIN-2.** A branch or result is never inferred from, or exposed by, which media a visitor fetched: the branch-clip request pattern is the same for every selection (privacy-boundary.md PB-MEDIA-4).
- **AM-RES-1.** A resource code is never taken from request input, and a well-formed code is never trusted because it matches the schema. The server sets it from the approved resource registry, and an unregistered code is rejected (privacy-boundary.md PB-ID-5 and PB-ID-6; event-envelope.md EV-REG-1).

**Content and publication**
- **AM-CONTENT-1.** Content is approved only when the approval names the exact current hash. Any change to title, body, sources, author, claim, calculation, offer or clip invalidates it (existing: `contentFingerprint()` in `lib/articles.ts`).
- **AM-PUB-1.** Content is published only when its live URL (or provider publication ID) is verified to serve the approved hash. A failed deploy or post leaves the item unpublished, and LinkedIn falls back to a manual package (04 §5 WF09).

**Delivery and automation**
- **AM-DELIV-1.** Provider acceptance (HTTP 2xx with an ID) makes a job `sent`, not delivered. Inbox delivery is known only from a provider delivery signal, or else stays `unknown` (D-038, MAIL01).
- **AM-N8N-1.** n8n is never the record of payment, consent, booking or attendance. It reads and writes these only through scoped server operations and acts on the application's durable jobs (03 A4, D-041).
- **AM-REPLY-1.** A meaningful reply pauses the relevant acquisition sequence (`human_reply`) and creates one human task. It is never answered by an automated financial reply (D-013).

**Readiness and gates**
- **AM-FLAG-1.** No single true stands for all five readiness states, and no readiness state is inferred from another. Code-ready does not mean approved, approved does not mean enabled, enabled does not mean live-verified (04 §7; feature-flags.md).
- **AM-FLAG-2.** Permission to send is never inferred from the owning capability's flags alone. A promotional job needs `marketing_dispatch`, whatever capability owns it (FF-RUN-2). A non-production send is never inferred from `enabled` without the environment substitute, including the recipient allowlist (FF-RUN-1). A production send is never inferred from a staging test (feature-flags.md §5.1).
- **AM-GATE-1.** Agents never record G0–G6. An approval exists only as a human record naming the approver, the date and the exact hash or action scope (D-043).

## 3. Precedence when records disagree

1. Provider suppression and a later revocation beat an older grant (AM-CONSENT-2).
2. Stripe's verified state beats the application's order row; a disagreement puts the order in reconciliation and notifies the operator, it never auto-corrects to paid.
3. The calendar or provider event beats the application's booking row; the daily operator reconciliation records which one was corrected (N06).
4. For content, the approval ledger at the exact hash beats any status field in the file.
5. When an external outcome is uncertain, the record moves to `reconcile_required` (jobs) or `unresolved` (integration events) and waits for provider evidence. It is never retried blindly (01 §5, §12).

## 4. Approval scopes that bind data, events and flags

| Gate | Scope | What it can make true | What it can never make true |
|---|---|---|---|
| G0 | Configuration choices (host, branch, event date and cap, book price and cap, scheduling owner) | Values used by event and book jobs (starts_at, capacity_cap, unit cap) | Any content approval or any send |
| G1 | Professional facts and offer wording | Wording used in templates (with G3) | A template hash approval by itself |
| G2 | One named action in one environment (for example allowlisted test sends, a Stripe test account, a paid-API cap) | `approved` for a staging capability, with `gate_refs` `G2` and the tested config hash | Public launch or the full contact list (06: permission to test one email does not permit sending the list) |
| G3 | Exact asset hashes (templates, pages, articles, scripts, calculations) | `template_version` values a job may use; `approved` scope hashes | Any later version: a changed hash needs a new G3 |
| G4 | Recordings, rights and the replay policy | `webinar.replay_available_at` for E09; real media in the workshop | Synthetic stand-ins presented as Bill |
| G5 | Data processing: data flows, consent wording, retention, processors, message classification, fulfilment and refund process | `classification_status` changes; retention values in the register; `consent_events.purpose` wording versions | Any gate-free processing of real personal data before it is recorded |
| G6 | One release step and its active flag list | A flag's `value = true` in production, with `enable_evidence_ref` pointing at the release record | Ad spend beyond the separately approved cap |

A content or media version change invalidates the approvals bound to that hash only; it does not invalidate unrelated `code_ready` or `provider_tested` evidence (04 §7).
