semver: minor
type: Added
auto-rebase: conflicts are now reported with their type (`deleted-on-main`, `deleted-in-pr`, `content`, `both-added`, `rename-or-add`, `both-deleted`) in the log, the summary, the trial-rebase comment and a new conflict report on the PR. That report is one comment per PR, edited in place instead of a new comment per run. New opt-in inputs:
- `resolve-deleted-on-main` and `resolve-deleted-paths` (default `.github/workflows/**`) accept deletions made on the base branch for files the PR only modified, when that's the only kind of conflict. Dropped files are listed on the PR. With `merge-fallback`, they also try a local merge when GitHub says the PR is not mergeable.
- `fail-on-conflict` (default `true`) can turn unresolvable conflicts into a warning.
- `conflict-label` labels PRs with unresolvable conflicts, for example `has-conflicts`.
