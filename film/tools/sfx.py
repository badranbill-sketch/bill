#!/usr/bin/env python3
"""The film's sound library -> public/audio/sfx/*.wav (48 kHz stereo, 16-bit).

    python3 tools/sfx.py

Recorded foley (assets/sfx/raw/*.mp3, generated with ElevenLabs sound effects; see the README for the licence note)
is trimmed to its best moment, cleaned of rumble, faded and levelled, so every effect plays at a comparable loudness
and the mix is set in one place (src/audio/cues.ts). The few sounds that are better made than recorded (the chime,
the end swell, the room tone) are synthesised here with numpy.

    pen          a pen sketching (a drawing starts)          write / write-short   handwriting
    page         a page turning                              paper                 a print or booklet laid down
    cup          a cup set down on its saucer                chime                 the plan's line connecting (once)
    swell        a soft rise under the end card              lake / room           ambience beds (seamless loops)
"""
from pathlib import Path
import subprocess

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfiltfilt, sosfilt

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "assets/sfx/raw"
OUT = ROOT / "public/audio/sfx"
OUT.mkdir(parents=True, exist_ok=True)
SR = 48000
rng = np.random.default_rng(11)


def load(name):
    """A raw mp3 as float32 stereo at 48 kHz."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(RAW / f"{name}.mp3"), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def hp(x, f=70):
    return sosfiltfilt(butter(2, f, "high", fs=SR, output="sos"), x, axis=0)


def lp(x, f):
    return sosfilt(butter(2, f, "low", fs=SR, output="sos"), x, axis=0)


def band(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


def fades(x, fin=0.006, fout=0.08):
    n = len(x)
    env = np.ones(n)
    a, b = int(fin * SR), int(fout * SR)
    env[:a] = np.linspace(0, 1, a) ** 2
    env[n - b :] = np.linspace(1, 0, b) ** 2
    return x * env[:, None]


def active_rms_db(x, win=0.05):
    """Loudness of the part of the sound that is actually sounding (the loudest 40 % of 50 ms windows)."""
    w = int(win * SR)
    m = x.mean(1)
    n = max(1, len(m) // w)
    r = np.sqrt((m[: n * w].reshape(n, w) ** 2).mean(1) + 1e-12)
    top = np.sort(r)[-max(1, int(n * 0.4)) :]
    return 20 * np.log10(np.sqrt((top**2).mean()))


def write(name, x, rms_db=-26.0, peak_db=-3.0):
    """Level to an active loudness, never above a peak, and write."""
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    g = 10 ** ((rms_db - active_rms_db(x)) / 20)
    peak = np.abs(x).max() * g
    if peak > 10 ** (peak_db / 20):
        g *= 10 ** (peak_db / 20) / peak
    y = np.clip(x * g, -1, 1)
    wavfile.write(OUT / f"{name}.wav", SR, (y * 32767).astype(np.int16))
    print(f"  {name + '.wav':16s} {len(y) / SR:5.2f} s   active {active_rms_db(y):6.1f} dBFS   peak {20 * np.log10(np.abs(y).max()):6.1f} dBFS")


def cut(x, a, b):
    return x[int(a * SR) : int(b * SR)]


def seamless(x, length, xfade=1.2, seed=3):
    """A seamless loop of `length` s from a short recording: random slices overlap-added with long crossfades, and the
    end folded into the start so the file loops without a seam."""
    r = np.random.default_rng(seed)
    L, F = int(length * SR), int(xfade * SR)
    out = np.zeros((L + F, 2))
    seg = int(min(len(x) / SR - 0.2, 3.2) * SR)
    pos = 0
    win_in = np.sin(np.linspace(0, np.pi / 2, F))  # equal power: the slices are uncorrelated
    while pos < L:
        s = r.integers(0, len(x) - seg)
        piece = x[s : s + seg].copy()
        piece[:F] *= win_in[:, None]
        piece[-F:] *= win_in[::-1, None]
        end = min(len(out), pos + seg)
        out[pos:end] += piece[: end - pos]
        pos += seg - F
    loop = out[:L].copy()
    loop[:F] += out[L : L + F]  # fold the overhang onto the start
    return loop


# ---- recorded foley -----------------------------------------------------------------------------------------------
print("recorded:")
pen = hp(load("pen-sketch-1"))
# 2 s of sketching, lengthened to 3.4 s by overlapping a second pass, so it covers a whole drawing reveal
F = int(0.5 * SR)
a, b = pen[: int(1.95 * SR)], pen[int(0.1 * SR) : int(1.95 * SR)]
w = np.sin(np.linspace(0, np.pi / 2, F))[:, None] ** 2
long = np.concatenate([a[:-F], a[-F:] * w[::-1] + b[:F] * w, b[F:]])
write("pen", fades(long, 0.12, 0.6), -30)

write("write", fades(hp(cut(load("write-1"), 0.0, 1.95)), 0.04, 0.25), -29)
write("write-short", fades(hp(load("write-2")), 0.02, 0.12), -29)
write("page", fades(hp(cut(load("page-2"), 6.95, 8.45), 90), 0.03, 0.25), -27)
write("paper", fades(hp(cut(load("paper-2"), 0.2, 1.25), 90), 0.05, 0.25), -28)
write("cup", fades(hp(cut(load("cup-2"), 1.12, 1.95), 90), 0.004, 0.2), -27, -6)

lake = hp(load("lake-1"), 60)
write("lake", seamless(lake, 24.0), -30, -8)

# ---- synthesised ----------------------------------------------------------------------------------------------------
print("synthesised:")


def room(x, size=0.8, mix=0.25):
    n = int(size * SR)
    ir = lp(rng.standard_normal(n), 6000) * np.exp(-np.arange(n) / SR * (5.5 / size))
    ir /= np.sqrt(np.sum(ir**2))
    wet = fftconvolve(x, ir)
    return np.concatenate([x, np.zeros(len(wet) - len(x))]) * (1 - mix) + wet * mix


def t_(sec):
    return np.arange(int(sec * SR)) / SR


# the chime: the plan's line joining up. A soft two-note bell (C6 + G6, the score is in C major), long and quiet;
# the only chime in the film.
t = t_(3.2)
bell = sum(a * np.exp(-d * t) * np.sin(2 * np.pi * f * t) for f, a, d in ((1046.5, 1.0, 1.6), (1568.0, 0.55, 2.2), (3139.5, 0.12, 4.5), (2093.0, 0.18, 3.0)))
bell *= np.clip(t / 0.004, 0, 1)
bell = room(bell, 1.4, 0.35)
d = int(0.008 * SR)
write("chime", fades(np.stack([bell, np.concatenate([np.zeros(d), bell[:-d]])], 1), 0.002, 0.3), -27, -8)

# the swell: a low, slow rise with a little air on top, under the end card
t = t_(4.0)
env = np.clip(t / 2.6, 0, 1) ** 2 * np.clip((4.0 - t) / 1.4, 0, 1)
swell = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((130.8, 1.0), (196.0, 0.6), (261.6, 0.35), (392.0, 0.18)))  # C major, as the score
air = band(rng.standard_normal(len(t)), 4000, 9000) * 0.08
s = room((swell * 0.4 + air) * env, 1.6, 0.4)
d = int(0.012 * SR)
write("swell", fades(np.stack([s, np.concatenate([np.zeros(d), s[:-d]])], 1), 0.01, 0.4), -30, -10)

# room tone: a quiet room — a soft pinkish noise floor with a faint low hum of a building, a seamless 20 s loop
L = 20 * SR
white = rng.standard_normal((L + SR, 2))
pink = np.zeros_like(white)
for k, (f, g) in enumerate(((60, 1.0), (240, 0.55), (900, 0.3), (3000, 0.14), (8000, 0.05))):
    pink += lp(white, f) * g
pink = hp(pink, 35)
pink[:, 1] = 0.7 * pink[:, 1] + 0.3 * pink[:, 0]  # mostly decorrelated, a little shared
F = SR
loop = pink[:L].copy()
x = np.linspace(0, np.pi / 2, F)[:, None]
loop[:F] = loop[:F] * np.sin(x) + pink[L : L + F] * np.cos(x)
write("room", loop, -52, -30)

print(f"sfx -> {OUT.relative_to(ROOT)}")
