"""Rank ElevenLabs takes: word error rate against the script and pacing.  $PY_ASR tools/score_takes.py assets/voice/jonathan/*.mp3"""
import json, re, sys, difflib
from pathlib import Path
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
LINES = json.loads((ROOT / "script/script.json").read_text())["lines"]
PARTS = {"A": ("hi", "who"), "B": ("created", "m5"), "C": ("easy", "revisit"), "D": ("role", "next")}
norm = lambda s: re.sub(r"[^a-z0-9' ]", " ", s.lower().replace("’", "'")).split()

def expected(part):
    a, b = PARTS[part]
    ids = [l["id"] for l in LINES]
    return " ".join(l["text"] for l in LINES[ids.index(a): ids.index(b) + 1])

m = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
for p in sys.argv[1:]:
    part = Path(p).stem.split("-")[0]
    segs, info = m.transcribe(p, word_timestamps=True, language="en")
    words = [w for s in segs for w in s.words]
    ref, hyp = norm(expected(part)), norm(" ".join(w.word for w in words))
    sm = difflib.SequenceMatcher(a=ref, b=hyp, autojunk=False)
    errs = sum(max(i2 - i1, j2 - j1) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != "equal")
    diffs = [(" ".join(ref[i1:i2]), " ".join(hyp[j1:j2])) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != "equal"]
    gaps = [words[i + 1].start - words[i].end for i in range(len(words) - 1)]
    print(f"{Path(p).name:<14} {info.duration:5.1f}s  WER {errs / len(ref):.3f}  longest gap {max(gaps):.2f}s  {diffs[:4]}")
