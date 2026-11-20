#!/usr/bin/env bash
# Print lychee args with optional --config and Docusaurus local-link flags.
# Env:
#   BASE_ARGS         — caller-supplied lychee args (required by the action)
#   CONFIG_FILE       — optional path; when set and the file exists, prepend --config
#   DOCUSAURUS_ROOT   — optional workspace-relative path (e.g. website)
#   GITHUB_WORKSPACE  — required when DOCUSAURUS_ROOT is set
# stdout: the final args. Warnings go to stderr (and ::warning:: for Actions).
set -euo pipefail

trim() {
  local s="${1-}"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

config_file="$(trim "${CONFIG_FILE-}")"
docusaurus_root="$(trim "${DOCUSAURUS_ROOT-}")"

extras=()
if [ -n "$config_file" ]; then
  if [ -f "$config_file" ]; then
    extras+=(--config "$config_file")
  else
    echo "::warning::config-file '$config_file' was set but does not exist; skipping --config" >&2
  fi
fi

if [ -n "$docusaurus_root" ]; then
  : "${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required when docusaurus-root is set}"
  root="${docusaurus_root#/}"
  root="${root%/}"
  extras+=(--root-dir "$GITHUB_WORKSPACE/$root")
  extras+=(--fallback-extensions md,mdx)
  extras+=(--index-files index.md,index.mdx,.)
fi

if [ ${#extras[@]} -gt 0 ]; then
  printf '%s ' "${extras[@]}"
  printf '\n'
fi
printf '%s\n' "${BASE_ARGS-}"
