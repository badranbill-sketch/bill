# F01 review, attempt 2: A6 independent verifier (fresh context)

- Task: F01 "Consolidate decisions, human blockers and real cost assumptions" (attempt 2 of max 3). Check ref: artifact/design review. Acceptance stage: design_or_audit.
- Acceptance text (TASK_LEDGER): "Use final 15-minute/30-minute offers. Batch unresolved non-secret inputs once; no purchases or stack drift."
- Reviewed files (all untracked in the repo at review time):

  | File | sha256 | Size | Contents |
  |---|---|---|---|
  | `.orchestration/decisions.md` | `889df326…c31679f` | 38,951 B | D-001 to D-071, no gaps |
  | `.orchestration/blockers.md` | `486adbde…cf500a303` | 41,033 B | HB-01 to HB-29, TB-01 to TB-16 |
  | `.orchestration/costs.json` | `f21a278e…c81a88e4` | 20,241 B | 27 items |

- Repo state: HEAD `5cbbf9b5d21dbf03d2cb44e524a6fcdc10d5515b` on `claude/orchestration-foundation`. `git status --porcelain` lists only the three files above plus `reviews/F01.md` as untracked.
- Review finished 2026-09-30T04:20Z.
- Observations, not findings:
  - There is no `handoffs/F01.json`, so the hashes above are the reviewed versions.
  - `tasks.json` still shows F01 `attempts: 1`. That is A0's state file, not an F01 deliverable.
- Nothing in the repo was modified, staged, committed or pushed. This file is my only write. I made no network probes and no connector calls.

## Verdict: pass

There are no P0, P1 or P2 findings. There are five P3 polish findings, listed below. None of them changes an offer, a default, a gate or a cost amount.

## Attempt-1 findings: all fixed

| Attempt-1 finding | Fix in attempt 2 | Verified by |
|---|---|---|
| P2-1: D-045 said "none exists" for self-hosted n8n | D-045 is split. (a) The connector is n8n Cloud and is out of scope: `resolved-by-evidence`. (b) Whether a self-hosted instance exists on the VPS: **open**. HB-02(b) asks about any existing n8n, its data, port 5678 and whether a key exists, without asking for the key value. HB-06(c) is now review-or-install. TB-08 and the costs `n8n_self_hosted` note match. | inventory D9 ("No self-hosted instance is **visible**"); gap-matrix row "n8n live instance on VPS" is `blocked_human` |
| P2-2: N10 smoke inputs and the Telegram secret were missing | HB-09(b) asks for the SM01 feed and inbox, and for the SM02 bot owner and chat. D-071 is added. Both secrets tables have rows for the Telegram bot token and the SM02 webhook secret. | `grep -c -i telegram`: 6 in blockers, 2 in decisions |
| P3-1: no replay policy | HB-17 now asks about recording, replay audience and duration, and attendee notice. G4 lists HB-17. | blockers:176–182, 309 |
| P3-2: business details, service scope, legal notices, GBP and Search Console | HB-21 (business details, service scope), HB-25 (legal notices), HB-13 (GBP, Search Console). D-061 maps each launch flag to an HB item. | `lib/business.ts:28-37` on origin/main |
| P3-3: Arnaud proposed as content reviewer | HB-11 now proposes Bill (his own GitHub login or approvals he records himself). Arnaud is the merging operator. | blockers:129; `docs/CONTENT-WORKFLOW.md:14,18` |
| P3-4: Resend and Upstash retirement both open and decided | HB-27 now says "for as long as they remain, see HB-06(b)". The costs item has `account_existence: "unknown"` and the status legend is widened to cover it. | blockers:276; costs.json:17, 324 |
| P3-5: lint cause attributed to tsconfig | D-048 and TB-01 now attribute lint to the ESLint ignore list, and typecheck and build to tsconfig. | `git show origin/main:eslint.config.mjs` (no `film/**`); `origin/main:tsconfig.json` exclude is `["node_modules"]` |
| P3-6: `measured_usage` was empty | It now holds an F00 entry matching the run record: 9 agents, 657 tool uses, 2,086,746 tokens, 6,271 s, null cost. | `runs/wf_5bb05036-e58.json` |
| P3-7: D-067 over-hardened, and the index was incomplete | D-067 now separates scope from proposal and says later dates are not askable yet. The index contains D-024. All 26 open or pending rows appear in the index. | index script (recheck 11) |
| P3-8: secrets wording | "The controlling `source/06` file is not edited." Provider logins have a row. HB-06(a) asks each named owner to sign up through the provider's own signup. | blockers:76, 328, 335 |
| P3-9: Calendly video tool | HB-15 asks which video tool each remote type uses. | blockers:161–163 |

## What passes

**Offers.** D-001 to D-004 match the 01 §1 frozen matrix:
- the free PDF, with consent kept separate from access;
- a free 15-minute introduction, one question, online or in person;
- a paid printed book including ONE 30-minute consultation, "Never 60 minutes";
- continued work only on mutual fit, and the buyer keeps the consultation.

Every other duration in the three files is one of these:
- the D-010 prohibition;
- the 60-minute Crossroads run-of-show (01 §10, 05 line 92);
- HB-15's question about an existing 60-minute Calendly type, and its proposal to retire it;
- the superseded 45-minute item in D-049;
- the 20-minute voice interview in HB-19 (05 line 15);
- the 10-minute buffers in the capacity arithmetic.

**Defaults.** D-018 to D-027 cover all 10 rows of the 01 §2 "Defaults for the executing director" table. None is silently changed (table below).

**No stack drift.** Zoom, n8n Cloud, Vercel Hobby, WebRTC and Jitsi, and Redis or Postgres for n8n appear only as prohibitions or out-of-scope facts. Vercel Pro appears only as Arnaud's explicit alternative. Resend and Upstash are "not extended", with retirement left open. Nothing is purchased.

**G0.** All 7 fields of the 06 G0 row (D-019, D-028 to D-033) are `default-pending-G0`, each with an HB owner. No price, date or cap is invented. Every proposal is labelled a proposal, and HB-03 says "G0 decides".

**One batch.**
- Items are grouped Arnaud (HB-01 to HB-13), then Bill (HB-14 to HB-23), then the reviewer and privacy owner (HB-24 to HB-29).
- Each item has Question, Why, PROPOSAL, Blocks, Friday and Provide (script check).
- No duplicate questions. Near-overlaps split cleanly by owner, as the 06 sheet does:
  - HB-17 asks the event language; HB-18 asks which languages Bill records.
  - HB-20 asks for the business terms; HB-24 asks for the approved wording.

**Secrets.**
- No secret is requested in chat. HB-02(b) asks only whether the n8n key exists and where it is kept.
- All 10 rows of the 06 secrets map appear with 06's destinations and enterers.
- Six additional rows point to proposed destinations (D-070).

**costs.json.**
- It parses (`python3 -m json.tool`, exit 0).
- `authorized_caps` is 0/0/0.
- The only non-null amounts are five zeros (brevo_free, supabase_free, n8n_self_hosted, model_api_weekly_draft, ads_meta). Each cites a plan rule: 01 §2, §4, §12, §13, 07 S2 and 07 S11.
- No currency is set on any item.
- Every other number is either a labelled proposal from the plan (8 bundles; 6 + 2 slots giving 230 min; CAD 20 × 14 days = 280; 300 sends/day) or F00 run metering.
- All 13 cost categories from 01 §17 are present.

**Traceability.** Every F00-derived statement I checked traces to `inventory.md` or to evidence. The list of what I checked is in the rechecks table.

## Findings (P3 only)

### P3-1: The secrets outside the 06 map leave out the off-host backup storage credential and the backup encryption key
- **Location:**
  - `blockers.md:328-337` ("Outside the 06 map" table);
  - `decisions.md:141` (D-070);
  - HB-10 (`blockers.md:119`), which asks where encrypted off-host backups go and which storage holds video masters.
- **Reproduction:** `grep -n -i -E 'backup|encrypt|storage' .orchestration/blockers.md`. The only secret rows that mention a backup are for the n8n key. Neither secrets table has a row for:
  - the credential the nightly job uses to write to the backup destination;
  - the key or passphrase that encrypts the off-host copy;
  - the upload credential for the owner-controlled media-master storage.

  The requirements are 01 §8 ("encrypted credential export … encrypted off-host copy"), 06 backup runbook ("encrypted off-host copy") and TASK_LEDGER P04 ("encrypted off-host copy").
- **Expected:** D-070 is presented as the list of secrets outside the 06 map, so it should name these items and their destinations. The backup encryption key must also be kept somewhere other than the VPS and the backup set, for the same reason 01 §8 gives for the n8n key.
- **Actual:** the items are absent. HB-07's password-manager question gives a default home, so no second human ask is needed. That is why this is P3 and not P2, unlike the attempt-1 Telegram gap. Still, when P04 goes live, a restore-critical secret has no named place. If it were kept only on the VPS, losing the VPS would make the off-host backup undecryptable.

### P3-2: The batch does not ask about rights, consent to the AI likeness of Bill, or the signature on the codex book cover and the 40-page book's artwork
- **Location:**
  - HB-22 (`blockers.md:231-237`) asks only about `bill-portrait.jpg`, the 5 reference photos and the synthetic audio;
  - HB-04 (`blockers.md:58-64`) asks which book is canonical, but not about its art;
  - D-052 (`decisions.md:118`) covers only the film/ Canva art.
- **Reproduction:**
  - `sed -n 99,100p .orchestration/inventory.md`. `public/assets/retirement-guide-cover.jpg` (codex) is an "AI-assisted sketch portrait with the text 'BILL BADRAN FINANCIAL PLANNING' and a script signature; no approval". The 40-page review PDF, p.39, says "Illustrations use AI-assisted editorial artwork".
  - `grep -n -i -E 'ai-assisted|signature|likeness|illustration' .orchestration/blockers.md` finds only the capital-illustration lines.
  - The requirements are 06 G4 ("portraits/art rights"), D-016 ("No voice clone or avatar of Bill without his specific consent") and the gap-matrix row A08 (approved book cover: `blocked_human`).
- **Expected:** these assets exist, so the question can be asked now. HB-22 (or HB-04) asks:
  - who made the cover and the book illustrations, and under what terms;
  - whether Bill consents to an AI-drawn likeness of himself;
  - whether the signature on the cover is really his.
- **Actual:** not asked. The review PDF is option A's asset in HB-03's proposal and a candidate in HB-04. If it is chosen, C09 and D01 (A08) would need a second ask. Nothing ships meanwhile (D-060, TB-09, G3), so this is P3.

### P3-3: Prices and renewal dates of existing subscriptions are never asked, and costs.json points to an HB item that does not ask them
- **Location:**
  - `costs.json:45` (`vps_increment.note`: "The current VPS price, its plan and whether an upgrade is needed are unknown (HB-02)");
  - `costs.json:290, 301, 335` (Calendly plan and payer; registrar, renewal date and cost; GitHub plan tier);
  - HB-02, HB-05, HB-14 and HB-15.
- **Reproduction:**
  - `grep -n -i -E 'price|renewal|invoice|cost' .orchestration/blockers.md` finds only the book price (HB-20) and the caps (HB-08).
  - HB-02(a) asks for provider, hostname, CPU, RAM, disk and OS, but no price or plan.
  - HB-05 asks who controls DNS, not the registrar, renewal date or cost.
  - HB-14 and HB-15 ask "who pays", not the amount.
  - Nothing asks the GitHub plan.
  - The requirements are 01 §17 ("Maintain a real cost sheet: VPS increment … Existing subscriptions count as existing cost"), 07 "Unresolved facts" ("existing subscription prices") and the 06 handover standard ("renewal dates, cost ledger").
- **Expected:** one sub-question for the owners asking the current plan, amount (from the invoice), currency and renewal date of each existing item (VPS, domain, mailbox, Calendly, Google account, GitHub, and Resend and Upstash if they exist). Alternatively, costs.json should stop citing HB-02 for a fact HB-02 does not collect.
- **Actual:** 11 `existing_cost_unknown` items can only be filled by a second ask. This affects the O01 and H01 cost reviews, not the pilot, hence P3.

### P3-4: HB-08's proposal is internally contradictory about a Workspace purchase
- **Location:** `blockers.md:101`.
- **Reproduction:** the proposal reads "keep all three caps at 0 through the pilot. No Workspace purchase unless HB-14 shows the existing entitlement is insufficient." With a subscriptions cap of 0 (D-064; costs `authorized_caps.subscriptions`), no purchase is possible. The same item's question asks "may we buy a Workspace tier, and how many seats?".
- **Expected:** a reply of "Proposal OK" (the "How to answer" route, `blockers.md:10`) leads to one outcome. For example: "subscriptions cap 0; if HB-14 shows the existing account cannot host the event, A0 returns with a single Workspace line for approval". Or the proposal names an explicit conditional cap.
- **Actual:** "Proposal OK" would both keep the cap at 0 and suggest a purchase path. D-022 and the costs item `workspace_business_standard_candidate` are correct; only the proposal text is ambiguous.

### P3-5: Gate-mapping precision
- **Location:** `blockers.md:307` (G2 row), `blockers.md:310` (G5 row), `blockers.md:200` (HB-20 title).
- **Reproduction:**
  - 06 G2 must record "Named accounts, least-privilege access, precise staging/live-test permissions, spending caps, subscriptions if any, authorized recipient allowlist". `grep -n -i -E 'least-privilege|live-test' .orchestration/blockers.md` finds nothing. The G2 "Not askable yet" cell is "—".
  - A script comparing HB title gates with the mapping finds one mismatch: HB-20's title names "process G5", but the G5 row lists HB-06, HB-21, HB-27 and HB-28.
- **Expected:** the per-action staging and live-test permissions are either asked for now (for example: send allowlisted test emails from the real sender, make test bookings and cancellations on Bill's live calendar, Stripe test payments, N10 delivery), or listed under G2 "Not askable yet" until P05 or L01 fixes the exact actions (06: "G2 is action-scoped"). HB-20's title and the G5 row agree.
- **Actual:** the G2 row implies the batch fully covers G2. HB-06(a), HB-06(c), HB-09 and HB-10 cover accounts, the staging n8n, recipients and deploy rights, but not the scope of each test action.

## Cross-check: 01 §2 "Unknowns to resolve in one human-input batch"

| Unknown | HB item |
|---|---|
| VPS host/access/specification | HB-02(a) |
| Reverse-proxy layout | HB-02(a) |
| DNS ownership | HB-05 |
| Production branch | HB-03 |
| Existing Workspace edition | HB-14 |
| Meeting calendar | HB-14 |
| Bill's real availability | HB-16 |
| Approved credentials/affiliation | HB-21 |
| Reviewer identity | HB-21 |
| Book price and print/dispatch arrangements | HB-20 (plus HB-28 for the process) |
| Event date/cap | HB-17 |
| Recording time | HB-19 |
| Media rights | HB-22, HB-17 (recording and replay); art rights, see P3-2 |
| Sending-domain ownership | HB-05 |
| Privacy retention choices | HB-27 |
| Advertising permission/budget | HB-08, HB-13 |

All 16 are covered. Missing from the batch, although these are outside this list: the art rights (P3-2), the existing subscription prices (P3-3, from 07 and 01 §17), and the G2 test-action scope (P3-5).

## Cross-check: 06 "One input sheet"

| Owner | Item | HB item |
|---|---|---|
| Arnaud | VPS hostname/provider/resources | HB-02(a) |
| Arnaud | Current proxy and deployment method | HB-02(a) |
| Arnaud | Selected production host | HB-01 |
| Arnaud | DNS owner | HB-05 |
| Arnaud | Repository branch decision | HB-03 |
| Arnaud | Secure secret store | HB-07 |
| Arnaud | Recipient allowlist | HB-09(a), plus (b) for the N10 smoke targets |
| Arnaud | Deployment authority | HB-10 |
| Arnaud | Model/API and ad caps | HB-08 |
| Arnaud | Backup destination | HB-10 (its credentials: P3-1) |
| Arnaud | Monitoring contact | HB-10 |
| Bill | Google/Calendar account and existing subscription | HB-14 |
| Bill | 15-minute slots per week | HB-16 |
| Bill | 30-minute book slots per week | HB-16 |
| Bill | Online/in-person arrangements | HB-16 (and HB-15 for the video tool) |
| Bill | First Crossroads date and capacity | HB-17 |
| Bill | Intended languages | HB-18 |
| Bill | Recording session | HB-19 |
| Bill | Book price, shipping/refund terms and unit cap | HB-20 |
| Bill | Approved professional details and reviewer | HB-21 |
| Reviewer | Scope of first conversation | HB-24 |
| Reviewer | Wording of included consultation | HB-24 |
| Reviewer | Source/claim review | HB-25 |
| Reviewer | Limits of the workshop calculator | HB-26 |
| Reviewer | Privacy/consent/retention/processor decisions | HB-27 |
| Reviewer | Claims in the book and audio | HB-25 |
| Reviewer | Testimonials/reviews rules | HB-29 |

All 27 are covered.

06 gate rows, against the batch:
- **G0:** 7 of 7.
- **G1:** identity and designations, service scope, offer wording and claims: HB-21, HB-24, HB-25.
- **G2:** accounts HB-06; caps and subscriptions HB-08; allowlist HB-09. Least privilege and per-action test scope: P3-5.
- **G3:** exact hashes, correctly marked not askable yet.
- **G4:** recordings HB-19, replay HB-17, portrait HB-22. Art rights: P3-2.
- **G5:** HB-27 and HB-28.
- **G6:** operator HB-10, ads scope HB-13, release not askable yet.

F00 Q1–Q15 all remain mapped:

| F00 question | HB item |
|---|---|
| Q1 | HB-03 |
| Q2 | HB-04 |
| Q3 | HB-02, HB-05 |
| Q4 | HB-06(b) |
| Q5 | HB-14 |
| Q6 | HB-15 |
| Q7 | HB-06(c) |
| Q8 | HB-13 |
| Q9 | HB-19, HB-22 |
| Q10 | HB-12 |
| Q11 | HB-21 |
| Q12 | HB-11 |
| Q13 | HB-23 |
| Q14 | HB-12 |
| Q15 | HB-08, HB-09, HB-16, HB-17, HB-18, HB-19, HB-20 |

## Cross-check: 01 §2 defaults table

| 01 §2 area | Plan default | F01 row | Silent change? |
|---|---|---|---|
| Site and custom workshop | Extend existing Next.js app | D-018 | no |
| Application hosting | Reuse VPS; Vercel Pro only if Arnaud selects it | D-019 (default-pending-G0) | no |
| Database | Supabase Free, minimal records | D-020 | no |
| Automations | Self-hosted n8n, one operator, SQLite; no Cloud | D-021 (standard frozen; existing instance open) | no |
| Live event | Meet via approved paid Workspace tier; Business Standard only the candidate; existing account may suffice | D-022 | no |
| Email | Brevo Free; n8n schedules, Brevo delivers | D-023 | no |
| Scheduling | Calendly stays; test Google appointment schedules; keep the proven system | D-024 | no |
| Book payments | Hosted Stripe Checkout; never card handling | D-025 | no |
| Video delivery | One media origin; decide after bitrate × viewers | D-026 (open) | no |
| Content generation | Existing assistant plus one weekly draft job; paid API only after a budget | D-027 | no |

## Rechecks

repo = `/home/user/bill`; O = `repo/.orchestration`.

| # | What | Command (abridged) | Result | Matches claim |
|---|---|---|---|---|
| 1 | costs.json parses | `python3 -m json.tool O/costs.json` | exit 0 | yes |
| 2 | Caps, amounts and all numbers | python walk of every numeric value | caps 0/0/0; 5 non-null amounts, all 0, each with a plan-rule source; no currency on any item; other numbers are labelled proposals or F00 metering | yes |
| 3 | Offer durations | `grep -i -E '60\|one-hour\|hour\|minute'` over the 3 files, excluding 15 and 30 | only the D-010 prohibition, the 60-minute event, HB-15, D-049 (45 min), HB-19 (20 min), buffers | yes |
| 4 | Defaults table | 01 §2 lines 89–100 against D-018 to D-027 | 10 of 10, change routes preserved | yes |
| 5 | G0 fields | 06 G0 row against decisions §D | 7 of 7 default-pending-G0 with HB owners | yes |
| 6 | Stack drift | grep for zoom, hobby, n8n cloud, jitsi, webrtc, redis, postgres, kubernetes, resend, upstash, vercel, other vendors | prohibitions, out-of-scope facts or "not extended" only | yes |
| 7 | ID integrity | python: definitions against references in all 3 files | D-001 to D-071, HB-01 to HB-29 and TB-01 to TB-16 all contiguous; 0 undefined references; all check IDs exist in `acceptance_catalog.json` | yes |
| 8 | HB item structure | python split on `**HB-nn.**` | all 29 have Question, Why, PROPOSAL, Blocks, Friday and Provide | yes |
| 9 | HB title gates against gate mapping | python comparison | 1 mismatch (HB-20, G5) | **no (P3-5)** |
| 10 | Secrets and PII scan | regex for ghp_, github_pat_, sk_/pk_, xkeysib, AKIA, JWT, PEM, Bearer, act_, n8n subdomain, phone, email | 0 secrets; emails only contact@billbadran.com and the two connector identities from inventory §7 | yes |
| 11 | Open or pending rows indexed | python over decisions rows with `open`/`default-pending` | 26 of 26 in the index | yes |
| 12 | Evidence paths cited | `test -e` on every `E/…` and `runs/` path | 7 of 7 exist | yes |
| 13 | tasks.json facts (blockers "Pilot status", HB-09) | python over `O/tasks.json` | 62 tasks: 60 planned, F00 accepted, F01 running; longest chain has 18 tasks, L05 at position 14; `spend_authorization` 0/0/0; L01 depends on N10 (TASK_LEDGER) | yes |
| 14 | Lint and typecheck cause (D-048, TB-01) | `git show origin/main:eslint.config.mjs`, `:tsconfig.json`; codex and homepage equivalents | main ignores lack `film/**` and exclude is `["node_modules"]`; codex and homepage have both | yes |
| 15 | business.ts facts (D-029, D-035, D-061, D-062, HB-05, HB-21) | `git show origin/main:lib/business.ts` | Laval address, contact@billbadran.com, bookingUrl calendly.com/bbadran, bookingVerified true, 4 credentials, 8 approvals false (lines 28–37), newsletter and analytics false | yes |
| 16 | Vercel coupling (D-051, TB-10) | `git show origin/main:README.md` line 33; `lib/contact.ts`; `app/api/inquiry/route.ts` | "Never expose `LOCAL_REVIEW=true`…"; `TRUST_PROXY_IP` at contact.ts:25; `x-vercel-forwarded-for` at route.ts:46 | yes |
| 17 | Calendly facts and remote choice (D-062, HB-15) | `git show origin/main:docs/INTEGRATIONS.md` | "three meeting choices, including remote and Laval options", no video tool named | yes |
| 18 | Review roles (HB-11) | `git show origin/main:docs/CONTENT-WORKFLOW.md` | "Bill reviews the readable page"; offline approval "recorded by the actual authorized reviewer" | yes |
| 19 | Gap-matrix rows (D-032, D-045b, costs) | python filter over `E/assets/gap-matrix.json` | book terms, n8n on VPS, Stripe account and 20-minute interview are all `blocked_human` | yes |
| 20 | dockerd (D-046, TB-07) | `ps -p 3134 -o pid,comm,etime` | dockerd, elapsed 02:18:40 | yes |
| 21 | F00 run usage (costs `measured_usage`) | `cat O/runs/wf_5bb05036-e58.json` | 9 agents, 657 tool uses, 2,086,746 tokens, 6,271 s, null cost | yes |
| 22 | Capacity arithmetic | 6 × 25 + 2 × 40 | 230 min = 3 h 50 min | yes |
| 23 | Recording batch 1 and interview (HB-19) | `grep -n` in `source/05` | line 15 (20-minute interview), line 183 (W00–W05/W11, S01/S03/S13) | yes |
| 24 | Backup and media secrets | `grep -i 'backup\|encrypt\|storage' O/blockers.md` | no secret row for the backup destination, the backup encryption key or media storage | **no (P3-1)** |
| 25 | AI cover and book art rights | `sed -n 99,100p O/inventory.md`; grep blockers for ai-assisted, signature, likeness | assets exist; no question asks about them | **no (P3-2)** |
| 26 | Existing subscription prices | `grep -i 'price\|renewal\|invoice\|cost' O/blockers.md` | only the book price and the caps | **no (P3-3)** |
| 27 | G2 test-action scope | `grep -i 'least-privilege\|live-test' O/blockers.md` | no hits; the G2 "Not askable yet" cell is "—" | **no (P3-5)** |
| 28 | Repo state and base | `git rev-parse HEAD; git status --porcelain` | `5cbbf9b…`; the three F01 files and `reviews/F01.md` untracked | yes |

## Not run by A6
- No provider, connector or network probes. F01 claims no new external observation except the dockerd PID, which I re-checked locally (#20).
- BASE01 was not re-run. F00 was accepted at attempt 3, and F01 only cites its results; I spot-checked the cited facts against git (#14 to #18).
- No vendor prices were checked, because F01 records none.
