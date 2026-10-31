#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
action="$root/actions/git-push-retry/action.yml"
script="$root/actions/git-push-retry/commit-and-push.sh"

grep -q 'git push with rebase retry' "$action"
grep -q 'commit-and-push.sh' "$action"
test -x "$script"
grep -q 'git pull --rebase origin main' "$script"
grep -q 'MAX_ATTEMPTS' "$script"

for wf in reusable-changelog.yml reusable-docs-index.yml reusable-catalog-api.yml; do
  grep -q 'actions/git-push-retry@main' "$root/.github/workflows/$wf"
  # Inline retry loop should be gone from the workflow body.
  if grep -q 'for attempt in 1 2 3 4 5' "$root/.github/workflows/$wf"; then
    echo "expected inline retry removed from $wf" >&2
    exit 1
  fi
done

echo "git-push-retry: ok"
