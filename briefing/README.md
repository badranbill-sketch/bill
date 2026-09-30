# Plan briefing — internal video for Arnaud and Bill

Remotion 4.0.529 · 1920×1080 · 30 fps · TypeScript. Its own npm package; it shares nothing with the site's build.

**Internal only.** It explains the plan in `.orchestration/source/01_MASTER_PLAN.md` and what it asks in time,
money and infrastructure. Not for publication, not for prospects.

## Run it

```bash
npm ci
npm run dev        # Remotion Studio: PipelineTest, and Primitives/LedgerPreview
npm run qa         # reading time, amounts only in LEDGER with sources, banned wording, no spring(), no photo/audio, provenance
npm run lint       # tsc --noEmit
npm run ink        # regenerate src/data/ink/ after adding a drawing to public/ink/
```

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
| Compositions (`PipelineTest`, `LedgerPreview`) | `src/compositions/`, registered in `src/Root.tsx` |
| The site's drawings, and their stroke data | `public/ink/*.svg` → `src/data/ink/*.json` (`scripts/prep-ink.mjs`) |
| Where every asset came from | `ASSETS.md` |

## Primitives

- `<Paper/>`: the warm page `#FAF9F5` with a 4% grain and a very soft warm falloff. Never moves.
- `<InkDraw name start dur width />`: one of the site's drawings drawn by the pen, stroke by stroke. Faint pencil
  marks, then every ink contour (each tapered outline is revealed along its length through a nib-wide mask), then
  the hatching; the washes fade in only after the ink (`washDelay`, `washDur`). `crop` shows part of a drawing,
  `order="objects"` hatches object by object. Drawings: two-chairs, path, sailboat, bridge, lighthouse, house,
  travel-bag, dock.
- `<Title/>` (Newsreader 300, sentence case), `<Caption/>` (Source Sans 3 text block), `<Kicker/>` (small label with
  a brass tick, never letter-spaced capitals). `readingSeconds(text)` = 0.3 s per word + 1.5 s; `holdFor(from, text)`
  builds an `at` window that respects it. A line held too briefly logs a warning at render time and fails `npm run qa`.
- `<Ledger rows at />`: placeholder. Shows an amount only as displayed on its source page, with cadence and retrieval
  date; anything unknown reads "not yet sourced". It never totals mixed currencies or cadences.

## Rules

- No price without a retrieved source: amounts live only in `LEDGER`, as displayed, with URL, retrieval date,
  currency as displayed and cadence; snippet-only figures are labelled; blocked pages are recorded, not guessed.
- No photo, voice or likeness of Bill, no audio at all (the site's `en.mp3` is a voice clone), no AI-generated
  likeness. No quarantined claims (decisions.md D-053) and none of the presentation's superseded offers (D-049).
- Palette: navy `#0E2233` on warm paper `#FAF9F5`, brass only for small marks. Newsreader + Source Sans 3; Caveat
  only for incidental notes. No springs, bounce, zoom or glow.
