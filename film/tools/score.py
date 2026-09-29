#!/usr/bin/env python3
"""A warm, restrained score that follows the film's arc, synthesised from scratch (numpy + scipy only).

    python3 tools/score.py            -> public/audio/score.wav (48 kHz stereo)

It reads src/data/timing.json, so after the narration changes (new takes, Bill's real recording) re-running it
re-times every section to the new cues. The film ducks it under the voice (src/audio/Soundtrack.tsx); this file
is rendered un-ducked. Replace public/audio/score.wav with a licensed track to use real music instead.
"""
import json
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
TIMING = json.loads((ROOT / "src/data/timing.json").read_text())
DUR = TIMING["duration"]
L = {l["id"]: l for l in TIMING["lines"]}
T = lambda i, o=0.0: L[i]["start"] + o
E = lambda i, o=0.0: L[i]["end"] + o
N = int(DUR * SR) + SR
rng = np.random.default_rng(7)

NOTE = {n: i for i, n in enumerate("C C# D D# E F F# G G# A A# B".split())}


def hz(name):  # "F#4"
    n, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTE[n] + 12 * (octave + 1) - 69) / 12)


CHORDS = {  # voicings (low → high); key of D
    "D": ["D3", "A3", "D4", "F#4", "A4"],
    "Dsus2": ["D3", "A3", "D4", "E4", "A4"],
    "Dadd9": ["D3", "A3", "E4", "F#4", "A4"],
    "Bm": ["B2", "F#3", "B3", "D4", "F#4"],
    "Bm7": ["B2", "F#3", "A3", "D4", "F#4"],
    "G": ["G2", "D3", "B3", "D4", "G4"],
    "Gmaj7": ["G2", "D3", "B3", "D4", "F#4"],
    "Em7": ["E2", "B2", "G3", "D4", "E4"],
    "A": ["A2", "E3", "A3", "C#4", "E4"],
    "Asus4": ["A2", "E3", "A3", "D4", "E4"],
    "D/F#": ["F#2", "D3", "A3", "D4", "F#4"],
}

L_OUT = np.zeros(N)
R_OUT = np.zeros(N)


def env(n, attack, release, curve=2.0):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-3), 0, 1) ** curve
    r = np.clip((n / SR - t) / max(release, 1e-3), 0, 1) ** curve
    return a * r


def add(sig_l, sig_r, t0):
    i = int(t0 * SR)
    if i >= N or i + len(sig_l) <= 0:
        return
    j = min(N, i + len(sig_l))
    s = max(0, -i)
    L_OUT[max(i, 0):j] += sig_l[s : j - i]
    R_OUT[max(i, 0):j] += sig_r[s : j - i]


def pad(chord, t0, t1, level):
    """Soft sustained chord: detuned sine partials, slow swell, gentle stereo spread."""
    n = int((t1 - t0 + 2.2) * SR)
    t = np.arange(n) / SR
    e = env(n, 1.6, 2.2, 1.6)
    l = np.zeros(n)
    r = np.zeros(n)
    for k, name in enumerate(CHORDS[chord]):
        f = hz(name)
        amp = level * (0.9 if k == 0 else 0.55) / len(CHORDS[chord])
        for det, side in ((-3.0, 0), (3.0, 1)):
            ff = f * 2 ** (det / 1200)
            ph = rng.uniform(0, 2 * np.pi)
            wob = 1 + 0.0015 * np.sin(2 * np.pi * (0.13 + 0.05 * k) * t)
            tone = np.sin(2 * np.pi * ff * t * wob + ph) + 0.22 * np.sin(4 * np.pi * ff * t + ph) + 0.06 * np.sin(6 * np.pi * ff * t)
            (l if side == 0 else r)[:] += amp * tone
    add(l * e, r * e, t0)


def piano(name, t0, vel=0.5, pan=0.0, length=3.2):
    """A felt-piano-like note: soft attack, partials that decay faster the higher they are."""
    n = int(length * SR)
    t = np.arange(n) / SR
    f = hz(name)
    tone = np.zeros(n)
    for k, (a, d) in enumerate(((1.0, 1.4), (0.42, 2.4), (0.16, 3.6), (0.06, 5.0)), start=1):
        tone += a * np.exp(-d * t) * np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k * k))
    attack = np.clip(t / 0.012, 0, 1)
    tail = np.clip((length - t) / 0.4, 0, 1)
    tone *= attack * tail * vel * 0.32
    add(tone * (1 - pan) * 0.5 + tone * 0.25, tone * (1 + pan) * 0.5 + tone * 0.25, t0)


def bass(chord, t0, t1, level):
    n = int((t1 - t0 + 1.5) * SR)
    t = np.arange(n) / SR
    f = hz(CHORDS[chord][0]) / 2 if hz(CHORDS[chord][0]) > 90 else hz(CHORDS[chord][0])
    tone = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    tone *= env(n, 0.8, 1.5) * level * 0.22
    add(tone, tone, t0)


def arp(chord, t0, t1, step, level, pattern=(2, 3, 4, 3), start_vel=1.0):
    notes = CHORDS[chord]
    i, t = 0, t0
    while t < t1 - 0.05:
        name = notes[pattern[i % len(pattern)]]
        up = name[:-1] + str(int(name[-1]) + 1)
        piano(up, t, vel=level * (0.85 + 0.15 * np.cos(i * 1.7)) * start_vel, pan=0.35 * np.sin(i * 1.1))
        i += 1
        t += step


def section(chords, t0, t1, pad_level, *, arp_step=None, arp_level=0.0, bass_level=0.0, melody=None):
    span = (t1 - t0) / len(chords)
    for k, c in enumerate(chords):
        a, b = t0 + k * span, t0 + (k + 1) * span
        pad(c, a, b, pad_level)
        if bass_level:
            bass(c, a, b, bass_level)
        if arp_step:
            arp(c, a, b, arp_step, arp_level)
    for name, when, vel in melody or []:
        piano(name, when, vel=vel, pan=-0.1, length=4.0)


BEAT = 60 / 72  # a slow 72 bpm pulse where there is one

# ---- the arc ------------------------------------------------------------------------------------------------
section(["Dsus2", "Gmaj7"], 0.0, T("your-life"), 0.42, melody=[("A4", 1.2, 0.35), ("F#4", 4.6, 0.3), ("E4", 8.0, 0.28)])
section(["D", "Bm7", "Gmaj7", "A"], T("your-life", -0.2), T("fifteen"), 0.62, arp_step=BEAT, arp_level=0.28, bass_level=0.5,
        melody=[("F#5", T("your-life", 0.1), 0.42)])
section(["G", "D/F#", "Em7", "Asus4"], T("fifteen"), T("work", -0.2), 0.46, bass_level=0.35)
section(["Bm", "G", "D", "A"], T("work", -0.2), T("account", -0.2), 0.52, arp_step=BEAT / 2, arp_level=0.2, bass_level=0.4)
section(["Em7", "Bm7"], T("account", -0.2), T("who"), 0.4, arp_step=BEAT * 2, arp_level=0.16)
# "who's looking at how they all fit together?" — the music thins to one held interval, then waits
section(["Asus4"], T("who"), T("created", -0.4), 0.26)
section(["G", "D", "Asus4", "D"], T("created", -0.4), T("inside"), 0.66, arp_step=BEAT / 2, arp_level=0.26, bass_level=0.5,
        melody=[("A4", T("created", 0.0), 0.5), ("D5", T("created", 0.9), 0.45), ("F#5", T("created", 1.8), 0.42)])
section(["Bm", "G", "Em7", "A", "Bm7"], T("inside"), T("easy", -0.3), 0.46, arp_step=BEAT, arp_level=0.2, bass_level=0.4)
section(["G", "D", "Em7", "A"], T("easy", -0.3), T("perfect"), 0.42, arp_step=BEAT * 2, arp_level=0.14)
section(["Dsus2", "Gmaj7"], T("perfect"), T("approach"), 0.34)
section(["Asus4"], T("approach"), T("start-you", -0.3), 0.3)
# the centrepiece: stillness on "We start with you", then the fullest the score gets, at "one coordinated plan"
section(["Dadd9"], T("start-you", -0.3), T("whole"), 0.5, melody=[("A4", T("start-you", 0.2), 0.4), ("F#5", T("family"), 0.36)])
section(["Bm7", "G"], T("whole"), T("build"), 0.58, arp_step=BEAT / 2, arp_level=0.22, bass_level=0.45)
section(["D", "A", "Bm7", "G"], T("build"), T("role"), 0.74, arp_step=BEAT / 2, arp_level=0.28, bass_level=0.6,
        melody=[("D5", T("build", 0.2), 0.5), ("A5", E("build", 0.3), 0.42), ("F#5", T("revisit", 0.5), 0.4)])
section(["G", "D/F#", "Em7", "Asus4"], T("role"), T("next", -0.5), 0.44, bass_level=0.35)
section(["D", "Gmaj7", "D"], T("next", -0.5), DUR + 0.5, 0.64, arp_step=BEAT, arp_level=0.22, bass_level=0.55,
        melody=[("F#5", T("next", 0.3), 0.45), ("A5", E("next", 0.4), 0.4), ("D5", E("next", 3.0), 0.36)])

# ---- room, level, fade ----------------------------------------------------------------------------------------
ir_n = int(2.8 * SR)
ir_t = np.arange(ir_n) / SR
sos = butter(2, 5200, "low", fs=SR, output="sos")
ir_l = sosfilt(sos, rng.standard_normal(ir_n)) * np.exp(-ir_t * 2.4)
ir_r = sosfilt(sos, rng.standard_normal(ir_n)) * np.exp(-ir_t * 2.4)
ir_l /= np.sqrt(np.sum(ir_l**2))
ir_r /= np.sqrt(np.sum(ir_r**2))
dry_l, dry_r = L_OUT[: int(DUR * SR)], R_OUT[: int(DUR * SR)]
wet_l = fftconvolve(dry_l, ir_l)[: len(dry_l)]
wet_r = fftconvolve(dry_r, ir_r)[: len(dry_r)]
mix = np.stack([dry_l * 0.72 + wet_l * 0.5, dry_r * 0.72 + wet_r * 0.5], axis=1)
mix = sosfilt(butter(1, 40, "high", fs=SR, output="sos"), mix, axis=0)

n = len(mix)
fade = np.ones(n)
fin, fout = int(1.2 * SR), int(2.5 * SR)
fade[:fin] = np.linspace(0, 1, fin) ** 2
fade[-fout:] = np.linspace(1, 0, fout) ** 1.5
mix *= fade[:, None]

rms = np.sqrt(np.mean(mix[mix != 0] ** 2))
mix *= 10 ** (-24 / 20) / rms  # about -24 dBFS RMS; the film sets the balance against the voice
peak = np.max(np.abs(mix))
if peak > 0.7:
    mix *= 0.7 / peak
out = ROOT / "public/audio/score.wav"
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f"score: {n / SR:.1f}s -> {out.relative_to(ROOT)}  (peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS)")
