#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
grep -q 'workflow_call' "$root/.github/workflows/reusable-changelog.yml"
grep -q 'github-actions\[bot\]' "$root/.github/workflows/reusable-changelog.yml"
echo "changelog: ok"
