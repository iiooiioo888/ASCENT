#!/usr/bin/env bash
set -euo pipefail
n="$1"
repo="iiooiioo888/ASCENT"
head=$(gh pr view "$n" --repo "$repo" --json headRefName -q .headRefName)
echo "=== PR #$n ($head) ==="
gh pr ready "$n" --repo "$repo" 2>/dev/null || true

mergeable=$(gh pr view "$n" --repo "$repo" --json mergeable -q .mergeable)
if [[ "$mergeable" != "MERGEABLE" ]]; then
  cd /workspace
  git fetch origin main "$head"
  git checkout -B "$head" "origin/$head"
  if ! git merge origin/main -m "merge main into PR #$n"; then
    for f in $(git diff --name-only --diff-filter=U); do
      git checkout --ours "$f" || true
    done
    git add -A
    pnpm install --no-frozen-lockfile >/dev/null 2>&1 || true
    git add -A
    git commit -m "merge main into PR #$n — resolve conflicts"
  fi
  git push origin "$head"
  sleep 3
fi

if gh pr merge "$n" --merge --repo "$repo"; then
  sleep 2
  sha=$(gh api "repos/iiooiioo888/ASCENT/commits/main" --jq .sha)
  echo "OK #$n main=$sha"
else
  echo "FAIL merge #$n"
  gh pr view "$n" --repo "$repo" --json mergeable,mergeStateStatus
  exit 1
fi
