#!/usr/bin/env python3
"""The film's score from one recorded piece -> public/audio/score.wav (48 kHz stereo, un-ducked).

    python3 tools/music.py

The piece (assets/music/raw/underscore.mp3: felt piano and soft strings, ElevenLabs Music — see the README for the
licence note) is about 94 s long and the film is about 180 s, so it plays twice, like a pianist playing the piece
again: the first time it runs to its own end and its last chord rings out under the blind spots; the second time
begins a few seconds before that, placed so that its final chord lands on the end card and rings to the last frame.
Both passes are on the same key, so the overlap sounds like one performance. The film ducks it under the voice
(src/audio/cues.ts).

To use a licensed track instead, replace public/audio/score.wav with a file of the same name (≥ the film's length).
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/music/raw/underscore.mp3"
OUT = ROOT / "public/audio/score.wav"
SR = 48000
TIMING = json.loads((ROOT / "src/data/timing.json").read_text())
DUR = TIMING["duration"]

# Where the second pass's final chord should land: just after the last line ("…what comes next."), so the
# resolution arrives with the end card.
LAST_LINE_END = TIMING["lines"][-1]["end"]


def load():
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(SRC), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def envelope(x, win=0.25):
    w = int(win * SR)
    m = x.mean(1)
    n = len(m) // w
    return 20 * np.log10(np.sqrt((m[: n * w].reshape(n, w) ** 2).mean(1)) + 1e-9)


def final_chord(x):
    """Time (s) at which the piece's last chord is struck: the last clear onset (a jump of 5 dB or more to within
    20 dB of the loudest moment) before the ring-out."""
    env = envelope(x, 0.1)
    rise = np.diff(env)
    onsets = [i + 1 for i in range(len(rise)) if rise[i] >= 5 and env[i + 1] > env.max() - 20]
    return onsets[-1] * 0.1


x = load()
length = len(x) / SR
chord = final_chord(x)
print(f"piece: {length:.1f} s, final chord at {chord:.1f} s")

N = int(np.ceil(DUR * SR))
out = np.zeros((N, 2))

# pass 1: from the top, to its natural end
n1 = min(N, len(x))
out[:n1] += x[:n1]

# pass 2: placed so its final chord lands 1.2 s after the last line ends
start2 = LAST_LINE_END + 1.2 - chord
s = int(round(start2 * SR))
seg = x[: N - s] if s >= 0 else x[-s : -s + N]
# fade the second pass in over its first 4 s, so it grows out of the first pass's last chord
fade = np.minimum(1, np.arange(len(seg)) / (4 * SR)) ** 1.5
out[max(0, s) : max(0, s) + len(seg)] += seg * fade[:, None]
print(f"pass 2 starts at {start2:.1f} s (overlap with pass 1: {max(0, length - start2):.1f} s)")

# the film's last frame: a gentle 2.5 s fade so nothing is cut off
tail = int(2.5 * SR)
out[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2

peak = np.abs(out).max()
out *= 10 ** (-1 / 20) / peak
wavfile.write(OUT, SR, (out * 32767).astype(np.int16))
print(f"score -> {OUT.relative_to(ROOT)}  {N / SR:.1f} s")
