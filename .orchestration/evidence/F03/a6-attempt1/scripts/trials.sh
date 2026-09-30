set -u
git checkout -q -- next-env.d.ts
echo "HEAD=$(git rev-parse HEAD) status_lines=$(git status --porcelain | wc -l)"
for b in origin/guide/pre-retirement-guide origin/claude/bill-presentation-video origin/claude/bill-centered-homepage; do
  echo "== trial: integration <- $b ($(git rev-parse --short $b)) =="
  git -c user.name=a6 -c user.email=a6@example.invalid merge --no-commit --no-ff $b >/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/a6f03/merge.out 2>&1; echo "merge_exit=$?"
  echo "conflicted: $(git diff --name-only --diff-filter=U | tr '\n' ' ')"
  echo "staged deletions: $(git diff --cached --name-only --diff-filter=D | tr '\n' ' ')"
  git merge --abort 2>/dev/null; echo "after abort status_lines=$(git status --porcelain | wc -l)"
done
