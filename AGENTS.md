# AGENTS.md

Guidance for AI coding agents that work **in** this repository, or that **add these Actions to another repository**.

## What this is

`LLazyEmail/documentation-actions` is a collection of:

1. **Composite Actions** under `actions/<name>/` (step-level reuse).
2. **Reusable workflows** under `.github/workflows/reusable-*.yml` (job-level reuse via `workflow_call`).
3. **Examples** under `examples/` showing thin caller workflows for consumer repos.

Current tag to use from other repos: `LLazyEmail/documentation-actions@v1` (floating major; created when the first GitHub Release publishes). Draft adoption PRs may pin `@main` only during the adoption window.

## Start here

- **Adding an Action to a consumer?** Copy the matching file from `examples/`, set inputs that match the old local workflow, keep triggers identical, and note the dependency on the documentation-actions PR in the PR body.
- **Changing this repository?** See [Working on this repository](#working-on-this-repository).

## Decision rules for consumers

1. Prefer a **reusable workflow** when the whole job should move (deploy, changelog, docs-index, auto-rebase).
2. Prefer a **composite action** when the caller keeps custom steps around shared logic (markdownlint globs, lychee path lists).
3. Awesome-list validators (`entry-format`, `duplicate-links`, `sorted-sections`) ship scripts inside this repo — consumers do not need local copies of those scripts once adopted.
4. Docusaurus build/deploy inputs must match the consumer: `working-directory` (`website` vs `.`), Node version, package manager cache path, and any pre-build scripts.

## Required caller setup

- Org / repo **Actions access** must allow reusable workflows from `LLazyEmail/documentation-actions` (private repo access policy if the org restricts it).
- Pass `secrets: inherit` on `uses:` workflow calls that need `GITHUB_TOKEN` write (changelog commit, pages deploy, star comment).
- Pin `@v1` after release. Do not leave production consumers on `@main` longer than the adoption window.

## Working on this repository

- Every `uses:` of a third-party Action is pinned to a full commit SHA with a `# vX.Y.Z` comment. Renovate keeps them current.
- `.github/workflows/ci.yml` lints YAML and runs unit/self-tests.
- Release loop (same idea as `LLazyEmail/generate-template` changesets, adapted for Actions):
  1. PRs add `.changelog/` fragments.
  2. `release-changelog-pr.yml` opens a `rel/vX.Y.Z` release PR that folds them into `CHANGELOG.md`.
  3. Merging that PR (or any push to `main` while a changelog version has no tag) runs `tag-release.yml`: creates `vX.Y.Z`, publishes a GitHub Release with those notes (idempotent if the tag already exists).
  4. `release.yml` moves the floating major tag (`v1`) when that Release is published.
- Small draft PRs; commit trailer `Co-authored-by: petroved <arthur.tkachenko.netweight@gmail.com>`.
- Do not merge or close PRs unless the human owner asks.
- Never delete curated content in sibling awesome-list repos; extend or annotate.


## Changelog entries (`.changelog/`)

Do **not** edit `CHANGELOG.md` by hand for user-facing changes. Add one flat
file under [`.changelog/`](.changelog/) instead (see [`.changelog/README.md`](.changelog/README.md)):

```markdown
semver: minor
type: Added
Short user-facing summary.
```

- `semver:` is required (`major` | `minor` | `patch`).
- `type:` is optional (`Added` | `Changed` | `Deprecated` | `Removed` | `Fixed` | `Security`).
- Filename is a unique slug only (avoids merge conflicts on `CHANGELOG.md`).
- CI validates entries on every PR (`scripts/changelog-check.sh` + `dottics/actions-changelog` validate mode). Use label `skip-changelog` / `no-changelog` to waive.
- After merge, **Changelog release PR** folds waiting entries into `CHANGELOG.md` and opens `rel/vX.Y.Z`. Merge that release PR; **Tag release** creates the git tag + GitHub Release automatically, and `release.yml` moves floating `v1`.

## Reference

- Action inventory and usage: `README.md`
- Examples: `examples/`
- Release notes: `CHANGELOG.md` (compiled from `.changelog/` entries)
- Pending release notes: `.changelog/`

## Append-only actions index

When adding an action, append **one new row** to [`docs/actions-index.md`](docs/actions-index.md). Do not reorder, edit, or delete existing rows. Keep the action entirely under `actions/<name>/` (plus its reusable workflow and example). Do not rewrite the root README table in action PRs.
