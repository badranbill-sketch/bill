---
title: The print pipeline, in four pages
short_title: Print pipeline sample
subtitle: A cover, a text page, a table page and a capsule page, set in the house style to prove the build.
kicker: Internal briefing · print sample
audience: Arnaud Verdier, operator
date: 30 September 2026
status: Layout sample. Nothing deployed, sent, bought or published.
cover_drawing: workshop-notebook
cover_note: Internal working document. Amounts are list prices recorded on 30 September 2026, not quotes; nothing has been bought.
brand: Bill Badran · retirement system
version: Sample v1
toc: false
---

# How these documents are made {drawing=ledger-page}

::: lede
Every internal document in this project is written as plain Markdown and printed by one script, so the words, the sources and the status of each claim live in a file anyone can check.
:::

![One of the six drawings made for the briefing: a footpath forks, and a signpost with two blank arms stands in the fork.](ink:crossroads-signpost "align=right width=44%")

The script turns the Markdown into pages in the house style: navy ink on warm paper, Newsreader for headings, Source Sans 3 for reading, and the site's pen drawings as illustrations. It prints them to US Letter with headless Chromium. The running header, page numbers and, for longer documents, the contents page are added by the build.

Status is part of the text, not a colour code. A line can be marked [done], [to confirm], [unverified] or [blocked], and it prints the same way in every document: a brass tick for what is done, a dashed outline for what is still open, a brass box for a figure nobody could verify, a ruled box for what must stop.

::: callout tone=rule title="Rules every document follows"
- No number, price, approval or credential unless it traces to a project file or a retrieved source, with its date and how it was read.
- Offers exactly as frozen: a free PDF guide; a free 15-minute introduction about one question; a paid printed book including one 30-minute consultation; continued work only on mutual fit.
- No photo, portrait, voice or likeness of Bill. Ink drawings only.
- Nothing described here is live. Nothing has been deployed, sent, bought or published.
:::

The same build prints the plan explained for Arnaud, the plan explained for Bill, and the eighteen capsule scripts, one capsule to a page. `docs/AUTHORING.md` lists the blocks and the exact commands.

# What is offered, and what could cost money

::: table title="The four offers, as frozen" widths=24,36,14,26 first=strong note="Source: .orchestration/contracts/offer-matrix.md §1 (proposed, submitted, not accepted). Gated values stay empty until a human gate is recorded."
| Offer | What the person receives | Price | Status |
|---|---|---|---|
| Free PDF guide | The approved retirement guide, as a PDF | Free | [pending] no approved edition yet (D-054, HB-04) |
| Free introduction | 15 minutes about one question, online or in person | Free | [to confirm] modalities and weekly capacity (G0) |
| Printed book | A printed book including one 30-minute consultation | Paid | [to decide] the price: none exists or is proposed (G0, HB-20) |
| Continued work | Scope, fees and next steps, only if the fit is mutual | Not stated | [done] no mandatory path |
:::

::: table title="Costs that start only if a trigger is reached" widths=25,27,27,21 note="List prices, not quotes; taxes (GST/QST) excluded. An unverified figure is a search-result summary of a page that could not be opened: confirm it at checkout. Spend to date: $0."
| Item | Needed when | List price, as recorded | Source |
|---|---|---|---|
| Google Workspace Business Standard | Bill's existing Google account falls short (HB-14) | USD 14.00 annual / 16.80 flexible, per user per month | workspace.google.com/pricing [unverified] |
| Supabase Pro | free limits or backups fall short | From $25 per month + usage (USD) | supabase.com/pricing, via the vendor's pricing source file [fetched] |
| Brevo Starter | daily email nears the free 300 | From USD 9 per month | brevo.com/pricing [unverified] |
| Stripe fee per book, Canadian card | a book is sold | 2.9% + CA$0.30 per successful card charge | stripe.com/en-ca/pricing [unverified] |
| Printing and shipping per book | the book exists | Quote needed (HB-20) | [to confirm] |
:::

::: sources
- Prices: `briefing/data/published-prices.json`, items gws-standard-usd, brevo-starter, stripe-ca-domestic [snippet-only] and supabase-pro [fetched], retrieved 30 September 2026.
:::

::: capsule
id: S01
sample: true
format: Main capsule · Instagram Reel
title:
  en: "“I have $800,000. Can I retire?”"
  fr: "« J’ai 800 000 $. Est-ce que je peux prendre ma retraite ? »"
angle: Show which spending and income facts are missing. Give no retirement verdict.
duration: 45–75 s
status: draft
version: 1
owner: A1 (layout sample for C01)
script:
  en: |
    “I have $800,000. Can I retire?” It’s a fair question. But on its own, that number can’t answer it.

    Two things are missing. First: what you plan to spend each year, for the ordinary life you actually want. Second: the income that will arrive anyway, like a pension or government benefits, and when each one starts.

    Put those side by side and the question changes. It stops being “is $800,000 enough?” and becomes “how much of my spending does my savings need to cover, and for how long?”

    *(Taps the notebook.)* That’s a question you can work on. Start with one page: your yearly spending, your income sources, and their start dates.

    The free guide walks through that page, step by step. The link is in the bio.
  fr: |
    « J’ai 800 000 $. Est-ce que je peux prendre ma retraite ? » C’est une bonne question. Mais ce chiffre-là, tout seul, ne peut pas y répondre.

    Il manque deux choses. D’abord, combien vous prévoyez dépenser par année, pour la vie que vous voulez vraiment. Ensuite, les revenus qui vont rentrer de toute façon, comme une rente ou les prestations du gouvernement, et le moment où chacun commence.

    Mettez les deux côte à côte, et la question change. Ce n’est plus « est-ce que 800 000 $, c’est assez ? », mais « quelle part de mes dépenses mon épargne doit-elle couvrir, et pendant combien de temps ? »

    *(Montre le carnet.)* Ça, c’est une question sur laquelle on peut travailler. Commencez par une page : vos dépenses annuelles, vos sources de revenus et leurs dates de début.

    Le guide gratuit vous accompagne dans cette page, étape par étape. Le lien est dans la bio.
on_screen:
  - at: 0–4 s
    en: $800,000. Can I retire?
    fr: 800 000 $. Retraite possible ?
  - at: 8–22 s
    en: 1 · Yearly spending  2 · Income that arrives anyway
    fr: 1 · Dépenses annuelles  2 · Revenus qui rentrent de toute façon
  - at: 25–38 s
    en: How much must savings cover, and for how long?
    fr: Quelle part l’épargne doit-elle couvrir, et combien de temps ?
  - at: end
    en: Free guide · link in bio
    fr: Guide gratuit · lien dans la bio
shot: |
  A table, an open notebook, one number written on the page. Hands and notebook only until recording consent exists (G4). End card: the *workshop-notebook* drawing, no text in the art.
ink: workshop-notebook
cta:
  offer: guide-pdf
  note: No approved edition of the guide exists yet (D-054, HB-04). Do not publish before one does.
  destination:
    route: resources
    en: /en/retirement-guide
    fr: /fr/guide-retraite
companion:
  duration: 15–30 s
  format: One-question exercise
  brief: |
    The viewer writes down one number tonight: what an ordinary month would cost in retirement. On screen, the question only; nothing withheld to force a click. Ends on the same guide link.
sources:
  - claim: Opening question and useful point
    title: 05_CONTENT_AND_ART_BRIEFS.md §2, row S01
    method: project-file
    accessed: 2026-09-30
  - claim: The guide is free; no approved edition yet
    title: contracts/offer-matrix.md §1
    method: project-file
    accessed: 2026-09-30
factual_claims: false
compliance: |
  No verdict on anyone’s retirement; no rates, returns, rules or benefit amounts stated. The $800,000 is a hypothetical opening line, not a client. No credential claims. One CTA, the free guide; nothing is sold.
rights: created for project (script); recording needs G4
review_hash: null
:::
