#!/usr/bin/env bash
# Pin this repo's own `@main` references to a release tag.
#
# Reusable workflows call the composite actions as
#   uses: LLazyEmail/documentation-actions/actions/<name>@main
# so `main` stays testable. In the commit that a release tag points at,
# tag-release.yml runs this script so those refs become `@vX.Y.Z`. A caller
# pinned to `@v2`, `@vX.Y.Z` or that commit's SHA then runs the action code
# from that same release instead of whatever is on `main` today.
#
# Usage:
#   scripts/pin-release-refs.sh vX.Y.Z [ROOT]          rewrite files under ROOT (default: repo root)
#   scripts/pin-release-refs.sh --check vX.Y.Z [ROOT]  dry run on a temp copy; no files change
#
# Both modes fail if a ref still points at `@main` afterwards, or if a pinned
# ref names a path that does not exist in the repo. Only refs that start with
# `LLazyEmail/documentation-actions/` are touched; third-party actions,
# `./` local refs, comments without that prefix and docs are left alone.
set -euo pipefail

check=false
if [[ "${1:-}" == "--check" ]]; then
  check=true
  shift
fi
tag="${1:-}"
root="${2:-$(cd "$(dirname "$0")/.." && pwd)}"
own='LLazyEmail/documentation-actions'

if ! [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "usage: $0 [--check] vMAJOR.MINOR.PATCH [ROOT] (got '${tag}')" >&2
  exit 2
fi

if $check; then
  work="$(mktemp -d)"
  trap 'rm -rf "$work"' EXIT
  mkdir -p "$work/.github"
  cp -R "$root/.github/workflows" "$work/.github/workflows"
  [[ -d "$root/actions" ]] && cp -R "$root/actions" "$work/actions"
else
  work="$root"
fi

# Files that can hold `uses:` refs to this repo.
mapfile -t files < <(
  {
    find "$work/.github/workflows" -type f \( -name '*.yml' -o -name '*.yaml' \)
    [[ -d "$work/actions" ]] && find "$work/actions" -type f \( -name 'action.yml' -o -name 'action.yaml' \)
  } | sort
)

pattern="${own}/[A-Za-z0-9._/-]+@main([[:space:]\"']|\$)"
before=0
changed=0
for f in "${files[@]}"; do
  n="$(grep -oE "$pattern" "$f" | wc -l || true)"
  if (( n > 0 )); then
    before=$((before + n))
    changed=$((changed + 1))
    # Only `@main` followed by end of token (space, quote, end of line).
    sed -E -i "s#(${own}/[A-Za-z0-9._/-]+)@main([[:space:]\"']|\$)#\\1@${tag}\\2#g" "$f"
    echo "pinned ${n} ref(s) in ${f#"$work"/}"
  fi
done

status=0
for f in "${files[@]}"; do
  if grep -nE "$pattern" "$f" >/dev/null; then
    grep -nE "$pattern" "$f" | sed "s#^#${f#"$work"/}:#" >&2
    echo "::error::${f#"$work"/} still references @main after pinning" >&2
    status=1
  fi
  while IFS= read -r ref; do
    path="${ref#"${own}/"}"
    path="${path%@*}"
    if [[ -f "$root/$path" || -f "$root/$path/action.yml" || -f "$root/$path/action.yaml" ]]; then
      continue
    fi
    echo "::error::${f#"$work"/} pins ${ref}, but '${path}' does not exist in the repo" >&2
    status=1
  done < <(grep -oE "${own}/[A-Za-z0-9._/-]+@${tag//./\\.}" "$f" || true)
done

echo "pin-release-refs: ${before} ref(s) in ${changed} file(s) -> @${tag}$($check && echo ' (dry run, nothing written)')"
exit "$status"
