# Ask Bill · Demandez à Bill

_Real questions before retirement._ One recurring format for everything Bill publishes: every piece starts from a question a person near retirement actually asks, answers it in plain language, and ends with the same quiet next step. Copy strategy and word rules are in [COPY-STRATEGY.md](COPY-STRATEGY.md); art direction in [ART-DIRECTION.md](ART-DIRECTION.md).

**The rule:** the guide is not the star, and neither is the content. Bill is. Each piece shows how he thinks: what he looks at, what it depends on, and why it's worth talking through with him.

## Where the questions live

`lib/ask.ts` is the single list. Each question has:

| Field      | Use                                                                                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`      | Permanent id (English, kebab-case). Use it to name video files, emails and article briefs.                                                                                                                                                  |
| `anchor`   | Public URL fragment on the Ask Bill page, per language (`/fr/demandez-a-bill#…`, `/en/ask-bill#…`). Changing it breaks shared links; if you must, keep the old id on the same element as an alias (e.g. an empty `<span id="old-anchor">`). |
| `question` | As a real person would ask it. It is the title of every piece built on it.                                                                                                                                                                  |
| `teaser`   | One line, for a homepage card, a social caption or an email subject preview.                                                                                                                                                                |
| `answer`   | The short answer: general information, what it depends on. Never an instruction.                                                                                                                                                            |
| `points`   | "What Bill looks at with you": the checklist behind the answer.                                                                                                                                                                             |
| related    | The section of the Retirement or Investing page that goes further.                                                                                                                                                                          |

`ASK_GROUPS` orders the questions into chapters. The same chapters are the table of contents of the guide (« Avant la retraite » / "Before You Retire"), the sections of the Ask Bill page and the list on the homepage's guide section. `FEATURED` picks the six questions shown on the homepage.

The site uses them in three places:

1. **Homepage:** six featured questions with their teasers, a link to all of them, and an email link for a visitor's own question.
2. **Ask Bill page** (`/fr/demandez-a-bill`, `/en/ask-bill`): every question with its short answer, grouped by chapter, each with a link to the longer section. After public launch it also carries FAQ structured data.
3. **Guide page** (`/fr/guide-retraite`, `/en/retirement-guide`): the booklet's cover, its chapters with their questions, the five-question check-up and the articles.

## One question, every format

Each format keeps the same spine: **the question → the short answer → what it depends on → what Bill looks at with you → a first conversation.**

| Format                 | Length                                  | Built from                                                                                                                                            | Ends with                                                           |
| ---------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Video (Bill on camera) | 60–120 s                                | `question` as the first line, `answer` in his words, 2–3 `points`                                                                                     | "If that's your question too, come and talk about where you stand." |
| Article (guide page)   | 600–1,200 words                         | `content/*.md` through the existing review workflow ([CONTENT-WORKFLOW.md](CONTENT-WORKFLOW.md))                                                      | The related Ask Bill question and a first meeting                   |
| SEO page               | the article, titled with the `question` | same article; the question is the H1                                                                                                                  | same                                                                |
| Email                  | 150–250 words                           | `teaser` as preview, `answer` expanded, one `point` in depth. Sent only to people who opted in (CASL): sender named, postal address, unsubscribe link | One link: the Ask Bill answer or a first meeting                    |
| Guide chapter          | 1–2 printed pages per question          | `answer` + `points`, set with lots of white space                                                                                                     | "Questions to bring to Bill" in the margin                          |
| Social post            | 1–3 lines                               | `question` + `teaser`                                                                                                                                 | Link to the Ask Bill anchor                                         |

The French is written first, in natural Québec French, and the English as an equivalent, never a word-for-word translation.

## Adding a question

1. Add the key to `ASK_KEYS`, its text in both languages and its `RELATED` section in `lib/ask.ts`, and put it in a chapter in `ASK_GROUPS`.
2. Keep the answer between 45 and 90 words, general, and free of figures that aren't on the site already or checked against a current official source (Retraite Québec, Canada.ca).
3. Run `npm run test`: it checks that every question exists in both languages, sits in exactly one chapter, has a unique anchor, links to a section that exists, and avoids the words ruled out in COPY-STRATEGY.md.
4. Bill approves the wording (it is website copy: `approvals.websiteCopy`).
5. Before anything is published (website, video, email or social), the dealer's compliance review approves it, and the approval is kept on file.

## Compliance guardrails

- Answers are general information. They explain what matters and what it depends on; they never tell the reader what to do, and never promise a result.
- No returns, performance, product names, fees, guarantees or testimonials.
- Never disparage another advisor, bank or product ("I already have an advisor" is answered as a second look, not a criticism).
- Benefit ages and rules must match `lib/pages.ts` and a current official source; figures change every year.
- Don't ask for account numbers or statements by email: every "send your question" link says so.
