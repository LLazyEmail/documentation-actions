# AGENTS.md

Guidance for AI coding agents that work **in** this repository, or that **add these Actions to another repository**.

This file is optimized for LLM agents. Prefer structured sections, tables, and checklists over prose. When in doubt, copy from `examples/` and adapt inputs; do not reinvent job YAML.

## What this is

`LLazyEmail/documentation-actions` is a collection of:

1. **Composite Actions** under `actions/<name>/` (step-level reuse). Use when the caller keeps custom steps around shared logic.
2. **Reusable workflows** under `.github/workflows/reusable-*.yml` (job-level reuse via `workflow_call`). Prefer these when the entire job should move unchanged.
3. **Examples** under `examples/` showing thin caller workflows for consumer repos. Always start here.
4. **Skills** under `skills/` — reusable checklists for humans and agents.

Current pin: `LLazyEmail/documentation-actions@v1` (floating major). Draft adoption PRs may use `@main` only during the adoption window. Prefer full SHA + Renovate for production.

## Start here (decision tree)

| Goal | Start with | Notes |
| --- | --- | --- |
| Add docs CI (lint + links + build) to a Docusaurus site | `examples/docs-ci.yml` → `reusable-docs-ci.yml@v1` | Toggle booleans; keep triggers on the caller |
| PR test build only | `examples/test-deploy.yml` | Enable `pr-comment` if you want the build summary on the PR |
| Pages deploy | `examples/deploy-pages.yml` or `deploy-peaceiris.yml` | Modern Pages needs `pages: write` + `id-token: write` |
| Soft-fail link check | `examples/link-check.yml` | Soft by default; issue creation only on schedule |
| Awesome-list validators | `examples/awesome-list-checks.yml` | Scripts live here; no local copies needed |
| Changelog / docs-index / catalog commit-back | Matching `examples/*.yml` | Use `secrets: inherit` + `contents: write` |
| Auto-rebase stacked PRs | `examples/auto-rebase-prs.yml` | Schedule + workflow_dispatch |
| Star thank-you comment | `examples/star-request.yml` | `pull_request_target` |
| Stand up a whole new docs site | `skills/docusaurus-docs-site/SKILL.md` | Full checklist including Node, i18n, AGENTS.md, PR template |

Full inventory (append-only): [`docs/actions-index.md`](docs/actions-index.md).

## Decision rules for consumers

1. Prefer a **reusable workflow** when the whole job should move (deploy, changelog, docs-index, auto-rebase, docs-ci).
2. Prefer a **composite action** when the caller keeps custom steps around shared logic (markdownlint globs, lychee path lists, build annotations).
3. Awesome-list validators ship scripts inside this repo — consumers do not need local copies once adopted.
4. Docusaurus inputs must match the consumer: `working-directory` (`website` vs `.`), Node version, package-manager cache path, and any `prebuild-command`.
5. Never invent new job YAML from scratch. Copy an example, adjust inputs and triggers, keep permissions minimal.

## Required caller setup

- Org / repo **Actions access** must allow reusable workflows from `LLazyEmail/documentation-actions`.
- Pass `secrets: inherit` on `uses:` workflow calls that need `GITHUB_TOKEN` write (changelog commit, pages deploy, star comment).
- Pin `@v1` after release. Do not leave production consumers on `@main` longer than the adoption window.
- Keep triggers, path filters, and permissions on the **caller**. The reusable workflow only contains the job body.

## Working on this repository

- Every `uses:` of a third-party Action is pinned to a full commit SHA with a `# vX.Y.Z` comment. Renovate keeps them current.
- `.github/workflows/ci.yml` lints YAML and runs unit/self-tests.
- Release loop:
  1. PRs add `.changelog/` fragments.
  2. `release-changelog-pr.yml` opens a `rel/vX.Y.Z` release PR that folds them into `CHANGELOG.md`.
  3. Merging that PR (or any push to `main` while a changelog version has no tag) runs `tag-release.yml`: creates `vX.Y.Z`, publishes a GitHub Release with those notes (idempotent if the tag already exists).
  4. `release.yml` moves the floating major tag (`v1`) when that Release is published.
- Small draft PRs; commit trailer `Co-authored-by: petroved <arthur.tkachenko.netweight@gmail.com>`.
- Do not merge or close PRs unless the human owner asks.
- Never delete curated content in sibling awesome-list repos; extend or annotate.
- When adding an action, append **exactly one new row** to [`docs/actions-index.md`](docs/actions-index.md). Do not reorder or edit other rows. Keep the action entirely under `actions/<name>/` (+ reusable workflow + example).

## Changelog entries (`.changelog/`)

Do **not** edit `CHANGELOG.md` by hand for user-facing changes. Add one flat file under [`.changelog/`](.changelog/) instead (see [`.changelog/README.md`](.changelog/README.md)):

```markdown
semver: minor
type: Added
Short user-facing summary.
```

- `semver:` is required (`major` | `minor` | `patch`).
- `type:` is optional (`Added` | `Changed` | `Deprecated` | `Removed` | `Fixed` | `Security`).
- Filename is a unique slug only (avoids merge conflicts on `CHANGELOG.md`).
- CI validates entries on every PR. Use label `skip-changelog` / `no-changelog` to waive (docs-only / chore).
- After merge, **Changelog release PR** folds waiting entries into `CHANGELOG.md` and opens `rel/vX.Y.Z`. Merge that release PR; **Tag release** creates the git tag + GitHub Release automatically, and `release.yml` moves floating `v1`.

## Common pitfalls (for agents)

| Pitfall | Fix |
| --- | --- |
| Leaving production on `@main` | Switch to `@v1` (or SHA) after the first release lands |
| Missing `secrets: inherit` on commit-back workflows | Required for changelog, docs-index, catalog-api, star-request |
| Wrong `working-directory` / lockfile path | Match the consumer layout (`website/` vs root) |
| Hard-failing lychee on flaky external links | Keep soft-fail (default); only create issues on schedule |
| Mass-reformat in an adoption PR | Land a dedicated reformat PR after maintainer OK |
| Editing `CHANGELOG.md` by hand | Use `.changelog/` fragments only |
| Reordering `docs/actions-index.md` | Append-only — stacked PRs will conflict |
| Forgetting path filters on callers | Keep triggers + path filters on the consumer workflow |

## Reference

- Action inventory: [`docs/actions-index.md`](docs/actions-index.md)
- Examples: [`examples/`](examples/)
- Adoption notes: [`docs/adoption.md`](docs/adoption.md)
- Design conventions: [`docs/design.md`](docs/design.md)
- Full AI agent guide: [`docs/ai-agent-guide.md`](docs/ai-agent-guide.md)
- Docusaurus site checklist skill: [`skills/docusaurus-docs-site/SKILL.md`](skills/docusaurus-docs-site/SKILL.md)
- Release notes: `CHANGELOG.md` (compiled from `.changelog/` entries)

## Append-only actions index

When adding an action, append **one new row** to [`docs/actions-index.md`](docs/actions-index.md). Do not reorder, edit, or delete existing rows. Keep the action entirely under `actions/<name>/` (plus its reusable workflow and example). Do not rewrite the root README table in action PRs.
