# Copy strategy

The reasoning behind the words on the site, in both languages, as of 2026-09-28 (after the ink overhaul). The copy itself lives in `lib/copy.ts` (shared strings), `lib/pages.ts` (inner pages), `lib/journey.ts` (the mountain ride) and `content/*.md` (guide articles). Art direction is in [ART-DIRECTION.md](ART-DIRECTION.md).

**The one rule:** say more with less. Every sentence should either answer a question a person near retirement actually has, or make it easier to sit down with Bill. Everything else goes.

---

## Stage 1: Audit of the previous copy

The earlier site was careful and legally clean, but it spoke like an institution describing itself rather than a person talking to someone.

| Problem                                    | Before                                                                                                      | After                                                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Abstract promise in the hero               | « Transformons votre épargne en plan de revenu. »                                                           | « Votre retraite approche. Voyons plus clair pour la suite. »                                                           |
| The reader wasn't named                    | « Une conversation, en français ou en anglais. »                                                            | « Bill Badran, planificateur financier à Laval, travaille avec les gens qui prendront leur retraite d'ici 5 à 15 ans. » |
| A slogan instead of the reader's questions | « Prendre le temps de comprendre, préparer et choisir. » (with animated words)                              | Six real questions, each with a one-line answer: « Quand pourrai-je prendre ma retraite, confortablement? »             |
| Services named like product categories     | « Planification de la retraite », « Approche de placement », « Revenu de retraite »                         | Merged into the questions. The services are what Bill does about them.                                                  |
| Soft verbs that say nothing                | « mettre en perspective », « éclairer les décisions », « nourrir la réflexion »                             | Concrete nouns: dépenses, rentes, FERR, impôts, conjoint.                                                               |
| One word doing every job                   | « conversation » eight times on the homepage                                                                | « rencontre » for the meeting, used where the action is.                                                                |
| The first step looked like a commitment    | « voir si l'accompagnement proposé correspond à vos besoins »                                               | « Vous n'avez pas besoin de tout comprendre avant de venir. » Said once per page.                                       |
| Page titles about the firm                 | « Bill Badran. Un interlocuteur pour la suite. »                                                            | About opens with his philosophy: « Les chiffres sont importants. Mais ce sont vos projets qui leur donnent un sens. »   |
| Four different labels for one action       | « Planifier… », « Comment se déroule la rencontre? », « La prochaine étape commence par une conversation. » | One action everywhere: **Planifier une première rencontre / Plan a first meeting.**                                     |

Also removed:

- the French narration track and the word animations;
- « Ressources » as a nav label. It is now « Guide », which says what it is.

---

## Stage 2: Positioning

1. **Who it's for.** People 5 to 15 years from retirement, roughly 50 to 65, in Laval and around Montréal, in French or English. Usually a couple. Usually with accounts at more than one institution.
2. **Their situation.** Thirty years of saving produced RRSPs, TFSAs, a pension, maybe a house and a non-registered account, each opened for a different reason. None of it was designed to pay an income.
3. **What they want.** To know when they can stop, what they can spend, and what happens if markets or health turn. Not a product. Not a return.
4. **What Bill offers.** Clarity. He looks at income, investments, taxes, insurance and estate together, because in retirement they move together.
5. **How he's different.** He listens first. The plans come before the numbers: « Les chiffres sont importants. Mais ce sont vos projets qui leur donnent un sens. »
6. **What we can prove.** His real face, his name, his office address, both languages, and the AMF register link. The years of experience and the credentials are pending his confirmation (see Flags). Nothing else is claimed.
7. **The voice.** Spoken. Short sentences. « Vous », never « nos clients ». Bill in the third person on the site, with a few handwritten notes in his own voice. No exclamation marks, no urgency, no superlatives.
8. **The one action.** « Faire le point avec Bill » / "Let's talk about where you stand" (since 2026-09-29; before, « Planifier une première rencontre / Plan a first meeting »). It invites a first conversation about where you stand, not a product or an "assessment". It appears in the hero, after the meeting steps, at the end of the mountain ride, at the bottom of every inner page and in the contact block; the header button says « Rencontrer Bill » / "Meet Bill". The only other invitations are to read (Ask Bill, the guide, how a first meeting works) or to send Bill a question by email.
9. **Canadian terms only.** REER/RRSP, CELI/TFSA, FERR/RRIF, RRQ/QPP (and RPC/CPP), PSV/OAS, régime de retraite/pension plan, « impôt » (never « taxes » for income tax in French), « courriel ». No 401(k), IRA, Social Security or « 401k-style ». These terms only appear as small notes or in answers, never as a headline subject.
10. **Handwritten notes.** Bill's margin notes, one or two per page, never carrying information someone needs:

    | Note                                                                                    | Where                                                      |
    | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
    | Famille, Voyages, Maison, Revenus, Retraite → Et après ?                                | The notebook in the hero drawing                           |
    | Vos questions d'abord, les chiffres ensuite. / Your questions first. The numbers after. | Beside Bill's print in the hero                            |
    | Bonjour, moi c'est Bill. / Hi, I'm Bill.                                                | On Bill's print (hero, first-meeting page)                 |
    | Aucune question n'est trop simple. / No question is too simple.                         | Home, Ask Bill                                             |
    | Des décisions qui se répondent. / Decisions that connect.                               | Home questions; Retraite, "in what order"                  |
    | Une étape à la fois. / One step at a time.                                              | On the wall in the two-chairs drawing (home, meeting page) |
    | Plus de clarté, moins de bruit. / More clarity, less noise.                             | Footer; fees section                                       |
    | Écouter d'abord. / Listen first.                                                        | About                                                      |

**Words we don't use:** solutions, sur mesure, accompagnement personnalisé, sérénité financière, tranquillité d'esprit, peace of mind, tailored, holistic, wealth, partner, expertise, passion, optimiser, maximiser, garanti (except in a disclaimer), « n'attendez plus », « dès aujourd'hui », « book now ».

**Never invent:** credentials, licences, registrations, firm or dealer affiliation, independence, fiduciary duty, returns, performance, client counts, assets under management, testimonials, awards, media mentions, fees, meeting length or cost, and tax or benefit figures not checked against a current official source.

---

## Stage 3: Information architecture

| Page           | FR URL                       | EN URL                         | Its one job                                                                                    |
| -------------- | ---------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Home           | `/fr`                        | `/en`                          | Meet Bill, recognise your questions, see how he works, book a first meeting                    |
| Retirement     | `/fr/planification-retraite` | `/en/retirement-planning`      | Answer the retirement questions in plain language                                              |
| Investments    | `/fr/placements-retraite`    | `/en/investing-for-retirement` | Explain why a portfolio changes role at retirement                                             |
| How it works   | `/fr/demarche`               | `/en/how-it-works`             | Make the first meeting feel easy and unthreatening                                             |
| About          | `/fr/a-propos`               | `/en/about`                    | Why Bill works this way, then who he is, then credentials                                      |
| Ask Bill       | `/fr/demandez-a-bill`        | `/en/ask-bill`                 | Twelve real questions, a short answer each, grouped in chapters                                |
| Guide          | `/fr/guide-retraite`         | `/en/retirement-guide`         | « Avant la retraite » / "Before You Retire": the booklet, its chapters, the check-up, articles |
| Privacy, Legal |                              |                                | Plain notices                                                                                  |

**Navigation:** Retraite · Placements · Demandez à Bill · À propos · Le guide (EN: Retirement · Investing · Ask Bill · About · The guide), plus « Rencontrer Bill » / "Meet Bill" as the only button. The first-meeting page (« Première rencontre » / "First meeting") is reached from every call to action and the footer.

**Homepage order** (2026-09-29, "Bill at the centre"):

1. Hero: Bill's print, large, on the notebook of questions; who he is and who he helps; the anxiety in the visitor's own words; the one action.
2. Why Bill: how he works, in four specific points, with his experience and a link to About.
3. Ask Bill: six featured questions with one-line answers, a link to all twelve and a way to send your own.
4. The guide: the booklet, its chapters, read it, bring your questions to a first meeting.
5. The open door: « Vous n'avez pas besoin de tout comprendre avant de venir. »
6. The first meeting: three steps and the action.
7. The mountain ride, as a short epilogue (each act about two thirds of a screen): saving to living, and a path that is easier with someone who knows it.
8. How to reach Bill.

Content, then the guide, then the first meeting: the ride no longer stands between the questions and the meeting.

The guide proves how Bill thinks; Bill stays the star. The questions (`lib/ask.ts`) are one list used by the homepage, the Ask Bill page and the guide's chapters: see [ASK-BILL.md](ASK-BILL.md).

---

## Stage 4: Page by page

**Home**

- _Visitor's intent:_ "Is this for someone like me, and is this person someone I'd talk to?"
- _Message:_ you've worked and saved, and you'd like to know where you stand; you don't have to work it out alone, and Bill helps you see the whole picture.
- _Proof:_ his face first and large, his name in the first line, four specific ways he works, the questions he actually answers, his guide.
- _Action:_ first meeting. Secondary: how a first meeting works; read the questions; read the guide.

**Retirement planning**

- _Intent:_ "When can I retire, and what do I need to decide first?"
- _Message:_ ten questions answered in two or three sentences each, in the order they come up.
- _Tone:_ the answer first, the jargon after.
- _Action:_ first meeting.

**Investments**

- _Intent:_ "Should my investments change as I get close?"
- _Message:_ « Votre portefeuille s'apprête à changer de rôle. » Before retirement it grows; after, it pays you. Risk, cash, diversification and fees seen through that change.
- _Constraint:_ no performance, no product names, no promises.

**How it works (the first meeting)**

- _Intent:_ "What happens if I call? Will I be sold something?"
- _Message:_ « Une première rencontre, simplement. » You don't need documents or answers, and Bill listens first.
- _Open:_ length, cost and location of the meeting (see Flags).

**About**

- _Intent:_ "Who is he, and can I trust him?"
- _Order:_ philosophy, then how he works and who he works with, then credentials with the AMF register link.
- _Constraint:_ everything in the credentials section waits for his confirmation.

**Ask Bill**

- _Intent:_ "Is my question a normal one? What does it depend on?"
- _Message:_ real questions before retirement, each with a short, general answer, what Bill looks at with you, and where to read more. Your own question can go to Bill by email, without account numbers or statements.
- _Constraint:_ general information only; never an instruction, a figure that isn't on the site already, or a word about other advisors.

**Guide**

- _Intent:_ "I'm not ready to talk yet. Can I figure some of this out myself?"
- _Message:_ answers before you need them. A five-question check-up that stays on the page, a fees illustration with no forecast, and articles marked as drafts until approved.

**Contact block**

- _Message:_ « Pour joindre Bill. » A few lines are enough. Phone, email and office. The form only appears once it is switched on; a disabled form is never shown.

---

## Stage 5: Persona critique

**Sylvie, 58, Ahuntsic.** Nurse in the public system with a defined-benefit pension. Her husband is 61 and self-employed, with RRSPs at two banks and a TFSA they never really used. Their daughter has just had a baby. They'd like to travel while they still can. Sylvie found the site on her phone one evening after a colleague mentioned retiring at 60.

**What lands**

- « Votre retraite approche. » is her sentence. She keeps reading.
- The desk and notebook (Famille, Voyages, Maison, Revenus, Retraite) looks like her kitchen table, not a bank.
- The questions are the ones she and her husband argue about. « Qu'arrive-t-il à mon conjoint » matters: he's older and self-employed.
- « Vous n'avez pas besoin de tout comprendre avant de venir » (homepage) and « Rien n'est obligatoire » (first-meeting page) remove her main reason not to call. Each page says it once.
- The real photo. She would want to see his face before calling anyone.

**What she questions, and what we did**

| Her reaction                                          | Response                                                                                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Is it free? How long is it?"                         | Not stated because we don't know. **Flag.** This is the most likely reason she doesn't book.                                                                                |
| "Laval? I'm in Ahuntsic. Can we do it by video?"      | Not stated. **Flag.** Twenty minutes by car, but she will wonder.                                                                                                           |
| "Who does he work for? Is he going to sell me funds?" | The About page says « indépendant » and lists a mutual fund representative registration. Both need confirmation, and the affiliation must be named before launch. **Flag.** |
| "RRQ ou RPC, FERR, récupération de la PSV?"           | She knows REER, CELI and RRQ. FERR and PSV clawback are only on the second line, under a plain question. That signals competence without asking her to know it. Kept.       |
| "The ride is pretty, but what's this?"                | Four short acts she can read without sound. The narration is in English only and optional.                                                                                  |
| "Is the checklist sending my answers somewhere?"      | It says in plain words that nothing is sent or saved.                                                                                                                       |

**Verdict.** She'd call if the cost and format of the first meeting were stated. Every other question is answered or deliberately left to the meeting.

---

## Flags: to confirm with Bill before launch

| #   | Item                                                                                                                                                                                                                             | Where                                                                | Why it matters                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "Indépendant / independent"                                                                                                                                                                                                      | About (`lib/pages.ts`)                                               | A regulated claim if he is tied to one firm or dealer                                                                                                                                                                                    |
| 2   | Credentials shown: Pl.Fin., CIM®, B.A.A., mutual fund representative                                                                                                                                                             | About, home credibility line, hero line « planificateur financier »  | `approvals.qualificationsAndAffiliation` is still `false`. Pl.Fin. and « planificateur financier » are protected titles in Québec (IQPF/AMF).                                                                                            |
| 3   | Firm or dealer affiliation                                                                                                                                                                                                       | Not shown                                                            | Required disclosure                                                                                                                                                                                                                      |
| 4   | Insurance licence                                                                                                                                                                                                                | Insurance is named in scope                                          | Only say so if he holds one                                                                                                                                                                                                              |
| 5   | "Plus de 15 ans / More than 15 years"                                                                                                                                                                                            | Home, About                                                          | Confirm the number                                                                                                                                                                                                                       |
| 6   | First meeting: cost, length, place, video                                                                                                                                                                                        | Meeting page, home                                                   | The main barrier for the persona                                                                                                                                                                                                         |
| 7   | QPP/CPP, OAS, RRIF, pension-splitting facts                                                                                                                                                                                      | Retirement page, guide articles                                      | Check against current Retraite Québec and Canada.ca pages. Figures change every year.                                                                                                                                                    |
| 8   | Laval or « Laval et Montréal »                                                                                                                                                                                                   | Eyebrow, SEO titles                                                  | Where he actually meets clients                                                                                                                                                                                                          |
| 9   | Testimonials                                                                                                                                                                                                                     | None                                                                 | Keep none unless compliant and approved                                                                                                                                                                                                  |
| 10  | His voice                                                                                                                                                                                                                        | The philosophy line, « Bill écoute d'abord… », the handwritten notes | Written for him, and needs his approval                                                                                                                                                                                                  |
| 11  | Photography                                                                                                                                                                                                                      | One portrait only                                                    | Wanted: at his desk, listening across a table, a candid moment                                                                                                                                                                           |
| 12  | Narration voice                                                                                                                                                                                                                  | `public/audio/journey/en.mp3`                                        | A stand-in voice clone. Replace with Bill's own recording or remove before launch.                                                                                                                                                       |
| 13  | How Bill is paid: « Ce que Bill fera pour vous, et la façon dont il est rémunéré, vous sont expliqués avant tout engagement. »                                                                                                   | Retirement page, meeting page                                        | Fees, commissions or trailers must be described exactly as they are. The line promises an explanation, not a fee agreement.                                                                                                              |
| 14  | Ongoing reviews: « Le plan peut alors être revu avec vous », « des révisions quand les marchés ou votre vie changent »                                                                                                           | Home (step 3), meeting page                                          | A service promise. Keep only if Bill offers regular reviews.                                                                                                                                                                             |
| 15  | Who he works with: 5–15 years from retirement, professionals, couples, business owners with a corporation                                                                                                                        | Hero line, About                                                     | `approvals.serviceScope` is still `false`.                                                                                                                                                                                               |
| 16  | "Independent practice" / « Une pratique indépendante » and "most people don't need one more product"                                                                                                                             | Home, Why Bill                                                       | Same claim as #1, now on the homepage, next to the pay disclosure (#13). Confirm it matches how Bill is paid.                                                                                                                            |
| 17  | "Someone to call when life changes … Bill keeps the whole picture in view"                                                                                                                                                       | Home, Why Bill point 4                                               | Implies availability over time. Keep only if it matches how Bill works with clients.                                                                                                                                                     |
| 18  | Ask Bill: twelve questions and short answers, in Bill's name                                                                                                                                                                     | Home, Ask Bill page, guide (`lib/ask.ts`)                            | General information to approve, with the dealer's compliance review before publication in any format. The copy says people "really ask" these questions; once Bill confirms they come from his own conversations, it can say "ask Bill". |
| 19  | "Send your question to Bill" by email                                                                                                                                                                                            | Home, Ask Bill page                                                  | Confirm the inbox and who replies. Never publish a question without explicit consent; the privacy notice (Law 25) must cover these emails.                                                                                               |
| 20  | The guide « Avant la retraite » / "Before You Retire": title, five chapters, the check-up                                                                                                                                        | Home, guide page, `components/booklet.tsx`                           | A PDF or printed copies appear only once they exist (`business.guide`).                                                                                                                                                                  |
| 21  | Bill's voice: "Hi, I'm Bill", "Your questions first. The numbers after.", "No question is too simple.", the ride's "with someone who knows it"                                                                                   | Hero, Ask Bill, ride act IV                                          | Written for him; needs his approval.                                                                                                                                                                                                     |
| 22  | Benefit and tax facts in the Ask Bill answers (QPP 60–72 and smaller before 65, OAS from 65, RRSP to RRIF by 71, TFSA withdrawals not taxable, OAS recovery tax, pension splitting, survivor benefits, Québec beneficiary rules) | `lib/ask.ts`                                                         | Check against current Retraite Québec, Revenu Québec and Canada.ca pages before launch.                                                                                                                                                  |
