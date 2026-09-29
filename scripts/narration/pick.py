"""Pick the clearest take of each chunk: Whisper transcribes every take, the
lowest word error rate against the script wins (ties: the take closest to the
median length, to avoid rushed or dragging reads).

Run with an env that has faster-whisper + jiwer:
  python scripts/narration/pick.py OUT_DIR
"""
import json, os, re, sys, statistics
import jiwer
from faster_whisper import WhisperModel

out = sys.argv[1]
takes = json.load(open(os.path.join(out, "takes.json")))
model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
NUM = {"40": "forty", "71": "seventy one"}
SAME = {"riff": "rrif", "rrsps": "rrsp", "rrifs": "rrif"}

def norm(s):
    s = s.lower().replace("’", "'").replace("-", " ")
    s = re.sub(r"(?<=\b[a-z])\.", "", s)          # R.R.S.P. -> RRSP
    s = re.sub(r"[^a-z0-9' ]", " ", s)
    words = [NUM.get(w, w) for w in s.split()]
    merged, run = [], ""
    for w in words:                                 # r r s p -> rrsp
        if len(w) == 1 and w not in ("a", "i"):
            run += w
            continue
        if run:
            merged.append(run); run = ""
        merged.append(w)
    if run:
        merged.append(run)
    return " ".join(SAME.get(w, w) for w in merged)

for t in takes:
    segs, _ = model.transcribe(t["wav"], language="en", beam_size=5, vad_filter=False)
    t["heard"] = " ".join(s.text.strip() for s in segs)
    t["wer"] = round(jiwer.wer(norm(t["text"]), norm(t["heard"])), 3)
    print(f"{t['chunk']:02d}.{t['take']} wer={t['wer']:.2f} {t['seconds']:5.2f}s | {t['heard']}", flush=True)

picks = []
for chunk in sorted({t["chunk"] for t in takes}):
    group = [t for t in takes if t["chunk"] == chunk]
    mid = statistics.median(t["seconds"] for t in group)
    best = min(group, key=lambda t: (t["wer"], abs(t["seconds"] - mid)))
    picks.append(best)
    print(f"pick chunk {chunk}: take {best['take']} (wer {best['wer']}) {best['spoken']}")
json.dump(picks, open(os.path.join(out, "picks.json"), "w"), indent=1)
json.dump(takes, open(os.path.join(out, "takes.asr.json"), "w"), indent=1)
