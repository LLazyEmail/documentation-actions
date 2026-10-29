#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
grep -q 'upload-pages-artifact' "$root/.github/workflows/reusable-docusaurus-pages-deploy.yml"
grep -q 'peaceiris' "$root/.github/workflows/reusable-docusaurus-pages-deploy.yml"
echo "pages-deploy: ok"
