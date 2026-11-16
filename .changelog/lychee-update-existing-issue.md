semver: minor
type: Added
`lychee-link-check` and `reusable-link-check.yml` accept an opt-in `update-existing-issue` input. When set with `create-issue`, the report updates the newest open issue with the same title instead of opening a new issue every run. Default `false` keeps the current behavior.
