#!/usr/bin/env bash
# BASE01 step runner (evidence tooling; not part of the repo).
# Usage: runner.sh <target> <worktree> <step> <command string>
# - runs <command string> via bash -c inside <worktree>
# - GH_TOKEN / GITHUB_TOKEN are removed from the environment (no secrets used)
# - NEXT_TELEMETRY_DISABLED=1 (avoid outbound telemetry; does not change check logic)
# - PLAYWRIGHT_CHROMIUM_EXECUTABLE is honoured by the repo's own playwright.config.ts
# - writes <EV>/<target>/<step>.log (ANSI stripped), <step>.status_after.txt, and appends a JSON line to <EV>/<target>/steps.jsonl
set -u
EV=/home/user/bill/.orchestration/evidence/F00/checks
target="$1"; wt="$2"; step="$3"; cmd="$4"
mkdir -p "$EV/$target"
log="$EV/$target/$step.log"
raw="$EV/$target/.$step.raw"
cd "$wt" || exit 99
sha=$(git rev-parse HEAD)
{
  echo "# target=$target step=$step"
  echo "# cwd=$wt"
  echo "# sha=$sha"
  echo "# command=$cmd"
  echo "# env: GH_TOKEN/GITHUB_TOKEN unset; NEXT_TELEMETRY_DISABLED=1; PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-}; PLAYWRIGHT_CHROMIUM_EXECUTABLE=${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-<unset>}; GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-<unset>}"
  echo "# node=$(node --version) npm=$(npm --version)"
  echo "# started=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# ----------------------------------------------------------------"
} > "$log"
start=$(date +%s.%N)
env -u GH_TOKEN -u GITHUB_TOKEN NEXT_TELEMETRY_DISABLED=1 bash -c "$cmd" > "$raw" 2>&1 < /dev/null
code=$?
end=$(date +%s.%N)
secs=$(python3 -c "print(round($end-$start,1))")
sed -r 's/\x1B\[[0-9;?]*[A-Za-z]//g; s/\x1B\][^\x07]*\x07//g' "$raw" >> "$log"
rm -f "$raw"
{
  echo "# ----------------------------------------------------------------"
  echo "# finished=$(date -u +%Y-%m-%dT%H:%M:%SZ) exit_code=$code seconds=$secs"
} >> "$log"
git status --porcelain > "$EV/$target/$step.status_after.txt" 2>&1
python3 - "$target" "$sha" "$step" "$cmd" "$code" "$secs" "$log" >> "$EV/$target/steps.jsonl" <<'PY'
import json,sys
t,sha,step,cmd,code,secs,log=sys.argv[1:]
print(json.dumps({"target":t,"sha":sha,"step":step,"command":cmd,"exit_code":int(code),"seconds":float(secs),"log_path":log}))
PY
echo "$target $step exit=$code secs=$secs"
exit 0
