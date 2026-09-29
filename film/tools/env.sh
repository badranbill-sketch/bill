# Python environments used ONLY to regenerate narration, music and sound effects.
# Rendering the film needs Node only: the generated files in public/ and src/data/ ship with the project.
# Override any of these by exporting the variable before running the npm script.
PY_TTS="${PY_TTS:-$HOME/Work/lumenhaus-marc-video/tts/.venv-qwen/bin/python}"   # qwen_tts, torch, numpy, soundfile
PY_ASR="${PY_ASR:-$HOME/Work/lumenhaus-marc-video/tts/.venv-asr/bin/python}"    # faster_whisper, numpy
PY_AUDIO="${PY_AUDIO:-python3}"                                                  # numpy, scipy (music + sfx)
