#!/usr/bin/env bash
# Runs every tests/*.test.sh and tests/*.test.js that exists.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

shopt -s nullglob
found=0
for t in tests/*.test.sh; do
  found=1
  echo "::group::bash $t"
  bash "$t"
  echo "::endgroup::"
done
for t in tests/*.test.js; do
  found=1
  echo "::group::node $t"
  node "$t"
  echo "::endgroup::"
done

if [[ "$found" -eq 0 ]]; then
  echo "No unit tests yet — placeholder OK until first action lands."
fi
