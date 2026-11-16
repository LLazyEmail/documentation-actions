#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
action="$root/actions/git-push-retry/action.yml"
script="$root/actions/git-push-retry/commit-and-push.sh"

grep -q 'git push with rebase retry' "$action"
grep -q 'commit-and-push.sh' "$action"
test -x "$script"
grep -q 'git pull --rebase --autostash origin main' "$script"
grep -q 'MAX_ATTEMPTS' "$script"

for wf in reusable-changelog.yml reusable-docs-index.yml reusable-catalog-api.yml; do
  grep -q 'actions/git-push-retry@main' "$root/.github/workflows/$wf"
  # Inline retry loop should be gone from the workflow body.
  if grep -q 'for attempt in 1 2 3 4 5' "$root/.github/workflows/$wf"; then
    echo "expected inline retry removed from $wf" >&2
    exit 1
  fi
done

# Behavioral check: a competing push lands on main while the working tree
# has an unrelated unstaged change. The script must rebase (autostash) and push.
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git init -q --bare -b main "$tmp/remote.git"
git clone -q "$tmp/remote.git" "$tmp/seed" 2>/dev/null
(
  cd "$tmp/seed"
  git config user.name t; git config user.email t@example.com
  echo a > tracked.txt; echo base > other.txt
  git add . && git commit -qm init && git push -q origin HEAD:main
)
git clone -q "$tmp/remote.git" "$tmp/work"
(
  cd "$tmp/seed"
  echo competing > competing.txt
  git add competing.txt && git commit -qm competing && git push -q origin HEAD:main
)
(
  cd "$tmp/work"
  echo regenerated > CHANGELOG.md
  echo dirty >> other.txt   # unstaged, not in COMMIT_PATHS
  COMMIT_PATHS="CHANGELOG.md" COMMIT_MESSAGE="chore: regen" \
    UP_TO_DATE_MESSAGE="noop" REMOTE_REF="HEAD:main" MAX_ATTEMPTS=3 \
    GIT_USER_NAME=bot GIT_USER_EMAIL=bot@example.com \
    bash "$script" >/dev/null 2>&1
  git fetch -q origin
  git show origin/main:CHANGELOG.md | grep -q regenerated
  git show origin/main:competing.txt | grep -q competing
  grep -q dirty other.txt   # autostash restored the unstaged change
)

echo "git-push-retry: ok"
