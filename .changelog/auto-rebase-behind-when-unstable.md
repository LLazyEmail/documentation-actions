semver: patch
type: Fixed
auto-rebase now updates pull requests that GitHub marks `unstable` or `blocked` when they are behind their base branch. GitHub reports failing checks ahead of `behind`, so these PRs were skipped before. `clean` PRs are still left alone.
