# Storyboard — "A life taking shape" (sketchbook redesign)

The film is one warm ivory sketchbook page. Loose navy pen-and-ink drawings draw themselves, small blue-grey washes
bloom in behind them, handwritten notes appear beside them, Bill's footage sits on the page as taped photo prints, and
one thin **brass line** quietly runs through the film (an underline, a path, a bridge, a horizon, a shoreline). It is
never labelled or explained.

Emotional arc: **uncertainty → clarity → confidence.** Life first, money second: financial words (RRSP, TFSA, RRIF,
QPP, taxes…) only ever appear as small handwritten annotations. The last feeling is trust: sitting down with Bill.
Theme (signature, end card only): *Voir plus clair pour la suite.*

## The kit (the only building blocks)

Everything is in `src/components/sketch` (import from `'../components/sketch'`):

| Component | Use |
|---|---|
| `InkDrawing name start duration left top width opacity` | a drawing that draws itself (ink first, then the wash). Fully drawn at `start + duration * DRAWN` (DRAWN = 1.32). Names: see `src/data/illustrations.json` (sizes there). |
| `Handwriting text start speed left top width variant color rotate align exit` | handwriting that writes itself (Caveat); `variant`: handLarge 84 · hand 52 · note 40 · tiny 34 px; or serifLarge 96 · serif 64 · serifItalic 44 · small 26 (Lora) for the few "typeset" lines. `writeFrames(text, speed)` = frames it takes. |
| `InkLayer` + `InkStroke d start duration until color width` | pen marks; paths from `underline strike tick loop arrow handPath` (stage px). |
| `BillPrint slot from to left top width height rotate arrive focus zoom clipStart` | Bill as a taped photo print (his footage when it exists, his portrait until then). |
| `TapedPrint`, `Clipping src size left top width rotate arrive tape` | taped prints / clippings of the real guide (`guide/story.png` 3109×535, `guide/question.png` 3109×495, `guide/checklist.png` 3109×1145, `guide/spending.png` 3109×1291). |
| `GuideObject left top width rotate arrive` | the real guide booklet (cover rebuilt from the PDF), lying on the page. |
| `BrassLine points start duration until width` | the brass line (hand-wobbled, drawn with a pen tip). |

Also allowed: `Camera`, `useT`, `W`, `H` from `components/stage`; `sketch` from `design/palette`; `sketchType`, `HAND`,
`SERIF` from `design/typography`; `ease`, `tween`, `keys`, `inOut`, `lerp`, `clamp01` from `design/motion`; `at`,
`endOf`, `wordAt`, `FPS` from `timing/timing`; `SCENES` from `timing/scenes`; `copy` from `design/copy`;
`AbsoluteFill` / `interpolate` from remotion. `src/checks/DesignKit.tsx` shows every component in use.

**Not allowed:** the old components (GoldenPath, LifeMoments, BlindSpotIndex, BlindSpotVisuals, DocumentCard,
LowerThird, Brand, Sailboat, GuideCover directly), the old `palette` colours (teal, coral, gold…), `<Paper />` or any
background in a scene (the page is drawn once under the whole film), CSS transitions/animations, `Math.random()`
(use `random(seed)` from remotion), any new image, any image generation or processing.

## Rules for every scene

- **Timing from the narration only**: `at('line-id', s)`, `endOf(...)`, `wordAt('line-id', 'word', 's'|'e', s)`. Never
  hard-code frame numbers (the voice may be re-recorded by Bill). Scene props are absolute frames `{from, to}`.
- **Copy**: every visible word comes from `copy` (src/design/copy.ts), verbatim. If you truly need a new string, put it
  in a local `const` at the top of your file with a `// NEW COPY` comment and report it.
- **Calm**: slow camera only (a push-in of a few percent, or one slow pan), drawings reveal over 2–4 s, nothing bounces,
  nothing flies in. Prints/clippings *land* (the built-in `arrive`). Leave lots of empty paper.
- **Dissolves**: consecutive scenes overlap by a few frames and cross-dissolve on the same page (handled by the Scene
  wrapper). Don't fade out your whole scene yourself; do fade/erase individual elements inside it when the page needs to
  clear.
- **Layout**: 1920 × 1080 stage. Keep text inside x 96–1824, y 64–1016. While the narrator speaks, keep important
  text out of the caption band (x 210–1710, y 880–1000); captions are an optional overlay. Handwriting ≥ 34 px, the
  disclaimer ≥ 24 px. Ink on ivory is high-contrast; brass is for the line only (not for text).
- **Bill**: never generate, draw or alter a picture of Bill. He appears only through `BillPrint`/`BillShot` slots.
  His prints should be generous (≥ 480 px wide) — he needs to be on screen 30–40 % of the film in total. The drawn
  people are anonymous clients, never "Bill".
- **Compliance**: no promises, returns, percentages, charts, arrows going up, scores or ratings (never "2/5 BAD 5/5
  GREAT"), no money piles, no luxury, no handshakes. The five blind spots are *studies*, not a ranked list.
- **Avoid list (brief)**: bank ads, fintech, luxury, stock-animation clichés, glowing graphs, skyscrapers, handshakes,
  dramatic success imagery, yachts/mansions, motivational slogans.
- **Performance**: at most ~5 InkDrawings mounted at once in a scene (each is a canvas); unmount what is gone (render
  conditionally on `t`).

## The brass line (one line, many roles)

| Scene | The line is… |
|---|---|
| intro | born: a short brass underline under Bill's handwritten name, on "…more important than **numbers**" |
| life | the underline of "Your life." — and it drifts on a little, as if it wants to go somewhere |
| pieces | it reaches from one document towards the others on "who's looking at how they all fit together?" and **stops short** (`until` ≈ 0.6) |
| guide | the path through the meadow (`meadow-path`), traced over the drawn footpath: the clearer next step |
| simple | a single small brass touch on the notebook page: "an honest **starting point**" |
| plan | the **bridge**: on "and build one coordinated plan" it finally runs through every note in one unbroken path (the only chime in the film). Then it becomes the **horizon** of the calm sea (`sailboat-calm`) on "a plan we revisit as your life changes", with the years written along it. At the end of the plan scene it lies horizontally at **y ≈ 610**, across the frame. |
| role | it continues from **y ≈ 610** at the left edge of the drawing and becomes the lakeside path the couple walks on (`couple-walking`) |
| invite | a short underline under the handwritten **billbadran.com** |
| end | the shoreline under the two chairs (`lake-chairs`), and it extends as the thin rule of the end card |

Nowhere else. Consecutive appearances (plan → role → invite → end) should feel like the same line moving on.

## Scenes

Times are film seconds (narration line → start). Ranges come from `src/timing/scenes.ts`.

### A1 · intro (0 → 12.3 s) — `IntroBill.tsx` · owner A
"Hi, I'm Bill Badran. I'm a financial planner. / And to me, a financial plan should start with something more important
than numbers."
Bill's print (slot `intro`) lands on the page right of centre, large (≈ 620 × 760). His name writes itself beside it
(`copy.intro.name`, handLarge), then `copy.intro.role` (serifItalic or note). On "numbers" the brass line is born as the
underline of his name. Pen/writing sounds.

### A2 · life (11.8 → 23.2 s) — `LifeGoals.tsx` · owner A
"Your life. / The retirement you're looking forward to. / The people you want to take care of. / The freedom to do more
of what matters to you."
Fragments of a real life. "Your life." (`copy.life.title`, serifLarge or handLarge) is written; the brass line underlines
it. Then three small drawings appear one per line, scattered like fragments on a page, not in a grid: `cafe-map` (trip),
`grandparents` (grandkids), `easel-garden` (painting), each with its handwritten note (`copy.life.*`). They are **not
connected** — no line between them yet.

### A3 · credibility (22.5 → 34.2 s) — `Credibility.tsx` · owner A
"For more than fifteen years, I've worked with individuals and families… / And I've noticed something."
Bill again (slot `credibility`), a different placement from the intro (e.g. left). Two small notes: `copy.credibility.years`,
`copy.credibility.who`. The page is quiet; on "noticed something" the notes can fade to leave only Bill.

### A4 · approach (124.9 → 129.2 s) — `Approach.tsx` · owner A
"That's how I approach financial planning, too."
Bill (slot `approach`) — a large print, calm. **Hand-off contract with the plan scene:** at the end of the approach
scene the print must be at exactly `left 1140, top 170, width 560, height 700, rotate -1.4`, `clipStart =
SCENES.approach.from`. The plan scene starts with the identical print at that spot (same props), so it continues
through the dissolve without a jump.

### B1 · pieces (33.6 → 61.4 s) — `Pieces.tsx` · owner B
"People work hard. / They save. / They try to make good decisions. / But often, their financial lives
have grown one piece at a time. / A retirement account here. / An insurance policy there. / A will that hasn't been
reviewed in years. / Each piece may make sense on its own. / But who's looking at how they all fit together?"
Uncertainty. `couple-talking` (a couple at the kitchen table at night) draws itself; the notes `work hard`, `save`, `try
to decide well` are written one per line. On "one piece at a time" the page clears and the pieces arrive one by one,
scattered, each drawn separately with its handwritten tag: `statement` (+ `copy.pieces.account`), `policy`
(+ `copy.pieces.policy`), `will-folder` (+ `copy.pieces.will`). "Each piece may make sense on its own": a small tick by
each. "Who's looking at how they all fit together?": the brass line reaches from one piece toward the others and stops
short; `copy.pieces.who` is written, a little apart.

### B2 · guide (60.8 → 71.6 s) — `GuideReveal.tsx` · owner B
"That's why I created The Guide to Financial Prosperity. / To help you see the bigger picture — and take a clearer next
step. / Inside, we explore…"
The first breath of clarity. The real guide (`GuideObject`) is laid on the page with a note `copy.guide.note` and a small
arrow. Then `meadow-path` draws itself; on "clearer next step" the brass line traces its footpath. Notes:
`copy.guide.bigger`, `copy.guide.step`. A page-turn sound as the guide lands / opens.

### C1 · blindspots (70.8 → 100.6 s) — `BlindSpots.tsx` · owner C
"Inside, we explore five common blind spots. / Finances that are scattered… / Focusing on returns without understanding
fees and taxes. / Letting fear drive investment decisions. / Guessing what retirement will actually cost. / And asking for
advice after a major decision… / They're easy mistakes to make…"
`copy.blindspots.heading` handwritten. Five small studies along one long sketchbook strip; the camera drifts slowly from
one to the next on each line (m1…m5). Each: a drawing + a small handwritten numeral (1–5, no scores) + its note.
m1 `kitchen-table` (papers scattered) + `m1` · m2 `coin-jar` + `m2`, with tiny `fees` / `taxes` notes and pen arrows
pointing at the coins slipping out · m3 `sailboat-rough` + `m3` · m4 `home` + `m4` and the list `m4lines` written one
under the other · m5 `keys-document` + `m5`. No brass line here. On "easy mistakes…" (100.1 s) the strip settles/fades
as the next scene takes over.

### C2 · simple (99.9 → 125.4 s) — `SimpleGuide.tsx` · owner C
"They're easy mistakes to make, especially when nobody has shown you what to look for. / So I've kept this guide simple. /
Everyday examples. / Practical questions. / No complicated jargon. / And at the end, five questions… / You don't need
perfect answers. / You just need an honest starting point."
Bill (slot `mistakes`) through "easy mistakes…" and "kept this guide simple". Then clippings of the real guide land one per
line with a handwritten note: `guide/story.png` + `examples`, `guide/question.png` + `questions`; `jargon` is written and
struck through; `guide/checklist.png` + `five`. "You don't need perfect answers": the page clears to `notebook` (blank
page, pencil) drawing itself. "An honest starting point": `start` is written by the page and the brass line touches down
as one small mark on the notebook page.

### D1 · plan (128.7 → 154.7 s) — `Plan.tsx` · owner D
"We start with you: your family, your priorities, your goals. / Then we look at the whole picture — your investments,
taxes, insurance, retirement, and estate planning — / and build one coordinated plan. / A plan we revisit as your life
changes."
Conversation → connection → calm. Starts with Bill's print where the approach scene left it (contract above) and the
`conversation` drawing (two cups, an open notebook) drawing itself beside him: sitting down together. Bill listens
(his print stays, then gently shrinks/moves aside). `you` is written at the centre of the page; `family`, `priorities`,
`goals` around it, close. Then, a little further out, the small annotations `investments`, `taxes`, `insurance`,
`retirement`, `estate` (tiny/note size — life over money). On "build one coordinated plan" the brass line runs through
all of them in one unhurried path (the bridge) and `one` is written; chime. On "revisit as your life changes" the page
clears to `sailboat-calm` (the calm echo of the rough sea in blind spot 3) and the brass line becomes its horizon at
y ≈ 610, with `years` written along it and `revisit` as a note.

### D2 · role (154.0 → 161.8 s) — `Closing.tsx` → `Role` · owner D
"My role is to help you understand your choices and how they connect to the future you want."
Bill (slot `role`) on one side; `couple-walking` draws itself on the other; the brass line enters at y ≈ 610 and becomes the
lakeside path they walk on, on "**connect** to the future you want".

### D3 · invite (161.3 → 170.7 s) — `Closing.tsx` → `Invite` · owner D
"Take a few minutes to read the guide. / And when you're ready, let's talk about what matters to you. / You've worked hard
for what you have."
Quiet morning: `morning-porch` (a cup by the lake) draws itself softly in the background or to one side; the guide
(`GuideObject`) lies on the page; Bill's print (slot `invitation`); `copy.invite.url` handwritten with the brass underline.

### D4 · end (170.0 → 180.3 s) — `Closing.tsx` → `EndCard` · owner D
"Let's build a plan for what comes next." (narration ends at 173.3 s; the last 7 s are music and the end card.)
`lake-chairs` (two chairs by the water) draws itself; the brass line is its shoreline. After the last line the end card
writes/fades in over the lower paper, word for word from `copy.end`: headline (serif), name, role, CTA, url, language
line, disclaimer (small, ≥ 24 px, fully legible), and the signature `copy.end.signature` in handwriting. Everything must be
readable on the last frame and inside the safe area.

## Sound (returned as requests, wired centrally)

Available effects: `pen` (pen sketching; the start of a drawing), `write` (a handwritten note, longer) / `write-short`
(one word), `page` (a page turning), `paper` (a print, clipping or booklet laid on the page), `cup` (a cup set down),
`chime` (only for the plan's line connecting), `swell` (a soft rise under the end card). Ambience beds (from–to):
`lake` (water lapping, for water drawings), `room` (quiet room tone; always on). Don't overdo it: 1 sound per visual
event at most, and none on most handwriting — the voice is the hero. Each request: frame expression (e.g.
`"wordAt('save', 'save', 's', -0.1)"`), sound, volume 0–1, note.

## Checking your work

`node tools/scene-stills.mjs <scene> [seconds…] [--every=2] [--scale=1]` renders stills of ONE scene in isolation
(the other scenes are not bundled) into `out/scenes/<scene>/`, plus a contact sheet. Look at them (Read the PNG/JPG) —
several points per beat, including the first and last frames and mid-reveal frames. `npx tsc --noEmit` must be clean for
your files.
