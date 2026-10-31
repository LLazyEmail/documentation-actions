#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$root/actions/docusaurus-build/action.yml"
grep -q 'Build website' "$root/actions/docusaurus-build/action.yml"
grep -q "default: '22'" "$root/actions/docusaurus-build/action.yml"
echo "docusaurus-build: ok"
