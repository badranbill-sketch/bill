# SCRIPT — plan briefing (storyboard for the build lane)

Internal video for Arnaud and Bill, dated 30 September 2026. Not for publication. English only for now: every `fr`
slot is empty and falls back to EN. **No audio of any kind** (no voice, no music, no effects): the film is read with
the sound off, so every word below is on screen and timed for reading.

- **Runtime: 416.6 s = 6:56.6**, 14 scenes, 30 fps, 12,498 frames (per-scene `Math.round(dur * 30)`, summed). The
  brief allows 5 to 7 minutes: there are only 3.4 s of headroom. **Do not add time.** Transitions happen inside the
  scene durations (fade out over the last 0.5 s of a scene, fade in during the first 0.3 s). If a drawing needs more
  time, cut words in `src/content.ts`, not seconds.
- **Source of every word and timing: `src/content.ts`.** Scenes are written there without timings and passed
  through `scene()`, which gives every line its `at: [from, dur]` (it stays until the scene ends) and sets `dur`.
  Components read `SCENES[key]` and must not invent, reword or retime text. Edit words in `content.ts`; timings follow.
- **Every factual line carries `claim: 'Cnn-n'`** (never rendered), which is a row of `CLAIMS.md`. Every amount is a
  `LEDGER` row whose record is in `data/published-prices.json` (list prices retrieved 2026-09-30) or, for internal
  figures, a project file at a pushed commit.
- Checks: `npm run qa` (reading time, amounts only in LEDGER with sources, banned wording, no springs, no
  photo/audio, provenance) and `npx tsc --noEmit`. Both pass on this script.

## 1. What the build lane must know first

1. **New drawings may not exist yet.** `drawing`/`art[].name` can be one of six NEW names (§4). Until a drawing is in
   `src/data/ink`, use `art[].fallback` if one is named; otherwise render the scene without that drawing (never a
   placeholder box, never a photo, never AI imagery). `InkDraw`'s `DrawingName` only knows the eight site drawings, so
   guard with `name in DRAWINGS`.
2. **`Ledger.tsx` needs updating** for the new LEDGER fields (§5): it must show `shown.en` as the amount text, the
   `trigger` under the item, `UNVERIFIED.en` ("unverified — confirm at checkout") under every `snippet-only` amount,
   `EXAMPLE.en` ("example only") on example rows, and a source cell that reads the hostname plus retrieval date (for
   `basis: 'internal'`, write "project plan, internal"). Its current "(snippet, unverified)" suffix is not the
   required wording. It must still never total anything.
3. **Status tags** (`TAGS` in content.ts) have a `tone`: `done` = navy text with the brass tick (as `Kicker`);
   `open` = muted italic, no tick; `stop` = navy text inside a thin hand-ruled box (pen.ts `line`), never red, never a
   fill. A tag sits at the end of its item's line, 22–24 px, sentence case, never letter-spaced capitals.
4. **Reading units.** Nested sub-lines of an item (`heading`, `label`, `owner`, the tag) appear with the item and
   are counted in its reading time. A `Row` (the seven gates, the seven map labels, the six waves) appears 0.3 s per
   item and is timed as one line of all its words. Kickers, column headings and the table header are small labels
   that appear with the line after them and add 0.3 s per word.
5. **F02a changed state before render (done).** At 11:45 UTC `tasks.json` showed F02a `running`; A0 then recorded it
   `accepted` (A0 patch 1 passed A6 on attempt 2, `reviews/A0-patch-1-attempt2.md`). The build lane switched B04
   `items.4` from `'in-review'` to `'accepted'` and updated CLAIMS.md C04-6; B04 is 0.6 s shorter (fewer tag words).
6. `npm run qa` reports the runtime from frames (per-scene `Math.round(dur * 30)`), as the composition counts them.

## 2. Data model added to `src/content.ts` (all new fields optional; the old `Scene` fields are unchanged)

| Type / field | Meaning |
|---|---|
| `Line.claim?: string` | CLAIMS.md row. Never rendered. |
| `Line.withPrev?: boolean` | Cue hint for `scene()`: appear with the previous line. Never rendered. |
| `Scene.layout?: Layout` | `'title' \| 'statement' \| 'pair' \| 'list' \| 'diagram' \| 'table' \| 'ledger' \| 'columns' \| 'road' \| 'close'` (§3). |
| `Scene.drawing?: BriefingDrawing` | The main drawing: an `ExistingDrawing` or a `NewDrawing`. |
| `Scene.art?: ArtCue[]` | Every drawing cue: `name`, `placement` (`right \| left \| center \| band \| corner \| full`), `start` and `dur` (pen, seconds from scene start), `washDelay?`, `hold?` (already drawn in the previous scene: show complete from frame 0, no redraw), `order?` (`'objects'` for the system map), `fallback?` (existing drawing to use until the new one lands), `startWith?` (unused now; `scene()` would resolve it to a line's `from`). |
| `Scene.kicker?`, `title`, `lines`, `caption?`, `callout?` | Text blocks. `callout` is a pull line (Newsreader 300 italic) with a brass tick; `caption` is Source Sans. |
| `Scene.items?: Item[]` | A list. `Item = Line & { tag?, heading?, label?, owner? }`. |
| `Scene.row?: Row` | `{ kind: 'row', lead?: Line, items: Item[] }`: a row of short markers read as one unit. |
| `Scene.diagram?: Diagram` | `{ kind: 'diagram', paths: Line, hub: MapNode, nodes: Row<MapNode> }`. `MapNode = Item & { id, object }`, `object` ∈ `building \| drawer \| gear \| envelope \| calendar \| receipt \| film \| padlock`. |
| `Scene.table?: Table` | `{ kind: 'table', header?: Line, rows: Item[], footer?: Line }`. Rows use `tag` (status) and `owner`. |
| `Scene.ledger?: LedgerBlock` | `{ kind: 'ledger', lead?: Line, rows: { id, at }[], footer? }`: LEDGER rows by id, in order, each with its own `at`. |
| `Scene.columns?: Column[]` | `{ kind: 'column', heading: Line, items: Item[] }`, side by side. |
| `TAGS: Record<Tag, Line & { tone }>` | Words and tone of each status tag. |
| `LedgerRow.kind?` | `'if-needed' \| 'per-sale' \| 'proposal' \| 'existing' \| 'reference'`. |
| `LedgerRow.trigger?: Line` | When the cost would arise. Shown under the item, muted italic. |
| `LedgerRow.shown?: Line` | The amount text to put on screen, composed only from the record. Use it instead of `amount`. |
| `LedgerRow.unitAsRecorded?`, `costsId?` | The record's unit wording verbatim; the `.orchestration/costs.json` item id. Not rendered. |
| `LedgerRow.example?: boolean` | Show `EXAMPLE` next to the amount. |
| `LedgerSource.basis` | Adds `'vendor-source'` (the vendor's own public data file that feeds its pricing page; published-prices "fetched") and `'internal'` (a project file at a pushed commit). `'snippet-only'` always shows `UNVERIFIED`. |
| `LedgerSource.ref?`, `dataUrl?` | Where the figure is recorded (`data/published-prices.json#<id>` or `file:line`); the file actually fetched. |
| `UNVERIFIED`, `EXAMPLE` | The marker lines. |
| `wordCount`, `readingNeed`, `itemText`, `ledgerText`, `TOTAL_SECONDS`, `NEW_DRAWINGS` | Helpers for components and checks. |

## 3. Page system (1920 × 1080)

- Safe area: 150 px left and right, 110 px top, 100 px bottom. Warm paper everywhere (`<Paper/>`), nothing moves but
  the pen and the text reveals. No springs, zoom, bounce or glow. Ink first, wash after (`InkDraw` defaults).
- Kicker: `<Kicker/>` 24 px at the top-left (x 150, y 110). Title: `<Title/>` Newsreader 300, 64–72 px (88 on B01,
  80 on B14), sentence case, below the kicker. Lines and items: Source Sans 3, 32–36 px, `C.navy2`, line height 1.4.
  Muted text `C.muted`. Brass only for ticks, the `→`, wave/gate labels (`C.brassInk`, 600) and hand-ruled accents.
- Items reveal with `Reveal` at their `at[0]` (fade in 24 frames, rise ≤ 12 px) and stay to the end of the scene.
- Hand-ruled rules and connectors use `pen.ts` `line()` drawn with `progressAt(..., 0.8, EASE_SOFT)` when the row or
  label they belong to appears.
- Caveat is not used in this script (no incidental notes were needed).

| Layout | Composition |
|---|---|
| `title` | Text block left (x 150, width 700, vertically centred: kicker, title 88 px, caption 34 px). Drawing right: width about 1000, as `PipelineTest`. |
| `statement` | Kicker and title top-left (title width 1150). Lines stacked from y ≈ 330, width 1050, 34–36 px, 28 px apart. Drawing right (x ≈ 1300, width 480), vertically centred. B07 adds its gate row across the bottom (§6, B07). |
| `pair` | Kicker, title and the one line across the top (y 110–330, width 1500). Two panels below: left x 150–900, right x 1020–1770. Each panel: its drawing (width ≈ 560) then, when its item appears, the `heading` (Newsreader 400, 40 px) and the text (Source Sans 30 px). |
| `list` | Kicker and title top-left; items stacked from y ≈ 300, width 1000–1080, 32–34 px, 64–72 px apart; tags at the end of each item. Drawing right (vignette width ≈ 520) or, on B03, the dock at the bottom-right (width ≈ 1100, x ≈ 720, y ≈ 640). `caption` under the list in muted 30 px; `callout` last, Newsreader 300 italic 40 px with a brass tick. |
| `diagram` | The system map full width (x 150–1770, y ≈ 250–960). The `paths` line under the title, the `→` in brass. Each label (UI text, 24–26 px) beside its object, with a short hand-ruled leader. Caption in the clear band at the bottom. |
| `table` | Vignette in the top-right corner (width ≈ 300). Table x 150, y ≈ 270, width 1620: piece 0–58 %, status 58–78 %, owner 78–100 %. Header 22 px muted; rows 30 px, row height ≈ 76, hand-ruled separators (as `Ledger`). Footer under the table, 30 px italic muted. |
| `ledger` | The ledger-page drawing held in the top-right corner (width ≈ 360). Title and lead top-left. Rows from y ≈ 290, row height ≈ 90 (two text lines): item 28 px navy with the trigger under it (22 px muted italic); amount (`shown.en`, 28 px) with the marker under it (22 px `C.brassInk` italic); source 20 px muted (hostname · 2026-09-30). |
| `columns` | Side-by-side columns with their heading (Newsreader 400, 36 px) and items (30–32 px, 24 px apart). B11: Bill left (x 150, width 820); Arnaud and the reviewer stacked on the right (x 1060, width 700). B13: two equal columns (width 780, gap 60). The corner drawing sits bottom-right; the caption bottom-left. |
| `road` | The road-markers drawing as a band across the middle (x 150–1770, y ≈ 300–700). One label per marker at the marker's anchor: "Wave N" (brass, 600, 22 px), the description (24 px, at most two lines) and its tag (a brass dot + "we are here"; "next" muted). Callout under the band (y ≈ 760, Newsreader 300 italic 38 px, width 1500), caption below it (30 px). |
| `close` | Sailboat centred at the top (width ≈ 600, y ≈ 180). Brand line centred below (Newsreader 300, 80 px, y ≈ 620), the line under it centred (32 px, width 1200). |

## 4. Drawings

Existing (in `src/data/ink`): two-chairs (760×520), dock (1200×440), and the 280×220 vignettes path, bridge,
lighthouse, house, travel-bag, sailboat. New slots from the art lane, with what each scene needs:

| New drawing | Used in | Size and composition needed | Until it exists |
|---|---|---|---|
| `workshop-notebook` | B02 left panel (width ≈ 560) | Open notebook, reading glasses, one cup. Same aspect as `crossroads-signpost` (they sit side by side), about 760×520. Quiet, usable white space. | `path` |
| `crossroads-signpost` | B02 right panel (width ≈ 560) | A crossroads signpost with a single path in the foreground; adult editorial, not arcade. Blank sign boards (no drawn words). | `bridge` |
| `ledger-page` | B09 right (width ≈ 520, drawn); B10 corner (width ≈ 360, held complete) | A notebook ledger page with a pen resting on it. Ruled columns, no legible figures, no money, no coins or notes. About 760×520 or 280×220. | none (text only) |
| `desk-clock` | B11 bottom-right corner (width ≈ 280) | A small desk clock, 280×220 vignette. | none |
| `system-map` | B06, full width | A composed ink map of eight small objects, about 1200×560: a small building (the site, centre), a filing drawer (records), a small gear or workbench (automation), an envelope (email), a calendar page (calendar), a receipt (payments), a film strip (recordings), a padlock (backups). **No drawn labels or words.** Room beside each object for a UI label; clear bands at the top and bottom. Strokes grouped by object (`g`) in the order building, drawer, gear, envelope, calendar, receipt, film, padlock, so `order="objects"` draws them in the order the labels appear. Please supply each object's anchor point in drawing units (for label placement), e.g. a sidecar `system-map.anchors.json`. | none: lay the labels out in a quiet grid with hand-ruled leaders to the centre |
| `road-markers` | B12 band | A winding road left to right with **exactly six** understated markers (waves 0–5), about 1200×440. No drawn numbers or words. Anchor point per marker, as for the map. | `path` |

Pen timings are in each scene's `art` (start and duration in seconds). Every drawing: ink, then washes (`washDelay`
defaults to 85 % of `dur`).

## 5. Money rules on screen

- Amounts appear **only** through LEDGER rows in B10. B09 states facts without amounts ("nothing bought or spent",
  "limits at zero", "to confirm").
- Show `shown.en` verbatim. Every `snippet-only` row shows "unverified — confirm at checkout". Example rows show
  "example only". The lead says "Published list prices, not quotes. Taxes extra."
- The Workspace amount is the USD figure Google displays; regional checkout is the price that counts (row note).
- The ad test row says "proposed, not authorized"; its source is the plan (`basis: 'internal'`), and the ads limit
  stays zero.
- Printing and shipping has no amount: it reads "quote needed (HB-20)". Existing costs read "to confirm".
- Never add, total, convert or annualize anything.

## 6. Scene by scene

The exact second each line appears is in the cue sheet (§7); this section gives the idea, the composition and the
motion. Every line stays on screen until its scene ends.

**B01 · Opening (10.1 s), `title`, two-chairs right (pen 0.3–3.5 s).** One idea: what this is and for whom. The
dated kicker and the title appear together; the caption "For Arnaud and Bill. Not for publication." follows.

**B02 · Why (24.2 s), `pair`, workshop-notebook left (pen 0.4–3.4 s) and crossroads-signpost right (2.4–5.4 s).** One
idea: the purpose and the two products. The creative line is the title, then the system's job, then the Workshop
Journey panel and the Crossroads panel appear under their drawings.

**B03 · The offers (21.2 s), `list`, dock bottom-right (pen 0.3–4.8 s).** One idea: the four frozen offers, and no
required path. No tags. The wording is exact: one 30-minute consultation with the book (never 60), no price.

**B04 · Built so far (39.8 s), `list`, house right (pen 0.3–3.3 s).** One idea: the foundation, and why it came first.
Five tagged items (all `accepted`), the verifier caption, then the "Why first" callout.

**B05 · What we found (28.4 s), `list`, lighthouse right (pen 0.3–3.3 s).** One idea: what the checks found and what
was done. Four tagged items: fixed; must not ship (boxed); quarantined (boxed); plan stands. Calm, no red.

**B06 · The system (25.1 s), `diagram`, system-map full (pen 0.6–9.6 s, `order="objects"`).** One idea: the design in
one picture. The paths line (brass `→` to "Bill's 15-minute conversation"), the site label beside the building, then
the seven service labels 0.3 s apart, each with a short hand-ruled leader to its object, then the caption. Without
the drawing: the labels in a quiet two-row grid around the site label, with hand-ruled leaders.

**B07 · How it gets built (27.5 s), `statement`, bridge right (pen 0.3–3.3 s).** One idea: a small supervised team
builds; people switch it on. Two lines, then the gate row across the bottom: the lead "Seven approvals, none recorded
yet:" on the left, then seven small markers (brass `G0`…`G6` above a two-word label), with a hand-ruled baseline drawn
left to right as they appear.

**B08 · Infrastructure (45.0 s), `table`, travel-bag top-right corner (pen 0.3–2.9 s).** One idea: what each piece is,
its state and its owner. The header appears with the first row, one row about every five seconds, the "Not used"
footer last. "Bill or firm (proposed)" is the blockers.md HB-06 proposal, not a decision.

**B09 · Money today (17.6 s), `statement`, ledger-page right (pen 0.3–3.3 s).** One idea: nothing bought or spent. The
title, then two lines. No amounts on this page.

**B10 · Money later (52.4 s), `ledger`, ledger-page held complete top-right.** One idea: what could cost money later,
and what would trigger it. The lead line, then seven rows: Workspace, Supabase Pro, Brevo Starter, the Backblaze B2
example, the Stripe fee, printing and shipping, the ad test proposal. Each row is timed for all its words, markers
included.

**B11 · Time (38.3 s), `columns`, desk-clock bottom-right (pen 0.3–3.1 s).** One idea: what it asks of each person.
Bill's four items, then Arnaud's two, then the reviewer and privacy owner. The recording figure is finished footage,
not studio time; the meeting hours are a proposal Bill confirms.

**B12 · Timeline (32.9 s), `road`, road-markers band (pen 0.3–4.3 s).** One idea: where we are, and what Friday is.
Six wave labels along the road (Wave 0 "we are here", Wave 1 "next"), then the Friday callout, then the 90-day
caption.

**B13 · What we need from you (44.0 s), `columns`, two-chairs small bottom-right (pen 0.3–3.3 s).** One idea: each
person's top questions, by HB number. Arnaud's column, then Bill's, then the secrets caption.

**B14 · Close (10.1 s), `close`, sailboat centre (pen 0.2–3.2 s).** The brand line, then the next step. Fade to paper
over the last 0.5 s.

## 7. Cue sheet (generated from `src/content.ts`)

Each row: when it appears (it stays to the end of the scene), its path in the scene object, and the words on screen
(label in brackets, heading in bold, then owner and tag). LEDGER rows show every word the row puts on screen.
Regenerate after any edit with `node --experimental-strip-types --no-warnings scripts/cues.mjs --write`.

### B01 · Opening — 10.1 s (at 0:00.0–0:10.1)
Layout `title`. Art: `two-chairs` right, pen 0.3–3.5 s.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | kicker | Internal briefing · 30 September 2026 (C01-1) |
| 0.3 | title | The plan, what is built, and what it takes. |
| 6.0 | caption | For Arnaud and Bill. Not for publication. (C01-2) |

### B02 · Why — 24.2 s (at 0:10.1–0:34.3)
Layout `pair`. Art: `workshop-notebook` left, pen 0.4–3.4 s, fallback `path`; `crossroads-signpost` right, pen 2.4–5.4 s, fallback `bridge`.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | kicker | Why |
| 0.3 | title | The goal isn't to reach retirement. It's to live it. (C02-1) |
| 5.1 | lines.0 | The system's job: held, relevant retirement conversations with Bill; client relationships where the fit is mutual. (C02-2) |
| 11.4 | items.0 | **Workshop Journey** A four-part exercise at your own pace: Bill on video beside an interactive tool. (C02-3) |
| 17.7 | items.1 | **Retirement Crossroads Challenge** A live game show Bill hosts: ten fictional cases, A/B/C/D answers, explanations. (C02-4) |

### B03 · The offers — 21.2 s (at 0:34.3–0:55.5)
Layout `list`. Art: `dock` band, pen 0.3–4.8 s.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | kicker | The offers |
| 0.3 | title | Four fixed offers. No required path to Bill. (C03-1) |
| 4.8 | items.0 | Free PDF guide. (C03-2) |
| 7.2 | items.1 | Free 15-minute introduction with Bill: one question, online or in person. (C03-3) |
| 12.0 | items.2 | Paid printed book, including one 30-minute consultation. Price not set yet. (C03-4) |
| 16.8 | items.3 | Continued work only if the fit is mutual. (C03-5) |

### B04 · Built so far — 39.8 s (at 0:55.5–1:35.3)
Layout `list`. Art: `house` right, pen 0.3–3.3 s.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | kicker | Built so far |
| 0.3 | title | First, the foundation. Nothing is live yet. (C04-1) |
| 4.8 | items.0 | Inventory: 6 branches, every asset, a 171-line gap list. · tag: _accepted_ (C04-2) |
| 9.3 | items.1 | 74 decisions recorded; 29 questions in one batch. · tag: _accepted_ (C04-3) |
| 13.5 | items.2 | 15 versioned rules for data, workshop maths, offers and approvals. · tag: _accepted_ (C04-4) |
| 18.3 | items.3 | A combined code base that builds and passes 41 browser tests. · tag: _accepted_ (C04-5) |
| 23.4 | items.4 | Four extra test cases for the workshop maths. · tag: _accepted_ (C04-6) |
| 27.6 | caption | Each step checked by an independent verifier that did none of the work. (C04-7) |
| 33.0 | callout | Why first: so parallel work can't drift, leak anyone's numbers, or promise what Bill hasn't approved. (C04-8) |

### B05 · What we found — 28.4 s (at 1:35.3–2:03.7)
Layout `list`. Art: `lighthouse` right, pen 0.3–3.3 s.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | kicker | What we found |
| 0.3 | title | Facts, not blame. |
| 3.6 | items.0 | The main branch did not build (a video folder, film/); the combined base does. · tag: _fixed_ (C05-1) |
| 9.6 | items.1 | Site narration: a clone of someone else's voice, speaking as Bill. · tag: _must not ship_ (C05-2) |
| 15.3 | items.2 | Film material: an invented client story, unsupported titles. · tag: _quarantined_ (C05-3) |
| 19.5 | items.3 | The code assumes other services (Resend, Upstash, Vercel); the only n8n (automation tool) we can reach is someone else's Cloud project. · tag: _plan stands_ (C05-4) |

### B06 · The system — 25.1 s (at 2:03.7–2:28.8)
Layout `diagram`. Art: `system-map` full, pen 0.6–9.6 s, order objects.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | kicker | The plan |
| 0.3 | title | The system in one picture |
| 3.9 | diagram.paths | Guide · Workshop Journey · Crossroads · Book → Bill's 15-minute conversation (C06-1) |
| 7.8 | diagram.hub | Bill's website, on the existing server (C06-2) |
| 11.1 | diagram.nodes.items.0 | Records: Supabase (C06-3) |
| 11.4 | diagram.nodes.items.1 | Automation: n8n (C06-3) |
| 11.7 | diagram.nodes.items.2 | Email: Brevo (C06-3) |
| 12.0 | diagram.nodes.items.3 | Calendar: Google; Calendly for now (C06-4) |
| 12.3 | diagram.nodes.items.4 | Payments: Stripe (C06-3) |
| 12.6 | diagram.nodes.items.5 | Bill's recordings (C06-5) |
| 12.9 | diagram.nodes.items.6 | Backups, kept off the server (C06-6) |
| 18.6 | caption | Numbers typed into the workshop never leave the visitor's browser. No AI talks to visitors. (C06-7) |

### B07 · How it gets built — 27.5 s (at 2:28.8–2:56.3)
Layout `statement`. Art: `bridge` right, pen 0.3–3.3 s.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | kicker | How we build |
| 0.3 | title | A small supervised team builds it. People switch it on. (C07-1) |
| 5.7 | lines.0 | Building: one AI director and at most three AI specialists ('agents') at once, the verifier included. (C07-2) |
| 12.0 | lines.1 | Once live: tested automations send reminders and receipts; no agent decides for a client. (C07-3) |
| 17.7 | row.lead | Seven approvals, none recorded yet: (C07-4) |
| 18.0 | row.items.0 | [G0] basic choices (C07-5) |
| 18.3 | row.items.1 | [G1] credentials, offers (C07-5) |
| 18.6 | row.items.2 | [G2] accounts, spending limits (C07-5) |
| 18.9 | row.items.3 | [G3] exact versions (C07-5) |
| 19.2 | row.items.4 | [G4] recordings, rights (C07-5) |
| 19.5 | row.items.5 | [G5] personal data (C07-5) |
| 19.8 | row.items.6 | [G6] switch-on (C07-5) |

### B08 · Infrastructure — 45.0 s (at 2:56.3–3:41.3)
Layout `table`. Art: `travel-bag` corner, pen 0.3–2.9 s.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | kicker | Infrastructure |
| 0.3 | title | Proven pieces, in the owners' own names. (C08-1) |
| 4.2 | table.header | Status · Owner |
| 4.2 | table.rows.0 | Existing server (VPS): site, n8n, nightly encrypted off-server backups · owner: Arnaud · tag: _to confirm_ (C08-2) |
| 9.9 | table.rows.1 | Supabase Free: small database · owner: Bill or firm (proposed) · tag: _to open_ (C08-3) |
| 14.4 | table.rows.2 | Brevo Free: email; one domain record, current mail untouched · owner: Bill or firm (proposed) · tag: _to open_ (C08-4) |
| 20.4 | table.rows.3 | Google account for Meet and Calendar; Calendly kept for the pilot · owner: Bill · tag: _edition to confirm_ (C08-5) |
| 26.4 | table.rows.4 | Stripe hosted checkout, test mode first · owner: Bill or firm (proposed) · tag: _to open_ (C08-6) |
| 31.5 | table.rows.5 | Video host, after a bandwidth estimate · owner: Arnaud · tag: _not chosen_ (C08-7) |
| 35.7 | table.rows.6 | GitHub: reviewed versions · owner: Arnaud · tag: _exists_ (C08-8) |
| 38.7 | table.footer | Not used: Zoom, n8n Cloud, Vercel Hobby, a custom video platform, a new CRM. (C08-9) |

### B09 · Money today — 17.6 s (at 3:41.3–3:58.9)
Layout `statement`. Art: `ledger-page` right, pen 0.3–3.3 s.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | kicker | Money |
| 0.3 | title | Today: nothing bought or spent; spending limits at zero until Arnaud sets them. (C09-1) |
| 6.0 | lines.0 | New subscriptions for the pilot: none, if the existing server and Bill's Google account suffice. (C09-2) |
| 12.0 | lines.1 | Existing costs to confirm: server, domain, mailbox, Calendly, Google, GitHub, build assistant. (C09-3) |

### B10 · Money later — 52.4 s (at 3:58.9–4:51.3)
Layout `ledger`. Art: `ledger-page` corner, held complete (no redraw).

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | title | Money later, only if needed. (C10-1) |
| 3.3 | ledger.lead | Published list prices, not quotes. Taxes extra. (C10-2) |
| 6.9 | ledger.rows.0 → LEDGER `workspace_business_standard` | Google Workspace Business Standard if Meet must record or host 150 USD 14.00 annual / 16.80 flexible, per user per month unverified — confirm at checkout |
| 15.6 | ledger.rows.1 → LEDGER `supabase_pro` | Supabase Pro if free limits or backups fall short From $25 per month + usage (USD) |
| 21.6 | ledger.rows.2 → LEDGER `brevo_starter` | Brevo Starter if daily email nears the free 300 From USD 9 per month unverified — confirm at checkout |
| 28.5 | ledger.rows.3 → LEDGER `backup_example_b2` | Backups: Backblaze B2 if no owner storage exists USD 6.95 per TB per 30 days unverified — confirm at checkout example only |
| 36.3 | ledger.rows.4 → LEDGER `stripe_fee_ca` | Stripe fee per book (Canadian card) 2.9% + CA$0.30 per successful card charge unverified — confirm at checkout |
| 42.6 | ledger.rows.5 → LEDGER `book_printing_shipping` | Printing and shipping per book quote needed (HB-20) |
| 46.5 | ledger.rows.6 → LEDGER `ads_test_proposal` | Ad test: proposed, not authorized CAD 20 a day × 14 days = CAD 280 |

### B11 · Time — 38.3 s (at 4:51.3–5:29.6)
Layout `columns`. Art: `desk-clock` corner, pen 0.3–3.1 s.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | kicker | Time |
| 0.3 | title | What it asks of each person |
| 3.9 | columns.0.heading | Bill |
| 3.9 | columns.0.items.0 | 10 questions, once; a 20-minute recorded voice interview. (C11-1) |
| 8.1 | columns.0.items.1 | Recording: 22 to 35 minutes of finished video, not studio time. (C11-2) |
| 12.9 | columns.0.items.2 | Meetings, proposed: six 15-minute and two 30-minute weekly, buffers included: 3 h 50 min. Bill confirms. (C11-3) |
| 19.2 | columns.0.items.3 | Crossroads: 60 minutes, proposed monthly, plus rehearsal. A weekly voice note; reviewing drafts. (C11-4) |
| 24.6 | columns.1.heading | Arnaud |
| 24.6 | columns.1.items.0 | 13 questions in one sitting; owners open accounts in their own names. (C11-5) |
| 30.0 | columns.1.items.1 | Operating: daily booking check, event moderation, weekly review. (C11-6) |
| 33.9 | columns.2.heading | Reviewer, privacy owner |
| 33.9 | columns.2.items.0 | Approves exact versions; 6 questions. (C11-7) |

### B12 · Timeline — 32.9 s (at 5:29.6–6:02.5)
Layout `road`. Art: `road-markers` band, pen 0.3–4.3 s, fallback `path`.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | kicker | Timeline |
| 0.3 | title | Where we are: finishing wave 0. (C12-1) |
| 3.9 | row.items.0 | [Wave 0] Inspect, freeze the rules · tag: _we are here_ (C12-2) |
| 4.2 | row.items.1 | [Wave 1] First workshop screen, local setup · tag: _next_ (C12-2) |
| 4.5 | row.items.2 | [Wave 2] Build every path (C12-2) |
| 4.8 | row.items.3 | [Wave 3] Recordings, reviews, provider tests (C12-2) |
| 5.1 | row.items.4 | [Wave 4] Friday pilot gate (C12-2) |
| 5.4 | row.items.5 | [Wave 5] All content, then 90 days (C12-2) |
| 17.4 | callout | Friday 2 October: on current evidence, a clearly labelled protected rehearsal, unless gates are recorded and recordings exist. (C12-3) |
| 24.3 | caption | Then 90 days: an article and two videos a week, Crossroads monthly if justified, one change at a time. Success: meetings held. (C12-4) |

### B13 · What we need from you — 44.0 s (at 6:02.5–6:46.5)
Layout `columns`. Art: `two-chairs` corner, pen 0.3–3.3 s.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | kicker | Your part |
| 0.3 | title | One sitting each. "Don't know yet" is fine. (C13-1) |
| 4.8 | columns.0.heading | Arnaud |
| 4.8 | columns.0.items.0 | Host choice, server facts and access (HB-01, HB-02) (C13-2) |
| 9.0 | columns.0.items.1 | Which code version is official; domain and mail (HB-03, HB-05) (C13-2) |
| 13.5 | columns.0.items.2 | Who opens each test account; password manager; operator (HB-06, HB-07, HB-10) (C13-2) |
| 18.3 | columns.0.items.3 | Spending limits, proposed at zero; test recipients (HB-08, HB-09) (C13-2) |
| 22.5 | columns.1.heading | Bill |
| 22.5 | columns.1.items.0 | Google account, Calendly, weekly slots (HB-14 to HB-16) (C13-3) |
| 26.7 | columns.1.items.1 | First Crossroads, interview and recording dates (HB-17, HB-19) (C13-3) |
| 30.6 | columns.1.items.2 | Book price and terms (HB-20) (C13-3) |
| 33.6 | columns.1.items.3 | Professional details, firm reviewer, photo and voice rights (HB-21, HB-22) (C13-3) |
| 38.1 | caption | Secrets never go in chat: each has its named place. Full list: .orchestration/blockers.md (C13-4) |

### B14 · Close — 10.1 s (at 6:46.5–6:56.6)
Layout `close`. Art: `sailboat` center, pen 0.2–3.2 s.

| In (s) | Slot | On screen |
|---:|---|---|
| 0.3 | title | Build a Better Retirement Together (C14-1) |
| 3.3 | lines.0 | Next: one sitting each for the questions. Local work continues; nothing goes live without recorded approval. (C14-2) |

Total: 416.6 s (6:56.6).

## 8. Deliberately not in the film

- No photo, portrait, voice or likeness of Bill (portrait rights unconfirmed, HB-22); no audio at all; nothing from
  `public/audio/journey/en.mp3` (a voice clone, D-052), film/ art or audio, or the presentation's superseded copy.
- No quarantined claims (D-053): no credentials, designations, years of experience, client stories or quotes.
- No price for the book (none exists, D-032), no Workspace purchase implied, no estimate of VPS, storage or egress
  cost, no hour counts beyond the plan's (recording totals are computed from 05 targets, meeting hours are the 01 §17
  proposal).
- Left out for time, available if a scene is cut: the 16 A6 review reports (now 17 with the A0 patch 1 review), the
  three recorded build runs (40 agent sessions, 31,501 s wall time, cost not metered; `.orchestration/runs/`), the
  Hetzner backup example and the CAD reseller figure for Workspace (both in LEDGER and `data/`), the 41 browser tests'
  substitute-browser caveat (CLAIMS.md C04-5), and the 12-clip / 18-video split of the recording minutes (C11-2).
