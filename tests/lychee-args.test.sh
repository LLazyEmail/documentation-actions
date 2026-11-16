#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
script="$root/actions/lychee-link-check/build-args.sh"
test -x "$script"

# New inputs exist on both the action and the reusable workflow, and stay off by default.
grep -q "docusaurus-root:" "$root/actions/lychee-link-check/action.yml"
grep -q "config-file:" "$root/actions/lychee-link-check/action.yml"
grep -q "docusaurus-root:" "$root/.github/workflows/reusable-link-check.yml"
grep -q "config-file:" "$root/.github/workflows/reusable-link-check.yml"
# Defaults must stay empty so existing callers keep today's args unchanged.
awk '/^  docusaurus-root:/{f=1} f&&/default:/{print; exit}' \
  "$root/actions/lychee-link-check/action.yml" | grep -q "''"
awk '/^  config-file:/{f=1} f&&/default:/{print; exit}' \
  "$root/actions/lychee-link-check/action.yml" | grep -q "''"
awk '/^      docusaurus-root:/{f=1} f&&/default:/{print; exit}' \
  "$root/.github/workflows/reusable-link-check.yml" | grep -q "''"
awk '/^      config-file:/{f=1} f&&/default:/{print; exit}' \
  "$root/.github/workflows/reusable-link-check.yml" | grep -q "''"
echo "lychee docusaurus-root/config-file inputs: ok"

run_build() {
  BASE_ARGS="$1" CONFIG_FILE="${2-}" DOCUSAURUS_ROOT="${3-}" \
    GITHUB_WORKSPACE="${GITHUB_WORKSPACE-/workspace}" \
    "$script" 2>"$tmp/err"
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Pass-through when both inputs are empty (including whitespace-only).
out="$(run_build $'--verbose\nREADME.md' '' '')"
[[ "$out" == $'--verbose\nREADME.md' ]] || { echo "pass-through failed: '$out'"; exit 1; }
out="$(run_build $'--verbose\nREADME.md' '  ' $'\n')"
[[ "$out" == $'--verbose\nREADME.md' ]] || { echo "whitespace inputs should be ignored: '$out'"; exit 1; }
echo "lychee build-args pass-through: ok"

# --config is prepended only when the file exists.
cfg="$tmp/.lychee.toml"
touch "$cfg"
out="$(run_build $'README.md' "$cfg" '')"
[[ "$out" == $'--config '"$cfg"$' \nREADME.md' ]] || { echo "config exists failed: '$out'"; exit 1; }
[[ ! -s "$tmp/err" ]] || { echo "unexpected stderr: $(cat "$tmp/err")"; exit 1; }

out="$(run_build $'README.md' "$tmp/missing.toml" '')"
[[ "$out" == $'README.md' ]] || { echo "missing config should not add --config: '$out'"; exit 1; }
grep -q "skipping --config" "$tmp/err" || { echo "missing config should warn"; exit 1; }
echo "lychee build-args config-file: ok"

# Docusaurus flags use the expanded workspace path and the flags that aem #427 proved work.
export GITHUB_WORKSPACE="/home/runner/work/repo/repo"
out="$(run_build $'--verbose\nREADME.md' '' 'website')"
expected=$'--root-dir /home/runner/work/repo/repo/website --fallback-extensions md,mdx --index-files index.md,index.mdx,. \n--verbose\nREADME.md'
[[ "$out" == "$expected" ]] || { echo "docusaurus-root failed: '$out'"; exit 1; }

# Leading/trailing slashes on the relative root are stripped.
out="$(run_build $'README.md' '' '/website/')"
printf '%s\n' "$out" | grep -Fq -- "--root-dir /home/runner/work/repo/repo/website " \
  || { echo "slash stripping failed: '$out'"; exit 1; }

# Both inputs together: --config then Docusaurus flags, then caller args.
out="$(run_build $'README.md' "$cfg" 'website')"
printf '%s\n' "$out" | grep -Fq -- "--config $cfg " || { echo "combined missing --config: '$out'"; exit 1; }
printf '%s\n' "$out" | grep -Fq -- "--root-dir /home/runner/work/repo/repo/website " \
  || { echo "combined missing --root-dir: '$out'"; exit 1; }
printf '%s\n' "$out" | grep -Fq "README.md" || { echo "combined dropped BASE_ARGS: '$out'"; exit 1; }
echo "lychee build-args docusaurus-root: ok"
