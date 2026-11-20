#!/usr/bin/env bash
# Runs the "Detect README-only changes" step of reusable-readme-docs-sync-check.yml
# against throwaway git repos and checks missing_docs for each case.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
wf="$root/.github/workflows/reusable-readme-docs-sync-check.yml"

script="$(python3 - "$wf" <<'PY'
import sys, yaml
d = yaml.safe_load(open(sys.argv[1]))
for s in d["jobs"]["check-sync"]["steps"]:
    if s.get("id") == "check":
        print(s["run"])
PY
)"

run_case() { # name links_in_docs readme_line docs_change expected
  local name="$1" flag="$2" line="$3" docs="$4" want="$5"
  local dir; dir="$(mktemp -d)"
  (
    cd "$dir"
    git init -q
    git -c user.name=t -c user.email=t@t commit -q --allow-empty -m init
    mkdir -p website/docs
    printf '# R\n' > README.md
    printf 'see https://in-docs.example\n' > website/docs/page.md
    git add -A && git -c user.name=t -c user.email=t@t commit -q -m base
    base="$(git rev-parse HEAD)"
    printf '%s\n' "$line" >> README.md
    if [ "$docs" = yes ]; then printf 'x\n' >> website/docs/page.md; fi
    git add -A && git -c user.name=t -c user.email=t@t commit -q -m head
    head="$(git rev-parse HEAD)"
    s="${script//\$\{\{ github.event.pull_request.base.sha \}\}/$base}"
    s="${s//\$\{\{ github.event.pull_request.head.sha \}\}/$head}"
    export GITHUB_OUTPUT="$dir/out" DOCS_GLOB='website/docs/**/*.md' LINKS_IN_DOCS="$flag"
    bash -c "$s" >/dev/null
    got="$(grep '^missing_docs=' "$dir/out" | cut -d= -f2)"
    if [ "$got" != "$want" ]; then
      echo "FAIL $name: missing_docs=$got, want $want"; exit 1
    fi
    echo "ok   $name"
  )
  rm -rf "$dir"
}

run_case "opt-out, README only"            false '* [A](https://new.example) - x' no  true
run_case "opt-out, no links"               false 'plain prose'                      no  true
run_case "opt-in, new link not in docs"    true  '* [A](https://new.example) - x' no  true
run_case "opt-in, link already in docs"    true  '* [A](https://in-docs.example) - x' no false
run_case "opt-in, no links added"          true  '| Workflow | runs | what |'       no  false
run_case "docs touched"                    false '* [A](https://new.example) - x' yes false
echo "readme-docs-sync: ok"
