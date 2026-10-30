semver: minor
type: Added
Auto-publish on merge: after a release PR lands, create the `vX.Y.Z` tag and
GitHub Release from `CHANGELOG.md`, then let `release.yml` move floating `v1`.
Idempotent so a missed release (for example v1.0.0) is published on the first
run when the tag is still missing.
