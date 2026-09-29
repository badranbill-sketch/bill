# Narration for the mountain ride

One continuous English track, written for Bill in the first person: `public/audio/journey/en.mp3` (about 51 s). There is no French narration. A language shows the **Listen** button only when `lib/journey.ts` has a `narration` entry for it **and** the file exists under `public/`. French has neither, so French pages have no button.

## How it plays

- **Listen** starts the track at the passage for the act on screen. `narration.en.chapters` in `lib/journey.ts` gives the second where each act's passage begins.
- After that it plays straight through. Scrolling to another act never cuts or restarts it.
- It pauses (with a short fade) while the ride is off screen. When the visitor comes back, it resumes where it stopped, or jumps to the passage for the act they're now in if that's a different one.
- **Pause** stops it, and **Listen** resumes it. When the track ends, the button resets.
- With reduced motion, the ride shows still panels; the **Listen** button sits above them and plays the track from the start, with no scroll sync. Without JavaScript there is no button.
- The button says **Listen**, not "Listen to Bill", while the track is a stand-in voice. Once Bill records it himself, `listen` in `lib/journey.ts` can name him again.

## The script

Spoken lines, in `scripts/narration/narration.json`. Chapters match the four acts.

1. I'm Bill Badran. For most of your career, the plan was simple: earn, save, invest. / And you've built something real.
2. The last climb before retirement is the steepest. / A market drop just as you start withdrawing hurts far more than the same drop at forty. / So your plan has to hold up in bad years, not just good ones.
3. Then everything has to connect. / Your RRSP becomes a RRIF. You choose when your government pensions start. / Every choice moves your taxes. / The strategy that built your savings isn't automatically the one that should pay you.
4. The goal was never just to reach retirement. / It's knowing what you can spend, where it comes from, and what happens if life changes. / When you're ready, let's look at where you stand.

The RRSP/RRIF line has spelling variants (`R-R-S-P … riff`, `R.R.S.P. … R.R.I.F.`). Some takes are rendered from these so the acronyms come out as letters rather than letter salad. The picker scores every variant against the same script.

## Regenerating it

The voice is Chatterbox (English, `ChatterboxTTS`) cloned from `~/Work/audiodrama/assets/voices/lawyer.wav`. This is a stand-in voice until a clean 10–15 s recording of Bill exists: quiet room, calm delivery, no music. Settings: `exaggeration 0.42`, `cfg_weight 0.4`, `temperature 0.7`. Lines are joined with 420 ms of silence, and chapters with 950 ms.

```sh
OUT=~/Work/audiodrama/out/bill-narration
# 1. Render several takes of every line (GPU, the audiodrama TTS env)
~/Work/audiodrama/envs/tts/bin/python scripts/narration/render.py $OUT 4
# 2. Whisper transcribes each take; the lowest word error rate wins
~/Work/lumenhaus-marc-video/tts/.venv-asr/bin/python scripts/narration/pick.py $OUT
# 3. Join the picks and print the chapter start times
python scripts/narration/assemble.py $OUT
# 4. Normalise and export
ffmpeg -y -i $OUT/narration.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -ac 1 -b:a 96k public/audio/journey/en.mp3
```

Then copy the times from `$OUT/chapters.json` into `narration.en.chapters` in `lib/journey.ts`.

Listen to the result before shipping. The picker catches wrong words but not odd intonation. You can override a pick by editing `$OUT/picks.json` and re-running step 3.

The previous per-act tracks (`fr-1…4`, `en-1…4`) are archived in `~/Work/audiodrama/out/bill-narration-v1-per-act/`.
