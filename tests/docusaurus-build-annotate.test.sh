#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
script="$root/actions/docusaurus-build/scripts/annotate-build-log.sh"
test -x "$script"

log="$(mktemp)"
summary="$(mktemp)"
output="$(mktemp)"
trap 'rm -f "$log" "$summary" "$output"' EXIT

cat >"$log" <<'LOG'
[INFO] compiling...
[WARNING] Broken link on /docs/foo to /docs/missing
[WARNING] Broken anchor on /docs/bar#nope
[ERROR] Unable to build website for locale en.
Done
LOG

export GITHUB_STEP_SUMMARY="$summary"
export GITHUB_OUTPUT="$output"
out="$("$script" "$log")"

grep -q '::warning::\[WARNING\] Broken link' <<<"$out"
grep -q '::warning::\[WARNING\] Broken anchor' <<<"$out"
grep -q '::error::\[ERROR\] Unable to build' <<<"$out"
grep -q 'annotate-build-log: 2 warning(s), 1 error(s)' <<<"$out"
grep -q 'warning-count=2' "$output"
grep -q 'error-count=1' "$output"
grep -q 'Docusaurus build report' "$summary"
grep -q 'Broken link on /docs/foo' "$summary"

grep -q 'annotate-log' "$root/actions/docusaurus-build/action.yml"
grep -q 'annotate-build-log.sh' "$root/actions/docusaurus-build/action.yml"
grep -q 'pr-comment' "$root/.github/workflows/reusable-docusaurus-test-deploy.yml"
grep -q 'docusaurus-pr-comment@main' "$root/.github/workflows/reusable-docusaurus-test-deploy.yml"
grep -q 'documentation-actions:docusaurus-build' "$root/actions/docusaurus-pr-comment/pr-build-comment.js"
grep -q "default: 'true'" "$root/actions/docusaurus-build/action.yml"

echo "docusaurus-build-annotate: ok"
