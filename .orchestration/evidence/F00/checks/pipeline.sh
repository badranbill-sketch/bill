#!/usr/bin/env bash
# BASE01 pipeline (evidence tooling). Usage: pipeline.sh <target> <phase>
#   phase pre   : npm ci, lint, test, typecheck (pre-build, extra), build, typecheck (CI order: after build)
#   phase checks: protections:check (as-is and with GITHUB_REPOSITORY), launch:check, verify-publication (no secrets)
#   phase e2e   : playwright default browser resolution, then with PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers chromium-1194
#   phase guide : npm run guide (branch guide/pre-retirement-guide only)
# Steps never stop on failure; every step is recorded.
set -u
EV=/home/user/bill/.orchestration/evidence/F00/checks
W=/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/wt
R=$EV/runner.sh
t="$1"; phase="$2"; wt="$W/base01-$t"
CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
case "$phase" in
  pre)
    $R "$t" "$wt" 01_npm_ci           "npm ci"
    $R "$t" "$wt" 02_lint             "npm run lint"
    $R "$t" "$wt" 03_test             "npm test"
    $R "$t" "$wt" 04_typecheck_prebuild "npm run typecheck"
    $R "$t" "$wt" 05_build            "npm run build"
    $R "$t" "$wt" 06_typecheck        "npm run typecheck"
    ;;
  checks)
    $R "$t" "$wt" 07_protections_check "npm run protections:check"
    $R "$t" "$wt" 08_protections_check_with_repo "GITHUB_REPOSITORY=arnaudverdier8-svg/bill npm run protections:check"
    $R "$t" "$wt" 09_launch_check      "npm run launch:check"
    $R "$t" "$wt" 10_verify_publication "GITHUB_REPOSITORY=arnaudverdier8-svg/bill node --import tsx scripts/verify-publication.ts"
    ;;
  e2e)
    $R "$t" "$wt" 11_test_e2e_default_browser "npm run test:e2e"
    # keep the default-browser run's artefacts outside the worktree so they do not mask the second run
    D=/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/e2e-default/$t
    rm -rf "$D"; mkdir -p "$D"
    [ -d "$wt/test-results" ] && mv "$wt/test-results" "$D/"
    [ -d "$wt/playwright-report" ] && mv "$wt/playwright-report" "$D/"
    $R "$t" "$wt" 12_test_e2e "PLAYWRIGHT_CHROMIUM_EXECUTABLE=$CHROME npm run test:e2e"
    ;;
  guide)
    $R "$t" "$wt" 07_guide "PLAYWRIGHT_CHROMIUM_EXECUTABLE=$CHROME npm run guide"
    ;;
esac
