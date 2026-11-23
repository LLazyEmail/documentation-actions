#!/usr/bin/env bash
# Tests for scripts/pin-release-refs.sh, which tag-release.yml runs on the
# commit a release tag points at.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
pin="$root/scripts/pin-release-refs.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }

# 1. Dry run against the real repo: finds refs, leaves files untouched.
before="$(cd "$root" && git status --porcelain -- .github actions 2>/dev/null || true)"
out="$(bash "$pin" --check v9.9.9)" || fail "dry run on the repo failed: $out"
echo "$out" | grep -qE 'pin-release-refs: [1-9][0-9]* ref\(s\)' || fail "dry run found no @main refs: $out"
after="$(cd "$root" && git status --porcelain -- .github actions 2>/dev/null || true)"
[[ "$before" == "$after" ]] || fail "dry run changed files in the repo"

# 2. Fixture: only this repo's @main refs change, everything else stays.
mkdir -p "$tmp/r/.github/workflows" "$tmp/r/actions/foo" "$tmp/r/actions/bar"
printf 'name: foo\nruns:\n  using: composite\n  steps:\n    - uses: LLazyEmail/documentation-actions/actions/bar@main\n' >"$tmp/r/actions/foo/action.yml"
printf 'name: bar\nruns:\n  using: composite\n  steps: []\n' >"$tmp/r/actions/bar/action.yml"
cat >"$tmp/r/.github/workflows/reusable-x.yml" <<'YML'
jobs:
  a:
    steps:
      - uses: LLazyEmail/documentation-actions/actions/foo@main
      - uses: "LLazyEmail/documentation-actions/actions/bar@main"
      - uses: actions/checkout@main
      - uses: someone/documentation-actions/actions/foo@main
      - uses: LLazyEmail/documentation-actions/actions/foo@v2
      - uses: LLazyEmail/documentation-actions/actions/foo@mainline
      - uses: ./actions/foo
  b:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-x.yml@main
YML
cp -R "$tmp/r" "$tmp/orig"

bash "$pin" --check v1.2.3 "$tmp/r" >/dev/null || fail "dry run on fixture failed"
diff -r "$tmp/orig" "$tmp/r" >/dev/null || fail "--check wrote files"

bash "$pin" v1.2.3 "$tmp/r" >"$tmp/log" || { cat "$tmp/log"; fail "pin on fixture failed"; }
wf="$tmp/r/.github/workflows/reusable-x.yml"
grep -q 'documentation-actions/actions/foo@v1.2.3$' "$wf" || fail "foo not pinned"
grep -q '"LLazyEmail/documentation-actions/actions/bar@v1.2.3"' "$wf" || fail "quoted bar not pinned"
grep -q 'reusable-x.yml@v1.2.3$' "$wf" || fail "reusable->reusable ref not pinned"
grep -q 'actions/bar@v1.2.3$' "$tmp/r/actions/foo/action.yml" || fail "ref inside action.yml not pinned"
grep -q 'uses: actions/checkout@main$' "$wf" || fail "third-party @main changed"
grep -q 'someone/documentation-actions/actions/foo@main$' "$wf" || fail "other owner changed"
grep -q 'actions/foo@v2$' "$wf" || fail "existing @v2 ref changed"
grep -q 'actions/foo@mainline$' "$wf" || fail "@mainline changed"
grep -q 'uses: ./actions/foo$' "$wf" || fail "local ref changed"
[[ "$(wc -l <"$wf")" == "$(wc -l <"$tmp/orig/.github/workflows/reusable-x.yml")" ]] || fail "line count changed"
changed_lines="$(diff "$tmp/orig/.github/workflows/reusable-x.yml" "$wf" | grep -c '^>' || true)"
[[ "$changed_lines" == "3" ]] || fail "expected 3 changed lines, got $changed_lines"

# 3. Idempotent: a second run finds nothing left to pin.
bash "$pin" v1.2.3 "$tmp/r" | grep -q 'pin-release-refs: 0 ref(s)' || fail "second run was not a no-op"

# 4. A ref to a path that does not exist fails.
mkdir -p "$tmp/bad/.github/workflows"
printf 'jobs:\n  a:\n    steps:\n      - uses: LLazyEmail/documentation-actions/actions/missing@main\n' \
  >"$tmp/bad/.github/workflows/w.yml"
if bash "$pin" --check v1.2.3 "$tmp/bad" >/dev/null 2>&1; then
  fail "missing action path was accepted"
fi

# 5. Bad tag is rejected.
if bash "$pin" --check main "$tmp/r" >/dev/null 2>&1; then
  fail "non-semver tag was accepted"
fi

echo "pin-release-refs: ok"
