---
title: Bill's retirement system, where it stands
short_title: Operator briefing
subtitle: What exists, what comes next, what it asks in money and time, and the decisions that are yours to make.
kicker: Internal briefing · for the operator
audience: Arnaud Verdier, operator and budget owner
date: 30 September 2026
status: Foundation accepted. Nothing deployed, sent, bought or published. Spend $0.
cover_drawing: crossroads-signpost
cover_note: Internal working document. Every figure traces to a project file or a retrieved source (claims table in docs/arnaud/CLAIMS.md). Prices are list prices recorded on 30 September 2026, not quotes; nothing has been bought.
brand: Bill Badran · retirement system
version: Draft 1
toc: true
toc_depth: 1
---

# At a glance

::: lede
Built and checked; nothing is live. Next: your 13 answers.
:::

::: two-col rule
### What exists

- Five foundation tasks accepted, each checked by an AI verifier that did none of the work.
- One combined site version: 13 checks pass, 41 of 41 browser tests included (stand-in browser); 1 blocked, 1 fails by design.
- The 18 Instagram capsules, started early as drafts.

+++

### What does not exist yet

- No site deployed, account opened, email sent, purchase or publication.
- No Bill recording, no approved book, no approval (G0–G6) recorded.
- So Friday 2 October can only be a labelled protected rehearsal, unless approvals are recorded and recordings exist.
:::

::: table title="Money and time" widths=16,42,42 first=strong compact
| | Today and for the pilot | Later |
|---|---|---|
| Money | $0 spent; limits at 0. No new subscription for the pilot if the existing server, Bill's Google account and backup storage suffice. AI build usage: 14.1 million tokens over 6 metered runs, no price metered. | Only if a trigger is reached, at the list prices in section 06. The CAD 280 ad test is a proposal, not authorized. |
| Your time | 13 questions, once. Proposed: you deploy and operate, check bookings daily, moderate the event, run the weekly review. | Not estimated; recorded in hours once operating. |
| Bill's time | 10 questions; a 20-minute voice interview; 22 to 35 minutes of finished video per language (not studio time). | Meetings, proposed: 3 h 50 min a week reserved. Crossroads, 60 minutes, proposed monthly. <!-- ok: sixty --> |
:::

::: table title="Five decisions that unblock the most (our reading of blockers.md)" widths=13,69,18 first=strong compact note="On Bill's side, HB-19 (recording dates) and HB-21 (his professional facts and the firm reviewer's name) gate everything public."
| Item | Decision | Friday |
|---|---|---|
| HB-02 | Your server: its facts, the operator's access, and whether an n8n already runs there | Hard |
| HB-03 | The official code version. Proposal: the combined version, already built and tested | Hard |
| HB-06, HB-07 | Who opens Brevo Free, Supabase Free and Stripe test mode in their own name; which password manager; who the operator is | Hard |
| HB-10 | Who deploys and operates (proposal: you), and where the off-server backups go | Hard |
| HB-04 | Which book is the book, with Bill: the free PDF and the paid book both need one approved file | Hard, guide path |
:::

# What was built first, and why

::: lede
Wave 0 builds nothing a visitor sees. It fixes the facts and rules first, so parallel work cannot drift, leak anyone's numbers, or promise what Bill has not approved. Accepted means checked; not approved, not live.
:::

::: table widths=14,50,36 first=strong compact note="Accepted = the verifier found no blocking defect at that stage; it is not an approval by you, Bill or the firm. Sources: tasks.json, reviews/*.md, inventory.md, contracts/README.md, baseline.md (all under .orchestration/)."
| Task | What it produced, and where | How the AI verifier (A6) checked it |
|---|---|---|
| F00 Inventory | The facts: 6 code versions, a 171-row gap list (7 exist, 30 partial, 119 missing, 15 waiting on a person), assets, tools, visible accounts. `inventory.md` | Pass on attempt 3. [accepted] at the design stage |
| F01 Decisions | The decision log (75 entries today, 13 still open), one batch of 29 questions plus 16 technical blockers, a cost sheet of known amounts only. `decisions.md`, `blockers.md`, `costs.json` | Pass on attempt 2. [accepted] |
| F02 Frozen rules | 15 versioned contracts: events, jobs, email eligibility, flags, privacy, authority, data model, offers, routes, assets, approvals, handoff, workshop inputs, maths, clips. `contracts/` | Design pass on attempt 3; the maths review found two coverage gaps, not wrong formulas, moved to F02a. [accepted] |
| F02a Maths tests | Four workshop test cases (WM37 to WM40); A0 patch 1 moved the rule set to 1.1. `contracts/fixtures/workshop/` | Faulty calculators now fail; the patch passed on attempt 2. [accepted] |
| F03 Combined version | Branch `integration`: codex and the guide merged with no conflict, the orchestration record, and a check suite anyone can re-run. `baseline.md` | One runner defect, then pass on attempt 2; pages pixel-identical before and after the merge (24 of 24). [accepted] at the local-tested stage |
:::

::: table title="Checks on integration at e766026, re-run on 30 September (exit 0)" widths=34,66 first=strong compact note="Source: evidence/A0-regression-e766026/results.json; decisions.md D-058, D-061."
| Check | Result |
|---|---|
| Install, lint, types, build, unit tests, contracts, task graph, runner | [done: pass] unit tests 13 of 13; schema tests 244 of 244; validator 361 pass, 0 fail; self-test 13 of 13 |
| Browser tests, page captures | [done: pass] 41 of 41 and 49 of 49, under a stand-in browser (Chromium 141); the pinned browser is still needed before release |
| Publication check | [done: pass] but empty: no article is published yet |
| Branch protection | [blocked] no GitHub tool or token here (HB-11) |
| Launch check | [stop: fails by design] 8 approval flags are off; agents never switch them on |
:::

# What we found, and what we did

::: table widths=44,40,16 compact note="Sources: decisions.md D-045, D-048, D-049, D-051 to D-060, D-074; inventory.md §4, §6, §7; blockers.md TB-01 to TB-16; baseline.md §6, §7."
| Finding | What we did | Status |
|---|---|---|
| The site's main version does not build: its `film/` folder has 2 lint and 26 type errors. | Built the combined version from codex, which leaves `film/` out. `main` untouched. | [resolved] main still fails |
| The homepage narration clones a third-party voice saying "I'm Bill Badran"; the film's audio is on a free, non-commercial plan. | Kept out of any public build; quarantine proposed to Bill (HB-22). | [must not ship] |
| The film has an invented client story ("Nathalie, 54 ans, Laval"), unsupported titles, press citations, urgency. | Never reused (D-053). | [quarantined] |
| The site's copy makes 8 claims about Bill: affiliation, a protected title, years of experience, designations, compensation, a missing firm disclosure, quotes, 12 "Ask Bill" answers. | Held behind the site's approval flags until Bill and the firm confirm (G1; HB-21, HB-23). | [pending] |
| Older copy contradicts the frozen offers (a 45-minute monthly session, a free printed copy); no 15- or 30-minute offer text exists. | Superseded; new copy follows the frozen offers. | [resolved] |
| The code assumes Vercel; its inquiry form uses Resend and Upstash. | The plan's stack stands. Retiring Resend and Upstash is your call (HB-06). | [done: plan stands] |
| The only n8n we can reach is someone else's n8n Cloud project; whether one runs on your server is unknown. | Cloud stays out. Nothing is installed before a read-only look at the server (HB-02). | [to confirm] |
| Three books compete: a 40-page review PDF, a 32-page generator, an on-site booklet. | Your and Bill's choice (HB-04). | [to decide] |
| The site's review protection skips images: the unapproved portrait and an AI cover with Bill's name show on a hosted preview. | No hosted preview until fixed (TB-09). | [blocked] |
| Publication controls exist but are not enforced (no code owners, no branch protection). | Enforced once you name reviewers (HB-11). | [to confirm] |
| This environment cannot reach Brevo, Supabase, Stripe, Calendly or n8n's sites; its browser is a stand-in. | Provider tests only from authorized staging; a pinned-browser run before release. | [blocked] |
| The rule-set validator failed after the F02 split. The site's lint and formatter also read orchestration files (22 warnings, 0 errors). | Validator fixed by A0 patch 1 (set 1.1: 361 pass, 0 fail). Config proposals P2, P5 not applied. | [fixed] and [proposed] |
| No Bill Google account or ad account is visible to us. | Asked in HB-14 and HB-13. | [to confirm] |
:::

# The plan {drawing=bridge}

::: lede
One coherent system whose purpose is held, relevant retirement conversations with Bill, then client relationships only where the fit is mutual.
:::

The brand line is **Build a Better Retirement Together**; the idea underneath, *The goal isn't to reach retirement. It's to live it.* (the supplied creative direction, not a trademark clearance). Navy ink on warm paper, pen drawings, ordinary life.

::: two-col rule
### Workshop Journey

A custom four-part exercise at the visitor's own pace. Bill's recorded explanation sits beside an interactive tool; the answers build a private milestone map and a useful summary. The numbers a visitor types never leave their browser.

+++

### Retirement Crossroads Challenge

A live game show Bill hosts on Google Meet: ten fictional cases, A/B/C/D answers, fair scoring, explanations and questions. Registration and follow-up are branded; a proven meeting service carries the video.
:::

::: table title="The offers, frozen unless you and Bill change them" widths=20,50,30 first=strong compact note="Source: 01_MASTER_PLAN.md §1; decisions.md D-001 to D-006, D-032. The public wording still needs G1."
| Offer | What the person receives | Status |
|---|---|---|
| Free PDF guide | The approved retirement guide | [pending] no approved edition (HB-04) |
| Free introduction | 15 minutes with Bill about one question, online or in person | [to confirm] weekly slots, room (HB-16) |
| Printed book | A paid printed book including one 30-minute consultation, online or in person | [to decide] no price exists or is proposed (HB-20) |
| Continued work | Scope, fees and next steps, only if the fit is mutual | [done] no mandatory path |
:::

Every relevant page can lead straight to the 15-minute meeting: nobody must watch a webinar, finish the workshop or buy the book first.

::: pagebreak :::

## Two loops, not a swarm

- **The build loop.** The director gives one bounded task at a time to a specialist, who builds and tests; the verifier checks the real output; at most two repairs, then split, simplify or block; the director integrates and records the evidence. By rule, one director and at most three specialists at once, the verifier included.
- **The operating loop.** Once released, tested n8n workflows send registrations, reminders and receipts, and a small weekly loop drafts one article for human review. No agent decides for a client, gives financial advice or changes ad spend. No AI talks to visitors.

## The system in one picture

::: two-col ratio=1/1
::: figure name=system-map height=2.9in
The system map: eight objects on one table, labels beside it, never drawn. Ways in: the guide, the Workshop Journey and Crossroads each lead to Bill's 15-minute conversation; the book carries its own 30-minute consultation.
:::
+++
::: table widths=33,67 compact
| Object | Stands for (planned, not set up) |
|---|---|
| Building | Bill's website, on your existing server (proposed, HB-01) |
| Filing cabinet | Records: Supabase Free, minimal data only |
| Gears | Automation: self-hosted n8n |
| Envelope | Email: Brevo Free delivers what n8n schedules |
| Calendar | Bookings: Bill's Google calendar; Calendly during the build |
| Receipt | Book payments: Stripe hosted checkout |
| Film roll | Bill's real recordings, masters in owner storage |
| Padlock | Nightly encrypted backups, off the server |
:::
:::

::: keep
::: table title="The agent team: roles, not always-on subscriptions" widths=24,40,36 first=strong compact note="Source: 01_MASTER_PLAN.md §4, §5; decisions.md D-037, D-065."
| Role | Does | Cannot |
|---|---|---|
| A0 Director | Dispatches tasks, keeps the board, integrates, lists the questions | Invent an approval, change an offer, spend or publish |
| A1 Brand and ink | Layout, drawings, responsive design | Rewrite financial logic, imitate Bill with synthetic footage |
| A2 Workshop | Workshop steps, calculations, charts, local summary | Send answers to marketing systems, certify readiness |
| A3 Platform | Hosting, database rules, backups, n8n operations | Touch production before G2 |
| A4 Integrations | Brevo, bookings, Stripe, n8n workflows | Approve publication, bypass unsubscribe |
| A5 Editorial | Scripts, cases, articles, campaigns | Invent client stories, credentials, quotes or results |
| A6 Verifier | Technical, factual, privacy and path checks | Approve its own work, replace Bill's or the firm's review |
:::
:::

## Seven approvals, none recorded

::: table widths=7,20,45,28 compact note="Source: 06_HUMAN_GATES_AND_RUNBOOK.md, gate registry; decisions.md line 9. A chat 'yes' never approves copy, calculations or media: those go in an H00 packet with the reviewer's name, the date and the file's exact fingerprint (hash)."
| Gate | Who | What must be recorded | What it unlocks |
|---|---|---|---|
| G0 | You, with Bill where relevant | Production host, official code version, languages and area, event date and cap, scheduling owner, book price and cap, time allocation | Setting up the chosen production design |
| G1 | Bill and the firm reviewer | Verified identity, designations, affiliation, services; the exact 15-minute and book offers | Using those claims in final copy |
| G2 | Account owners, and you | Named accounts, least access, test permissions, spending limits, test recipients | Accounts, test sends, paid API use; not launch |
| G3 | Bill and the firm reviewer | Exact versions of pages, book, scripts, cases, articles, ads, emails, calculations | Publishing those exact files |
| G4 | Bill and the rights holders | Approved recordings, portrait and art rights, recording consent, replay policy | Using Bill's real media |
| G5 | The privacy owner | Data flows, consent wording, retention, processors, incident owner, refund process | Handling real people's data |
| G6 | You and Bill | Release list, test evidence, features switched on, ad scope, rollback, named operator | Switching on for the public, step by step |
:::

# Infrastructure

Proven pieces in the owners' own names, free tier or existing account first. **Nothing below is set up yet.**

::: table widths=25,17,13,19,26 compact note="Deliberately not used: Zoom, n8n Cloud, Vercel Hobby, a custom video platform, a new CRM or email server, a home-built scheduler, any live AI talking to visitors, Kubernetes, agent frameworks, cold outreach (D-008 to D-015). Resend and Upstash are not extended (D-051); Vercel Pro only if you choose it (HB-01). 'Proposed' owner = HB-06, not yet answered. Sources: 01 §2, §7, §8; decisions.md D-019 to D-026; costs.json; blockers.md."
| Component and job | Exists or to set up | Owner | Cost status | Main risk |
|---|---|---|---|---|
| **Existing server (VPS):** site, n8n, backup jobs | [exists] but not inspected (HB-02) | You | Existing; amount to confirm | An existing n8n overwritten: inspect read-only first |
| **The site** (bilingual Next.js): pages, workshop, forms | [exists] as code on integration; not deployed | You (proposed) | No new cost on the server | Unapproved images on a preview until the fix |
| **n8n, self-hosted:** reminders, receipts, follow-up | [to open] or review an existing one | You authorize; operator runs | Licence fee 0; terms to verify | Lost encryption key = unusable credentials: back it up first |
| **Supabase Free:** contacts, consent, orders, jobs | [to open] no project yet | Bill or firm (proposed) | $0; Pro only if needed | Pauses after a week idle, no backups: ours cover it |
| **Brevo Free:** sends what n8n schedules | [to open] | Bill or firm (proposed) | $0; Starter only if needed | 300 sends a day, shared; MX stays untouched |
| **Google account:** Meet, Calendar | [to confirm] edition unknown (HB-14) | Bill | Existing; Workspace only if short | Meet's limits depend on the edition |
| **Calendly:** bookings during the build | [exists] | Bill | Existing; amount to confirm | Meeting lengths unverified (HB-15) |
| **Stripe hosted checkout:** book payments | [to open] test mode first | Bill or firm (proposed) | A fee per sale | Paid only when Stripe's signed message says so |
| **Video host:** serves Bill's clips | [not chosen] | You (budget) | Not selected | Chosen after real file sizes exist |
| **Off-server backups:** 14 nightly encrypted sets | [to confirm] destination (HB-10) | You | Existing storage preferred | A backup on the same disk is not a backup |
| **GitHub:** reviewed versions, checks | [exists] private repository | You | Existing; amount to confirm | Controls not enforced until HB-11 |
| **Domain, current mailbox** | [exists] provider unknown (HB-05) | Bill; you confirm | Existing; to confirm | Not migrated or changed here |
:::

# Money

::: lede
Spent so far: $0. Limits for model APIs, ads and subscriptions are all 0 until you set them (G2). Nothing has been bought.
:::

**What a pilot needs:** no new subscription, if the existing server, Bill's existing Google account and existing backup storage are enough. If Bill's account cannot host Meet, the director returns with one Workspace line (tier, seats, the price at Bill's own checkout) for a yes or no.

::: table title="Later, only if a trigger is reached: list prices as recorded" widths=23,26,34,17 compact note="Retrieved 30 September 2026; list prices, not quotes; taxes (GST/QST) extra. [fetched] = the vendor's own source file on GitHub; [unverified] = a search summary: confirm at checkout."
| Item | Needed only when | List price, as recorded | Source |
|---|---|---|---|
| Workspace Business Standard | Bill's Google account falls short (HB-14) | USD 14.00 annual / 16.80 flexible per user per month, Meet for 150 with recording (Starter: USD 7.00 / 8.40, Meet for 100, no recording) | Google [unverified] |
| Workspace in CAD | A reseller's page, not Google | Starter CAD 9.20 / 11; Standard CAD 18.40 / 22 (annual / flexible) | northstarit.ca [unverified] |
| Supabase Pro | Free limits or backups fall short | From $25 per month + usage (USD), one project on Micro compute | supabase.com [fetched] |
| Brevo Starter | The busiest day nears 300 free sends | From USD 9 per month (5,000 emails a month) | brevo.com [unverified] |
| Vercel Pro | Only if you pick Vercel (HB-01) | USD 20 per paid seat per month, USD 20 usage credit | vercel.com [unverified] |
| Remotion Company License | Only if the video maker has 4+ people | Free up to 3 people; USD 25 per seat per month | remotion.dev [fetched] |
| n8n Cloud Starter | Not used: what self-hosting avoids | $20 per month billed annually, 2,500 executions | n8n.io [unverified] |
| *Backups:* Backblaze B2 | No owner storage exists (example) | USD 6.95 per TB per 30 days | backblaze.com [unverified] |
| *Backups:* Hetzner Box 1 TB | Same; stored in the EU (example) | EUR 3.20 per month, excl. VAT | hetzner.com [unverified] |
| *Video:* Cloudflare R2 | A video host is needed (example) | USD 0.015 per GB-month; egress free; first 10 GB-month free | Cloudflare [fetched] |
| *Video:* Bunny Stream | Same (example) | USD 0.01 per GB stored per region; USD 0.005 per GB delivered (Volume tier); USD 1 minimum | bunny.net [unverified] |
:::

::: two-col rule
### Per sale

- **Stripe, Canadian card:** 2.9% + CA$0.30 per successful charge; international cards +0.8%, conversion +2%; no monthly fee. All [unverified].
- **Printing and shipping:** quote needed (HB-20). **Taxes:** Bill, with his accountant.
- **Book price:** none exists or is proposed; first batch proposed at 8 bundles.

+++

### The ad test

- **CAD 20 a day × 14 days = CAD 280**, [proposed] not authorized. The ads limit stays 0.
- It needs a real Bill ad account (none is visible), a check of Meta's rules on it, your limit (G2) and scope (G6).
- For scale, Meta's recommended start: "at least $5" a day over more than six days [unverified].
:::

**Existing costs to confirm (HB-08 b):** server, domain, mailbox, Calendly, Google, GitHub, and Resend or Upstash if they exist: plan, amount, currency, renewal date. "Don't know" is fine; nothing here blocks the pilot. Your build-assistant subscription is recorded from your own invoice. **Not priced yet:** the video host's traffic, a paid model API for the weekly draft (limit 0), book printing.

::: table title="Measured AI usage, from runs/*.json" widths=23,33,10,16,18 compact note="Every file records the cost as 'unavailable-not-estimated': no price per token is assumed. The runs used your existing build-assistant subscription. The briefing-video run was cut by a container restart and its metering was not recovered, so the totals understate real use. This PDF's run is not recorded yet."
| Run | Work | Agents | Tokens | Wall time |
|---|---|---|---|---|
| wf_5bb05036-e58 | F00 | 9 | 2,086,746 | 6,271 s |
| wf_1e398e6e-3ba | F01, F02 | 21 | 6,591,831 | 18,263 s |
| wf_31fbf929-015 | F03, F02a | 10 | 2,754,007 | 6,967 s |
| wf_cc398756-8c2 | A0 patch 1, F02a | 4 | 1,123,916 | 4,381 s |
| wf_f0daf97f-ca5 | Briefing video, preparation | 2 | 390,325 | 1,601 s |
| wf_1b4ec6c8-e3c | Briefing video [stop: metering lost] | — | — | — |
| wf_53283c8e-d09 | Briefing video, resume | 4 | 1,151,840 | 3,482 s |
| **6 metered runs** | | **50** | **14,098,665** | **40,965 s (11 h 22 min)** |
:::

# Time {drawing=desk-clock}

::: lede
The build needs nobody's daily time. It needs one sitting of answers from each person, then recordings and approvals from Bill, and operating time from you once live.
:::

::: table widths=15,40,45 first=strong compact note="Sources: blockers.md sections 1 to 3; 05_CONTENT_AND_ART_BRIEFS.md §1 to §3; 01_MASTER_PLAN.md §10, §17; decisions.md D-030, D-033; costs.json capacity_proposal, bill_time, operator_time; 06 runbook."
| Person | Once | Recurring, proposed |
|---|---|---|
| You | 13 questions (HB-01 to HB-13), one sitting. Add the operator's public SSH key to the server yourself. Owners open their own accounts. | Deploy and operate (HB-10); reconcile bookings daily (HB-16); moderate Crossroads: chat, guests, technical problems (HB-17); the weekly operating review; watch operations during the pilot. **Not estimated**: recorded in hours once operating. |
| Bill | 10 questions (HB-14 to HB-23). A 20-minute recorded voice interview, with consent. Recording: 22 to 35 minutes of finished workshop and social video per language, not studio time. | Meetings: six 15-minute and two 30-minute a week with buffers, 3 h 50 min reserved, before preparation and follow-up (he confirms). Crossroads: 60 minutes, one pilot then monthly if justified, plus rehearsal. A weekly voice note; drafts to review; approvals. <!-- ok: sixty --> |
| Firm reviewer, privacy owner | Named by Bill in HB-21. 6 questions (HB-24 to HB-29). | Approves exact versions of copy, scripts and calculations (G1, G3) and the privacy decisions (G5). No source gives a time estimate. |
:::

::: two-col rule
### The meeting arithmetic

Six 15-minute introductions and two 30-minute book meetings, each with a 10-minute buffer:

(6 × 25 + 2 × 40) ÷ 60 = 230 minutes = **3 h 50 min a week**, reserved before preparation and follow-up. A proposal: Bill confirms it (HB-16).

+++

### The recording arithmetic

12 workshop clips (8 min 45 s to 12 min 30 s) plus 18 capsules of 45 to 75 seconds (13 min 30 s to 22 min 30 s): **22 min 15 s to 35 min** of finished video per language; both languages, 44 min 30 s to 70 min. Not counted: companion cuts, the interview, the live event, studio time.
:::

# Timeline and critical path

Where we are: **finishing wave 0.** The five foundation tasks are accepted; the hosting choice waits for HB-01 and the server inspection for HB-02.

::: table widths=8,70,22 first=strong compact note="Source: 01_MASTER_PLAN.md §6; tasks.json: 63 tasks, 5 accepted, 1 running, 57 planned."
| Wave | What it does | Status |
|---|---|---|
| 0 | Inspect and freeze: inventory, decisions, contracts, combined version, hosting target | [done: 5 tasks accepted] host open |
| 1 | One real workshop screen with its first drawing; the calculation core; local setup with dry-run providers | [next] |
| 2 | Every path: guide, registration, booking, workshop, Crossroads, book; Bill records priority clips | [planned] |
| 3 | Real recordings and art; provider tests in authorized staging; restore drill; event rehearsal | [planned] |
| 4 | The Friday pilot gate | [rehearsal] on current evidence |
| 5 | Finish the content bank (18 scripts, 36 pieces, 13 articles). Then 90 days: weekly checks, one approved article and two social pieces a week (26 of the 36 capsule pieces, 10 in reserve), a monthly Crossroads while justified (proposed), one change at a time, reviews at days 30, 60, 90. Success is meetings held, not clicks | [planned] |
:::

**Ready now** (dependencies accepted, no approval needed): **D00** a workshop design slice; **P00** the deployment profile (final choice after HB-01); **P01** the database schema, locally; **W00** the calculation core; **C00** Bill's voice reference and claims ledger (interview after HB-19). **Running:** C01, the capsules (D-075). At most three at once.

**Critical path:** the longest chain has 18 tasks: F00, F01, F02, F03, **P00**, P03, N00, N01, N03, L00, L01, L02, L04, **L05**, L06, O00, O01, O02. Four are done; P00 is next. Approvals sit on L01 (G2), L02 (G2, G4), the invited pilot L05 (G0, G1, G3 to G6), L06 (G2, G3, G5, G6) and the three operating tasks (G3, G5, G6).

::: callout tone=rule title="Friday 2 October, honestly"
On current evidence, Friday can only be a clearly labelled protected rehearsal of whatever passes locally, with fictional data. That changes only if the approvals are recorded and recordings exist: the invited pilot needs G0, G1, G3, G4, G5 and G6; none is recorded; there are 0 Bill recordings and no approved book.
:::

# Your decisions

::: callout tone=rule title="How to answer: one reply to the director, item by item, by HB number"
"Proposal OK" accepts a proposal as written; "Don't know yet" keeps the item open while work continues. **Non-secret answers**: reply; the director records them in `decisions.md` with the date and who answered. **Personal data** (tester addresses): reply; it goes to the staging configuration, never git. **Secrets** (passwords, keys, tokens, card numbers): **never in chat**; each has a named place (last table). **Approvals** of copy, calculations or media: never a chat "yes", but an H00 packet with the reviewer's name, the date and the file's exact fingerprint.
:::

::: table title="Your 13 items" widths=15,30,32,11,12 compact note="Source: blockers.md section 1. Friday: Hard = the invited pilot cannot run without it; Rehearsal = needed even for a meaningful rehearsal of that path; Later = not needed for Friday."
| Item | Question | Proposal | Friday | Answer by |
|---|---|---|---|---|
| **HB-01** Host | Keep your existing server, or choose Vercel Pro? | Your existing server | Rehearsal | Reply |
| **HB-02** Server | Provider, size, proxy, deployment, backups today; operator access; an n8n already there? | You add the operator's public SSH key; an existing n8n is inspected read-only, data and key kept | Hard | Facts: reply. Keys: password manager |
| **HB-03** Code version | codex, homepage, or a manual merge? Retarget PR #1? | codex plus guide, as tested; homepage kept on its branch; you decide the hero | Hard | Reply |
| **HB-04** Book, with Bill | Which book; where is the 40-page source; the Drive print file; a French edition? | None: a content choice | Hard, guide path | Reply; source to owner storage |
| **HB-05** Domain, mail | Who controls DNS and hosts Bill's mail; who adds Brevo's records; which addresses are watched? | Mail and MX untouched; after review, only Brevo's DKIM; review SPF and DMARC | Hard, real email | Reply; DNS login stays with its owner |
| **HB-06** Accounts | Bill or the firm opens Brevo Free, Supabase Free, Stripe test mode? Resend, Upstash? n8n Cloud? | Yes, each by its named owner; retire Resend and Upstash after Brevo passes; Cloud out; check n8n's licence | Hard, providers | Owner names |
| **HB-07** Secrets, operator | Which password manager; who enters secrets on the server and in n8n? | One named operator, Bill as account owner; no tool proposed | Hard, staging | Tool and person names only |
| **HB-08** Spending limits | Limits for model API, ads, subscriptions; Workspace if needed; (b) existing costs | All three at 0 through the pilot; Workspace as one yes-or-no line | Nothing, at 0 | Reply; (b) "don't know" is fine |
| **HB-09** Test recipients | Who may receive staging emails and bookings; which feed, inbox and Telegram chat for n8n tests? | Your inboxes plus one consenting outside tester; a public feed you name; your own bot, private chat | (a) Rehearsal (b) Hard | Reply; bot token never in chat |
| **HB-10** Operations | Who deploys, is on duty, gets alerts; where do backups and video masters go? | You deploy and operate, Bill informed; existing owner storage preferred | Hard | Reply |
| **HB-11** GitHub | Reviewers; Bill's login or offline approvals; branch protection; CI token? | Protect the branch; Bill reviews content; the firm reviewer from HB-21; you merge, not approve | Later | Names: reply. Token: repo secret |
| **HB-12** Repository | Keep `film/` and `presentation/` out of the build? The empty `billsite`? | Exclude both, keep them in git; leave `billsite` | No effect | Reply |
| **HB-13** Ads, social (with Bill) | Bill's Meta account and page, LinkedIn, Google Business Profile, Search Console? | No ads, no automated posting in the pilot; ready-to-post packages | Later | Names, owners |
:::

::: two-col rule
### Bill's items that need you

- **HB-14:** if his Google account cannot host Meet, the Workspace line comes to you.
- **HB-15, HB-16:** the proposal has you checking bookings daily; any 60-minute introduction is retired. <!-- ok: sixty -->
- **HB-17:** the first Crossroads date, cap and language are G0 for you and Bill; you moderate; no replay unless approved.
- **HB-18:** drafts in English and Quebec French; record and publish only what Bill records.
- **HB-19:** the interview needs no script and can come first; recording follows script review.
- **HB-20:** book price and cap are G0 for Bill and you; no price is proposed.

+++

### And the reviewer's

- **HB-21:** until Bill and the firm confirm, every professional claim stays marked pending; naming the reviewer unlocks HB-24 to HB-29 and every G1 and G3 approval.
- **HB-22, HB-23:** the portrait, the AI cover and the cloned narration; the "In their words" quotes and the Ask Bill questions.
- **HB-24 to HB-29:** offer wording, claims and sources, the calculator's limits, privacy, fulfilment and refunds, testimonials.
:::

::: table title="Where each secret goes: never in chat" widths=32,68 compact note="Source: blockers.md 'Secrets: never in chat' (06 secrets map, plus rows proposed in D-070 for you to confirm in HB-07)."
| Secret | Destination |
|---|---|
| n8n encryption key | The server's protected environment, plus a separate off-server backup made before any credential exists |
| Supabase, Brevo, Stripe, Google, Telegram keys | Server-only environment or n8n's credential vault; never in an exported workflow |
| Provider logins, private SSH keys, backup key | The HB-07 password manager (backup key: plus one offline copy held by the owner) |
| GitHub token; DNS login | A GitHub repository secret; the DNS login stays with its owner, who enters the records |
:::

# Risks and controls

::: table widths=30,50,20 compact note="Sources: decisions.md D-014 to D-017, D-020 to D-023, D-037 to D-039, D-043, D-052 to D-064, D-075; blockers.md TB-02, TB-09; published-prices.json method summary."
| Risk | Control (a rule now, or a planned task) | Who watches |
|---|---|---|
| Friday presented as more than it is | Protected-rehearsal rule; no stand-in shown as live Bill; no unapproved book; no faked success | Director; you choose the label |
| An unverified professional claim reaches the public | The launch guard: 8 approval flags off, never switched by an agent; the claims quarantine; G1 | Bill, firm reviewer |
| A synthetic voice or likeness of Bill | Cloned narration and free-plan audio must not ship; no synthesis without consent; ink drawings only | Bill (G4) |
| Workshop figures leak | They never leave the browser: not in links, analytics, email, n8n, Supabase, ad platforms or AI prompts; the verifier tests it | Verifier |
| Unapproved images on a preview | No hosted preview until the proxy fix | Platform, verifier |
| An existing n8n overwritten, or its key lost | Read-only inspection first; the key backed up off-server before any credential | Platform; you (HB-02) |
| Bill's current email breaks | No DNS or MX change without a recorded authorization; proposed: only Brevo's DKIM, after review | The DNS owner |
| Money spent without a decision | Limits at 0 until G2; no purchase without a recorded authorization | You |
| A defect hidden by the stand-in browser | A run in the pinned browser before release | Platform; you (network settings) |
| A free tier pauses or runs out | Planned: nightly encrypted backups and a restore drill; email kept under 300 a day, operational first. Never fake traffic | Platform, integrations |
| A recorded price is wrong | Most prices are search summaries: confirm at checkout, where the regional price counts | You, at checkout |
| Publication without real approval | Approvals bind the exact file (G3); controls enforced after HB-11 | You, the reviewer |
| Capsules written before Bill's interview | Drafts only; a voice pass against his interview and a G1/G3 review before any recording | Editorial, Bill |
| Endless agent loops, scope creep | At most three attempts per task and three workers at once; an anti-overengineering list | Director |
| Evidence overstated | Pass, fail, blocked or not run; a timeout or missing tool is never a success | Verifier |
:::

::: callout tone=quiet
The controls are rules the build already follows. What remains is mostly a person's decision or a real account to test against.
:::

# Where everything lives

::: table title="Branches of arnaudverdier8-svg/bill (private)" widths=35,11,54 compact note="Source: git branch -a -vv, read 30 September 2026; inventory.md §1.1; baseline.md §1 to §3."
| Branch | At | What it holds |
|---|---|---|
| `integration` | `e766026` | The combined version and the check suite; on origin |
| `claude/orchestration-foundation` | `f3cbc0c` | The orchestration record, `.orchestration/`; on origin |
| `claude/plan-briefing-video` | `3df1fe5` | Briefing film (`f104e18` on origin); print pipeline, local only |
| `codex/desktop-iphone-unified` | `66cce52` | Base of the combined version; draft PR #1 waits for HB-03 |
| `guide/pre-retirement-guide` | `749b360` | The 32-page guide generator; merged |
| `claude/bill-centered-homepage` | `d63aabd` | The competing homepage; kept, not merged (HB-03) |
| `claude/bill-presentation-video` | `fc00445` | Internal pitch, superseded offers; kept (HB-12) |
| `main`, `add-ask-bill-section` | `77de3bd`, `01e296c` | The original site, untouched; the second is inside codex |
:::

::: table title="Key files, in .orchestration/ unless briefing/ is named" widths=36,64 compact
| File | What it is |
|---|---|
| source/01_MASTER_PLAN.md, tasks.json | The controlling plan (with 03 to 07 and the task ledger); the task board, 63 tasks |
| blockers.md, decisions.md, costs.json | Every question and the secrets table; the decision log; the cost sheet |
| inventory.md, baseline.md, contracts/, reviews/, evidence/, runs/ | What exists; the combined version; rules; verifier reports; evidence; usage |
| briefing/src/content.ts, CLAIMS.md, docs/arnaud/ | The briefing film (6 min 59 s, English, local) and its sources; this document |
:::

### Words used here

::: two-col rule
::: table widths=28,72 first=strong compact
| Word | Meaning |
|---|---|
| Agent | An AI session given one bounded task; it approves nothing |
| Verifier | The agent (A6) that checks others' work from a clean copy |
| Gate | A human approval (G0 to G6), with name, date, exact version |
| Contract | A versioned rule every builder follows |
| Hash | A file's fingerprint; an approval binds it |
:::
+++
::: table widths=28,72 first=strong compact
| Word | Meaning |
|---|---|
| VPS | Your existing virtual private server |
| n8n | The automation tool, run on your server |
| Supabase | The hosted database for the few operational records |
| RLS | Database rules so a browser never reads others' records |
| Brevo | The email service; free up to 300 emails a day |
:::
:::
