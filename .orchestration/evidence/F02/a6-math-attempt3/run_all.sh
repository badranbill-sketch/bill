#!/usr/bin/env bash
# A6 F02 math review, attempt 3: reproduce every result in reviews/F02-math-attempt3.md.
# Run from a COPY of this directory (it writes ./out and needs ./node_modules):
#   cp -r .orchestration/evidence/F02/a6-math-attempt3 /tmp/a6m3 && cd /tmp/a6m3
#   npm ci && python3 -m venv venv && venv/bin/pip install 'jsonschema==4.26.0'
#   ./run_all.sh
set -u
mkdir -p out
echo "== environment"; node --version; ./venv/bin/python -c "import importlib.metadata as m; print('jsonschema', m.version('jsonschema'))"; node -e "console.log('ajv', require('ajv/package.json').version)"
echo "== contract hashes under review"; (cd /home/user/bill && sha256sum .orchestration/contracts/workshop-math.md .orchestration/contracts/workshop-inputs.md .orchestration/contracts/workshop-clip-rules.md .orchestration/contracts/workshop-inputs.schema.json .orchestration/contracts/fixtures/workshop/*.json) | tee out/contract_hashes.txt
echo "== logged approval hashes still match"; (cd /home/user/bill && sha256sum -c "$OLDPWD/out/logged_hashes.txt") > out/hash_check.txt 2>&1; echo "OK $(grep -c ': OK$' out/hash_check.txt) / $(wc -l < out/logged_hashes.txt)"
echo "== 1 fixtures (independent BigInt model)"; node run_fixtures.mjs > out/run_fixtures.log 2>&1; echo "exit=$?"; grep -E "^WM fixtures|^index.json|^clip-rules" out/run_fixtures.log
echo "== 2 closed forms and bounds"; node closed_forms.mjs > out/closed_forms.log 2>&1; echo "exit=$?"; tail -1 out/closed_forms.log
echo "== 3 schema: examples (Ajv 8)"; node validate_examples_ajv.mjs > out/validate_examples_ajv.log 2>&1; echo "exit=$?"; tail -1 out/validate_examples_ajv.log
echo "== 4 schema: examples + fixture inputs (jsonschema 4.26)"; ./venv/bin/python validate_examples_jsonschema.py > out/validate_examples_jsonschema.log 2>&1; echo "exit=$?"; tail -1 out/validate_examples_jsonschema.log
echo "== 5 schema: exhaustive XF-01/02/03 sweeps + mutations"; node schema_sweeps.mjs > out/schema_sweeps.log 2>&1; echo "exit=$?"; tail -1 out/schema_sweeps.log
for seed in 20260930 777; do
  n=3000; [ "$seed" = 777 ] && n=5000
  echo "== 6 fuzz properties seed $seed n $n"; node fuzz.mjs $seed $n > out/fuzz_$seed.log 2>&1; python3 -c "import json;d=json.load(open('out/fuzz_$seed.log'));print('generated',d['generated'],'violations',d['violations'])"
  echo "== 7 differential vs A2 reference (oracle only) seed $seed"; python3 oracle_ref.py out/fuzz_inputs_$seed.json out/ref_outputs_$seed.json >/dev/null; node diff_oracle.mjs out/fuzz_inputs_$seed.json out/ref_outputs_$seed.json > out/diff_oracle_$seed.log; python3 -c "import json;d=json.load(open('out/diff_oracle_$seed.log'));print('compared',d['compared'],'identical',d['identical'],'different',d['different'])"
  echo "== 8 metamorphic unknown-independence seed $seed"; node metamorphic.mjs out/fuzz_inputs_$seed.json > out/metamorphic_$seed.log; python3 -c "import json;d=json.load(open('out/metamorphic_$seed.log'));print('checks',d['checks'],'by_kind',d['computed_row_checks_by_unknown_kind'],'violations',d['violations'])"
done
echo "== 9 negative controls (fault injection into model_faults.mjs)"; node faults_run.mjs > out/negative_controls.log 2>&1; grep -E "baseline|MISSED" out/negative_controls.log; echo "caught $(grep -c '^CAUGHT' out/negative_controls.log) missed $(grep -c '^MISSED' out/negative_controls.log)"
echo "== 10 demos of unpinned rules"; node demo_unpinned.mjs > out/demo_unpinned.log; python3 oracle_ref.py out/demo_unpinned_inputs.json out/demo_unpinned_ref.json >/dev/null; node diff_oracle.mjs out/demo_unpinned_inputs.json out/demo_unpinned_ref.json >> out/demo_unpinned.log; cat out/demo_unpinned.log
node demo_rounding.mjs | tee out/demo_rounding.log
echo "== done"
