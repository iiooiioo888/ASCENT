#!/usr/bin/env bash
# Merge origin/main into PR head branch, auto-resolve simple conflicts, push.
set -euo pipefail
HEAD_BRANCH="$1"
PR_NUM="$2"
cd /workspace
git fetch origin main "$HEAD_BRANCH"
git checkout -B "$HEAD_BRANCH" "origin/$HEAD_BRANCH"

if git merge origin/main -m "merge main into $HEAD_BRANCH (PR #$PR_NUM)"; then
  git push origin "$HEAD_BRANCH"
  exit 0
fi

# Prefer PR branch content for conflicted paths, then refresh lockfile.
while git diff --name-only --diff-filter=U | grep -q .; do
  git diff --name-only --diff-filter=U | while read -f path; do
    if [[ "$path" == "pnpm-lock.yaml" ]]; then
      git checkout --ours "$path" || true
    else
      git checkout --ours "$path" || true
    fi
  done
  git add -A
done

if [[ -f pnpm-lock.yaml ]]; then
  pnpm install --no-frozen-lockfile >/dev/null 2>&1 || true
  git add pnpm-lock.yaml 2>/dev/null || true
fi

git add -A
git commit -m "merge main into $HEAD_BRANCH (PR #$PR_NUM) — resolve conflicts" || {
  echo "Nothing to commit after conflict resolution"
  git merge --abort 2>/dev/null || true
  exit 1
}
git push origin "$HEAD_BRANCH"
