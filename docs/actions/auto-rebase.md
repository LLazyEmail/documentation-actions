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
- `delegate-bot-rebase` — Renovate/Dependabot PRs that are behind or conflicting are handed back to the bot (Renovate rebase checkbox ticked, or `@dependabot rebase`) instead of a git rebase; reported as delegated, not failed (default `false`). Details: [docs/auto-rebase.md](../auto-rebase.md#renovate-and-dependabot-prs-delegate-the-rebase)
- `resolve-deleted-on-main` / `resolve-deleted-paths` — opt-in: accept base-branch deletions of files the PR only edited (default paths `.github/workflows/**`); also lets `merge-fallback` try a local merge when GitHub says "not mergeable". Details: [docs/auto-rebase.md](../auto-rebase.md#conflict-types-and-deleted-files)
- `fail-on-conflict` — `false` makes unresolvable conflicts a warning instead of a red job (default `true`)
- `conflict-label` — label PRs with conflicts, including ones a sweep skips (e.g. `has-conflicts`); empty disables
- `fail-on-skipped-conflicts` — opt-in: fail the job when a sweep skips a conflicting PR or `report-conflicts` reports one (default `false`: warning or report only)
- `report-failing-checks` / `failing-checks-label` — opt-in: warn about (and optionally label) PRs whose head checks are red; adds a column to the summary table. Check names need a token with checks read access, otherwise `mergeable_state` is used. Details: [docs/auto-rebase.md](../auto-rebase.md#why-a-sweep-can-be-green-while-a-pr-still-has-conflicts)
- secret `AUTO_REBASE_TOKEN` — optional fine-grained PAT so updated branches re-run CI and check names can be read; permissions: [docs/auto-rebase.md](../auto-rebase.md#auto_rebase_token-permissions)

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
- Opt-in `supersede-fork-prs` replays conflicting or non-updatable fork PRs into `supersede/pr-<N>` and opens a PR starting with `Supersedes #N` (never pushes to the fork, never force-pushes). If the contributor force-pushes #N, their current change is synced onto the supersede branch as one fast-forward "sync" commit. After any sync (new or rewritten commits), the contributor gets a templated thank-you on #N (`supersede-sync-message`, once per head SHA). Per-PR states that need a maintainer are commented and logged as warnings, not job failures. Pair it with [`close-superseded`](close-superseded.md). Details: [docs/auto-rebase.md](../auto-rebase.md#contributor-fork-prs-supersede-instead-of-rebase).
