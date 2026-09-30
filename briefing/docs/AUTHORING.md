# Writing and printing a document

The print pipeline turns one Markdown file into a US Letter PDF in the house style: navy ink (#0E2233) on warm
paper (#FAF9F5), Newsreader headings, Source Sans 3 body, brass for small marks only, and the site's pen drawings as
static illustrations. It is for internal documents (the plan explained to Arnaud, the plan explained to Bill, the C01
capsule scripts). Nothing it prints is published by printing it.

```
docs/
  build.mjs              Markdown → HTML → PDF (headless Chromium via playwright-core 1.56.1)
  preview.py             PDF → one PNG per page + contact sheet + font check (PyMuPDF)
  capsule.schema.json    the capsule input format (JSON Schema)
  lib/markdown.mjs       Markdown extensions: blocks, heading attributes, status tags, French spacing
  lib/blocks.mjs         the blocks (callout, checklist, two-col, figure, table, sources, capsule …)
  lib/capsule.mjs        the capsule page
  lib/ink.mjs            the drawings from public/ink/ as inline SVG
  lib/lint.mjs           wording checks from the plan's hard rules
  theme/print.css        the house print style (page size, margins, running header/footer, every block)
  theme/page.js          runs before printing: crops drawings to their ink, fits capsules to the page
  samples/sample.md      four-page proof: cover, text page, table page, capsule page
  samples/blocks.md      specimen of every block and tag, with the Markdown that makes it (10 pages, contents)
  samples/capsules.sample.json   the capsule input format as JSON
```

## Commands

All commands run from the briefing package (`briefing/` in the repository; in this session
`/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/wt/briefing/briefing`).

```bash
npm ci                                            # once: installs playwright-core, markdown-it, yaml, pdf-lib (pinned)

# Build: writes <out>/<name>.pdf, <name>.html and <name>.report.json
node docs/build.mjs docs/samples/sample.md --out /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/docs-out
npm run docs -- docs/samples/sample.md --out <dir>  # the same through npm
#   --name <basename>  output file name (default: the Markdown file's name)
#   --html-only        stop after the HTML (no browser)
#   --strict           exit 1 if the build printed any warning
#   default --out is docs/out/ (git-ignored)

# Previews: one PNG per page + contact-sheet.png in <pdf folder>/previews/<pdf name>/
python3 -m venv /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-docs     # once
/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-docs/bin/pip install pymupdf  # once
/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-docs/bin/python docs/preview.py \
  /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/docs-out/sample.pdf
#   --dpi 110 (default)  --cols 4  --out <dir>
#   --zoom 2:1,5.7,3.2,1.2   render page 2, a 3.2 × 1.2 in box at (1 in, 5.7 in), at 300 dpi; repeatable
DOCS_PY=/path/to/venv/bin/python npm run docs:preview -- <file.pdf>   # the same through npm
```

The browser is `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell` (then
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`); set `DOCS_CHROMIUM` to use another. It needs Chromium 131 or
newer for the running header and footer (CSS page-margin boxes).

**Always read the previews before sending a PDF on.** Open the contact sheet, then every page at full size. The
preview script also lists the fonts embedded in the PDF: anything other than Newsreader and Source Sans 3 means a
character is missing from the bundled latin fonts and printed in a fallback face (for example `≈` or `→`; write
"about" or "to" instead). DejaVu Sans Mono is expected only where a page shows a code sample.

## The document

A document is a Markdown file that starts with front matter:

```yaml
---
title: The plan, explained                # required; cover and PDF title
short_title: The plan                     # running header (default: title)
subtitle: One sentence under the title
kicker: Internal briefing                 # small label at the top of the cover
audience: Bill Badran                     # cover "For" line
prepared_by: …                            # optional cover line (no credentials: G1 is pending)
date: 30 September 2026                   # default; French documents default to "30 septembre 2026"
status: Draft. Nothing deployed, sent, bought or published.
classification: Internal — not for publication   # default; cover box and running header
cover_drawing: crossroads-signpost        # one large drawing on the cover (optional)
cover_crop: ink                           # ink | full | x,y,w,h
cover_note: One or two sentences at the foot of the cover
brand: Bill Badran · retirement system    # small italic line at the foot of the cover
version: Draft 1                          # footer, after the date
lang: en                                  # en | fr (labels, quotes, French spacing)
toc: auto                                 # auto (contents page when the document runs over 8 pages) | true | false
toc_depth: 2                              # 1 = sections only
cover: true                               # false: no cover page
wpm: 150                                  # capsule duration estimates (words per minute)
capsule_pages: auto                       # auto | 1 | 2 (see Capsules)
lint_ok: []                               # wording checks to switch off for the whole file (rare)
---
```

Then ordinary Markdown: paragraphs, `*italic*`, `**bold**`, links, bulleted and numbered lists, block quotes (only
for exact excerpts of project files), GFM tables, and headings:

- `# Title` opens a **section** on a new page, numbered "Section 01", "Section 02" … Attributes at the end of the
  line: `# Title {drawing=road-markers}` adds a drawing to the opener, `{nonumber}` leaves it unnumbered,
  `{kicker="Part one"}` replaces the label, `{crop=full}` changes the drawing's crop.
- `## Heading` (Newsreader, listed in the contents), `### Heading` (small brass capitals), `#### Heading` (italic).

The cover, running header (short title, classification), footer (date · version, "Page n of N") and the contents
page (with real page numbers, found by printing twice) are generated.

## Blocks

A block opens with `:::` and a name, and closes with a line holding only `:::`. Blocks nest. A block with no body can
be written on one line: `::: pagebreak :::`. `samples/blocks.md` shows each one printed.

| Block | What it is | Options |
|---|---|---|
| `::: lede` | Opening paragraph of a section, set larger in Newsreader | — |
| `::: callout` | The one point on a page the reader must not miss (ivory ground, brass rule) | `title="…"`, `tone=note` (default) \| `rule` (navy rule, for hard rules) \| `plain` (outline) \| `quiet` (rule only) |
| `::: checklist` | A list whose items start `[x]` (ticked) or `[ ]` | `title="…"` |
| `::: two-col` | Two columns split by a line holding only `+++`; without `+++` the text flows across two balanced columns | `ratio=2/1`, `rule` (hairline between) |
| `::: figure` | A drawing, with the block's body as its caption | `name=` (required), `width=60%` or `3in`, `height=` (max, default 4.3 in), `align=center` \| `left` \| `right` (left/right float with text wrapping), `crop=ink` \| `full` \| `x,y,w,h`, `alt="…"`, `caption="…"` |
| `::: table` | Wraps a Markdown table | `title="…"`, `widths=30,40,30`, `first=strong`, `compact`, `note="Source: …"` |
| `::: sources` | Small source list with a rule above | `title="…"` (default "Sources") |
| `::: note` | Small muted text under a figure or table | — |
| `::: keep` | Keeps its contents on one page | — |
| `::: pagebreak :::` | New page | — |
| `::: capsule` | One capsule page, YAML body (see Capsules) | — |
| `::: capsules src=file.json :::` | Every capsule in a JSON or YAML file, path relative to the Markdown file | `only=S01,S04` |

A drawing can also be written as an image: `![Caption](ink:dock "align=right width=40%")`.

The drawings (`public/ink/`, provenance in `ASSETS.md`): two-chairs, path, sailboat, bridge, lighthouse, house,
travel-bag, dock (the site's), and workshop-notebook, crossroads-signpost, ledger-page, desk-clock, system-map,
road-markers (drawn for the briefing, 1440 × 810 frames with the drawing on the right; `crop=ink`, the default,
trims the empty part). They are printed as vector ink; the watercolour washes are rasterised by Chromium at print
resolution. No other images: no photo, portrait, voice or likeness of Bill (HB-22).

## Status tags

A status word in square brackets prints as a small mark that reads the same in every document:

| Tone | Looks like | Tags |
|---|---|---|
| done | navy words after a brass tick | `[done]` `[accepted]` `[exists]` `[fixed]` `[resolved]` `[verified]` `[fetched]` `[complete]` `[built]` `[in place]` `[recorded]` `[approved]` |
| open | muted italic in a dashed outline | `[to confirm]` `[pending]` `[draft]` `[in review]` `[reviewed]` `[proposed]` `[next]` `[planned]` `[not started]` `[not chosen]` `[to open]` `[to decide]` `[to write]` `[to record]` `[optional]` `[brief]` `[rehearsal]` |
| caution | brass italic in a thin brass box | `[unverified]` `[snippet-only]` `[example]` `[estimate]` `[assumption]` `[layout sample]` |
| stop | navy words in a ruled box | `[blocked]` `[not used]` `[must not ship]` `[quarantined]` `[not live]` `[do not publish]` `[internal]` `[not sent]` `[not bought]` `[not published]` |

Custom words: `[done: gate recorded]`, `[open: …]`, `[caution: …]`, `[stop: needs G1]`. Tags are never red and
never filled. Use `[approved]`/`[recorded]` only when the gate record or the recording exists; a snippet-only
figure always carries `[unverified]`. A bracketed word that is not a tag prints as plain text and the build warns.

## Capsules

Each capsule prints on one page when it fits: header (ID, EN title, FR title, status), a strip with the useful
point, the duration (target, and an estimate from the word count at `wpm`) and the call to action with its
destination, then the English and Quebec French scripts side by side, each followed by its on-screen text, then
shot/props/ink and the companion cut brief, then sources and the compliance note, and a status line (version,
owner, rights, review hash, "not recorded", "not published").

`theme/page.js` measures each capsule at the printed size. If it is too long it tries three slightly denser steps
(script type from 9.1 down to 8.45 pt). If it still does not fit, the capsule prints on **two pages**: page 1 holds
the two scripts at 10 pt for reading aloud; page 2 opens with "S0n · title · continued", then the on-screen text
and CTA wording for both languages, the production notes, sources and compliance. `capsule_pages: 2` in the front
matter prints every capsule that way (recommended for the C01 scripts PDF: 45–75-second scripts in two languages
rarely fit one page, and a uniform rhythm reads better); `capsule_pages: 1` never splits. The build report lists
each capsule's fit.

Write capsules either as YAML inside a Markdown document:

```markdown
::: capsule
id: S01
format: Main capsule · Instagram Reel
title:
  en: "“I have $800,000. Can I retire?”"
  fr: "« J’ai 800 000 $. Est-ce que je peux prendre ma retraite ? »"
angle: Show which spending and income facts are missing. Give no retirement verdict.
duration: 45–75 s                 # or {target: 45–75 s, measured: 58 s} after a read-through
status: draft                     # brief | draft | reviewed | recorded | edited | approved | published
version: 1
owner: A5
script:
  en: |
    First paragraph …

    *(Taps the notebook.)* Next paragraph …
  fr: |
    Premier paragraphe …
on_screen:
  - { at: 0–4 s, en: "$800,000. Can I retire?", fr: "800 000 $. Retraite possible ?" }
shot: A table, an open notebook … (hands only until consent exists, G4)
ink: workshop-notebook            # thumbnail beside the shot cue
cta:
  offer: guide-pdf                # guide-pdf | intro-15 | book-bundle | workshop | crossroads | share-with-partner | none
  en: optional caption/end-card wording, if it differs from the script's last line
  fr: …
  note: No approved edition of the guide exists yet (D-054, HB-04).
  destination: { route: resources, en: /en/retirement-guide, fr: /fr/guide-retraite }
companion:
  duration: 15–30 s
  format: One-question exercise
  brief: What the short cut does, in two or three sentences.
sources:
  - claim: what it supports
    title: page or file title
    url: https://…                # https only
    accessed: 2026-09-30
    method: fetched               # fetched | snippet-only (prints [unverified]) | project-file | pending
factual_claims: false             # when the script states nothing that needs a source
credential_claims: false          # true prints [needs G1]; designations/experience/firm are pending (G1)
compliance: What was checked, and what the capsule does not say.
rights: pending
review_hash: null
:::
```

or as a JSON (or YAML) file holding an array of the same objects, or `{"capsules": [...]}`, printed with
`::: capsules src=capsules.json :::`. `capsule.schema.json` is the full field reference (JSON Schema 2020-12);
`samples/capsules.sample.json` is an example. Markdown works in every text field, and FR fields are set with French
quotes and spacing.

The offer labels printed for `cta.offer` follow the frozen offer matrix: a free PDF guide; a free 15-minute
introduction about one question; a printed book **including one 30-minute consultation**; workshop and Crossroads
labelled as not live / only once scheduled.

## Checks the build makes

The build warns (and `--strict` fails) when it finds:

- a 60-minute or one-hour meeting (the book includes one 30-minute consultation, never 60);
- a professional claim about Bill (Pl.Fin., CIM, CFP, "financial planner", "independent", years of experience):
  pending G1, never stated as fact in new copy;
- "guarantee", "risk-free" and their French forms;
- an image that is not an ink drawing;
- a bracketed word that is not a status tag;
- capsule problems: an ID outside S01–S18, a missing language, status `approved`/`published`, an estimate outside
  45–75 s, no CTA or more than one, a missing companion brief, sources missing or without a method, a capsule that
  needs two pages (in `capsule_pages: auto`).

Where a document explains a rule rather than making the claim, add `<!-- ok: credentials -->` (or `sixty`,
`guarantee`, `photo`) on that line. The report (`<name>.report.json`) lists the page count, sections, capsule fits
and every warning.

## House rules for the words

Every number, price, approval or credential traces to a project file or a retrieved source, with its date and how
it was read (fetched, or snippet-only and marked `[unverified]`). Offers exactly as frozen. No photo, portrait,
voice or likeness of Bill. Accepted, draft or local is not live: say what exists and what does not. Reuse the
briefing's facts (`src/content.ts`, `CLAIMS.md`, `data/published-prices.json`) rather than re-deriving them.
