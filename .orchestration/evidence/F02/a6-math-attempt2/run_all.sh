#!/usr/bin/env bash
# A6 F02 math verification, attempt 2. Re-runnable from any copy of this folder.
# Needs: python3 (3.11), a python with jsonschema 4.26 in $PY (default ./venv/bin/python),
#        node 22 with ajv 8.20 resolvable (default ./node_modules, or NODE_PATH).
# Setup used: python3 -m venv venv && venv/bin/pip install jsonschema==4.26.0 && npm install ajv@8.20.0
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
PY="${PY:-$HERE/venv/bin/python}"
cd "$HERE"; mkdir -p out
run() { echo; echo "\$ $*"; "$@"; echo "[exit $?]"; }
{
echo "# A6 F02 math verification attempt 2 -- run log"
echo "# date (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "# repo HEAD: $(git -C /home/user/bill rev-parse HEAD) branch $(git -C /home/user/bill branch --show-current)"
echo "# python3 $(python3 --version 2>&1 | cut -d' ' -f2); jsonschema $($PY -c 'import importlib.metadata as m; print(m.version("jsonschema"))'); node $(node --version); ajv $(node -e 'console.log(require("ajv/package.json").version)' 2>/dev/null)"
echo "# environment: local container; fixture evidence only (no browser, no network, no provider)"
echo; echo "== sha256 of reviewed artifacts"
( cd /home/user/bill && sha256sum .orchestration/contracts/workshop-inputs.schema.json .orchestration/contracts/workshop-inputs.md \
  .orchestration/contracts/workshop-math.md .orchestration/contracts/workshop-clip-rules.md .orchestration/contracts/fixtures/workshop/*.json )
( cd /home/user/bill && sha256sum .orchestration/contracts/workshop-inputs.schema.json .orchestration/contracts/workshop-inputs.md \
  .orchestration/contracts/workshop-math.md .orchestration/contracts/workshop-clip-rules.md .orchestration/contracts/fixtures/workshop/*.json | sort -k2 ) > out/current_hashes.txt
( sed -n '/== artifact hashes (sha256) for approval binding/,/== summary/p' /home/user/bill/.orchestration/evidence/F02/math/validation.log | grep -E '^[0-9a-f]{64} ' | sort -k2 ) > out/logged_hashes.txt
if diff -q out/current_hashes.txt out/logged_hashes.txt >/dev/null; then echo "hashes identical to evidence/F02/math/validation.log: yes"; else echo "hashes identical to evidence/F02/math/validation.log: NO"; diff out/current_hashes.txt out/logged_hashes.txt; fi
run python3 run_fixtures.py
run python3 closed_forms.py
run python3 clip_rules_check.py
run python3 index_check.py
run python3 negative_controls.py
run "$PY" validate_schema.py
run node validate_ajv.mjs
run "$PY" targeted.py
run "$PY" bounds.py
run "$PY" rounding_demo.py
run python3 unknown_income_zero_demo.py
run "$PY" scan_forbidden.py
export N=5000 SEED=20260930 PU=0.12; run "$PY" properties.py
export N=5000 SEED=777 PU=0.35; run "$PY" properties.py
echo; echo "== sha256 of this evidence folder's scripts"
sha256sum model.py run_fixtures.py closed_forms.py clip_rules_check.py index_check.py negative_controls.py validate_schema.py validate_ajv.mjs targeted.py bounds.py rounding_demo.py unknown_income_zero_demo.py scan_forbidden.py properties.py gen.py run_all.sh
} 2>&1 | tee out/run.log
