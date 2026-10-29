#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
grep -q 'Generate JSON API' "$root/.github/workflows/reusable-catalog-api.yml"
echo "catalog-api: ok"
