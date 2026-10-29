#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
grep -q 'generate:docs-index' "$root/.github/workflows/reusable-docs-index.yml"
echo "docs-index: ok"
