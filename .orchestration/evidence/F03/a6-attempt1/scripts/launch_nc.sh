set -u
cd /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/wt/a6-f03-1
echo "== NC-L1: newsletterEnabled true (extra blocker beyond approval flags) =="
sed -i 's/newsletterEnabled: false,/newsletterEnabled: true,/' lib/business.ts; git diff --stat
env -u GH_TOKEN -u GITHUB_TOKEN node tests/baseline/run.mjs --only npm_ci,launch_check --out /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/nc-l1 > /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/nc-l1.out 2>&1; echo runner_exit=$?
python3 -c "import json;r=json.load(open('/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/nc-l1/results.json'));s=[x for x in r['steps'] if x['id']=='launch_check'][0];print(s['exit_code'],s['classification'],s.get('note'))"
git checkout -- lib/business.ts
echo "== NC-L2: LAUNCH-CHECKLIST.md intentional-failure line removed =="
sed -i '3d' LAUNCH-CHECKLIST.md; git diff --stat
env -u GH_TOKEN -u GITHUB_TOKEN node tests/baseline/run.mjs --only npm_ci,launch_check --out /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/nc-l2 > /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/nc-l2.out 2>&1; echo runner_exit=$?
python3 -c "import json;r=json.load(open('/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/nc-l2/results.json'));s=[x for x in r['steps'] if x['id']=='launch_check'][0];print(s['exit_code'],s['classification'],s.get('note'),s.get('citation'))"
git checkout -- LAUNCH-CHECKLIST.md
echo "== post: git status =="; git status --porcelain
