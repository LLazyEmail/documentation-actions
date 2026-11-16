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
- When a push is rejected because another job (changelog, docs-index,
  catalog-api) pushed to `main` first, the script runs
  `git pull --rebase --autostash origin main` and tries again, up to
  `max-attempts` times. `--autostash` keeps unrelated unstaged files (for
  example LFS-smudged binaries or build output outside `commit-paths`) from
  aborting the rebase with "cannot pull with rebase: You have unstaged changes".
  If the first push succeeds, nothing changes.
