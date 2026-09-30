# Contract set 1.0 (F02): index, change control and invariants

contract_set_version: 1.0
frozen_for_build_on: 2026-09-30

- Task F02, "Freeze interfaces, privacy boundary, math units and offer matrix". Written by the A0 delegate acting as F02 integrator. Base commit `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b` on `claude/orchestration-foundation`. Nothing here is committed.
- **Integration round.** This is the integrator's repair attempt 3. It follows the second A6 reviews (`reviews/F02-design-attempt2.md`, `reviews/F02-math-attempt2.md`) and the lanes' repair attempt 3:
  - the data lane changed its files for A6D2-01 and A6D2-02;
  - the math lane changed its files for F02-MATH2-P2-1, P3-2 and P3-3;
  - the offers lane changed no file in this round.

  The integrator wrote only this README and `validate.py`, and edited no other contract file. It also addressed the two review findings owned by the index, A6D2-04 and A6D2-09 (§5.3). A6 verifies them.
- **What "frozen-for-build" means.** Downstream tasks build against exactly these names, shapes and rules. Nothing changes except through the change-control rule in §3.
- **What it does not mean.** It is not an approval.
  - F02 itself is submitted, not accepted. A6 reviews it, and A0 records acceptance separately (03; D-037).
  - No contract here records a G0–G6 decision, and every contract file still says "proposed" for that reason.
  - Some contracts need a human decision before they govern real people, money, content or data. For those, the Status column adds "proposed-for-human-approval" and names the gate.
- **When two artifacts disagree:**
  - For shape, the JSON Schema or registry is the machine authority.
  - The .md file gives the semantics, and the rules a schema cannot express.
  - The examples and fixtures are the conformance suite.
  - A disagreement is a defect to report to A0. It is never the implementer's choice. `validate.py` checks the disagreements that can be checked mechanically (§4). The ones it found are listed in §5.
- **Frozen offers** (D-001 to D-010, D-032, D-033):
  - a free PDF;
  - a free 15-minute introduction with one question, online or in person;
  - a paid printed book including one 30-minute consultation (never 60 minutes; there is no one-hour offer);
  - continued work only if the fit is mutual.
- **No invented values.** No contract may introduce a price, cap, credential, approval or provider capability that no human recorded. Unknown values stay `pending` with an owner (§6).

## 1. Layout

- Normative files sit at the top of `contracts/`. Conformance examples are in `examples/valid/<contract>/` and `examples/invalid/<contract>/`; each invalid example has a sibling `.why.txt` naming the rule it breaks. Workshop fixtures are in `fixtures/workshop/`.
- Two runtime instances live inside `examples/valid/` (see XL-05):
  - the authoritative offer matrix: `examples/valid/offer-matrix/authoritative-2026-09-30.json` (every gated value pending, no gate record);
  - the authoritative asset manifest: `examples/valid/asset-manifest/authoritative-empty-2026-09-30.json` (no entries).
- Supporting evidence is not part of the contract. It lives in `.orchestration/evidence/F02/`:
  - `data/`: the generator `gen_contracts.py`, the read-only validator `validate_f02_data.py`, `validation.log`, the two registry schemas (`registry-schemas/`), which are normative for the registries (XL-06), the reference resource registry `fixture-resource-registry.json` used by the PB-ID-5 check, the reviewer re-runs `reviewer-repro-after-repair2.log` and `reviewer-repro-after-repair3.log`, and `validate-all-crosscheck.log`;
  - `math/`: the generators `build_schema.py`, `make_examples.py` and `compute_fixtures.py`, the exact reference model `workshop_reference.py`, the validator `validate.py`, `run_validation.sh`, `validation.log`, and `cross_check_a6_model.mjs`, which re-runs the A6 attempt-1 model against the repaired fixtures;
  - `offers/`: the generator `gen_offers.py`, the validator `validate_offers.py`, `run_validation.sh`, `validation.log`, and the repair-2 evidence `repair-2.log`, `fingerprint_order_repro.ts` and `fingerprint-key-order.log`;
  - `a6-design-attempt1/`, `a6-math-attempt1/`, `a6-design-attempt2/` and `a6-math-attempt2/`: A6's own review evidence. A6 wrote them, not the F02 lanes, so they are not F02 artifacts;
  - `validate-all.log`: the output of this set's harness, plus read-only re-runs of the three lane validators.

## 2. Contract index

One row per contract. Paths are relative to `contracts/`. A range such as N00–N07 includes both ends. Owner lane is the F02 lane that authored the text; the runtime owners are the consuming tasks.

| # | Contract | Files | Owner lane | Consuming tasks | Status |
|---|---|---|---|---|---|
| 1 | Event envelope 1.0 | `event-envelope.schema.json`, `event-envelope.md`, `examples/valid/event-envelope/`, `examples/invalid/event-envelope/` | data lane (A3/A4 contract author) | P01, P02, U00–U05, W02, W04, N00–N09, L00 | frozen-for-build. The approved resource registry that PB-ID-5 requires is proposed; P02 builds it from approval records. |
| 2 | Delivery job and job state machine 1.0 | `delivery-job.schema.json`, `job-state-machine.md`, `examples/valid/delivery-job/`, `examples/invalid/delivery-job/` | data lane | P01, P02, U05, N00, N02–N07, N09, L00, L01 | frozen-for-build. The 120-second lease, `max_attempts` 5 and the backoff are proposed defaults that P02 and N02 may tune within the schema limits (ceiling 8). |
| 3 | Email eligibility registry 1.0 | `email-eligibility.json`, `../evidence/F02/data/registry-schemas/email-eligibility.registry.schema.json` | data lane | C06, H00, P05, U04, N01–N07, L01 | frozen-for-build; proposed-for-human-approval: G5 classifies E01–E16; G2 with G5 approve the send budget and timings |
| 4 | Feature flags and readiness states 1.0 | `feature-flags.json` (schema), `feature-flags.md`, `examples/valid/feature-flags/`, `examples/invalid/feature-flags/` | data lane | P00, P02, W02, U03, U04, N02, N08, L04, L05, L06, R02 | frozen-for-build; proposed-for-human-approval: G6 for each flag in production. The proposed env var names reach `lib/business.ts` only through an A0 patch (D-065). |
| 5 | Privacy boundary and data-flow register 1.0 | `privacy-boundary.md`, `data-flow-register.json`, `../evidence/F02/data/registry-schemas/data-flow-register.registry.schema.json` | data lane | P00–P04, W01–W04, U00–U05, N01–N10, R02, L00 | frozen-for-build; proposed-for-human-approval: G5 decides retention, processors and regions, consent wording and browser-storage expiry (HB-21, HB-26, HB-27) |
| 6 | Authority matrix 1.0 | `authority-matrix.md` | data lane | P01, P02, U01–U05, N00–N08, W04, H00, L06, O00 | frozen-for-build. It restates D-040, which is frozen by plan: a change needs an explicit plan change by Arnaud and Bill. |
| 7 | Operational data model 1.0 | `operational-data-model.md` | data lane | P01, P02, P04, U03, U04, U05, N00–N09 | frozen-for-build; proposed-for-human-approval: G5 sets every retention class (all pending_G5) |
| 8 | Offer matrix 1.0 | `offer-matrix.json` (schema), `offer-matrix.md`, `examples/valid/offer-matrix/`, `examples/invalid/offer-matrix/` | offers lane | C01, C03, C06, C07, C09, R01, U02, U03, N05, W01–W04, R00, H00 | frozen-for-build; proposed-for-human-approval: every gated value is pending (price, cap, validity, capacity, modalities, the eight disclosures, editions: G0, G1, G5, G3). The four offers are frozen by D-001 to D-010, and no approval of this file changes them. |
| 9 | Routes 1.0 | `routes.md` | offers lane | P00, P02, U00–U05, W01, W02, N00, N01, N06, N07, R00 | frozen-for-build; proposed-for-human-approval: slugs are approved with the page copy at G3 (RT-SLUG-3); proxy and callback changes need independent A6 review (01 §14) |
| 10 | Asset manifest 1.0 | `asset-manifest.schema.json`, `asset-manifest.md`, `examples/valid/asset-manifest/`, `examples/invalid/asset-manifest/` | offers lane | C01–C11, D01, W03, H00, N08, R00, H01 | frozen-for-build |
| 11 | Approval scopes 1.0 | `approval-scopes.md` | offers lane | H00, C10, C11, W03, N02, N08, R00, L00, L04, L05, L06; §8 applies to every task handoff | frozen-for-build; proposed-for-human-approval: the proposed ledger `content/asset-approvals.json`, the H00 packet format and its enforcement (CODEOWNERS, branch protection, HB-11) |
| 12 | Worker handoff 1.0 | `worker-handoff.schema.json`, `examples/valid/worker-handoff/`, `examples/invalid/worker-handoff/` | offers lane | every task (all 62 tasks) on submission; A0 records acceptance; A6 verifies | frozen-for-build |
| 13 | Workshop inputs 1.0 | `workshop-inputs.schema.json`, `workshop-inputs.md`, `examples/valid/workshop-inputs/`, `examples/invalid/workshop-inputs/` | math lane (A2 contract author) | D00, W00, W01, W02, W04, C02, H00 | frozen-for-build; proposed-for-human-approval: A6 reviews the math, then G3 (Bill and the firm reviewer, HB-26) approves the hashes printed in `evidence/F02/math/validation.log` |
| 14 | Workshop math and fixtures 1.0 | `workshop-math.md`, `fixtures/workshop/` | math lane | W00, W02, W04, C02, H00 | frozen-for-build; proposed-for-human-approval: as row 13. The fixtures are WM01–WM36 plus `clip-rules.json` and `index.json`. Adding a fixture that follows the existing rules is allowed under §3 rule 6; the integrator then updates this row and CX-21 in the same round. The capital illustration stays off; no flag for it exists (XL-03). |
| 15 | Workshop clip rules 1.0 | `workshop-clip-rules.md`, `fixtures/workshop/clip-rules.json` | math lane | W03, W04, C02, C10, H00 | frozen-for-build; proposed-for-human-approval: as row 13. The disclosure wording is a draft owned by C02 (G1, G3). |
| 16 | Index and harness | `README.md`, `validate.py` | A0 delegate (F02 integrator) | A0 at every dispatch; L00; every consuming task runs `validate.py` before its handoff | frozen-for-build |

## 2a. Workflow trace (04 §5)

This table answers A6D-12 and A6D2-09. It maps each of the 14 workflow deliverables of 04 §5 to the contract names it must use. It adds no rule: every name comes from the contract files, and CX-31 checks that each one exists. "Emits" and "consumes" refer to event-envelope.md §3. The capability cell gives each capability with its controlling flags from `feature-flags.json`. Every workflow export must also be disabled, version-labelled, import-tested and free of credential values (04 §5, AUTO01).

**Activation gate column (A6D2-09).** 04 §5 asks each workflow for an activation gate. The column is derived, not decided here:
- Every workflow export starts from the baseline in approval-scopes.md §2, row "Code, workflow exports, migrations": A6 technical verification, G2 to connect credentials, G6 to activate.
- A row adds the production gates that feature-flags.md §4 lists for each capability it names.
- WF11 also needs G5, because every retention class it would apply is pending G5 (operational-data-model.md §5).
- A flag named in the capability column still needs its own G6, per flag (feature-flags.md §2).
- CX-31 recomputes each cell from these sources. It also checks that every `x.md §N` citation in a row names a section that holds the rule cited with it, and that every rule ID a row cites is defined in a contract file.

| Workflow | Task | Events | Templates | Capabilities (controlling flags) | Operations | Activation gate | Contract rules it must satisfy | Checks |
|---|---|---|---|---|---|---|---|---|
| WF00 intake and claim adapter | N00 | Every accepted type enters through `op_accept_event`. Replays hit the `integration_events` uniqueness. | none of its own | none of its own; it serves every capability | `op_accept_event`, `op_claim_due_jobs`, `op_recover_leases`, `op_expire_jobs`, `op_reconcile_job` | A6; G2, G6 | job-state-machine.md §4 (leases) and §10 (restart and replay); PB-N8N-1 to 3; AM-CLAIM-1 and 2 | AUTO01, AUTO02, AUTH03 |
| WF01 contacts and consent | N01 | consumes `guide.requested`, `marketing.opted_in`, `marketing.withdrawn`, `workshop.access_requested`; a Brevo block arrives as `marketing.withdrawn` | none (E02 is sent by WF02) | `preferences_unsubscribe` (none, but must be enabled first), `marketing_nurture` (`public_launch`, `marketing_dispatch`) | `op_accept_event`, `op_record_withdrawal` | A6; G2, G3, G5, G6 | AM-CONSENT-1 to 3; JS-SUPP-2 and 3 (a withdrawal changes only pending and retry_due jobs); PB-BREVO-1 to 3; data-flow register Brevo flows | MAIL02, MAIL03, AUTO01 |
| WF02 message dispatcher | N02 | emits `delivery.failed` (source `system.dispatcher`) | E01–E16 | the owning capability of each template (FF-RUN-1), plus `marketing_dispatch` for every promotional job (FF-RUN-2) | `op_claim_due_jobs`, `op_prepare_send`, `op_record_send_result`, `op_release_job`, `op_recover_leases`, `op_expire_jobs`, `op_reconcile_job` | A6; G2, G6; each job also needs the gates of the capability that owns its template (FF-RUN-1) | job-state-machine.md §3 to §9; JS-SUPP-1 to 3; PSC-1 to 7; BUD-1 to 5; AM-CONSENT-4; AM-DELIV-1; AM-FLAG-2 | MAIL03, MAIL04, MAIL05, AUTO02 |
| WF03 guide and workshop | N03 | consumes `guide.requested`, `workshop.access_requested`, `workshop.completed`, `marketing.opted_in` | E01, E10, E11, E02–E05 | `guide_request_delivery`, `workshop_access`, `workshop_completion_signal` (`public_launch`); `workshop_followup`, `marketing_nurture` (`public_launch`, `marketing_dispatch`) | `op_accept_event` | A6; G1, G2, G3, G5, G6 | PB-FIN-1 to 10 (PB-FIN-7 for `workshop.completed`); PB-ID-3 to 6; PB-MEDIA-4; AM-FIN-1 and 2; AM-RES-1 | MAIL01, MAIL02, WK04, AUTO01 |
| WF04 event lifecycle | N04 | consumes `webinar.registered`, `webinar.cancelled`, `webinar.attendance_verified`; `webinar.join_clicked` never changes attendance | E06–E09 | `event_lifecycle` (`public_launch`); a promotional E09 also needs `marketing_dispatch` | `op_accept_event`, `op_expire_jobs` | A6; G0, G2, G3, G4, G5, G6 | AM-ATT-1 and 2; job-state-machine.md §5 (remade events); JS-TIME-2 and 3; the E09 job still has no creation path (A6D2-06) | EV01, EV04, MAIL04, AUTO01 |
| WF05 book and fulfilment | N05 | consumes `book.payment_confirmed`, `book.refunded`, `book.dispatched`, `consultation.redeemed` | E12–E14 | `book_checkout`, `book_fulfilment_messages`, `consultation_redemption` (`public_launch`, `checkout_live`) | `op_accept_event` | A6; G0, G1, G2, G3, G5, G6 | AM-PAY-1 and 2; AM-RIGHT-1 and 2 (30 minutes); PB-STRIPE-1 and 2; offer matrix `book-bundle` | PAY01, PAY02, PAY03, AUTO01 |
| WF06 booking reconciliation | N06 | consumes `meeting.confirmed`, `meeting.cancelled`, `meeting.held`, `consultation.redeemed`, each only for a booking joined to a contact (EV-BOOK-1) | E15, E16 (and suppresses E05 and E11) | `booking_reconciliation`, `meeting_messages` (`public_launch`) | `op_accept_event` | A6; G0, G2, G3, G5, G6 | AM-BOOK-1 to 6 (AM-BOOK-3 to 6 are the booking-to-contact join; the reschedule event mapping is still open, A6D-08); PB-CAL-1 to 3; data-flow register FL-29; offer-matrix meeting types `intro-15` and `book-consultation-30` | BOOK01, BOOK02, AUTO04 |
| WF07 suppression and replies | N07 | consumes `marketing.withdrawn` from `site.unsubscribe`, `site.preferences`, `provider.brevo_webhook` or `operator.suppression` | stops the promotional E03, E04, E05, E11 and a promotional E09 | `preferences_unsubscribe` (none, but must be enabled first) | `op_record_withdrawal` | A6; G2, G3, G5, G6 | AM-CONSENT-2 and 3; JS-SUPP-2 and 3 (a leased job is stopped only by its own pre-send check); AM-REPLY-1; AM-BOOK-2 (a cancellation never restarts nurture) | MAIL03, OPS03, AUTO01 |
| WF08 weekly article draft | N08 | emits `content.draft_created` (source `editorial.draft_job`) | none | `editorial_draft_job` (no flag; G2 budget, currently 0 by D-064) | none (Git, not the database) | A6; G2, G6 (the G2 model budget is 0 until changed, D-064) | PB-LLM-1 and 2; data-flow register FL-21; asset manifest 1.0; "one draft per content key" has no contract rule yet (A6D2-08) | CNT05, CNT06, AUTO01 |
| WF09 approved publication handoff | N08 | reads `content.approved` (source `editorial.approval_ledger`); emits `content.published` (source `editorial.publication_handoff`) | none | `publication_handoff` (`automatic_publication`) | none (Git and the live site) | A6; G2, G3, G6 | AM-CONTENT-1; AM-PUB-1 and 2; approval-scopes.md AS-INV-1 to 4 | CNT05, CNT06 |
| WF10 health and operations report | N09 | reads `delivery.failed` as an operator alert | none | none | none (reads aggregates) | A6; G2, G6 | PB-LOG-1 to 3; BUD-3 operator alert; data-flow register FL-24 | OPS01, OPS02, INF04 |
| WF11 approved retention and reconciliation | N07 (by OPS03; no task names WF11, see §5.3) | none | none | none | `op_erase_contact` (dry run first) | A6; G2, G6; G5 (retention classes, operational-data-model.md §5) | operational-data-model.md §5 retention classes (all pending_G5); PB-STRIPE-2; data-flow register FL-25 (backups follow the same procedure) | OPS03 |
| SM01 RSS to email | N10 | none | none (every smoke send counts against the Brevo budget) | none | none | A6; G2 (credentials, and the action scope of an allowlisted staging test, feature-flags.md §3), G6 to activate | `email-eligibility.json` budget counting rule; PB-LLM-2 (feed content is data) | AUTO03 |
| SM02 webhook to Telegram | N10 | none | none | none | none | A6; G2 (credentials and the FL-26 flow; the bot and chat are not chosen, HB-09b), G6 to activate | data-flow register FL-26 (`telegram_smoke`, not yet chosen); PB-N8N-3 | AUTO03, AUTH03 |

Two 04 rules that bind these workflows are restated in no contract. They are tracked as XL-18 and apply from 04 directly until a contract carries them:
- 04 §4: after accepting an operation, return a truthful queued or accepted state, and never show false success when storage is down.
- 04 §5: one dispatcher, not a long-lived per-person wait step for each nurture message; long-running model work never blocks payment or email delivery.

## 3. Change control

**Rule.** A contract change bumps the version and forces the re-issue of every dependent task.

1. **What counts as a contract change.** Any change to a file in the index, including:
   - a field, pattern, enum, `const`, per-type rule or harness rule;
   - a state or transition;
   - a gate mapping, rule ID or normative sentence;
   - adding, removing, renaming or moving a contract.
2. **Version.**
   - Minor (`1.1`): an addition that a 1.0 consumer can safely reject.
   - Major (`2.0`): a change of meaning, a removal or a rename.
   - The changed contract's own version (`$id` and its version field) moves to the new number. The `contract_set_version` line above moves with it. Unchanged contracts keep their version, and the index records each one.
   - `SET_VERSION` and CX-01 in `validate.py` change in the same edit.
3. **Who may change what.**
   - Only A0 applies a contract change, one at a time (shared-file lock, D-065). A0 records it as a `D-nnn` entry in `decisions.md` with the reason, the contracts affected, the new version and the tasks re-issued.
   - Offers change only when Arnaud and Bill change them explicitly (the offer matrix's `change_control` const).
   - The authority matrix changes only by a plan change (D-040).
   - Workshop inputs, math, fixtures and clip rules also need a new A6 math review and a new G3.
   - A change of personal-data processing needs G5. A new processor, error-monitoring service, self-selected topic, audience upload or feature flag needs a new version first.
4. **Forced re-issue.** Every task listed in the Consuming tasks column of the changed contract is re-issued with the new `contract_version` in its dispatch packet, whatever its state:
   - planned or ready: the task gets the new packet;
   - running: it stops at the next checkpoint and is re-issued on the new version (01 §5, "Rebase or reissue a task after a conflicting contract change");
   - submitted or accepted: A6 re-verifies it against the new version before its acceptance is relied on again.

   A handoff that names an older `contract_version` is not accepted. Splitting a task needs a minor version (WH-ID-1).
5. **Approvals lost.** A change voids every approval bound to the hash of a changed file (approval-scopes.md AS-INV-1, AS-INV-3). For example:
   - any byte change to `workshop-inputs.schema.json`, `workshop-math.md`, `workshop-clip-rules.md` or a fixture voids a G3 on the calculation bundle;
   - a new offer-matrix version voids the approval of every asset whose `offer_refs` names a changed offer.
6. **Not a contract change** (but still validated):
   - Recording a human-decided value in an authoritative instance, such as a G0 price in the offer-matrix instance, a flag document or an asset-manifest entry. It must validate against the unchanged schema, and it voids only the approvals that state that value (offer-matrix.md §10). The cited `decisions.md` row must be the recorded answer for that gate (CX-16).
   - Adding an example or fixture that follows the existing rules. It must pass `validate.py` and is noted in `decisions.md`.
   - An editorial fix that changes no rule keeps the version. It still changes the file hash, so it needs a `validate.py` run and A6 review, and any approval bound to that hash is void.
7. **How to make a change.**
   - Generated files are never edited by hand. Regenerate them with their lane generator:
     - `gen_offers.py`: the offer matrix, the asset manifest, the worker handoff and their examples;
     - `gen_contracts.py`: the event-envelope, delivery-job and feature-flags schemas and their examples;
     - `build_schema.py`, `make_examples.py` and `compute_fixtures.py`: the workshop schema, examples and fixtures.
   - The registries (`email-eligibility.json`, `data-flow-register.json`) and every .md file are written by hand.
   - Update this index, the invariants and `validate.py`.
   - Run `validate.py` to exit 0 and keep the log.
   - A6 reviews the change.
8. **Repairs inside F02's own review cycle (proposed; A0 confirms).** The lanes' repair attempts 2 and 3 changed contract files and kept version 1.0. The integrator reads this as allowed only because F02 is not yet accepted: no task has been dispatched against 1.0, and no approval is bound to any earlier hash. The rules above apply in full from the moment A0 records F02 acceptance. Any later edit then bumps the version.

## 4. Cross-contract invariants

`validate.py` checks every invariant. The ID appears in its output.

| ID | Invariant | Contracts |
|---|---|---|
| CX-01 | One version, 1.0: every `$id` ends `/1.0`; `schema_version` or `contract_version` consts are `1.0`; the registries, the fixture index and each fixture say 1.0 | all |
| CX-02 | The same five human approver roles (`arnaud`, `bill`, `firm_reviewer`, `privacy_owner`, `account_owner`) in the offer matrix, the asset manifest and the flag `approved` state, matching AS-WRITE-1. No agent role (A0–A6 or operator) can approve. | 4, 8, 10, 11 |
| CX-03 | One gate vocabulary, G0–G6, in every enum, gate mapping, register flow and handoff pattern | 4, 5, 8, 10, 12 |
| CX-04 | Locales are `fr` or `en` in events, jobs and clip availability. The asset manifest adds `zxx` (XL-02). | 1, 2, 10, 15 |
| CX-05 | The event types equal the 20 of 04 §3, in order. The job column of event-envelope.md §3 equals the registry's triggers. Each "suppresses" entry maps to a suppression code the template carries. Every promotional template is suppressed by withdrawal. | 1, 3 |
| CX-06 | Per type, the subject, resource, allowed sources and consent rule in event-envelope.md §3 equal the schema. The authority sources are fixed: payment only from `provider.stripe_webhook`; meetings and redemption only from `provider.booking_sync` or `operator.reconciliation`; `meeting.held` only from the operator; attendance only from `provider.meet_attendance` or the operator; approval only from `editorial.approval_ledger`; publication only from `editorial.publication_handoff`. A click (`site.join_redirect`) asserts nothing else. Every source named anywhere is in the enum. | 1, 6 |
| CX-07 | Consent: `consent_reference` is required exactly on `marketing.opted_in`, `marketing.withdrawn` and `workshop.completed`, and forbidden elsewhere. Promotional templates (E03, E04, E05, E11) agree between the job schema and the registry and require consent. Purposes `nurture` and `workshop-followup` agree between the registry, the envelope and the data model. | 1, 2, 3, 7 |
| CX-08 | Templates e01–e16 are the same set in the job enum, the registry, the capability union (each exactly once), envelope resource codes and asset IDs. The registry's class, resource kind, capability, controlling flags and priority band agree with the job schema and the feature flags. | 1, 2, 3, 4, 10 |
| CX-09 | Exactly six flags and seventeen capabilities. The tables in feature-flags.md §2 and §4 equal the JSON consts. No other flag name is used in any contract (the known exception is XL-03). | 3, 4 |
| CX-10 | Job states, error codes, defer reasons and suppression codes agree between the job schema, job-state-machine.md and the registry. Every `op_*` operation named anywhere is defined in operational-data-model.md §4 (for example `op_prepare_send`, `op_record_withdrawal`). Audit actions named in the state machine exist in the data model. | 2, 3, 7 |
| CX-11 | Four offers. Meeting types `intro-15` = 15 minutes and `book-consultation-30` = 30 minutes in the offer matrix and the data-model checks. The included consultation is 30 minutes. No duration `const` is 60. Asset `offer_refs` use the offer IDs. | 7, 8, 10 |
| CX-12 | Route keys: `lib/routes.ts` on origin/main and codex (9 keys), plus `ask` (homepage branch), plus the 10 proposed keys of routes.md, equal the asset manifest's `intended_route_key`. Proposed slugs do not collide or shadow. The offer matrix's meeting-link and exempt lists cover every route key exactly once (with the pseudo-key `articles`, XL-12). Every offer route key exists, with its existing or proposed status. | 8, 9, 10 |
| CX-13 | Resource codes (A6D-03). (a) Content registry keys contain no digits, in asset IDs and in envelope resource codes. (b) Contact-subject codes (guide, workshop, consent wording) accept only the closed key sets of PB-ID-3 and only the `h` hash version, so no readable number, name or diagnosis fits. (c) What a schema cannot see, a number written in hex, is closed by PB-ID-5 (registry membership), which AUTH05 and WK04 test at runtime. | 1, 5, 10 |
| CX-14 | Internal ID prefixes agree between PB-ID-1 and event-envelope.md §4.1. Every 26-character ID pattern uses the Crockford alphabet `[0-9a-hjkmnp-tv-z]`. The data model uses only declared prefixes. `purpose_key` embeds exactly the `template_version` form. | 1, 2, 5, 7 |
| CX-15 | The five review-hash methods in the asset manifest equal approval-scopes.md §4.2 | 10, 11 |
| CX-16 | Authoritative instances cite only real records: an existing approval packet, or a `decisions.md#D-nnn` row that exists and is a recorded answer. That row must name the gate of the gate record, carry an answer date, and not have one of the four non-recorded statuses of `decisions.md` (`frozen-by-plan`, `default-pending-G0`, `resolved-by-evidence`, `open`). A price citing D-032 ("No price exists anywhere") is refused (A6D-13). Fixture documents cite only `fixture:` references. Negative examples prove that agent approvals and fixture references are refused. This is a floor: the recorded value itself is still checked by A6. | 4, 8, 10 |
| CX-17 | No financial data: the PB-SCAN lists parsed from privacy-boundary.md §5 hit no envelope or job property and no valid event or job example. They catch every serialized workshop state and the negative examples carrying amounts or addresses. The data model has no forbidden column. DC-FIN-* stay browser-only. Examples use only reserved address domains (PB-ENV-3). | 1, 2, 5, 7, 13 |
| CX-18 | Register tests and fixture coverage cite catalog checks. The handoff `task_id` pattern accepts exactly the 62 IDs of `tasks.json`. | 5, 12, 14 |
| CX-19 | Every check, decision, blocker and task ID cited in a contract or in this README exists. Clip IDs W05–W11 are not task IDs (XL-08). | all |
| CX-20 | Brevo budget: operational reserve 150 < soft budget 250 < hard stop 280 < provider quota 300. The promotional maximum equals the soft budget minus the reserve. Operational priorities (0–3) come before promotional ones (5–9). | 2, 3 |
| CX-21 | Every example, fixture and clip-case count stated in an .md file equals the files | all with examples |
| CX-22 | Workshop clip IDs (clip.w00–w11) are accepted by the asset manifest and by envelope resource codes | 1, 10, 15 |
| CX-23 | No contract file contains a credential-shaped string (Stripe, Brevo, GitHub, AWS, private key or JWT). The idempotency key secret `EVENT_KEY_SECRET` is named only; its value is never in a contract. | all |
| CX-24 | A forbidden duration or tool (a 60-minute consultation, a one-hour offer, Zoom, n8n Cloud, Vercel Hobby, a custom video platform, a live customer-facing LLM) appears only as a prohibition | all |
| CX-25 | This README lists exactly the CX and XL IDs that `validate.py` implements, open and resolved | 16 |
| CX-26 | Every normative .md file states in its header that it is proposed | all |
| CX-27 | Clip availability derives from asset manifest 1.0. `available` means a `clip.wNN` entry in that locale with status `approved` or `published`, `language_availability` `language_recorded` and recording evidence. `captions_only` never counts as a recording. `test_media` never appears in an authoritative manifest. This is the reconciliation proposed for XL-10. | 10, 15 |
| CX-28 | Every contract file is UTF-8 with LF line endings and no BOM, as the `file-sha256-v1` method assumes | all |
| CX-29 | The sha256 values recorded in the three lane validation logs still match the current bytes, so the lane evidence describes these files | all |
| CX-30 | Unknown is never zero, and the fixtures prove it (math review P2-1). Every reason code of workshop-math.md §7 is pinned by a WM fixture. A code that acts inside a known window is pinned by a fixture with a window and a `not_computable` year whose gap and surplus are null and whose reasons carry the code. The two timing codes are pinned with no window. Every fixture named in the §6 "Pinned by" column exists. The fault reproductions themselves (unknown read as 0, as "not paying" or as "no end") run in the math lane's harness against its exact model; this harness checks the coverage they rely on. | 13, 14 |
| CX-31 | The workflow trace in §2a names exactly the 14 workflows of 04 §5, in order. Every task, event type, template, capability, flag, operation, rule ID and check it cites exists. Every `x.md §N` citation names an existing section whose text holds the label cited with it (A6D2-09). Each activation gate equals the approval-scopes.md §2 baseline (A6, G2, G6) plus the production gates of the row's capabilities, plus G5 for WF11. Every event type, template and operation is traced by at least one workflow. | 1, 2, 3, 4, 7, 11, 16 |

## 5. Cross-lane inconsistencies (for the verifier)

The integrator wrote only this README and `validate.py`, and fixed no contract file. `validate.py` tracks each open item as `KNOWN`: it does not fail the run, but if it stops reproducing, the run fails until this table is updated. Each resolved item is checked the other way, and a regression fails the run. Severity uses the A6 classes.

### 5.1 Open

| ID | Finding | Sev. | Proposed resolution (owner) |
|---|---|---|---|
| XL-02 | The asset manifest allows locale `zxx`; the envelope allows only `fr` or `en`. A content event for a text-free drawing has no valid locale. The repair of XL-01 did not include it. | P3 | Envelope 1.1: allow `zxx` on `content.*` types only (A0) |
| XL-03 | `workshop_capital_illustration` is named in workshop-math.md §11 and workshop-inputs.md §2 but is not among the six flags. It is safe as it stands, because the capital illustration cannot be enabled at all. | P3 | Add the flag in a new feature-flags version only if HB-26 approves a display (A0, A2) |
| XL-04 | The version field is `schema_version` in the event envelope, delivery job and feature flags, and `contract_version` elsewhere | P3 | Unify in 2.0. Until then, consumers read the field their schema names. |
| XL-05 | `offer-matrix.json` and `feature-flags.json` are JSON Schemas without the `.schema.json` suffix, while `email-eligibility.json` and `data-flow-register.json` are instances. The authoritative offer matrix and asset manifest live under `examples/valid/`. A loader could read a schema as data, or treat an example folder as its runtime source. | P3 | Rename the schemas and move the instances to their own folder in 1.1 (A0). Until then, §1 of this README names the authoritative paths. |
| XL-06 | The registry schemas cited by the two registries (`registry_schema`) live under `evidence/F02/data/registry-schemas/`, not under `contracts/`. The email-eligibility registry schema also leaves three objects open (`validate.py` reports them as INFO in S2). | P3 | Move them into `contracts/` and close those objects in 1.1 (A0) |
| XL-07 | The `.why.txt` files use three dialects. The data lane writes paths without a leading slash and `/` for the root. The offers lane uses a JSON pointer plus `breaks:` and `harness:` keywords. The math lane uses `layer:` plus extra keys. | P3 | `validate.py` normalises all three. A downstream conformance suite must do the same until 1.1 unifies them (A0). |
| XL-08 | Clip IDs W00–W11 (05 §3) share the form of task IDs W00–W04. workshop-inputs.md §1 says "That design belongs to W01/W05", but no task W05 exists (probably W01 and check WK05). approval-scopes.md §6 "W05–W10 scripts" means clips. | P3 | Write clips as `clip.wNN` in prose. A2 confirms and fixes the W05 reference. |
| XL-10 | Two owners for one shape. workshop-clip-rules.md §7 says the media-availability manifest shape "belongs to W03/C10". asset-manifest.md says the C10 and C11 media manifests use asset manifest 1.0. | P3 | Use asset manifest 1.0, with availability derived as in CX-27. A0 confirms at W03 dispatch. |
| XL-12 | The offer matrix's `must_link_to_meeting` contains the pseudo-key `articles`, which is not a route key. `ask`, on the homepage branch only, is in the asset manifest's route enum but in neither offer-matrix list. | P3 | R00 reads `articles` as every approved article page. Porting `ask` (HB-03, HB-23) needs an offer-matrix version change. |
| XL-13 | For DC-CONTACT at Stripe, the privacy sink matrix says "C" (conditional), while the register's DC-CONTACT allowed sinks exclude Stripe; buyer data is Stripe-collected (DC-SHIPPING, DC-CARD). The intent agrees (PB-STRIPE-1: internal IDs only), but the class boundary differs. | P3 | Clarify in 1.1 (data lane) |
| XL-14 | `handoffs/F00.json` does not conform to worker handoff 1.0: 6 errors, from prose in `changed_paths` and a `not_visible` status | P3 | A0 decides whether to reissue it (approval-scopes.md §8). Its accepted status is unaffected. |
| XL-15 | Nine math-lane rule labels cited by `.why.txt` files (ASSET, ASSUMPTION, BASIS, LABEL, NONFINITE, PRIVACY, RANGE, START, UNITS) are not defined as rule IDs in workshop-inputs.md. The data and offers lanes define every rule ID they cite. | P3 | Add them to the workshop-inputs rule index in 1.1 (math lane) |
| XL-16 | The envelope's `resource_template_version` accepts `template.eNN.vN`, but jobs only ever hold the hash form `hNNN…`. A `delivery.failed` event could cite a version no job had. | P3 | Restrict it to the hash form in 1.1, or producers copy the job's `template_version` verbatim (A4 at P02) |
| XL-18 | Two 04 rules that bind the workflows appear in no contract file (§2a): 04 §4, a truthful queued or accepted state and no false success when storage is down; 04 §5, one dispatcher with no per-person wait step, and model work that never blocks payment or email. Found while tracing the workflows for A6D-12. | P3 | Restate them in job-state-machine.md 1.1 (data lane). Until then P02, U00–U05 and N02 take them from 04 directly, and A6 checks them (AUTO02, MAIL04). |
| XL-19 | PB-ID-3 closes the guide key set to `retirement-guide`, and adding a key is a contract change. Asset manifest 1.0 accepts any `guide.<key>` and names no key for the approved guide. A guide asset approved under another key, for example `guide.pre-retirement-guide` (the name of an existing branch), could be approved and published but could never be delivered through `guide.requested`. | P3 | C01 and H00 register the free PDF as `guide.retirement-guide`, or A0 adds the key to PB-ID-3 in a new version (offers and data lanes) |
| XL-20 | The data model's `bookings.offer_id` holds `intro-15` or `book-consultation-30`. Those are offer-matrix **meeting type** IDs. The offer IDs are `intro-15` and `book-bundle`, so `book-consultation-30` is not an offer. A consumer that joins `bookings.offer_id` to the offer matrix's `offers` finds no row for a book consultation. The column comment itself says "reconcile with the offer-matrix contract". Found while re-reading the data lane's repair-3 booking tables. | P3 | Rename the column `meeting_type` in 1.1 (data lane). Until then, P01, U02, U03 and N06 read `bookings.offer_id` as an offer-matrix meeting-type ID, and reach the offer through `meeting_types.<id>.offer_id`. |

### 5.2 Resolved by the lanes' repair attempt 2 (regression-checked)

The data lane closed these four items in its own files, following A6D-05 to A6D-07. `validate.py` checks each one in S7 as "resolved and still resolved".

| ID | Former finding | Sev. | What changed, and what the check asserts |
|---|---|---|---|
| XL-01 | The envelope's `resource_content_version` rejected the asset IDs `companion.*`, `ink.*`, `book.*`, `event.*` and `copy.*`, so no content event could be emitted for them. | P2 | The ID alternation of `resource_content_version` is now a copy of the asset-manifest `asset_id` pattern, followed by the version. The check asserts that copy and that a sample of all 13 asset kinds is accepted. |
| XL-09 | AM-CONSENT-4 cited "job-state-machine.md PSC", and the data model's `remade_as` comment cited job-state-machine.md §7. | P3 | AM-CONSENT-4 now cites job-state-machine.md §6 and `email-eligibility.json` PSC-1 to PSC-7, which exist. `remade_as` cites job-state-machine.md §5, which holds "Remade events". |
| XL-11 | `marketing_dispatch` did not control `workshop_followup`, and a promotional E09 was stopped only by prose. | P2 | `marketing_dispatch.controls` includes `workshop_followup`. FF-GATE-2 holds for every flag except `public_launch`. FF-RUN-2 and PSC-3 make `marketing_dispatch` a requirement of every promotional job. E09's `alternate_class` lists it in `additional_controlling_flags`. The operational E02 staying behind `marketing_dispatch` is now documented as intended in the flag's feature-flags.md §2 row. |
| XL-17 | The data model's PB-SCAN-1 financial list lacked `balances` and `assets`. | P2 | All four PB-SCAN-1 lists in operational-data-model.md §3 now equal privacy-boundary.md §5. |

### 5.3 Other items for the verifier (not cross-lane)

- **Addressed in this README and `validate.py`, this round:**
  - A6D2-04 (index): the harness now applies ECMA-262 semantics to every schema pattern. `$` matches only at the end of input, and `.` and `\s` use the ECMA sets, so the harness no longer accepts a trailing newline that Ajv or zod would reject. S2 checks that every pattern translates and that no keyword runs a pattern outside the translation. NC-13 shows the three values of the review now rejected, and prints that plain `jsonschema` still accepts them.
  - A6D2-09 (index): §2a has an activation gate column, derived as stated above it. The WF11 row now cites operational-data-model.md §5 for retention (it cited §6). CX-31 now checks section citations, rule IDs and activation gates, and NC-14 proves each of these checks catches a defect. Re-tracing the rows for the data lane's repair 3 added JS-SUPP-1 to 3, AM-BOOK-3 to 6, EV-BOOK-1, PB-CAL-3 and FL-29.
- **Addressed in earlier rounds, still checked:** A6D-03 (CX-13), A6D-12 (§2a, CX-31), A6D-13 (CX-16, NC-9), and math attempt-1 P2-1 (CX-30, NC-10).
- **Closed by the lanes' repair attempt 3.** The integrator re-read each one. A6 re-verifies them.
  - A6D2-01 (data). JS-SUPP-1 to 3 give one rule: a withdrawal sweep changes only pending and retry_due jobs, and a leased job is stopped only by its own pre-send check. The schema now rejects a suppressed job with `send_started_at` (invalid example `suppressed-after-send-started`). `op_record_withdrawal` and AM-CONSENT-2 say the same.
  - A6D2-02 (data). AM-BOOK-3 to 6, PB-CAL-3, EV-BOOK-1, register flow FL-29 and the `bookings.contact_match` column name the booking-to-contact join (an exact address match via `email_hmac`, with the address never stored) and what happens to an unmatched booking.
  - F02-MATH2-P2-1 (math). The three income groups are null whenever `coverage` is `not_answered` or `some_sources_may_be_missing`. WM07 and WM30 were updated, and the math lane's negative control `incomplete_coverage_groups_as_listed` is caught by them.
  - Math attempt-2 P3-2 and P3-3 (math): wording only.
- **Still open, each inside one lane (all P3).** The integrator re-read the current files.
  - Data lane:
    - A6D2-03: no rule says the server stamps `occurred_at` for `site.*` events.
    - A6D2-06: the E09 job has no creation path.
    - A6D2-07: PB-FIN-5 and the WK04 canary procedure do not name the two allowed workshop POSTs.
    - A6D2-08: "one draft per content key" has no contract rule, and the `editorial.*` origin cannot enforce it.
    - A6D-08: no event writes `bookings.rescheduled` or `no_show_recorded`.
    - A6D-09: the HMAC key of `contacts.email_hmac` is still unnamed (§6).
    - A6D-10: `consent_events` has no evidence column.
    - A6D-11: job-state-machine.md §2 still defines `expired` as "before a provider call started", while T13 and T16 expire a job after one.
  - Offers lane:
    - A6D2-05: asset-manifest.md §5 still says the envelope "does not yet accept" five asset kinds (XL-01 is resolved), and §1 still claims an age or amount cannot be encoded in an asset ID.
    - A6D-14: approval-scopes.md §3 still says a review beyond the first 100 "fails closed".
    - A6D-15: the routes.md §2 cell still reads "Basic Auth (503 without credentials)".
  - Math lane: attempt-2 P3-1. Two display-rounding faults pass every fixture: a group total summed from rounded rows, and a today-dollar value deflated from a rounded gap.
    - The math lane left it open because README row 14 names WM01–WM36. That row is not an obstacle. Adding a fixture that follows the existing rules is not a contract change (§3 rule 6), and the integrator updates row 14 and CX-21 in the same round.
    - `validate.py` cannot carry the negative control the review asks for until such a fixture exists. No fixture catches these faults today, so the control could only fail.
- **WF11 has no owning task.** 04 §5 lists WF11, but no task in `tasks.json` or `TASK_LEDGER.md` names it. N07 carries OPS03, so §2a maps WF11 to N07. A0 should confirm the owner or amend the ledger.
- **Housekeeping for A0.** `evidence/F02/math/__pycache__/` holds a compiled file left by a lane run without `PYTHONDONTWRITEBYTECODE`. It is not an artifact, and the handoff excludes it.

## 6. Unknowns that stay unknown (owners)

| Unknown | Owner and gate | Asked in |
|---|---|---|
| Book price, currency, tax, shipping, refund and cancellation terms, validity of the included consultation, batch size, printer | Bill and Arnaud (G0); wording G1; process G5 | HB-20, HB-28 |
| Entitlement unit (proposal: one household per book) | Bill and the firm reviewer (G1) | HB-20, HB-24 |
| Which book is canonical, and whether a French edition exists | Arnaud and Bill (G0), then G3 | HB-04 |
| Weekly capacity, in-person room, online video tool for each meeting type (a service containing Zoom is refused) | Bill (G0) | HB-14, HB-15, HB-16 |
| Retention periods, processors and regions, consent wording, single or double opt-in, browser-storage expiry | Privacy and operations owner (G5) | HB-21, HB-26, HB-27 |
| Brevo quota window, message-ID and unsubscribe-link formats; Meet attendance capability | A4 at P05 | TB-06 |
| Media origin and its log retention; which PB-MEDIA-4 variant W03 and W04 implement | Arnaud, with an A3 estimate (D-026) | HB-10 |
| Default horizon and inflation shown by the workshop | G3 with a cited source | HB-26 |
| The name and destination of the key for `contacts.email_hmac` (A6D-09) | Data lane proposes it; A0 adds it to the 06 secrets map | not yet asked |
| The `decisions.md` status value that marks a recorded G0–G6 answer (CX-16 accepts any status other than the four non-recorded ones) | A0 (F01 register) | not yet asked |
| How long a held meeting keeps suppressing E05 and E11 (`already_booked`, "window pending G5" in `email-eligibility.json`) | Privacy and operations owner (G5) | not yet asked |

- **Secret named by this set.** `EVENT_KEY_SECRET` is the HMAC key for idempotency keys (event-envelope.md §4.3).
  - Destination: the application server-only environment, entered by the authorized operator, following the 06 secrets map (HB-07).
  - Never in chat, git, logs or examples.
  - The key for `contacts.email_hmac` is a second secret that no contract names yet (A6D-09). It must not be `EVENT_KEY_SECRET`: rotating that key would break suppression matching after erasure. It goes to the same destination once named.

## 7. How to run validate.py

`validate.py` is one file. It needs the Python 3 standard library (3.10 or later) and `jsonschema` (Draft 2020-12). It writes nothing, uses no network, and never checks out a branch.

**Pattern semantics.** JSON Schema patterns are ECMA-262 expressions, but `jsonschema` runs them with Python `re`. There, `$` also matches before a final newline, and `.` and `\s` use different character sets. `validate.py` therefore translates every schema pattern to ECMA-262 meaning before use (A6D2-04). It refuses any construct it cannot translate, such as `\d`, `\w`, `\b`, `\p` or a named group, so a new pattern cannot silently change meaning. The three lane validators still use plain `jsonschema`. They differ from `validate.py` only on such inputs, and no example or fixture contains one.

It reads:
- `contracts/`;
- in `.orchestration/`: `acceptance_catalog.json`, `tasks.json`, `decisions.md`, `blockers.md`, `source/04_CONTRACTS_AND_TESTS.md`, `handoffs/`, the three lane `validation.log` files and `evidence/F02/data/registry-schemas/`;
- `git show` of `lib/routes.ts` on origin/main, origin/codex/desktop-iphone-unified and origin/claude/bill-centered-homepage.

The venv used for F02 is `/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-f02` (Python 3.11.15, jsonschema 4.26.0). It is session scratch space, so recreate it if it is gone:

```bash
VENV=/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-f02
[ -x "$VENV/bin/python" ] || { python3 -m venv "$VENV" && "$VENV/bin/pip" install jsonschema; }
cd /home/user/bill
PYTHONDONTWRITEBYTECODE=1 "$VENV/bin/python" .orchestration/contracts/validate.py
echo "exit=$?"
```

**Exit status:**
- 0: every result is as expected.
- 1: at least one unexpected result. Every `FAIL` line is listed again under "unexpected results".
- 2: setup error, such as a missing `jsonschema` or a missing repository file.

**Output labels:**
- `PASS`: an expected result.
- `FAIL`: an unexpected result.
- `KNOWN`: an open item from §5.1 that still reproduces exactly.
- `INFO`: context only.

**Sections:**
- S1: this index, the inventory with the sha256 of every contract file, and CX-28.
- S2: the schemas, including the ECMA-262 pattern check.
- S3: the examples.
- S4: the registries.
- S5: the workshop fixtures.
- S6: CX-01 to CX-27, CX-30 and CX-31.
- S7: the open items of §5.1 (`KNOWN`) and the resolved items of §5.2 (`PASS` while they stay resolved).
- S7b: CX-29.
- S8: negative controls NC-1 to NC-14, which inject defects that must be caught.
- S9: `handoffs/*.json`.

**Other modes:**
- **Negative control on a copy.** Copy `contracts/` to a scratch folder, inject a defect, then run `validate.py --contracts-dir <copy>`. The expected exit is 1.
- **One handoff, checked deeply.** `validate.py --handoff .orchestration/handoffs/<task>.json` checks:
  - the schema;
  - that `base_commit` equals HEAD;
  - that every artifact hash matches the current bytes;
  - that every changed path and evidence path exists;
  - for F02, that every contract file is listed as an artifact.
- **The lane validators, re-run read-only:**
  - `.orchestration/evidence/F02/data/validate_f02_data.py`;
  - `.orchestration/evidence/F02/math/validate.py`, which also runs the math generators with `--check`, which only compares;
  - `.orchestration/evidence/F02/offers/validate_offers.py`.

  The lane generators and `offers/run_validation.sh` rewrite files. Run them only to make a change under §3.
