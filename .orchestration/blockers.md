# Consolidated blockers (F01)

- Task: F01. Owner A0 (delegate), reviewer A6, stage design_or_audit. Status: **accepted**. A0 accepted F01 on 2026-09-30 after the A6 attempt-2 pass (`reviews/F01-attempt2.md`), recorded at `cb3becf`. The post-acceptance patch below was reviewed by A6 in F02a attempt 3, part B (`reviews/F02a-attempt3.md`: pass). A0 patch 1 (`evidence/A0-patch-1/`) then updated this header and HB-08's "Provide" line, from F02A-A6R3-P3-4 and P3-5.
- Written 2026-09-30 against HEAD `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b`. Decision IDs (D-xxx) refer to `decisions.md`.
- This is the **one** human-input batch required by the 00 launch instruction and the 06 "One input sheet". It merges the 06 sheet, the 01 §2 unknowns, F00 questions Q1–Q15 (`inventory.md §10`) and the inputs that later gated tasks need (for example N10's smoke targets and G4's replay policy), without duplicates, so no second ask is needed when those tasks start. Nothing here is an approval.
- A0 post-acceptance patch (2026-09-30, from `reviews/F01-attempt2.md` P3-1…P3-5): HB-08 proposal made single-outcome and (b) existing-cost question added; HB-22 asks about the AI-assisted cover/likeness; HB-03 keeps presentation/ outside the baseline; G2 'not askable yet' and G5 rows corrected; three backup/media secret rows added. Pre-patch copy retained by A0 in its scratchpad; this patch is reviewed by A6 in F02a.
- Repair attempt 2 (after `reviews/F01.md`): HB-02 now asks about any existing n8n on the VPS; HB-09 covers the N10 smoke targets; the Secrets table covers the Telegram bot token, the SM02 webhook secret and provider logins; P3 review items are folded into HB-06, HB-11, HB-13, HB-15, HB-16, HB-17, HB-21, HB-25 and HB-27. HB numbers are unchanged.

## How to answer, in one sitting

1. Reply to the director (A0) once, item by item, using the HB numbers. "Proposal OK" accepts a proposal as written. "Don't know yet" is a valid answer: the item stays open and work continues around it.
2. **Non-secret answers**: reply to the director. A0 records each one in `decisions.md` with the date and who answered.
3. **Personal data** (such as tester email addresses): reply to the director. The addresses go into the staging configuration, not into git; `decisions.md` records only that the list exists and how many entries it has.
4. **Secrets** (passwords, API keys, tokens, private keys, card numbers): **never in chat**. The "Secrets" table below gives each one's secure destination from the 06 secrets map.
5. **Approvals of final copy, calculations or media** (G1, G3, G4) are not given by a chat "yes". A0 prepares an approval packet in `.orchestration/approval-packets/` (task H00) that carries the reviewer's name, the date and the exact artifact hash.

**Friday effect codes**
- **HARD**: the controlled invited pilot (L05) cannot run without this. The plan's fallback is a clearly labelled protected rehearsal (01 §6, D-039).
- **REHEARSAL**: needed even for a meaningful protected rehearsal of that path.
- **LATER**: not needed for Friday October 2.

## Pilot status on the evidence (2026-09-30)

- Tasks, as a snapshot taken when F01 was written at `5cbbf9b`: F00 accepted, F01 running, 60 of 62 planned. `tasks.json` holds the current states. At A0 patch 1 they are: F00, F01, F02 and F03 accepted, F02a running, and 58 of 63 planned.
- L05, the controlled invited pilot, needs gates G0, G1, G3, G4, G5 and G6 recorded (TASK_LEDGER). **None is recorded.** It is task 14 on the 18-task longest dependency chain (`tasks.json` meta).
- 0 Bill video recordings exist, and no approved book PDF (`inventory.md §4`). No Bill Google, Brevo, Supabase, Stripe or ad account is visible (§7). The VPS is not visible (§7).
- So on the current evidence, Friday October 2 can only be a **clearly labelled protected rehearsal** of whatever passes locally, using fictional data. That changes only if the gates are recorded and the recordings exist. Items marked HARD are what closes that gap. This is a statement of the plan's rules applied to the evidence, not a request to drop scope.

---

## 1. Arnaud

**HB-01. Production host** (G0)
- Question: Keep the plan default (the existing VPS) for production, or explicitly choose Vercel Pro instead?
- Why: P00 prepares exactly one production target (D-019). Vercel Hobby is forbidden for commercial use (D-012).
- PROPOSAL: the existing VPS.
- Blocks: final selection in P00; live parts of P03, P04, N09; L06.
- Friday: REHEARSAL for any hosted staging. A local-only rehearsal is possible without it.
- Provide: reply to the director → D-019.

**HB-02. VPS facts, access and any existing n8n** (G0, G2)
- Questions:
  - (a) Provider, hostname, CPU, RAM, disk and OS? Which reverse proxy runs there, and does it run in Docker? How are things deployed today? What else runs on the server? Is anything backed up today? Will you give the operator shell access?
  - (b) **Does any n8n already run on the VPS**, for example from the setup requested earlier (01 §8: "implement/review the previously requested setup rather than rebuilding n8n")? If yes: how is it started (Docker Compose, `docker run` or something else)? Which version or image tag? Where is its data (volume or folder), and is it SQLite? Which hostname or URL does it answer on, and is port 5678 in use? Are there workflows or credentials to keep? Was an `N8N_ENCRYPTION_KEY` set explicitly, and is it backed up somewhere other than the server? For the key, say only whether it exists and where it and its backup are kept, never the value.
- Why: A3 must inspect before changing anything (01 §7, §8; 03 A3). INF01–INF07 can only pass on the real server (TB-08). F00 saw no self-hosted n8n but could not inspect the VPS, so its existence is unknown (D-045b). A fresh install over an existing instance could collide on port 5678 or its volume, and losing its encryption key makes its stored credentials unusable (01 §8).
- PROPOSAL: none for the facts. For access, you add the operator's **public** SSH key on the server yourself. For (b): if an instance exists, A3 inspects it read-only, and P03 reviews it and brings it to the D-021 standard, keeping its volume and key; a new install happens only after you confirm none exists.
- Blocks: P00, P03 (live, and whether P03 is a review or a new install), P04 (live), N09, N10, L01, L06.
- Friday: HARD (no staging without it).
- Provide: facts → reply to the director (recorded in D-019, D-021 and D-045). Private keys, passwords and the n8n key value → never in chat; they go in the secret store named in HB-07 (the n8n key has its own row in the Secrets table).

**HB-03. Canonical branch and design direction** (G0; Bill for the design)
- Question: Which line becomes canonical? A: codex (responsive work, "ask Bill" section, review-PDF route). B: homepage (Bill-centred hero, Ask Bill page, booklet). C: a manual merge, where you decide the hero, the navigation and the 3 drawings homepage deletes. Should PR #1 be retargeted to main?
- Why: F03 selects the integration baseline. codex and homepage conflict at design level in 5 files (D-028, TB-13).
- PROPOSAL: A as the technical integration baseline, because it is the only target green on the full CI sequence, plus guide (merges clean). presentation/ stays preserved on its own branch, outside the baseline, pending HB-12. homepage stays preserved on its branch. Its Ask Bill content is ported only after its provenance is confirmed (HB-23), and you decide the hero. PR #1 is closed or retargeted after F03. This is a proposal; G0 decides.
- Blocks: F03 (the canonical record) and the integration of every code task.
- Friday: HARD (nothing integrates without a baseline). Local work continues meanwhile.
- Provide: reply to the director → D-028.

**HB-04. Which book is the book** (G0, G3; with Bill)
- Question: Which book is canonical: the 40-page 6×9 review PDF, the 32-page generator, or the on-site booklet? Where is the 40-page source file? Is the 27 MB Drive file "…-en-print 2.pdf" the print master? Is a French edition planned?
- Why: The free PDF and the paid book both need one approved file (D-054). C09 must preserve the real book.
- PROPOSAL: none (a content choice).
- Blocks: C09, U00, U03, D01 (A08 cover), H00.
- Friday: HARD for the guide path. A protected rehearsal may show the review PDF only in staging and labelled "review copy, not for distribution".
- Provide: reply to the director. For the source file, put it in owner-controlled storage and tell the director where.

**HB-05. Domain, DNS and mail** (G2)
- Question: Who controls DNS for billbadran.com? Which provider hosts contact@billbadran.com today (the current MX)? Who can add Brevo's sending records? Which from and reply addresses will be monitored?
- Why: Brevo needs an authenticated sender without breaking current mail (01 §7; MAIL01).
- PROPOSAL: leave the current mail provider and MX untouched. After review, add only Brevo's DKIM record, and review SPF and DMARC alignment.
- Blocks: P05, live parts of N01–N04, L01.
- Friday: HARD for any real email test.
- Provide: reply to the director. The DNS login stays with its owner, who enters the records.

**HB-06. Accounts and processors** (G2; processors also G5)
- Questions:
  - (a) Will Bill or the firm open Brevo Free, Supabase Free and a Stripe account in **test mode**, each through the provider's own signup and in the owner's own name (06: real owner accounts, no fake accounts)? Who is the named owner of each? Agents do not sign up on anyone's behalf.
  - (b) Do Resend or Upstash accounts exist? If they do, do we retire them once Brevo and Supabase work?
  - (c) Do you confirm that the connected n8n Cloud project (not Bill's) is out of scope? Self-hosted n8n on the VPS is already the plan default (D-021). Do you authorize A3 to bring it up in staging: reviewing the existing instance if HB-02(b) finds one, and installing a new one only if none exists?
  - (d) May A3 verify the n8n licence terms against the pinned image?
- Why: G2 governs external setup (D-045, D-051, D-069).
- PROPOSAL:
  - (a) yes: free tiers and Stripe test mode, each opened by its named owner (Bill or the firm), who keeps the login.
  - (b) if they exist, retire Resend and Upstash after the Brevo path passes MAIL01, with the processor change reviewed at G5.
  - (c) yes: Cloud stays out of scope; review the existing self-hosted instance if there is one, otherwise a new install, in staging first.
  - (d) yes.
- Blocks: P05, N10, L01, live parts of P03, U03 and N01–N05.
- Friday: HARD for provider tests.
- Provide: reply to the director with owner names. Account logins stay with each owner in the HB-07 password manager; API keys follow the Secrets table. Neither goes in chat.

**HB-07. Secret store and authorized operator** (G2)
- Question: Which password manager or vault holds project secrets? Who is the "authorized operator" who enters secrets on the server and in n8n? Do you confirm the destinations proposed for the secrets and logins outside the 06 map (Secrets table, D-070)?
- Why: The 06 secrets map assigns most secrets to the authorized operator. The n8n encryption key must be backed up off-host before any credential exists (01 §8).
- PROPOSAL: one named operator, with Bill as the account owner. No tool is proposed. The D-070 destinations as written.
- Blocks: live parts of P03, P04, P05, N10, L01.
- Friday: HARD for any staging integration.
- Provide: reply with the tool's name and the person's name only, never a secret.

**HB-08. Spending caps and subscriptions** (G2)
- Question: What are the caps for purchased model API, ads and subscriptions? If Bill's current Google account lacks what Meet needs, may we buy a Workspace tier, and how many seats?
- Why: Nothing may be bought before G2 records a cap (D-064). Workspace is a candidate, not a purchase (D-022).
- PROPOSAL: keep all three caps at 0 through the pilot. If HB-14 shows Bill's existing account cannot host Meet, the director comes back with one Workspace line item (tier, seats, the price shown at Bill's own checkout) for an explicit yes/no; nothing is bought under a 0 cap. The CAD 20/day × 14 days ad test stays a proposal (D-066).
- (b) For `costs.json` (01 §17 real cost sheet; 06 handover renewals): for each existing paid item (VPS, domain/registrar, mailbox, Calendly, Google, GitHub, and Resend/Upstash if they exist), what is the current plan, amount, currency and renewal date? "Don't know" is fine; nothing here blocks the pilot.
- Blocks: a paid model in N08; R02; any purchase.
- Friday: nothing, if the caps stay 0 and Bill's existing account can host Meet.
- Provide: reply to the director → D-064 and `costs.json` `authorized_caps`. The (b) answers go to the matching `existing_cost_unknown` items of `costs.json`, with the plan and renewal date in the item's note. `amount` and `currency` stay `null` until an invoice or checkout fixes them (`costs.json` rules).

**HB-09. Test recipient allowlist and smoke-test targets** (G2)
- Questions:
  - (a) Which inboxes and people may receive staging emails, test invitations and test bookings? Include at least one consenting tester outside Bill's organization.
  - (b) For the n8n smoke tests (N10): which RSS feed may the RSS-to-email test (SM01) read, and which inbox receives it? For the webhook-to-Telegram test (SM02): does a Telegram bot already exist for this project? If not, who creates and owns it? Which Telegram chat or group is approved to receive the test messages, and who is in it?
- Why: Allowlists are mandatory before live tests (00 launch instruction; 04 §7). EV01 and EV03 need an outside guest (06 run of show). N10 needs "actual import/delivery to allowlisted targets" (TASK_LEDGER N10, G2): SM01 needs an "approved feed and inbox" and SM02 an "approved chat" (04 §5), and 01 §8 says "Allowlist the smoke recipients" (D-071).
- PROPOSAL:
  - (a) a short list of inboxes you control, plus at least one consenting outside tester.
  - (b) SM01: a public, non-personal feed you name, delivered to one inbox from (a); it sends through the Brevo credential (D-023), so it also waits on HB-05 and HB-06. SM02: a bot you create and own yourself in Telegram, posting only to a private chat or group of you and the operator, with messages that carry no personal or financial data. No specific feed, bot or chat is proposed.
- Blocks: (a) L01, L02, L03, MAIL01. (b) N10 (AUTO03, AUTH03), then L01.
- Friday: (a) REHEARSAL for any email or event test. (b) HARD on the task graph: N10 is a dependency of L01, which precedes L04 and L05. A local rehearsal with fictional data needs neither.
- Provide: reply to the director. Addresses, the feed and the chat go into the staging configuration, not git (see "How to answer", point 3); `decisions.md` D-071 records only that the targets exist. The Telegram bot token and the SM02 webhook secret → never in chat; see the Secrets table.

**HB-10. Operations ownership** (G2, G6)
- Question: Who may deploy to staging, and who to production? Who is the named operator on duty during the pilot? Who receives alerts? Where do encrypted off-host backups go, and which owner-controlled storage holds recorded video masters?
- Why: 06 requires a named operator and a monitoring contact. 01 §8 requires off-host backups. The media origin is not selected (D-026).
- PROPOSAL: Arnaud deploys and operates, and Bill is kept informed. No backup provider is proposed: an existing owner-controlled storage is preferred, and buying one needs HB-08.
- Blocks: P04, N09, L04, L06, C10 (master storage).
- Friday: HARD (06 requires an operator watching during the pilot).
- Provide: reply to the director.

**HB-11. GitHub governance** (G2)
- Question: Which GitHub users review content and firm matters (CODEOWNERS, `CONTENT_REVIEWERS`, `FIRM_REVIEWERS`)? Does Bill have, or want, his own GitHub login, or will he record his approvals through the offline route in `docs/CONTENT-WORKFLOW.md`? Should the canonical branch be protected? How will a GitHub token reach CI for `protections:check`?
- Why: The publication controls exist but are not enforced (D-059, TB-03, TB-12).
- PROPOSAL: protect the canonical branch after F03. Content reviewer: Bill, through his own GitHub login or approvals he records himself (G3 belongs to Bill and the firm reviewer, D-043). Firm reviewer: the person named in HB-21. You stay the operator who merges, not the content approver. The token exists only as a GitHub repository secret.
- Blocks: enforcement in N08, R00 and H00; CNT05.
- Friday: LATER (nothing is published during the pilot).
- Provide: usernames → reply to the director. The token → a GitHub repository secret, set by the repository owner, never pasted in chat.

**HB-12. Repository scope** (Arnaud; no gate)
- Question: Should film/ and presentation/ stay out of the production build (kept in history and on their branches as internal material)? Should the empty `billsite` repository be ignored or archived?
- Why: film/ breaks main's build (TB-01) and holds non-commercial audio and quarantined claims (D-052, D-053). presentation/ holds superseded offers (D-049).
- PROPOSAL: exclude both from the production build and deploy artifact, and keep them in git. Leave `billsite` untouched.
- Blocks: F03 (baseline scope).
- Friday: no direct effect.
- Provide: reply to the director.

**HB-13. Advertising, social and Google listing accounts** (G2, G6; with Bill)
- Question: Which Meta ad account and Facebook page, if any, belong to Bill? Who may post to his LinkedIn? Does Bill have a Google Business Profile, and is billbadran.com in Google Search Console? Who owns or can manage each?
- Why: No Bill ad account is visible (D-056). ADS01 must verify rules on the real account. LinkedIn posting needs authorized OAuth (07 S14). R01 includes Google Business Profile verification and Search Console (01 §13).
- PROPOSAL: no ads and no automated posting during the pilot; the operator gets ready-to-post packages instead.
- Blocks: C07 (ADS01), R02, LinkedIn in N08, R01 (profile and Search Console).
- Friday: LATER.
- Provide: account names and owners → reply to the director. Access is granted by the owner inside each provider's own tools. Tokens are entered by the account owner into the approved publishing integration only.

## 2. Bill

**HB-14. Your Google account and Meet** (G0 scheduling owner; G2)
- Question: Which Google account do you work from? Which edition is it (personal, or Workspace and which plan), and who pays for it? Which calendar should take bookings?
- Why: Meet's participant limit, recording and polls depend on the edition (D-022). Booking truth comes from your real calendar (D-040). The connected Google accounts are not yours (D-055).
- PROPOSAL: use your existing account if it can host the pilot; nothing is bought before this is checked (HB-08).
- Blocks: P05, U01, U02, N06, L03 (EV03).
- Friday: REHEARSAL. The event rehearsal needs a real Meet host account.
- Provide: reply to the director. When n8n is connected later, you give Google consent yourself on Google's own screen. Never share your password.

**HB-15. Calendly** (G0)
- Question: Which Calendly plan do you have (free or paid), and who pays? What are your three meeting types and their lengths? Is any of them 60 minutes, or presented as the book consultation? Which video tool does each online ("remote") type use: Google Meet, Zoom, phone or something else? May Calendly stay as the pilot scheduler?
- Why: D-062, D-010. U02 needs a 15-minute introduction and a separate 30-minute book consultation. Zoom is forbidden (D-008), and the repo records a remote choice without its video tool.
- PROPOSAL: keep Calendly for the pilot, with one 15-minute introduction (online or in person) and one separate 30-minute book consultation. For the pilot, the operator checks the consultation against a verified order by hand before confirming it. Retire any 60-minute introduction. If a remote type uses Zoom, you switch it to Google Meet in your own Calendly settings, if your plan allows it; otherwise online meetings are arranged by hand for the pilot.
- Blocks: U02, N06, BOOK01.
- Friday: HARD for the booking path.
- Provide: reply to the director → D-024, D-062.

**HB-16. Weekly capacity and meeting format** (G0 time allocation)
- Question: How many 15-minute introductions and how many 30-minute book meetings can you hold each week, on which days and times? Online, in person at the Laval office (is a room available), or both? Who manages your calendar day to day?
- Why: Sales and registrations are capped by real capacity, not by conversion guesses (01 §17). In person is offered only once the location is confirmed (01 §11).
- PROPOSAL: 6 introductions and 2 book meetings a week, each with a 10-minute buffer: 3 h 50 min reserved (D-033). Online through Meet (subject to HB-15 for the Calendly types); in person only where you confirm the room. Arnaud reconciles bookings daily.
- Blocks: U02, N06, the U03 cap, O01.
- Friday: HARD for the booking path.
- Provide: reply to the director → D-031, D-033.

**HB-17. First Crossroads event, recording and replay** (G0; recording and replay policy G4)
- Question: Date and start time (Eastern) of the first Crossroads? Maximum registrations? Language? Is Friday October 2 an invited pilot with outside guests, or an internal rehearsal? Is Arnaud the moderator? Will the event be recorded? If so, will a replay be released, to whom (registrants only, or anyone), for how long, and how are attendees told before they join?
- Why: Event pages, reminders and the run-of-show need the real date, cap and language (D-030). 06 G4 requires a "recording consent and replay release policy". U01 needs explicit replay states, 05 E09 is the replay email, and the C03 kit and EV03 need the recording disclosure.
- PROPOSAL: the 60-minute event run-of-show in D-030, with Arnaud moderating. No date or cap is proposed. No replay for the pilot unless you approve the recording (G4); if it is recorded, the registration page and the opening say so, and any replay goes to registrants only.
- Blocks: U01 (including replay states), N04 (E09), C03 (timing, recording notice), C08, L03 (EV03), L05.
- Friday: HARD.
- Provide: reply to the director → D-030. The replay policy is recorded as a G4 policy; approval of an actual recording comes later through H00.

**HB-18. Languages and audience** (G0)
- Question: Which languages will you record and publish (English, French or both)? Which area do you serve?
- Why: Campaign, landing page and event languages must match (01 §13). Captions in another language do not count as a recording in that language (05 §3).
- PROPOSAL: drafts in English and natural Quebec French; record and publish only the languages you record. No geography is proposed beyond the existing Laval office address.
- Blocks: the scope of C01–C11; U01; C08; R02.
- Friday: REHEARSAL (event and guide language).
- Provide: reply to the director → D-029.

**HB-19. Recording** (G4)
- Question: When and where can you do (a) the 20-minute recorded voice interview, with consent, and (b) the first recording session: workshop clips W00–W05 and W11, and capsules S01, S03 and S13?
- Why: 0 recordings exist. The workshop needs approved media for the pilot (D-039). C00 needs your real voice as the style reference (05 §1).
- PROPOSAL: the interview as soon as possible, since it needs no script. The recording session after the scripts pass review (C02, H00).
- Blocks: C00, C10, C11, real media in W03, L02, L03.
- Friday: HARD. Without recordings, the workshop is not "usable with approved media"; its media slots stay labelled as not recorded.
- Provide: reply to the director with dates. Recording approvals follow later through H00.

**HB-20. Book commercial terms** (G0; wording G1; process G5)
- Question:
  - price and currency;
  - tax treatment (ask your accountant);
  - shipping method, who pays shipping, delivery area;
  - refund and cancellation terms;
  - how long the included 30-minute consultation stays valid;
  - size of the first batch;
  - who prints, and who packs and ships.
- Why: These are disclosed before payment (D-003, D-032). Checkout cannot be configured without them.
- PROPOSAL: a first batch capped at 8 bundles and one household per bundle, both from the plan. **No price is proposed.**
- Blocks: C09, U03, N05, P05 (Stripe product), PAY03, the L05 book path.
- Friday: HARD for any real book path. A protected rehearsal can run Stripe test mode with a product marked TEST; no public price is shown.
- Provide: reply to the director → D-032.

**HB-21. Professional facts and the reviewer** (G1; privacy officer G5)
- Question: With your firm, please confirm:
  - the business details the site shows (the Laval office address, phone number and email in `lib/business.ts`) and the services you offer (the `businessDetails` and `serviceScope` launch flags, D-061);
  - the designations you hold (the site currently lists Pl.Fin., CIM, B.A.A. and mutual fund dealing representative);
  - whether "financial planner" and "independent" may be used;
  - your years of experience (the site says "more than 15");
  - the firm or dealer and registration category to disclose;
  - how compensation is described.

  Then name the firm reviewer who approves copy, and the person responsible for privacy.
- Why: These claims sit behind `approvals` = false (D-053). C00 builds the claims ledger from verified facts only.
- PROPOSAL: until confirmed, drafts mark these claims as pending G1, and none goes public.
- Blocks: C00; final versions of C01–C09; H00; L05.
- Friday: HARD for any public copy. Invited testers would see copy labelled "review".
- Provide: facts and names → reply to the director. The firm's approval of the wording comes through H00.

**HB-22. Media rights and synthetic audio** (G4)
- Question: Who took `bill-portrait.jpg` and the 5 reference photos, and may we use them? Who made the review book's cover (an AI-assisted sketch portrait of you with "BILL BADRAN FINANCIAL PLANNING" and a script signature) and its "AI-assisted editorial artwork", and under what terms? Do you consent to an AI-drawn likeness of yourself, and is that signature yours? Do you approve removing the cloned narration (`en.mp3`) and the ElevenLabs free-plan audio from anything public? Do you consent to any voice synthesis? (Default: no.)
- Why: `portraitRights=false`. The narration is a third-party voice speaking as you (D-052).
- PROPOSAL: quarantine both audio sets now; use the portrait only after its rights are confirmed; no synthesis.
- Blocks: F03 baseline content, D01, C10, L02.
- Friday: HARD for showing the portrait or any audio to outside testers.
- Provide: reply to the director. Written consent or licence documents go to owner-controlled storage; tell the director where.

**HB-23. Where quotes and questions came from** (G1, G3)
- Question: Are the "In their words" quotes in the presentation real, approved statements? Are the 12 Ask Bill questions real questions you received?
- Why: No quotation or "real question" is published without provenance (D-016, D-053).
- PROPOSAL: treat both as unverified and keep them unpublished until you confirm and the reviewer approves.
- Blocks: C00, R01, the homepage port (HB-03).
- Friday: LATER.
- Provide: reply to the director.

## 3. Reviewer and privacy owner

Once named in HB-21. Each approval is recorded in an H00 packet with the reviewer's name, the date and the exact hash. A chat "OK" is not an approval.

**HB-24. Offer wording** (G1)
- Question: What may the free 15-minute first conversation cover, and what not? What is the exact wording of the 30-minute consultation included with the book: eligibility, one household, rescheduling, cancellation, validity, and what happens when there is no fit?
- Why: The offers are frozen (D-001 to D-004), but their public wording is not approved (D-006, D-007).
- PROPOSAL: C06 and C09 draft the wording from D-002 and D-003; you approve the exact text.
- Blocks: C02, C06, C09, U02, U03, H00.
- Friday: HARD for public offer text.
- Provide: policy answers → reply to the director (recorded as D-006, D-007). Approval of the exact text → the H00 packet.

**HB-25. Claims and sources** (G1, G3)
- Question: Please review the claims register (C1–C8, `inventory.md §6.1`), the book's claims, and every factual or financial claim in scripts, cases and articles as they are delivered. What firm disclosure text should appear, and what legal notices text (the `legalNotices` launch flag, D-061)?
- Why: CNT02 and CNT03; no unverified claim is published (D-053).
- PROPOSAL: none; this is a review.
- Blocks: final versions of C00–C05 and C09; H00; L05.
- Friday: HARD for public content.
- Provide: findings, the disclosure text and the legal notices text → reply to the director. Approval per artifact hash → the H00 packet.

**HB-26. Limits of the workshop calculator** (G3, calculations)
- Question: Do you accept the educational model: the spending path, scheduled income and the remaining gap, with units and basis visible and no verdict? Should the capital illustration stay off for the pilot? Do you approve the disclosure that clips are selected automatically and that Bill has not reviewed the answers?
- Why: 01 §9; WK03, WK06.
- PROPOSAL: capital illustration off for the pilot; no safe-withdrawal rule; no readiness verdict.
- Blocks: W00 contract sign-off, W02, W03, C02, H00.
- Friday: HARD for showing the workshop to outside testers.
- Provide: decisions → reply to the director. Approval of the calculation contract and its hash → the H00 packet.

**HB-27. Privacy decisions** (G5)
- Question: Which processors, and in which regions (the VPS host, Supabase, Brevo, Stripe, Google; Resend and Upstash for as long as they remain, see HB-06(b))? What is the consent wording for each purpose (fulfilment, nurture, optional ad tracking)? What are the retention periods? Who is the incident owner? Also: the Quebec privacy impact assessment, and the classification of each email purpose under the commercial electronic message rules (07 S12).
- Why: G5 must be recorded before real personal data is processed (06; 01 §14).
- PROPOSAL: fulfilment and nurture as separate choices, and no ad tracking during the pilot. No retention period is proposed.
- Blocks: retention fields in P01, U04, N01, N07, L05, L06.
- Friday: HARD for processing real testers' personal data. A rehearsal with fictional data needs no answer.
- Provide: decisions → reply to the director (recorded in decisions.md). The signed privacy assessment → owner-controlled storage; tell the director where.

**HB-28. Fulfilment, refund and cancellation process** (G5)
- Question: Do you approve the book process drafted from HB-20: operator, address source, print proof, dispatch, lost or damaged orders, refund reconciliation and customer contact?
- Why: 01 §11 requires an actual procedure before sales.
- PROPOSAL: none until HB-20 is answered.
- Blocks: U03, N05, C09, PAY03, L05.
- Friday: HARD for any real sale. Test mode is unaffected.
- Provide: approval of the written procedure → the H00 packet.

**HB-29. Testimonials and review requests** (G1, G3)
- Question: What are the rules for testimonials, Google Business Profile review requests and keeping client status private?
- Why: No invented reviews, incentives or selective gating (01 §13).
- PROPOSAL: none published, and no review requests until approved.
- Blocks: R01, C07.
- Friday: LATER.
- Provide: the policy → reply to the director.

---

## Gate mapping

| Gate | Owner (06) | HB items that feed it now | Not askable yet |
|---|---|---|---|
| G0 | Arnaud (+ Bill) | HB-01, HB-02, HB-03, HB-04, HB-14, HB-15, HB-16, HB-17, HB-18, HB-20 | — |
| G1 | Bill + firm reviewer | HB-20 (wording), HB-21, HB-23, HB-24, HB-25, HB-29 | Approval of the final copy, which does not exist yet |
| G2 | Account owner / Arnaud | HB-02 (incl. existing n8n), HB-05, HB-06, HB-07, HB-08, HB-09 (incl. N10 smoke targets), HB-10, HB-11, HB-13, HB-14 | Per-action test scopes (exact allowlisted test sends from the real sender, test bookings/cancellations on the live calendar, Stripe test payments, N10 delivery): requested as scoped G2 records when P05/L01 fix the exact actions |
| G3 | Bill + firm reviewer | HB-04, HB-23, HB-25, HB-26, HB-29 | Exact-hash approvals: the artifacts are not produced yet (via H00) |
| G4 | Bill + rights holders | HB-17 (recording consent and replay release policy), HB-19, HB-22 | Recording approvals: 0 recordings exist |
| G5 | Privacy / operations owner | HB-06 (processors), HB-20 (fulfilment process inputs), HB-21 (who), HB-27, HB-28 | — |
| G6 | Arnaud / Bill | HB-10, HB-13 | Release approval: there is no release manifest until L04 |

## Secrets: never in chat

| Secret or config (06 map) | Arises from | Secure destination | Who enters it |
|---|---|---|---|
| n8n encryption key | HB-02 (b), HB-06, HB-07 | VPS protected env or secret facility, plus a separate off-host backup made before any credential is added. If an instance already exists, its current key is kept and backed up, never regenerated | Authorized operator |
| n8n owner credentials and recovery | HB-07 | n8n user management and the password manager | Bill or the authorized operator |
| Supabase server credentials | HB-06 | Application server-only environment | Authorized operator |
| Brevo API or SMTP key | HB-06 | n8n credential vault or the approved server adapter | Authorized operator |
| Stripe secret and webhook secret (test mode first) | HB-06 | Server environment for payment verification | Stripe account owner or operator |
| Google OAuth client and refresh credentials | HB-14 | n8n credential vault, approved scopes only | Google account owner or operator |
| Automation service token | (P02, N00) | Server and n8n credential store, rotated and scoped | Authorized operator |
| Preview credentials | HB-10 | Protected staging only | Authorized operator |
| Model API credential | HB-08, only if a cap above 0 is recorded | Weekly drafting runner only, with its budget cap | Authorized operator |
| Ad and LinkedIn tokens | HB-13 | Only the approved publishing integrations | Authorized account owner |

**Outside the 06 map.** The controlling `source/06` file is not edited. These rows go into the secret-location map that the 06 handover standard requires (names and locations only), proposed in D-070 for Arnaud to confirm (HB-07). The same rules apply: never in chat, task JSON, git, screenshots, prompts or general backups.

| Secret or login | Arises from | Secure destination | Who enters it |
|---|---|---|---|
| VPS SSH access | HB-02 | The owner adds the operator's **public** key on the server; private keys stay in the HB-07 password manager | VPS owner |
| GitHub token for CI | HB-11 | A GitHub repository secret | Repository owner |
| DNS or registrar login | HB-05 | Stays with its owner, who enters the records | DNS owner |
| Provider account logins (Brevo, Supabase, Stripe, Calendly, Google) | HB-06, HB-14, HB-15 | The HB-07 password manager, held by each named owner | Account owner |
| Telegram bot token (SM02) | HB-09 (b) | n8n credential vault on the self-hosted instance only; never in the exported workflow JSON (04 §5 SM02) | Bot owner or authorized operator |
| SM02 webhook authentication secret | HB-09 (b), N10 | n8n credential on the webhook node, plus the secret store of the test caller; generated on the server | Authorized operator |
| Off-host backup destination write credential | HB-10, P04 | VPS protected env/secret file readable only by the backup job; a copy in the HB-07 password manager | Authorized operator |
| Backup encryption key or passphrase | HB-10, P04 | HB-07 password manager plus one offline copy held by the owner; never on the backup destination or inside a backup set | Authorized operator (owner keeps the offline copy) |
| Media-master storage upload credential | HB-10, C10 | HB-07 password manager; used only by whoever uploads approved masters | Media owner or authorized operator |

## What can proceed without any answer

Everything below uses fictional fixtures, local tools and the frozen decisions. None of it deploys, sends, buys or publishes.
- **F02**: the offer, event, input and privacy contracts, from D-001 to D-017 and D-040 to D-044.
- **F03**: the technical baseline reconciliation and check suite. Only the canonical-branch record waits for HB-03.
- **D00–D02**: the design slice, ink assets and design rules. Using the portrait waits for HB-22.
- **W00–W02 and W04**, locally. **W03** with labelled test media only.
- **P00**: drafts the VPS default profile and the environments document. The final selection waits for HB-01.
- **P01, P02**: migrations, RLS, ingress and outbox, locally.
- **P03**: Compose files written and validated locally (TB-07, TB-15). Nothing is applied to the VPS. Until HB-02(b) says whether an instance exists, P03 keeps both a review path and a new-install path.
- **P04**: backup and restore scripts, drilled locally.
- **C00**: the claims ledger, with pending statuses. The voice reference waits for HB-19.
- **Drafts** of C01, C03, C04, C06 and C09, marked pending G1. **C02** after W00.
- **U00–U05 and N00–N09**, against fixtures and dry-run providers.
- **N10, local part only**: the disabled smoke JSONs, with a fixture feed and a stubbed Telegram endpoint. The import and real delivery wait for HB-09(b), HB-07 and P03.
- **H00**: the packet structure.
- **Proposed patches**, not merged: excluding film/ and presentation/, quarantining `en.mp3`, and the proxy `/assets` fix.

---

## Technical blockers

| ID | Blocker (evidence) | Owner | Next action | Blocks |
|---|---|---|---|---|
| TB-01 | main, guide and video fail lint (2 errors), typecheck (26 errors) and build, so e2e cannot start. All errors are in film/. Lint fails because main's `eslint.config.mjs` ignore list does not exclude film/; typecheck and build fail because the root `tsconfig.json` excludes only `node_modules`. codex and homepage exclude film/ in both files (`inventory.md §2.1, §8`; D-048) | A3 (F03) | Resolve in F03 by baseline choice, or by a shared-config patch proposed to A0 that covers both the ESLint ignore list and the tsconfig exclude. Never weaken a guard. Scope question in HB-12 | F03 |
| TB-02 | The lockfile's Playwright 1.63.0 needs Chromium rev 1243; only rev 1194 (Chromium 141) is installed and the browser CDNs return 403. Under the default browser, codex e2e fails 38 of 41 (§7, §8; D-058) | A3; Arnaud for environment network settings | Label local e2e as "Chromium 141 substitute". Get a CI-equivalent run in GitHub Actions (`verify.yml`) or in an environment with CDN access before release | F03, L00, L02 |
| TB-03 | `protections:check` cannot run: `gh` is not installed and no token is provided (`spawnSync gh ENOENT`) (§8) | Arnaud (token route, HB-11); A3 | Run it in GitHub Actions with a repository secret, or install `gh` with a token from the secure store | CNT05, N08, R00 |
| TB-04 | `launch:check` exits 1 by design: 8 approval flags are false (§8; D-061) | Bill + reviewer (G1, G5) | None for agents. Do not flip the flags; they change only with real approvals | L04, L06 |
| TB-05 | `verify-publication` exits 0 vacuously: 0 published articles (§8) | A4, A6 | Exercise it with fixture articles in CNT05 (N08, R00) | CNT05 |
| TB-06 | The build container's egress returns CONNECT 403 for Brevo, Supabase, Stripe, Calendly, docs.n8n.io, docker.n8n.io and the Playwright CDNs (§7; D-057) | Arnaud (environment network policy); A3 | Run provider tests from authorized staging or by an operator. Optionally ask for an allowlist change in the environment's network settings. Never simulate provider evidence | P03, P05, N10, L01 |
| TB-07 | `dockerd` is not a managed service: the F00 repo lane started it by hand (PID 3134, still running on 2026-09-30) and it may disappear on a container restart. Docker Hub anonymous pulls hit 429 twice before succeeding. `docker.n8n.io` returns 403 (`E/repo/env_docker_run.txt`, `E/repair2/F00-SPOT-06_dockerd.log`; D-046) | A3 | Check the daemon before P03 and restart it if absent, recording the command. Pull the pinned official n8n image from a reachable official registry and record its digest; if no pull succeeds, validate with `docker compose config` and mark the start test blocked. A local run is not VPS evidence | P03, P04 |
| TB-08 | There is no VPS access or tool, so INF01–INF07 cannot run live, and whether an n8n instance already runs there is unknown (§7, D9; D-045b) | Arnaud (HB-01, HB-02) | Supply the host facts and access; A3 inspects read-only before any change, starting with any existing n8n (containers, volumes, port 5678, where its key is kept) | P00, P03, P04, N09, L01, L06 |
| TB-09 | The review proxy's matcher excludes `/assets/*`: the unapproved portrait and the AI cover bearing Bill's name are fetchable on a hosted preview (§3, D17; D-060) | A3 (P00) | Fix the matcher or remove the unapproved assets before any hosted preview; A6 tests without credentials (AUTH04) | P00, L01 |
| TB-10 | Runtime is coupled to Vercel: `localReview` is gated on `!VERCEL`, the IP comes from `x-vercel-forwarded-for`, and `README.md:33` warns that `LOCAL_REVIEW=true` must never be exposed on a public self-hosted server (§6.4; D-051) | A3 (P00, P02) | Adapt for the VPS path using the existing `TRUST_PROXY_IP` behind the real proxy; test the review protection on the VPS profile | P00, P02, L06 |
| TB-11 | Missing or unusable assets: 0 Bill recordings; no approved book PDF or cover; the 40-page source is in no branch; no French edition; `en.mp3` is a voice clone speaking as Bill on every branch; the film audio is ElevenLabs free plan (non-commercial); the film Canva AI art has unchecked terms (§4; D-052, D-054) | Bill (HB-19, HB-22); Arnaud (HB-04); A5 and A1 for manifests | Quarantine the synthetic audio from any build; locate the book source; keep media slots labelled "not recorded" | C09, C10, D01, U00, W03, L02 |
| TB-12 | Publication controls are not enforced: no CODEOWNERS, no branch protection, `content/approvals.json` = `{}` (§1.1, §3; D-059) | Arnaud (HB-11); A3 | Add CODEOWNERS and protection after F03 and HB-11 | N08, R00, H00 |
| TB-13 | codex ← homepage conflicts in 5 files (`components/pages.tsx`, `lib/copy.ts`, `lib/ink-files.json`, `scripts/build-ink.tsx`, `tests/browser/site.spec.ts`), plus 3 deleted ink SVGs; the navigation type changes (§2.1) | A0 and A3 (F03); Arnaud (HB-03) | Resolve by hand after the design decision; never take a side wholesale | F03 |
| TB-14 | The main diagnostic e2e (with film dependencies) fails 4 of 30 on `locator('.hero img')` in strict mode; the stale-selector cause is a hypothesis. main's `TEST-SUMMARY.md` predates film/ (§8, D4) | A3 (F03) | Re-check on the chosen baseline; do not cite `TEST-SUMMARY.md` as current evidence | F03 |
| TB-15 | The n8n version, environment variables and licence cannot be verified from here: docs.n8n.io and docker.n8n.io return 403, the connected n8n (Cloud) hides its version, and the version of any existing self-hosted instance is unknown until HB-02(b) (§7; D-045, D-069) | A3 (P03) | Verify against the pinned image itself (release notes, licence file, the `N8N_WEBHOOK_URL`/`WEBHOOK_URL` behaviour) once pulled. Record "unverified" until then | P03, N00, N10 |
| TB-16 | The five-state feature-flag model (04 §7) is missing: the repo has only `newsletterEnabled` and `analyticsEnabled` plus the approval flags (§3; D-035) | A0 (F02 contract); A3 and A4 | Define the flag contract in F02 and implement it in P00/P02; defaults stay off | F02, P00, P02, L04 |
