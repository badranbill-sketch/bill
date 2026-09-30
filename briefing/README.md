# Plan briefing — internal video for Arnaud and Bill

Remotion 4.0.529 · 1920×1080 · 30 fps · TypeScript. Its own npm package; it shares nothing with the site's build.

**Internal only.** It explains the plan in `.orchestration/source/01_MASTER_PLAN.md` and what it asks in time,
money and infrastructure. Not for publication, not for prospects.

## Run it

```bash
npm ci
npm run dev        # Remotion Studio: Briefing, PipelineTest, Primitives/LedgerPreview, Tools/ContactSheet
npm run qa         # reading time, runtime ≤ 7:00, amounts only in LEDGER with sources, banned wording, no spring(), no photo/audio, provenance
npm run lint       # tsc --noEmit
npm run ink        # regenerate src/data/ink/ after adding a drawing to public/ink/
npm run stills -- <outDir>          # two PNG stills per scene (midpoint, 0.5 s before the end) + contact-sheet.png
node --experimental-strip-types --no-warnings scripts/cues.mjs --write   # regenerate SCRIPT.md §7 from content.ts
```

### The briefing

`Briefing` (1920×1080, 30 fps, no audio): 14 scenes from `SCENES` in `src/content.ts`, 6:56.6 (12,498 frames).
Render the English film:

```bash
export REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
npx remotion render Briefing out/plan-briefing-en.mp4 --codec=h264 --crf=18 --concurrency=2 --browser-executable="$REMOTION_BROWSER"
npm run stills -- out/stills
```

Before a render, re-check `.orchestration/tasks.json` for any status the film states (B04's tags) and run
`npm run qa`.

### Rendering in this sandbox

Remotion 4.0.529 downloads its Chrome Headless Shell from `remotion.media` (not storage.googleapis.com); that host
is blocked here (HTTP 403, not in the egress allowlist). Point Remotion at the local Playwright headless shell
instead:

```bash
export REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
npm run proof    # node scripts/proof.mjs out: PipelineTest → out/pipeline-test.mp4, stills at 1 s / 3 s / 5.5 s, timing report
# or with the CLI:
npx remotion render PipelineTest out/pipeline-test.mp4 --codec=h264 --crf=18 --browser-executable="$REMOTION_BROWSER"
npx remotion still PipelineTest out/still.png --frame=90 --browser-executable="$REMOTION_BROWSER"
```

Measured on 2026-09-30 (4 vCPU container, default concurrency 2): 180 frames in 16.3–17.1 s, about 0.09 s per
frame wall clock (0.18–0.19 s per frame per worker), plus 2.5–4.5 s to bundle. `--concurrency=4` gained little
(19.1 s against 21.6 s end to end). At that rate a four-minute film (7,200 frames) renders in roughly 11 minutes.

## Where things live

| What | File |
|---|---|
| Every word on screen (EN now, FR empty and falling back to EN), when it appears, and the LEDGER rows | `src/content.ts` |
| Brand tokens, easing, motion and reading-time rules | `src/brand.ts` |
| Paper, pen drawings, titles and captions, ledger | `src/primitives/` |
| Compositions (`Briefing`, `PipelineTest`, `LedgerPreview`, the `ContactSheet` QA tool) | `src/compositions/`, registered in `src/Root.tsx` |
| One layout per scene type (title, pair, list, diagram, statement, table, ledger, columns, road, close), the scene shell (fades, chapter mark, progress dashes), `Art` (crops and places any drawing) | `src/briefing/` |
| Storyboard, and the source of every claim | `SCRIPT.md`, `CLAIMS.md`, `data/published-prices.json` |
| The site's drawings, and their stroke data | `public/ink/*.svg` → `src/data/ink/*.json` (`scripts/prep-ink.mjs`) |
| Where every asset came from | `ASSETS.md` |

## Primitives

- `<Paper/>`: the warm page `#FAF9F5` with a 4% grain and a very soft warm falloff. Never moves.
- `<InkDraw name start dur width />`: one of the site's drawings drawn by the pen, stroke by stroke. Faint pencil
  marks, then every ink contour (each tapered outline is revealed along its length through a nib-wide mask), then
  the hatching; the washes fade in only after the ink (`washDelay`, `washDur`). `crop` shows part of a drawing,
  `order="objects"` hatches object by object, `groups` draws only some object groups (one object of the system
  map). The site's drawings: two-chairs, path, sailboat, bridge, lighthouse, house, travel-bag, dock. Drawn for the
  briefing by the art lane (1440×810, the whole frame): workshop-notebook, crossroads-signpost, ledger-page,
  desk-clock, system-map (+ `system-map.anchors.json`), road-markers (+ `road-markers.anchors.json`).
- `<Art/>` (`src/briefing/Art.tsx`): crops a drawing to its ink (`crop="ink"`) and places it at a scale in frame px,
  so line weights stay comparable; falls back to a named stand-in, or to nothing, when a drawing is missing.
- `<Title/>` (Newsreader 300, sentence case), `<Caption/>` (Source Sans 3 text block), `<Kicker/>` (small label with
  a brass tick, never letter-spaced capitals). `readingSeconds(text)` = 0.3 s per word + 1.5 s; `holdFor(from, text)`
  builds an `at` window that respects it. A line held too briefly logs a warning at render time and fails `npm run qa`.
- `<LedgerLine row at />`: one hand-ruled LEDGER row: the item and its trigger; the amount exactly as recorded
  (`shown`) with "unverified — confirm at checkout" under every snippet-only figure and "example only" under an
  example; the source host and retrieval date ("project plan, internal" for a project figure). A proposal keeps its
  status words boxed and its amount muted. It never adds, totals, converts or annualizes anything.

## Rules

- No price without a retrieved source: amounts live only in `LEDGER`, as displayed, with URL, retrieval date,
  currency as displayed and cadence; snippet-only figures are labelled; blocked pages are recorded, not guessed.
- No photo, voice or likeness of Bill, no audio at all (the site's `en.mp3` is a voice clone), no AI-generated
  likeness. No quarantined claims (decisions.md D-053) and none of the presentation's superseded offers (D-049).
- Palette: navy `#0E2233` on warm paper `#FAF9F5`, brass only for small marks. Newsreader + Source Sans 3; Caveat
  only for incidental notes. No springs, bounce, zoom or glow.
