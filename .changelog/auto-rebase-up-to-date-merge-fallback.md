semver: minor
type: Added
`auto-rebase`: in `rebase-conflicts` mode a PR is first compared with its base, and a branch that is not behind (`behind_by: 0`, e.g. it already merged `main`) is reported as "already up to date" instead of being replayed and failing on adjacent-line conflicts. New opt-in `merge-fallback` input (default `false`) on the action and `reusable-auto-rebase-prs.yml`: when the rebase conflicts but GitHub reports the PR as mergeable, request a non-force merge update (update-branch API) instead of failing.
