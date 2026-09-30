#!/usr/bin/env bash
# A6 F02a attempt 1 - reproduce every check in reviews/F02a.md.
# Usage: PY=/path/to/python-with-jsonschema-4.26 PREPATCH=/path/to/blockers.f01-accepted.md ./run_all.sh
# Writes only ./out/ and a temporary directory (git archive of HEAD). No network, no commits.
set -u
cd "$(dirname "$0")"
HERE=$(pwd)
REPO=$(git -C "$HERE" rev-parse --show-toplevel)
PY=${PY:-python3}
PREPATCH=${PREPATCH:-$HERE/blockers.f01-accepted.md}
FIX=$REPO/.orchestration/contracts/fixtures/workshop
SCHEMA=$REPO/.orchestration/contracts/workshop-inputs.schema.json
export PYTHONDONTWRITEBYTECODE=1
OUT=$HERE/out; mkdir -p "$OUT"
run() { local name=$1; shift; { echo "\$ $*"; echo "# utc $(date -u +%FT%TZ); cwd $(pwd)"; "$@"; echo "[exit $?]"; } > "$OUT/$name.log" 2>&1; tail -1 "$OUT/$name.log" | sed "s/^/$name: /"; }
FAULTS=today_dollars_uses_q,joint_uses_partner,group_from_rounded_rows,deflate_rounded_gap,today_carry_to_tR,today_one_year_less,today_as_nominal,today_indexed_at_i_after_start,joint_uses_older
# A1 independent model: contract reading on all WM fixtures + clip cases, then fault switches
run 01_model_and_faults "$PY" run_checks.py "$FIX" "$SCHEMA" "$FAULTS"
run 02_hand_checks "$PY" hand_checks.py "$FIX"
run 03_extra_faults "$PY" extra_faults.py "$FIX" "$SCHEMA"
# A2 contract text unchanged
( cd "$REPO" && run 04_git_diff_contracts git diff --stat HEAD -- .orchestration/contracts )
( cd "$REPO" && run 05_git_numstat_and_untracked sh -c 'git diff --numstat HEAD -- .orchestration/contracts; echo "untracked:"; git ls-files --others --exclude-standard -- .orchestration/contracts' )
( cd "$REPO" && run 06_attempt3_hashes sha256sum -c .orchestration/evidence/F02/a6-math-attempt3/out/contract_hashes.txt )
# A3 validators
( cd "$REPO" && run 07_contracts_validate "$PY" .orchestration/contracts/validate.py )
( cd "$REPO" && run 08_contracts_validate_handoff "$PY" .orchestration/contracts/validate.py --handoff .orchestration/handoffs/F02a.json )
( cd "$REPO" && run 09_lane_validate "$PY" .orchestration/evidence/F02/math/validate.py )
TMPH=$(mktemp -d); git -C "$REPO" archive HEAD | tar -x -C "$TMPH"
( cd "$TMPH" && GIT_OPTIONAL_LOCKS=0 GIT_DIR=$REPO/.git run 10_contracts_validate_at_HEAD "$PY" .orchestration/contracts/validate.py )
rm -rf "$TMPH"
# A4 handoff
( cd "$REPO" && run 11_handoff_hashes_schema "$PY" "$HERE/check_handoff_a6.py" )
# B blockers.md patch
run 12_blockers_diff diff -u "$PREPATCH" "$REPO/.orchestration/blockers.md"
run 13_blockers_hashes sha256sum "$PREPATCH" "$REPO/.orchestration/blockers.md"
run 14_gate_map_check "$PY" gate_map_check.py "$PREPATCH" "$REPO/.orchestration/blockers.md"
( cd "$REPO/.orchestration" && run 15_d070_and_costs_pointers sh -c 'grep -n "^| D-070" decisions.md | grep -c -i -E "backup destination|encryption key|media-master" ; grep -n "HB-02" costs.json; grep -n "Status: \*\*submitted, not accepted\*\*" blockers.md; grep -n "post-acceptance" blockers.md | cut -c1-80' )
