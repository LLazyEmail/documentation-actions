---
name: changelog-patterns
description: Guide for agents on changelog fragments, release PRs, and commit-back workflows in documentation-actions and consumers.
---

# Changelog patterns

## In this repository

- Never hand-edit `CHANGELOG.md`.
- Add one file under `.changelog/` with `semver:` and optional `type:`.
- Label `skip-changelog` / `no-changelog` for pure docs/chore.
- After merge, the release PR folds entries and opens `rel/vX.Y.Z`.

## In consumer repos

- Prefer `reusable-changelog.yml` for regenerating from git history.
- Pass `commit-paths` and use `secrets: inherit` + `contents: write`.
- Keep commit messages consistent.

## Quick fragment

```markdown
semver: minor
type: Added
Short user-facing summary.
```
