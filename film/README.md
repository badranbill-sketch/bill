# Bill Badran — explainer film

A 3-minute brand film (1920 × 1080, 30 fps) built in Remotion + React + TypeScript, in the style of the brief
**"A life taking shape"**: a warm ivory sketchbook page where loose navy pen-and-ink drawings draw themselves, soft
blue-grey washes bloom in behind them, handwritten notes appear beside them, and Bill's footage sits on the page as
taped photo prints. One thin **brass line** runs quietly through the film (an underline, a path that stops short, a
bridge, a horizon, a shoreline) and is never explained. The arc is *uncertainty → clarity → confidence*; life comes
first, and financial words only appear as small handwritten notes. The storyboard is `docs/storyboard.md`.

> **Before anyone outside the project sees it**, these placeholders need replacing or clearing (details below):
> 1. **The voice is a temporary synthetic voice ("Jonathan", ElevenLabs). It is not Bill** and not a clone of Bill.
> 2. **Bill's on-camera shots are his photo** (a slow push-in inside each print) until his footage is dropped in.
> 3. **Licences.** The voice, the music and the sound effects were generated on an ElevenLabs **free** plan, which does
>    not allow commercial use. Upgrade the ElevenLabs plan (and regenerate, or check that it covers earlier
>    generations), or replace them, before the film is published. The drawings were generated with Canva's AI
>    image tool: check Canva's AI product terms (canva.com/policies/ai-product-terms) for commercial use.
> 4. **Pronunciation.** The synthetic voice says "Badran" one way. Confirm it with Bill (it does not matter once his
>    own recording replaces it).

---

## 1. Preview and render

Install the dependencies once with `npm i` (needs Node 18+ and ffmpeg).

| What | Command | Result |
|---|---|---|
| Preview in the browser | `npm run dev` | Remotion Studio at http://localhost:3000. **BillBadranFilm** is the film; the *Scenes* folder has each scene on its own. |
| Render the film | `npm run render` | `out/bill-badran-film.mp4`, audio mastered to −16 LUFS / −1.5 dBTP (web standard). |
| Render with burned-in captions | `npm run render:captioned` | `out/bill-badran-film-captioned.mp4` (for social feeds that autoplay muted). |
| QC stills | `npm run qc` | `out/qc/`: the brief's 12 timestamps plus `contact-sheet.jpg`. |
| Any frame as a PNG | `node tools/stills.mjs 12.5s 2400` | `out/stills/` (seconds with an `s` suffix, otherwise frame numbers). |
| Stills of one scene | `npm run scene -- pieces --every=2` | `out/scenes/pieces/` + a contact sheet. Bundles only that scene, so it is quick. |
| Lint and typecheck | `npm run lint` | |

For YouTube or a website, upload the uncaptioned MP4 **plus** `public/captions/narration.srt` (or `.vtt`) as the
caption track.

## 2. How the timing works

Everything is timed from the narration, so nothing is hard-coded in seconds:

```
script/script.json ──(npm run voice:*)──▶ public/audio/narration.wav
   the exact script,                       src/data/timing.json    ◀── narration timing JSON: every line and word
   one entry per line                      public/captions/narration.srt / .vtt
                                                     │
               src/timing/timing.ts  at('line-id', +0.3) · endOf(…) · wordAt('line-id', 'word')
                                                     │
      src/timing/scenes.ts (scene ranges)  ·  src/scenes/*.tsx (each beat)  ·  src/audio/cues.ts (music and effects)
```

When the voice changes (new take, Bill's recording), every scene, drawing, note, effect and caption follows
automatically.

**The current voice** is ElevenLabs "Jonathan — Warm Executive Narrator" (eleven_multilingual_v2), slowed to 0.91×
without changing pitch so it sounds unhurried. The four source takes are in `assets/voice/jonathan/`, and
`npm run voice:import` rebuilds the narration and timing from them.

## 3. Replacing the narration with Bill's recording

**Recording.** Bill reads `script/script.json` in order: one line per entry, in a quiet room, with a pause
between lines. Retakes are fine: he repeats the line and **the last good take wins**. The file can be one long
recording or several (wav, mp3, m4a, mov, mp4…).

**On camera.** Bill appears as photo prints taped into the sketchbook. Film each moment below as one continuous take
and save it as `public/video/bill-<slot>.mp4` (H.264, 30 fps, 1080p or 4K). Each print is a portrait-ish window
(about 4 : 5), framed from the chest up: leave headroom and centre him. **Direction:** calm and warm, seated, as if
talking to one person across a table (a notebook and a cup nearby are welcome). In the `approach` take he finishes
his line and then **listens** for about ten seconds: small nods, no talking. He is the planner who listens, not a
salesman.

| File | On screen | Bill says, to camera |
|---|---|---|
| `bill-intro.mp4` | 0:00–0:12 | "Hi, I'm Bill Badran. I'm a financial planner. And to me, a financial plan should start with something more important than numbers." |
| `bill-credibility.mp4` | 0:23–0:34 | "For more than fifteen years, I've worked with individuals and families to help them plan for goals like these. And I've noticed something." |
| `bill-mistakes.mp4` | 1:40–1:54 | "They're easy mistakes to make, especially when nobody has shown you what to look for. So I've kept this guide simple. Everyday examples. Practical questions. No complicated jargon." |
| `bill-approach.mp4` | 2:05–2:17 | "That's how I approach financial planning, too." Then about **12 seconds of listening** (no talking) while his voice-over continues "We start with you…". |
| `bill-role.mp4` | 2:34–2:42 | "My role is to help you understand your choices and how they connect to the future you want." |
| `bill-invitation.mp4` | 2:41–2:51 | "Take a few minutes to read the guide. And when you're ready, let's talk about what matters to you. You've worked hard for what you have." |

Bill is on screen for about 66 s of the 3 minutes (37 %).

Everything else is voice-over and can be recorded as audio only.

**Build the narration.** Pass all the files **in script order**. Include the on-camera `.mp4` files themselves, so
their sound becomes the narration and **lip sync is automatic**:

```bash
npm run voice:bill -- public/video/bill-intro.mp4 voiceover-1.wav public/video/bill-credibility.mp4 voiceover-2.wav …
npm run music     # re-places the score's final chord on the new last line
npm run dev       # check it
```

The tool finds each line in the recordings, cuts it, lays the lines out with the designed pauses (lines from an
on-camera take keep Bill's natural rhythm, so the picture stays in sync) and rewrites the timing, captions and cues.
If a line cannot be found it stops and names the line. In that case check that the recording follows the script.
The film is muted on the footage: its sound comes from the narration track. `videoStart` on a `<BillShot>` overrides
the automatic sync if ever needed.

*The voice step uses local Python environments (paths in `tools/env.sh`). Rendering the film needs only Node: all
generated files ship in the project.*

**Do not** replace the temporary voice with a clone of Bill's voice unless Bill has given his written consent.

## 4. Music and sound

- **Music.** `public/audio/score.wav` is built by `npm run music` (`tools/music.py`) from one 94-second felt-piano and
  soft-strings piece (`assets/music/raw/underscore.mp3`, ElevenLabs Music). It plays twice, like a pianist playing
  the piece again. The second time is placed so its final chord lands just after the last line, on the end card. The
  film ducks it under the voice and lets it up in the pauses (levels in `src/audio/cues.ts` → `MUSIC`). To use a
  licensed track instead, put it at `public/audio/score.wav`. The older synthesised score is still available with
  `npm run music:synth`.
- **Sound effects** (`npm run sfx`, `tools/sfx.py`, into `public/audio/sfx/`) are real recordings of a pen on
  paper, handwriting, a page turning, a print laid down, a cup on its saucer and water lapping at a lake. They were
  generated with ElevenLabs sound effects (`assets/sfx/raw/`), then trimmed and levelled. A quiet room tone plays
  under the whole film. The only chime is synthesised, and it plays once, when the brass line joins the plan together.
  When each sound plays is listed, scene by scene, in `src/audio/cues.ts`. Delete a line to remove one, or change
  its volume.

## 5. The drawings

The 19 drawings (`assets/illustrations/raw/`) were generated with Canva's AI image tool from one shared style prompt
(all 19 prompts are in `assets/illustrations/prompts.json`). They were never shown Bill's photo, and no picture of
Bill is generated anywhere. `python3 tools/illustrate.py [names]` turns each into the layers the film animates:

- the paper is normalised to pure white, then turned into transparency, so the drawing sits on the film's page;
- the ink and the watercolour wash are separated;
- a *draw order* is computed: how far each pen line is from where the pen starts (the `seeds` in `spec.json`),
  travelling along the ink. The film reveals the lines in that order, then lets the wash bloom in behind them.

Output: `public/illustrations/<name>.ink / .wash / .time / .full.png` and `src/data/illustrations.json`.
`src/components/InkDrawing.tsx` composes them frame by frame. To swap a drawing, replace its PNG in
`assets/illustrations/raw/` (any size, landscape) and re-run the tool for that name.

A scratch Canva design, "Bill Badran film - illustration export (scratch)", was used to export the images at full
size. It can be deleted from Canva.

## 6. Changing things

- **A pause between lines:** change `pause` (seconds after the line) in `script/script.json`, then re-run the voice
  step.
- **Where a scene starts or ends:** `src/timing/scenes.ts`, expressed relative to narration lines. Consecutive scenes
  overlap by a few frames and dissolve into each other on the same page.
- **When something appears inside a scene:** each scene file uses `at('line-id', seconds)` and
  `wordAt('line-id', 'word')`. For example `at('build', 0.35)` means "0.35 s after the line *build* starts". Nudge
  the number.
- **Words on screen:** all of them are in `src/design/copy.ts`. It also has a French set (REER, CELI, FERR, RRQ…):
  set `LANG = 'fr'` for a French-screen version. A French film would also need Bill's French narration, and one
  hand check: in `src/scenes/Plan.tsx` the brass line underlines each note, and the note widths (`w:`) are measured
  for the English words, so re-measure them for the French ones.
- **The script's words:** edit `text` in `script/script.json` and re-run the voice step. Keep the `id`s: scenes
  refer to them.

## 7. Files

| Path | What |
|---|---|
| `docs/storyboard.md` | The storyboard: every scene, the brass line's roles, the rules the scenes follow. |
| `src/Film.tsx` | The master timeline: the paper, 12 scenes, the soundtrack and captions. |
| `src/scenes/` | One file per scene (IntroBill, LifeGoals, Credibility, Pieces, GuideReveal, BlindSpots, SimpleGuide, Approach, Plan, Closing). |
| `src/components/sketch/` | The sketchbook kit: handwriting, pen strokes, taped prints, clippings, the guide booklet, the brass line. Studio → *Checks → DesignKit* shows them all. |
| `src/components/InkDrawing.tsx` | A drawing that draws itself. |
| `src/components/GuideCover.tsx` | The guide's real cover, rebuilt as vectors from the PDF. |
| `src/components/CaptionTrack.tsx` | Burned-in captions, read from `public/captions/narration.srt`. |
| `src/design/` | Palette (ivory, navy ink, blue-grey wash, brass), fonts (Lora, Caveat), easing, on-screen words. |
| `public/guide/` | Real crops of the guide, made by `npm run guide-assets` (needs `pdftoppm`). |
| `public/photos/bill-portrait.jpg` | Bill's real photo, the stand-in until footage arrives. |

## 8. Content notes (compliance)

The film makes no performance, return or tax-saving promises and no market predictions. It has no charts, scores or
ratings. The five blind spots are shown as situations. The end card carries: *"For general information only. Not
personalized financial, tax or legal advice."* and says the guide is currently available in French. Bill (and his
compliance officer, if applicable) should approve the final cut, especially the credential line "15+ years ·
individuals & families".
