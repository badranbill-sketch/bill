# Delivery job state machine (contract 1.0)

- Schema: `delivery-job.schema.json` (`$id` `https://bill.contracts.local/delivery-job/1.0`). Examples: `examples/valid/delivery-job/` (12, one or more per state) and `examples/invalid/delivery-job/` (19, each with a `.why.txt`). Eligibility rules per template: `email-eligibility.json`.
- **Status: proposed, submitted, not accepted.** No job system exists. The dispatcher is WF02 in self-hosted n8n (N02); durable state belongs in the application database (03 A4); the procedures named here are proposed (operational-data-model.md §4).
- Sources: 04 §4 (ingress and job state), 04 §5 (WF00, WF02), 04 §6, 06 "Runbook: a failed action", 01 §5 (restart), §12.
- Repair attempt 2 (design review A6D-01, A6D-07): T1 and §6 step 2 now apply the runtime gate FF-RUN-1 and FF-RUN-2 (feature-flags.md §5.1). That gives the same non-production substitute the flags schema uses, and makes `marketing_dispatch` a requirement of every promotional job.
- Repair attempt 3 (design review `F02-design-attempt2.md`, A6D2-01): one rule for a withdrawal that meets a leased job. A sweep suppresses only `pending` and `retry_due` jobs (T3). A leased job is stopped only by its own pre-send check, before the send marker (T5). A started call ends in `sent` or `reconcile_required` (T9, T11). JS-SUPP-1 to JS-SUPP-3 state it (§3, §6), and the schema now rejects a suppressed job that carries `send_started_at` (invalid example `suppressed-after-send-started`). operational-data-model.md §4 (`op_record_withdrawal`) and authority-matrix.md AM-CONSENT-2 now say the same.

## 1. Guarantee

Bounded at-least-once processing with stable keys and provider reconciliation. Exactly-once delivery across an unreliable external API is not promised (01 §12). The machine is built so that a replay, a restart, a lost response or two workers claiming at once never produce a second send without evidence that the first did not happen.

## 2. States

| State | Meaning | Terminal |
|---|---|---|
| `pending` | Created and waiting for `due_at` | no |
| `leased` | Claimed by one worker under a bounded lease | no |
| `sent` | The provider accepted the message and returned an ID. This is **not** inbox delivery (AM-DELIV-1). | no (only to `complete`) |
| `complete` | Closed after `sent`. `delivery_status` records `delivered`, `bounced`, `blocked_by_provider` or, honestly, `unknown`. | yes |
| `retry_due` | Waiting for `next_attempt_at`, after a known non-acceptance (`last_error`) or a deferral (`defer_reason`) | no |
| `suppressed` | Stopped by an eligibility rule (`suppression_reason`) before its provider call started, or after evidence that the call was not accepted (JS-SUPP-1) | yes |
| `expired` | `expires_at` passed before a provider call started | yes |
| `reconcile_required` | A provider call may have succeeded and the outcome is unknown | no (waits for evidence) |
| `dead_letter` | Permanent failure or attempts exhausted; needs the operator | yes, except for an audited operator requeue |

## 3. Allowed transitions

Any transition not in this table is forbidden. Every transition is conditional on the caller holding the current `lease_token` where the job is leased, and it updates `updated_at`.

| # | From → To | Trigger and guard | Actor |
|---|---|---|---|
| T1 | pending → leased | claim: `due_at <= now < expires_at`, runtime gate open (FF-RUN-1, and FF-RUN-2 for promotional jobs), budget pool open | dispatcher (`op_claim_due_jobs`) |
| T2 | retry_due → leased | claim: `next_attempt_at <= now < expires_at`, same guards | dispatcher |
| T3 | pending / retry_due → suppressed | an upstream suppression sweep (withdrawal, blocklist, cancellation, booking, refund, remade event). It applies to these two states only and never changes a `leased` job (JS-SUPP-2). | `op_record_withdrawal`, domain operations |
| T4 | pending / retry_due → expired | `now >= expires_at` | `op_expire_jobs` sweep |
| T5 | leased → suppressed | the pre-send check (§6) fails on an eligibility rule. `send_started_at` is null, because the check runs before the send marker. This is the only way a leased job becomes suppressed (JS-SUPP-2). | `op_prepare_send` |
| T6 | leased → expired | the pre-send check finds `now >= expires_at` | `op_prepare_send` |
| T7 | leased → retry_due (deferral) | budget, frequency cap, reminder collision or capability off at the pre-send check; `defer_reason` set, `next_attempt_at < expires_at`; **not an attempt** | `op_release_job` |
| T8 | leased → retry_due (lease lost before send) | lease expired and `send_started_at` is null: nothing was sent | `op_recover_leases` sweep |
| T9 | leased → sent | provider 2xx with a message ID; `provider_message_id`, `sent_at` recorded | `op_record_send_result` |
| T10 | leased → retry_due (known failure) | a definite non-acceptance classed recoverable (§8), `attempt_count < max_attempts`, `next_attempt_at < expires_at` | `op_record_send_result` |
| T11 | leased → reconcile_required | outcome unknown after `send_started_at`: timeout, connection lost after the request was written, provider 5xx, worker crash (lease expired with `send_started_at` set) | `op_record_send_result`, `op_recover_leases` |
| T12 | leased → dead_letter | a permanent failure (§8), a recoverable failure with no attempts left, or a template version found unapproved at the pre-send check | `op_record_send_result`, `op_prepare_send` |
| T13 | leased → expired | a recoverable failure whose next retry would fall at or after `expires_at` | `op_record_send_result` |
| T14 | reconcile_required → sent | provider evidence shows acceptance (message found by job reference or time window) | `op_reconcile_job` |
| T15 | reconcile_required → retry_due | evidence shows definite non-acceptance, attempts left, `next_attempt_at < expires_at` | `op_reconcile_job` |
| T16 | reconcile_required → suppressed / expired | evidence of non-acceptance and the job is no longer eligible or has expired. Moving to `suppressed` clears `send_started_at`, since the call is known not to have been accepted. T10 and T15 clear it the same way when they move to `retry_due`. `attempt_count` keeps the count of started calls (JS-SUPP-1). | `op_reconcile_job` |
| T17 | reconcile_required → dead_letter | no conclusive evidence within the reconciliation window; a human decides; **never resent automatically** | `op_reconcile_job` with an operator alert |
| T18 | sent → complete | a delivery signal is reconciled, or the observation window closes (`delivery_status` = `unknown`) | provider callback or sweep |
| T19 | dead_letter → pending | the operator requeues after fixing the cause: audited (`job.requeued`), only if `now < expires_at`, pre-send checks run again, `max_attempts` never above 8 | operator |

**Forbidden, and why:**
- `sent` or `complete` → anything that sends again: a sent job is never resent.
- `reconcile_required` → `leased`: the outcome must be resolved first.
- `expired` → anything: an expired reminder is never sent late (06 runbook step 4).
- anything → `pending`, except T19.
- Moving to `sent` without a provider ID (schema rule JS-SENT-1).
- `leased` → `suppressed` by anyone except the job's own pre-send check (T5). A withdrawal, a Brevo block or any other sweep that finds a job leased leaves it alone. If `send_started_at` is null, the pre-send check reads the new state and stops the job (T5). If it is set, the provider call may already have happened, so the job goes on to `sent` (T9) or `reconcile_required` (T11), and T16 may suppress it later on evidence of non-acceptance. Marking an in-flight job suppressed would fence out the worker's result and record that the withdrawal stopped a message that was in fact sent (JS-SUPP-2).

**JS-SUPP-1 (schema).** A `suppressed` job never carries `send_started_at` or `sent_at`. Suppression happens only before a provider call starts (T3, T5) or after evidence of non-acceptance (T16, which clears the marker). Invalid example: `suppressed-after-send-started`. Valid example: `suppressed-e11-consent-withdrawn-at-presend` (a T5 stop after an earlier known failure, so `attempt_count` is 1 with no marker).

**JS-SUPP-2 (runtime).** Only T3 (from `pending` or `retry_due`), T5 (from `leased`, before the send marker) and T16 (from `reconcile_required`, on evidence) lead to `suppressed`. `op_record_withdrawal` and every other suppression writer change `pending` and `retry_due` jobs only.

## 4. Leases

- **Claim.** In one statement: select due jobs in `pending` or `retry_due` whose due time has passed and whose expiry has not, ordered by `priority`, then `due_at`; lock them with `FOR UPDATE SKIP LOCKED`; limit to the batch size; set `status = leased`, a fresh `lease_token`, `leased_at = now` and `leased_until = now + lease_seconds`. Two workers can never hold the same job (AUTO02).
- **Lease length.** Proposed 120 seconds, at least 3× the provider timeout. P02 and N02 set the final value from measured latency.
- **Fencing.** Every later write for the job includes the `lease_token`. A worker whose lease was recovered cannot write a result.
- **Send marker.** Before calling the provider, the worker records `send_started_at` and increments `attempt_count` (`op_prepare_send`). This one write separates "certainly not sent" (T8) from "maybe sent" (T11).
- **Recovery sweep.** An expired lease with no `send_started_at` returns the job to `retry_due` (T8). With `send_started_at` set, it goes to `reconcile_required` (T11). It never goes back to `pending` blindly.

## 5. Keys, due and expiry

- **JS-KEY-1. Purpose key** = `pk1:<contact_id>:<trigger_event_id>:<template_id>:<template_version>` (04 §4). It contains IDs only. `unique(purpose_key)` makes job creation idempotent: replaying the same trigger event creates nothing new.
- **JS-KEY-2. Send slot** = `unique(contact_id, trigger_event_id, template_id)`, without the version. It prevents a new approved template version from creating a second send for the same purpose when job creation is replayed after the version changed.
- **JS-TIME-2 and JS-TIME-3.** `due_at` is the earliest send time; `expires_at` is the latest time a provider call may start. `expires_at > due_at`, and every `next_attempt_at < expires_at`. Deferrals and retries never extend `expires_at`. Each template's anchor and offsets are in `email-eligibility.json` (for example, E08 is due one hour before the event and expires 15 minutes before it).
- **Remade events.** A change of event date is a remade event with a new `wev_` ID. The old event's jobs are suppressed (`event_remade`), and moved registrations produce new `webinar.registered` events, and so new jobs.

## 6. Pre-send eligibility check (after the lease)

`op_prepare_send` runs these checks in this order, after the lease is acquired and before `send_started_at` is written. Queue-time checks are never enough (N02 acceptance, MAIL03).

1. `now < expires_at`, otherwise T6.
2. The runtime gate is open (feature-flags.md §5.1; `email-eligibility.json` PSC-3 and `runtime_gate`), otherwise T7 with `capability_disabled`:
   - FF-RUN-1: the owning capability is `enabled`, and each of its controlling flags is true. Outside production, `public_launch` and `checkout_live` are replaced by the environment substitute: not production, reviewer-only access, Stripe in test mode, and the allowlisted recipient that step 3 checks. This is the same waiver the schema grants `enabled` (FF-INV-1), so an allowlisted staging send is possible and there is one rule, not two.
   - FF-RUN-2: a promotional job also needs `marketing_dispatch` true, in every environment and whatever capability owns it, for example a promotional E09 under `event_lifecycle`. The kill switch therefore stops every promotional send.
3. Outside production, the recipient is on the G2 allowlist, otherwise T5 with `not_allowlisted`.
4. The contact is not suppressed or erased, and Brevo does not report a block (`contact_suppressed`, `provider_blocklist`).
5. For promotional jobs, the latest consent row for the purpose is `granted` (`consent_missing`, `consent_withdrawn`), and there is no client flag or human reply (`client_flag`, `human_reply`).
6. The template-specific checks of `email-eligibility.json`: event still scheduled and unchanged, registration active, right active, order not refunded, booking still confirmed, not already booked or rebooked (bookings joined to the contact, authority-matrix.md AM-BOOK-3).
7. `template_version` is still an approved hash for the job's locale. A newer approval never rewrites a queued job. If the job's version has lost its approval, the job goes to `dead_letter` (T12, code `input_rejected`) with an operator alert.
8. The class's budget pool and the frequency caps allow the send, otherwise T7 with `daily_budget`, `frequency_cap` or `reminder_collision`.

Only after all checks pass does the operation record `send_started_at`, increment `attempt_count` and return the recipient for this job.

**JS-SUPP-3. A withdrawal and the send marker are ordered.** Checks 4 to 6 and the send-marker write run in one transaction. That transaction is serialized with `op_record_withdrawal` and every other writer of suppression state for the same contact.
- Proposed mechanism: both sides lock the contact row before they read or write consent and suppression state. `op_prepare_send` takes a shared lock and the writers take an exclusive lock. P01 and P02 may choose another mechanism with the same effect.
- A withdrawal committed before the send marker always stops the job: T5 with `consent_withdrawn`, or the matching code for another writer.
- A withdrawal committed after the marker cannot recall that one message. The job ends `sent` or `reconcile_required`, and T16 may still suppress it on evidence of non-acceptance.
- The record therefore never says a withdrawal stopped a job that had reached its send marker. MAIL03 asserts both orders, and MAIL05 asserts the stored job state against the provider's.

## 7. Attempts and retries

- **JS-RETRY-1.** `max_attempts` defaults to 5 (proposed); the schema's hard ceiling is 8. An attempt is a started provider call, so deferrals and lost leases before the send marker are not attempts.
- **Schedule (proposed).** Exponential backoff with full jitter: `delay = random(0, min(3600 s, 60 s × 2^(attempt_count − 1)))`, bounded by `expires_at`. A provider `Retry-After` value is honoured when it is longer. When the next retry would fall at or after expiry, the job expires (T13).
- **Priority.** Operational jobs (0–3) are claimed before promotional ones (5–9), within the shared Brevo budget (email-eligibility.json `budget`).

## 8. Outcome classification

| Observed outcome | last_error.code | Next state |
|---|---|---|
| 2xx with a message ID | — | sent (T9) |
| 2xx without a usable ID | `uncertain_outcome` | reconcile_required (T11) |
| 429, or a daily-quota response | `rate_limited` / `quota_exhausted` | retry_due (T10); promotional claims pause for the window |
| Connection refused or DNS failure before the request was written | `provider_outage` | retry_due (T10) |
| Timeout, or connection lost after the request was written | `timeout` | reconcile_required (T11) |
| 5xx | `uncertain_outcome` | reconcile_required (T11). P05 may reclassify it as retryable only with documented provider behaviour; that is unverified here. |
| 401 or 403 | `auth_expired` | dead_letter (T12) plus an operator alert: retrying cannot fix credentials |
| Other 4xx (validation, recipient refused) | `input_rejected` | dead_letter (T12) |
| Worker crash after the send marker | `lease_expired` | reconcile_required (T11) |
| Defect in our own code | `application_defect` | dead_letter (T12); add a regression test (06 runbook step 7) |

`last_error` holds a code, an HTTP status and a time only. Provider bodies are redacted before anything is logged or stored (04 §4; PB-LOG-2).

## 9. Reconciliation

1. Look up the provider's record for the job (by the job reference sent with the message, where the provider supports one, or by recipient, template and time window) without exposing the address in logs.
2. Found and accepted: T14. Found as rejected, or certainly absent: T15 or T16. Inconclusive after the window (proposed 24 hours): T17 with an operator alert.
3. The operator's decision and its evidence are audited (`job.reconciled`). A send is repeated only on evidence of non-acceptance.

## 10. Restart and replay

- Job creation is idempotent (JS-KEY-1, JS-KEY-2). Replaying the accepted event creates no new job.
- A dispatcher restart runs `op_recover_leases` first, then claims. It never resends because it lost memory of a run (01 §5).
- WF00 replays of the same source event hit the `integration_events` uniqueness and return the stored outcome.

## 11. Which rules the schema enforces, and which are runtime

| Enforced by the schema (examples prove it) | Runtime, owned downstream |
|---|---|
| Closed shape, no recipient address, no free-text error, no financial field (JS-SHAPE-1, JS-ERR-1) | Purpose key equals its components (JS-KEY-1): P02; also checked by the F02 harness on examples |
| Nine states only (JS-STATE-1); per-state required and forbidden fields (JS-LEASE-1, JS-SENT-1, JS-SENT-2, JS-RECON-1, JS-SUPP-1) | Transition legality (§3, JS-SUPP-2), lease fencing, claim atomicity, withdrawal ordering (JS-SUPP-3): P02, N00 (AUTO02), N02 and N07 (MAIL03) |
| Promotional needs consent and priority 5 or more; operational has priority 3 or less (JS-CLASS-2, JS-PRIO-1) | Pre-send checks (§6): N02 (MAIL03, MAIL04) |
| E03, E04, E05, E11 always promotional (JS-CLASS-3); resource kind per template | due < expiry, retry < expiry (JS-TIME-2, JS-TIME-3): P02; also checked by the harness |
| Hashed template versions (JS-VER-1); UTC timestamps (JS-TIME-1); attempt ceiling 8 (JS-RETRY-1) | Reconciliation and no blind resend (§9): N02 (MAIL05) |
