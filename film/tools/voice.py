"""Narration pipeline: script/script.json -> public/audio/narration.wav + src/data/timing.json + public/captions/*.

Each stage runs in the Python environment that has its dependencies; tools/voice.sh wires them together.

  tts      temporary clips with a preset synthetic voice (Qwen3-TTS, no cloning)   [PY_TTS]
  asr      word timestamps for clips or recordings (faster-whisper) + quality gate [PY_ASR]
  cut      split Bill's recording(s) into per-clip wavs using the word timestamps   [numpy only]
  layout   place clips with the designed pauses, write narration/timing/captions    [numpy only]

Nothing here is needed to render the film: the outputs are committed to the project.
"""
import argparse
import difflib
import hashlib
import json
import re
import shutil
import sys
import unicodedata
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = json.loads((ROOT / "script" / "script.json").read_text())
# settings for the local Qwen3-TTS scratch voice (kept under qwen_fallback once another voice is in use)
QWEN = SCRIPT["voice"].get("qwen_fallback", SCRIPT["voice"])
SEEDS_FILE = ROOT / "script" / "voice-seeds.json"
BUILD = ROOT / "build" / "voice"
CLIPS, CACHE, ASR, REC = BUILD / "clips", BUILD / "cache", BUILD / "asr", BUILD / "recordings"
OUT_AUDIO = ROOT / "public" / "audio" / "narration.wav"
OUT_TIMING = ROOT / "src" / "data" / "timing.json"
OUT_CAPTIONS = ROOT / "public" / "captions"
for d in (CLIPS, CACHE, ASR, REC):
    d.mkdir(parents=True, exist_ok=True)

LINES = SCRIPT["lines"]
PROMPT = "Bill Badran. The Guide to Financial Prosperity. Financial planner."
WER_GATE = 0.12


# ---------------------------------------------------------------- script helpers
def clips():
    """Ordered clips: [{id, lines:[...], text, tts}]"""
    out = []
    for line in LINES:
        if not out or out[-1]["id"] != line["clip"]:
            out.append({"id": line["clip"], "lines": []})
        out[-1]["lines"].append(line)
    for c in out:
        c["text"] = " ".join(l["text"] for l in c["lines"])
        tts = " ".join(l.get("tts", l["text"]) for l in c["lines"])
        tts = re.sub(r"\s*—\s*", ", ", tts).strip().rstrip(",")
        c["tts"] = tts[0].upper() + tts[1:]
        # a line may steer its own delivery ("instruct"); otherwise the voice's default applies
        c["instruct"] = next((l["instruct"] for l in c["lines"] if "instruct" in l), QWEN.get("instruct", ""))
    return out


def key(*parts):
    return hashlib.sha1("|".join(map(str, parts)).encode()).hexdigest()[:12]


# ---------------------------------------------------------------- text normalisation
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen " \
       "seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def num_words(n):
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if n < 1000:
        return ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + num_words(n % 100))
    return num_words(n // 1000) + " thousand" + ("" if n % 1000 == 0 else " " + num_words(n % 1000))


def norm_tokens(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = s.replace("’", "'")
    s = re.sub(r"\d+", lambda m: " " + num_words(int(m.group())) + " ", s)
    s = re.sub(r"[^a-z' ]+", " ", s).replace("'", "")
    return s.split()


def wer(ref, hyp):
    r, h = norm_tokens(ref), norm_tokens(hyp)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = d[j]
            d[j] = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
            prev = cur
    return d[len(h)] / max(1, len(r))


# ---------------------------------------------------------------- audio helpers (numpy + wave only)
def read_wav(path):
    with wave.open(str(path)) as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1:
        x = x.reshape(-1, ch).mean(1)
    return x, sr


def write_wav(path, x, sr):
    path.parent.mkdir(parents=True, exist_ok=True)
    y = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(y.tobytes())


def speech_bounds(x, sr, thresh=0.02):
    """First/last sample above a fraction of the peak (10 ms frames)."""
    hop = int(0.01 * sr)
    frames = np.abs(x[: len(x) // hop * hop]).reshape(-1, hop).max(1)
    idx = np.where(frames > thresh * frames.max())[0]
    if not len(idx):
        return 0, len(x)
    return idx[0] * hop, min(len(x), (idx[-1] + 1) * hop)


def finish(x, sr, air_in=0.05, air_out=0.14):
    """Trim to speech with a little air, level speech to -20 dBFS RMS, peak <= -1 dBFS, 8 ms fades."""
    a, b = speech_bounds(x, sr)
    x = x[max(0, a - int(air_in * sr)): min(len(x), b + int(air_out * sr))].astype(np.float32).copy()
    hop = int(0.01 * sr)
    fr = x[: len(x) // hop * hop].reshape(-1, hop)
    rms = np.sqrt((fr ** 2).mean(1))
    speech = rms[rms > 0.25 * rms.max()]
    level = np.sqrt((speech ** 2).mean()) if len(speech) else 1e-3
    x *= 10 ** (-20 / 20) / level
    peak = np.abs(x).max()
    if peak > 0.89:
        x *= 0.89 / peak
    n = int(0.008 * sr)
    x[:n] *= np.linspace(0, 1, n)
    x[-n:] *= np.linspace(1, 0, n)
    return x


# ---------------------------------------------------------------- word alignment (script words <- recognised words)
def align(script_words, asr_words):
    """script_words: list of normalised tokens. asr_words: [{w,s,e}]. Returns [(s,e)] per script word (interpolated)."""
    hyp, owner = [], []
    for i, w in enumerate(asr_words):
        for t in norm_tokens(w["w"]):
            hyp.append(t)
            owner.append(i)
    times = [None] * len(script_words)
    sm = difflib.SequenceMatcher(a=script_words, b=hyp, autojunk=False)
    for tag, a0, a1, b0, b1 in sm.get_opcodes():
        if tag == "equal" or (tag == "replace" and a1 - a0 == b1 - b0):
            for k in range(a1 - a0):
                w = asr_words[owner[b0 + k]]
                times[a0 + k] = (w["s"], w["e"])
    known = [i for i, t in enumerate(times) if t]
    if not known:
        raise SystemExit("alignment failed: no words matched")
    for i, t in enumerate(times):
        if t:
            continue
        lo = max((k for k in known if k < i), default=None)
        hi = min((k for k in known if k > i), default=None)
        if lo is None:
            times[i] = (times[hi][0], times[hi][0])
        elif hi is None:
            times[i] = (times[lo][1], times[lo][1])
        else:  # spread the unmatched words across the gap
            f0 = (i - lo) / (hi - lo)
            f1 = (i + 1 - lo) / (hi - lo)
            s = times[lo][1] + (times[hi][0] - times[lo][1]) * f0
            e = times[lo][1] + (times[hi][0] - times[lo][1]) * f1
            times[i] = (s, e)
    return times


def line_tokens(line):
    """Display words for a line with their normalised forms (one display word may give 0..n tokens)."""
    out = []
    for disp in line["text"].replace("—", " ").split():
        out.append((disp, norm_tokens(disp)))
    return out


def words_for_lines(lines, asr_words, offset=0.0):
    """Timed display words per line, aligned against a recognised word stream."""
    flat, index = [], []
    for li, line in enumerate(lines):
        for wi, (disp, toks) in enumerate(line_tokens(line)):
            for t in toks:
                flat.append(t)
                index.append((li, wi))
    times = align(flat, asr_words)
    per_line = [[None] * len(line_tokens(l)) for l in lines]
    for (li, wi), (s, e) in zip(index, times):
        cur = per_line[li][wi]
        per_line[li][wi] = (s, e) if cur is None else (min(cur[0], s), max(cur[1], e))
    out = []
    for line, slots in zip(lines, per_line):
        words = []
        for (disp, _), t in zip(line_tokens(line), slots):
            if t is None:  # punctuation-only token: glue to previous word
                t = (words[-1]["e"], words[-1]["e"]) if words else (0.0, 0.0)
                t = (t[0] - offset, t[1] - offset)
            words.append({"w": disp, "s": round(t[0] + offset, 3), "e": round(t[1] + offset, 3)})
        out.append(words)
    return out


# ---------------------------------------------------------------- stage: tts (temporary synthetic voice)
def target_duration(c):
    """Seconds a clip should last at its lines' target pace, plus a breath per internal comma/full stop."""
    v = QWEN
    words = sum(len(norm_tokens(l["text"])) * 60 / l.get("rate", v["rate"]) for l in c["lines"])
    breaths = len(re.findall(r"[,.:?—](?=\s)", c["text"]))
    return words + 0.22 * breaths


def load_state():
    return json.loads(SEEDS_FILE.read_text()) if SEEDS_FILE.exists() else {}


def stage_tts(args):
    import soundfile as sf
    import torch
    from qwen_tts import Qwen3TTSModel

    v = QWEN
    state = load_state()
    model_dir = next((Path.home() / ".cache/huggingface/hub/models--Qwen--Qwen3-TTS-12Hz-1.7B-CustomVoice/snapshots").iterdir())
    model = None
    todo = [c for c in clips() if not args.only or c["id"] in args.only]
    for c in todo:
        st = state.setdefault(c["id"], {"chosen": None, "reject": []})
        n_takes = max(l.get("takes", v.get("takes", 1)) for l in c["lines"])
        seeds = [s for s in (v["seed"] + 101 * k for k in range(24)) if s not in st["reject"]][:n_takes]
        target, takes = target_duration(c), []
        for seed in seeds:
            k = key(v["engine"], v["speaker"], c["instruct"], seed, c["tts"])
            cached = CACHE / f"{c['id']}-{k}.wav"
            if not cached.exists():
                if model is None:
                    model = Qwen3TTSModel.from_pretrained(str(model_dir), device_map="cuda:0", dtype=torch.bfloat16,
                                                          attn_implementation="sdpa", local_files_only=True)
                torch.manual_seed(seed)
                torch.cuda.manual_seed_all(seed)
                wavs, sr = model.generate_custom_voice(text=c["tts"], speaker=v["speaker"], language="english",
                                                       instruct=c["instruct"])
                sf.write(cached, finish(np.asarray(wavs[0], dtype=np.float32), sr), sr, subtype="PCM_16")
            x, sr = read_wav(cached)
            a, b = speech_bounds(x, sr)
            dur = (b - a) / sr
            takes.append((abs(np.log(dur / target)), seed, cached, dur))
        _, seed, cached, dur = min(takes)
        st["chosen"] = seed
        shutil.copy(cached, CLIPS / f"{c['id']}.wav")
        print(f"  {c['id']:<12} target {target:4.1f}s  takes " + " ".join(f"{t[3]:4.1f}" for t in takes)
              + f"  -> seed {seed} ({dur:.1f}s)")
    SEEDS_FILE.write_text(json.dumps(state, indent=1) + "\n")
    print(f"tts: {len(todo)} clips ready in {CLIPS.relative_to(ROOT)}")


# ---------------------------------------------------------------- stage: asr (+ gate for scratch clips)
def transcribe(model, path):
    segs, _ = model.transcribe(str(path), language=SCRIPT["language"], beam_size=5, word_timestamps=True,
                               initial_prompt=PROMPT, condition_on_previous_text=False)
    return [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)}
            for s in segs for w in s.words]


def stage_asr(args):
    from faster_whisper import WhisperModel

    model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
    if args.recordings:
        recs = sorted(REC.glob("*.wav"))
        if not recs:
            raise SystemExit("no recordings in build/voice/recordings")
        for r in recs:
            words = transcribe(model, r)
            (ASR / f"rec-{r.stem}.json").write_text(json.dumps(words, indent=0))
            print(f"asr: {r.name}: {len(words)} words")
        return
    state = load_state()
    failed = []
    for c in clips():
        wav = CLIPS / f"{c['id']}.wav"
        words = transcribe(model, wav)
        (ASR / f"{c['id']}.json").write_text(json.dumps(words, indent=0))
        hyp = " ".join(w["w"] for w in words)
        score = wer(c["text"], hyp)
        flag = "ok " if score <= WER_GATE else "BAD"
        print(f"  {flag} {c['id']:<12} wer={score:.2f}  {hyp}")
        if score > WER_GATE:
            failed.append(c["id"])
    if failed and args.gate:
        for cid in failed:  # the next tts run keeps a different take for the failing clips only
            st = state.setdefault(cid, {"chosen": None, "reject": []})
            if st["chosen"] is not None:
                st["reject"].append(st["chosen"])
        SEEDS_FILE.write_text(json.dumps(state, indent=1) + "\n")
        print("asr: failing takes rejected:", " ".join(failed))
        sys.exit(3)
    print("asr: all clips pass" if not failed else f"asr: failing clips: {failed}")


# ---------------------------------------------------------------- stage: cut (Bill's real recording -> clips)
def stage_cut(args):
    recs = sorted(REC.glob("*.wav"))
    stream = []  # every recognised word with its recording
    for r in recs:
        for w in json.loads((ASR / f"rec-{r.stem}.json").read_text()):
            stream.append({**w, "rec": r.stem})
    toks = [(norm_tokens(w["w"]), i) for i, w in enumerate(stream)]
    hyp = [t for ts, _ in toks for t in ts]
    owner = [i for ts, i in toks for _ in ts]

    def best_match(target, lo, hi):
        """Best window in hyp[lo:hi] for token list target -> (ratio, start_tok, end_tok)."""
        n, best = len(target), (0.0, None, None)
        for s in range(lo, max(lo, hi - max(1, n // 2)) + 1):
            for L in {n - 1, n, n + 1, n + 2} - {0}:
                window = hyp[s:s + L]
                if not window:
                    continue
                r = difflib.SequenceMatcher(a=target, b=window, autojunk=False).ratio()
                if r > best[0] + 1e-6:
                    best = (r, s, s + L)
        return best

    pointer, plan = 0, []
    cl = clips()
    for i, c in enumerate(cl):
        target = norm_tokens(c["text"])
        horizon = min(len(hyp), pointer + len(target) * 6 + 60)
        r, s, e = best_match(target, pointer, horizon)
        if s is None or r < 0.6:
            raise SystemExit(f"cut: could not find clip '{c['id']}' ({c['text']}) — best ratio {r:.2f}. "
                             "Check that the recording follows script/script.json in order.")
        # retake-aware: a later, equally good take of the same clip before the next clip wins
        if i + 1 < len(cl):
            nxt = norm_tokens(cl[i + 1]["text"])
            _, ns, _ = best_match(nxt, e, min(len(hyp), e + len(nxt) * 6 + 60))
            limit = ns if ns is not None else horizon
            r2, s2, e2 = best_match(target, e, limit)
            while s2 is not None and r2 >= r - 0.05 and e2 <= limit:
                r, s, e = r2, s2, e2
                r2, s2, e2 = best_match(target, e, limit)
        plan.append((c, owner[s], owner[e - 1], r))
        pointer = e
    audio = {r.stem: read_wav(r) for r in recs}
    for c, w0, w1, r in plan:
        first, last = stream[w0], stream[w1]
        if first["rec"] != last["rec"]:
            raise SystemExit(f"cut: clip '{c['id']}' spans two recordings")
        x, sr = audio[first["rec"]]
        prev_end = stream[w0 - 1]["e"] if w0 > 0 and stream[w0 - 1]["rec"] == first["rec"] else 0
        next_start = stream[w1 + 1]["s"] if w1 + 1 < len(stream) and stream[w1 + 1]["rec"] == first["rec"] else len(x) / sr
        # never past the midpoint of the gap to a neighbouring word, so two clips cut from one take never share audio
        # (they may be laid back at their natural spacing, see stage_layout)
        a = max(prev_end + 0.02, (prev_end + first["s"]) / 2, first["s"] - 0.25)
        b = min(next_start - 0.02, (last["e"] + next_start) / 2, last["e"] + 0.45)
        seg = x[int(a * sr): int(b * sr)]
        y = finish(seg, sr)
        # keep the clip-relative word times consistent with the trimmed audio
        lead = speech_bounds(seg, sr)[0] - int(0.05 * sr)
        shift = a + max(0, lead) / sr
        words = [{**w, "s": round(w["s"] - shift, 3), "e": round(w["e"] - shift, 3)} for w in stream[w0:w1 + 1]]
        write_wav(CLIPS / f"{c['id']}.wav", y, sr)
        (ASR / f"{c['id']}.json").write_text(json.dumps(words, indent=0))
        # where the clip came from: clip time 0 is `shift` seconds into recording `rec` (used for lip sync)
        (ASR / f"{c['id']}.src.json").write_text(json.dumps({"rec": first["rec"], "shift": round(shift, 4)}))
        print(f"  cut {c['id']:<12} {a:7.2f}-{b:7.2f}s  match={r:.2f}")
    print(f"cut: {len(plan)} clips from {len(recs)} recording(s)")


# ---------------------------------------------------------------- stage: layout
def srt_time(t, sep=","):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02}{sep}{ms % 1000:03}"


def wrap(text, width=42):
    if len(text) <= width:
        return [text]
    words, best = text.split(), None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        cost = abs(len(a) - len(b)) + (0 if max(len(a), len(b)) <= width else 100)
        if best is None or cost < best[0]:
            best = (cost, [a, b])
    return best[1]


def on_camera(name):
    """A recording that is also footage of Bill (public/video/bill-<slot>.mp4): its timing must be kept."""
    return bool(name) and Path(name).stem.startswith("bill-")


def stage_layout(args):
    sr_out, parts, timing_lines, t = None, [], [], SCRIPT["leadIn"]
    sources = json.loads((REC / "sources.json").read_text()) if args.source == "bill" and (REC / "sources.json").exists() else {}
    prev = None  # (rec, shift, t) of the previous clip
    for c in clips():
        src_file = ASR / f"{c['id']}.src.json"
        src = json.loads(src_file.read_text()) if sources and src_file.exists() else None
        name = sources.get(src["rec"]) if src else None
        # Consecutive clips from the same on-camera take keep the gap Bill actually left, instead of the designed
        # pause, so one continuous piece of footage stays in sync with every line he says in it.
        if src and prev and on_camera(name) and prev[0] == src["rec"]:
            t = prev[2] + (src["shift"] - prev[1])
        prev = (src["rec"], src["shift"], t) if src else None
        x, sr = read_wav(CLIPS / f"{c['id']}.wav")
        if sr_out is None:
            sr_out = sr
        if sr != sr_out:
            raise SystemExit("all clips must share one sample rate")
        asr_words = json.loads((ASR / f"{c['id']}.json").read_text())
        timed = words_for_lines(c["lines"], asr_words, offset=t)
        on, off = speech_bounds(x, sr)
        parts.append((t, x))
        for i, (line, words) in enumerate(zip(c["lines"], timed)):
            start = t + on / sr if i == 0 else words[0]["s"]
            end = t + off / sr if i == len(c["lines"]) - 1 else words[-1]["e"]
            if words:
                words[0]["s"] = round(max(words[0]["s"], start), 3)
            timing_lines.append({
                "id": line["id"], "scene": line["scene"], "slot": line.get("slot"), "clip": c["id"],
                "text": line["text"], "cue": line["cue"],
                "start": round(start, 3), "end": round(end, 3), "words": words,
                # footage time = film time + offset, in the on-camera file this line was cut from
                **({"source": {"file": name, "offset": round(src["shift"] - t, 3)}} if on_camera(name) else {}),
            })
        t += len(x) / sr + c["lines"][-1]["pause"]
    narration_end = timing_lines[-1]["end"]
    total = narration_end + SCRIPT["tail"]
    buf = np.zeros(int((total + 0.5) * sr_out), dtype=np.float32)
    for start, x in parts:
        i = int(round(start * sr_out))
        buf[i:i + len(x)] += x
    write_wav(OUT_AUDIO, buf[: int(total * sr_out)], sr_out)

    source = args.source
    timing = {
        "_generated": "by tools/voice.py — do not edit; change script/script.json and re-run npm run voice:scratch / voice:bill",
        "source": source,
        "voice": ("TEMPORARY synthetic voice (" + SCRIPT["voice"]["engine"] + ", '" + SCRIPT["voice"]["speaker"]
                  + "') — not Bill") if source == "scratch" else "Bill Badran (recorded)",
        "audio": "audio/narration.wav",
        "leadIn": SCRIPT["leadIn"],
        "narrationEnd": round(narration_end, 3),
        "tail": SCRIPT["tail"],
        "duration": round(total, 3),
        "lines": timing_lines,
    }
    OUT_TIMING.parent.mkdir(parents=True, exist_ok=True)
    OUT_TIMING.write_text(json.dumps(timing, indent=1, ensure_ascii=False) + "\n")

    OUT_CAPTIONS.mkdir(parents=True, exist_ok=True)
    srt, vtt = [], ["WEBVTT", ""]
    for n, l in enumerate(timing_lines, 1):
        nxt = timing_lines[n]["start"] if n < len(timing_lines) else l["end"] + 2
        end = min(l["end"] + 0.6, nxt - 0.05)
        body = "\n".join(wrap(l["text"]))
        srt += [str(n), f"{srt_time(l['start'])} --> {srt_time(end)}", body, ""]
        vtt += [f"{srt_time(l['start'], '.')} --> {srt_time(end, '.')}", body, ""]
    (OUT_CAPTIONS / "narration.srt").write_text("\n".join(srt))
    (OUT_CAPTIONS / "narration.vtt").write_text("\n".join(vtt))
    scenes = {}
    for l in timing_lines:
        scenes.setdefault(l["scene"], [l["start"], l["end"]])[1] = l["end"]
    print(f"layout: narration {narration_end:.1f}s + tail {SCRIPT['tail']}s = {total:.1f}s "
          f"({int(total // 60)}:{total % 60:04.1f})")
    for s, (a, b) in scenes.items():
        print(f"  {s:<11} {a:6.1f} – {b:6.1f}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="stage", required=True)
    s = sub.add_parser("tts")
    s.add_argument("--only", nargs="*")
    s = sub.add_parser("asr")
    s.add_argument("--recordings", action="store_true")
    s.add_argument("--gate", action="store_true")
    sub.add_parser("cut")
    s = sub.add_parser("layout")
    s.add_argument("--source", choices=["scratch", "bill"], required=True)
    a = p.parse_args()
    {"tts": stage_tts, "asr": stage_asr, "cut": stage_cut, "layout": stage_layout}[a.stage](a)
