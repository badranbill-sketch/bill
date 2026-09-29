# Art direction

The site should make a visitor near retirement feel: _I trust this person. He understands people like me. I would feel comfortable sitting down with him._ It is a practice built around a real person and real conversations. It should not look like a bank, an insurer, a fintech or a wealth-management firm.

**Core emotion:** authenticity + calm + trust + humanity + quiet competence.

**The contrast that makes it work:** human, hand-drawn illustrations set in precise typography, generous spacing and a disciplined layout. The drawings are loose; the website is exact.

## Palette: navy ink on warm paper

| Token          | Hex     | Use                                                             |
| -------------- | ------- | --------------------------------------------------------------- |
| `--navy`       | #0E2233 | ink, headlines, body text                                       |
| `--navy-2`     | #173450 | secondary ink, handwritten notes                                |
| `--paper`      | #FAF9F5 | the page                                                        |
| `--ivory`      | #F5F2EA | alternate sections, cards                                       |
| `--blue-grey`  | #A7B4C3 | watercolour (water, sky, shadow), pencil lines                  |
| `--stone`      | #C9C0B1 | watercolour (wood, paper, earth), quiet rules                   |
| `--brass`      | #A8875A | small marks only: ticks, a dot, one underline. Never body text. |
| `--brass-soft` | #C9A874 | warm watercolour (coffee, lamplight, sunrise)                   |
| `--muted`      | #4E5B68 | secondary text (passes 4.5:1 on paper and ivory)                |
| `--brass-ink`  | #7A5D33 | the rare brass-coloured text that must stay legible             |

Brass is an accent, never a fill. Nothing gold, nothing glossy.

## Type

- **Headlines:** Newsreader (300 and 400, italic for a spoken aside). Magazine headlines, not ad headlines: sentence case, moderate size, generous leading.
- **Body, navigation, labels, buttons, forms:** Source Sans 3, a humanist sans. 18 px body, 1.7 line height.
- **Handwriting:** Caveat, for Bill's margin notes only. A few per page at most, and never carrying information someone needs.
- **Avoid:** all caps everywhere, geometric display faces, heavy bold, giant SaaS headlines. Small labels are sentence case with a brass tick, not letter-spaced capitals.

## Illustrations

**The medium:** editorial pen-and-ink by a trained hand, like an architect's presentation sketch or a quiet illustration in a serious magazine. It is still drawn, not vector clip-art, but it is finished work: Bill advises people with real money and real decisions, and the drawings must look like they belong to someone careful. You should see:

- steady, tapered ink lines: horizontals level, verticals plumb, ellipses true;
- a clear line hierarchy and engraver's hatching for shadow;
- a few pale washes, slightly off the line but clearly belonging to an object;
- a handful of faint pencil construction marks, no more;
- handwriting only where something is actually written;
- a lot of untouched paper.

**The subject is life, not finance:** an open notebook with reading glasses and coffee, a window onto a lake, two chairs, a dock, a home, a travel bag, a path, a bridge, a lighthouse, a sailboat. Financial terms (REER, CELI, FERR, RRQ, PSV / RRSP, TFSA, RRIF, QPP, OAS) may appear as small notes, never as the subject. _Your money exists to support your life._

**How they are made:** in code, from `lib/ink.ts` (a seeded `Pen`) and `components/ink/primitives.tsx`. Seeds are fixed, so drawings are identical on every render.

- `Pen.stroke/line/poly/ellipse` → `<Ink d>`. Three weights only: contours w 1.3–1.6, secondary 0.8–1.0, details 0.5–0.7. Keep `wobble` at 0.3 or less and never overshoot a frame or a long line visibly. `Pen.twice` is for the one to three most important contours in a scene.
- `Pen.hatch(poly, {angle, gap, density})` → `<Hatch d w>`, w 0.4–0.5, gap 2.8–4. Hatch like an engraver: parallel, evenly spaced, ends inside the outline, one light direction per scene (from the upper left, so shade falls right and under). Form and cast shadows only. Cross-hatch only the deepest shadow, never a whole treeline or hillside.
- `Pen.blob(poly, spread)` → `<Wash d tone strength>`, 2–4 per scene, pale. A wash follows the outline of the object it tints (built from the same points, at most 2–3 units off) and is never larger than it. No smears that belong to nothing and no wash hanging in the air. The sky is usually untouched paper; water can be one horizontal band. Blue-grey and stone; brass-soft for one small warm accent (sun, coffee, lamp, bookmark); navy only at strength ≤ 0.3.
- `Pen.pencil(a, b)` → `<Pencil d>`: zero to three short construction marks per scene, running no more than about 8 units past a frame and never through an object. Ruled lines on paper are fine.
- `<Note>` (Caveat) only for what is literally written inside the scene: notebook entries, a letter, an envelope, the photo caption. 16–26 units, rotated −4° to +3°, in French and English.
- `<Label>` (serif italic, 12–15 units, optional hairline leader to the object) for anything else that names something. At most one per spot drawing. No floating slogans.

**Vocabulary:**

- Conifer treeline: one even silhouette of small regular spires (heights ±15%), filled with fine vertical hatch or a pale flat tint. Never a zigzag scribble.
- Single spruce: a straight trunk with tiers of short strokes angled down. Deciduous tree: one smooth canopy contour with at most five gentle lobes, a few inner strokes and a tapered trunk. No cartoon cloud bumps.
- Clouds: two or three long, thin horizontal streaks or a pale tint. No scalloped cartoon clouds.
- Water: evenly spaced short horizontal strokes, sparser away from objects; reflections as broken verticals.
- Hills: one clean contour; distant ones lighter.
- People: never stick figures or cartoon characters. Small architectural scale figures: adult proportions (about 7.5 heads), a filled ink silhouette with simple clothing (coat, trousers), no face.
- Objects in correct perspective, with cup and table ellipses consistent with the eye level.
- One focal object per drawing. Edges fade into the paper through line density, not hard crops.

**Size budget** (markup, measured with `node --import tsx scripts/ink-size.tsx <module>`): hero desk ≤ 60 KB, dock ≤ 55 KB, two chairs ≤ 40 KB, each vignette ≤ 12 KB, ride main layer ≤ 110 KB. Fewer, better marks.

**Preview while drawing:**

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium node --import tsx scripts/ink-preview.tsx components/ink/desk.tsx HeroDesk /tmp/desk.png 900 1.5
```

Pages don't render these components inline: `npm run ink` (run before `dev` and `build`) exports them to `public/assets/ink/` as standalone SVG files, turning notes and labels into outlines, and the page links to the file. Run it again after changing a drawing. The drawings live in `components/ink/desk.tsx` (the hero), `meeting.tsx` (two chairs, the dock) and `vignettes.tsx` (eight spot drawings). The ride has its own compact pen in `lib/terrain.ts`. To stay within the size budget, the drawings merge strokes into a few paths and write them as relative commands. Copy that approach rather than adding more hatching.

## Photography

Use Bill's real photograph: natural light, relaxed, never a corporate pose. For now there is one portrait (`public/assets/bill-portrait.jpg`). It sits inside the drawn world like a print tucked into the notebook, with a line of ink or a handwritten note near it.

Wanted from a photo session:

- Bill seated at his desk in daylight;
- Bill listening across a table;
- a candid moment looking slightly away from the camera.

## Composition

Editorial, not blocks:

- narrow text columns and asymmetric layouts;
- large illustrations with margin notes, thin rules and small captions;
- sections of different heights, some nearly empty;
- a full-width drawing now and then.

Avoid the title / text / card rhythm. On mobile, keep it intimate. Illustrations come between sections like pages of a book and may bleed to the screen edge. The main call to action stays near the top.

## One action, repeated naturally

**Planifier une première rencontre / Plan a first meeting.** No "book now", no urgency, no sticky banners or pop-ups. _The door is open._

## Motion

Calm and barely noticed:

- illustrations are revealed once by a slow, soft mask as they come into view;
- the mountain ride's camera moves with the scroll, with gentle parallax.

Nothing else moves:

- no hover animation (an underline may change colour instantly);
- no text animation after the hero;
- no bounce, overshoot, zoom, particles or glow.

With `prefers-reduced-motion`, nothing moves at all.

## The authenticity test (for every section)

- Could this appear on any financial advisor's site? → Redesign it.
- Does it read like advertising? → Simplify it.
- Does it look expensive for the sake of it? → Remove it.
- Would someone approaching retirement understand it? → If not, rewrite it.
- Does it make Bill feel more trustworthy? → If not, it doesn't belong.
