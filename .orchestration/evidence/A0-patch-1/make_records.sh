#!/usr/bin/env bash
# A0 patch 1 (D-074): how the two CX-29 records registered in contracts/validate.py LANE_LOG_RECORDS were written
# (attempt 1, 2026-09-30T11:03:57Z; make-records.log). A record is written once, for its round, and is never
# regenerated in place. contracts/validate.py pins each record's sha256 and lists the files the round changed; only
# those supersede lane-log entries (math log: workshop-math.md and index.json; offers log: worker-handoff.schema.json,
# approval-scopes.md and unknown-task-id.why.txt). The registration, not a record's header line, says what a record
# supersedes. The other lines print the whole bundle for G3 and must match the current bytes, but supersede nothing.
# A later round (for example the math lane's fold, F02A-A6R3-P2-1) writes its own record in its own evidence folder
# and registers it after these (contracts README s1, CX-29). So this script refuses to overwrite an existing record
# (guard added in attempt 2, A0P1-A6-P2-1). Writes only the two .sha256.log files next to this script.
set -eu
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
HERE="$REPO/.orchestration/evidence/A0-patch-1"
for f in "$HERE/math-bundle.sha256.log" "$HERE/worker-handoff-1.1.sha256.log"; do
  if [ -e "$f" ]; then
    echo "refusing: $f exists; a CX-29 record is written once for its round (contracts README s1, CX-29)" >&2
    exit 3
  fi
done
cd "$REPO"
{
  echo "# A0 patch 1 CX-29 record: the workshop calculation bundle (G3/HB-26 hash list). Supersedes .orchestration/evidence/F02/math/validation.log"
  echo "# for workshop-math.md and index.json and records WM37-WM40 (F02a). date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ); HEAD $(git rev-parse HEAD) plus the uncommitted A0 patch 1 working tree"
  echo "\$ sha256sum .orchestration/contracts/workshop-inputs.schema.json .orchestration/contracts/workshop-inputs.md .orchestration/contracts/workshop-math.md .orchestration/contracts/workshop-clip-rules.md .orchestration/contracts/fixtures/workshop/*.json"
  sha256sum .orchestration/contracts/workshop-inputs.schema.json .orchestration/contracts/workshop-inputs.md \
            .orchestration/contracts/workshop-math.md .orchestration/contracts/workshop-clip-rules.md \
            .orchestration/contracts/fixtures/workshop/*.json
  echo "[exit $?]"
} > "$HERE/math-bundle.sha256.log"
{
  echo "# A0 patch 1 CX-29 record: worker handoff 1.1 (schema, examples, approval-scopes.md s8 semantics) and the offers-lane scripts that"
  echo "# generate and check it. Supersedes .orchestration/evidence/F02/offers/validation.log for these files. date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ); HEAD $(git rev-parse HEAD) plus the uncommitted A0 patch 1 working tree"
  echo "\$ sha256sum .orchestration/contracts/worker-handoff.schema.json .orchestration/contracts/approval-scopes.md .orchestration/contracts/examples/{valid,invalid}/worker-handoff/* .orchestration/evidence/F02/offers/gen_offers.py .orchestration/evidence/F02/offers/validate_offers.py"
  sha256sum .orchestration/contracts/worker-handoff.schema.json .orchestration/contracts/approval-scopes.md \
            .orchestration/contracts/examples/valid/worker-handoff/* .orchestration/contracts/examples/invalid/worker-handoff/* \
            .orchestration/evidence/F02/offers/gen_offers.py .orchestration/evidence/F02/offers/validate_offers.py
  echo "[exit $?]"
} > "$HERE/worker-handoff-1.1.sha256.log"
wc -l "$HERE/math-bundle.sha256.log" "$HERE/worker-handoff-1.1.sha256.log"
