#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
grep -q 'workflow_call' "$root/.github/workflows/reusable-docusaurus-test-deploy.yml"
grep -q 'docusaurus-build@main' "$root/.github/workflows/reusable-docusaurus-test-deploy.yml"
echo "test-deploy: ok"
