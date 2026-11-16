semver: patch
type: Fixed
`git-push-retry` (used by the changelog, docs-index and catalog-api reusable workflows) now rebases with `--autostash` when a push to `main` is rejected, so unrelated unstaged files no longer abort the retry with "cannot pull with rebase: You have unstaged changes". It also stops pulling and sleeping after the final failed attempt. Runs whose first push succeeds are unchanged.
