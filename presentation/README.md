# The other side of the table — Bill Badran presentation video

Remotion 4 · 1920×1080 · 30 fps · 4:44 (8,520 frames). Calm, editorial, fully readable muted.

## Run it

```bash
npm i
npm run dev                      # Remotion Studio: BillPresentation, plus each scene under "Scenes"
npm run render                   # out/bill-presentation.mp4 (h264, crf 18)
npm run qa                       # reading time, runtime, banned words, no spring(), brass report
node scripts/stills.mjs 12.5 90  # stills at those seconds (no args = every scene's midpoint) + contact sheet
```

In a sandbox without Remotion's own Chrome download, point `REMOTION_BROWSER` at a local headless Chromium
(e.g. `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`).

## Where things live

| What | File |
|---|---|
| Every word on screen, EN + FR, and when it appears (`at: [from, to]` in seconds from the scene start) | `src/content.ts` |
| `LANG` (`'fr'` switches every line that has a French version) and `AUDIO` | top of `src/content.ts` |
| Brand tokens, easing, motion rules | `src/brand.ts` |
| Art that arrives with the asset pack (cover, BB-sunrise mark, lockup, QR) | `src/assets.ts` |
| Scenes | `src/scenes/` (Opening S00–S02, Audience S03–S04, Identity S05, Journey S06–S11 + rail, Asks S11b–S11d, Close S12) |
| Primitives (InkDrawing, Handwrite, Caption, StatusTag, Signpost, BookFlip, DecisionCard, Flywheel, Timeline, Post…) | `src/primitives/` |

## Art

- **Website pen drawings** (two chairs, left chair, path, sailboat) come from the `bill` repo, split into an ink layer and a
  wash layer by `scripts/split-ink.mjs`. The pen reveals the ink left to right, then the wash blooms in.
- **Book plates** (`public/plates/`) are the printed guide's own drawings, rendered from the guide's source (`tools/plates.tsx`) with every
  word removed (no notes, labels or numbers), so the book flip shows no text from inside the book.
- **Bill's photo** is the real supplied portrait (`public/photos/bill-portrait.jpg`), with a ≤3% slow push-in.
- **Stand-ins until the pack arrives:** the cover (a quiet navy cover built from the guide's cover drawing), the mark
  (a neutral circle-and-sunrise glyph, not the BB-sunrise logo), the lockup (mark + "Bill Badran" in Newsreader) and the
  QR (deliberately not scannable). Drop the real files in `public/` and set their paths in `src/assets.ts`.

## Audio

Set `AUDIO = true` and add `public/audio/voiceover.mp3` and `public/audio/music.mp3`. Music ducks 12 dB under the
voice-over windows, which are the caption lines (`VOICE_WINDOWS` in `content.ts`).

## Still open

- French copy and Bill's sign-off (all `fr` fields are empty and fall back to English).
- The QR: replace only once `billbadran.com/guide/book` is live and tested (the route doesn't exist on the site yet).
- The profile card says "Bill Badran Financial Planning", as in the brief; the site and guide avoid "financial planner"
  wording until his title is confirmed, so check this with Bill / compliance before the video is shared.
- Status tags reflect the brief; confirm them at render time.
