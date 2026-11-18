semver: minor
type: Added
auto-rebase: opt-in `supersede-fork-prs` (with `supersede-union-paths` and `supersede-draft`). It replays conflicting or non-updatable fork PRs into a `supersede/pr-N` branch and opens a PR that starts with `Supersedes #N`. It never pushes to the fork. New `close-superseded` action and `reusable-close-superseded-prs.yml` workflow close the superseded PR when the new one merges.
