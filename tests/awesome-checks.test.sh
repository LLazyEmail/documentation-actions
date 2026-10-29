#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/fixtures/awesome-list"
node "$root/actions/awesome-list-checks/scripts/validate-entry-format.mjs"
node "$root/actions/awesome-list-checks/scripts/check-duplicate-links.mjs" --warn
node "$root/actions/awesome-list-checks/scripts/check-sorted-sections.mjs"
echo "awesome-list-checks: ok"
