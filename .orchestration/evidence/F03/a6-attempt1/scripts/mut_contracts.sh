set -u
cd /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/wt/a6-f03-1
X=.orchestration/contracts/examples
echo "== pre: git status (ignoring next-env.d.ts from build) =="; git status --porcelain
echo "== M0 control: unmodified =="; npm run -s test:contracts > /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m0.out 2>&1; echo "exit=$?"; grep -E "^# (tests|pass|fail)" /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m0.out
echo "== M1: git mv invalid/delivery-job/financial-field-in-job.json -> valid/delivery-job/ (schema layer) =="
mv $X/invalid/delivery-job/financial-field-in-job.json $X/valid/delivery-job/financial-field-in-job.json
npm run -s test:contracts > /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m1.out 2>&1; echo "exit=$?"; grep -E "^# (tests|pass|fail)" /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m1.out; grep -E "^not ok" /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m1.out; grep -A3 "not ok" /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m1.out | grep -E "error:|additionalProperties" | head -3
mv $X/valid/delivery-job/financial-field-in-job.json $X/invalid/delivery-job/financial-field-in-job.json
echo "== M2: invalid/workshop-inputs/end-before-start.json -> valid/workshop-inputs/ (schema layer? see why: layer semantic) =="
mv $X/invalid/workshop-inputs/end-before-start.json $X/valid/workshop-inputs/end-before-start.json
npm run -s test:contracts > /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m2.out 2>&1; echo "ajv exit=$?"; grep -E "^# (tests|pass|fail)" /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m2.out; grep -E "^not ok" /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m2.out
PYTHONDONTWRITEBYTECODE=1 /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/venv-f02/bin/python .orchestration/contracts/validate.py > /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m2py.out 2>&1; echo "validate.py exit=$?"; grep -A8 "^## Summary" /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m2py.out | cut -c1-400; grep -E "^FAIL" /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m2py.out | cut -c1-300 | head -5
mv $X/valid/workshop-inputs/end-before-start.json $X/invalid/workshop-inputs/end-before-start.json
echo "== M3: invalid/event-envelope first schema-layer example -> valid =="
F=$(for w in $X/invalid/event-envelope/*.why.txt; do grep -qE "^layer: *(semantic|harness|json-parse)|expect_keyword: *(semantic|harness):" $w || { basename $w .why.txt; break; }; done); echo "picked $F"
mv $X/invalid/event-envelope/$F.json $X/valid/event-envelope/$F.json
npm run -s test:contracts > /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m3.out 2>&1; echo "exit=$?"; grep -E "^# (tests|pass|fail)" /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m3.out; grep -E "^not ok" /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m3.out
mv $X/valid/event-envelope/$F.json $X/invalid/event-envelope/$F.json
echo "== M4 via suite runner: M1 again through run.mjs --only contracts_ajv (runner exit must be 1) =="
mv $X/invalid/delivery-job/financial-field-in-job.json $X/valid/delivery-job/financial-field-in-job.json
node tests/baseline/run.mjs --only contracts_ajv --out /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m4-out > /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m4.out 2>&1; echo "runner exit=$?"; tail -3 /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m4.out
mv $X/valid/delivery-job/financial-field-in-job.json $X/invalid/delivery-job/financial-field-in-job.json
echo "== post revert: git status =="; git status --porcelain
echo "== post revert control =="; npm run -s test:contracts > /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m5.out 2>&1; echo "exit=$?"; grep -E "^# (tests|pass|fail)" /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/m5.out
