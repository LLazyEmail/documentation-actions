#!/usr/bin/env bash
# Read a Docusaurus (or similar) build log and emit GitHub annotations + a
# job-summary section for broken links, anchors, markdown warnings, and errors.
set -euo pipefail

log="${1:?usage: annotate-build-log.sh <log-file>}"
if [[ ! -f "$log" ]]; then
  echo "annotate-build-log: missing log file: $log" >&2
  exit 0
fi

warnings=0
errors=0
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

grep -E \
  -e '\[WARNING\]' \
  -e '\[ERROR\]' \
  -e 'Broken link' \
  -e 'Broken anchor' \
  -e 'broken link' \
  -e 'broken anchor' \
  -e 'Exhaustive list of all broken' \
  "$log" >"$tmp" || true

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" ]] && continue
  clean="${line#"${line%%[![:space:]]*}"}"
  if [[ "$clean" == *'[ERROR]'* ]] || [[ "$clean" == Error:* ]]; then
    echo "::error::${clean}"
    errors=$((errors + 1))
  else
    echo "::warning::${clean}"
    warnings=$((warnings + 1))
  fi
done <"$tmp"

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "## Docusaurus build report"
    echo
    echo "- Warnings surfaced: **${warnings}**"
    echo "- Errors surfaced: **${errors}**"
    echo
    if [[ "$warnings" -eq 0 && "$errors" -eq 0 ]]; then
      echo "_No broken-link / warning / error lines matched in the build log._"
    else
      echo "<details><summary>Matched lines</summary>"
      echo
      echo '```'
      cat "$tmp"
      echo '```'
      echo
      echo "</details>"
    fi
  } >>"$GITHUB_STEP_SUMMARY"
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "warning-count=${warnings}"
    echo "error-count=${errors}"
  } >>"$GITHUB_OUTPUT"
fi

echo "annotate-build-log: ${warnings} warning(s), ${errors} error(s)"
