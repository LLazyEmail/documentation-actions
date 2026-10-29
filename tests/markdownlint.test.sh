#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$root/actions/markdownlint/action.yml"
grep -q 'markdownlint-cli2-action' "$root/actions/markdownlint/action.yml"
echo "markdownlint: ok"
