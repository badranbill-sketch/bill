#!/usr/bin/env bash
# Download generated media: tools/fetch.sh OUT_FILE URL  (signed URLs from ElevenLabs expire after ~2 h)
set -euo pipefail
mkdir -p "$(dirname "$1")"
curl -sfL -o "$1" "$2"
echo "  $1  ($(du -h "$1" | cut -f1))"
