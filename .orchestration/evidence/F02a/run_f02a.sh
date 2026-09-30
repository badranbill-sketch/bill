#!/usr/bin/env bash
# F02a: reproduce every "after" log in .orchestration/evidence/F02a/ (the before-*.log files were captured
# with the same commands before any F02a file existed).
# Usage: bash run_f02a.sh <venv with jsonschema> <A6 run dir>
#   <A6 run dir> is a scratch copy of .orchestration/evidence/F02/a6-math-attempt3/*.mjs plus node_modules (ajv);
#   the A6 scripts are run unmodified from there, so their ./out writes never touch the A6 evidence directory.
#   The copy is checked against the A6 MANIFEST.sha256 first.
set -u
export PYTHONDONTWRITEBYTECODE=1
VENV="${1:?venv path}"; A6RUN="${2:?A6 run dir}"
PY="$VENV/bin/python"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
A6SRC="$REPO/.orchestration/evidence/F02/a6-math-attempt3"
run() { echo "\$ $*"; "$@"; echo "[exit $?]"; }
hdr() { echo "# $1. date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ); cwd $(pwd)"; }
cd "$REPO"
{ hdr "F02a generator --check (WM37-WM40 + appended index.json; WM01-WM36 and clip-rules.json unchanged)"
  run "$PY" .orchestration/evidence/F02a/compute_f02a_fixtures.py --check; } > "$HERE/after-generate-check.log" 2>&1
{ hdr "F02a mutation check on the lane reference model (faults injected in memory)"
  run "$PY" .orchestration/evidence/F02a/mutation_check.py --json .orchestration/evidence/F02a/mutation_check.json; } > "$HERE/mutation_check.log" 2>&1
{ hdr "F02a: A6 attempt-3 harness copy integrity"
  echo "\$ (cd $A6SRC && grep '\.mjs$' MANIFEST.sha256) | (cd $A6RUN && sha256sum -c)"
  (cd "$A6SRC" && grep '\.mjs$' MANIFEST.sha256) | (cd "$A6RUN" && sha256sum -c); echo "[exit $?]"; } > "$HERE/after-a6-copy-integrity.log" 2>&1
cd "$A6RUN"
{ hdr "F02a AFTER: A6 attempt-3 negative controls (unmodified faults_run.mjs + model_faults.mjs; reads every WM*.json in contracts/fixtures/workshop)"
  run node faults_run.mjs; } > "$HERE/after-a6-faults_run.log" 2>&1
{ hdr "F02a AFTER: A6 independent BigInt model vs every WM fixture (unmodified run_fixtures.mjs)"
  run node run_fixtures.mjs; } > "$HERE/after-a6-run_fixtures.log" 2>&1
cd "$REPO"
{ hdr "F02a AFTER: math lane validator (read-only run)"
  run "$PY" .orchestration/evidence/F02/math/validate.py; } > "$HERE/after-lane-validate.log" 2>&1
{ hdr "F02a AFTER: integrator harness"
  run "$PY" .orchestration/contracts/validate.py; } > "$HERE/after-contracts-validate.log" 2>&1
{ hdr "F02a AFTER: hashes of the contract files F02a must not change, and of the new fixtures"
  run sha256sum .orchestration/contracts/workshop-math.md .orchestration/contracts/workshop-inputs.md \
    .orchestration/contracts/workshop-inputs.schema.json .orchestration/contracts/workshop-clip-rules.md \
    .orchestration/contracts/validate.py .orchestration/contracts/worker-handoff.schema.json \
    .orchestration/contracts/fixtures/workshop/*.json; } > "$HERE/after-hashes.log" 2>&1
echo "logs written to $HERE"
