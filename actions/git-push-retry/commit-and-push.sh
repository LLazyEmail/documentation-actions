#!/usr/bin/env bash
# Stage COMMIT_PATHS, commit when dirty, push REMOTE_REF with rebase retries.
set -euo pipefail

git config user.name "${GIT_USER_NAME}"
git config user.email "${GIT_USER_EMAIL}"

# Paths are space-separated; intentional word-splitting.
# shellcheck disable=SC2086
git add $COMMIT_PATHS

if git diff --staged --quiet; then
  echo "${UP_TO_DATE_MESSAGE}"
  exit 0
fi

git commit -m "${COMMIT_MESSAGE}"

max="${MAX_ATTEMPTS}"
for attempt in $(seq 1 "${max}"); do
  if git push origin "${REMOTE_REF}"; then
    exit 0
  fi
  if [ "${attempt}" -ge "${max}" ]; then
    break
  fi
  echo "push rejected (attempt ${attempt}); rebasing onto origin/main"
  # --autostash: generators (npm ci, LFS smudge, build output) can leave
  # unstaged files that are not in COMMIT_PATHS; without it the rebase
  # aborts with "cannot pull with rebase: You have unstaged changes".
  git pull --rebase --autostash origin main
  sleep $((attempt * 2))
done

echo "push failed after retries" >&2
exit 1
