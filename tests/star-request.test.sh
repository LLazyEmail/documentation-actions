#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$root/actions/star-request/action.yml"
grep -q 'Ask contributor for a star' "$root/actions/star-request/action.yml"
grep -q 'workflow_call' "$root/.github/workflows/reusable-star-request.yml"
echo "star-request: ok"
