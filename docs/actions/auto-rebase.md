# auto-rebase

Update behind open PR branches (and optionally rebase conflicts).

**Path:** `actions/auto-rebase` + `.github/workflows/reusable-auto-rebase-prs.yml`

## When to use

`push` to main (plus schedule + `workflow_dispatch`) to keep open PRs current without anyone asking. See [push-trigger setup](../auto-rebase.md#run-on-every-push-to-main).

## Key inputs

- `pr-numbers` — optional targeted list
- `rebase-conflicts` — opt-in true rebase (with SHA lease)
- `report-conflicts` — comment conflicting files once per head SHA instead of failing
- `comment-on-update` — set `false` on push runs to skip update comments
- `merge-fallback` — with `rebase-conflicts`, fall back to a non-force merge update when the rebase conflicts but GitHub reports the PR as mergeable (default `false`)
- secret `AUTO_REBASE_TOKEN` — optional token so updated branches re-run CI

## Example

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: write
  pull-requests: write
jobs:
  rebase:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-auto-rebase-prs.yml@v1
    with:
      report-conflicts: true
      comment-on-update: ${{ github.event_name != 'push' }}
    secrets: inherit
```

## Agent notes

- Requires `contents: write` + `pull-requests: write`.
- Conflict rebases are opt-in and abort on failure with comments.
- Before any conflict rebase the action compares the branch with its base (`compareCommitsWithBasehead`, `<base>...<head SHA>`); a branch that is not behind its base is reported as already up to date and left alone.
- Opt-in `supersede-fork-prs` replays conflicting or non-updatable fork PRs into `supersede/pr-<N>` and opens a PR starting with `Supersedes #N` (never pushes to the fork, never force-pushes). Pair it with [`close-superseded`](close-superseded.md). Details: [docs/auto-rebase.md](../auto-rebase.md#contributor-fork-prs-supersede-instead-of-rebase).
