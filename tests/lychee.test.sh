#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
test -f "$root/actions/lychee-link-check/action.yml"
grep -q 'lychee-action' "$root/actions/lychee-link-check/action.yml"
grep -q 'GITHUB_STEP_SUMMARY' "$root/actions/lychee-link-check/action.yml"
echo "lychee-link-check: ok"

# find-open-issue.sh: exact-title match, newest wins, empty when none.
script="$root/actions/lychee-link-check/find-open-issue.sh"
test -x "$script"
grep -q "update-existing-issue" "$root/actions/lychee-link-check/action.yml"
grep -q "update-existing-issue" "$root/.github/workflows/reusable-link-check.yml"
# Default must stay off so existing callers keep creating a new issue per run.
awk '/update-existing-issue:/{f=1} f&&/default:/{print; exit}' \
  "$root/actions/lychee-link-check/action.yml" | grep -q "'false'"

stub="$(mktemp -d)"
trap 'rm -rf "$stub"' EXIT
cat > "$stub/gh" <<'STUB'
#!/usr/bin/env bash
printf '%s' "${FAKE_GH_JSON:-[]}"
STUB
chmod +x "$stub/gh"

run_find() {
  PATH="$stub:$PATH" GITHUB_REPOSITORY=o/r GH_TOKEN=x \
    ISSUE_TITLE='Link check report (lychee)' FAKE_GH_JSON="$1" "$script"
}

out="$(run_find '[{"number":374,"title":"Link check report (lychee)"},{"number":424,"title":"Link check report (lychee)"},{"number":500,"title":"Link check report (lychee) old"}]')"
[[ "$out" == "424" ]] || { echo "expected 424, got '$out'"; exit 1; }

out="$(run_find '[{"number":9,"title":"Something else"}]')"
[[ -z "$out" ]] || { echo "expected empty, got '$out'"; exit 1; }

out="$(run_find '[]')"
[[ -z "$out" ]] || { echo "expected empty for no issues, got '$out'"; exit 1; }
echo "lychee find-open-issue: ok"
