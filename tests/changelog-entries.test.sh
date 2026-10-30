#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

bash "$root/scripts/changelog-check.sh"

test -f "$root/.changelog/v1-foundation.md"
grep -q '^semver: major' "$root/.changelog/v1-foundation.md"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/.changelog"
printf 'semver: banana\nBroken\n' >"$tmp/.changelog/bad.md"
if ENTRY_DIR="$tmp/.changelog" bash "$root/scripts/changelog-check.sh"; then
  echo "expected failure for bad semver" >&2
  exit 1
fi

echo "changelog-entries: ok"
