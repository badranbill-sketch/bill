# Minimal operational data model (contract 1.0)

- Task F02, data lane. **Status: proposed, submitted, not accepted.** Every table, column, role and procedure below is **proposed**. No database, migration or Supabase project exists (inventory §3: "Supabase operational storage: none"). P01 owns the migrations, grants and RLS (`supabase/migrations/`, `tests/security/`); this is a DDL-like sketch for P01 to implement, not SQL to run.
- Base: HEAD `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b`. Sources: 04 §2 (candidate tables), 04 §1 and §4, 01 §7 (Supabase boundary), §11, §12, D-042, D-044.
- The 04 §2 list has eight groups. Two of them are pairs, so this sketch has ten tables: `contacts`, `consent_events`, `webinar_events` + `registrations`, `book_orders` + `consultation_rights`, `bookings`, `integration_events`, `delivery_jobs`, `audit_events`.
- Repair attempt 3 (design review `F02-design-attempt2.md`):
  - A6D2-01: `op_record_withdrawal` now suppresses `pending` and `retry_due` jobs only. A leased job is stopped by its own pre-send check (job-state-machine.md T5, JS-SUPP-1 to JS-SUPP-3).
  - A6D2-02: the booking-to-contact join is defined (authority-matrix.md AM-BOOK-3 to AM-BOOK-6). `bookings` gains `contact_match`, `op_accept_event` describes the join, and principle 2 says a booking never creates a contact.

## 1. Principles

1. Use the fewest tables that preserve consent, payment and job history. This is not a CRM (01 §18).
2. Ordinary browsing never creates a contact row (04 §2). A row appears only for an accepted guide or workshop request, consent capture, purchase or registration. A booking never creates a contact in 1.0. It is joined to an existing contact or stays unmatched (authority-matrix.md AM-BOOK-3 to AM-BOOK-5).
3. Supabase is not a financial-profile store. No column may hold a workshop value or anything derived from one (privacy-boundary.md PB-SUPA-1, PB-FIN).
4. Email and first name live only in `contacts`. Every other table uses `contact_id`.
5. Prices, card data, shipping addresses and scheduler intake answers stay with Stripe and the scheduler; they are not copied (04 §2; PB-STRIPE-2, PB-CAL-2).
6. Approval ledgers stay in Git with exact hashes (`content/approvals.json`, H00 packets); there is no CMS table (04 §2).
7. All times are `timestamptz` in UTC. America/Toronto is a display concern (D-044).
8. IDs: text, `<prefix>_` + 26 lowercase Crockford base32 (event-envelope.md §4.1); event IDs are UUIDs.
9. A paid order is kept on the approved business and legal schedule, not deleted with a newsletter unsubscribe (04 §2).

## 2. Tables

Types are PostgreSQL names. `-- RC` gives the retention class (§5). Every retention period is pending G5.

```sql
-- DDL-LIKE SKETCH, NOT A MIGRATION (P01 implements)

create table contacts (                                   -- RC-CONTACT; erased rows keep RC-SUPPRESSION fields only
  contact_id          text primary key,                   -- con_ + 26
  email_normalized    text unique,                        -- lowercased, trimmed, NFC; null only when erased
  email_hmac          text not null unique,               -- HMAC-SHA256(email_normalized); keeps suppression after erasure
  first_name          text,                               -- optional, <= 60 chars
  locale              text not null,                      -- 'fr' | 'en'
  lifecycle_state     text not null default 'active',     -- 'active' | 'suppressed' | 'erased'
  client_flag         boolean not null default false,     -- set only by Bill or an authorized operator (audited)
  provider_contact_id text unique,                        -- Brevo contact ID
  created_at          timestamptz not null,
  updated_at          timestamptz not null
  -- check: lifecycle_state = 'erased' <=> email_normalized is null and first_name is null
);

create table consent_events (                             -- RC-CONSENT; append-only
  consent_event_id    text primary key,                   -- cev_ + 26
  contact_id          text not null references contacts,
  purpose             text not null,                      -- 'nurture' | 'workshop-followup' (proposed, pending G5)
  state               text not null,                      -- 'requested' | 'granted' | 'revoked'
  wording_version     text not null,                      -- consent.<purpose>.h<sha256 prefix> of the exact text shown (PB-ID-3)
  captured_at         timestamptz not null,
  capture_source      text not null,                      -- a consent source code from event-envelope 1.0
  event_id            uuid not null unique references integration_events (event_id)
  -- index (contact_id, purpose, captured_at desc): current consent = latest row
);

create table webinar_events (                             -- RC-EVENT-SCHEDULE
  webinar_event_id    text primary key,                   -- wev_ + 26
  language            text not null,                      -- 'fr' | 'en'
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,               -- check ends_at > starts_at
  display_time_zone   text not null default 'America/Toronto',
  capacity_cap        integer,                            -- human-set (HB-17); null until set; check > 0
  status              text not null,                      -- 'scheduled' | 'cancelled' | 'completed' | 'remade'
  remade_as           text references webinar_events,     -- a date change creates a new event (job-state-machine.md §5)
  join_link_ref       text,                               -- server-only; never in a public list or shared invitation
  replay_policy       text not null default 'none',       -- 'none' | 'registrants' | 'public' (G4, HB-17)
  replay_available_at timestamptz,                        -- only when replay_policy <> 'none'
  created_at          timestamptz not null,
  updated_at          timestamptz not null
);

create table registrations (                              -- RC-REGISTRATION
  registration_id     text primary key,                   -- reg_ + 26
  webinar_event_id    text not null references webinar_events,
  contact_id          text not null references contacts,
  status              text not null,                      -- 'registered' | 'cancelled'
  registered_at       timestamptz not null,
  cancelled_at        timestamptz,
  attendance_state    text not null default 'unknown',    -- 'unknown' | 'attended' | 'not_attended'
  attendance_evidence_source text,                        -- 'provider_report' | 'operator_record'
  attendance_evidence_ref    text,                        -- evidence path or provider report ID
  unique (webinar_event_id, contact_id)
  -- check: attendance_state = 'unknown' or both evidence columns are not null (AM-ATT-1)
  -- the registration count per event never exceeds capacity_cap (checked in the accepting transaction)
);

create table book_orders (                                -- RC-ORDER (business and legal schedule)
  order_id            text primary key,                   -- ord_ + 26
  contact_id          text not null references contacts,
  provider            text not null default 'stripe',
  checkout_session_id text not null unique,
  payment_intent_id   text unique,
  product_version     text not null,                      -- registry code of the approved product and terms
  payment_state       text not null,                      -- 'awaiting_payment' | 'paid' | 'payment_failed' | 'refunded' | 'disputed'
  payment_verified_event text,                            -- Stripe event ID of the verifying signed webhook
  fulfilment_state    text not null default 'not_started',-- 'not_started' | 'preparing' | 'dispatched' | 'delivery_reported' | 'lost_or_damaged' | 'cancelled'
  carrier_reference   text,                               -- only a real carrier reference; never invented
  paid_at             timestamptz,
  refunded_at         timestamptz,
  created_at          timestamptz not null,
  updated_at          timestamptz not null
  -- check: payment_state <> 'paid' or (payment_verified_event is not null and paid_at is not null)  (AM-PAY-1)
  -- unit cap (proposed 8, HB-20) enforced when a checkout session is created
);

create table consultation_rights (                        -- RC-ORDER
  right_id            text primary key,                   -- rgt_ + 26
  order_id            text not null unique references book_orders,  -- one right per order (proposed: one household per bundle)
  contact_id          text not null references contacts,
  duration_minutes    integer not null default 30,        -- check duration_minutes = 30 (never 60; D-003, D-010)
  status              text not null,                      -- 'active' | 'booked' | 'used' | 'void' | 'expired'
  booking_id          text references bookings,           -- the current booking; rescheduling moves it
  valid_until         timestamptz,                        -- pending HB-20
  redemption_token_hash text unique,                      -- only if the token design of 01 §7 is approved
  created_at          timestamptz not null,
  updated_at          timestamptz not null
);

create table bookings (                                   -- RC-BOOKING
  booking_id          text primary key,                   -- bkg_ + 26
  provider            text not null,                      -- 'calendly' | 'google_calendar' | 'operator'
  provider_event_id   text not null,                      -- for 'operator', the aud_ ID of the reconciliation
  contact_id          text references contacts,           -- set only by the booking-to-contact join (AM-BOOK-3); null = unmatched
  contact_match       text not null default 'unmatched',  -- 'unmatched' | 'booking_sync' | 'operator_reconciliation' (how the join was made)
  offer_id            text not null,                      -- 'intro-15' | 'book-consultation-30' (reconcile with the offer-matrix contract)
  mode                text not null,                      -- 'online' | 'in_person'
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  status              text not null,                      -- 'confirmed' | 'cancelled' | 'rescheduled' | 'held' | 'no_show_recorded'
  evidence_origin     text not null,                      -- 'provider_event' | 'operator_reconciliation'
  right_id            text references consultation_rights,
  supersedes_booking_id text references bookings,         -- reschedule chain
  created_at          timestamptz not null,
  updated_at          timestamptz not null,
  unique (provider, provider_event_id)
  -- check: (contact_match = 'unmatched') = (contact_id is null)
  -- check: right_id is null or (offer_id = 'book-consultation-30' and contact_id is not null)
  -- a 'book-consultation-30' booking with no right (unmatched, or no active right) redeems nothing; it is a booking gap for the operator (AM-BOOK-5, OPS02)
  -- check: offer_id <> 'intro-15' or ends_at - starts_at = interval '15 minutes'
  -- check: offer_id <> 'book-consultation-30' or ends_at - starts_at = interval '30 minutes'
);

create table integration_events (                         -- RC-EVENT
  event_id            uuid primary key,                   -- the envelope's event_id, or a generated ID for an ignored delivery
  provider            text not null,                      -- 'site' | 'stripe' | 'brevo' | 'booking' | 'meet' | 'operator' | 'editorial' | 'dispatcher'
  external_event_id   text not null,                      -- provider event ID; for internal origins, the idempotency_key
  envelope            jsonb,                              -- an event-envelope 1.0 document validated by the app; null for ignored types and unmatched bookings (AM-BOOK-5)
  idempotency_key     text unique,
  signature_verified  boolean,                            -- provider deliveries only
  received_at         timestamptz not null,
  processed_at        timestamptz,
  processing_status   text not null,                      -- 'received' | 'processed' | 'ignored' | 'rejected' | 'reconcile_required'
  reconciliation_state text not null default 'none',      -- 'none' | 'pending' | 'reconciled' | 'unresolved'
  error_code          text,                               -- sanitized code only
  unique (provider, external_event_id)
  -- raw provider bodies are never stored (they carry addresses and card metadata)
);

create table delivery_jobs (                              -- RC-JOB; row shape = delivery-job.schema.json
  job_id              text primary key,                   -- job_ + 26
  purpose_key         text not null unique,               -- pk1:<contact_id>:<trigger_event_id>:<template_id>:<template_version>
  contact_id          text not null references contacts,
  trigger_event_id    uuid not null references integration_events (event_id),
  resource_ref        text,                               -- wev_/ord_/rgt_/bkg_ per template
  template_id         text not null,                      -- 'e01'..'e16'
  template_version    text not null,                      -- h + sha256 prefix of the approved version
  locale              text not null,
  channel             text not null default 'email',
  provider            text not null default 'brevo',
  message_class       text not null,                      -- 'operational' | 'promotional' (pending G5)
  consent_reference   text references consent_events,     -- required for promotional
  priority            smallint not null,                  -- 0-3 operational, 5-9 promotional
  status              text not null,                      -- the nine states of job-state-machine.md
  due_at              timestamptz not null,
  expires_at          timestamptz not null,               -- check expires_at > due_at
  next_attempt_at     timestamptz,
  send_started_at     timestamptz,
  sent_at             timestamptz,
  completed_at        timestamptz,
  attempt_count       smallint not null default 0,        -- provider calls started; <= max_attempts <= 8
  max_attempts        smallint not null default 5,
  lease_worker_id     text,
  lease_token         uuid,
  leased_at           timestamptz,
  leased_until        timestamptz,
  provider_message_id text,
  delivery_status     text,                               -- 'unknown' | 'delivered' | 'bounced' | 'blocked_by_provider'
  last_error_code     text,
  last_error_http_status smallint,
  last_error_at       timestamptz,
  defer_reason        text,
  suppression_reason  text,
  created_at          timestamptz not null,
  updated_at          timestamptz not null,
  unique (contact_id, trigger_event_id, template_id)      -- send slot: a new approved version cannot duplicate a send
  -- partial index (status, priority, due_at) where status in ('pending', 'retry_due')
);

create table audit_events (                               -- RC-AUDIT
  audit_event_id      text primary key,                   -- aud_ + 26
  occurred_at         timestamptz not null,
  actor_kind          text not null,                      -- 'operator' | 'reviewer' | 'system'
  actor_ref           text not null,                      -- opr_ ID or a component code; never an email
  action              text not null,                      -- closed list below
  target_ref          text not null,                      -- internal ID
  reason_code         text,                               -- closed list per action
  evidence_ref        text                                -- path or URL in the approved evidence store
);
```

`audit_events.action` values: `consent.recorded`, `consent.revoked`, `client_flag.set`, `client_flag.cleared`, `booking.reconciled`, `attendance.recorded`, `order.reconciled`, `fulfilment.updated`, `suppression.applied`, `job.reconciled`, `job.requeued`, `flag.changed`, `release.recorded`, `retention.executed`, `data.exported`, `data.erased`. There is no free-text column: an operator explanation that must be kept goes to the evidence store and is referenced by `evidence_ref`.

Operator identities (`opr_`) come from the authentication chosen for the operations view in U05 (proposed); audit rows never copy an operator's email.

## 3. Forbidden columns

P01's security tests fail the migration if any column in any table matches one of these rules. The lists are identical to privacy-boundary.md §5, which is the authority; `evidence/F02/data/validate_f02_data.py` checks that the two files and its own token set stay equal (repair attempt 2, A6D-05).

1. **PB-SCAN-1 tokens** in a column name (split on `_`): financial (`amount balance balances income revenue salary spend spending budget savings asset assets networth net gross wealth pension rrsp reer tfsa celi rrif ferr lira cri gap surplus shortfall deficit capital horizon inflation escalation return bp currency mortgage debt tax marginal`), age and health (`age birth dob birthdate retirement health medical`), derived selections (`clip branch risk warning segment score verdict diagnosis`), identity and device (`email phone address street postal name firstname lastname ip useragent fingerprint device`).
   - Only exceptions: `contacts.email_normalized`, `contacts.email_hmac`, `contacts.first_name`.
2. **PB-SCAN-2 whole names**: `message body form question questions notes note comment comments text payload data answers responses reply value` and the workshop-inputs field names listed in privacy-boundary.md §5.
3. **Structural bans**:
   - no price, total or tax amount (Stripe holds them);
   - no shipping or billing address;
   - no phone number (not collected in 1.0);
   - no full IP address, user agent or device fingerprint (04 §2);
   - no raw provider payload or webhook body;
   - no scheduler intake answer;
   - no free-text note;
   - no copy of any workshop input, result, clip or topic;
   - no JSON column except `integration_events.envelope`, which must hold a valid event-envelope 1.0 document.

`evidence/F02/data/validate_f02_data.py` applies rules 1 and 2 to the column names in the sketch above, as a reference check.

## 4. Access: RLS, grants and server operations

| Principal | Intent |
|---|---|
| `anon` | No grant on any table, view, sequence or function. RLS on, no policy. |
| `authenticated` (any browser session) | No grant, no policy. No browser reads leads, orders, consent evidence or jobs (01 §7, AUTH01). |
| `service_role` key | Never in a browser, bundle, log or n8n export. If P01 uses it at all, only in the application server-only environment (06 secrets map "Supabase server credentials"). |
| Application server | Calls a small set of scoped operations (below), each validating its inputs and touching only its own rows. P01 chooses how: security-definer functions with a dedicated role, or server code with the private key restricted to these operations. |
| n8n | No direct table access. It calls the proposed internal API (`app/api/internal/automation/`, P02) with the scoped automation service token (06 map), which calls the same operations. It never sends SQL, a URL or a template name that becomes privileged work (04 §4). |
| Operations view | Server-rendered for an authenticated operator (U05). It reads through the same scoped operations and never exposes workshop data, which does not exist server-side. |

Proposed scoped operations (names are placeholders for P01 and P02):

| Operation | Effect |
|---|---|
| `op_accept_event(envelope, change)` | In one transaction: dedupe on `(provider, external_event_id)` and `idempotency_key`, apply the authoritative change, insert `integration_events`, create due jobs. It creates no job whose send window has already closed (JS-TIME-2). **Booking deliveries (WF06, authority-matrix.md AM-BOOK-3 to AM-BOOK-5):** the change carries the booking fields and the invitee's `email_hmac`, computed in application-server memory. The address itself is never passed. The operation looks the value up in `contacts.email_hmac` among contacts that are `active` or `suppressed`, then discards it. On a match it sets `bookings.contact_id` and `contact_match` and builds the `meeting.*` or `consultation.redeemed` envelope with that contact as subject. With no match it stores the booking unmatched and records the delivery in `integration_events` with `envelope` null and `reconciliation_state = 'pending'`. It then emits no event, creates no job and creates no contact. An operator join later comes back through this operation with a `meeting.confirmed` envelope from `operator.reconciliation`. |
| `op_claim_due_jobs(worker_id, max_jobs, lease_seconds)` | Atomic claim with a bounded lease (job-state-machine.md §4). |
| `op_prepare_send(job_id, lease_token)` | Pre-send eligibility check. If eligible, records `send_started_at`, increments `attempt_count` and returns the recipient (email, first name, locale) of this leased job only. |
| `op_record_send_result(job_id, lease_token, outcome, provider_message_id, error_code, http_status)` | Moves the job to its next state (job-state-machine.md §3). |
| `op_release_job(job_id, lease_token, defer_reason, next_attempt_at)` | Deferral before any provider call; it is not an attempt. |
| `op_recover_leases()`, `op_expire_jobs()` | Sweeps (job-state-machine.md §4, §5). |
| `op_reconcile_job(job_id, evidence)` | Resolves `reconcile_required` from provider evidence. |
| `op_record_withdrawal(contact_id, purpose, source, evidence)` | Appends a revoked consent row and, in the same transaction, suppresses the contact's `pending` and `retry_due` promotional jobs (job-state-machine.md T3, `consent_withdrawn`). It never changes a `leased` job. That job is stopped by its own pre-send check if `send_started_at` is null (T5). Otherwise its provider call may have started, and it ends `sent` or `reconcile_required` (T9, T11). The operation serializes with `op_prepare_send` on the contact (JS-SUPP-2, JS-SUPP-3). |
| `op_erase_contact(contact_id, dry_run)` | WF11 erasure: dry run first; keeps `email_hmac` for suppression and anything the approved retention schedule requires (orders). |

## 5. Retention classes (all pending G5)

| Class | Tables | Constraint already in the plan | Period |
|---|---|---|---|
| RC-CONTACT | contacts | Deleted or erased on request unless another class requires the link | pending_G5 |
| RC-SUPPRESSION | erased contacts (`contact_id`, `email_hmac`, `lifecycle_state`) | "Minimal suppression retained appropriately" (OPS03) | pending_G5 |
| RC-CONSENT | consent_events | Kept long enough to prove consent or withdrawal | pending_G5 |
| RC-EVENT-SCHEDULE, RC-REGISTRATION | webinar_events, registrations | Attendance stays unknown without evidence | pending_G5 |
| RC-ORDER | book_orders, consultation_rights | Approved business and legal schedule; not deleted by an unsubscribe (04 §2) | pending_G5 |
| RC-BOOKING | bookings | — | pending_G5 |
| RC-EVENT, RC-JOB | integration_events, delivery_jobs | Needed for reconciliation and dedupe windows | pending_G5 |
| RC-AUDIT | audit_events | Minimal who, what, when (04 §2) | pending_G5 |

Owner of every decision: the privacy and operations owner at G5 (HB-21, HB-27). Backups (P04) follow the same schedule through the approved reconciliation procedure (WF11).

## 6. Which events write which rows

See event-envelope.md §3 for the full map. In short: consent events write `consent_events`; webinar events write `registrations`; `book.*` writes `book_orders` and `consultation_rights`; `consultation.redeemed` and `meeting.*` write `consultation_rights` and `bookings`, only for a booking joined to a contact (an unmatched booking row is written without an event, AM-BOOK-5); `content.*` writes Git, not Supabase; `delivery.failed` writes `delivery_jobs` and `integration_events`. Every accepted envelope is stored once in `integration_events`.
