# documentation-actions

[![CI](https://github.com/LLazyEmail/documentation-actions/actions/workflows/ci.yml/badge.svg)](https://github.com/LLazyEmail/documentation-actions/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/LLazyEmail/documentation-actions?include_prereleases&sort=semver)](https://github.com/LLazyEmail/documentation-actions/releases)

Reusable **GitHub Actions** and **reusable workflows** for Docusaurus documentation sites and awesome-list repositories.

Extracted from duplicated automation across:

- [`LLazyEmail/awesome-email-marketing`](https://github.com/LLazyEmail/awesome-email-marketing)
- [`LLazyEmail/awesome-newsletters`](https://github.com/LLazyEmail/awesome-newsletters)
- [`LLazyEmail/documentation`](https://github.com/LLazyEmail/documentation)

Modeled on [`LLazyEmail/email-template-workflows`](https://github.com/LLazyEmail/email-template-workflows).

Pin `LLazyEmail/documentation-actions@v1` once the first GitHub Release exists (auto-created when a release PR merges). Draft adoption PRs may use `@main` only during the adoption window. For the strongest supply-chain guarantee, pin a full commit SHA and keep it current with Renovate.

## Quick start

```yaml
# PR test build for a Docusaurus site under website/
jobs:
  test-deploy:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-docusaurus-test-deploy.yml@main
    with:
      working-directory: website
      cache-dependency-path: website/package-lock.json
```

```yaml
# Soft-fail lychee with a job summary
jobs:
  lychee:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-link-check.yml@main
    with:
      args: >-
        --verbose --no-progress --accept 200,204,206,403,429
        README.md 'website/docs/**/*.md'
```

More copy-paste callers live in [`examples/`](examples/).

## Actions and workflows

The inventory is **append-only** in [`docs/actions-index.md`](docs/actions-index.md): each action PR adds exactly one new table row at the end and never reorders or edits other rows. That keeps stacked PRs from conflicting on the README.

Composite actions live only under `actions/<name>/` (plus their reusable workflow, example, and test). Do not scatter related files across shared directories in a way that forces every PR to touch the same lines.

## Usage snippets

### Star request

```yaml
on:
  pull_request_target:
    types: [opened]
permissions:
  pull-requests: write
jobs:
  comment:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-star-request.yml@main
```

### Awesome-list checks

```yaml
jobs:
  checks:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-awesome-list-checks.yml@main
    with:
      checks: entry-format,duplicate-links,sorted-sections
```

### Auto-rebase (consumers)

```yaml
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:
permissions:
  contents: write
  pull-requests: write
jobs:
  rebase:
    uses: LLazyEmail/documentation-actions/.github/workflows/reusable-auto-rebase-prs.yml@main
```

This repository also ships an early in-repo `.github/workflows/auto-rebase-prs.yml` so the draft stack stays current before the composite action merges.

### Git push with rebase retry

```yaml
- uses: LLazyEmail/documentation-actions/actions/git-push-retry@v1
  with:
    commit-paths: CHANGELOG.md website/src/data/changelog.json
    commit-message: 'chore(changelog): regenerate after merged pull request'
```

Commit-back reusable workflows (changelog, docs-index, catalog-api) already use this composite.

## Adoption

See [`docs/adoption.md`](docs/adoption.md) for consumer cut-over notes and [`docs/design.md`](docs/design.md) for layout conventions.

## License

[MIT](./LICENSE) © LLazyEmail
