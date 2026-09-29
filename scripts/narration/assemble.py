"""Join the picked takes into one continuous narration and print chapter starts.

  python scripts/narration/assemble.py OUT_DIR  ->  OUT_DIR/narration.wav + chapters.json
"""
import json, os, sys
import numpy as np, soundfile as sf

here = os.path.dirname(os.path.abspath(__file__))
spec = json.load(open(os.path.join(here, "narration.json")))
out = sys.argv[1]
picks = {p["chunk"]: p for p in json.load(open(os.path.join(out, "picks.json")))}
parts, chapters, sr, idx, t = [], [], None, 0, 0.0
for ci, chapter in enumerate(spec["chapters"]):
    if ci:
        gap = np.zeros(int(sr * spec["chapter_gap_ms"] / 1000), np.float32)
        parts.append(gap); t += len(gap) / sr
    chapters.append(round(t, 2))
    for li, line in enumerate(chapter):
        idx += 1
        wav, sr = sf.read(picks[idx]["wav"], dtype="float32")
        # 15 ms fades so joins never click
        f = int(sr * 0.015); ramp = np.linspace(0, 1, f, dtype=np.float32)
        wav[:f] *= ramp; wav[-f:] *= ramp[::-1]
        parts.append(wav); t += len(wav) / sr
        if li < len(chapter) - 1:
            gap = np.zeros(int(sr * line.get("after_ms", spec["gap_ms"]) / 1000), np.float32)
            parts.append(gap); t += len(gap) / sr
tail = np.zeros(int(sr * 0.4), np.float32)
audio = np.concatenate(parts + [tail])
sf.write(os.path.join(out, "narration.wav"), audio, sr)
json.dump({"chapters": chapters, "seconds": round(len(audio) / sr, 2)},
          open(os.path.join(out, "chapters.json"), "w"))
print("chapters", chapters, "total", round(len(audio) / sr, 2), "s")
