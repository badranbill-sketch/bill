#!/usr/bin/env bash
# A0 patch 1, repair attempt 2 (reviews/A0-patch-1.md, A0P1-A6-P2-1): the attempt-2 evidence.
# Writes only attempt2-* files into this folder, plus scratch copies under $SCRATCH. It never runs make_records.sh
# against the repo and never writes a CX-29 record in the repo (a record is written once for its round).
# PRE must be a full copy of the repo taken before any attempt-2 edit (attempt 1's working tree).
# Usage: bash run_attempt2.sh   (VENV, SCRATCH and PRE may be overridden)
set -u
export PYTHONDONTWRITEBYTECODE=1
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
E="$REPO/.orchestration/evidence/A0-patch-1"
VENV="${VENV:-/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-f02}"
SCRATCH="${SCRATCH:-/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a0p1r2}"
PRE="${PRE:-$SCRATCH/pre-attempt2}"
PY="$VENV/bin/python"
V=.orchestration/contracts/validate.py
cd "$REPO" || exit 2
[ -f "$PRE/$V" ] || { echo "missing pre-attempt-2 copy $PRE" >&2; exit 2; }
run() { echo; echo "\$ $*"; "$@"; echo "[exit $?]"; }
summ() {  # the summary counts, then each FAIL line (head, then its full problem list; validate.py's own summary cuts at 300 chars)
  grep -E '^(pass: |exit_code=)' "$1"
  grep -E '^FAIL  ' "$1" | while IFS= read -r l; do h="${l%% :: *}"; t="${l#* :: }"; [ "$t" = "$l" ] && t=""; printf '  FAIL %s ... :: %s\n' "${h:6:100}" "$t"; done | cut -c1-1000
}

# 1. before (attempt 1's tree, in the pre-attempt-2 copy) and after (this tree): the full contract validator
{ echo "# A0 patch 1 attempt 2 BEFORE: full contract validator on attempt 1's tree (copy $PRE, taken before any attempt-2 edit). date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  (cd "$PRE" && run "$PY" "$V"); } > "$E/attempt2-before-contracts-validate.log" 2>&1
{ echo "# A0 patch 1 attempt 2 AFTER: full contract validator. date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ); cwd $REPO"
  run "$PY" "$V"; } > "$E/attempt2-after-contracts-validate.log" 2>&1

# 2. deep handoff checks, after
for t in F00 F02 F02a F03; do
  { echo "# A0 patch 1 attempt 2 AFTER: validate.py --handoff handoffs/$t.json. date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    run "$PY" "$V" --handoff ".orchestration/handoffs/$t.json"; } > "$E/attempt2-handoff-$t.log" 2>&1
done

# 3. the reviewer's re-approval reproduction (A0P1-A6-P2-1), on full scratch copies
wm01() { "$PY" - "$1/.orchestration/contracts/fixtures/workshop/WM01-zero-inflation-zero-escalation.json" <<'PYEOF'
import sys
p = sys.argv[1]; b = open(p, "rb").read()
b2 = b.replace(b'"gap_cents": 1800000', b'"gap_cents": 1800001', 1)
assert b2 != b
open(p, "wb").write(b2)
print("WM01: first gap_cents 1800000 -> 1800001 (a wrong expected value in a file A0 patch 1 never touched)")
PYEOF
}
{ echo "# A0 patch 1 attempt 2: the A0P1-A6-P2-1 reproduction (reviews/A0-patch-1.md, Findings, steps 1-3) before and after. date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# expected BEFORE (attempt 1): edit -> exit 1; make_records.sh -> exit 0; validate -> exit 0 (the defect)."
  echo "# expected AFTER (attempt 2): edit -> exit 1; make_records.sh refuses (exit 3); forced regeneration -> exit 1;"
  echo "#   forced regeneration plus re-pinning the regenerated records in validate.py -> still exit 1 (WM01 is in no record's changed list)."
  B="$SCRATCH/rb-before"; A="$SCRATCH/rb-after"
  rm -rf "$B" "$A"; cp -a "$PRE" "$B"; cp -a "$REPO" "$A"
  echo; echo "== BEFORE (copy of attempt 1's tree: $B)"
  cd "$B"; wm01 "$B"
  "$PY" "$V" > "$SCRATCH/rb-before-1.log" 2>&1; echo "validate.py after the WM01 edit: [exit $?]"; summ "$SCRATCH/rb-before-1.log"
  bash .orchestration/evidence/A0-patch-1/make_records.sh; echo "make_records.sh: [exit $?]"
  "$PY" "$V" > "$SCRATCH/rb-before-2.log" 2>&1; echo "validate.py after make_records.sh: [exit $?]"; summ "$SCRATCH/rb-before-2.log"; grep -E '^PASS  CX-29 .*math' "$SCRATCH/rb-before-2.log" | cut -c1-300
  "$PY" .orchestration/evidence/F02/math/compute_fixtures.py --check 2>&1 | tail -2; echo "lane compute_fixtures.py --check: [exit ${PIPESTATUS[0]}]"
  echo; echo "== AFTER (copy of this tree: $A)"
  cd "$A"; wm01 "$A"
  "$PY" "$V" > "$SCRATCH/rb-after-1.log" 2>&1; echo "validate.py after the WM01 edit: [exit $?]"; summ "$SCRATCH/rb-after-1.log"
  bash .orchestration/evidence/A0-patch-1/make_records.sh; echo "make_records.sh: [exit $?]"
  "$PY" "$V" > "$SCRATCH/rb-after-2.log" 2>&1; echo "validate.py after the refused make_records.sh: [exit $?]"; summ "$SCRATCH/rb-after-2.log"
  echo; echo "-- forced regeneration: delete both records, then make_records.sh"
  rm -f .orchestration/evidence/A0-patch-1/math-bundle.sha256.log .orchestration/evidence/A0-patch-1/worker-handoff-1.1.sha256.log
  bash .orchestration/evidence/A0-patch-1/make_records.sh; echo "make_records.sh: [exit $?]"
  "$PY" "$V" > "$SCRATCH/rb-after-3.log" 2>&1; echo "validate.py after the forced regeneration: [exit $?]"; summ "$SCRATCH/rb-after-3.log"
  echo; echo "-- forced regeneration plus re-registration: the pinned sha256 in the copy's validate.py set to the regenerated records"
  "$PY" - <<'PYEOF'
import hashlib, pathlib
v = pathlib.Path(".orchestration/contracts/validate.py"); s = v.read_text(encoding="utf-8")
for rec, old in ((".orchestration/evidence/A0-patch-1/math-bundle.sha256.log", "bc80f539dc5c73809610d4bba7f3de002383889860bdfb3e57280c0d03402b05"),
                 (".orchestration/evidence/A0-patch-1/worker-handoff-1.1.sha256.log", "e838813371b9684567d4f918ce4411fb515a051deb8a1b4cf486cfc7ee304985")):
    new = hashlib.sha256(pathlib.Path(rec).read_bytes()).hexdigest()
    assert s.count(old) == 1; s = s.replace(old, new); print(f"re-pinned {rec}: {old[:12]}... -> {new[:12]}...")
v.write_text(s, encoding="utf-8")
PYEOF
  "$PY" "$V" > "$SCRATCH/rb-after-4.log" 2>&1; echo "validate.py after re-registration: [exit $?]"; summ "$SCRATCH/rb-after-4.log"
  "$PY" .orchestration/evidence/F02/math/compute_fixtures.py --check 2>&1 | tail -2; echo "lane compute_fixtures.py --check: [exit ${PIPESTATUS[0]}]"
  cd "$REPO"
} > "$E/attempt2-rebless-repro.log" 2>&1

# 4. negative controls on scratch copies of contracts/ (attempt 1's nc0-nc5, plus nc6: WM01 value)
NC="$SCRATCH/nc"; rm -rf "$NC"; mkdir -p "$NC"
{ echo "# A0 patch 1 attempt 2: negative controls on scratch copies of contracts/ (validate.py --contracts-dir). date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# expected: nc0 (unmodified copy) exit 0; every other case exit 1 with the named check failing"
  mk() { rm -rf "$NC/$1"; cp -a .orchestration/contracts "$NC/$1"; }
  mk nc0; echo; echo "== nc0: unmodified copy of the current contracts/"
  "$PY" "$V" --contracts-dir "$NC/nc0" > "$NC/nc0.log" 2>&1; echo "[exit $?]"; summ "$NC/nc0.log"
  mkdir -p "$NC/head"; git archive HEAD .orchestration/contracts | tar -x -C "$NC/head"
  echo; echo "== nc1: contracts/ at HEAD $(git rev-parse --short HEAD) (before A0 patch 1), checked by this validate.py"
  "$PY" "$V" --contracts-dir "$NC/head/.orchestration/contracts" > "$NC/nc1.log" 2>&1; echo "[exit $?]"; summ "$NC/nc1.log"
  mk nc2; "$PY" - "$NC/nc2/worker-handoff.schema.json" <<'PYEOF'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
pat = d["properties"]["task_id"]["pattern"]
d["properties"]["task_id"]["pattern"] = "^(?:" + pat[4:-2].replace("|F02a|", "|") + ")[a-z]?$"
open(p, "w").write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
PYEOF
  echo; echo "== nc2: task_id pattern widened to a generic [a-z] suffix on every ID (expect CX-18)"
  "$PY" "$V" --contracts-dir "$NC/nc2" > "$NC/nc2.log" 2>&1; echo "[exit $?]"; summ "$NC/nc2.log"
  mk nc3; "$PY" - "$NC/nc3/workshop-math.md" <<'PYEOF'
import re, sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
s2 = re.sub(r"^\| WM40 \|[^\n]*\n", "", s, flags=re.M)
assert s2 != s
open(p, "w", encoding="utf-8").write(s2)
PYEOF
  echo; echo "== nc3: the WM40 row removed from the workshop-math.md s10 table (expect CX-21)"
  "$PY" "$V" --contracts-dir "$NC/nc3" > "$NC/nc3.log" 2>&1; echo "[exit $?]"; summ "$NC/nc3.log"
  mk nc4; "$PY" - "$NC/nc4/fixtures/workshop" <<'PYEOF'
import json, sys, pathlib
d = pathlib.Path(sys.argv[1])
doc = json.loads((d / "WM40-today-dollar-display-from-exact-gap.json").read_text(encoding="utf-8"))
doc["fixture_id"] = "WM41"
(d / "WM41-unrecorded-copy.json").write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
PYEOF
  echo; echo "== nc4: an extra fixture WM41 with no index entry, no s10 row and no recorded hash (expect S5, CX-21, CX-29)"
  "$PY" "$V" --contracts-dir "$NC/nc4" > "$NC/nc4.log" 2>&1; echo "[exit $?]"; summ "$NC/nc4.log"
  mk nc5; sed -i 's#"https://bill.contracts.local/worker-handoff/1.1"#"https://bill.contracts.local/worker-handoff/1.0"#' "$NC/nc5/worker-handoff.schema.json"
  echo; echo "== nc5: worker-handoff \$id set back to 1.0 while the title and index row say 1.1 (expect S2, CX-01)"
  "$PY" "$V" --contracts-dir "$NC/nc5" > "$NC/nc5.log" 2>&1; echo "[exit $?]"; summ "$NC/nc5.log"
  mk nc6; "$PY" - "$NC/nc6/fixtures/workshop/WM01-zero-inflation-zero-escalation.json" <<'PYEOF'
import sys
p = sys.argv[1]; b = open(p, "rb").read()
b2 = b.replace(b'"gap_cents": 1800000', b'"gap_cents": 1800001', 1)
assert b2 != b
open(p, "wb").write(b2)
PYEOF
  echo; echo "== nc6: WM01 first gap_cents 1800000 -> 1800001 (expect CX-29: math lane log drift and the A0 patch 1 record stale for WM01)"
  "$PY" "$V" --contracts-dir "$NC/nc6" > "$NC/nc6.log" 2>&1; echo "[exit $?]"; summ "$NC/nc6.log"
} > "$E/attempt2-negative-controls-copy.log" 2>&1

# 5. lane validators and the F02a fixture check, read-only
{ echo "# A0 patch 1 attempt 2: the three lane validators and F02a's fixture check, re-run read-only (PYTHONDONTWRITEBYTECODE=1). date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# expected: data 298/0 exit 0; math 116/1 exit 1 (the known compute_fixtures.py --check failure, README s5.3); offers 92/0 exit 0; F02a --check exit 0"
  run "$PY" .orchestration/evidence/F02/data/validate_f02_data.py
  run "$PY" .orchestration/evidence/F02/math/validate.py
  run "$PY" .orchestration/evidence/F02/offers/validate_offers.py
  run "$PY" .orchestration/evidence/F02a/compute_f02a_fixtures.py --check
} > "$E/attempt2-lane-validators.log" 2>&1

# 6. the records are unchanged (the sha256 A6 reviewed, now pinned in validate.py), diff, untracked files, status
{ echo "# A0 patch 1 attempt 2: CX-29 record bytes vs the sha256 pinned in validate.py (and reviewed by A6). date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  run sha256sum .orchestration/evidence/F02a/after-hashes.log .orchestration/evidence/A0-patch-1/math-bundle.sha256.log .orchestration/evidence/A0-patch-1/worker-handoff-1.1.sha256.log
  run grep -nE '"[0-9a-f]{64}",$' "$V"
} > "$E/attempt2-records-pinned.log" 2>&1
git diff -- .orchestration > "$E/patch.diff"
{ echo "# git status --short -- .orchestration (after A0 patch 1 attempt 2); date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ); HEAD $(git rev-parse HEAD)"
  git status --short -- .orchestration
  echo; echo "# untracked files (git ls-files --others --exclude-standard -- .orchestration)"
  git ls-files --others --exclude-standard -- .orchestration
  echo; echo "# git diff --stat -- .orchestration"
  git diff --stat -- .orchestration
} > "$E/untracked-and-status.txt" 2>&1
grep -E '^(pass: |exit_code=)' "$E/attempt2-before-contracts-validate.log" "$E/attempt2-after-contracts-validate.log"
