#!/usr/bin/env bash
# A0 patch 1 (D-074): the "after" evidence. Writes only into this folder, plus scratch copies under $SCRATCH.
# Usage: bash run_after.sh   (VENV and SCRATCH may be overridden)
set -u
export PYTHONDONTWRITEBYTECODE=1
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
E="$REPO/.orchestration/evidence/A0-patch-1"
VENV="${VENV:-/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-f02}"
SCRATCH="${SCRATCH:-/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a0p1-nc}"
PY="$VENV/bin/python"
V=.orchestration/contracts/validate.py
cd "$REPO" || exit 2
run() { echo; echo "\$ $*"; "$@"; echo "[exit $?]"; }

# 1. (attempt 1 ran make_records.sh here, writing the two CX-29 records and make-records.log. Attempt 2 removed the
#    step: a record is written once for its round and is pinned in contracts/validate.py; A0P1-A6-P2-1. Attempt 2's
#    own evidence is written by run_attempt2.sh.)

# 2. full validator
{ echo "# A0 patch 1 AFTER: full contract validator. date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ); cwd $REPO"
  run "$PY" "$V"; } > "$E/after-contracts-validate.log" 2>&1

# 3. deep handoff checks
for t in F00 F02 F02a F03; do
  { echo "# A0 patch 1 AFTER: validate.py --handoff handoffs/$t.json. date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    run "$PY" "$V" --handoff ".orchestration/handoffs/$t.json"; } > "$E/after-handoff-$t.log" 2>&1
done

# 4. negative controls on scratch copies (README s7 "Negative control on a copy"); each defect must give exit 1
rm -rf "$SCRATCH"; mkdir -p "$SCRATCH"
{ echo "# A0 patch 1: negative controls on scratch copies of contracts/ (validate.py --contracts-dir). date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# expected: nc0 (unmodified copy) exit 0; every other case exit 1 with the named check failing"
  summarize() { grep -E '^(## Summary|pass: |exit_code=)' "$1"; grep -E '^  - ' "$1" | cut -c1-260; }
  mk() { rm -rf "$SCRATCH/$1"; cp -a .orchestration/contracts "$SCRATCH/$1"; }
  mk nc0
  echo; echo "== nc0: unmodified copy of the current contracts/"
  "$PY" "$V" --contracts-dir "$SCRATCH/nc0" > "$SCRATCH/nc0.log" 2>&1; echo "[exit $?]"; summarize "$SCRATCH/nc0.log"
  mkdir -p "$SCRATCH/head"; git archive HEAD .orchestration/contracts | tar -x -C "$SCRATCH/head"
  echo; echo "== nc1: contracts/ at HEAD $(git rev-parse --short HEAD) (before A0 patch 1), checked by the patched validate.py"
  "$PY" "$V" --contracts-dir "$SCRATCH/head/.orchestration/contracts" > "$SCRATCH/nc1.log" 2>&1; echo "[exit $?]"; summarize "$SCRATCH/nc1.log"
  mk nc2; "$PY" - "$SCRATCH/nc2/worker-handoff.schema.json" <<'PYEOF'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
pat = d["properties"]["task_id"]["pattern"]
d["properties"]["task_id"]["pattern"] = "^(?:" + pat[4:-2].replace("|F02a|", "|") + ")[a-z]?$"
open(p, "w").write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
PYEOF
  echo; echo "== nc2: task_id pattern widened to a generic [a-z] suffix on every ID (expect CX-18)"
  "$PY" "$V" --contracts-dir "$SCRATCH/nc2" > "$SCRATCH/nc2.log" 2>&1; echo "[exit $?]"; summarize "$SCRATCH/nc2.log"
  mk nc3; "$PY" - "$SCRATCH/nc3/workshop-math.md" <<'PYEOF'
import re, sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
s2 = re.sub(r"^\| WM40 \|[^\n]*\n", "", s, flags=re.M)
assert s2 != s
open(p, "w", encoding="utf-8").write(s2)
PYEOF
  echo; echo "== nc3: the WM40 row removed from the workshop-math.md s10 table (expect CX-21)"
  "$PY" "$V" --contracts-dir "$SCRATCH/nc3" > "$SCRATCH/nc3.log" 2>&1; echo "[exit $?]"; summarize "$SCRATCH/nc3.log"
  mk nc4; "$PY" - "$SCRATCH/nc4/fixtures/workshop" <<'PYEOF'
import json, sys, pathlib
d = pathlib.Path(sys.argv[1])
doc = json.loads((d / "WM40-today-dollar-display-from-exact-gap.json").read_text(encoding="utf-8"))
doc["fixture_id"] = "WM41"
(d / "WM41-unrecorded-copy.json").write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
PYEOF
  echo; echo "== nc4: an extra fixture WM41 with no index entry, no s10 row and no recorded hash (expect S5, CX-21, CX-29)"
  "$PY" "$V" --contracts-dir "$SCRATCH/nc4" > "$SCRATCH/nc4.log" 2>&1; echo "[exit $?]"; summarize "$SCRATCH/nc4.log"
  mk nc5; sed -i 's#"https://bill.contracts.local/worker-handoff/1.1"#"https://bill.contracts.local/worker-handoff/1.0"#' "$SCRATCH/nc5/worker-handoff.schema.json"
  echo; echo "== nc5: worker-handoff \$id set back to 1.0 while the title and index row say 1.1 (expect S2, CX-01)"
  "$PY" "$V" --contracts-dir "$SCRATCH/nc5" > "$SCRATCH/nc5.log" 2>&1; echo "[exit $?]"; summarize "$SCRATCH/nc5.log"
} > "$E/negative-controls-copy.log" 2>&1

# 5. lane validators, read-only
{ echo "# A0 patch 1: the three lane validators re-run read-only (PYTHONDONTWRITEBYTECODE=1). date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  run "$PY" .orchestration/evidence/F02/data/validate_f02_data.py
  run "$PY" .orchestration/evidence/F02/math/validate.py
  run "$PY" .orchestration/evidence/F02/offers/validate_offers.py
} > "$E/after-lane-validators.log" 2>&1

# 6. diff, untracked files, status
git diff -- .orchestration > "$E/patch.diff"
{ echo "# git status --short -- .orchestration (after A0 patch 1); date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ); HEAD $(git rev-parse HEAD)"
  git status --short -- .orchestration
  echo; echo "# untracked files (git ls-files --others --exclude-standard -- .orchestration)"
  git ls-files --others --exclude-standard -- .orchestration
  echo; echo "# git diff --stat -- .orchestration"
  git diff --stat -- .orchestration
} > "$E/untracked-and-status.txt" 2>&1
grep -E '^(pass: |exit_code=)' "$E/after-contracts-validate.log"
