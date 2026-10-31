semver: minor
type: Added
Docusaurus builds tee the log and surface broken-link / warning / error lines as GitHub annotations and a job summary (`annotate-log`, default true). Optional `pr-comment` on test-deploy upserts a PR comment with those counts via `actions/docusaurus-pr-comment`.
