semver: patch
type: Fixed
auto-rebase: comparing a PR with its base no longer fails with `Not Found` (it now uses `compareCommitsWithBasehead` with the head SHA). Behind PRs whose checks are red now get a branch update, and the "already up to date" skip works for every PR, fork PRs included.
