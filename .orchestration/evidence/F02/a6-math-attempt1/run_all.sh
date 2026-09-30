#!/usr/bin/env bash
# A6 F02 math review, attempt 1 - reproduces run.log.
# Usage: bash run_all.sh [workdir]   (workdir holds these scripts; `npm ci` installs ajv 8 from package-lock.json)
set -u
WORK="${1:-$(cd "$(dirname "$0")" && pwd)}"
REPO=/home/user/bill
cd "$WORK" || exit 2
[ -d node_modules/ajv ] || npm ci --silent >/dev/null 2>&1
run() { echo; echo "\$ $*"; "$@"; echo "[exit $?]"; }
{
  echo "# A6 independent math verification of F02 (attempt 1)"
  echo "# date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# repo: $REPO  branch: $(git -C "$REPO" branch --show-current)  HEAD: $(git -C "$REPO" rev-parse HEAD)"
  echo "# environment: local container, node $(node --version), ajv $(node -p "require('ajv/package.json').version"); fixture evidence only (no browser, no network, no provider)"
  echo "# independence: evidence/F02/math/compute_fixtures.py and workshop_reference.py were not read, imported or executed"
  echo
  echo "\$ sha256sum <reviewed artifacts>   # compared with evidence/F02/math/validation.log"
  (cd "$REPO" && sha256sum .orchestration/contracts/workshop-inputs.schema.json .orchestration/contracts/workshop-inputs.md .orchestration/contracts/workshop-math.md .orchestration/contracts/workshop-clip-rules.md .orchestration/contracts/fixtures/workshop/*.json) | tee /tmp/a6_cur_hashes.$$
  (cd "$REPO" && grep -E '^[0-9a-f]{64}  \.orchestration/contracts/(workshop|fixtures)' .orchestration/evidence/F02/math/validation.log) > /tmp/a6_log_hashes.$$
  if diff -q /tmp/a6_log_hashes.$$ /tmp/a6_cur_hashes.$$ >/dev/null; then echo "hashes identical to validation.log: yes"; else echo "hashes identical to validation.log: NO"; fi
  rm -f /tmp/a6_cur_hashes.$$ /tmp/a6_log_hashes.$$
  run node run_fixtures.mjs
  run node clip_rules.mjs
  run node validate_schema.mjs
  run node negative_controls.mjs
  run node ambiguity_demo.mjs
  run node extra_checks.mjs
  echo
  echo "\$ sha256sum <A6 scripts>"
  sha256sum model.mjs run_fixtures.mjs run_fixtures_lib.mjs clip_rules.mjs validate_schema.mjs negative_controls.mjs ambiguity_demo.mjs extra_checks.mjs run_all.sh package.json package-lock.json
} 2>&1
