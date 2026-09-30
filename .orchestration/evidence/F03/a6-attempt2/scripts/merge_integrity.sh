set -u
G=origin/guide/pre-retirement-guide
MB=$(git merge-base $G origin/codex/desktop-iphone-unified); echo "merge-base guide/codex: $MB"
echo "# guide changed paths vs merge base"
git diff --name-status $MB $G | tee /tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03-2/guide_paths.txt | cut -f1 | sort | uniq -c
paths=$(git diff --name-only $MB $G)
n=0; same=0; diff=0
for p in $paths; do
  n=$((n+1))
  a=$(git rev-parse -q --verify "$G:$p" 2>/dev/null || echo DELETED)
  b=$(git rev-parse -q --verify "integration:$p" 2>/dev/null || echo DELETED)
  if [ "$a" = "$b" ]; then same=$((same+1)); else diff=$((diff+1)); echo "DIFFERS: $p guide=$a integration=$b"; fi
done
echo "guide paths=$n identical=$same differ=$diff"
echo "# git diff guide integration -- <guide paths> (stat)"
git diff --stat $G integration -- $paths
echo "# package.json: guide vs 1316ebe"
git diff $G 1316ebe -- package.json | wc -l
echo "# package.json: 1316ebe vs integration"
git diff 1316ebe integration -- package.json
echo "# merge commit parents"
for c in 1316ebe 67ba636 5545c2a b0bc6cf; do echo "$c: $(git rev-parse $c) parents: $(git log -1 --format=%P $c)"; done
echo "# 1316ebe first-parent diff (name-status)"
git diff --name-status 1316ebe^1 1316ebe | cut -f1 | sort | uniq -c
echo "# does merge 1316ebe tree equal a clean re-merge? (merge-tree)"
git merge-tree --write-tree 66cce52 749b360 && echo "1316ebe tree: $(git rev-parse 1316ebe^{tree})"
echo "# 67ba636 clean re-merge"
git merge-tree --write-tree 1316ebe cb3becf && echo "67ba636 tree: $(git rev-parse 67ba636^{tree})"
echo "# orchestration record"
MB2=$(git merge-base cb3becf 1316ebe); echo "merge-base cb3becf/1316ebe: $MB2"
git diff --name-only $MB2 cb3becf | grep -v '^.orchestration/' | wc -l
git diff --name-only $MB2 cb3becf | wc -l
echo "# git diff cb3becf integration -- .orchestration (lines)"
git diff cb3becf integration -- .orchestration | wc -l
for c in cb3becf 67ba636 5545c2a b0bc6cf; do echo "$c .orchestration tree: $(git rev-parse $c:.orchestration)"; done
echo "# 67ba636 first-parent diff outside .orchestration"
git diff --name-only 67ba636^1 67ba636 | grep -v '^.orchestration/' | wc -l
echo "# 5545c2a and b0bc6cf changed paths"
git diff --name-status 67ba636 5545c2a; echo ---; git diff --name-status 5545c2a b0bc6cf; git diff --stat 5545c2a b0bc6cf | tail -1
echo "# ancestry"
for b in origin/codex/desktop-iphone-unified origin/guide/pre-retirement-guide cb3becf origin/claude/bill-centered-homepage origin/claude/bill-presentation-video origin/add-ask-bill-section; do if git merge-base --is-ancestor $b integration; then echo "$b: ancestor"; else echo "$b: NOT ancestor"; fi; done
echo "# upstream of integration"
git rev-parse --abbrev-ref integration@{upstream} 2>&1 || true
echo "# reflog integration"
git reflog show integration | cat
