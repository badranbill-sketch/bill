#!/usr/bin/env bash
# Reproduces .orchestration/evidence/F02/math/validation.log (F02, math lane).
# Usage: bash run_validation.sh /path/to/venv   (venv with jsonschema installed)
set -u
export PYTHONDONTWRITEBYTECODE=1
VENV="${1:?venv path}"
PY="$VENV/bin/python"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../../.." && pwd)"
run() { echo; echo "\$ $*"; "$@"; echo "[exit $?]"; }
{
  echo "# F02 math lane validation log"
  echo "# date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# repo: $REPO  branch: $(git -C "$REPO" branch --show-current)  HEAD: $(git -C "$REPO" rev-parse HEAD)"
  echo "# environment: local build container; fixture evidence only (no browser, no network, no provider)"
  run "$PY" -m pip show jsonschema
  run "$PY" "$HERE/build_schema.py" --check
  run "$PY" "$HERE/make_examples.py" --check
  run "$PY" "$HERE/compute_fixtures.py" --check
  run "$PY" "$HERE/validate.py"
  echo
  echo "\$ node -e '<float64 contrast for WM17 and WM24>'   # JavaScript behaviour, informative only"
  node -e 'const a=1000050*1.01; console.log("WM17 JS: 1000050*1.01 =",a.toPrecision(17),"Math.round ->",Math.round(a),"(half-even contract: 1010050)"); const b=1000800*1.025*1.025; console.log("WM24 JS: 1000800*1.025*1.025 =",b.toPrecision(17),"Math.round ->",Math.round(b),"(exact 1051465.5 -> half-even 1051466)");' ; echo "[exit $?]"
  echo
  echo "\$ node $HERE/cross_check_a6_model.mjs   # informative: repaired fixtures vs the A6 attempt-1 model (read-only import)"
  node "$HERE/cross_check_a6_model.mjs"; echo "[exit $?]"
  echo
  echo "\$ sha256sum <evidence scripts>"
  (cd "$REPO" && sha256sum .orchestration/evidence/F02/math/*.py .orchestration/evidence/F02/math/*.mjs .orchestration/evidence/F02/math/run_validation.sh)
} 2>&1
