#!/usr/bin/env bash
# F02 offers lane: reproducible validation run. Writes validation.log next to this script.
# Usage: bash .orchestration/evidence/F02/offers/run_validation.sh
set -u
REPO=/home/user/bill
VENV=/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-f02
LANE=$REPO/.orchestration/evidence/F02/offers
LOG=$LANE/validation.log
cd "$REPO" || exit 2

generated_files() {
  ls .orchestration/contracts/offer-matrix.json \
     .orchestration/contracts/asset-manifest.schema.json \
     .orchestration/contracts/worker-handoff.schema.json
  find .orchestration/contracts/examples/valid/offer-matrix .orchestration/contracts/examples/invalid/offer-matrix \
       .orchestration/contracts/examples/valid/asset-manifest .orchestration/contracts/examples/invalid/asset-manifest \
       .orchestration/contracts/examples/valid/worker-handoff .orchestration/contracts/examples/invalid/worker-handoff \
       -type f | sort
}

{
  echo "# F02 offers lane validation log"
  echo "# written by: bash .orchestration/evidence/F02/offers/run_validation.sh"
  echo
  echo "\$ python3 -m venv $VENV && $VENV/bin/pip install jsonschema"
  python3 -m venv "$VENV" 2>&1; echo "venv exit=$?"
  "$VENV/bin/pip" install --disable-pip-version-check jsonschema 2>&1 | tail -n 3; echo "pip exit=${PIPESTATUS[0]}"
  echo
  echo "## Determinism check: regenerate and compare sha256 of every generated file"
  before=$(generated_files | xargs sha256sum)
  echo "\$ $VENV/bin/python .orchestration/evidence/F02/offers/gen_offers.py"
  "$VENV/bin/python" .orchestration/evidence/F02/offers/gen_offers.py 2>&1; echo "gen exit=$?"
  after=$(generated_files | xargs sha256sum)
  n=$(echo "$after" | wc -l)
  if [ "$before" = "$after" ]; then echo "PASS  regeneration is byte-identical ($n files)"; else echo "FAIL  regeneration changed files:"; diff <(echo "$before") <(echo "$after"); fi
  echo
  echo "\$ $VENV/bin/python .orchestration/evidence/F02/offers/validate_offers.py"
  "$VENV/bin/python" .orchestration/evidence/F02/offers/validate_offers.py 2>&1
  rc=$?
  echo "validate exit=$rc"
  echo
  echo "## sha256 of the lane's generated files (as validated)"
  echo "$after"
} > "$LOG" 2>&1
tail -n 4 "$LOG" | head -n 1 >/dev/null
grep -E '^(pass:|validate exit=|PASS  regeneration|FAIL  regeneration)' "$LOG"
