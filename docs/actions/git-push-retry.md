# git-push-retry

Stage, commit, and push with rebase-retry for concurrent commit-back jobs.

**Path:** `actions/git-push-retry`

Used by changelog, docs-index, and catalog-api reusable workflows.

## Key inputs

- `commit-paths` (required)
- `commit-message` (required)
- `max-attempts` (default 5)

## Agent notes

- Requires `contents: write` and `secrets: inherit` on the caller.
- Commit messages stay consistent with the source workflows.
