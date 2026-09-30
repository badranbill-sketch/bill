#!/usr/bin/env bash
# A6 F02a attempt-2 verification runner. Read-only for the repo: writes only ./out/ and a scratch git-archive copy.
# Usage: PY=<python with jsonschema 4.26> PRE=<pre-patch blockers copy> ./run_all.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO=/home/user/bill
PY="${PY:-/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-f02/bin/python}"
PRE="${PRE:-/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/blockers.f01-accepted.md}"
SCR="${SCR:-/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6-f02a-2}"
OUT="$HERE/out"; mkdir -p "$OUT"
export PYTHONDONTWRITEBYTECODE=1
run() { local n="$1"; shift; { echo "\$ $*"; "$@"; echo "[exit $?]"; } > "$OUT/$n" 2>&1; echo "$n: $(tail -1 "$OUT/$n")"; }

{ echo "utc: $(date -u +%FT%TZ)"; "$PY" -c 'import sys,importlib.metadata as m;print("python",sys.version.split()[0],"jsonschema",m.version("jsonschema"))';
  echo "HEAD $(git -C $REPO rev-parse HEAD) branch $(git -C $REPO branch --show-current)"; } > "$OUT/00_env.log" 2>&1
run 01_model_and_faults.log "$PY" "$HERE/run_model.py" "$REPO/.orchestration/contracts"
run 02_hand_and_selftest.log "$PY" "$HERE/hand_and_selftest.py" "$REPO/.orchestration/contracts"
run 03_git_diff_stat_contracts.log git -C "$REPO" diff --stat HEAD -- .orchestration/contracts
run 04_git_numstat_status_contracts.log bash -c "git -C $REPO diff --numstat HEAD -- .orchestration/contracts; git -C $REPO status --porcelain --untracked-files=all -- .orchestration/contracts; echo 'removed lines in index.json diff:'; git -C $REPO diff HEAD -- .orchestration/contracts/fixtures/workshop/index.json | grep -c '^-[^-]'"
run 05_contract_hashes_vs_HEAD.log bash -c "cd $REPO/.orchestration/contracts; for f in README.md validate.py workshop-math.md workshop-inputs.md workshop-clip-rules.md workshop-inputs.schema.json worker-handoff.schema.json fixtures/workshop/clip-rules.json fixtures/workshop/index.json; do a=\$(sha256sum \$f|cut -c1-64); b=\$(git -C $REPO show HEAD:.orchestration/contracts/\$f|sha256sum|cut -c1-64); [ \"\$a\" = \"\$b\" ] && s=same || s=CHANGED; echo \"\$s \$a \$f\"; done; for f in fixtures/workshop/WM*.json; do git -C $REPO cat-file -e HEAD:.orchestration/contracts/\$f 2>/dev/null && { a=\$(sha256sum \$f|cut -c1-64); b=\$(git -C $REPO show HEAD:.orchestration/contracts/\$f|sha256sum|cut -c1-64); [ \"\$a\" = \"\$b\" ] || echo CHANGED \$f; } || echo \"NEW \$(sha256sum \$f)\"; done; echo 'tracked WM01-WM36: any CHANGED line above would list them'"
run 06_contracts_validate.log bash -c "cd $REPO && $PY .orchestration/contracts/validate.py"
rm -rf "$SCR/headcopy" && mkdir -p "$SCR/headcopy" && git -C "$REPO" archive HEAD .orchestration/contracts | tar -x -C "$SCR/headcopy"
run 07_contracts_validate_HEAD_contracts.log bash -c "cd $REPO && $PY .orchestration/contracts/validate.py --contracts-dir $SCR/headcopy/.orchestration/contracts"
run 08_contracts_validate_handoff.log bash -c "cd $REPO && $PY .orchestration/contracts/validate.py --handoff .orchestration/handoffs/F02a.json"
run 09_handoff_check_a6.log "$PY" "$HERE/check_handoff_a6r2.py"
run 10_lane_validate.log bash -c "cd $REPO && $PY .orchestration/evidence/F02/math/validate.py"
run 11_blockers_diff.log diff -u "$PRE" "$REPO/.orchestration/blockers.md"
run 12_blockers_checks.log python3 "$HERE/blockers_checks.py" "$PRE"
run 13_blockers_hashes.log bash -c "sha256sum $PRE $REPO/.orchestration/evidence/F02a/a6-attempt1/blockers.f01-accepted.md $REPO/.orchestration/blockers.md; git -C $REPO show HEAD:.orchestration/blockers.md | sha256sum; git -C $REPO status --porcelain -- .orchestration/blockers.md .orchestration/decisions.md .orchestration/costs.json .orchestration/tasks.json; echo '(empty status = identical to HEAD)'"
