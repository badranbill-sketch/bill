# CLAIMS — "The plan, in plain words" (the plan explained to Bill)

Source document: `docs/bill/plan-for-bill.md`. Output: `bill-plan-in-plain-words.pdf` (12 pages, built with
`--strict`, no warnings). Written 30 September 2026 by A5 (editorial), draft 1. Internal, not for publication.

Every factual or numeric statement in the PDF maps to a row below. Paths: `01` = `.orchestration/source/01_MASTER_PLAN.md`,
`05` = `05_CONTENT_AND_ART_BRIEFS.md`, `06` = `06_HUMAN_GATES_AND_RUNBOOK.md` (same folder); `B` =
`.orchestration/blockers.md`; `D` = `.orchestration/decisions.md`; `I` = `.orchestration/inventory.md`; `PB` =
`.orchestration/contracts/privacy-boundary.md`; `costs` = `.orchestration/costs.json`; `BC` = the briefing's
fact-checked `briefing/CLAIMS.md`; `prices` = `briefing/data/published-prices.json`. All read 2026-09-30 (live working
tree `/home/user/bill`; `tasks.json` and `decisions.md` as modified 17:43). Line numbers can move in files with
uncommitted edits; the excerpt is the check (`grep -nF`). No web page was fetched for this document: every figure is
a project file or a price already recorded in `prices` (retrieved 2026-09-30).

## Cover and Section 01 — In one page

| Statement | Source | Excerpt |
|---|---|---|
| Purpose: held, useful retirement conversations; client relationships where the fit is mutual | 01:53 | "Its purpose is to produce held, relevant retirement conversations, followed by mutually appropriate client relationships." |
| Free guide, four-part workshop with recorded explanations beside a tool, live game Bill hosts | 01:59–60; BC C02-3, C02-4 | "a custom, asynchronous, four-part exercise. Bill's recorded explanation appears beside an interactive tool"; "a live, Bill-hosted game show with ten fictional cases" |
| Any page leads straight to the 15-minute conversation; no required path | 01:71; D:27 (D-005) | "No mandatory funnel staircase. Every relevant page can lead directly to the 15-minute meeting." |
| Ten questions, once, one sitting | B:9, B:154–241 (HB-14…HB-23); BC C11-1 | "## How to answer, in one sitting"; 10 = HB-14…HB-23 |
| 20-minute recorded conversation | 05:15 | "Obtain a 20-minute recorded voice interview with consent." |
| Recording in batches, not weekly | 05:183 | "Batch 1: W00–W05/W11 and S01/S03/S13 … Batch 2 … Batch 3" |
| Weekly slots he chooses; Crossroads about monthly if justified; weekly voice note; drafts | 01:451, 01:447, 01:387; D:71 (D-033), D:139 (D-067) | "Bill must confirm it."; "one Crossroads session per month while measured attendance and Bill's capacity justify it"; "Bill's short non-identifying voice note" |
| Nothing out in his name until he and the firm approve the exact version | 06:16 (G3); D:105 (D-043) | "Bill + required firm reviewer \| Exact hashes/versions of public pages, book, scripts…" |
| Real recordings only; no synthetic copy without consent | D:43 (D-016); 01:278 | "No voice clone or avatar of Bill without his specific consent." |
| Only he advises; no AI answers anyone | D:40 (D-013); 06:82 | "No live customer-facing LLM. No automated financial replies"; "Bill handles personal financial questions." |
| He sets capacity and the book's price | B:170 (HB-16), B:202 (HB-20); D:70 (D-032) | "No price is proposed." |
| Accounts opened by him or his firm; his at handover | B:83 (HB-06 a); 01:471; 06:86 | "each opened by its named owner (Bill or the firm)"; "At handover, Bill owns the domains/accounts/content." |
| Groundwork done and checked: inventory, rules, working version on a test machine | tasks.json (F00, F01, F02, F02a, F03 accepted; 57 planned, C01 running); BC C04-2…C04-5 | integration e766026 "e2e 41/41 … under substitute Chromium 141" |
| Nothing live, bought, sent or published | D:44 (D-017); costs `authorized_caps` | "No real-world side effect without a recorded authorization." |
| Friday 2 October = clearly labelled rehearsal with made-up data unless approvals recorded and recordings exist | B:18–27; D:82 (D-039) | "Friday October 2 can only be a **clearly labelled protected rehearsal** … using fictional data. That changes only if the gates are recorded and the recordings exist." |

## Section 02 — What a visitor will experience

| Statement | Source | Excerpt |
|---|---|---|
| Four chapters (life to fund, income planned, what was built, when pieces change) | 01:308–313 | "1. What life do you want to fund? … 4. When do the pieces change?" |
| Pause, go back, skip unknowns, no documents | 01:306; 05:59 (W03) | "can pause, read the transcript, go back, change an answer, skip an unknown and finish without surrendering financial documents"; "no uploads" |
| He records general explanations; their numbers appear on screen | 05:52 | "Bill does not read changing user numbers; personalized numbers are rendered in the interface." |
| Printable summary: what it shows, what it cannot, one next question; guide and 15-minute offer | 01:335, 01:329 | "The ending says what the exercise clarifies, what it does not, and one meaningful next question. It offers the local summary, the guide and the 15-minute meeting." |
| No "you can retire" verdict, no alarm | 01:327 | "No automatic "you can retire," depletion alarm" |
| What they type never leaves their device | D:41 (D-014); PB §1, PB-FIN-1 | "Workshop financial figures never leave the browser." |
| Crossroads on Google Meet; ten fictional households; A/B/C/D; explanation; Q&A | 01:19, 01:60, 01:339 | "the ten-case Retirement Crossroads Challenge on Google Meet"; "A/B/C/D participation, fair scoring, explanations and Q&A" |
| 60 minutes proposed; Arnaud moderates chat and technical problems | 01:343; D:68 (D-030); B:178 (HB-17) | "Proposed first event: 60 minutes … Bill hosts; Arnaud moderates chat, admits guests and handles technical problems." |
| Game points, not a readiness test; recorded only if approved | 01:345; 05:90; B:178 (HB-17 proposal); 01:347 | "Scores are entertainment, not a retirement readiness test."; "No replay for the pilot unless you approve the recording (G4)" |
| Free guide: approved guide, free; never requires marketing sign-up; no approved book yet (HB-04) | D:23 (D-001); D:121 (D-054) | "Access and fulfilment never require marketing consent"; "No canonical book exists." |
| Introduction: 15 minutes, one question, online or in person; not a full plan | D:24 (D-002) | "Not a complete plan, not onboarding" |
| Book: paid, including ONE 30-minute consultation; terms before payment; buyer keeps it | D:25 (D-003) | "A buyer keeps the consultation even when no ongoing relationship follows" |
| Continued work only on mutual fit | D:26 (D-004) | "only a discussion of scope, fees and next steps when the fit is mutual" |

## Section 03 — What will never happen in your name

| Statement | Source | Excerpt |
|---|---|---|
| Rules change only by a written decision of Bill and Arnaud; no agent | D:35 (D-008), D:43 (D-016 "Same as D-008"); 01:62 | "An explicit written plan change by Arnaud and Bill. No agent" |
| No invented stories, testimonials, quotations, reviews, rankings, titles | D:43 (D-016); 01:385 | "No invented client stories, quotations, testimonials, reviews, credentials, experience counts, rankings" |
| No chatbot; personal question to a person; only AI job = weekly article draft, human-reviewed, approved (G3) | D:40 (D-013); 01:377; 06:16 | "The only model job is the weekly article draft, reviewed by a human (WF08)." |
| No fear, false deadlines, alarms or withheld answers | 01:335; D:43 (D-016 "urgency") | "Never intentionally withhold a computable answer or fabricate urgency to make Bill "necessary."" |
| Nothing published until Bill and the reviewer approve the exact version; material change needs new approval | 06:16, 06:21; 01:407 | "later material changes require new approval" |
| Real recordings; ink drawings until photo rights confirmed | D:43; B:233 (HB-22) | "use the portrait only after its rights are confirmed; no synthesis" |
| Auto-selected clip is disclosed; never "Bill reviewed your file" | 01:333; 05:69; D:43 | "Disclose that it is selected automatically from workshop answers and that Bill has not personally reviewed the submission." |
| No scraped contacts, cold outreach, engagement bots | 01:457; D:42 (D-015); D:43 | "No … automated cold outreach, engagement bots"; "No scraped leads." |
| Separate AI checker that did none of the work; technical check, not approval | 01:15, 01:130; BC C04-7 | "Use an independent fresh-context verifier." |
| Approvals: Bill statements, firm reviewer regulated content, Arnaud accounts/spending; name, date, exact version; chat "yes" is not approval | D:105 (D-043); B:15 | "Approvals of final copy, calculations or media (G1, G3, G4) are not given by a chat "yes"." |
| Each part has its own switch | 01:428 | "Each has its own enable switch. Never turn on the entire funnel because the homepage loads." |

## Section 04 — What we found that you should know

| Statement | Source | Excerpt |
|---|---|---|
| Homepage narration, about 51 s, every branch, clone of a third-party voice speaking as "I'm Bill Badran"; labelled a stand-in; must not ship | I:106; D:119 (D-052) | "**Chatterbox clone of a third-party `lawyer.wav`, speaking first-person "I'm Bill Badran"** … labelled a stand-in \| yes, **must not ship**" |
| Film voice/music on a free plan that does not allow commercial use | I:105 | "ElevenLabs "Jonathan" synthetic voice, music and sfx on a **free plan, which does not allow commercial use**" |
| Proposal: remove both from anything public (HB-22) | B:233 | "PROPOSAL: quarantine both audio sets now" |
| Older 14-page French guide: invented "Nathalie, 54 ans, Laval" story, press citations, urgency | I:103, I §6.2; D:120 (D-053) | "Invented first-person client story ("Nathalie, 54 ans, Laval"), La Presse and Globe and Mail citations, fear/urgency framing" |
| Titles in film files and an old site copy: "gestionnaire de portefeuille agréé", "Financial Planner since 2009"; set aside | I §6.2; D:120 | "Never reuse: "gestionnaire de portefeuille agréé", "Financial Planner since 2009"" |
| Site copy lists Pl.Fin., CIM, B.A.A., mutual fund dealing representative; "more than 15 years"; "independent financial planner"; behind approval switches set off; confirm (HB-21) | I:144–148 (C1–C4); B:217 | "the designations you hold (the site currently lists Pl.Fin., CIM, B.A.A. and mutual fund dealing representative)"; "your years of experience (the site says "more than 15")"; "Bill is an independent financial planner"; "held behind `approvals.qualificationsAndAffiliation=false`" |
| No record of who took the portrait or five reference photos | I:97–98 | "source undocumented"; "rights undocumented" |
| Draft book cover: AI-assisted sketch with "BILL BADRAN FINANCIAL PLANNING" and a signature | I:99; B:233 | "AI-assisted sketch portrait with the text "BILL BADRAN FINANCIAL PLANNING" and a script signature" |
| "In their words" quotes (older presentation) and twelve "Ask Bill" questions (one site version): unverified, unpublished (HB-23) | I §6.1 C7, C8; B:241 | "Are the 12 Ask Bill questions real questions you received?"; "treat both as unverified and keep them unpublished" |

## Section 05 — What it asks of your time

| Statement | Source | Excerpt |
|---|---|---|
| Ten questions; "Don't know yet" is valid | B:9–11 | ""Don't know yet" is a valid answer: the item stays open and work continues around it." |
| 20-minute conversation: explain each question across the desk, words never used, what he likes, uncertainty; not published | 05:15 | "Ask Bill how he would explain each question to someone across his desk, words he never uses, what he genuinely likes about this work, and how he handles uncertainty. This is source material, not a published testimonial." |
| 22 to 35 min finished video per language; workshop 8 min 45 s–12 min 30 s; capsules 13 min 30 s–22 min 30 s; both languages 44 min 30 s–70 min; not studio time | BC §3 (from 05:21, 05:56–67); 05:69, 05:183 | "**Total on screen** … 1,335 s = 22 min 15 s … 2,100 s = 35 min"; "if Bill records English and French, the total is 2,670–4,200 s = 44 min 30 s to 70 min" |
| Three batches; after scripts pass review | 05:183; B:194 (HB-19) | "The recording session after the scripts pass review" |
| 6 × 15 + 2 × 30 with 10-min buffers = 3 h 50 min, before preparation and follow-up; his call | 01:451; D:71; costs `capacity_proposal` | "(6×25 + 2×40) / 60 = 3 hours 50 minutes reserved, before preparation/follow-up. Bill must confirm it." |
| Crossroads 60 min, about monthly if justified, plus rehearsal; Arnaud would moderate; first date his | 01:343, 01:447; B:178 | "Rehearse against a clock."; "No date or cap is proposed." |
| Weekly non-identifying voice note becomes the article | 01:387 | "real question → Bill's short non-identifying voice note → current primary-source research → 450–700-word useful article" |
| Drafts approved with the reviewer | 06:16 | G3 "scripts, cases, articles, ads, email templates" |
| Not counted: preparation, follow-up, set-up, rehearsal, review | costs `capacity_proposal.excludes`; BC §3 | "excludes": ["preparation and follow-up", "recording sessions", "Crossroads hosting and rehearsal", "reviews and approvals"] |
| Arnaud proposes to operate; Bill kept informed (HB-10) | B:123 | "PROPOSAL: Arnaud deploys and operates, and Bill is kept informed." |

## Section 06 — Your decisions

Each HB row paraphrases the question, "Why" and "PROPOSAL" lines of `B` at the line given: HB-14 (B:154), HB-15
(B:162; "Retire any 60-minute introduction"; Zoom forbidden, D-008), HB-16 (B:170; "Arnaud reconciles bookings
daily"), HB-17 (B:178), HB-18 (B:186), HB-19 (B:194; first session "workshop clips W00–W05 and W11, and capsules S01,
S03 and S13" = seven clips and three videos), HB-20 (B:202; "a first batch capped at 8 bundles and one household per
bundle … **No price is proposed.**"), HB-21 (B:217), HB-22 (B:233; "Do you consent to any voice synthesis? (Default:
no.)"), HB-23 (B:241). Reviewer items: HB-24 (B:253), HB-25 (B:261), HB-26 (B:269; "capital illustration off for the
pilot", rendered "the "savings needed" illustration", the plan's C_R capital illustration, 01:325), HB-27 (B:277;
"commercial electronic message rules", rendered "anti-spam rules"), HB-28 (B:285), HB-29 (B:293). "How to answer":
B:9–15. Secrets never in chat: B:14; 06:25.

## Section 07 — Money, in plain terms

| Statement | Source | Excerpt |
|---|---|---|
| Nothing bought or spent; caps for paid AI, ads, subscriptions at 0 until Arnaud records a limit | costs:29 (`authorized_caps`); D:136 (D-064); 06:15 (G2 owner) | "purchased_api": 0, "ads": 0, "subscriptions": 0, "note": "zero until G2 records a cap" |
| No new subscription for the pilot if existing server, his Google account and existing backup storage suffice | BC C09-2; B (HB-08, HB-10); costs `offhost_backup` | "Friday: nothing, if the caps stay 0 and Bill's existing account can host Meet." |
| Existing costs to confirm: server, domain, mailbox, Calendly, Google, GitHub, build assistant | costs items `existing_cost_unknown`; BC C09-3 | seven `existing_cost_unknown` items |
| Workspace Business Standard USD 14.00 annual / 16.80 flexible per user per month [unverified]; trigger HB-14 | prices `gws-standard-usd` (snippet-only); BC LEDGER | "price": "14.00 (annual commitment) / 16.80 (Flexible)", "currency": "USD", "unit": "per user per month" |
| Supabase Pro from $25/month + usage (USD); trigger free limits or backups | prices `supabase-pro` (fetched from the vendor's source file) | "price": "From 25" … "monthly, plus usage over quotas" |
| Brevo Starter from USD 9/month [unverified]; trigger nearing the free 300/day | prices `brevo-starter` (snippet-only); 01:371 | "Brevo Free currently allows 300 sends/day" |
| Backblaze B2 USD 6.95 per TB per 30 days [example][unverified]; trigger no owner storage | prices `example-backup-b2` (snippet-only) | "EXAMPLE (not a selection)" |
| Stripe 2.9% + CA$0.30 per successful card charge [unverified] | prices `stripe-ca-domestic` (snippet-only) | "The base rate for card payments in Canada is 2.9% + CA$0.30 per successful charge." |
| Printing and shipping: quote needed (HB-20) | costs `book_printing`; B:202 | "Printer, print proof and unit cost unknown." |
| Ad test CAD 20 × 14 days = CAD 280, proposed, not authorized; limit stays 0 | 01:397; costs `proposals.ads_test`; D:138 (D-066) | "arithmetic_total": 280 … "The authorized ads cap remains 0." |
| List prices, not quotes; taxes extra | `briefing/data/published-prices.md:3` | "These are list prices, not quotes, and exclude GST/QST." |
| Book price his; "30 minutes included", no invented value | D:70 (D-032); D:25 (D-003) | "The promise is "30 minutes included", not a separately priced service with an invented value." |
| Not priced: video host (after estimate), paid AI draft (cap 0), different web host | D:58 (D-026); costs `model_api_weekly_draft`; D:51 (D-019); BC §4 | "The origin is not selected" |

## Section 08 — The first 90 days

| Statement | Source | Excerpt |
|---|---|---|
| Success = held, useful conversations, not likes/views/clicks | 01:53, 01:443 | "Open/click counts are supporting signals, not proof of understanding or commercial value." |
| Finishing wave 0 of six (waves 0–5); five pieces accepted | 01:208–230; tasks.json; BC C12-1 | F00, F01, F02, F02a, F03 `state` = "accepted" |
| Eighteen scripts being drafted, EN and Quebec French; voice pass after the interview and review before recording | tasks.json C01 `state` = "running"; D:186 (D-075) | "Before C10 records anything, the scripts get a voice pass against C00's interview and a G1/G3 review." |
| Next stages | 01:212–226; BC C12-2 | Waves 1–4 |
| Friday = protected rehearsal unless approvals and recordings | B:18–27; D:82 | as Section 01 |
| 90 days from the real launch date | 05:177 | "Use a rolling 90-day cycle from the actual launch date" |
| One article a week, thirteen, with LinkedIn version and his contribution | 05:115–133; 01:387 | "One article package = complete website article + … authentic Bill contribution + … LinkedIn adaptation" |
| Two videos a week; 26 pieces = 18 main + 8 companions; 10 in reserve | 05:23; 01:447 | "Publish 26 pieces in the first 90 days: all 18 main capsules plus eight selected companions. Keep the other ten companions as reserve" |
| Crossroads about monthly while justified | 01:447; D:139 | as above |
| One page a week; one change at a time in the weakest stage | 01:438, 01:444; 06:82 | "Every week, n8n prepares a single operational summary."; "Change one variable in the current weakest stage" |
| How we know: source, participation, held meeting, next step | 01:443 | "source → registration → genuine participation evidence → held meeting → suitable next step" |

## Section 09 — Questions you might ask

| Statement | Source | Excerpt |
|---|---|---|
| No chatbot; templates approved (G3), no per-recipient text; personal reply pauses sequence, goes to a person; financial questions his | D:40; PB-BREVO-2; 01:377; 06:82 | "No per-recipient generated text"; "A reply expressing a personal question pauses the relevant acquisition sequence and creates a human follow-up." |
| Three recording batches; weekly videos from recorded material | 05:183; 05:23 | as above |
| Scripts drafts until approved and recorded; his wording kept; substance back to review | D:43; 05:185 | "Keep takes where Bill's natural wording improves the script; substantive changes go back to review." |
| Failure: pause the flow and its ads; guide and contact stay where safe; reconcile before repeating; nightly off-server backup; monthly restore; Arnaud handles event tech | 01:430; 06:68; 01:294; 06:78; 01:343 | "A high-severity error pauses the affected flow and its advertising … Preserve the guide and phone/contact fallback when safe."; "do not repeat a charge, publication or send blindly"; "Monthly, restore into an isolated environment" |
| Data kept: email, optional first name, language, what was asked for and consented to; card with payment service; booking with calendar; privacy person decides providers, retention, consent (HB-21, HB-27) | PB §2 (DC-CONTACT, DC-CONSENT, DC-CARD, DC-BOOKING-INTAKE); B:217, B:277; 06:18 (G5) | "Normalized email, optional first name, locale"; "Shipping address; card data \| Stripe only"; "Scheduler and calendar only" |
| Nobody signs up: find the stage, change one thing; nothing bought on hope; Crossroads only while justified; no forecast; recordings his | 01:443–444; D:136; 01:447; 01:451 ("not speculative conversion rates"); 01:471 | "Cap sales/registrations against actual capacity, not speculative conversion rates." |
| Next: answers; local work continues; nothing live without recorded approval | B:344–346; D:44; BC C14-2 | "## What can proceed without any answer" |

## Statements checked and deliberately not made

- No designation, title, "financial planner", "independent", years of experience or firm stated as fact: they appear
  only in Section 04 as what the site's copy says, with a request to confirm (G1, HB-21). Lint opt-outs
  (`<!-- ok: credentials -->`) are on those two lines only; `<!-- ok: sixty -->` is on the four lines about the
  60-minute Crossroads session and the 60-minute Calendly type to retire, never about the book consultation.
- No book price, no seat count, no attendee cap, no event date, no sign-up forecast, no studio time, no review time.
- No photo, portrait or likeness: ink drawings only (two-chairs, workshop-notebook, lighthouse, bridge, desk-clock,
  crossroads-signpost, ledger-page, road-markers, dock).
- "Accepted" only for the five tasks `tasks.json` records as accepted; C01 is shown as [draft] (state "running").
- Nothing described as live, deployed, sent, bought or published.

## Commands run (from the `briefing/` folder of the worktree)

```
node docs/build.mjs docs/bill/plan-for-bill.md --out /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/docs-out --name bill-plan-in-plain-words --strict
/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-docs/bin/python docs/preview.py /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/docs-out/bill-plan-in-plain-words.pdf --cols 6
```

Result: 12 pages, 2 print passes, contents page with real page numbers, `warnings: []`; embedded fonts Newsreader and
Source Sans 3 only. Nothing was committed, pushed, sent or published.
