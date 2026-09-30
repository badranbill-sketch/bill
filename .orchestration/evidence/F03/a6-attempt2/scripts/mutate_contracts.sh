set -u
C=.orchestration/contracts/examples
run() { # label
  echo "## $1"
  npm run test:contracts > /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03-2/tc.out 2>&1; ec=$?
  grep -E "^# (tests|pass|fail) " /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03-2/tc.out
  grep -E "^not ok|^    not ok|^  not ok" /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03-2/tc.out | head -8
  echo "exit_code=$ec"
}
revert() { git checkout -- .orchestration/contracts && git clean -fdq .orchestration/contracts; echo "reverted; porcelain(.orchestration)=$(git status --porcelain .orchestration | wc -l)"; }
run "M0 control (no mutation)"
echo; echo "### M1: move invalid/workshop-inputs/extra-pii-email.json (layer schema, additionalProperties) into valid/"
mv $C/invalid/workshop-inputs/extra-pii-email.json $C/valid/workshop-inputs/extra-pii-email.json
run "M1"; revert
echo; echo "### M2: move invalid/worker-handoff/absolute-changed-path.json (schema, pattern) into valid/"
mv $C/invalid/worker-handoff/absolute-changed-path.json $C/valid/worker-handoff/absolute-changed-path.json
run "M2"; revert
echo; echo "### M3: move invalid/offer-matrix/agent-recorded-gate.json (schema, enum) into valid/ together with its .why.txt (no orphan)"
mv $C/invalid/offer-matrix/agent-recorded-gate.json $C/valid/offer-matrix/agent-recorded-gate.json
mv $C/invalid/offer-matrix/agent-recorded-gate.why.txt $C/valid/offer-matrix/agent-recorded-gate.why.txt
run "M3"; revert
echo; echo "### M4: COPY (not move) invalid/feature-flags/agent-recorded-approval.json into valid/ (invalid side untouched)"
cp $C/invalid/feature-flags/agent-recorded-approval.json $C/valid/feature-flags/agent-recorded-approval.json
run "M4"; revert
echo; run "M5 control after revert"
echo "git status --porcelain:"; git status --porcelain
