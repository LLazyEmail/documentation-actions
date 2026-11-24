#!/usr/bin/env bash
# Tests for scripts/gen-workflows.py: the committed alias files must match the
# manifest, and the checks must catch drift in hand-written workflows.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

py=python3
if ! python3 -c 'import yaml' 2>/dev/null; then
  python3 -m venv "$tmp/venv" >/dev/null
  "$tmp/venv/bin/pip" install --quiet 'pyyaml==6.0.2'
  py="$tmp/venv/bin/python"
fi
gen=("$py" "$root/scripts/gen-workflows.py")

# 1. The repo itself is up to date.
"${gen[@]}" --check || fail "generated files are out of date: run python3 scripts/gen-workflows.py"

copy() {
  rm -rf "$tmp/r"
  mkdir -p "$tmp/r/.github" "$tmp/r/docs"
  cp -R "$root/.github/workflows" "$tmp/r/.github/workflows"
  cp -R "$root/actions" "$tmp/r/actions"
  cp "$root/docs/naming.md" "$tmp/r/docs/naming.md"
  cp "$root/docs/deprecation.md" "$tmp/r/docs/deprecation.md"
  cp "$root/workflows.manifest.yml" "$tmp/r/workflows.manifest.yml"
}
expect_fail() {
  local what="$1" pattern="$2"
  if "${gen[@]}" --check --root "$tmp/r" >"$tmp/out" 2>&1; then
    fail "$what was not caught"
  fi
  grep -q -- "$pattern" "$tmp/out" || { cat "$tmp/out"; fail "$what: expected '$pattern' in output"; }
}

# 2. A hand edit to a generated alias is caught, and regenerating fixes it.
copy
echo "# hand edit" >>"$tmp/r/.github/workflows/reusable-npm-check.yml"
expect_fail "hand-edited alias" "out of date"
"${gen[@]}" --root "$tmp/r" >/dev/null
"${gen[@]}" --check --root "$tmp/r" >/dev/null || fail "regenerating did not fix the alias"

# 3. An input added to a long workflow reaches its alias only through the generator.
copy
sed -i 's/^    inputs:$/    inputs:\n      new-flag:\n        type: boolean\n        default: false/' \
  "$tmp/r/.github/workflows/reusable-readme-docs-sync-check.yml"
expect_fail "new long-name input without regenerating" "reusable-readme-sync"
# Still exits 1 here: the fixture input is declared but unused in the long workflow.
"${gen[@]}" --root "$tmp/r" >"$tmp/out" 2>&1 || grep -q "unused inputs \['new-flag'\]" "$tmp/out" || { cat "$tmp/out"; fail "unexpected error"; }
grep -q 'new-flag: ${{ inputs.new-flag }}' "$tmp/r/.github/workflows/reusable-readme-sync.yml" \
  || fail "new input not forwarded by the generated alias"

# 4. A reusable workflow missing from the manifest fails.
copy
printf 'name: x\non:\n  workflow_call:\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: true\n' \
  >"$tmp/r/.github/workflows/reusable-unlisted.yml"
expect_fail "unlisted workflow" "reusable-unlisted.yml is not in workflows.manifest.yml"

# 5. Own refs must stay @main so pin-release-refs.sh can pin them at release.
copy
sed -i 's#actions/markdownlint@main#actions/markdownlint@v2#' "$tmp/r/.github/workflows/reusable-markdownlint.yml"
expect_fail "own ref not on @main" "must use @main"

# 6. Passing an input the action does not declare fails.
copy
sed -i 's#^          globs: ${{ inputs.globs }}#          globs: ${{ inputs.globs }}\n          not-an-input: x#' \
  "$tmp/r/.github/workflows/reusable-markdownlint.yml"
expect_fail "unknown action input" "does not declare"

# 7. Renaming a job (a caller-visible check name) fails.
copy
sed -i 's/^    name: markdownlint$/    name: lint/' "$tmp/r/.github/workflows/reusable-markdownlint.yml"
expect_fail "renamed check" "check names are caller-visible"

# 8. The alias tables in docs/naming.md and docs/deprecation.md are generated.
copy
sed -i '/`reusable-npm-check`/d' "$tmp/r/docs/naming.md"
expect_fail "row removed from docs/naming.md" "docs/naming.md"
copy
sed -i 's/`reusable-pr-report` |$/`reusable-pr-rep` |/' "$tmp/r/docs/deprecation.md"
expect_fail "hand-edited docs/deprecation.md row" "docs/deprecation.md"
"${gen[@]}" --root "$tmp/r" >/dev/null
grep -q '| `reusable-pr-status-report` | `reusable-pr-report` |' "$tmp/r/docs/deprecation.md" || fail "deprecation table not regenerated"
copy
sed -i '/^<!-- end generated -->$/d' "$tmp/r/docs/naming.md"
expect_fail "missing table markers" "missing the generated alias table markers"

# 9. A new action input must be exposed or listed in not-exposed; exposing it generates the declaration.
copy
printf '  extra-option:\n    description: New option\n    required: false\n    default: "x"\n' >"$tmp/extra"
sed -i "/^inputs:/r $tmp/extra" "$tmp/r/actions/markdownlint/action.yml"
expect_fail "new action input not exposed" "neither exposed"
sed -i 's/^      globs: string$/      globs: string\n      extra-option: string/' "$tmp/r/workflows.manifest.yml"
"${gen[@]}" --root "$tmp/r" >"$tmp/out" 2>&1 || grep -q "unused inputs \['extra-option'\]" "$tmp/out" || { cat "$tmp/out"; fail "unexpected error"; }
grep -q '^      extra-option:$' "$tmp/r/.github/workflows/reusable-markdownlint.yml" || fail "exposed input not generated"
grep -q 'default: "x"' "$tmp/r/.github/workflows/reusable-markdownlint.yml" || fail "action default not copied"
grep -q '^          extra-option: ${{ inputs.extra-option }}$' "$tmp/r/.github/workflows/reusable-markdownlint.yml" \
  || fail "exposed input not forwarded in the step's with: block"
"${gen[@]}" --check --root "$tmp/r" >/dev/null || fail "exposing a new action input still fails after regenerating"

# 9b. Generated with: lines: a hand edit or a dropped line is caught; value conversions kept by hand survive.
copy
sed -i 's/^          globs: ${{ inputs.globs }}$/          globs: hand-edit/' "$tmp/r/.github/workflows/reusable-markdownlint.yml"
expect_fail "hand-edited generated with: line" "reusable-markdownlint"
copy
sed -i '/^          comment: ${{ inputs.comment }}$/d' "$tmp/r/.github/workflows/reusable-close-superseded-prs.yml"
expect_fail "dropped pass-through line" "reusable-close-superseded-prs"
"${gen[@]}" --root "$tmp/r" >/dev/null
grep -q '^          comment: ${{ inputs.comment }}$' "$tmp/r/.github/workflows/reusable-close-superseded-prs.yml" \
  || fail "dropped pass-through line not regenerated"
grep -q "create-issue: \${{ inputs.create-issue && 'true' || 'false' }}" "$tmp/r/.github/workflows/reusable-link-check.yml" \
  || fail "hand-written value conversion was not kept"

# 10. A hand edit inside a generated inputs block is caught.
copy
sed -i 's/description: Arguments passed to lychee (paths, flags)/description: hand edit/' "$tmp/r/.github/workflows/reusable-link-check.yml"
expect_fail "hand-edited generated inputs" "reusable-link-check"

# 11. Generated files only hold refs that pin-release-refs.sh handles (./ refs are left alone, own refs pinned).
bash "$root/scripts/pin-release-refs.sh" --check v9.9.9 >/dev/null || fail "pin-release-refs dry run failed"

echo "gen-workflows: ok"
