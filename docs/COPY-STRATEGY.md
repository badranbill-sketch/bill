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
8. **The one action.** Planifier une première rencontre / Plan a first meeting. It appears in the header, the hero, after the meeting steps, at the bottom of every inner page and in the contact block. The only other invitation is to read (the guide, the approach).
9. **Canadian terms only.** REER/RRSP, CELI/TFSA, FERR/RRIF, RRQ/QPP (and RPC/CPP), PSV/OAS, régime de retraite/pension plan, « impôt » (never « taxes » for income tax in French), « courriel ». No 401(k), IRA, Social Security or « 401k-style ». These terms only appear as small notes or in answers, never as a headline subject.
10. **Handwritten notes.** Bill's margin notes, one or two per page, never carrying information someone needs:

    | Note                                                        | Where                                                      |
    | ----------------------------------------------------------- | ---------------------------------------------------------- |
    | Famille, Voyages, Maison, Revenus, Retraite → Et après ?    | The notebook in the hero drawing                           |
    | Ce qui compte vraiment. / What really matters.              | Written over the lake in the dock drawing                  |
    | Des décisions qui se répondent. / Decisions that connect.   | Home questions; Retraite, "in what order"                  |
    | Une étape à la fois. / One step at a time.                  | On the wall in the two-chairs drawing (home, meeting page) |
    | Plus de clarté, moins de bruit. / More clarity, less noise. | Footer; fees section                                       |
    | Écouter d'abord. / Listen first.                            | About                                                      |

**Words we don't use:** solutions, sur mesure, accompagnement personnalisé, sérénité financière, tranquillité d'esprit, peace of mind, tailored, holistic, wealth, partner, expertise, passion, optimiser, maximiser, garanti (except in a disclaimer), « n'attendez plus », « dès aujourd'hui », « book now ».

**Never invent:** credentials, licences, registrations, firm or dealer affiliation, independence, fiduciary duty, returns, performance, client counts, assets under management, testimonials, awards, media mentions, fees, meeting length or cost, and tax or benefit figures not checked against a current official source.

---

## Stage 3: Information architecture

| Page           | FR URL                       | EN URL                         | Its one job                                                            |
| -------------- | ---------------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| Home           | `/fr`                        | `/en`                          | Recognise yourself, meet Bill, see the questions, book a first meeting |
| Retirement     | `/fr/planification-retraite` | `/en/retirement-planning`      | Answer the retirement questions in plain language                      |
| Investments    | `/fr/placements-retraite`    | `/en/investing-for-retirement` | Explain why a portfolio changes role at retirement                     |
| How it works   | `/fr/demarche`               | `/en/how-it-works`             | Make the first meeting feel easy and unthreatening                     |
| About          | `/fr/a-propos`               | `/en/about`                    | Why Bill works this way, then who he is, then credentials              |
| Guide          | `/fr/guide-retraite`         | `/en/retirement-guide`         | A five-question check-up, the fees illustration, articles              |
| Privacy, Legal |                              |                                | Plain notices                                                          |

**Navigation:** Retraite · Placements · La démarche · À propos · Guide (EN: Retirement · Investing · How it works · About · Guide), plus « Première rencontre » as the only button.

**Homepage order:**

1. Hero: who it's for, the promise, the action.
2. The mountain ride: four acts from saving to living, with Bill's optional English narration.
3. The open door: « Vous n'avez pas besoin de tout comprendre avant de venir. »
4. The questions.
5. A full-width drawing (the dock).
6. His way of working.
7. The first meeting.
8. The guide.
9. How to reach Bill.

---

## Stage 4: Page by page

**Home**

- _Visitor's intent:_ "Is this for someone like me, and is this person someone I'd talk to?"
- _Message:_ your money is one part of the story; Bill helps you see how savings, income and plans fit together.
- _Proof:_ his photo on the desk and the questions he actually works on.
- _Action:_ first meeting. Secondary: « Découvrir l'approche ».

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

| #   | Item                                                                                                                           | Where                                                                | Why it matters                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "Indépendant / independent"                                                                                                    | About (`lib/pages.ts`)                                               | A regulated claim if he is tied to one firm or dealer                                                                                         |
| 2   | Credentials shown: Pl.Fin., CIM®, B.A.A., mutual fund representative                                                           | About, home credibility line, hero line « planificateur financier »  | `approvals.qualificationsAndAffiliation` is still `false`. Pl.Fin. and « planificateur financier » are protected titles in Québec (IQPF/AMF). |
| 3   | Firm or dealer affiliation                                                                                                     | Not shown                                                            | Required disclosure                                                                                                                           |
| 4   | Insurance licence                                                                                                              | Insurance is named in scope                                          | Only say so if he holds one                                                                                                                   |
| 5   | "Plus de 15 ans / More than 15 years"                                                                                          | Home, About                                                          | Confirm the number                                                                                                                            |
| 6   | First meeting: cost, length, place, video                                                                                      | Meeting page, home                                                   | The main barrier for the persona                                                                                                              |
| 7   | QPP/CPP, OAS, RRIF, pension-splitting facts                                                                                    | Retirement page, guide articles                                      | Check against current Retraite Québec and Canada.ca pages. Figures change every year.                                                         |
| 8   | Laval or « Laval et Montréal »                                                                                                 | Eyebrow, SEO titles                                                  | Where he actually meets clients                                                                                                               |
| 9   | Testimonials                                                                                                                   | None                                                                 | Keep none unless compliant and approved                                                                                                       |
| 10  | His voice                                                                                                                      | The philosophy line, « Bill écoute d'abord… », the handwritten notes | Written for him, and needs his approval                                                                                                       |
| 11  | Photography                                                                                                                    | One portrait only                                                    | Wanted: at his desk, listening across a table, a candid moment                                                                                |
| 12  | Narration voice                                                                                                                | `public/audio/journey/en.mp3`                                        | A stand-in voice clone. Replace with Bill's own recording or remove before launch.                                                            |
| 13  | How Bill is paid: « Ce que Bill fera pour vous, et la façon dont il est rémunéré, vous sont expliqués avant tout engagement. » | Retirement page, meeting page                                        | Fees, commissions or trailers must be described exactly as they are. The line promises an explanation, not a fee agreement.                   |
| 14  | Ongoing reviews: « Le plan est revu quand c'est le cas », « des révisions quand les marchés ou votre vie changent »            | Home (step 3), meeting page                                          | A service promise. Keep only if Bill offers regular reviews.                                                                                  |
| 15  | Who he works with: 5–15 years from retirement, professionals, couples, business owners with a corporation                      | Hero line, About                                                     | `approvals.serviceScope` is still `false`.                                                                                                    |
