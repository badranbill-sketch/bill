# Assets and provenance

Every file in `public/` except the six drawings made for this briefing (see below) was copied byte for byte
with `git show <branch>:<path> > <file>` on 2026-09-30. The
blob sha is the file's git object id (`git hash-object <file>`), so a copy can be checked against its source at
any time. `npm run qa` fails if a file in `public/` is missing here or its sha no longer matches.

Branch heads at copy time: `origin/main` 77de3bd51a8c9cb73aec0b32d27ca0cacb6285cd ·
`origin/claude/bill-presentation-video` fc0044576d851be414d19e2f7a21ca7fd1285eae.

| File | Source (branch:path) | Blob sha | Notes |
|---|---|---|---|
| `public/fonts/newsreader-latin-300-normal.woff2` | `origin/claude/bill-presentation-video:presentation/public/fonts/newsreader-latin-300-normal.woff2` | `f9c084eedbd513b19200f7a95e9a92a6bc9991ae` | Fontsource woff2 (SIL Open Font License), as bundled by the presentation project |
| `public/fonts/newsreader-latin-300-italic.woff2` | `origin/claude/bill-presentation-video:presentation/public/fonts/newsreader-latin-300-italic.woff2` | `3342cda6156960ce89fab0c7e3946669b62927d0` | Fontsource woff2 (SIL Open Font License), as bundled by the presentation project |
| `public/fonts/newsreader-latin-400-normal.woff2` | `origin/claude/bill-presentation-video:presentation/public/fonts/newsreader-latin-400-normal.woff2` | `8536068e1fca064421e37775949b0e9224efa3ac` | Fontsource woff2 (SIL Open Font License), as bundled by the presentation project |
| `public/fonts/newsreader-latin-400-italic.woff2` | `origin/claude/bill-presentation-video:presentation/public/fonts/newsreader-latin-400-italic.woff2` | `a662767db6000b69cc0cb3d6e6888dfd056aa5ef` | Fontsource woff2 (SIL Open Font License), as bundled by the presentation project |
| `public/fonts/source-sans-3-latin-400-normal.woff2` | `origin/claude/bill-presentation-video:presentation/public/fonts/source-sans-3-latin-400-normal.woff2` | `0c4242ed44a6c899766a0787df07991094bc12b4` | Fontsource woff2 (SIL Open Font License), as bundled by the presentation project |
| `public/fonts/source-sans-3-latin-400-italic.woff2` | `origin/claude/bill-presentation-video:presentation/public/fonts/source-sans-3-latin-400-italic.woff2` | `515b6b332a5a1cd1423a077fa39884bc28c66764` | Fontsource woff2 (SIL Open Font License), as bundled by the presentation project |
| `public/fonts/source-sans-3-latin-600-normal.woff2` | `origin/claude/bill-presentation-video:presentation/public/fonts/source-sans-3-latin-600-normal.woff2` | `93511778f601f037194a86a011b356f298b4e035` | Fontsource woff2 (SIL Open Font License), as bundled by the presentation project |
| `public/fonts/caveat-latin-400-normal.woff2` | `origin/claude/bill-presentation-video:presentation/public/fonts/caveat-latin-400-normal.woff2` | `fb050a64b1c6182851ef6fdecdaa29d637952cda` | Fontsource woff2 (SIL Open Font License), as bundled by the presentation project |
| `public/textures/grain-1920.png` | `origin/claude/bill-presentation-video:presentation/public/textures/grain-1920.png` | `be6b14be6ae75cda234f0c69f9a30fa4be5170b2` | Grey noise texture, no image content (added in presentation commit fc00445); blended in overlay mode by `<Paper/>` (the page keeps its #FAF9F5 tone) |
| `public/ink/two-chairs.svg` | `origin/main:public/assets/ink/two-chairs.b97566e9b2.svg` | `3bbd8bcfa47850732d1e953ed06bbdebd0373008` | The site's exported pen drawing (seeded Pen, components/ink/ + lib/ink.ts); unmodified |
| `public/ink/path.svg` | `origin/main:public/assets/ink/path.963e014171.svg` | `06a5cfd5baf11334830d4446a61b16c119531a55` | The site's exported pen drawing (seeded Pen, components/ink/ + lib/ink.ts); unmodified |
| `public/ink/sailboat.svg` | `origin/main:public/assets/ink/sailboat.13078576fe.svg` | `7c58396b4ac5e2a2613e2688637fa1615d490171` | The site's exported pen drawing (seeded Pen, components/ink/ + lib/ink.ts); unmodified |
| `public/ink/bridge.svg` | `origin/main:public/assets/ink/bridge.a0bf3aaaf8.svg` | `cb3903be179bd0295db56ddc0c5fa23c3b5fd642` | The site's exported pen drawing (seeded Pen, components/ink/ + lib/ink.ts); unmodified |
| `public/ink/lighthouse.svg` | `origin/main:public/assets/ink/lighthouse.b6b8127f9b.svg` | `436f5d2fde131cb5ef566937e3059c2965dada95` | The site's exported pen drawing (seeded Pen, components/ink/ + lib/ink.ts); unmodified |
| `public/ink/house.svg` | `origin/main:public/assets/ink/house.1bec17b827.svg` | `8a8ea042ba2f1cb361ac73bd568d61cac860501d` | The site's exported pen drawing (seeded Pen, components/ink/ + lib/ink.ts); unmodified |
| `public/ink/travel-bag.svg` | `origin/main:public/assets/ink/travel-bag.5139bd84df.svg` | `86af4c4218d21b49e0545bdea94d21d1a9480efb` | The site's exported pen drawing (seeded Pen, components/ink/ + lib/ink.ts); unmodified |
| `public/ink/dock.svg` | `origin/main:public/assets/ink/dock.ccd6542ba7.svg` | `c9b46b0aa1a53088f9b33e5838c715e55f88c26c` | The site's exported pen drawing (seeded Pen, components/ink/ + lib/ink.ts); unmodified |
| `public/ink/workshop-notebook.svg` | code-drawn for this briefing with the site's seeded pen toolkit (origin/main:lib/ink.ts, components/ink/primitives.tsx, app/ink.css and the export step of scripts/build-ink.tsx; origin/guide/pre-retirement-guide:guide/art/kit.tsx), 2026-09-30; not a depiction of any real person | `4ef7ac9e7714a9b254f2be0422baad0f25e6e191` | An open ruled notebook (blank pages), folded reading glasses, one cup of coffee and a pen near the edge of a table. No writing. viewBox 1440×810 = the whole 1920×1080 frame at 4/3 (place with `width={1920}` at 0, 0); drawing in the right ~56 %. |
| `public/ink/crossroads-signpost.svg` | code-drawn for this briefing with the site's seeded pen toolkit (origin/main:lib/ink.ts, components/ink/primitives.tsx, app/ink.css and the export step of scripts/build-ink.tsx; origin/guide/pre-retirement-guide:guide/art/kit.tsx), 2026-09-30; not a depiction of any real person | `526c78919d46a32d4f37672adeb7120797ad782a` | A footpath coming toward us forks; a wooden signpost with two blank arms stands in the fork; spruces and a far treeline. Signs carry no text. viewBox 1440×810 = the whole 1920×1080 frame at 4/3 (place with `width={1920}` at 0, 0); drawing in the right ~56 %. |
| `public/ink/ledger-page.svg` | code-drawn for this briefing with the site's seeded pen toolkit (origin/main:lib/ink.ts, components/ink/primitives.tsx, app/ink.css and the export step of scripts/build-ink.tsx; origin/guide/pre-retirement-guide:guide/art/kit.tsx), 2026-09-30; not a depiction of any real person | `461d1213a371e73e83fe81d09a7d8f20171a7472` | An open account book ruled in rows and a few columns, a fountain pen across the right page, its cap beside the book. No figures, symbols or money. viewBox 1440×810 = the whole 1920×1080 frame at 4/3 (place with `width={1920}` at 0, 0); drawing in the right ~56 %. |
| `public/ink/desk-clock.svg` | code-drawn for this briefing with the site's seeded pen toolkit (origin/main:lib/ink.ts, components/ink/primitives.tsx, app/ink.css and the export step of scripts/build-ink.tsx; origin/guide/pre-retirement-guide:guide/art/kit.tsx), 2026-09-30; not a depiction of any real person | `be82955a0bf74b9ccb5f53e6eed7d69e2271ba31` | A small arched mantel clock (plain ticks, no numerals, hands at twenty past eleven) and a closed book at the edge of a table. viewBox 1440×810 = the whole 1920×1080 frame at 4/3 (place with `width={1920}` at 0, 0); drawing in the right ~56 %. |
| `public/ink/system-map.svg` | code-drawn for this briefing with the site's seeded pen toolkit (origin/main:lib/ink.ts, components/ink/primitives.tsx, app/ink.css and the export step of scripts/build-ink.tsx; origin/guide/pre-retirement-guide:guide/art/kit.tsx), 2026-09-30; not a depiction of any real person | `5867ff697df584508c6b97c436dd24c0bbf18804` | Eight small objects on one table in one perspective: building (site/VPS), filing cabinet (records), envelope (email), desk calendar (calendar), receipt (payment), film roll (recordings), gears on a small bench (automation), padlock (backups). No text; labels and connectors are UI, placed from `src/data/ink/system-map.anchors.json`. viewBox 1440×810 = the whole 1920×1080 frame at 4/3 (place with `width={1920}` at 0, 0); drawing in the right ~56 %. |
| `public/ink/road-markers.svg` | code-drawn for this briefing with the site's seeded pen toolkit (origin/main:lib/ink.ts, components/ink/primitives.tsx, app/ink.css and the export step of scripts/build-ink.tsx; origin/guide/pre-retirement-guide:guide/art/kit.tsx), 2026-09-30; not a depiction of any real person | `3614431d20cf691b573f3278e5465f16822d4c11` | A country road winding away to far hills with six small blank wooden posts along its edge at even steps on the page. Labels are UI, placed from `src/data/ink/road-markers.anchors.json`. viewBox 1440×810 = the whole 1920×1080 frame at 4/3 (place with `width={1920}` at 0, 0); drawing in the right ~56 %. |

## Drawings made for this briefing

The six drawings above whose source reads "code-drawn for this briefing" were not copied from a branch. They
were written as code on 2026-09-30 in a detached worktree of `origin/guide/pre-retirement-guide` (749b360, never
modified), using the site's seeded `Pen` (`lib/ink.ts`), its paint components and ink CSS
(`components/ink/primitives.tsx`, `app/ink.css`) and the guide's drawing kit (`guide/art/kit.tsx`: `Sketch`,
pinhole cameras, hatch/wash helpers), and exported with the same standalone-SVG step as `scripts/build-ink.tsx`
(site CSS and wash filter inlined, identical class names: `ink`, `ink soft`, `hatch`, `hatch soft`, `pencil`,
`wash <tone>` › `wash-fill`/`wash-edge`). Seeds are fixed, so a rebuild is byte-identical. The editable sources
(`notebook.tsx`, `crossroads.tsx`, `ledger.tsx`, `clock.tsx`, `systemmap.tsx`, `road.tsx`, shared `lib.tsx`,
export `build.tsx`) are kept with the art lane's output (`briefing-out/art/source/`); they import the kit by
relative path and need that worktree to rebuild. No image generator, photo, trace or likeness was used; no
signature. One light for all six (upper left, a little behind: shade on right faces, shadows thrown right and
toward the viewer).

- `src/data/ink/system-map.anchors.json`, `src/data/ink/road-markers.anchors.json`: written by the same build
  from the drawing's own geometry. Frame pixels (1920 × 1080) for the frame-sized placement; each object's or
  post's ink-box centre, box, and base (where it meets the ground); posts also give their top and road side.

## Derived files

- `src/data/ink/*.json` and `src/data/ink/index.ts` are generated from `public/ink/*.svg` by `npm run ink`
  (`scripts/prep-ink.mjs`): each drawing's strokes split into single pen strokes, made absolute and measured. The
  geometry is the site's; nothing is redrawn.
- The ink/wash split the presentation project made as separate files (`presentation/public/ink/*.ink.svg`,
  `*.wash.svg`, via `presentation/scripts/split-ink.mjs`) is done here at render time from the same class names, so
  those files were not copied.

## Code reused (adapted, not copied as files)

| Here | From |
|---|---|
| `src/brand.ts` tokens, easing, motion rules | `origin/claude/bill-presentation-video:presentation/src/brand.ts`; palette per `origin/main:docs/ART-DIRECTION.md` |
| `src/fonts.ts` | `origin/claude/bill-presentation-video:presentation/src/fonts.ts` |
| `src/primitives/time.tsx` (sec, progressAt, appearAt, Reveal) | `origin/claude/bill-presentation-video:presentation/src/primitives/time.tsx` |
| `src/primitives/pen.ts` (`rng`, `line`) | `origin/claude/bill-presentation-video:presentation/src/primitives/pen.ts` |
| `<Paper/>` grain treatment | `origin/claude/bill-presentation-video:presentation/src/primitives/basics.tsx` (`Paper`) |
| `<InkDraw/>` wash filter and ink colours | the drawings' own `<style>`/`<filter>` (`origin/main:components/ink/primitives.tsx`, `app/ink.css`) |
| `remotion.config.ts`, `scripts/qa.mjs` structure | `origin/claude/bill-presentation-video:presentation/remotion.config.ts`, `presentation/scripts/qa.mjs` |

## Deliberately not used

- `presentation/public/photos/bill-portrait.jpg` and any other photo of Bill; no likeness of Bill of any kind,
  AI-generated or otherwise.
- Any audio: not the site's `public/audio/journey/en.mp3` (a voice clone speaking as Bill, decisions.md D-052), not
  the film/ voice, music or effects (ElevenLabs free plan, non-commercial).
- film/ Canva AI art (unchecked terms, D-052) and the presentation's copy (superseded offers, D-049).
- The guide's plates (`presentation/public/plates/`, guide art): not needed for the proof; copy with provenance if a
  scene needs one.
- `origin/integration:public/assets/ink/hiker.7cb9a1198d.svg`: a layer of the site's mountain ride, not a spot
  drawing (different class vocabulary); prep-ink.mjs does not support it.
