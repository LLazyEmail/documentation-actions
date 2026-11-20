#!/usr/bin/env bash
# Print the number of the newest open issue whose title is exactly $ISSUE_TITLE.
# Prints nothing when there is none (the caller then creates a new issue).
# Env: ISSUE_TITLE (required), GITHUB_REPOSITORY, GH_TOKEN.
set -euo pipefail
: "${ISSUE_TITLE:?ISSUE_TITLE is required}"
gh issue list \
  --repo "${GITHUB_REPOSITORY:?}" \
  --state open \
  --limit 100 \
  --search "\"${ISSUE_TITLE}\" in:title" \
  --json number,title \
  | jq -r --arg t "$ISSUE_TITLE" \
    '[.[] | select(.title == $t) | .number] | max // empty'
