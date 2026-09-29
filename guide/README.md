# The pre-retirement guide

**Before retirement, your investments change jobs** / **Avant la retraite, vos placements changent de métier**

A 32-page printed guide (US Letter, designed as spreads) for people 5 to 15 years from retirement. It uses the website's palette, type, voice and ink toolkit. Every drawing is new and drawn in code with the same seeded `Pen` as the site, except the two chairs (ending) and the sailboat (back cover), which are the site's own.

```sh
npm run guide                              # both languages → guide/dist/
npm run guide -- en --png                  # English, plus a PNG of each page
npm run guide -- fr --pages 7-9            # only those pages, as PNGs (quick)
npm run guide -- --final                   # the approved edition (see below)
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` as for `scripts/ink-preview.tsx` if Chromium isn't in the default place. Output in `guide/dist/` (git-ignored):

| File                                               | What                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `bill-badran-before-retirement-guide-en.pdf`       | Screen edition: warm paper and a faint grain. For email, the website, an iPad |
| `bill-badran-before-retirement-guide-en-print.pdf` | Print edition: white paper, the same pages, for any printer                   |
| `bill-badran-before-retirement-guide-en.html`      | All pages as one HTML file, fonts embedded                                    |
| `…-guide-avant-la-retraite-fr…`                    | The same three files in French                                                |

The PDFs are about 1.3 MB each. Type and ink lines are vector. The watercolour washes use an SVG filter that a PDF can't hold, so the build photographs each drawing's washes once, on white, and places that JPEG under its ink with a multiply blend (`bakeWashes` in `build.tsx`). The images are then declared plain RGB (`untagImages`): Chromium tags them with an sRGB profile that pdfium, the PDF viewer in Chrome, applies to images but not to vector colour, which tinted the washes pink. Checked with pdfium and poppler against the browser rendering.

## Files

- `copy.ts`: every word, EN and FR, plus the official sources and the date they were checked (`checked`).
- `layout.tsx`: the 32 pages, each laid out on its own (816 × 1056 px, even pages on the left).
- `style.css`: page geometry, type and the few layout marks. The drawings use `app/ink.css`.
- `marks.tsx`: small hand-drawn layout marks (numeral rings, checkboxes, underline, card edges, paperclip).
- `art/kit.tsx`: the drawing kit. `Sketch` (from the site's vignettes), a pinhole and a tilted camera, water, treelines, spruce, birch, deciduous tree, loose foliage, figures.
- `art/*.tsx`: one file per drawing (below). Preview any of them with `scripts/ink-sheet.tsx`:

```sh
node --import tsx scripts/ink-sheet.tsx /tmp/sheet.png 2 1 guide/art/index.tsx:Porch:fr guide/art/index.tsx:Horizons:en
```

## The sequence

The metaphor runs through the whole guide: _your portfolio is changing jobs_. It moves from accumulation to use, told as walking down to the water (cover), sitting at the table (chapters 1, 2, 7), watching the weather (chapters 4, 9), and walking on (chapter 6).

| Page  | Content                                                                               | Drawing                                                                                          |
| ----- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1     | Cover                                                                                 | A couple walking down a path to a dock (`cover.tsx`)                                             |
| 2     | Bill's letter, contents                                                               |                                                                                                  |
| 3     | One thought: "How do I grow my money?" → "How does all of this become my retirement?" |                                                                                                  |
| 4–5   | Opening: the question is changing                                                     | One small table / ten subjects at one table, in plan (`plans.tsx`)                               |
| 6–7   | 1 · What is all this money for?                                                       | Notebook on a porch table by the lake (`porch.tsx`), full page                                   |
| 8–9   | 2 · What will retirement cost? + worksheet                                            | One year of spending laid out on the kitchen table (`spending.tsx`)                              |
| 10–11 | 3 · What arrives on its own                                                           | The gap changing over time, no amounts (`charts.tsx`)                                            |
| 12–13 | 4 · Your portfolio is changing jobs                                                   | Two job cards: the old job, the new one                                                          |
| 14–15 | 4 · Sequence of returns                                                               | One squall, two boats at different moments (`storm.tsx`); two hypothetical people (`charts.tsx`) |
| 16–17 | 5 · Risk is no longer one question                                                    | A canoe packed for the trip ahead (`harbour.tsx`)                                                |
| 18–19 | 6 · Not every dollar has the same timeline                                            | A path with three trail posts: soon, a few years, much later (`horizons.tsx`), full page         |
| 20–21 | 7 · Your accounts are not your plan                                                   | Five containers on a table (`containers.tsx`); the plan, one year at a time (`charts.tsx`)       |
| 22–23 | 8 · What fees are buying                                                              | One point a year over 25 years (`charts.tsx`), questions to ask                                  |
| 24–25 | 9 · When markets fall + worksheet                                                     | A sheltered cove, rough water beyond the point (`harbour.tsx`)                                   |
| 26    | 10 · Five years before retirement: the checklist to print                             |                                                                                                  |
| 27    | Your questions (one page, all of them)                                                |                                                                                                  |
| 28    | Ending: "You need the right questions."                                               | The site's two chairs                                                                            |
| 29    | Plan a first meeting: portrait, contact, booking link                                 |                                                                                                  |
| 30–31 | About this guide, sources, notes                                                      |                                                                                                  |
| 32    | Back cover                                                                            | The site's sailboat                                                                              |

## Facts and approvals

Every factual statement was checked against the official pages listed in `copy.ts` (`sources`) on 2026-09-29, and reviewed independently: QPP 60–72, CPP 60–70, OAS 65–70 and the recovery tax, the Statement of Participation, the RRSP at 71, RRIF minimums, TFSA withdrawals, pension splitting, and total cost reporting for 2026. No benefit amount, threshold, contribution limit or tax rate is quoted, so nothing expires each January. Still, re-check the list before each new edition and update `checked`.

The examples are hypothetical and labelled as such. The sequence panels use one invented series of 25 returns (`RETURNS` in `art/charts.tsx`), shown in both orders. The fee chart compares 5% and 4% a year over 25 years (about 21% less at the end). No return, portfolio, allocation, fee, credential, affiliation, testimonial or client story is claimed.

The default build is a **review draft**: the colophon says so, and lists what must be completed. `--final` refuses to build until `colophon.disclosure` is filled in, in both languages. Before distribution:

1. **Registration and firm disclosure.** Add Bill's registration category and his firm's required mention to `colophon.disclosure`, as approved by the firm's compliance department. The guide never says "planificateur financier / financial planner", Pl.Fin. or CIM, because those are pending (`docs/COPY-STRATEGY.md`, flags 1–3).
2. **"What Bill will do for you, and how he is paid, are explained before you commit to anything."** (chapter 8 and the meeting page). It's the site's line and needs Bill's confirmation (flag 13).
3. **Bill's voice.** The letter on page 2 is written in his first person and signed "Bill". He should read it and change what doesn't sound like him (flag 10).
4. **The first meeting.** Cost, length and format are still not stated, as on the site (flag 6).
5. **The portrait.** It uses `public/assets/bill-portrait.jpg`, which is still pending portrait-rights approval.

When approved, publish the PDFs through `business.guides` in `lib/business.ts` (the guide page already shows a download link once `approved` is true). Don't place unapproved PDFs in `public/`: anything there is reachable by URL.
