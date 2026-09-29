"""Render narration takes with Chatterbox (English).

Run with the audiodrama TTS env:
  ~/Work/audiodrama/envs/tts/bin/python scripts/narration/render.py OUT_DIR [takes]
Writes OUT_DIR/cXX_takeY.wav plus OUT_DIR/takes.json.
"""
import json, os, sys
import numpy as np, soundfile as sf, torch
from chatterbox.tts import ChatterboxTTS

here = os.path.dirname(os.path.abspath(__file__))
spec = json.load(open(os.path.join(here, "narration.json")))
out = sys.argv[1]
takes = int(sys.argv[2]) if len(sys.argv) > 2 else 4
os.makedirs(out, exist_ok=True)
voice = os.path.expanduser(spec["voice"])
model = ChatterboxTTS.from_pretrained(device="cuda")
s = spec["settings"]

def trim(wav, sr, floor_db=-45, pad_ms=60):
    """Cut leading/trailing silence (and trailing breath noise) by frame energy."""
    frame = int(sr * 0.02)
    n = len(wav) // frame
    if n == 0:
        return wav
    rms = np.array([np.sqrt(np.mean(wav[i * frame:(i + 1) * frame] ** 2) + 1e-12) for i in range(n)])
    db = 20 * np.log10(rms / (rms.max() + 1e-12))
    voiced = np.where(db > floor_db)[0]
    if len(voiced) == 0:
        return wav
    pad = int(sr * pad_ms / 1000)
    a = max(0, voiced[0] * frame - pad)
    b = min(len(wav), (voiced[-1] + 1) * frame + pad)
    return wav[a:b]

manifest = []
idx = 0
for ci, chapter in enumerate(spec["chapters"]):
    for line in chapter:
        idx += 1
        variants = line.get("variants") or [line["text"]]
        for k in range(takes):
            text = variants[k % len(variants)]
            torch.manual_seed(1000 * idx + k)
            wav = model.generate(text, audio_prompt_path=voice, exaggeration=s["exaggeration"],
                                 cfg_weight=s["cfg_weight"], temperature=s["temperature"])
            wav = wav.squeeze().cpu().numpy().astype(np.float32)
            wav = trim(wav, model.sr)
            path = os.path.join(out, f"c{idx:02d}_take{k}.wav")
            sf.write(path, wav, model.sr)
            manifest.append({"chunk": idx, "chapter": ci, "take": k, "text": line["text"],
                             "spoken": text, "wav": path, "seconds": round(len(wav) / model.sr, 2)})
            print(f"chunk {idx} take {k}: {manifest[-1]['seconds']}s  {text}", flush=True)
json.dump(manifest, open(os.path.join(out, "takes.json"), "w"), indent=1)
print("done", len(manifest), "takes")
