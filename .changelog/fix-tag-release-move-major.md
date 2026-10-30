semver: patch
type: Fixed
Auto-publish now moves the floating major tag (v1) inside tag-release.yml, because GITHUB_TOKEN-created releases never trigger release.yml.
