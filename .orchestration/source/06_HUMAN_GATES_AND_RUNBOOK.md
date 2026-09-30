# Source transcription — 06_HUMAN_GATES_AND_RUNBOOK.md

> Transcribed by A0 on 2026-09-30 from the operator-supplied handoff v1.0 (2026-09-29).

## Human gates, operating ownership and launch routine

This file is an approval map. It is not evidence that the approvals exist. Previously stated product choices are already requirements; ask only for missing operational decisions, access or professional approval.

### Gate registry

| ID | Owner | What must be recorded | What it unlocks |
|---|---|---|---|
| G0 | Arnaud + Bill where relevant | Final production host, canonical branch, audience/geography/language, actual event date/cap, scheduling owner, book price/cap, approved time allocation | Configuration of the chosen production design; unblocked local work can proceed before it |
| G1 | Bill + required firm reviewer | Verified identity/designations/affiliation/service scope; actual approved 15-minute and book/30-minute offer; publication claims | Use of those claims in final copy, not general draft creation |
| G2 | Account owner/Arnaud | Named accounts, least-privilege access, precise staging/live-test permissions, spending caps, subscriptions if any, authorized recipient allowlist | External setup, test sends, paid API use and scoped staging integration; not public launch |
| G3 | Bill + required firm reviewer | Exact hashes/versions of public pages, book, scripts, cases, articles, ads, email templates and calculations | Publication eligibility of those exact artifacts; later material changes require new approval |
| G4 | Bill + relevant rights holders | Actual approved recordings, portraits/art rights, recording consent and replay release policy | Connecting real Bill media and distributing recorded material |
| G5 | Responsible privacy/operations owner | Data-flow and privacy assessment, consent wording, retention, processor choices, incident owner, fulfilment/refund/cancellation process | Processing personal data in the agreed production scope |
| G6 | Arnaud/Bill as appropriate | Release manifest, successful acceptance evidence, active feature list, ads/account/budget scope, rollback plan and named operator | Controlled public activation; ad spending is separately specified and never assumed |

G3 is asset-scoped. Approving a webinar does not approve all future weekly blog posts. G2 is action-scoped. Permission to test one email does not permit sending the full list. G6 cannot be substituted by an agent stating "ready."

### One input sheet; no secret values in chat

Ask for these once, assigning unresolved items to their owner:

**Arnaud:** VPS hostname/provider/resources; current proxy and deployment method; selected production host; DNS owner; repository branch decision; secure secret store; recipient allowlist; deployment authority; model/API and ad caps; backup destination; monitoring contact.

**Bill:** Google/Calendar account and existing subscription; six or another real number of 15-minute slots/week; two or another real number of 30-minute book slots/week; online/in-person arrangements; first Crossroads date and capacity; intended languages; recording session; book price, shipping/refund terms and unit cap; approved professional details and reviewer.

**Reviewer/privacy owner:** scope of first conversation; wording of included consultation; source/claim review; limits of the workshop calculator; privacy/consent/retention/processor decisions; claims in the book and audio; testimonials/reviews rules.

Use the owner's real existing accounts where authorized. No fake accounts, assumed licences, borrowed personal keys or automatic domain/email migration. Buying Workspace is not permission to change MX records or move Bill's current mailbox.

### Secrets map — names, not values

| Secret/config | Runtime destination | Who enters it |
|---|---|---|
| n8n encryption key | VPS protected env/secret facility; separate off-host backup | Authorized operator |
| n8n owner credentials and recovery | n8n user management/password manager | Bill/authorized operator |
| Supabase server credentials | Application server-only environment; scoped service operations | Authorized operator |
| Brevo API/SMTP key | n8n credential vault or approved server adapter | Authorized operator |
| Stripe secret + webhook secret | Server environment for payment verification | Stripe account owner/operator |
| Google OAuth client/refresh credentials | n8n credential vault with approved scopes | Google account owner/operator |
| Automation service token | Server/n8n credential store, rotated and scoped | Authorized operator |
| Preview credentials | Protected staging only | Authorized operator |
| Model API credential | Weekly drafting runner only, budget cap | Authorized operator |
| Ad/LinkedIn tokens | Only approved publishing integrations | Authorized account owner |

Never put these values in task JSON, screenshots, worker prompts, git, general backups or marketing exports. Back up the n8n encryption key separately before adding credentials. Avoid granting arbitrary shell nodes access to the secret environment.

### Friday pilot run of show

**Before inviting testers.** Review current code/content approval flags. Verify that staging and production point to the intended database, email account, checkout mode and booking calendar. A test banner must be obvious in staging. Confirm the active review credentials are not in public URLs.

Prove guide access without newsletter opt-in; verify one allowlisted guide message; unsubscribe and test suppression; book a test slot and cancel it; pay through Stripe test mode and verify exactly one entitlement; complete the workshop with financial values while inspecting outbound requests.

The event has an actual host, moderator, link and guest-join procedure. Test on a phone and desktop outside Bill's organization. The deck, answer key, scorecard, recording disclosure and emergency message are ready. Neither a slide mockup nor an untested meeting link constitutes rehearsal.

**During the pilot.** Arnaud watches the operations list, provider errors and inbox. Bill hosts/speaks. Testers note confusing steps without being asked to disclose real finances. Assign every defect an ID and owner. Observe whether someone can join, answer a case, receive the promised material and find the 15-minute offer.

**After the pilot.** Reconcile actual test events, email receipts, booking calendar and payment rights. Record P0/P1 blockers. Create the release manifest and seek G6. Keep public features disabled until their individual gates pass.

### Runbook: a failed action

1. Inspect the durable event/job ID and provider ID without exposing sensitive data.
2. Classify: input rejected, authorization expired, provider outage, rate/quota limit, uncertain outcome or application defect.
3. For an uncertain outcome, reconcile first; do not repeat a charge, publication or send blindly.
4. If an event reminder expired, cancel it. Do not email "starts in one hour" tomorrow.
5. Retry bounded recoverable failures. Escalate persistent failures to the named operator.
6. Pause the relevant campaign when its destination is broken.
7. Add a regression test after fixing the defect.

### Runbook: backup and restore

Nightly backups need a success manifest, version, timestamp, checksums and encrypted off-host copy. Retain fourteen successful daily sets; retain the original encryption key separately. Alert when the latest verified backup is older than the approved interval.

Monthly, restore into an isolated environment with production sends, schedulers and public endpoints disabled. Verify data integrity and credential decryption without contacting real recipients. A rollback after database migration uses the compatible database/version pair. Preserve and reconcile new orders/consents before any destructive action.

### Runbook: weekly operating review

The operator reviews one report: failed/due jobs; calendar availability; book fulfilment/rights outstanding; sending quota forecast; approved content ready; source review dates; real meetings held; spend; next single experiment. Bill handles personal financial questions. The reviewer approves new substantive content. The agent never autonomously increases spend, changes service promises or resumes a withdrawn subscription.

### Handover standard

Bill/authorized firm owns accounts and domains. Deliver access/roles, renewal dates, cost ledger, restore evidence, recurring schedule ownership, full source/assets, rejected-draft archive where required, current content review dates, rights register, incidents and a secret-location map. Remove temporary contractor keys and test fixtures safely. Conduct an operator walkthrough, not just an archive delivery.
