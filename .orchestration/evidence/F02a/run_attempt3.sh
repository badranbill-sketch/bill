#!/usr/bin/env bash
# F02a repair attempt 3 (reviews/F02a-attempt2.md): re-verify on the live tree that nothing F02a owns changed and
# that the two A0-owned P2 items still reproduce exactly as the reviewer reported. Read-only except for its logs;
# every log holds exactly one command and one "[exit N]" line.
# Usage: bash run_attempt3.sh <venv with jsonschema>
set -u
export PYTHONDONTWRITEBYTECODE=1
VENV="${1:?venv path}"; PY="$VENV/bin/python"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
E=.orchestration/evidence/F02a
run() { echo "\$ $*"; "$@"; echo "[exit $?]"; }
hdr() { echo "# F02a repair attempt 3: $1. date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ); cwd $(pwd); HEAD $(git -C "$REPO" rev-parse HEAD)"; }
cd "$REPO"
{ hdr "sha256 of the files F02a must not change and of WM01-WM40, clip-rules.json and index.json, checked against after-hashes.log (attempt 1; the values reviews/F02a-attempt2.md verified)"
  echo "\$ grep -E '^[0-9a-f]{64}  ' $E/after-hashes.log | sha256sum -c"
  grep -E '^[0-9a-f]{64}  ' "$E/after-hashes.log" | sha256sum -c; echo "[exit $?]"
} > "$HERE/attempt3-hashes.log" 2>&1
{ hdr "contract-directory changes against HEAD (expected: index.json +42/-0 and the four untracked WM37-WM40 files only)"
  echo "\$ git diff --numstat HEAD -- .orchestration/contracts && git status --short -- .orchestration/contracts"
  git diff --numstat HEAD -- .orchestration/contracts && git status --short -- .orchestration/contracts; echo "[exit $?]"
} > "$HERE/attempt3-contracts-diff.log" 2>&1
{ hdr "F02a generator --check (WM37-WM40 and the appended index.json regenerate byte for byte; WM01-WM36 and clip-rules.json unchanged)"
  run "$PY" $E/compute_f02a_fixtures.py --check
} > "$HERE/attempt3-generate-check.log" 2>&1
{ hdr "F02a mutation check (faults injected in memory; run without --json, so mutation_check.json is not rewritten)"
  run "$PY" $E/mutation_check.py
} > "$HERE/attempt3-mutation.log" 2>&1
{ hdr "math lane validator, read-only run (expected exit 1: step 5 compute_fixtures.py --check does not know WM37-WM40; F02A-A6R2-P2-1, owner A0 / math lane)"
  run "$PY" .orchestration/evidence/F02/math/validate.py
} > "$HERE/attempt3-lane-validate.log" 2>&1
{ hdr "integrator harness on the live tree, before the attempt-3 handoff was regenerated (expected exit 1: CX-18, CX-21, CX-29, S9)"
  run "$PY" .orchestration/contracts/validate.py
} > "$HERE/attempt3-contracts-validate.log" 2>&1
echo "logs written to $HERE: attempt3-{hashes,contracts-diff,generate-check,mutation,lane-validate,contracts-validate}.log"
