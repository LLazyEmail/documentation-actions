#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$root/actions/npm-script-check/action.yml"
grep -q 'Run check' "$root/actions/npm-script-check/action.yml"
grep -q 'Reusable npm script check' "$root/.github/workflows/reusable-npm-script-check.yml"
grep -q "default: '22'" "$root/actions/npm-script-check/action.yml"
echo "npm-script-check: ok"
