#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
grep -q 'Reusable Docusaurus GitHub Pages deploy' "$root/.github/workflows/reusable-docusaurus-pages-deploy.yml"
grep -q "default: '22'" "$root/.github/workflows/reusable-docusaurus-pages-deploy.yml"
grep -q 'lfs:' "$root/.github/workflows/reusable-docusaurus-pages-deploy.yml"
echo "pages-deploy: ok"
