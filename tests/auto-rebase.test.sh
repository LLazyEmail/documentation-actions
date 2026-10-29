#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$root/actions/auto-rebase/action.yml"
grep -q 'updateBranch' "$root/actions/auto-rebase/action.yml"
grep -q 'workflow_call' "$root/.github/workflows/reusable-auto-rebase-prs.yml"
echo "auto-rebase: ok"
