---
title: Blocks and tags, a specimen
short_title: Blocks and tags
subtitle: Every block the print build understands, each shown as the Markdown a writer types and the page it prints.
kicker: Internal briefing · writer’s reference
audience: Whoever writes a document for this project
date: 30 September 2026
status: Reference. Internal working document.
cover_drawing: two-chairs
cover_note: Companion to docs/AUTHORING.md, which has the commands, the front matter and the capsule input format.
brand: Bill Badran · retirement system
version: Specimen v1
toc: true
---

# Running text {drawing=workshop-notebook}

::: lede
A lede is the opening paragraph of a section, set larger in the heading face. Use one per section at most.
:::

```markdown
::: lede
A lede is the opening paragraph of a section …
:::
```

Ordinary paragraphs are set in Source Sans 3 at 10.5 points, ragged right, with a measure of about 75 characters. Figures, tables and callouts may run the full width of the text block. *Italic* and **bold** work as usual; a [link](https://example.org) prints underlined in brass.

## A second-level heading

Second-level headings are set in Newsreader and appear in the contents page.

### A third-level heading

Third-level headings are small capitals in brass: use them to label a short run of paragraphs.

#### A fourth-level heading

Fourth-level headings are italic, for an aside inside a subsection.

- A bulleted list takes a brass bullet.
- Lists can nest:
  - a second level;
  - and another item.
- Keep list items short.

1. Numbered lists take italic brass numerals.
2. A numbered list is for steps that happen in order.

> A block quote is for an excerpt of a project file, quoted exactly and attributed underneath. Never for an invented quotation.

# Status tags

A status tag is a word in square brackets. It prints as a small mark that reads the same in every document.

::: table title="The tags" widths=18,32,50 compact
| Tone | Type this | Prints as |
|---|---|---|
| Done | `[done]` `[accepted]` `[exists]` `[fixed]` `[resolved]` `[verified]` `[fetched]` `[complete]` `[built]` `[in place]` `[recorded]` `[approved]` | [done] [accepted] [fetched] [approved] |
| Open | `[to confirm]` `[pending]` `[draft]` `[in review]` `[reviewed]` `[proposed]` `[next]` `[planned]` `[not started]` `[not chosen]` `[to open]` `[to decide]` `[to write]` `[to record]` `[optional]` `[brief]` `[rehearsal]` | [to confirm] [pending] [draft] [rehearsal] |
| Caution | `[unverified]` `[snippet-only]` `[example]` `[estimate]` `[assumption]` `[layout sample]` | [unverified] [example] [estimate] |
| Stop | `[blocked]` `[not used]` `[must not ship]` `[quarantined]` `[not live]` `[do not publish]` `[internal]` `[not sent]` `[not bought]` `[not published]` | [blocked] [not live] [must not ship] |
| Custom | `[done: any words]` `[open: …]` `[caution: …]` `[stop: …]` | [done: gate recorded] [stop: needs G1] |
:::

Use `[approved]` or `[recorded]` only when the human gate or the recording actually exists. A snippet-only figure always carries `[unverified]`. A bracketed word that is not a tag prints as plain text, and the build warns about it, so a typo such as `[to-confirm]` is caught.

# Blocks

Every block opens with three colons and a name, and closes with a line of three colons. Blocks can nest.

## Callout

```markdown
::: callout title="What this means" tone=note
Two or three sentences that the reader should not miss.
:::
```

::: callout title="What this means"
The default callout: an ivory ground with a brass rule. Use it for the one point on a page that the reader should not miss.
:::

::: callout title="Hard rule" tone=rule
`tone=rule` draws the rule in navy, for a rule that must be followed.
:::

::: callout title="Plain" tone=plain
`tone=plain` has an outline instead of a ground.
:::

::: callout tone=quiet
`tone=quiet` is just a thin brass rule, for a short aside.
:::

## Checklist

```markdown
::: checklist title="Before a document leaves the build"
- [x] Built with the build command
- [ ] Every page preview read
:::
```

::: checklist title="Before a document leaves the build"
- [x] Built with `node docs/build.mjs`, no warnings left unexplained
- [ ] Every page preview read, including the contact sheet
- [ ] Every figure traced to a project file or a retrieved source [to confirm]
- [ ] Status tags checked against `.orchestration/tasks.json`
:::

## Two columns

Split the columns with a line holding only `+++`. Add `ratio=2/1` for unequal columns and `rule` for a hairline between them. Without `+++`, the text flows across two balanced columns.

```markdown
::: two-col ratio=1/1 rule
### Left
Text …
+++
### Right
Text …
:::
```

::: two-col ratio=1/1 rule
### Left column

The left column holds its own headings, lists and paragraphs. Columns keep the measure short, which suits comparisons and pairs.

+++

### Right column

The right column starts at the top, level with the left one, whatever the length of either.
:::

## Figures

A figure is one of the site’s drawings, named without `.svg`. By default it is cropped to its ink and centred at the full width of the text block.

```markdown
::: figure name=road-markers width=80%
A caption, in Markdown.
:::

![A caption](ink:dock "align=right width=40%")
```

::: figure name=road-markers width=80%
The road-markers drawing, cropped to its ink at 80 % of the text width. Six blank posts along a country road; any labels are set as text, never drawn.
:::

![The dock drawing, floated right at 40 % with the text wrapping around it.](ink:dock "align=right width=40%")

Options: `width` (a percentage or a length such as `3in`), `height` (a maximum height, default 4.3 in), `align` (`center`, `left` or `right`; left and right float with the text wrapping around), `crop` (`ink`, `full` for the drawing’s whole frame, or `x,y,w,h` in the drawing’s own units) and `alt`.

The drawings available: two-chairs, path, sailboat, bridge, lighthouse, house, travel-bag, dock (the site’s), and workshop-notebook, crossroads-signpost, ledger-page, desk-clock, system-map, road-markers (drawn for the briefing). `ASSETS.md` records where each one came from.

## Tables

```markdown
::: table title="A title" widths=30,40,30 first=strong compact note="Source: …"
| Column | Column | Column |
|---|---|---|
| … | … | … |
:::
```

`widths` fixes the column proportions, `first=strong` sets the first column in semibold, `compact` tightens the rows, and `note` prints a source line under the table. A plain Markdown table without the block works too.

::: table title="The drawings made for the briefing" widths=26,74 first=strong note="Source: briefing/ASSETS.md, read 30 September 2026."
| Drawing | What it shows |
|---|---|
| workshop-notebook | An open ruled notebook with blank pages, folded reading glasses, a cup of coffee and a pen |
| crossroads-signpost | A footpath that forks; a wooden signpost with two blank arms stands in the fork |
| ledger-page | An open account book ruled in rows and columns, a fountain pen across the right page |
| desk-clock | A small arched mantel clock with plain ticks and a closed book |
| system-map | Eight small objects on one table: building, filing cabinet, envelope, calendar, receipt, film roll, gears, padlock |
| road-markers | A country road winding to far hills with six blank wooden posts along its edge |
:::

## Sources and notes

```markdown
::: sources
- Title, https://… , retrieved 30 September 2026 [fetched]
:::
```

::: sources
- Brand palette and fonts: `briefing/src/brand.ts` and `briefing/ASSETS.md`, read 30 September 2026.
- Offer wording: `.orchestration/contracts/offer-matrix.md` §1, read 30 September 2026.
:::

::: note
`::: note` prints small muted text, for a caveat under a figure or a table.
:::

`::: keep` keeps its contents on one page. `::: pagebreak :::` starts a new page. A heading written `# Title {drawing=name}` opens a section with a drawing; `{nonumber}` leaves the section unnumbered; `{kicker="Part one"}` replaces the “Section 01” label.

# Capsule pages

A capsule can be written as YAML inside `::: capsule`, or kept in a JSON or YAML file and printed with `::: capsules src=file.json`. The page below comes from `capsules.sample.json`, which holds the same layout sample as the four-page sample document. `docs/AUTHORING.md` lists every field.

```markdown
::: capsules src=capsules.sample.json :::
```

::: capsules src=capsules.sample.json :::
