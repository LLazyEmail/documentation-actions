#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
grep -q 'Reusable Docusaurus test-deploy' "$root/.github/workflows/reusable-docusaurus-test-deploy.yml"
grep -q "default: '22'" "$root/.github/workflows/reusable-docusaurus-test-deploy.yml"
grep -q 'lfs:' "$root/.github/workflows/reusable-docusaurus-test-deploy.yml"
echo "test-deploy: ok"
