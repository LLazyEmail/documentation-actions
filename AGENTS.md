# AGENTS.md

Guidance for AI coding agents that work **in** this repository, or that **add these Actions to another repository**.

## What this is

`LLazyEmail/documentation-actions` is a collection of:

1. **Composite Actions** under `actions/<name>/` (step-level reuse).
2. **Reusable workflows** under `.github/workflows/reusable-*.yml` (job-level reuse via `workflow_call`).
3. **Examples** under `examples/` showing thin caller workflows for consumer repos.

Current tag to use from other repos after the first release: `LLazyEmail/documentation-actions@v1`. Until then, draft adoption PRs may pin `@main`.

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
- `.github/workflows/release.yml` moves the floating major tag (`v1`) when a `vMAJOR.MINOR.PATCH` release is published.
- Small draft PRs; commit trailer `Co-authored-by: petroved <arthur.tkachenko.netweight@gmail.com>`.
- Do not merge or close PRs unless the human owner asks.
- Never delete curated content in sibling awesome-list repos; extend or annotate.

## Reference

- Action inventory and usage: `README.md`
- Examples: `examples/`
- Release notes: `CHANGELOG.md`

## Append-only actions index

When adding an action, append **one new row** to [`docs/actions-index.md`](docs/actions-index.md). Do not reorder, edit, or delete existing rows. Keep the action entirely under `actions/<name>/` (plus its reusable workflow and example). Do not rewrite the root README table in action PRs.
