#!/usr/bin/env bash
# Narration builder.
#   tools/voice.sh scratch             temporary synthetic voice made locally with Qwen3-TTS (placeholder, NOT Bill)
#   tools/voice.sh import TAKE…        temporary voice generated elsewhere (ElevenLabs), long takes in script order
#   tools/voice.sh bill FILE [FILE…]   Bill's real recording(s): wav/mp3/m4a/mov… read in script order.
#                                      On-camera files named bill-<slot>.mp4 (the same files as in public/video/)
#                                      keep their natural timing, and the film syncs his lips to them automatically.
# Both end with public/audio/narration.wav, src/data/timing.json and public/captions/narration.{srt,vtt}.
#
# VOICE_SET=reel tools/voice.sh bill FILE…   the same for the 30-second Instagram Reel (npm run voice:reel): reads
#                                      script/reel.json and writes public/audio/reel-narration.wav,
#                                      src/data/reel-timing.json and public/captions/reel.{srt,vtt}.
set -euo pipefail
cd "$(dirname "$0")/.."
source tools/env.sh
export VOICE_SET="${VOICE_SET:-film}"
case "$VOICE_SET" in
  film) BUILD=build/voice; SCRIPT=script/script.json ;;
  reel) BUILD=build/voice-reel; SCRIPT=script/reel.json ;;
  *) echo "VOICE_SET must be film or reel"; exit 1 ;;
esac
REC="$BUILD/recordings"
mode="${1:-}"; shift || true
if [ "$VOICE_SET" = reel ] && [ "$mode" != bill ]; then
  echo "The reel takes Bill's own recording only: npm run voice:reel -- <recording(s)>"; exit 1
fi
case "$mode" in
  scratch)
    for attempt in 1 2 3 4; do
      "$PY_TTS" tools/voice.py tts
      if "$PY_ASR" tools/voice.py asr --gate; then break; fi
      [ "$attempt" = 4 ] && { echo "Some clips still fail the intelligibility gate; see above."; exit 1; }
      echo "Regenerating failing clips (attempt $((attempt + 1)))…"
    done
    "$PY_TTS" tools/voice.py layout --source scratch
    ;;
  bill)
    [ $# -ge 1 ] || { echo "usage: tools/voice.sh bill /path/to/recording.wav [more files…]"; exit 1; }
    rm -f "$REC"/*.wav
    mkdir -p "$REC"
    n=0
    echo "{" > "$REC/sources.json"
    for f in "$@"; do
      n=$((n + 1))
      ffmpeg -v error -y -i "$f" -vn -ac 1 -ar 48000 -c:a pcm_s16le "$REC/$(printf %02d $n).wav"
      [ $n -gt 1 ] && echo "," >> "$REC/sources.json"
      printf '"%02d": "%s"' $n "$(basename "$f")" >> "$REC/sources.json"
    done
    echo "}" >> "$REC/sources.json"
    "$PY_ASR" tools/voice.py asr --recordings
    "$PY_TTS" tools/voice.py cut
    "$PY_TTS" tools/voice.py layout --source bill
    if [ "$VOICE_SET" = reel ]; then node tools/reel-captions.mjs; fi
    ;;
  import)
    # a temporary narration generated elsewhere (e.g. ElevenLabs), as long takes in script order; each take is
    # slowed by script.json voice.stretch (1.10 = 10% slower, pitch kept) and cut into lines like a recording
    [ $# -ge 1 ] || { echo "usage: tools/voice.sh import take1.mp3 [take2.mp3 …]"; exit 1; }
    stretch=$(python3 -c "import json; print(json.load(open('$SCRIPT'))['voice'].get('stretch', 1))")
    rm -f "$REC"/*.wav "$REC/sources.json"
    mkdir -p "$REC"
    n=0
    for f in "$@"; do
      n=$((n + 1))
      out="$REC/$(printf %02d $n).wav"
      ffmpeg -v error -y -i "$f" -vn -ac 1 -ar 48000 -c:a pcm_s16le "$out.src.wav"
      rubberband -q --fine -t "$stretch" "$out.src.wav" "$out" && rm "$out.src.wav"
    done
    "$PY_ASR" tools/voice.py asr --recordings
    "$PY_TTS" tools/voice.py cut
    "$PY_TTS" tools/voice.py layout --source scratch
    ;;
  *) echo "usage: tools/voice.sh scratch | import TAKE… | bill FILE [FILE…]"; exit 1 ;;
esac
