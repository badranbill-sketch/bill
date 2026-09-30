#!/bin/bash
# A6 F02a attempt 3: reproduce every result in reviews/F02a-attempt3.md.
# Usage: PY=/path/to/python-with-jsonschema-4.26 ./run_all.sh   (from this directory)
# Writes only ./out and a scratch git-archive copy under $TMPDIR. No commit, no network.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../../.." && pwd)
PY=${PY:-python3}
PRE=${PRE:-$HERE/blockers.f01-accepted.md}
FX=$REPO/.orchestration/contracts/fixtures/workshop
OUT=$HERE/out
TMP=${TMPDIR:-/tmp}/a6-f02a-attempt3-head
mkdir -p "$OUT"
run() { local n=$1; shift; { echo "\$ $*"; "$@"; echo "[exit $?]"; } > "$OUT/$n" 2>&1; echo "$n $(tail -1 "$OUT/$n")"; }
export PYTHONDONTWRITEBYTECODE=1
{ echo "utc: $(date -u +%FT%TZ)"; echo "repo: $REPO"; echo "HEAD: $(git -C "$REPO" rev-parse HEAD) branch $(git -C "$REPO" branch --show-current)"; node --version; "$PY" --version; "$PY" -c 'import importlib.metadata as m; print("jsonschema", m.version("jsonschema"))'; bc --version | head -1; echo "[exit 0]"; } > "$OUT/00_env.log" 2>&1
run 01_model_suite.log node "$HERE/run_suite.mjs" "$FX"
run 02_perturb.log node "$HERE/perturb.mjs" "$FX"
run 03_hand_bc.log bash "$HERE/hand_bc.sh"
run 04_schema_handoff.log "$PY" "$HERE/schema_check.py" "$REPO"
{ echo "\$ git diff --stat HEAD -- .orchestration/contracts"; git -C "$REPO" diff --stat HEAD -- .orchestration/contracts
  echo "\$ git diff --numstat HEAD -- .orchestration/contracts"; git -C "$REPO" diff --numstat HEAD -- .orchestration/contracts
  echo "\$ git status --short --untracked-files=all -- .orchestration/contracts"; git -C "$REPO" status --short --untracked-files=all -- .orchestration/contracts
  echo "removed lines in index.json diff: $(git -C "$REPO" diff HEAD -- .orchestration/contracts/fixtures/workshop/index.json | grep -c '^-[^-]')"
  echo "--- working file vs HEAD blob"
  for f in $(git -C "$REPO" ls-files .orchestration/contracts); do a=$(sha256sum "$REPO/$f" | cut -c1-64); b=$(git -C "$REPO" show "HEAD:$f" | sha256sum | cut -c1-64); [ "$a" = "$b" ] || echo "DIFF $f"; done
  echo "tracked contract files compared: $(git -C "$REPO" ls-files .orchestration/contracts | wc -l)"
  for f in README.md validate.py workshop-math.md workshop-inputs.md workshop-clip-rules.md workshop-inputs.schema.json worker-handoff.schema.json fixtures/workshop/clip-rules.json; do echo "$(sha256sum "$REPO/.orchestration/contracts/$f" | cut -c1-64)  $f"; done
  echo "--- files outside F02a paths unchanged vs HEAD (empty = unchanged)"; git -C "$REPO" status --short -- .orchestration/evidence/F02 .orchestration/decisions.md .orchestration/blockers.md .orchestration/costs.json .orchestration/tasks.json
  echo "[exit 0]"; } > "$OUT/05_git_contracts.log" 2>&1; echo "05_git_contracts.log [exit 0]"
( cd "$REPO" && run 06_validate_live.log "$PY" .orchestration/contracts/validate.py )
rm -rf "$TMP" && mkdir -p "$TMP" && git -C "$REPO" archive HEAD .orchestration/contracts | tar -x -C "$TMP"
( cd "$REPO" && run 07_validate_head_contracts_baseline.log "$PY" .orchestration/contracts/validate.py --contracts-dir "$TMP/.orchestration/contracts" )
( cd "$REPO" && run 08_validate_handoff.log "$PY" .orchestration/contracts/validate.py --handoff .orchestration/handoffs/F02a.json )
( cd "$REPO" && run 09_lane_validate.log "$PY" .orchestration/evidence/F02/math/validate.py )
( cd "$REPO" && run 10_after_hashes_recheck.log bash -c "grep -E '^[0-9a-f]{64}  ' .orchestration/evidence/F02a/after-hashes.log | sha256sum -c" )
run 11_blockers_diff.log diff -u "$PRE" "$REPO/.orchestration/blockers.md"
run 12_blockers_checks.log "$PY" "$HERE/blockers_checks.py" "$PRE" "$REPO"
{ for f in .orchestration/contracts/fixtures/workshop/WM3[7-9]*.json .orchestration/contracts/fixtures/workshop/WM40*.json .orchestration/contracts/fixtures/workshop/index.json .orchestration/handoffs/F02a.json .orchestration/blockers.md .orchestration/decisions.md .orchestration/costs.json; do (cd "$REPO" && sha256sum $f); done; sha256sum "$PRE"; echo "[exit 0]"; } > "$OUT/13_reviewed_hashes.log" 2>&1; echo "13_reviewed_hashes.log [exit 0]"
