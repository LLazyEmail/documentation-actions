#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
grep -q 'Generate JSON API\|git-push-retry\|Regenerate catalog JSON' "$root/.github/workflows/reusable-catalog-api.yml"
grep -q "default: '22'" "$root/.github/workflows/reusable-catalog-api.yml"
echo "catalog-api: ok"
