#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$root/actions/lychee-link-check/action.yml"
grep -q 'lychee-action' "$root/actions/lychee-link-check/action.yml"
grep -q 'GITHUB_STEP_SUMMARY' "$root/actions/lychee-link-check/action.yml"
echo "lychee-link-check: ok"
