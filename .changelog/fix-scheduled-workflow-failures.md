semver: patch
type: Fixed
The open PRs status report now lists issues with `issues.listForRepo`, fixing the 404 on scheduled runs. Scheduled auto-rebase sweeps now skip conflicting PRs with a warning instead of failing the run and commenting on the PR each time; targeted runs still fail on conflicts.
