set -u
cd /home/user/bill
G=origin/guide/pre-retirement-guide; C=origin/codex/desktop-iphone-unified; O=cb3becf25ed042b977d4864ae71e74d13829320f
echo "== guide: merge-base with codex =="; MB=$(git merge-base $C $G); echo $MB
echo "== guide: files it changed vs merge-base =="; git diff --name-status $MB $G | tee /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/guide_paths.txt | awk '{print $1}' | sort | uniq -c
echo "== guide: git diff $G integration -- <paths guide touched> (stat) =="
git diff --stat $G integration -- $(git diff --name-only $MB $G)
echo "== guide: per-path blob compare =="
same=0; diff=0
for p in $(git diff --name-only $MB $G); do a=$(git rev-parse $G:$p 2>/dev/null); b=$(git rev-parse integration:$p 2>/dev/null); if [ "$a" = "$b" ]; then same=$((same+1)); else diff=$((diff+1)); echo "DIFF $p guide=$a integration=$b"; fi; done
echo "guide paths identical=$same differing=$diff"
echo "== package.json: guide-side change present in merge 1316ebe? =="
git diff $G 1316ebe -- package.json .gitignore; echo "(empty above = 1316ebe package.json/.gitignore identical to guide's? no: codex side changes may appear)"
echo "== package.json 3-way: diff merge-base..guide =="; git diff $MB $G -- package.json
echo "== package.json: 1316ebe vs integration (suite commit delta) =="; git diff 1316ebe integration -- package.json
echo "== orchestration: files cb3becf changed vs merge-base with 1316ebe =="
MB2=$(git merge-base 1316ebe $O); echo "merge-base=$MB2"
git diff --name-only $MB2 $O | wc -l
git diff --name-only $MB2 $O | grep -vc '^\.orchestration/' || true
echo "== orchestration: git diff $O integration -- .orchestration (stat) =="
git diff --stat $O integration -- .orchestration | tail -3
echo "== orchestration: tree compare of .orchestration subtree =="
echo "cb3becf:.orchestration  $(git rev-parse $O:.orchestration)"; echo "67ba636:.orchestration  $(git rev-parse 67ba636:.orchestration)"; echo "integration:.orchestration  $(git rev-parse integration:.orchestration)"
echo "== 67ba636 vs integration: non-.orchestration delta (suite commit) =="; git diff --name-status 67ba636 integration
echo "== codex-side files unchanged by merges? codex files differing in integration (excluding paths added) =="
git diff --name-status --diff-filter=DM $C integration
